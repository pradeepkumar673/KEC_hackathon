import mongoose from 'mongoose';
import dotenv from 'dotenv';
import METValue from '../models/METValue.js';

dotenv.config();

const DEFAULT_MET_VALUES = [
  { exerciseType: 'pushup', met: 8.0, intensity: 'vigorous' },
  { exerciseType: 'squat', met: 5.0, intensity: 'moderate' },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  for (const entry of DEFAULT_MET_VALUES) {
    await METValue.findOneAndUpdate(
      { exerciseType: entry.exerciseType },
      entry,
      { upsert: true, new: true }
    );
  }

  console.log('MET values seeded');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
