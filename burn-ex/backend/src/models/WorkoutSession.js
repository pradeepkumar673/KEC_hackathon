import mongoose from 'mongoose';

const workoutSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exerciseType: { type: String, required: true },
    reps: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 0 },
    formScore: { type: Number, min: 0, max: 100 },
    met: { type: Number },
    mlMultiplier: { type: Number },
    calories: { type: Number, required: true },
  },
  { timestamps: true }
);

workoutSessionSchema.index({ user: 1, createdAt: -1 });

const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);

export default WorkoutSession;
