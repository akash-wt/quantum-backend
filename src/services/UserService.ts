import { prisma } from '../prismaClient.js';
import type { UserProfile } from '../types.js';

interface UserStats {
  total_markets_created: number;
  active_positions: number;
  total_winnings: number;
  current_streak: number;
}

interface UserPosition {
  id: string;
  position_type: string;
  amount_staked: number;
  shares_owned: number;
  average_price: number;
  settled: boolean;
  payout_amount: number;
  profit_loss: number;
  created_at: Date;
  settled_at?: Date;
  market: {
    id: string;
    question: string;
    category: string;
    status: string;
    end_time: Date;
    outcome?: boolean;
  };
}

interface UserTransaction {
  id: string;
  type: string;
  amount: number;
  token: string;
  tx_hash?: string;
  status: string;
  created_at: Date;
  confirmed_at?: Date;
  market?: {
    id: string;
    question: string;
    category: string;
  };
  position?: {
    id: string;
    position_type: string;
  };
}

interface LeaderboardEntry {
  id: string;
  username?: string;
  wallet_address: string;
  reputation_score: number;
  total_volume: number;
  win_rate: number;
  total_predictions: number;
  correct_predictions: number;
  rank: number;
  is_verified: boolean;
}

class UserService {
  // get user profile by wallet address
  async getUserByWallet(wallet_address: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { wallet_address },
        select: {
          id: true,
          wallet_address: true,
          username: true,
          email: true,
          reputation_score: true,
          total_volume: true,
          win_rate: true,
          total_predictions: true,
          correct_predictions: true,
          is_verified: true,
          kyc_level: true,
          referral_code: true,
          referred_by: true,
          created_at: true,
          updated_at: true,
        }
      });
      
      if (!user) return null;
      
      return {
        ...user,
        total_volume: Number(user.total_volume),
        win_rate: Number(user.win_rate),
        username: user.username || undefined,
        email: user.email || undefined,
        referral_code: user.referral_code || undefined
      };
    } catch (error) {
      console.error('Error fetching user by wallet:', error);
      throw new Error('Failed to fetch user data');
    }
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          wallet_address: true,
          username: true,
          email: true,
          reputation_score: true,
          total_volume: true,
          win_rate: true,
          total_predictions: true,
          correct_predictions: true,
          is_verified: true,
          kyc_level: true,
          referral_code: true,
          referred_by: true,
          created_at: true,
          updated_at: true,
        }
      });
      
      if (!user) return null;
      
      return {
        ...user,
        total_volume: Number(user.total_volume),
        win_rate: Number(user.win_rate),
        username: user.username || undefined,
        email: user.email || undefined,
        referral_code: user.referral_code || undefined
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user data');
    }
  }

  // get user stats
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [marketsCreated, activePositions, totalWinnings] = await Promise.all([
        // count markets created by user
        prisma.market.count({
          where: { creator_id: userId }
        }),

        // count active positions
        prisma.position.count({
          where: { 
            user_id: userId,
            settled: false
          }
        }),

        // calculate total winnings
        prisma.position.aggregate({
          where: {
            user_id: userId,
            settled: true,
            profit_loss: { gt: 0 }
          },
          _sum: {
            profit_loss: true
          }
        })
      ]);

      return {
        total_markets_created: marketsCreated,
        active_positions: activePositions,
        total_winnings: Number(totalWinnings._sum.profit_loss || 0),
        current_streak: 0 // implement streak calculation
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  // update user last activity (for session tracking)
  async updateLastActivity(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { updated_at: new Date() }
      });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  async updateUser(userId: string, updateData: {
    username?: string;
    email?: string | null;
  }): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updated_at: new Date()
        },
        select: {
          id: true,
          wallet_address: true,
          username: true,
          email: true,
          reputation_score: true,
          total_volume: true,
          win_rate: true,
          total_predictions: true,
          correct_predictions: true,
          is_verified: true,
          kyc_level: true,
          referral_code: true,
          referred_by: true,
          created_at: true,
          updated_at: true,
        }
      });
      
      return {
        ...user,
        total_volume: Number(user.total_volume),
        win_rate: Number(user.win_rate),
        username: user.username || undefined,
        email: user.email || undefined,
        referral_code: user.referral_code || undefined
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async getUserPositions(userId: string, includeSettled: boolean = true): Promise<UserPosition[]> {
    try {
      const positions = await prisma.position.findMany({
        where: {
          user_id: userId,
          ...(includeSettled ? {} : { settled: false })
        },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              category: true,
              status: true,
              end_time: true,
              outcome: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return positions.map((position: any) => ({
        id: position.id,
        position_type: position.position_type,
        amount_staked: Number(position.amount_staked),
        shares_owned: Number(position.shares_owned),
        average_price: Number(position.average_price),
        settled: position.settled,
        payout_amount: Number(position.payout_amount),
        profit_loss: Number(position.profit_loss),
        created_at: position.created_at,
        settled_at: position.settled_at || undefined,
        market: position.market
      }));
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw new Error('Failed to fetch user positions');
    }
  }

  async getUserTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<UserTransaction[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          user_id: userId
        },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              category: true
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
        take: limit,
        skip: offset
      });

      return transactions.map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        token: transaction.token,
        tx_hash: transaction.tx_hash || undefined,
        status: transaction.status,
        created_at: transaction.created_at,
        confirmed_at: transaction.confirmed_at || undefined,
        market: transaction.market || undefined,
        position: transaction.position || undefined
      }));
    } catch (error) {
      console.error('Error fetching user transaction history:', error);
      throw new Error('Failed to fetch user transaction history');
    }
  }

  // get leaderboard data
  async getLeaderboard(
    sortBy: 'reputation' | 'volume' | 'win_rate' = 'reputation',
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardEntry[]> {
    try {
      let orderBy: any = {};
      
      switch (sortBy) {
        case 'reputation':
          orderBy = { reputation_score: 'desc' };
          break;
        case 'volume':
          orderBy = { total_volume: 'desc' };
          break;
        case 'win_rate':
          orderBy = [
            { win_rate: 'desc' },
            { total_predictions: 'desc' } // Secondary sort by prediction count
          ];
          break;
        default:
          orderBy = { reputation_score: 'desc' };
      }

      const users = await prisma.user.findMany({
        where: {
          // Only include users with at least some activity
          total_predictions: {
            gt: 0
          }
        },
        select: {
          id: true,
          username: true,
          wallet_address: true,
          reputation_score: true,
          total_volume: true,
          win_rate: true,
          total_predictions: true,
          correct_predictions: true,
          is_verified: true
        },
        orderBy,
        take: limit,
        skip: offset
      });

      // Add rank to each user
      return users.map((user: any, index: number) => ({
        id: user.id,
        username: user.username || undefined,
        wallet_address: user.wallet_address,
        reputation_score: user.reputation_score,
        total_volume: Number(user.total_volume),
        win_rate: Number(user.win_rate),
        total_predictions: user.total_predictions,
        correct_predictions: user.correct_predictions,
        rank: offset + index + 1,
        is_verified: user.is_verified
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error('Failed to fetch leaderboard data');
    }
  }
}

export default UserService;
