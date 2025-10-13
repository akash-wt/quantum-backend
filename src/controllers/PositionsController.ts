import { type Request, type Response } from 'express';
import TradingService from '../services/TradingService.js';
import { type PositionWithMarket } from '../types.js';
import { prisma } from '../prismaClient.js';
import { json } from 'stream/consumers';



class PositionsController {
    private tradingService: TradingService;

    constructor() {
        this.tradingService = new TradingService();
    }

    private async checkPositionAccessPermission(requestingUserId: string, targetUserId: string): Promise<{
        allowed: boolean;
        reason?: string;
    }> {
        try {
            // If user is requesting their own positions
            if (requestingUserId === targetUserId) {
                return { allowed: true };
            }

            // get requesting user details from trading service
            const requestingUser = await this.tradingService.getUserDetails(requestingUserId);
            if (!requestingUser) {
                return { allowed: false, reason: 'Requesting user not found' };
            }

            // Market level permission checks
            // admin Access 
            if (requestingUser.kyc_level >= 3) {
                return { allowed: true };
            }

            // Verified User Access
            const targetUser = await this.tradingService.getUserDetails(targetUserId);
            if (!targetUser) {
                return { allowed: false, reason: 'Target user not found' };
            }

            if (requestingUser.is_verified && targetUser.is_verified) {
                return { allowed: true };
            }

            return {
                allowed: false,
                reason: 'Insufficient permissions to view other user positions'
            };
        } catch (error) {
            console.error('Error in permission check:', error);
            return { allowed: false, reason: 'Error checking permissions' };
        }
    }

    async getPositions(req: Request, res: Response): Promise<void> {
        try {
            // check authentication
            if (!req.user?.sub) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            // get query parameters for filtering
            const { active, userId } = req.query;
            const requestingUserId = req.user.sub;

            let includeActive: boolean | undefined;
            if (active !== undefined) {
                if (active === 'true') {
                    includeActive = true;
                } else if (active === 'false') {
                    includeActive = false;
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'active parameter must be true or false'
                    });
                    return;
                }
            }

