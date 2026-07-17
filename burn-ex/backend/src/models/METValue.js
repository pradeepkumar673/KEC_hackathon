import mongoose from 'mongoose';

// MET (Metabolic Equivalent of Task) values — standard exercise physiology
// reference numbers, stored in DB so they can be tuned without a redeploy.
const metValueSchema = new mongoose.Schema(
  {
    exerciseType: { type: String, required: true, unique: true }, // 'pushup', 'squat'
    met: { type: Number, required: true }, // e.g. 8.0
    intensity: {
      type: String,
      enum: ['light', 'moderate', 'vigorous'],
      default: 'moderate',
    },
    source: { type: String, default: 'Compendium of Physical Activities' },
  },
  { timestamps: true }
);

const METValue = mongoose.model('METValue', metValueSchema);

export default METValue;
