import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getWeeklyComparison, getCalorieTrend, getFormTrend, getMuscleHeatmap, getReadinessScore } from '../controllers/progressController.js';

const router = express.Router();

router.get('/weekly-comparison', protect, getWeeklyComparison);
router.get('/calorie-trend', protect, getCalorieTrend);
router.get('/form-trend', protect, getFormTrend);
router.get('/muscle-heatmap', protect, getMuscleHeatmap);
router.get('/readiness', protect, getReadinessScore);

export default router;
