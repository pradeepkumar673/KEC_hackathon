import express from 'express';
import { getMetValues, saveWorkoutSession, getWorkoutHistory } from '../controllers/workoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/met-values', getMetValues);
router.post('/', protect, saveWorkoutSession);
router.get('/history', protect, getWorkoutHistory);

export default router;