            // validate and authorize user ID if provided
            let targetUserId = requestingUserId;
            if (userId !== undefined) {
                if (typeof userId !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid user ID format'
                    });
                    return;
                }

                // check permissions if requesting other user's positions
                const permissionCheck = await this.checkPositionAccessPermission(requestingUserId, userId);
                if (!permissionCheck.allowed) {
                    res.status(403).json({
                        success: false,
                        message: permissionCheck.reason || 'Access denied'
                    });
                    return;
                }

                targetUserId = userId;
            }

            // get positions for the user
            const positions = await this.tradingService.getUserPositions(
                targetUserId,
                includeActive
            ) as PositionWithMarket[];

            const summary = {
                total_positions: positions.length,
                active_positions: positions.filter(p => !p.settled).length,
                total_value: positions.reduce((sum, p) => sum + Number(p.shares_owned), 0),
                total_staked: positions.reduce((sum, p) => sum + Number(p.amount_staked), 0),
                profit_loss: positions
                    .filter(p => p.settled)
                    .reduce((sum, p) => sum + Number(p.profit_loss), 0),
                win_rate: positions.filter(p => p.settled).length > 0
                    ? positions.filter(p => p.settled && Number(p.profit_loss) > 0).length /
                    positions.filter(p => p.settled).length
                    : 0
            };

            // add market summary
            const marketSummary = {
                categories: [...new Set(positions.map(p => p.market.category))],
                markets: positions.map(p => ({
                    id: p.market.id,
                    question: p.market.question,
                    total_volume: Number(p.market.total_volume),
                    position_type: p.position_type,
                    current_odds: p.position_type === 'YES'
                        ? Number(p.market.yes_pool) / Number(p.market.total_volume)
                        : Number(p.market.no_pool) / Number(p.market.total_volume)
                }))
            };

            res.json({
                success: true,
                data: {
                    positions,
                    summary,
                    market_summary: marketSummary,
                    filters: {
                        active: includeActive,
                        userId: targetUserId
                    },
                    meta: {
                        timestamp: new Date().toISOString()
                    }
                }
            });
        } catch (error: any) {
            console.error('Error in getPositions:', error);

            if (error instanceof Error) {
                if (error.message.includes('user not found')) {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                    return;
                }

                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching positions',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching positions'
                });
            }
        }
    }

    async getPositionById(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user?.sub) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Invalid position ID'
                });
                return;
            }

            // get the position with market details
            const position = await this.tradingService.getPositionById(id) as PositionWithMarket;

            if (!position) {
                res.status(404).json({
                    success: false,
                    message: 'Position not found'
                });
                return;
            }

            // check if user has permission to view this position
            const permissionCheck = await this.checkPositionAccessPermission(req.user.sub, position.user_id);
            if (!permissionCheck.allowed) {
                res.status(403).json({
                    success: false,
                    message: permissionCheck.reason || 'Access denied'
                });
                return;
            }

            // calculate position metrics
            const metrics = {
                current_value: Number(position.shares_owned) * (
                    position.position_type === 'YES'
                        ? Number(position.market.yes_pool) / Number(position.market.total_volume)
                        : Number(position.market.no_pool) / Number(position.market.total_volume)
                ),
                profit_loss: position.settled ? Number(position.profit_loss) : null,
                roi_percentage: position.settled
                    ? (Number(position.profit_loss) / Number(position.amount_staked)) * 100
                    : null,
                time_held: Math.floor((
                    (position.settled_at || new Date()).getTime() -
                    position.created_at.getTime()
                ) / (1000 * 60 * 60 * 24)) // days
            };

            res.json({
                success: true,
                data: {
                    position,
                    metrics,
                    market_state: {
                        current_price: position.position_type === 'YES'
                            ? Number(position.market.yes_pool) / Number(position.market.total_volume)
                            : Number(position.market.no_pool) / Number(position.market.total_volume),
                        total_volume: Number(position.market.total_volume),
                        status: position.market.status,
                        outcome: position.market.outcome,
                        time_remaining: position.market.end_time > new Date()
                            ? Math.floor((position.market.end_time.getTime() - Date.now()) / (1000 * 60 * 60)) // hours
                            : 0
                    }
                }
            });
        } catch (error: unknown) {
            console.error('Error in getPositionById:', error);

            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    res.status(404).json({
                        success: false,
                        message: 'Position not found'
                    });
                    return;
                }

                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching position details',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching position details'
                });
            }
        }
    }

    async getPositionHistory(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user?.sub) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const {
                userId,
                page = '1',
                limit = '20',
                sort_by = 'settled_at',
                sort_order = 'desc'
            } = req.query;

            const parsedPage = parseInt(page as string, 10);
            const parsedLimit = parseInt(limit as string, 10);

            if (isNaN(parsedPage) || parsedPage < 1) {
                res.status(400).json({
                    success: false,
                    message: 'Page must be a positive number'
                });
                return;
            }

            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                res.status(400).json({
                    success: false,
                    message: 'Limit must be between 1 and 100'
                });
                return;
            }

            // validate sort parameters
            if (sort_by && !['settled_at', 'profit_loss', 'amount_staked'].includes(sort_by as string)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid sort_by parameter'
                });
                return;
            }

            if (sort_order && !['asc', 'desc'].includes(sort_order as string)) {
                res.status(400).json({
                    success: false,
                    message: 'Sort order must be asc or desc'
                });
                return;
            }

            // check permissions if requesting other user's history
            let targetUserId = req.user.sub;
            if (userId && userId !== req.user.sub) {
                const permissionCheck = await this.checkPositionAccessPermission(req.user.sub, userId as string);
                if (!permissionCheck.allowed) {
                    res.status(403).json({
                        success: false,
                        message: permissionCheck.reason || 'Access denied'
                    });
                    return;
                }
                targetUserId = userId as string;
            }

            // get settled positions
            const { positions, total } = await this.tradingService.getSettledPositions(
                targetUserId,
                parsedPage,
                parsedLimit,
                sort_by as string,
                sort_order as 'asc' | 'desc'
            );

            // type assertion since we know the positions include market data
            const positionsWithMarket = positions as PositionWithMarket[];

            const summary = {
                total_settled_positions: total,
                total_profit_loss: positionsWithMarket.reduce((sum: number, p) => sum + Number(p.profit_loss), 0),
                win_count: positionsWithMarket.filter(p => Number(p.profit_loss) > 0).length,
                loss_count: positionsWithMarket.filter(p => Number(p.profit_loss) < 0).length,
                break_even_count: positionsWithMarket.filter(p => Number(p.profit_loss) === 0).length,
                win_rate: positionsWithMarket.length > 0
                    ? (positionsWithMarket.filter(p => Number(p.profit_loss) > 0).length / positionsWithMarket.length) * 100
                    : 0,
                average_profit_loss: positionsWithMarket.length > 0
                    ? positionsWithMarket.reduce((sum: number, p) => sum + Number(p.profit_loss), 0) / positionsWithMarket.length
                    : 0,
                total_volume: positionsWithMarket.reduce((sum: number, p) => sum + Number(p.amount_staked), 0),
            };

            // group positions by market category
            const categoryStats = positionsWithMarket.reduce((acc, position) => {
                const category = position.market.category;
                if (!acc[category]) {
                    acc[category] = {
                        total_positions: 0,
                        total_profit_loss: 0,
                        win_count: 0,
                        volume: 0
                    };
                }
                acc[category].total_positions++;
                acc[category].total_profit_loss += Number(position.profit_loss);
                if (Number(position.profit_loss) > 0) acc[category].win_count++;
                acc[category].volume += Number(position.amount_staked);
                return acc;
            }, {} as Record<string, {
                total_positions: number;
                total_profit_loss: number;
                win_count: number;
                volume: number;
            }>);

            res.json({
                success: true,
                data: {
                    positions,
                    summary,
                    category_stats: categoryStats,
                    pagination: {
                        page: parsedPage,
                        limit: parsedLimit,
                        total,
                        total_pages: Math.ceil(total / parsedLimit),
                        has_next: parsedPage * parsedLimit < total,
                        has_previous: parsedPage > 1
                    },
                    filters: {
                        userId: targetUserId,
                        sort_by,
                        sort_order
                    }
                }
            });
        } catch (error: unknown) {
            console.error('Error in getPositionHistory:', error);

            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                    return;
                }

                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching position history',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error while fetching position history'
                });
            }
        }
    }

    /**
     * Claim winnings for a settled position
     * @route POST /api/positions/:id/claim
     */
    async claimPosition(req: Request, res: Response): Promise<void> {
        try {
            const positionId = req.params.id;

            if (!positionId) {
                res.status(400).json({
                    success: false,
                    message: 'Position ID is required'
                });
                return;
            }

            const userId = req.user?.sub;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
                return;
            }

            // get position details first to verify ownership
            const position = await this.tradingService.getPositionById(positionId);

            if (!position) {
                res.status(404).json({
                    success: false,
                    message: 'Position not found'
                });
                return;
            }

            // verify position ownership
            if (position.user_id !== userId) {
                res.status(403).json({
                    success: false,
                    message: 'Not authorized to claim winnings for this position'
                });
                return;
            }

            // process claim
            const transaction = await this.tradingService.claimWinnings(positionId);

            res.json({
                success: true,
                message: 'Winnings claimed successfully',
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    status: transaction.status,
                    timestamp: transaction.created_at
                }
            });
        } catch (error) {
            console.error('Error claiming position winnings:', error);

            if (error instanceof Error) {
                if (error.message === 'Position is not settled yet') {
                    res.status(400).json({
                        success: false,
                        message: 'Position cannot be claimed until it is settled'
                    });
                    return;
                }
                if (error.message === 'Position did not win') {
                    res.status(400).json({
                        success: false,
                        message: 'Only winning positions can be claimed'
                    });
                    return;
                }
                if (error.message === 'Position winnings have already been claimed') {
                    res.status(400).json({
                        success: false,
                        message: 'Position winnings have already been claimed'
                    });
                    return;
                }
            }

            res.status(500).json({
                success: false,
                message: 'Failed to claim position winnings'
            });
        }
    }

    async addPostion(req: Request, res: Response): Promise<void> {
        try {
            const u_id = req.user?.sub;
            const { market_id, position_type, amount_staked, stake_tx_hash } = req.body;

            if (!market_id || !position_type || !amount_staked || !u_id) {
                res.status(400).json({
                    success: false,
                    message: "Missing required fields"
                })
                return
            }

            const position = await prisma.position.upsert({
                where: {
                    user_id_market_id_position_type: {
                        user_id: u_id,
                        market_id,
                        position_type
                    },
                },
                update: {
                    amount_staked: {
                        increment: amount_staked,
                    },
                    stake_tx_hash,
                },
                create: {
                    user_id: u_id,
                    market_id,
                    position_type,
                    amount_staked,
                    shares_owned: 0,
                    average_price: 0,
                    stake_tx_hash,
                }
            })

            const market = await prisma.market.findUnique({ where: { id: market_id } });
            if (!market) {
                res.status(404).json({
                    success: false, message: "MArket not found"
                })
                return
            }

            const updateMarket = await prisma.market.update({
                where: { id: market_id },
                data: {
                    total_volume: market.total_volume.plus(amount_staked),
                    yes_pool:
                        position_type === "YES"
                            ? market.yes_pool.plus(amount_staked)
                            : market.yes_pool,
                    no_pool:
                        position_type === "NO"
                            ? market.no_pool.plus(amount_staked)
                            : market.no_pool
                }
            })

            const updateUser = await prisma.user.update({
                where: { id: u_id },
                data: {
                    total_predictions: {
                        increment: 1
                    },

                }
            })

            const MarketTransactions = await prisma.marketTransactions.create({
                data: {
                    market_id,
                    user_id: u_id,
                    tx_hash: stake_tx_hash,
                    amount: amount_staked
                }
            })

            // const getUserBetOnMarket= await prisma.userBetOnMarket

            res.status(201).json({
                success: true,
                data: { position, updateMarket }
            })
        } catch (error: any) {
            console.error("Error adding postion:", error)
            res.status(500).json({
                success: false,
                message: "INternal server error"
            })
        }
    }
}

export default PositionsController;