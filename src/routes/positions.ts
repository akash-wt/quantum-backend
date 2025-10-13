import { Router } from 'express';
import PositionsController from '../controllers/PositionsController.js';
import AuthController from '../controllers/AuthController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const positionsController = new PositionsController();

// Get user's positions
router.get('/', positionsController.getPositions.bind(positionsController));

router.get('/:id', positionsController.getPositionById.bind(positionsController));

router.get('/history', positionsController.getPositionHistory.bind(positionsController));

router.post('/:id/claim', positionsController.claimPosition.bind(positionsController));

router.post("/add", requireAuth, positionsController.addPostion.bind(positionsController));

export default router;
