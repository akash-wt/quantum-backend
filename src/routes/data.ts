import {Router} from 'express';

const router = Router();

router.get('/prices', (_req, res) => {
  res.json({ message: 'Data Prices route is working!' });
});

router.get('/social', (_req, res) => {
  res.json({ message: 'Data Social route is working!' });
});

export default router;
