import { prisma } from '../prismaClient.js';
import type {Position, Transaction } from '@prisma/client' ;
import { type PositionWithMarket } from '../types.js';

interface BetDto {
  market_id: string;
  position_type: 'YES' | 'NO';
  amount_staked: number;
}

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

class TradingService {

  async getUserDetails(userId: string): Promise<{
    id: string;
    kyc_level: number;
    is_verified: boolean;
  } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          kyc_level: true,
          is_verified: true
        }
      });

      return user;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  // Bet Placement
  async placeBet(userId: string, marketId: string, bet: BetDto): Promise<Position> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async validateBet(bet: BetDto): Promise<ValidationResult> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async calculatePayout(marketId: string, amount: number, position: 'YES' | 'NO'): Promise<number> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

    // Position Management
  async getUserPositions(userId: string, active?: boolean): Promise<Position[]> {
    try {
      const positions = await prisma.position.findMany({
        where: {
          user_id: userId,
          ...( active !== undefined ? { settled: !active } : {} )
        },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              category: true,
              status: true,
              end_time: true,
              outcome: true,
              total_volume: true,
              yes_pool: true,
              no_pool: true
            }
          },
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
        }
      });

      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw new Error('Failed to fetch user positions');
    }
  }
  

  async getPositionById(positionId: string): Promise<Position | null> {
    try {
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              category: true,
              status: true,
              end_time: true,
              outcome: true,
              total_volume: true,
              yes_pool: true,
              no_pool: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              wallet_address: true,
              is_verified: true,
              kyc_level: true
            }
          }
        }
      });

      if (!position) {
        throw new Error('Position not found');
      }

      return position;
    } catch (error) {
      console.error('Error fetching position details:', error);
      throw error;
    }
  }

  async getSettledPositions(
    userId: string,
    page: number,
    limit: number,
    sortBy: string = 'settled_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ positions: PositionWithMarket[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // build order by clause
      const orderBy: any = {};
      if (sortBy === 'settled_at') {
        orderBy.settled_at = sortOrder;
      } else if (sortBy === 'profit_loss') {
        orderBy.profit_loss = sortOrder;
      } else if (sortBy === 'amount_staked') {
        orderBy.amount_staked = sortOrder;
      }

      // get positions and total count
      const [positions, total] = await Promise.all([
        prisma.position.findMany({
          where: {
            user_id: userId,
            settled: true
          },
          include: {
            market: {
              select: {
                id: true,
                question: true,
                category: true,
                status: true,
                end_time: true,
                outcome: true,
                total_volume: true,
                yes_pool: true,
                no_pool: true
              }
            },
            user: {
              select: {
                id: true,
                username: true,
                wallet_address: true,
                is_verified: true
              }
            }
          },
          orderBy,
          take: limit,
          skip: offset
        }),
        prisma.position.count({
          where: {
            user_id: userId,
            settled: true
          }
        })
      ]);

      // Convert Decimal values to numbers
      const positionsWithNumbers = positions.map((pos:any) => ({
        ...pos,
        market: {
          ...pos.market,
          total_volume: Number(pos.market.total_volume),
          yes_pool: Number(pos.market.yes_pool),
          no_pool: Number(pos.market.no_pool)
        }
      }));

      return { positions: positionsWithNumbers, total };
    } catch (error) {
      console.error('Error fetching settled positions:', error);
      throw error;
    }
  }

  async closePosition(positionId: string): Promise<Transaction> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async claimWinnings(positionId: string): Promise<Transaction> {
    try {
      // get position details with its market
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
          market: true,
          user: {
            select: {
              id: true,
              username: true,
              wallet_address: true
            }
          }
        }
      });

      if (!position) {
        throw new Error('Position not found');
      }

      if (!position.settled) {
        throw new Error('Position is not settled yet');
      }

      if (position.payout_tx_hash) {
        throw new Error('Position winnings have already been claimed');
      }

      // check if position is winning
      const isWinning = position.position_type === 'YES' ? position.market.outcome === true : position.market.outcome === false;
      if (!isWinning) {
        throw new Error('Position did not win');
      }

      // create transaction record for payout
      const transaction = await prisma.transaction.create({
        data: {
          user_id: position.user_id,
          amount: Number(position.profit_loss),
          type: 'PAYOUT',
          status: 'COMPLETED',
          metadata: {
            description: `Payout for position ${position.id} in market ${position.market.question}`,
            position_id: position.id,
            market_id: position.market_id,
            profit_loss: position.profit_loss.toString()
          }
        }
      });

      // update position with payout transaction hash
      await prisma.position.update({
        where: { id: positionId },
        data: {
          payout_tx_hash: transaction.id,
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error claiming winnings:', error);
      throw error;
    }
  }

  // Risk Management
  async checkUserLimits(userId: string, amount: number): Promise<boolean> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }

  async updateUserStats(userId: string): Promise<void> {
    // Implementation placeholder
    throw new Error('Method not implemented');
  }
}

export default TradingService;
