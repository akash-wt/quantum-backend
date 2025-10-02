import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const authController = new AuthController();


/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify Solana wallet signature
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [wallet_address, signature, message]
 *             properties:
 *               wallet_address:
 *                 type: string
 *                 description: Solana wallet address (base58 encoded public key)
 *               signature:
 *                 type: string
 *                 description: Base58 encoded signature of the message
 *               message:
 *                 type: string
 *                 description: Message that was signed
 *     responses:
 *       200:
 *         description: Signature verified
 *       401:
 *         description: Invalid signature
 */
router.post('/verify', authController.verifyWallet.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - SolanaAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Wallet-Address
 *         schema:
 *           type: string
 *         required: true
 *         description: Solana wallet address of the user
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: User not found
 */
router.post('/logout', requireAuth, authController.logoutUser.bind(authController));

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get user profile
 *     security:
 *       - SolanaAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Wallet-Address
 *         schema:
 *           type: string
 *         required: true
 *         description: Solana wallet address of the user
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: User not found
 */
router.get('/profile', requireAuth, authController.getProfile.bind(authController));

router.post('/nonce', authController.getNonce.bind(authController));
export default router;
