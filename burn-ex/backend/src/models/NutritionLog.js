import mongoose from 'mongoose';

const foodEntrySchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    confidence: { type: Number },
    calories: { type: Number, required: true },
    source: { type: String, enum: ['photo', 'manual'], default: 'manual' },
    loggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const nutritionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD' — one doc per user per day
    bmr: { type: Number },
    tdee: { type: Number },
    calorieGoal: { type: Number },
    entries: [foodEntrySchema],
  },
  { timestamps: true }
);

nutritionLogSchema.index({ user: 1, date: 1 }, { unique: true });

const NutritionLog = mongoose.model('NutritionLog', nutritionLogSchema);
export default NutritionLog;
