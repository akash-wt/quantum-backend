import { type Request, type Response } from 'express';
import UserService from '../services/UserService.js';

class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // get user profile by ID
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID provided'
        });
        return;
      }

      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const stats = await this.userService.getUserStats(id);

      res.json({
        success: true,
        data: {
          profile: user,
          stats: stats
        }
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching user profile'
      });
    }
  }

  // update user profile
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { username, email } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID provided'
        });
        return;
      }

      const updateData: { username?: string; email?: string | null } = {};
      
      if (username !== undefined) {
        if (typeof username !== 'string' || username.trim().length === 0) {
          res.status(400).json({
            success: false,
            message: 'Username must be a non-empty string'
          });
          return;
        }
        if (username.length > 50) {
          res.status(400).json({
            success: false,
            message: 'Username must be 50 characters or less'
          });
          return;
        }
        updateData.username = username.trim();
      }

      if (email !== undefined) {
        if (typeof email !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Email must be a string'
          });
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email.trim().length > 0 && !emailRegex.test(email)) {
          res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
          return;
        }
        if (email.length > 255) {
          res.status(400).json({
            success: false,
            message: 'Email must be 255 characters or less'
          });
          return;
        }
        updateData.email = email.trim() || null;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields provided for update'
        });
        return;
      }

      const existingUser = await this.userService.getUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const updatedUser = await this.userService.updateUser(id, updateData);

      res.json({
        success: true,
        message: 'User profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating user profile'
      });
    }
  }

  // get user positions
  async getUserPositions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { include_settled } = req.query;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID provided'
        });
        return;
      }

      const includeSettled = include_settled === 'false' ? false : true;

      const existingUser = await this.userService.getUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const positions = await this.userService.getUserPositions(id, includeSettled);

      const summary = {
        total_positions: positions.length,
        active_positions: positions.filter(p => !p.settled).length,
        settled_positions: positions.filter(p => p.settled).length,
        total_staked: positions.reduce((sum, p) => sum + p.amount_staked, 0),
        total_profit_loss: positions.filter(p => p.settled).reduce((sum, p) => sum + p.profit_loss, 0)
      };

      res.json({
        success: true,
        data: {
          positions,
          summary
        }
      });
    } catch (error) {
      console.error('Error in getUserPositions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching user positions'
      });
    }
  }

  // get user transaction history
  async getUserHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID provided'
        });
        return;
      }

      const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 100'
        });
        return;
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        res.status(400).json({
          success: false,
          message: 'Offset must be a non-negative number'
        });
        return;
      }

      const existingUser = await this.userService.getUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const transactions = await this.userService.getUserTransactionHistory(id, parsedLimit, parsedOffset);

      const summary = {
        total_transactions: transactions.length,
        stake_transactions: transactions.filter(t => t.type === 'STAKE').length,
        payout_transactions: transactions.filter(t => t.type === 'PAYOUT').length,
        fee_transactions: transactions.filter(t => t.type === 'FEE').length,
        pending_transactions: transactions.filter(t => t.status === 'PENDING').length,
        confirmed_transactions: transactions.filter(t => t.status === 'CONFIRMED').length,
        total_volume: transactions
          .filter(t => t.type === 'STAKE')
          .reduce((sum, t) => sum + t.amount, 0),
        total_winnings: transactions
          .filter(t => t.type === 'PAYOUT')
          .reduce((sum, t) => sum + t.amount, 0)
      };

      res.json({
        success: true,
        data: {
          transactions,
          summary,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            has_more: transactions.length === parsedLimit
          }
        }
      });
    } catch (error) {
      console.error('Error in getUserHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching user transaction history'
      });
    }
  }

  // get leaderboard
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { sort_by, limit, offset } = req.query;
      
      const sortBy = (sort_by as string) || 'reputation';
      const parsedLimit = limit ? parseInt(limit as string, 10) : 100;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

      if (!['reputation', 'volume', 'win_rate'].includes(sortBy)) {
        res.status(400).json({
          success: false,
          message: 'sort_by must be one of: reputation, volume, win_rate'
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

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        res.status(400).json({
          success: false,
          message: 'Offset must be a non-negative number'
        });
        return;
      }

      const leaderboard = await this.userService.getLeaderboard(
        sortBy as 'reputation' | 'volume' | 'win_rate',
        parsedLimit,
        parsedOffset
      );

      const stats = {
        total_entries: leaderboard.length,
        verified_users: leaderboard.filter(user => user.is_verified).length,
        top_volume: leaderboard.length > 0 ? Math.max(...leaderboard.map(u => u.total_volume)) : 0,
        top_reputation: leaderboard.length > 0 ? Math.max(...leaderboard.map(u => u.reputation_score)) : 0,
        average_win_rate: leaderboard.length > 0 
          ? leaderboard.reduce((sum, u) => sum + u.win_rate, 0) / leaderboard.length 
          : 0
      };

      res.json({
        success: true,
        data: {
          leaderboard,
          stats,
          pagination: {
            sort_by: sortBy,
            limit: parsedLimit,
            offset: parsedOffset,
            has_more: leaderboard.length === parsedLimit
          }
        }
      });
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching leaderboard'
      });
    }
  }
}

export default UserController;