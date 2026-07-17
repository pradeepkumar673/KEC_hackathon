import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

// ── Landmark indices ───────────────────────────────────────────────────────
const LANDMARKS = {
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
  LEFT_HIP:       23,
  RIGHT_HIP:      24,
  LEFT_KNEE:      25,
  RIGHT_KNEE:     26,
  LEFT_ANKLE:     27,
  RIGHT_ANKLE:    28,
};

// ── Per-exercise config ────────────────────────────────────────────────────
const EXERCISE_CONFIG = {
  pushup: {
    label: 'Push-up',
    primary:   [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW,  LANDMARKS.LEFT_WRIST],
    alignment: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP,    LANDMARKS.LEFT_ANKLE],
    topAngle:       155,  // arm extended = "up"
    bottomAngle:    90,   // elbow bent past this = "down"
    idealBottom:    75,   // angle at/below this = perfect depth score
    alignmentIdeal: 170,  // near-straight back
    depthJoint:     LANDMARKS.LEFT_ELBOW,
    alignmentJoint: LANDMARKS.LEFT_HIP,
    depthMsg:       'Go lower',
    alignmentMsg:   'Keep your back straight',
  },
  squat: {
    label: 'Squat',
    primary:   [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE,  LANDMARKS.LEFT_ANKLE],
    alignment: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
    topAngle:       160,
    bottomAngle:    100,
    idealBottom:    80,
    alignmentIdeal: 150,  // squats naturally lean forward some
    depthJoint:     LANDMARKS.LEFT_KNEE,
    alignmentJoint: LANDMARKS.LEFT_HIP,
    depthMsg:       'Squat deeper',
    alignmentMsg:   'Keep your chest up',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// Plain-JS fallback angle calc (used until OpenCV.js finishes loading)
const angleFallback = (a, b, c) => {
  if (!a || !b || !c) return null;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const scoreDepth = (minAngle, _bottomAngle, idealBottom) => {
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

// ── Component ──────────────────────────────────────────────────────────────

const LiveWorkoutTracker = () => {
  const videoRef         = useRef(null);
  const canvasRef        = useRef(null);
  const poseRef          = useRef(null);
  const cameraRef        = useRef(null);
  const timerIntervalRef = useRef(null);

  const repStateRef      = useRef('up');
  const exerciseTypeRef  = useRef('pushup');
  const minAngleRef      = useRef(Infinity); // min primary angle during 'down' phase
  const minAlignmentRef  = useRef(180);      // min alignment angle during 'down' phase
  const cvReadyRef       = useRef(false);
  const lastSpokenRef    = useRef({ text: '', time: 0 });

  const [exerciseType,  setExerciseType]  = useState('pushup');
  const [reps,          setReps]          = useState(0);
  const [isTracking,    setIsTracking]    = useState(false);
  const [seconds,       setSeconds]       = useState(0);
  const [currentAngle,  setCurrentAngle]  = useState(null);
  const [feedback,      setFeedback]      = useState('Select an exercise and press Start');
  const [cameraError,   setCameraError]   = useState('');
  const [formIssue,     setFormIssue]     = useState(null); // { type, message, x, y, direction }
  const [repScores,     setRepScores]     = useState([]);
  const [lastRepScore,  setLastRepScore]  = useState(null);
  const [voiceEnabled,  setVoiceEnabled]  = useState(true);
  const [cvReady,       setCvReady]       = useState(false);

  const overallScore = useMemo(() => {
    if (repScores.length === 0) return null;
    return Math.round(repScores.reduce((acc, s) => acc + s, 0) / repScores.length);
  }, [repScores]);

  // Sync exercise type ref
  useEffect(() => {
    exerciseTypeRef.current  = exerciseType;
    repStateRef.current      = 'up';
    minAngleRef.current      = Infinity;
    minAlignmentRef.current  = 180;
  }, [exerciseType]);

  // ── Load OpenCV.js once on mount ──────────────────────────────────────
  useEffect(() => {
    if (window.cv && window.cv.norm) {
      cvReadyRef.current = true;
      setCvReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src   = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.cv && window.cv.norm) {
          cvReadyRef.current = true;
          setCvReady(true);
          clearInterval(check);
        }
      }, 200);
    };
    document.body.appendChild(script);
    // leave script tag cached — safe to skip removal
  }, []);

  // ── Angle calc — OpenCV.js when ready, plain-JS fallback otherwise ─────
  const calculateAngle = useCallback((a, b, c) => {
    if (!a || !b || !c) return null;

    if (!cvReadyRef.current || !window.cv) {
      return angleFallback(a, b, c);
    }

    const cv  = window.cv;
    const baX = a.x - b.x, baY = a.y - b.y;
    const bcX = c.x - b.x, bcY = c.y - b.y;

    const vecBA = cv.matFromArray(2, 1, cv.CV_64F, [baX, baY]);
    const vecBC = cv.matFromArray(2, 1, cv.CV_64F, [bcX, bcY]);

    const magBA = cv.norm(vecBA, cv.NORM_L2);
    const magBC = cv.norm(vecBC, cv.NORM_L2);

    vecBA.delete();
    vecBC.delete();

    if (magBA === 0 || magBC === 0) return null;

    let cosAngle = (baX * bcX + baY * bcY) / (magBA * magBC);
    cosAngle = Math.min(1, Math.max(-1, cosAngle));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }, []);

  // ── Voice feedback (de-duped + cooldown) ─────────────────────────────
  const speak = useCallback(
    (text, { priority = false, cooldownMs = 3000 } = {}) => {
      if (!voiceEnabled || !window.speechSynthesis) return;
      const now = Date.now();
      if (
        !priority &&
        text === lastSpokenRef.current.text &&
        now - lastSpokenRef.current.time < cooldownMs
      ) return;
      window.speechSynthesis.cancel();
      const utterance  = new SpeechSynthesisUtterance(text);
      utterance.rate   = 1.05;
      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current = { text, time: now };
    },
    [voiceEnabled]
  );

  // ── Rep-counting + form scoring ───────────────────────────────────────
  const processReps = useCallback(
    (landmarks, canvasWidth, canvasHeight) => {
      const type   = exerciseTypeRef.current;
      const config = EXERCISE_CONFIG[type];

      const [pA, pB, pC] = config.primary;
      const primaryAngle  = calculateAngle(landmarks[pA], landmarks[pB], landmarks[pC]);
      if (primaryAngle === null) return;

      const [aA, aB, aC] = config.alignment;
      const alignmentAngle = calculateAngle(landmarks[aA], landmarks[aB], landmarks[aC]);

      setCurrentAngle(Math.round(primaryAngle));

      let issue = null;

      // Track minimums during down-phase for per-rep scoring
      if (repStateRef.current === 'down') {
        minAngleRef.current     = Math.min(minAngleRef.current, primaryAngle);
        if (alignmentAngle !== null) {
          minAlignmentRef.current = Math.min(minAlignmentRef.current, alignmentAngle);
        }

        // Depth cue: still not low enough
        if (primaryAngle > config.bottomAngle) {
          const joint = landmarks[config.depthJoint];
          issue = {
            type:      'depth',
            message:   config.depthMsg,
            x:         joint.x * canvasWidth,
            y:         joint.y * canvasHeight,
            direction: 'down',
          };
        }
      }

      // Alignment cue (any phase)
      if (alignmentAngle !== null && alignmentAngle < config.alignmentIdeal - 15) {
        const joint = landmarks[config.alignmentJoint];
        issue = {
          type:      'alignment',
          message:   config.alignmentMsg,
          x:         joint.x * canvasWidth,
          y:         joint.y * canvasHeight,
          direction: 'up',
        };
      }

      setFormIssue(issue);

      // State machine: up → down → up = 1 rep
      if (primaryAngle > config.topAngle) {
        if (repStateRef.current === 'down') {
          repStateRef.current = 'up';

          const depthScore = scoreDepth(minAngleRef.current, config.bottomAngle, config.idealBottom);
          const alignScore = scoreAlignment(minAlignmentRef.current, config.alignmentIdeal);
          const repScore   = Math.round(depthScore * 0.6 + alignScore * 0.4);

          setRepScores((prev) => [...prev, repScore]);
          setLastRepScore(repScore);
          setReps((prev) => {
            const next = prev + 1;
            speak(`Rep ${next}`, { priority: true });
            return next;
          });
          setFeedback(repScore >= 80 ? 'Great form!' : 'Good rep — check your form tips.');

          minAngleRef.current     = Infinity;
          minAlignmentRef.current = 180;
        } else {
          setFeedback(`Extend fully, then lower into your ${config.label.toLowerCase()}.`);
        }
      } else if (primaryAngle < config.bottomAngle) {
        if (repStateRef.current === 'up') {
          minAngleRef.current     = primaryAngle;
          minAlignmentRef.current = alignmentAngle ?? 180;
        }
        repStateRef.current = 'down';
        setFeedback('Now push back up.');
      }
    },
    [calculateAngle, speak]
  );

  // Speak form-issue cues when issue type changes
  useEffect(() => {
    if (!isTracking || !formIssue) return;
    speak(formIssue.message);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formIssue?.type, isTracking, speak]);

  // ── MediaPipe results handler ─────────────────────────────────────────
  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx     = canvas.getContext('2d');
      canvas.width  = results.image.width;
      canvas.height = results.image.height;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#F97316',
          lineWidth: 3,
        });
        drawLandmarks(ctx, results.poseLandmarks, {
          color:     '#FFFFFF',
          fillColor: '#F97316',
          lineWidth: 1,
          radius:    3,
        });
        processReps(results.poseLandmarks, canvas.width, canvas.height);
      }

      ctx.restore();

      // Draw arrow overlay after restore so it renders on top
      if (formIssue) {
        drawArrow(ctx, formIssue.x, formIssue.y, formIssue.direction, '#EF4444');
        ctx.save();
        ctx.font        = 'bold 16px sans-serif';
        ctx.fillStyle   = '#EF4444';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth   = 3;
        const labelX = Math.min(Math.max(formIssue.x - 40, 10), canvas.width - 150);
        const labelY = Math.max(formIssue.y - 30, 20);
        ctx.strokeText(formIssue.message, labelX, labelY);
        ctx.fillText(formIssue.message, labelX, labelY);
        ctx.restore();
      }
    },
    [processReps, formIssue]
  );

  // ── Initialize MediaPipe Pose ─────────────────────────────────────────
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity:       1,
      smoothLandmarks:       true,
      enableSegmentation:    false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence:  0.6,
    });

    pose.onResults(onResults);
    poseRef.current = pose;

    return () => {
      pose.close();
      poseRef.current = null;
    };
  }, [onResults]);

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isTracking) {
      timerIntervalRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTracking]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    setCameraError('');
    setFeedback('Get in position...');
    if (!videoRef.current || !poseRef.current) return;

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width:  640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsTracking(true);
      speak(`Starting ${EXERCISE_CONFIG[exerciseType].label} tracking`, { priority: true });
    } catch {
      setCameraError('Could not access webcam. Please allow camera permissions and try again.');
    }
  };

  const handleStop = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsTracking(false);
    setFormIssue(null);
    setFeedback('Session stopped. Press Start to resume.');
  };

  const handleReset = () => {
    setReps(0);
    setSeconds(0);
    setRepScores([]);
    setLastRepScore(null);
    setFormIssue(null);
    repStateRef.current     = 'up';
    minAngleRef.current     = Infinity;
    minAlignmentRef.current = 180;
    setFeedback('Counters reset.');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Live Workout Tracker</h1>
        <button
          onClick={() => setVoiceEnabled((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            voiceEnabled
              ? 'border-orange-500 text-orange-400'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
        </button>
      </div>

      {/* Exercise selector */}
      <div className="flex gap-3 mb-4">
        {Object.entries(EXERCISE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setExerciseType(key)}
            disabled={isTracking}
            className={`px-4 py-2 rounded-lg font-medium transition
              disabled:opacity-40 disabled:cursor-not-allowed
              ${exerciseType === key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {cfg.label}s
          </button>
        ))}
      </div>

      {/* OpenCV.js loading notice */}
      {!cvReady && (
        <p className="text-xs text-gray-500 mb-4">
          Loading OpenCV.js (angle math will use JS fallback until ready)...
        </p>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
          {cameraError}
        </div>
      )}

      {/* Video + canvas overlay */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black border border-gray-700 mb-6">
        <video ref={videoRef} className="hidden" playsInline />
        <canvas ref={canvasRef} className="w-full h-auto block" />
        {!isTracking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-gray-300 text-sm">Camera feed will appear here</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{reps}</div>
          <div className="text-xs text-gray-400 mt-1">Reps</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{formatTime(seconds)}</div>
          <div className="text-xs text-gray-400 mt-1">Time</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">
            {currentAngle !== null ? `${currentAngle}°` : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Joint Angle</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {overallScore !== null ? overallScore : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Form Score</div>
        </div>
      </div>

      {/* Last rep score */}
      {lastRepScore !== null && (
        <p className="text-sm text-center text-gray-400 mb-2">
          Last rep score: {lastRepScore}/100
        </p>
      )}

      {/* Feedback */}
      <p className="text-sm text-gray-400 mb-6 text-center">{feedback}</p>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {!isTracking ? (
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
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
