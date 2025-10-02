import {Router} from 'express';

const router = Router();

router.post('/bet', (_req, res) => {
  res.json({ message: 'trading Bet route is working!' });
});

router.post('/close', (_req, res) => {
  res.json({ message: 'trading Close route is working!' });
});

router.get('/simulate', (_req, res) => {
  res.json({ message: 'trading Simulate route is working!' });
});

router.get('/limits', (_req, res) => {
  res.json({ message: 'trading Limits route is working!' });
});

export default router;
