import { useRef, useState, useEffect, useCallback } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

// ── MediaPipe Pose landmark indices ────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────

// Angle (in degrees) at point B, formed by A–B–C
const calculateAngle = (a, b, c) => {
  if (!a || !b || !c) return null;
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// ── Component ──────────────────────────────────────────────────────────────

const LiveWorkoutTracker = () => {
  const videoRef         = useRef(null);
  const canvasRef        = useRef(null);
  const poseRef          = useRef(null);
  const cameraRef        = useRef(null);
  const timerIntervalRef = useRef(null);

  // Refs for values read inside MediaPipe callback (avoid stale closures)
  const repStateRef     = useRef('up');   // 'up' | 'down'
  const exerciseTypeRef = useRef('pushup');

  const [exerciseType, setExerciseType] = useState('pushup');
  const [reps, setReps]                 = useState(0);
  const [isTracking, setIsTracking]     = useState(false);
  const [seconds, setSeconds]           = useState(0);
  const [currentAngle, setCurrentAngle] = useState(null);
  const [feedback, setFeedback]         = useState('Select an exercise and press Start');
  const [cameraError, setCameraError]   = useState('');

  // Keep ref in sync with selected exercise
  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
    repStateRef.current = 'up';
  }, [exerciseType]);

  // ── Rep-counting logic, runs on every frame ───────────────────────────
  const processReps = useCallback((landmarks) => {
    const type = exerciseTypeRef.current;

    if (type === 'pushup') {
      const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
      const elbow    = landmarks[LANDMARKS.LEFT_ELBOW];
      const wrist    = landmarks[LANDMARKS.LEFT_WRIST];

      const angle = calculateAngle(shoulder, elbow, wrist);
      if (angle === null) return;
      setCurrentAngle(Math.round(angle));

      if (angle > 155) {
        if (repStateRef.current === 'down') {
          repStateRef.current = 'up';
          setReps((prev) => prev + 1);
          setFeedback('Good rep! Go down again.');
        } else {
          setFeedback('Arms extended — lower down.');
        }
      } else if (angle < 90) {
        repStateRef.current = 'down';
        setFeedback('Now push back up.');
      }
    }

    if (type === 'squat') {
      const hip   = landmarks[LANDMARKS.LEFT_HIP];
      const knee  = landmarks[LANDMARKS.LEFT_KNEE];
      const ankle = landmarks[LANDMARKS.LEFT_ANKLE];

      const angle = calculateAngle(hip, knee, ankle);
      if (angle === null) return;
      setCurrentAngle(Math.round(angle));

      if (angle > 160) {
        if (repStateRef.current === 'down') {
          repStateRef.current = 'up';
          setReps((prev) => prev + 1);
          setFeedback('Good rep! Squat down again.');
        } else {
          setFeedback('Standing — squat down.');
        }
      } else if (angle < 100) {
        repStateRef.current = 'down';
        setFeedback('Now stand back up.');
      }
    }
  }, []);

  // ── MediaPipe results handler ─────────────────────────────────────────
  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width  = results.image.width;
      canvas.height = results.image.height;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#F97316', // orange-500
          lineWidth: 3,
        });
        drawLandmarks(ctx, results.poseLandmarks, {
          color: '#FFFFFF',
          fillColor: '#F97316',
          lineWidth: 1,
          radius: 3,
        });
        processReps(results.poseLandmarks);
      }

      ctx.restore();
    },
    [processReps]
  );

  // ── Initialize MediaPipe Pose once ────────────────────────────────────
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
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
    };
  }, [onResults]);

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isTracking) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
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
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsTracking(true);
    } catch {
      setCameraError(
        'Could not access webcam. Please allow camera permissions and try again.'
      );
    }
  };

  const handleStop = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsTracking(false);
    setFeedback('Session stopped. Press Start to resume.');
  };

  const handleReset = () => {
    setReps(0);
    setSeconds(0);
    repStateRef.current = 'up';
    setFeedback('Counters reset.');
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      <h1 className="text-2xl font-bold mb-6">Live Workout Tracker</h1>

      {/* Exercise selector */}
      <div className="flex gap-3 mb-6">
        {['pushup', 'squat'].map((type) => (
          <button
            key={type}
            onClick={() => setExerciseType(type)}
            disabled={isTracking}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition
              disabled:opacity-40 disabled:cursor-not-allowed
              ${exerciseType === type
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {type === 'pushup' ? 'Push-ups' : 'Squats'}
          </button>
        ))}
      </div>

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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
      </div>

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
