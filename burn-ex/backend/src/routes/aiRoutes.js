import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  analyzeFoodPhoto,
  getAiNutritionSuggestions,
  postWorkoutSummary,
  postFormTip,
  getAiStatus,
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/status', protect, getAiStatus);
router.post('/nutrition/analyze-photo', protect, analyzeFoodPhoto);
router.get('/nutrition/suggestions', protect, getAiNutritionSuggestions);
router.post('/workout/summary', protect, postWorkoutSummary);
router.post('/workout/form-tip', protect, postFormTip);

export default router;
