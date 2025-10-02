import { Router } from 'express';
import MarketController from '../controllers/MarketController.js';

const router = Router();
const marketController = new MarketController();

// Market Discovery
router.get('/', marketController.getMarkets.bind(marketController));

router.get('/featured', marketController.getFeaturedMarkets.bind(marketController));

router.get('/trending', marketController.getTrendingMarkets.bind(marketController));

router.get('/categories', marketController.getMarketCategories.bind(marketController));

router.get('/:id', marketController.getMarketById.bind(marketController));

router.get('/:id/activity', marketController.getMarketActivity.bind(marketController));

router.post('/:id/bet', (_req, res) => {
  res.json({ message: 'market Bet route is working!' });
});

router.get('/:id/odds', (_req, res) => {
  res.json({ message: 'market Odds route is working!' });
});

router.get('/:id/positions', (_req, res) => {
  res.json({ message: 'market Positions route is working!' });
});

export default router;
