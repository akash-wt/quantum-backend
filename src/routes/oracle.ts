import {Router} from 'express';

const router = Router();

router.get('/ingest', (_req, res) => {
  res.json({ message: 'Oracle Ingest route is working!' });
});

router.get('/status', (_req, res) => {
  res.json({ message: 'Oracle Status route is working!' });
});

router.get('/resolve', (_req, res) => {
  res.json({ message: 'Oracle Resolve route is working!' });
});

export default router;
