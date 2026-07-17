import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { useAuth } from '../../context/AuthContext';
import { fetchMetValues, saveWorkoutSession } from '../../services/workoutService';
import { fetchReadinessScore } from '../../services/progressService';
import MuscleActivationOverlay from './MuscleActivationOverlay';
import { predictMultiplier } from '../../ml/calorieModel';
import { computeFormScore } from '../../ml/formModel';
import { fetchAiStatus, fetchWorkoutSummary, fetchFormTip } from '../../services/aiService';


// ============================================================
// CONFIGURATION
// ============================================================

const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Exercise configuration with angle thresholds and muscle mapping
const EXERCISE_CONFIG = {
  pushup: {
    label: 'Push-up',
    primary: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
    alignment: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ANKLE],
    topAngle: 155,
    bottomAngle: 90,
    idealBottom: 75,
    alignmentIdeal: 170,
    depthJoint: LANDMARKS.LEFT_ELBOW,
    alignmentJoint: LANDMARKS.LEFT_HIP,
    depthMsg: 'Go lower',
    alignmentMsg: 'Keep your back straight',
    primaryMuscles: ['chest', 'triceps', 'shoulders'],
    secondaryMuscles: ['abdominals'],
  },
  squat: {
    label: 'Squat',
    primary: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
    alignment: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
    topAngle: 160,
    bottomAngle: 100,
    idealBottom: 80,
    alignmentIdeal: 150,
    depthJoint: LANDMARKS.LEFT_KNEE,
    alignmentJoint: LANDMARKS.LEFT_HIP,
    depthMsg: 'Squat deeper',
    alignmentMsg: 'Keep your chest up',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
  },
  jumping_jack: {
    label: 'Jumping Jack',
    primary: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
    alignment: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
    topAngle: 160,
    bottomAngle: 120,
    idealBottom: 100,
    alignmentIdeal: 160,
    depthJoint: LANDMARKS.LEFT_KNEE,
    alignmentJoint: LANDMARKS.LEFT_HIP,
    depthMsg: 'Bend your knees more',
    alignmentMsg: 'Keep your back straight',
    primaryMuscles: ['quadriceps', 'shoulders'],
    secondaryMuscles: ['calves', 'abdominals'],
  },
};

const FALLBACK_MET = { pushup: 8.0, squat: 5.0, jumping_jack: 7.0 };

// Fatigue detection
const FATIGUE_WINDOW = 5;
const BASELINE_REPS = 3;
const FATIGUE_EMA_ALPHA = 0.35;

// Auto exercise recognition
const RECOGNITION_WINDOW = 15;
const RECOGNITION_AGREEMENT = 10;

// Injury risk
const VALGUS_THRESHOLD = 0.035;
const ASYMMETRY_THRESHOLD_DEG = 12;
const RISK_EMA_ALPHA = 0.3;

