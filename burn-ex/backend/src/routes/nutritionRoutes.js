import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getGoals, getToday, logFood, deleteFoodEntry, getSuggestions } from '../controllers/nutritionController.js';

const router = express.Router();

router.get('/goals', protect, getGoals);
router.get('/today', protect, getToday);
router.post('/log', protect, logFood);
router.delete('/log/:entryIndex', protect, deleteFoodEntry);
router.get('/suggestions', protect, getSuggestions);

export default router;
