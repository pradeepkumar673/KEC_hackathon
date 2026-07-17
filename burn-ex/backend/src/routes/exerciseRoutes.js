import express from 'express';
import {
  getAllExercises,
  getRandomExercises,
  getEquipmentTypes,
  getMuscleGroups,
  getExerciseById,
  healthCheck,
} from '../controllers/exerciseController.js';

const router = express.Router();

router.get('/health',          healthCheck);
router.get('/equipment',       getEquipmentTypes);
router.get('/muscles',         getMuscleGroups);
router.get('/random/:count',   getRandomExercises);
router.get('/:id',             getExerciseById);
router.get('/',                getAllExercises);

export default router;
