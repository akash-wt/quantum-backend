import { MarketStatus, type Market } from "@prisma/client";
import { prisma } from '../prismaClient.js';


interface CreateMarketDto {
  question: string;
  description?: string;
  category: string;
  market_type?: string;
  creator_id?: string;
  oracle_source: string;
  oracle_config: any;
  resolution_criteria: string;
  end_time: Date;
  tags?: string[];
  image_url?: string;
  featured?: boolean;
  contract_address?: string;
  program_id?: string;
}

interface UpdateMarketDto {
  question?: string;
  description?: string;
  category?: string;
  oracle_source?: string;
  oracle_config?: any;
  resolution_criteria?: string;
  end_time?: Date;
  status?: string;
  tags?: string[];
  image_url?: string;
  featured?: boolean;
}

interface MarketFilters {
  status?: string;
  category?: string;
  featured?: boolean;
  creator_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface PaginatedMarkets {
  data: Market[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Activity {
  id: string;
  type: string;
  user_id: string;
  market_id: string;
  amount?: number;
  timestamp: Date;
  details: any;
}

interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  position_type: string;
  amount_staked: number;
  shares_owned: number;
  average_price: number;
  created_at: Date;
}

class MarketService {
  // Market Management
  async createMarket(marketData: CreateMarketDto): Promise<Market> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async getMarket(id: string): Promise<Market | null> {
    try {
      const market = await prisma.market.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              wallet_address: true,
              is_verified: true,
              reputation_score: true
            }
          },
          positions: {
            select: {
              id: true,
              position_type: true,
              amount_staked: true,
              shares_owned: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  wallet_address: true,
                  is_verified: true
                }
              }
            },
            orderBy: {
              created_at: 'desc'
            },
            take: 10 // limit to recent positions
          },
          _count: {
            select: {
              positions: true,
              // transactions: true
            }
          }
        }
      });

      return market;
    } catch (error) {
      console.error('Error fetching market:', error);
      throw new Error('Failed to fetch market');
    }
  }

  async listMarkets(filters: MarketFilters): Promise<PaginatedMarkets> {
    try {
      const {
        status = 'ACTIVE',
        category,
        featured,
        creator_id,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = filters;

      // build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      if (featured !== undefined) {
        where.featured = featured;
      }

      if (creator_id) {
        where.creator_id = creator_id;
      }

      // build order by clause
      const orderBy: any = {};
      if (sort_by === 'volume') {
        orderBy.total_volume = sort_order;
      } else if (sort_by === 'end_time') {
        orderBy.end_time = sort_order;
      } else {
        orderBy.created_at = sort_order;
      }

      // calculate offset
      const offset = (page - 1) * limit;

      // execute queries
      const [markets, total] = await Promise.all([
        prisma.market.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                wallet_address: true,
                is_verified: true
              }
            },
            _count: {
              select: {
                positions: true,
                // transactions: true
              }
            }
          },
          orderBy,
          take: limit,
          skip: offset
        }),
        prisma.market.count({ where })
      ]);

      const total_pages = Math.ceil(total / limit);

      return {
        data: markets,
        total,
        page,
        limit,
        total_pages
      };
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw new Error('Failed to fetch markets');
    }
  }

  async updateMarket(id: string, updates: UpdateMarketDto): Promise<Market> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  // Market Operations
  async calculateOdds(marketId: string): Promise<{ yes: number; no: number }> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async getMarketActivity(marketId: string, limit: number = 50): Promise<Activity[]> {
    try {
      // get transactions (which represent market activity)
      const transactions = await prisma.transaction.findMany({
        where: {
          market_id: marketId
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              wallet_address: true,
              is_verified: true
            }
          },
          position: {
            select: {
              id: true,
              position_type: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit
      });

      // transform transactions to activity format
      const activities: Activity[] = transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        user_id: tx.user_id,
        market_id: tx.market_id,
        amount: Number(tx.amount),
        timestamp: tx.created_at,
        details: {
          transaction_hash: tx.tx_hash,
          status: tx.status,
          token: tx.token,
          position_type: tx.position?.position_type,
          user: tx.user
        }
      }));

      return activities;
    } catch (error) {
      console.error('Error fetching market activity:', error);
      throw new Error('Failed to fetch market activity');
    }
  }

  async resolveMarket(marketId: string, outcome: boolean): Promise<void> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  // Real-time Updates
  async broadcastOddsUpdate(marketId: string): Promise<void> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async broadcastNewBet(marketId: string, bet: Bet): Promise<void> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async getFeaturedMarkets(limit: number = 10): Promise<Market[]> {
    try {
      const featuredMarkets = await prisma.market.findMany({
        where: {
          featured: true,
          status: 'ACTIVE'
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              wallet_address: true,
              is_verified: true
            }
          },
          _count: {
            select: {
              positions: true,
              // transactions: true
            }
          }
        },
        orderBy: [
          { total_volume: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit
      });

      return featuredMarkets;
    } catch (error) {
      console.error('Error fetching featured markets:', error);
      throw new Error('Failed to fetch featured markets');
    }
  }

  async getTrendingMarkets(limit: number = 10): Promise<Market[]> {
    try {
      // trending is determined by markets with high volume and recent transactions
      const trendingMarkets = await prisma.market.findMany({
        where: {
          status: 'ACTIVE',
          // only include markets created in the last 30 days or with recent activity
          OR: [
            {
              created_at: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // last 30 days
              }
            },
            {
              total_volume: {
                gt: 100 // markets with volume > 100
              }
            }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              wallet_address: true,
              is_verified: true
            }
          },
          _count: {
            select: {
              positions: true,
              // transactions: true
            }
          }
        },
        orderBy: [
          { total_volume: 'desc' },
          { created_at: 'desc' }
        ],
        take: limit
      });

      return trendingMarkets;
    } catch (error) {
      console.error('Error fetching trending markets:', error);
      throw new Error('Failed to fetch trending markets');
    }
  }

  async getMarketCategories(): Promise<Array<{
    category: string;
    count: number;
    total_volume: number;
    active_markets: number;
  }>> {
    try {
      // get categories with aggregated data
      const categories = await prisma.market.groupBy({
        by: ['category'],
        _count: {
          category: true
        },
        _sum: {
          total_volume: true
        },
        where: {
          status: {
            in: [MarketStatus.ACTIVE, MarketStatus.RESOLVED]
          }
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      });

      // get active markets count for each category
      const categoriesWithActiveCount = await Promise.all(
        categories.map(async (cat: any) => {
          const activeCount = await prisma.market.count({
            where: {
              category: cat.category,
              status: MarketStatus.ACTIVE
            }
          });

          return {
            category: cat.category,
            count: cat._count.category,
            total_volume: Number(cat._sum.total_volume || 0),
            active_markets: activeCount
          };
        })
      );

      return categoriesWithActiveCount;
    } catch (error) {
      console.error('Error fetching market categories:', error);
      throw new Error('Failed to fetch market categories');
    }
  }
}

export default MarketService;
