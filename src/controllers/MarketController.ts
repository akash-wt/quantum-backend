import { type Request, type Response } from 'express';
import MarketService from "../services/MarketService.js";

class MarketController {
    private marketService: MarketService;

    constructor() {
        this.marketService = new MarketService();
    }

    async getMarkets(req: Request, res: Response): Promise<void> {
        try {
            const {
                status,
                category,
                featured,
                creator_id,
                page,
                limit,
                sort_by,
                sort_order
            } = req.query;

            const parsedPage = page ? parseInt(page as string, 10) : 1;
            const parsedLimit = limit ? parseInt(limit as string, 10) : 20;

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
                    message: 'Limit must be a number between 1 and 100'
                });
                return;
            }

            if (status && !['ACTIVE', 'RESOLVED', 'CANCELLED', 'PENDING'].includes(status as string)) {
                res.status(400).json({
                    success: false,
                    message: 'Status must be one of: ACTIVE, RESOLVED, CANCELLED, PENDING'
                });
                return;
            }

            // validate sort_by
            if (sort_by && !['created_at', 'volume', 'end_time'].includes(sort_by as string)) {
                res.status(400).json({
                    success: false,
                    message: 'sort_by must be one of: created_at, volume, end_time'
                });
                return;
            }

            if (sort_order && !['asc', 'desc'].includes(sort_order as string)) {
                res.status(400).json({
                    success: false,
                    message: 'sort_order must be either asc or desc'
                });
                return;
            }

            // parse featured flag
            let parsedFeatured: boolean | undefined;
            if (featured !== undefined) {
                if (featured === 'true') {
                    parsedFeatured = true;
                } else if (featured === 'false') {
                    parsedFeatured = false;
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'featured must be true or false'
                    });
                    return;
                }
            }

            const filters: any = {
                page: parsedPage,
                limit: parsedLimit
            };

            if (status) filters.status = status as string;
            if (category) filters.category = category as string;
            if (parsedFeatured !== undefined) filters.featured = parsedFeatured;
            if (creator_id) filters.creator_id = creator_id as string;
            if (sort_by) filters.sort_by = sort_by as string;
            if (sort_order) filters.sort_order = sort_order as 'asc' | 'desc';

            const result = await this.marketService.listMarkets(filters);

            // calculate summary stats
            const summary = {
                total_markets: result.total,
                active_markets: result.data.filter(m => m.status === 'ACTIVE').length,
                featured_markets: result.data.filter(m => m.featured).length,
                categories: [...new Set(result.data.map(m => m.category))],
                total_volume: result.data.reduce((sum, m) => sum + Number(m.total_volume), 0)
            };

            res.json({
                success: true,
                data: {
                    markets: result.data,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        total_pages: result.total_pages,
                        has_previous: result.page > 1,
                        has_next: result.page < result.total_pages
                    },
                    summary,
                    filters: {
                        status: status || 'ACTIVE',
                        category: category || null,
                        featured: parsedFeatured,
                        creator_id: creator_id || null,
                        sort_by: sort_by || 'created_at',
                        sort_order: sort_order || 'desc'
                    }
                }
            });
        } catch (error) {
            console.error('Error in getMarkets:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching markets'
            });
        }
    }

    async getFeaturedMarkets(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;

            const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
                res.status(400).json({
                    success: false,
                    message: 'Limit must be a number between 1 and 50'
                });
                return;
            }

            const featuredMarkets = await this.marketService.getFeaturedMarkets(parsedLimit);

            // calculate summary stats
            const summary = {
                total_featured: featuredMarkets.length,
                total_volume: featuredMarkets.reduce((sum, m) => sum + Number(m.total_volume), 0),
                categories: [...new Set(featuredMarkets.map(m => m.category))],
                avg_participants: featuredMarkets.length > 0 
                    ? Math.round(featuredMarkets.reduce((sum, m) => sum + ((m as any)._count?.positions || 0), 0) / featuredMarkets.length)
                    : 0
            };

            res.json({
                success: true,
                data: {
                    markets: featuredMarkets,
                    summary,
                    meta: {
                        limit: parsedLimit,
                        returned: featuredMarkets.length
                    }
                }
            });
        } catch (error) {
            console.error('Error in getFeaturedMarkets:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching featured markets'
            });
        }
    }

    async getTrendingMarkets(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;

            const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
                res.status(400).json({
                    success: false,
                    message: 'Limit must be a number between 1 and 50'
                });
                return;
            }

            const trendingMarkets = await this.marketService.getTrendingMarkets(parsedLimit);

            // calculate summary stats
            const summary = {
                total_trending: trendingMarkets.length,
                total_volume: trendingMarkets.reduce((sum, m) => sum + Number(m.total_volume), 0),
                categories: [...new Set(trendingMarkets.map(m => m.category))],
                avg_participants: trendingMarkets.length > 0 
                    ? Math.round(trendingMarkets.reduce((sum, m) => sum + ((m as any)._count?.positions || 0), 0) / trendingMarkets.length)
                    : 0,
                recent_markets: trendingMarkets.filter(m => {
                    const daysSinceCreation = (Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceCreation <= 7;
                }).length
            };

            res.json({
                success: true,
                data: {
                    markets: trendingMarkets,
                    summary,
                    meta: {
                        limit: parsedLimit,
                        returned: trendingMarkets.length
                    }
                }
            });
        } catch (error) {
            console.error('Error in getTrendingMarkets:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching trending markets'
            });
        }
    }

    async getMarketCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await this.marketService.getMarketCategories();

            // calculate summary stats
            const summary = {
                total_categories: categories.length,
                total_markets: categories.reduce((sum, cat) => sum + cat.count, 0),
                total_volume: categories.reduce((sum, cat) => sum + cat.total_volume, 0),
                total_active_markets: categories.reduce((sum, cat) => sum + cat.active_markets, 0)
            };

            res.json({
                success: true,
                data: {
                    categories,
                    summary
                }
            });
        } catch (error) {
            console.error('Error in getMarketCategories:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching market categories'
            });
        }
    }

    async getMarketById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Invalid market ID provided'
                });
                return;
            }

            const market = await this.marketService.getMarket(id);

            if (!market) {
                res.status(404).json({
                    success: false,
                    message: 'Market not found'
                });
                return;
            }

            // calculate additional market stats
            const marketData = market as any;
            const totalVolume = Number(market.total_volume);
            const summary = {
                total_positions: marketData._count?.positions || 0,
                total_transactions: marketData._count?.transactions || 0,
                total_volume: totalVolume,
                yes_percentage: market.yes_pool && totalVolume > 0 
                    ? Number(market.yes_pool) / totalVolume * 100 
                    : 50,
                no_percentage: market.no_pool && totalVolume > 0 
                    ? Number(market.no_pool) / totalVolume * 100 
                    : 50,
                days_remaining: market.end_time 
                    ? Math.max(0, Math.ceil((new Date(market.end_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 0
            };

            res.json({
                success: true,
                data: {
                    market,
                    summary
                }
            });
        } catch (error) {
            console.error('Error in getMarketById:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching market details'
            });
        }
    }

    async getMarketActivity(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { limit } = req.query;

            if (!id || typeof id !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Invalid market ID provided'
                });
                return;
            }

            const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                res.status(400).json({
                    success: false,
                    message: 'Limit must be a number between 1 and 100'
                });
                return;
            }

            const market = await this.marketService.getMarket(id);
            if (!market) {
                res.status(404).json({
                    success: false,
                    message: 'Market not found'
                });
                return;
            }

            const activities = await this.marketService.getMarketActivity(id, parsedLimit);

            const summary = {
                total_activities: activities.length,
                stake_activities: activities.filter(a => a.type === 'STAKE').length,
                payout_activities: activities.filter(a => a.type === 'PAYOUT').length,
                recent_volume: activities
                    .filter(a => a.type === 'STAKE')
                    .reduce((sum, a) => sum + (a.amount || 0), 0),
                unique_participants: [...new Set(activities.map(a => a.user_id))].length,
                latest_activity: activities.length > 0 ? activities[0]?.timestamp : null
            };

            res.json({
                success: true,
                data: {
                    activities,
                    summary,
                    market_info: {
                        id: market.id,
                        question: market.question,
                        status: market.status
                    },
                    meta: {
                        limit: parsedLimit,
                        returned: activities.length
                    }
                }
            });
        } catch (error) {
            console.error('Error in getMarketActivity:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching market activity'
            });
        }
    }
}

export default MarketController;