const RISK_CONFIG = {
  pushup: {
    mirrorPrimary: [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
    strainThreshold: 155,
    strainMessage: 'Hips sagging — brace your core to protect your lower back.',
    hyperextensionAngle: 178,
  },
  squat: {
    mirrorPrimary: [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
    hipKneeAnkle: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
    strainThreshold: 130,
    strainMessage: 'Excessive forward lean — keep your chest tall.',
    hyperextensionAngle: 178,
  },
  jumping_jack: {
    mirrorPrimary: [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
    hipKneeAnkle: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
    strainThreshold: 140,
    strainMessage: 'Land softly — protect your knees.',
    hyperextensionAngle: 178,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const movingAverage = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const angleFallback = (a, b, c) => {
  if (!a || !b || !c) return null;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const scoreDepth = (minAngle, bottomAngle, idealBottom) => {
  if (minAngle === Infinity) return 0;
  if (minAngle <= idealBottom) return 100;
  const score = 100 - ((minAngle - idealBottom) / (180 - idealBottom)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const scoreAlignment = (minAlignment, idealAngle) => {
  if (minAlignment === 180) return 100;
  const deviation = Math.max(0, idealAngle - minAlignment);
  const score = 100 - deviation * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const computeActivation = (primaryAngle, config) => {
  const range = config.topAngle - config.idealBottom;
  if (range <= 0 || primaryAngle == null) return 0;
  const clamped = Math.min(config.topAngle, Math.max(config.idealBottom, primaryAngle));
  return Math.round(((config.topAngle - clamped) / range) * 100) / 100;
};

const detectKneeValgus = (hip, knee, ankle) => {
  if (!hip || !knee || !ankle || ankle.y === hip.y) return false;
  const t = (knee.y - hip.y) / (ankle.y - hip.y);
  const expectedKneeX = hip.x + (ankle.x - hip.x) * t;
  return knee.x - expectedKneeX < -VALGUS_THRESHOLD;
};

const classifyPose = (landmarks) => {
  const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const hip = landmarks[LANDMARKS.LEFT_HIP];
  const wrist = landmarks[LANDMARKS.LEFT_WRIST];
  const knee = landmarks[LANDMARKS.LEFT_KNEE];
  const ankle = landmarks[LANDMARKS.LEFT_ANKLE];
  if (!shoulder || !hip || !wrist || !knee || !ankle) return null;

  const dx = Math.abs(hip.x - shoulder.x);
  const dy = Math.abs(hip.y - shoulder.y);
  const torsoAngleFromVertical = (Math.atan2(dx, dy) * 180) / Math.PI;
  const wristNearShoulder = Math.abs(wrist.y - shoulder.y) < 0.15;

  // Check for jumping jack: arms raised and legs spread
  const leftArmRaised = landmarks[LANDMARKS.LEFT_WRIST]?.y < landmarks[LANDMARKS.LEFT_SHOULDER]?.y;
  const rightArmRaised = landmarks[LANDMARKS.RIGHT_WRIST]?.y < landmarks[LANDMARKS.RIGHT_SHOULDER]?.y;
  const legsSpread = Math.abs(landmarks[LANDMARKS.LEFT_HIP]?.x - landmarks[LANDMARKS.RIGHT_HIP]?.x) > 0.15;

  if (leftArmRaised && rightArmRaised && legsSpread) return 'jumping_jack';
  if (torsoAngleFromVertical > 55 && wristNearShoulder) return 'pushup';
  if (torsoAngleFromVertical < 35) return 'squat';
  return null;
};

const drawArrow = (ctx, x, y, direction, color) => {
  const size = 22;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  const dy = direction === 'down' ? size : -size;
  ctx.beginPath();
  ctx.moveTo(x, y - dy);
  ctx.lineTo(x, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + dy);
  ctx.lineTo(x - 8, y + dy - (direction === 'down' ? 12 : -12));
  ctx.lineTo(x + 8, y + dy - (direction === 'down' ? 12 : -12));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const LiveWorkoutTracker = () => {
  const { user } = useAuth();

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // State refs for closure
  const repStateRef = useRef('up');
  const exerciseTypeRef = useRef('pushup');
  const minAngleRef = useRef(Infinity);
  const minAlignmentRef = useRef(180);
  const lastSpokenRef = useRef({ text: '', time: 0 });
  const repsRef = useRef(0);
  const formScoresRef = useRef([]);

  // Fatigue refs
  const repTimestampsRef = useRef([]);
  const repDurationsRef = useRef([]);
  const baselineDurationRef = useRef(null);
  const fatigueEmaRef = useRef(0);

  // Muscle activation refs
  const muscleActivationEmaRef = useRef(0);

  // Auto recognition refs
  const poseClassBufferRef = useRef([]);

  // Injury risk refs
  const riskEmaRef = useRef(0);
  const lastGroqTipRepRef = useRef(0);
  const groqTipInFlightRef = useRef(false);
  const groqEnabledRef = useRef(false);
  const fatigueLevelRef = useRef('fresh');
  const injuryRiskRef = useRef(0);
  const riskFactorsRef = useRef([]);

  // --- State ---
  const [exerciseType, setExerciseType] = useState('pushup');
  const [reps, setReps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(null);
  const [feedback, setFeedback] = useState('Select an exercise and press Start');
  const [cameraError, setCameraError] = useState('');
  const [formIssue, setFormIssue] = useState(null);
  const [repScores, setRepScores] = useState([]);
  const [lastRepScore, setLastRepScore] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [metValues, setMetValues] = useState(FALLBACK_MET);
  const [liveCalories, setLiveCalories] = useState(0);
  const [saveState, setSaveState] = useState('idle');
  const [savedSession, setSavedSession] = useState(null);
  const [muscleActivation, setMuscleActivation] = useState(0);
  const [fatigueScore, setFatigueScore] = useState(0);
  const [fatigueLevel, setFatigueLevel] = useState('fresh');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [detectedExercise, setDetectedExercise] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [injuryRisk, setInjuryRisk] = useState(0);
  const [riskLevel, setRiskLevel] = useState('low');
  const [riskFactors, setRiskFactors] = useState([]);
  const [modelsReady, setModelsReady] = useState(false);
  const [groqEnabled, setGroqEnabled] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryPowered, setAiSummaryPowered] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState('');
  const [coachTip, setCoachTip] = useState('');
  const [coachTipLoading, setCoachTipLoading] = useState(false);

  // Computed
  const overallScore = useMemo(() => {
    if (repScores.length === 0) return null;
    const sum = repScores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / repScores.length);
  }, [repScores]);

  // Sync refs with state
  useEffect(() => { repsRef.current = reps; }, [reps]);
  useEffect(() => { formScoresRef.current = repScores; }, [repScores]);
  useEffect(() => { groqEnabledRef.current = groqEnabled; }, [groqEnabled]);
  useEffect(() => { injuryRiskRef.current = injuryRisk; }, [injuryRisk]);
  useEffect(() => { riskFactorsRef.current = riskFactors; }, [riskFactors]);
  useEffect(() => { fatigueLevelRef.current = fatigueLevel; }, [fatigueLevel]);

  // --- Load rule-based scoring + AI status on mount ---
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          import('../../ml/calorieModel').then((m) => m.loadCalorieModel()),
          import('../../ml/formModel').then((m) => m.loadFormModel()),
        ]);
        setModelsReady(true);
      } catch {
        setModelsReady(true);
      }
      try {
        const status = await fetchAiStatus();
        setGroqEnabled(Boolean(status?.groq));
      } catch {
        setGroqEnabled(false);
      }
    };
    init();
  }, []);

  // --- Voice feedback ---
  const speak = useCallback(
    (text, { priority = false, cooldownMs = 3000 } = {}) => {
      if (!voiceEnabled || !window.speechSynthesis) return;
      const now = Date.now();
      if (!priority && text === lastSpokenRef.current.text && now - lastSpokenRef.current.time < cooldownMs) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current = { text, time: now };
    },
    [voiceEnabled]
  );

  // --- Fatigue detection ---
  const registerRepCompletion = useCallback(() => {
    const now = Date.now();
    const timestamps = repTimestampsRef.current;
    timestamps.push(now);
    if (timestamps.length < 2) return;

    const durationSec = (now - timestamps[timestamps.length - 2]) / 1000;
    const durations = repDurationsRef.current;
    durations.push(durationSec);
    if (durations.length > FATIGUE_WINDOW) durations.shift();

    if (baselineDurationRef.current === null && timestamps.length - 1 >= BASELINE_REPS) {
      baselineDurationRef.current = movingAverage(durations.slice(0, BASELINE_REPS));
    }
    if (!baselineDurationRef.current) return;

    const currentSMA = movingAverage(durations);
    const slowdownRatio = currentSMA / baselineDurationRef.current;
    const rawFatigue = Math.max(0, Math.min(100, Math.round((slowdownRatio - 1) * 150)));

    fatigueEmaRef.current = FATIGUE_EMA_ALPHA * rawFatigue + (1 - FATIGUE_EMA_ALPHA) * fatigueEmaRef.current;
    const smoothed = Math.round(fatigueEmaRef.current);
    setFatigueScore(smoothed);

    const level = smoothed >= 55 ? 'high' : smoothed >= 25 ? 'moderate' : 'fresh';
    setFatigueLevel((prev) => {
      if (level === 'high' && prev !== 'high') {
        speak("You're slowing down — consider resting soon.", { priority: true });
      }
      return level;
    });
  }, [speak]);

  // Fire-and-forget Groq tip — never blocks MediaPipe pose loop
  const requestGroqFormTip = useCallback((repNum, repScore, issueMsg) => {
    if (!groqEnabledRef.current || groqTipInFlightRef.current) return;
    if (repNum - lastGroqTipRepRef.current < 3 && repScore >= 65) return;

    lastGroqTipRepRef.current = repNum;
    groqTipInFlightRef.current = true;
    setCoachTipLoading(true);

    fetchFormTip({
      exerciseLabel: EXERCISE_CONFIG[exerciseTypeRef.current]?.label,
      lastRepScore: repScore,
      formIssue: issueMsg,
      fatigueLevel: fatigueLevelRef.current,
    })
      .then(({ tip, aiPowered }) => {
        if (tip) {
          setCoachTip(tip);
          if (aiPowered) speak(tip, { cooldownMs: 8000 });
        }
      })
      .finally(() => {
        groqTipInFlightRef.current = false;
        setCoachTipLoading(false);
      });
  }, [speak]);

  // --- Exercise switch reset ---
  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
    repStateRef.current = 'up';
    minAngleRef.current = Infinity;
    minAlignmentRef.current = 180;
    repTimestampsRef.current = [];
    repDurationsRef.current = [];
    baselineDurationRef.current = null;
    fatigueEmaRef.current = 0;
    setFatigueScore(0);
    setFatigueLevel('fresh');
    muscleActivationEmaRef.current = 0;
    setMuscleActivation(0);
    riskEmaRef.current = 0;
    setInjuryRisk(0);
    setRiskLevel('low');
    setRiskFactors([]);
  }, [exerciseType]);

  // --- Fetch data on mount ---
  useEffect(() => {
    fetchMetValues()
      .then((data) => setMetValues({ ...FALLBACK_MET, ...data }))
      .catch(() => setMetValues(FALLBACK_MET));
  }, []);

  useEffect(() => {
    fetchReadinessScore()
      .then(setReadiness)
      .catch(() => setReadiness(null));
  }, []);

  // --- Angle calculation ---
  const calculateAngle = useCallback((a, b, c) => {
    return angleFallback(a, b, c);
  }, []);

  // --- Injury risk computation ---
  const computeInjuryRisk = useCallback(
    (landmarks, type, primaryAngle, alignmentAngle) => {
      const config = RISK_CONFIG[type];
      if (!config) return { rawRisk: 0, factors: [] };

      let rawRisk = 0;
      const factors = [];

      const [mA, mB, mC] = config.mirrorPrimary;
      const mirrorAngle = calculateAngle(landmarks[mA], landmarks[mB], landmarks[mC]);
      if (mirrorAngle !== null && primaryAngle !== null) {
        if (Math.abs(primaryAngle - mirrorAngle) > ASYMMETRY_THRESHOLD_DEG) {
          rawRisk += 25;
          factors.push({ type: 'asymmetry', message: 'Left/right imbalance — one side is compensating.', severity: 'moderate' });
        }
      }

      if (config.hipKneeAnkle) {
        const [hA, kA, aA] = config.hipKneeAnkle;
        if (detectKneeValgus(landmarks[hA], landmarks[kA], landmarks[aA])) {
          rawRisk += 35;
          factors.push({ type: 'valgus', message: 'Knee caving inward — push knees out over your toes.', severity: 'high' });
        }
      }

      if (alignmentAngle !== null && alignmentAngle < config.strainThreshold) {
        rawRisk += 25;
        factors.push({ type: 'spinal_load', message: config.strainMessage, severity: 'high' });
      }

      if (primaryAngle !== null && primaryAngle > config.hyperextensionAngle) {
        rawRisk += 10;
        factors.push({ type: 'hyperextension', message: "Don't lock the joint out hard at the top.", severity: 'low' });
      }

      return { rawRisk: Math.min(100, rawRisk), factors };
    },
    [calculateAngle]
  );

  // --- Process reps (core logic) — fully synchronous; Groq is fire-and-forget ---
  const processReps = useCallback(
    (landmarks, canvasWidth, canvasHeight) => {
      const type = exerciseTypeRef.current;
      const config = EXERCISE_CONFIG[type];
      if (!config) return;

      const [pA, pB, pC] = config.primary;
      const primaryAngle = calculateAngle(landmarks[pA], landmarks[pB], landmarks[pC]);
      if (primaryAngle === null) return;

      const [aA, aB, aC] = config.alignment;
      const alignmentAngle = calculateAngle(landmarks[aA], landmarks[aB], landmarks[aC]);

      setCurrentAngle(Math.round(primaryAngle));

      // Muscle activation
      const rawActivation = computeActivation(primaryAngle, config);
      muscleActivationEmaRef.current = 0.4 * rawActivation + 0.6 * muscleActivationEmaRef.current;
      setMuscleActivation(muscleActivationEmaRef.current);

      // Injury risk (only when descending)
      if (repStateRef.current === 'down') {
        const { rawRisk, factors } = computeInjuryRisk(landmarks, type, primaryAngle, alignmentAngle);
        const fatigueNow = Math.round(fatigueEmaRef.current);
        const combinedRisk = Math.min(100, rawRisk + fatigueNow * 0.3);
        riskEmaRef.current = RISK_EMA_ALPHA * combinedRisk + (1 - RISK_EMA_ALPHA) * riskEmaRef.current;
        const smoothed = Math.round(riskEmaRef.current);
        setInjuryRisk(smoothed);
        setRiskFactors(factors);

        const level = smoothed >= 60 ? 'high' : smoothed >= 30 ? 'moderate' : 'low';
        setRiskLevel((prev) => {
          if (level === 'high' && prev !== 'high') {
            speak('High injury risk detected — consider reducing intensity or resting.', { priority: true });
          }
          return level;
        });
      }

      // Form issues
      let issue = null;
      if (repStateRef.current === 'down') {
        minAngleRef.current = Math.min(minAngleRef.current, primaryAngle);
        if (alignmentAngle !== null) {
          minAlignmentRef.current = Math.min(minAlignmentRef.current, alignmentAngle);
        }
        if (primaryAngle > config.bottomAngle) {
          const joint = landmarks[config.depthJoint];
          issue = { type: 'depth', message: config.depthMsg, x: joint.x * canvasWidth, y: joint.y * canvasHeight, direction: 'down' };
        }
      }

      if (alignmentAngle !== null && alignmentAngle < config.alignmentIdeal - 15) {
        const joint = landmarks[config.alignmentJoint];
        issue = { type: 'alignment', message: config.alignmentMsg, x: joint.x * canvasWidth, y: joint.y * canvasHeight, direction: 'up' };
      }

      setFormIssue(issue);

      // Rep counting
      if (primaryAngle > config.topAngle) {
        if (repStateRef.current === 'down') {
          repStateRef.current = 'up';

          const depthScore = scoreDepth(minAngleRef.current, config.bottomAngle, config.idealBottom);
          const alignScore = scoreAlignment(minAlignmentRef.current, config.alignmentIdeal);
          const repScore = computeFormScore({ depthScore, alignScore });

          setRepScores((prev) => [...prev, repScore]);
          setLastRepScore(repScore);
          setReps((prev) => {
            const next = prev + 1;
            speak(`Rep ${next}`, { priority: true });
            return next;
          });
          registerRepCompletion();
          setFeedback(repScore >= 80 ? 'Great form!' : repScore >= 60 ? 'Good rep — check your form tips.' : 'Form needs work — focus on technique.');

          const completedRep = repsRef.current + 1;
          requestGroqFormTip(completedRep, repScore, issue?.message);

          minAngleRef.current = Infinity;
          minAlignmentRef.current = 180;
        } else {
          setFeedback(`Extend fully, then lower into your ${config.label.toLowerCase()}.`);
        }
      } else if (primaryAngle < config.bottomAngle) {
        if (repStateRef.current === 'up') {
          minAngleRef.current = primaryAngle;
          minAlignmentRef.current = alignmentAngle ?? 180;
        }
        repStateRef.current = 'down';
        setFeedback(`Now push back up.`);
      }
    },
    [calculateAngle, speak, registerRepCompletion, computeInjuryRisk, requestGroqFormTip]
  );

  // --- Auto detection ---
  const runAutoDetection = useCallback(
    (landmarks) => {
      if (!autoDetectEnabled) return;
      const guess = classifyPose(landmarks);
      const buffer = poseClassBufferRef.current;
      buffer.push(guess);
      if (buffer.length > RECOGNITION_WINDOW) buffer.shift();

      const counts = buffer.reduce((acc, g) => {
        if (g) acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {});
      const [topGuess, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
      setDetectedExercise(topGuess || null);

      if (
        topGuess &&
        topCount >= RECOGNITION_AGREEMENT &&
        topGuess !== exerciseTypeRef.current &&
        EXERCISE_CONFIG[topGuess] &&
        repStateRef.current === 'up'
      ) {
        setExerciseType(topGuess);
        speak(`Detected ${EXERCISE_CONFIG[topGuess].label}`, { priority: true });
        buffer.length = 0;
      }
    },
    [autoDetectEnabled, speak]
  );

  // --- Speak form issues ---
  useEffect(() => {
    if (!isTracking || !formIssue) return;
    speak(formIssue.message);
  }, [formIssue?.type, isTracking, speak]);

  // --- MediaPipe onResults callback ---
  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = results.image.width;
      canvas.height = results.image.height;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#ff5545', lineWidth: 3 });
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FFFFFF', fillColor: '#ff5545', lineWidth: 1, radius: 3 });
        runAutoDetection(results.poseLandmarks);
        processReps(results.poseLandmarks, canvas.width, canvas.height);
      }

      ctx.restore();

      // Draw form issue arrow
      if (formIssue) {
        drawArrow(ctx, formIssue.x, formIssue.y, formIssue.direction, '#ff5545');
        ctx.save();
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ff5545';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        const label = formIssue.message;
        const labelX = Math.min(Math.max(formIssue.x - 40, 10), canvas.width - 150);
        const labelY = Math.max(formIssue.y - 30, 20);
        ctx.strokeText(label, labelX, labelY);
        ctx.fillText(label, labelX, labelY);
        ctx.restore();
      }
    },
    [processReps, formIssue, runAutoDetection]
  );

  // --- Initialize MediaPipe Pose ---
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    pose.onResults(onResults);
    poseRef.current = pose;

    return () => {
      pose.close();
      poseRef.current = null;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((t) => t.stop());
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [onResults]);

  // --- Timer + calorie counter ---
  useEffect(() => {
    if (isTracking) {
      timerIntervalRef.current = setInterval(async () => {
        setSeconds((prev) => {
          const next = prev + 1;
          const weightKg = user?.weight;
          if (weightKg) {
            const met = metValues[exerciseTypeRef.current] ?? FALLBACK_MET[exerciseTypeRef.current] ?? 5.0;
            const durationHours = next / 3600;
            const baseCalories = met * weightKg * durationHours;
            const durationMinutes = next / 60;
            const repsPerMinute = durationMinutes > 0 ? repsRef.current / durationMinutes : 0;
            const scores = formScoresRef.current;
            const avgFormScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 70;

            predictMultiplier({ weightKg, repsPerMinute, avgFormScore, met, durationHours })
              .then((multiplier) => {
                setLiveCalories(Math.round(baseCalories * multiplier * 100) / 100);
              })
              .catch(() => {
                const multiplier = 1.0 + 0.01 * repsPerMinute + 0.002 * (avgFormScore - 70);
                setLiveCalories(Math.round(baseCalories * Math.min(1.3, Math.max(0.8, multiplier)) * 100) / 100);
              });
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTracking, user, metValues]);

  // --- Start tracking ---
  const handleStart = async () => {
    setCameraError('');
    setFeedback('Get in position...');
    setSaveState('idle');
    setSavedSession(null);
    setAiSummary('');
    setAiSummaryError('');
    setAiSummaryPowered(false);
    setCoachTip('');
    lastGroqTipRepRef.current = 0;
    groqTipInFlightRef.current = false;
    if (!videoRef.current || !poseRef.current) return;

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      await camera.start();
      cameraRef.current = camera;
      setIsTracking(true);
      speak(`Starting ${EXERCISE_CONFIG[exerciseType].label} tracking`, { priority: true });
    } catch (err) {
      setCameraError('Could not access webcam. Please allow camera permissions and try again.');
    }
  };

  // --- Stop tracking ---
  const handleStop = async () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsTracking(false);
    setFormIssue(null);
    setFeedback('Session stopped.');

    const sessionReps = repsRef.current;
    const sessionSeconds = seconds;
    const sessionForm = overallScore ?? undefined;
    const sessionFatigue = Math.round(fatigueEmaRef.current);
    const sessionRisk = injuryRiskRef.current;
    const sessionRiskFactors = [...riskFactorsRef.current];

    if (sessionReps <= 0 || sessionSeconds <= 0) return;

    setSaveState('saving');
    setAiSummaryLoading(true);
    setAiSummary('');
    setAiSummaryError('');

    const summaryPayload = {
      exerciseType,
      exerciseLabel: EXERCISE_CONFIG[exerciseType]?.label,
      reps: sessionReps,
      durationSeconds: sessionSeconds,
      formScore: sessionForm,
      fatigueScore: sessionFatigue,
      injuryRisk: sessionRisk,
      riskFactors: sessionRiskFactors,
    };

    const summaryPromise = fetchWorkoutSummary(summaryPayload);

    try {
      const saved = await saveWorkoutSession({
        exerciseType,
        reps: sessionReps,
        durationSeconds: sessionSeconds,
        formScore: sessionForm,
      });
      setSavedSession(saved);
      setSaveState('saved');
      speak('Session saved successfully!', { priority: true });
    } catch {
      setSaveState('error');
    }

    try {
      const { summary, aiPowered, error } = await summaryPromise;
      if (summary) {
        setAiSummary(summary);
        setAiSummaryPowered(Boolean(aiPowered));
      }
      if (error) setAiSummaryError('AI summary unavailable — showing fallback.');
    } catch {
      setAiSummary('Great session — keep building consistency and focus on form on every rep.');
      setAiSummaryError('Could not reach Groq — offline summary shown.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // --- Reset ---
  const handleReset = () => {
    setReps(0);
    setSeconds(0);
    setRepScores([]);
    setLastRepScore(null);
    setFormIssue(null);
    setLiveCalories(0);
    setSaveState('idle');
    setSavedSession(null);
    setAiSummary('');
    setAiSummaryError('');
    setAiSummaryPowered(false);
    setCoachTip('');
    lastGroqTipRepRef.current = 0;
    groqTipInFlightRef.current = false;
    repStateRef.current = 'up';
    minAngleRef.current = Infinity;
    minAlignmentRef.current = 180;
    setFeedback('Counters reset.');
    repTimestampsRef.current = [];
    repDurationsRef.current = [];
    baselineDurationRef.current = null;
    fatigueEmaRef.current = 0;
    setFatigueScore(0);
    setFatigueLevel('fresh');
    muscleActivationEmaRef.current = 0;
    setMuscleActivation(0);
    riskEmaRef.current = 0;
    setInjuryRisk(0);
    setRiskLevel('low');
    setRiskFactors([]);
  };

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-on-surface">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface font-display-lg">
            Live AI Coach HUD
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm">
            Interactive real-time posture check and CNS fatigue tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!modelsReady && (
            <span className="text-xs text-on-surface-variant flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant">
              <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse"></span>
              Initializing AI Engine...
            </span>
          )}
          {modelsReady && (
            <span className="text-xs text-primary flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
              AI Coach Active{groqEnabled ? ' (Groq Engine)' : ''}
            </span>
          )}
          
          {/* Settings / Toggles */}
          <button
            onClick={() => setAutoDetectEnabled((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              autoDetectEnabled 
                ? 'border-tertiary text-tertiary bg-tertiary/10' 
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🎯 Auto-Detect: {autoDetectEnabled ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              voiceEnabled 
                ? 'border-primary text-primary bg-primary/10 shadow-[0_0_10px_rgba(255,180,170,0.1)]' 
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {voiceEnabled ? '🔊 Voice Feedback' : '🔇 Muted'}
          </button>
        </div>
      </div>

      {/* Errors or alerts */}
      {!user?.weight && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs rounded-xl p-3 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>Your profile is missing weight — calorie estimates will be unavailable. Please update your profile.</span>
        </div>
      )}
      {cameraError && (
        <div className="bg-primary/10 border border-primary/30 text-primary text-sm rounded-xl p-4 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{cameraError}</span>
        </div>
      )}

      {/* Exercise selector (Only visible when not tracking) */}
      {!isTracking && (
        <div className="glass-card p-6 rounded-2xl mb-8 animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-label-bold">
            Select Active Exercise Routine
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(EXERCISE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setExerciseType(key)}
                className={`px-4 py-4 rounded-xl font-bold transition-all text-center flex flex-col items-center justify-center gap-2 border ${
                  exerciseType === key 
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(255,180,170,0.15)]' 
                    : 'bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {key === 'squat' ? 'directions_run' : key === 'pushup' ? 'fitness_center' : key === 'jumpingjack' ? 'sports_gymnastics' : 'accessibility_new'}
                </span>
                <span className="text-sm">{cfg.label}s</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main HUD Interface Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Viewport / Camera Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-outline-variant aspect-video shadow-2xl">
            
            {/* Camera elements */}
            <video ref={videoRef} className="hidden" playsInline />
            <canvas ref={canvasRef} className="w-full h-full block" />
            
            {/* SCANLINE animation */}
            {isTracking && <div className="scanline"></div>}

            {/* Viewport placeholder when not tracking */}
            {!isTracking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container/60 backdrop-blur-sm p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-4xl">photo_camera</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2 font-display-lg">Camera Viewport Idle</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Position your camera to see your full body. Press <strong>Start Workout</strong> below to begin real-time pose coaching.
                </p>
              </div>
            )}

            {/* OVERLAY: HUD TOP LEFT (Timer/Set) */}
            {isTracking && (
              <div className="absolute top-4 left-4 z-10 animate-fade-in">
                <div className="glass-panel p-3 md:p-4 rounded-xl border-l-4 border-primary">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="material-symbols-outlined text-primary text-sm">timer</span>
                    <span className="text-[9px] md:text-[10px] font-label-bold text-on-surface-variant uppercase tracking-[0.2em]">Set Duration</span>
                  </div>
                  <div className="font-stats-num text-xl md:text-2xl text-primary tracking-wider font-bold">
                    {formatTime(seconds)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-on-surface">TRAINING</span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  </div>
                </div>
              </div>
            )}

            {/* OVERLAY: HUD TOP RIGHT (Form Score) */}
            {isTracking && (
              <div className="absolute top-4 right-4 z-10 animate-fade-in">
                <div className="glass-panel p-3 md:p-4 rounded-xl flex items-center gap-3">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle className="text-outline-variant" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-width="3"></circle>
                      <circle 
                        className="text-primary glow-primary transition-all duration-300" 
                        cx="24" 
                        cy="24" 
                        fill="transparent" 
                        r="20" 
                        stroke="currentColor" 
                        strokeDasharray="125.6" 
                        strokeDashoffset={125.6 - (125.6 * (overallScore !== null ? overallScore : 100)) / 100} 
                        strokeWidth="3"
                      ></circle>
                    </svg>
                    <span className="absolute font-stats-num text-xs font-bold text-primary">
                      {overallScore !== null ? overallScore : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] md:text-[10px] font-label-bold text-on-surface-variant uppercase tracking-[0.2em] block">Form Score</span>
                    <div className="text-xs md:text-sm font-bold text-on-surface">
                      {overallScore === null ? 'ANALYZING' : overallScore >= 80 ? 'OPTIMAL' : overallScore >= 60 ? 'STABLE' : 'ADJUST'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OVERLAY: HUD BOTTOM CENTER (Rep Counter) */}
            {isTracking && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-center animate-fade-in">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-label-bold text-primary uppercase tracking-[0.3em] mb-1 drop-shadow-md">Reps</span>
                  <div className="font-display-lg text-6xl md:text-7xl leading-none font-black text-on-surface drop-shadow-[0_0_20px_rgba(255,180,170,0.4)] animate-pulse">
                    {reps}
                  </div>
                  <div className="w-32 h-1 bg-outline-variant mt-2 overflow-hidden rounded-full">
                    <div className="h-full bg-primary glow-primary transition-all duration-300" style={{ width: `${Math.min(100, (reps % 10) * 10)}%` }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* OVERLAY: HUD BOTTOM LEFT (BPM / Calories) */}
            {isTracking && (
              <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                <div className="glass-panel p-2.5 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm animate-pulse">favorite</span>
                  <div>
                    <div className="text-[8px] text-on-surface-variant font-bold uppercase">CNS Load</div>
                    <div className="font-stats-num text-xs text-on-surface">{100 + fatigueScore} BPM</div>
                  </div>
                </div>
                <div className="glass-panel p-2.5 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-sm">local_fire_department</span>
                  <div>
                    <div className="text-[8px] text-on-surface-variant font-bold uppercase">Burned</div>
                    <div className="font-stats-num text-xs text-on-surface">{liveCalories.toFixed(0)} kcal</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* OVERLAY: HUD BOTTOM RIGHT (Fatigue & Injury Risk Alerts) */}
            {isTracking && (
              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 items-end">
                {fatigueScore > 0 && (
                  <div className={`glass-panel px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                    fatigueLevel === 'high' ? 'text-primary border-l-2 border-primary' : 'text-tertiary border-l-2 border-tertiary'
                  }`}>
                    {fatigueLevel} fatigue ({fatigueScore}%)
                  </div>
                )}
                {injuryRisk > 0 && (
                  <div className={`glass-panel px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                    riskLevel === 'high' ? 'text-primary border-l-2 border-primary' : 'text-yellow-400'
                  }`}>
                    Risk: {riskLevel} ({injuryRisk}%)
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Controls Bar beneath the Viewport */}
          <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {!isTracking ? (
                <button 
                  onClick={handleStart} 
                  className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl transition hover:opacity-90 active:scale-95 flex items-center gap-2 shadow-[0_0_15px_rgba(255,85,69,0.3)] font-label-bold"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Start Workout
                </button>
              ) : (
                <button 
                  onClick={handleStop} 
                  className="px-6 py-2.5 bg-[#44302d] text-primary border border-primary/30 font-bold rounded-xl transition hover:bg-[#392522] active:scale-95 flex items-center gap-2 font-label-bold"
                >
                  <span className="material-symbols-outlined">stop_circle</span>
                  Stop & Analyze
                </button>
              )}
              
              <button
                onClick={handleReset}
                disabled={isTracking}
                className="px-4 py-2.5 bg-surface border border-outline-variant hover:bg-surface-variant disabled:opacity-40 text-on-surface-variant hover:text-on-surface font-bold rounded-xl transition active:scale-95 flex items-center gap-2 font-label-bold"
              >
                <span className="material-symbols-outlined">autorenew</span>
                Reset
              </button>
            </div>

            {/* Quick Session Status Info */}
            <div className="text-right text-xs text-on-surface-variant font-medium hidden sm:block">
              {isTracking ? (
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping"></span>
                  Recording {EXERCISE_CONFIG[exerciseType]?.label} session...
                </span>
              ) : (
                <span>System status: Idle</span>
              )}
            </div>
          </div>
          
          {/* Risk Factors Log */}
          {riskFactors.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2 animate-fade-in">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">warning</span>
                Injury Risk Indicators
              </h4>
              <div className="space-y-1">
                {riskFactors.map((f) => (
                  <p key={f.type} className="text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    {f.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Feedback & Last Rep details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <span className="text-[10px] font-label-bold text-on-surface-variant uppercase tracking-widest block mb-2">Posture Tracker Feedback</span>
              <p className="text-sm font-semibold text-on-surface min-h-[40px] flex items-center">
                {feedback}
              </p>
            </div>
            
            <div className="glass-card p-4 rounded-xl">
              <span className="text-[10px] font-label-bold text-on-surface-variant uppercase tracking-widest block mb-2">Last Completed Repetition</span>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-on-surface font-stats-num">
                    {lastRepScore !== null ? lastRepScore : '--'}
                  </span>
                  <span className="text-xs text-on-surface-variant">/ 100</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                  lastRepScore === null 
                    ? 'bg-surface-container-highest text-on-surface-variant' 
                    : lastRepScore >= 80 
                    ? 'bg-green-500/10 text-green-400' 
                    : lastRepScore >= 60 
                    ? 'bg-yellow-500/10 text-yellow-400' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {lastRepScore === null ? 'No rep yet' : lastRepScore >= 80 ? 'Excellent' : lastRepScore >= 60 ? 'Fair' : 'Adjust'}
                </span>
              </div>
            </div>
          </div>

          {/* Post-Workout Summary Card */}
          {aiSummaryLoading && (
            <div className="glass-card p-6 rounded-2xl flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-on-surface">Generating post-workout AI summary...</span>
            </div>
          )}
          
          {aiSummary && !aiSummaryLoading && (
            <div className="glass-card p-6 rounded-2xl border border-primary/20 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Post-Workout AI Summary</h4>
                </div>
                {aiSummaryPowered && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">Groq Engine</span>
                )}
              </div>
              <p className="text-sm text-on-surface leading-relaxed font-body-md">
                {aiSummary}
              </p>
              {aiSummaryError && (
                <p className="text-xs text-yellow-500/80 mt-2">{aiSummaryError}</p>
              )}
            </div>
          )}

          {saveState === 'saved' && savedSession && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl p-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>Session saved successfully! Recorded {savedSession.calories} kcal to your history.</span>
            </div>
          )}
          
          {saveState === 'error' && (
            <div className="bg-primary/10 border border-primary/30 text-primary text-sm rounded-xl p-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>Failed to sync session with the cloud. Your rep metrics are preserved locally.</span>
            </div>
          )}

        </div>

        {/* Right: AI Coach Box Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="glass-panel p-5 rounded-2xl border border-outline-variant space-y-6">
            
            {/* AI Coach Feed tip */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <span className="text-xs font-label-bold text-on-surface uppercase tracking-widest">AI Performance Coach</span>
              </div>
              
              {coachTipLoading && isTracking && (
                <div className="flex items-center gap-2 text-xs text-tertiary py-4">
                  <span className="w-3.5 h-3.5 border-2 border-tertiary border-t-transparent rounded-full animate-spin" />
                  Analyzing movement depth...
                </div>
              )}
              
              <p className="text-on-surface text-base italic leading-relaxed min-h-[60px] flex items-center font-body-lg">
                {coachTip ? `"${coachTip}"` : '"Maintain steady alignment and focus on breathing."'}
              </p>
            </div>

            {/* Muscle Activation Heatmap */}
            <div className="pt-5 border-t border-outline-variant">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-label-bold text-on-surface-variant uppercase tracking-widest">Target Groups</span>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                  {isTracking ? `${Math.round(muscleActivation)}% Activation` : 'Idle'}
                </span>
              </div>
              
              <div className="relative w-full aspect-[1/1.1] bg-surface-container rounded-xl p-4 flex flex-col items-center justify-center overflow-hidden border border-outline-variant">
                <MuscleActivationOverlay
                  primaryMuscles={EXERCISE_CONFIG[exerciseType]?.primaryMuscles || []}
                  secondaryMuscles={EXERCISE_CONFIG[exerciseType]?.secondaryMuscles || []}
                  activation={isTracking ? muscleActivation : 0}
                />
                
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  {(EXERCISE_CONFIG[exerciseType]?.primaryMuscles || []).map((m) => (
                    <span key={m} className="px-2 py-0.5 bg-primary/20 border border-primary/40 text-[9px] font-bold text-primary rounded-md uppercase">
                      {m}
                    </span>
                  ))}
                  {(EXERCISE_CONFIG[exerciseType]?.secondaryMuscles || []).map((m) => (
                    <span key={m} className="px-2 py-0.5 bg-tertiary/20 border border-tertiary/40 text-[9px] font-bold text-tertiary rounded-md uppercase">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Instructions Box */}
          <div className="glass-card p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 font-label-bold">
              Workout Tips & Rules
            </h4>
            <ul className="text-xs text-on-surface-variant space-y-2.5 list-disc list-inside">
              <li>Align your body sideways or front-facing according to the exercise instructions.</li>
              <li>Make sure the webcam captures your entire body (head to toes).</li>
              <li>Complete repetitions with clean, slow movements to allow high-accuracy tracking.</li>
              <li>If Auto-Detect is enabled, the system will adapt and track your posture automatically.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LiveWorkoutTracker;
