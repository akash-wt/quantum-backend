import { JWT_EXPIRES } from '../config.js';
import { prisma } from '../prismaClient.js';
import BlockchainService from './BlockchainService.js';
import jwt from "jsonwebtoken";

export interface AuthResult {
    success: boolean;
    message: string;
    token?: string;
    user?: any
    error?: string;
}

export default class AuthService {
    private blockchainService: BlockchainService;

    constructor() {
        this.blockchainService = new BlockchainService();
    }

    async verifyWallet(wallet_address: string, signature: string, message: string): Promise<AuthResult> {
        try {

            const user = await prisma.user.findUnique({
                where: { wallet_address }
            });

            if (!user) {
                return { success: false, message: "User not found" };
            }

            // Check nonce expiry
            if (!user.nonce_expires || user.nonce_expires < new Date()) {
                return { success: false, message: "Nonce expired. Please request a new login." }

            }

            // Verify signature
            const isValid = await this.blockchainService.validateWalletSignature(
                wallet_address,
                signature,
                message
            );

            if (!isValid) {
                return {
                    success: false,
                    message: 'Invalid wallet signature',
                    error: 'INVALID_SIGNATURE'
                };
            }


            const jwtToken = await this.requestJwt(user.id);
            console.log(jwtToken);


            if (!jwtToken.success) {
                return {
                    success: false,
                    message: jwtToken.message,
                    error: "INVALID_SIGNATURE",
                };
            }


            return {
                success: true,
                message: 'Wallet verified successfully',
                token: jwtToken.token
            };

        } catch (error) {
            console.error('AuthService.verifyWallet error:', error);
            return {
                success: false,
                message: 'Failed to verify wallet',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async logoutUser(userId: string): Promise<AuthResult> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    error: 'USER_NOT_FOUND'
                };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    last_active: new Date(),
                    nonce: null,
                    nonce_expires: null
                }
            });

            return {
                success: true,
                message: 'Logged out successfully'
            };

        } catch (error) {
            console.error('AuthService.logoutUser error:', error);
            return {
                success: false,
                message: 'Failed to logout user',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async requestJwt(userId: string): Promise<AuthResult> {
        try {

            const secret = process.env.JWT_SECRET;

            if (!secret) {
                throw new Error("JWT_SECRET is not set");
            }

            const payload = {
                sub: userId
            }

            const token = jwt.sign(payload, secret, {
                expiresIn: JWT_EXPIRES,
            })


            return {
                success: true,
                message: "JWT issued successfully",
                token
            }


        } catch (error) {
            console.error('AuthService.requestJwt error:', error);
            return {
                success: false,
                message: 'Failed to issue JWT',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getProfile(userId: string): Promise<AuthResult> {
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
                    created_at: true,
                    is_verified: true,
                    kyc_level: true,
                    referral_code: true,
                    referred_by: true,
                    signature_count: true,
                    positions: {
                        where: {
                            settled: false
                        },
                        select: {
                            id: true,
                            market_id: true,
                            amount_staked: true,
                            shares_owned: true,
                            average_price: true,
                            created_at: true,
                            position_type: true
                        }
                    }
                }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    error: 'USER_NOT_FOUND'
                };
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { last_active: new Date() }
            });

            return {
                success: true,
                message: 'Profile retrieved successfully',
                user
            };

        } catch (error) {
            console.error('AuthService.getProfile error:', error);
            return {
                success: false,
                message: 'Failed to retrieve profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}