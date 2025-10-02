import type { Position } from '@prisma/client';

export interface UserProfile {
    id: string;
    wallet_address: string;
    username?: string;
    email?: string;
    reputation_score: number;
    total_volume: number;
    win_rate: number;
    total_predictions: number;
    correct_predictions: number;
    is_verified: boolean;
    kyc_level: number;
    referral_code?: string;
    created_at: Date;
    updated_at: Date;
}

export interface PositionWithMarket extends Position {
    market: {
        id: string;
        question: string;
        category: string;
        total_volume: number;
        yes_pool: number;
        no_pool: number;
        status: string;
        end_time: Date;
        outcome: boolean | null;
    };
}