import { type Request, type Response } from 'express';
import AuthService from '../services/AuthService.js';
import { randomBytes } from 'node:crypto';
import { prisma } from '../prismaClient.js';


export default class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    async getNonce(req: Request, res: Response) {
        try {
            const { wallet_address } = req.body;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'address required'
                });
            }

            const nonce = randomBytes(16).toString("hex"); //random nonce
            const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 Min

            // console.log(nonce);
            let user = await prisma.user.findUnique({
                where: {
                    wallet_address
                }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        wallet_address,
                        nonce,
                        last_active: new Date(),
                        nonce_expires: expires

                    }
                })
            } else {
                user = await prisma.user.update({
                    where: { wallet_address },
                    data: {
                        last_active: new Date(),
                        nonce,
                        nonce_expires: expires
                    }
                })
            }

            res.json({ nonce });

        } catch (error) {
            console.error('AuthController.connectWallet error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    async verifyWallet(req: Request, res: Response) {
        try {
            const { wallet_address, signature, message } = req.body;

            if (!wallet_address || !signature || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters'
                });
            }

            const result = await this.authService.verifyWallet(wallet_address, signature, message);

            if (!result.success) {
                return res.status(401).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('AuthController.verifyWallet error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async logoutUser(req: Request, res: Response) {
        try {
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const result = await this.authService.logoutUser(req.user.sub);
            return res.status(200).json(result);
        } catch (error) {
            console.error('AuthController.logoutUser error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getProfile(req: Request, res: Response) {
        try {
            if (!req.user?.sub) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const result = await this.authService.getProfile(req.user.sub);
            return res.status(200).json(result);
        } catch (error) {
            console.error('AuthController.getProfile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}