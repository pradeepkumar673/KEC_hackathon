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
import { predictFormScore } from '../../ml/formModel';

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
};

const FALLBACK_MET = { pushup: 8.0, squat: 5.0 };

// ── Fatigue detection config ────────────────────────────────────────────
const FATIGUE_WINDOW = 5;        // reps averaged for "current pace"
const BASELINE_REPS = 3;         // first N reps define the "fresh" baseline
const FATIGUE_EMA_ALPHA = 0.35;  // smoothing factor (higher = reacts faster)

const movingAverage = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

// ── Auto exercise recognition config ────────────────────────────────────
const RECOGNITION_WINDOW = 15;    // frames to vote over
const RECOGNITION_AGREEMENT = 10; // votes needed to commit a switch

// ── Injury risk config ──────────────────────────────────────────────────
const VALGUS_THRESHOLD = 0.035;      // normalized x-deviation of knee from hip-ankle line
const ASYMMETRY_THRESHOLD_DEG = 12;  // left/right angle difference that flags compensation
const RISK_EMA_ALPHA = 0.3;

const RISK_CONFIG = {
  pushup: {
    mirrorPrimary: [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
    strainThreshold: 155,   // stricter than the coaching alignmentIdeal — flags real strain, not just poor form
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
};

const detectKneeValgus = (hip, knee, ankle) => {
  if (!hip || !knee || !ankle || ankle.y === hip.y) return false;
  const t = (knee.y - hip.y) / (ankle.y - hip.y);
  const expectedKneeX = hip.x + (ankle.x - hip.x) * t;
  return knee.x - expectedKneeX < -VALGUS_THRESHOLD; // knee tracking medial to the hip-ankle line
};

const classifyPose = (landmarks) => {
  const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const hip = landmarks[LANDMARKS.LEFT_HIP];
  const wrist = landmarks[LANDMARKS.LEFT_WRIST];
  if (!shoulder || !hip || !wrist) return null;

  // Torso angle from vertical: ~0° standing, ~90° horizontal (plank)
  const dx = Math.abs(hip.x - shoulder.x);
  const dy = Math.abs(hip.y - shoulder.y);
  const torsoAngleFromVertical = (Math.atan2(dx, dy) * 180) / Math.PI;
  const wristNearShoulderHeight = Math.abs(wrist.y - shoulder.y) < 0.15;

  if (torsoAngleFromVertical > 55 && wristNearShoulderHeight) return 'pushup';
  if (torsoAngleFromVertical < 35) return 'squat';
  return null; // ambiguous frame — don't vote
};

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

// Normalizes wherever the current joint angle sits between "rest" (topAngle)
// and "peak contraction" (idealBottom) into a 0–1 activation level.
const computeActivation = (primaryAngle, config) => {
  const range = config.topAngle - config.idealBottom;
  if (range <= 0 || primaryAngle == null) return 0;
  const clamped = Math.min(config.topAngle, Math.max(config.idealBottom, primaryAngle));
  return Math.round(((config.topAngle - clamped) / range) * 100) / 100;
};

// Client-side mirror of the backend regression multiplier, so the live
// counter tracks the same curve the server will use at save time.
const liveMultiplier = ({ repsPerMinute = 0, avgFormScore = 70 }) => {
  const formDeviation = avgFormScore - 70;
  let multiplier = 1.0 + 0.01 * repsPerMinute + 0.002 * formDeviation;
  return Math.min(1.3, Math.max(0.8, multiplier));
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

const LiveWorkoutTracker = () => {
  const { user } = useAuth();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const repStateRef = useRef('up');
  const exerciseTypeRef = useRef('pushup');
  const minAngleRef = useRef(Infinity);
  const minAlignmentRef = useRef(180);
  const cvReadyRef = useRef(false);
  const lastSpokenRef = useRef({ text: '', time: 0 });
  const repsRef = useRef(0); // mirrors `reps` state for use inside interval closures
  const formScoresRef = useRef([]);

  // Fatigue refs
  const repTimestampsRef = useRef([]);     // ms timestamp of each completed rep
  const repDurationsRef = useRef([]);      // rolling window, seconds-per-rep
  const baselineDurationRef = useRef(null);
  const fatigueEmaRef = useRef(0);

  // Muscle activation refs
  const muscleActivationEmaRef = useRef(0);
  const [muscleActivation, setMuscleActivation] = useState(0);

  // Auto recognition refs
  const poseClassBufferRef = useRef([]);

  const riskEmaRef = useRef(0);
  const [injuryRisk, setInjuryRisk] = useState(0);          // 0–100
  const [riskLevel, setRiskLevel] = useState('low');         // low | moderate | high
  const [riskFactors, setRiskFactors] = useState([]);

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
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [savedSession, setSavedSession] = useState(null);

  // Fatigue states
  const [fatigueScore, setFatigueScore] = useState(0);       // 0–100
  const [fatigueLevel, setFatigueLevel] = useState('fresh'); // fresh | moderate | high

  // Auto recognition states
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [detectedExercise, setDetectedExercise] = useState(null);

  const [readiness, setReadiness] = useState(null);

  const overallScore = useMemo(() => {
    if (repScores.length === 0) return null;
    const sum = repScores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / repScores.length);
  }, [repScores]);

  useEffect(() => {
    repsRef.current = reps;
  }, [reps]);

  useEffect(() => {
    formScoresRef.current = repScores;
  }, [repScores]);

  // Voice cues helper
  const speak = useCallback(
    (text, { priority = false, cooldownMs = 3000 } = {}) => {
      if (!voiceEnabled || !window.speechSynthesis) return;
      const now = Date.now();
      if (!priority && text === lastSpokenRef.current.text && now - lastSpokenRef.current.time < cooldownMs) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current = { text, time: now };
    },
    [voiceEnabled]
  );

  // Fatigue detection function
  const registerRepCompletion = useCallback(() => {
    const now = Date.now();
    const timestamps = repTimestampsRef.current;
    timestamps.push(now);
    if (timestamps.length < 2) return;

    const durationSec = (now - timestamps[timestamps.length - 2]) / 1000;
    const durations = repDurationsRef.current;
    durations.push(durationSec);
    if (durations.length > FATIGUE_WINDOW) durations.shift();

    // Baseline pace = average of the first few reps, assumed "fresh"
    if (baselineDurationRef.current === null && timestamps.length - 1 >= BASELINE_REPS) {
      baselineDurationRef.current = movingAverage(durations.slice(0, BASELINE_REPS));
    }
    if (!baselineDurationRef.current) return;

    const currentSMA = movingAverage(durations);
    const slowdownRatio = currentSMA / baselineDurationRef.current; // >1 = slower than baseline
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

  // Exercise switch and reset logic
  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
    repStateRef.current = 'up';
    minAngleRef.current = Infinity;
    minAlignmentRef.current = 180;

    // Reset fatigue tracking for the new exercise
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

  // Fetch MET values once on mount
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

  const calculateAngle = useCallback((a, b, c) => {
    return angleFallback(a, b, c);
  }, []);

  const computeInjuryRisk = useCallback(
    (landmarks, type, primaryAngle, alignmentAngle) => {
      const config = RISK_CONFIG[type];
      if (!config) return { rawRisk: 0, factors: [] };

      let rawRisk = 0;
      const factors = [];

      // Bilateral asymmetry — tracked side vs. mirror side
      const [mA, mB, mC] = config.mirrorPrimary;
      const mirrorAngle = calculateAngle(landmarks[mA], landmarks[mB], landmarks[mC]);
      if (mirrorAngle !== null && primaryAngle !== null) {
        if (Math.abs(primaryAngle - mirrorAngle) > ASYMMETRY_THRESHOLD_DEG) {
          rawRisk += 25;
          factors.push({ type: 'asymmetry', message: 'Left/right imbalance — one side is compensating.', severity: 'moderate' });
        }
      }

      // Squat-specific: knee valgus
      if (config.hipKneeAnkle) {
        const [hA, kA, aA] = config.hipKneeAnkle;
        if (detectKneeValgus(landmarks[hA], landmarks[kA], landmarks[aA])) {
          rawRisk += 35;
          factors.push({ type: 'valgus', message: 'Knee caving inward — push knees out over your toes.', severity: 'high' });
        }
      }

      // Spinal load — sagging hips (pushup) or forward lean (squat)
      if (alignmentAngle !== null && alignmentAngle < config.strainThreshold) {
        rawRisk += 25;
        factors.push({ type: 'spinal_load', message: config.strainMessage, severity: 'high' });
      }

      // Hyperextension at lockout
      if (primaryAngle !== null && primaryAngle > config.hyperextensionAngle) {
        rawRisk += 10;
        factors.push({ type: 'hyperextension', message: "Don't lock the joint out hard at the top.", severity: 'low' });
      }

      return { rawRisk: Math.min(100, rawRisk), factors };
    },
    [calculateAngle]
  );

  const processReps = useCallback(
    async (landmarks, canvasWidth, canvasHeight) => {
      const type = exerciseTypeRef.current;
      const config = EXERCISE_CONFIG[type];

      const [pA, pB, pC] = config.primary;
      const primaryAngle = calculateAngle(landmarks[pA], landmarks[pB], landmarks[pC]);
      if (primaryAngle === null) return;

      const [aA, aB, aC] = config.alignment;
      const alignmentAngle = calculateAngle(landmarks[aA], landmarks[aB], landmarks[aC]);

      setCurrentAngle(Math.round(primaryAngle));

      const rawActivation = computeActivation(primaryAngle, config);
      muscleActivationEmaRef.current = 0.4 * rawActivation + 0.6 * muscleActivationEmaRef.current;
      setMuscleActivation(muscleActivationEmaRef.current);

      if (repStateRef.current === 'down') {
        const { rawRisk, factors } = computeInjuryRisk(landmarks, type, primaryAngle, alignmentAngle);
        const combinedRisk = Math.min(100, rawRisk + fatigueScore * 0.3); // fatigue elevates injury risk
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

      if (primaryAngle > config.topAngle) {
        if (repStateRef.current === 'down') {
          repStateRef.current = 'up';

          const depthScore = scoreDepth(minAngleRef.current, config.bottomAngle, config.idealBottom);
          const alignScore = scoreAlignment(minAlignmentRef.current, config.alignmentIdeal);
          
          let repScore;
          try {
            const mlScore = await predictFormScore(landmarks);
            repScore = (mlScore !== null) ? mlScore : Math.round(depthScore * 0.6 + alignScore * 0.4);
          } catch (err) {
            console.error('Error executing form score model inference:', err);
            repScore = Math.round(depthScore * 0.6 + alignScore * 0.4);
          }

          setRepScores((prev) => [...prev, repScore]);
          setLastRepScore(repScore);
          setReps((prev) => {
            const next = prev + 1;
            speak(`Rep ${next}`, { priority: true });
            return next;
          });
          registerRepCompletion();
          setFeedback(repScore >= 80 ? 'Great form!' : 'Good rep — check your form tips.');

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
    [calculateAngle, speak, registerRepCompletion, computeInjuryRisk, fatigueScore]
  );

  // Auto Exercise Recognition callback
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

      // Only switch when confident, and between reps so we don't corrupt an in-progress rep
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

  useEffect(() => {
    if (!isTracking || !formIssue) return;
    speak(formIssue.message);
  }, [formIssue?.type, isTracking, speak]);

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
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#F97316', lineWidth: 3 });
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FFFFFF', fillColor: '#F97316', lineWidth: 1, radius: 3 });
        runAutoDetection(results.poseLandmarks);
        processReps(results.poseLandmarks, canvas.width, canvas.height);
      }

      ctx.restore();

      if (formIssue) {
        drawArrow(ctx, formIssue.x, formIssue.y, formIssue.direction, '#EF4444');
        ctx.save();
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#EF4444';
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

  useEffect(() => {
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
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

  // Timer + live calorie counter (same tick)
  useEffect(() => {
    if (isTracking) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prevSeconds) => {
          const nextSeconds = prevSeconds + 1;

          const weightKg = user?.weight;
          if (weightKg) {
            const met = metValues[exerciseTypeRef.current] ?? FALLBACK_MET[exerciseTypeRef.current] ?? 5.0;
            const durationHours = nextSeconds / 3600;
            const baseCalories = met * weightKg * durationHours;

            const durationMinutes = nextSeconds / 60;
            const repsPerMinute = durationMinutes > 0 ? repsRef.current / durationMinutes : 0;
            const scores = formScoresRef.current;
            const avgFormScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 70;

            predictMultiplier({ weightKg, repsPerMinute, avgFormScore, met, durationHours })
              .then((multiplier) => {
                setLiveCalories(Math.round(baseCalories * multiplier * 100) / 100);
              })
              .catch((err) => {
                console.error('Error predicting calorie multiplier:', err);
                const multiplier = liveMultiplier({ repsPerMinute, avgFormScore });
                setLiveCalories(Math.round(baseCalories * multiplier * 100) / 100);
              });
          }

          return nextSeconds;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTracking, user, metValues]);

  const handleStart = async () => {
    setCameraError('');
    setFeedback('Get in position...');
    setSaveState('idle');
    setSavedSession(null);
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

  const handleStop = async () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsTracking(false);
    setFormIssue(null);
    setFeedback('Session stopped.');

    // Persist the session if there's anything meaningful to save
    if (repsRef.current > 0 && seconds > 0) {
      setSaveState('saving');
      try {
        const saved = await saveWorkoutSession({
          exerciseType,
          reps: repsRef.current,
          durationSeconds: seconds,
          formScore: overallScore ?? undefined,
        });
        setSavedSession(saved);
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
      }
    }
  };

  const handleReset = () => {
    setReps(0);
    setSeconds(0);
    setRepScores([]);
    setLastRepScore(null);
    setFormIssue(null);
    setLiveCalories(0);
    setSaveState('idle');
    setSavedSession(null);
    repStateRef.current = 'up';
    minAngleRef.current = Infinity;
    minAlignmentRef.current = 180;
    setFeedback('Counters reset.');

    // Reset fatigue
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

  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Workout Tracker</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoDetectEnabled((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              autoDetectEnabled ? 'border-blue-500 text-blue-400' : 'border-gray-600 text-gray-400'
            }`}
          >
            {autoDetectEnabled
              ? `🎯 Auto-Detect On${detectedExercise ? ` (${EXERCISE_CONFIG[detectedExercise]?.label})` : ''}`
              : '🎯 Auto-Detect Off'}
          </button>
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              voiceEnabled ? 'border-orange-500 text-orange-400' : 'border-gray-600 text-gray-400'
            }`}
          >
            {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
          </button>
        </div>
      </div>

      {readiness && (
        <div
          className={`rounded-xl border p-4 mb-6 ${
            readiness.level === 'high'
              ? 'bg-green-500/10 border-green-500/30'
              : readiness.level === 'moderate'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Today's Readiness</span>
            <span
              className={`text-lg font-bold ${
                readiness.level === 'high' ? 'text-green-400' : readiness.level === 'moderate' ? 'text-yellow-400' : 'text-red-400'
              }`}
            >
              {readiness.score}/100
            </span>
          </div>
          <p className="text-xs text-gray-400">{readiness.factors[0]}</p>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        {Object.entries(EXERCISE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setExerciseType(key)}
            disabled={isTracking}
            className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
              exerciseType === key ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {cfg.label}s
          </button>
        ))}
      </div>

      {!user?.weight && (
        <p className="text-xs text-yellow-500 mb-4">
          Your profile is missing weight — calorie estimates will be unavailable until it's set.
        </p>
      )}
      {cameraError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{cameraError}</div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="relative w-full rounded-xl overflow-hidden bg-black border border-gray-700">
          <video ref={videoRef} className="hidden" playsInline />
          <canvas ref={canvasRef} className="w-full h-auto block" />
          {!isTracking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-gray-300 text-sm">Camera feed will appear here</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 flex flex-col items-center">
          <p className="text-xs text-gray-400 mb-2 self-start">
            {EXERCISE_CONFIG[exerciseType].label} — muscle activation
          </p>
          <MuscleActivationOverlay
            primaryMuscles={EXERCISE_CONFIG[exerciseType].primaryMuscles}
            secondaryMuscles={EXERCISE_CONFIG[exerciseType].secondaryMuscles}
            activation={isTracking ? muscleActivation : 0}
          />
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Primary
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Secondary
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{reps}</div>
          <div className="text-xs text-gray-400 mt-1">Reps</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{formatTime(seconds)}</div>
          <div className="text-xs text-gray-400 mt-1">Time</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{currentAngle !== null ? `${currentAngle}°` : '--'}</div>
          <div className="text-xs text-gray-400 mt-1">Joint Angle</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{overallScore !== null ? overallScore : '--'}</div>
          <div className="text-xs text-gray-400 mt-1">Form Score</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{liveCalories.toFixed(1)}</div>
          <div className="text-xs text-gray-400 mt-1">Calories</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div
            className={`text-3xl font-bold ${
              fatigueLevel === 'high' ? 'text-red-400' : fatigueLevel === 'moderate' ? 'text-yellow-400' : 'text-green-400'
            }`}
          >
            {fatigueScore}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Fatigue</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div
            className={`text-3xl font-bold ${
              riskLevel === 'high' ? 'text-red-400' : riskLevel === 'moderate' ? 'text-yellow-400' : 'text-green-400'
            }`}
          >
            {injuryRisk}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Injury Risk</div>
        </div>
      </div>

      {riskFactors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 space-y-1">
          {riskFactors.map((f) => (
            <p key={f.type} className="text-xs text-red-300">⚠ {f.message}</p>
          ))}
        </div>
      )}

      {lastRepScore !== null && (
        <p className="text-sm text-center text-gray-400 mb-2">Last rep score: {lastRepScore}/100</p>
      )}

      <p className="text-sm text-gray-400 mb-4 text-center">{feedback}</p>

      {saveState === 'saving' && (
        <p className="text-sm text-center text-gray-400 mb-4">Saving session...</p>
      )}
      {saveState === 'saved' && savedSession && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4 text-center">
          Session saved — {savedSession.calories} kcal recorded to your history.
        </div>
      )}
      {saveState === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4 text-center">
          Couldn't save this session. Your reps are still shown above — try Stop again if you're online.
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {!isTracking ? (
          <button onClick={handleStart} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition">
            Start
          </button>
        ) : (
          <button onClick={handleStop} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition">
            Stop
          </button>
        )}
        <button
          onClick={handleReset}
          disabled={isTracking}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default LiveWorkoutTracker;
