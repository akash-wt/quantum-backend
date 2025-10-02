import {Router} from 'express';

const router = Router();

router.get('/markets', (_req, res) => {
  res.json({ message: 'Analytics Markets route is working!' });
});

router.get('/platform', (_req, res) => {
  res.json({ message: 'Analytics Platform route is working!' });
});

export default router;
