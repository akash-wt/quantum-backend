import { Router } from 'express';
import AdminController from '../controllers/AdminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const adminController = new AdminController();

/**
 * @swagger
 * /api/admin/markets:
 *   get:
 *     tags: [Admin]
 *     summary: Get all markets with admin details (Admin only)
 *     description: Retrieve all markets including cancelled/closed ones with statistics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer JWT token
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Markets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Markets retrieved successfully"
 *                 markets:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: number
 *                   example: 25
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Insufficient privileges (Admin access required)
 */
router.get('/markets', requireAuth, adminController.getMarkets.bind(adminController));

/**
 * @swagger
 * /api/admin/markets:
 *   post:
 *     tags: [Admin]
 *     summary: Create new prediction market (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer JWT token
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question, category, end_time, oracle_source, resolution_criteria]
 *             properties:
 *               question:
 *                 type: string
 *                 description: The prediction question
 *                 example: "Will Bitcoin reach $100k by end of 2025?"
 *               description:
 *                 type: string
 *                 description: Detailed description of the market
 *               category:
 *                 type: string
 *                 description: Market category
 *                 example: "CRYPTO"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: When the market closes for betting
 *               oracle_source:
 *                 type: string
 *                 description: Data source for resolution
 *                 example: "COINBASE_API"
 *               oracle_config:
 *                 type: object
 *                 description: Configuration for oracle data fetching
 *               resolution_criteria:
 *                 type: string
 *                 description: Clear criteria for market resolution
 *     responses:
 *       201:
 *         description: Market created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Insufficient privileges (Admin access required)
 */
router.post('/markets', requireAuth, adminController.createMarket.bind(adminController));

/**
 * @swagger
 * /api/admin/markets/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update existing prediction market (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer JWT token
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Market ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 description: Updated prediction question
 *               description:
 *                 type: string
 *                 description: Updated market description
 *               category:
 *                 type: string
 *                 description: Updated market category
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: Updated market close time
 *               oracle_source:
 *                 type: string
 *                 description: Updated oracle data source
 *               oracle_config:
 *                 type: object
 *                 description: Updated oracle configuration
 *               resolution_criteria:
 *                 type: string
 *                 description: Updated resolution criteria
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PAUSED, CLOSED, RESOLVED]
 *                 description: Updated market status
 *     responses:
 *       200:
 *         description: Market updated successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Insufficient privileges (Admin access required)
 *       404:
 *         description: Market not found
 */
router.put('/markets/:id', requireAuth, adminController.updateMarket.bind(adminController));

/**
 * @swagger
 * /api/admin/markets/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Cancel prediction market (Admin only)
 *     description: Cancels a market by setting its status to CANCELLED. Markets with existing positions cannot be cancelled.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer JWT token
 *         example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Market ID to cancel
 *     responses:
 *       200:
 *         description: Market cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Market cancelled successfully"
 *                 market:
 *                   type: object
 *                   description: The cancelled market object
 *       400:
 *         description: Cannot cancel market with existing positions
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Insufficient privileges (Admin access required)
 *       404:
 *         description: Market not found
 */
router.delete('/markets/:id', requireAuth, adminController.deleteMarket.bind(adminController));

export default router;
