
import { type Request, type Response } from 'express';
import { prisma } from '../prismaClient.js';
import { MarketStatus } from '@prisma/client';

export interface AdminResult {
    success: boolean;
    message: string;
    market?: any;
    error?: string;
}

class AdminController {

    async getMarkets(req: Request, res: Response) {
        try {
            // Check if user has admin privileges (kyc_level >= 3)
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.sub },
                select: { kyc_level: true, is_verified: true }
            });

            if (!user || user.kyc_level < 3) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient privileges. Admin access required.'
                });
            }

            // Get all markets with admin details
            const markets = await prisma.market.findMany({
                include: {
                    creator: {
                        select: { id: true, username: true, wallet_address: true }
                    },
                    _count: {
                        select: {
                            positions: true,
                            transactions: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            return res.status(200).json({
                success: true,
                message: 'Markets retrieved successfully',
                markets,
                total: markets.length
            });

        } catch (error) {
            console.error('AdminController.getMarkets error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async createMarket(req: Request, res: Response) {
        try {
            const {
                question,
                description,
                category,
                end_time,
                oracle_source,
                oracle_config,
                resolution_criteria,
                featured
            } = req.body;

            // validate required fields
            if (!question || !category || !end_time || !oracle_source || !resolution_criteria) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // check if user has admin privileges (kyc_level >= 3)
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.sub },
                select: { kyc_level: true, is_verified: true }
            });

            if (!user || user.kyc_level < 3) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient privileges. Admin access required.'
                });
            }

            // create the market
            const market = await prisma.market.create({
                data: {
                    question,
                    description,
                    category,
                    end_time: new Date(end_time),
                    oracle_source,
                    oracle_config,
                    resolution_criteria,
                    creator_id: req.user.sub,
                    status: 'ACTIVE',
                    featured
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Market created successfully',
                market
            });

        } catch (error) {
            console.error('AdminController.createMarket error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async updateMarket(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const {
                question,
                description,
                category,
                end_time,
                oracle_source,
                oracle_config,
                resolution_criteria,
                status,
                featured
            } = req.body;

            // check if user has admin privileges (kyc_level >= 3)
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.sub },
                select: { kyc_level: true, is_verified: true }
            });

            if (!user || user.kyc_level < 3) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient privileges. Admin access required.'
                });
            }

            // check if market exists
            const existingMarket = await prisma.market.findUnique({
                where: { id }
            });

            if (!existingMarket) {
                return res.status(404).json({
                    success: false,
                    message: 'Market not found'
                });
            }

            // prepare update data
            const updateData: any = {};
            if (question) updateData.question = question;
            if (description) updateData.description = description;
            if (category) updateData.category = category;
            if (end_time) updateData.end_time = new Date(end_time);
            if (oracle_source) updateData.oracle_source = oracle_source;
            if (oracle_config) updateData.oracle_config = oracle_config;
            if (resolution_criteria) updateData.resolution_criteria = resolution_criteria;
            if (status) updateData.status = status;
            if (featured !== undefined) updateData.featured = featured;
            const market = await prisma.market.update({
                where: { id },
                data: updateData
            });

            return res.status(200).json({
                success: true,
                message: 'Market updated successfully',
                market
            });

        } catch (error) {
            console.error('AdminController.updateMarket error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async deleteMarket(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // check if user has admin privileges (kyc_level >= 3)
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.sub },
                select: { kyc_level: true, is_verified: true }
            });

            if (!user || user.kyc_level < 3) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient privileges. Admin access required.'
                });
            }

            // check if market exists and get its current status
            const existingMarket = await prisma.market.findUnique({
                where: { id },
                include: {
                    positions: true,
                    _count: {
                        select: { positions: true }
                    }
                }
            });

            if (!existingMarket) {
                return res.status(404).json({
                    success: false,
                    message: 'Market not found'
                });
            }

            // check if market can be cancelled (has active positions)
            if (existingMarket._count.positions > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot cancel market with existing positions. Consider resolving or refunding positions first.'
                });
            }

            // cancel the market by updating status instead of actual deletion
            const cancelledMarket = await prisma.market.update({
                where: { id },
                data: {
                    status: MarketStatus.CANCELLED
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Market cancelled successfully',
                market: cancelledMarket
            });

        } catch (error) {
            console.error('AdminController.deleteMarket error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

}

export default AdminController;