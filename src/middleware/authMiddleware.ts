import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prismaClient.js';
import jwt from "jsonwebtoken";

interface JwtPayload {
    sub: string, // userId
    iat?: number, // issued at (auto-added by jwt.sign)
    exp?: number  // expiry (auto-added by jwt.sign)
}

declare global {
    namespace Express{
        interface Request{
            user?: JwtPayload
        }
    }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Missing or invalid Authorization header"
            });
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET is not set");

        let payload: JwtPayload;
        try {
            payload = jwt.verify(token, secret) as JwtPayload;
        }
        catch (err) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const user = await prisma.user.findUnique({ 
            where: { id: payload.sub } 
        });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        req.user = payload;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};