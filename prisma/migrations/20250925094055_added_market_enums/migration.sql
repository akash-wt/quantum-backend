/*
  Warnings:

  - The `category` column on the `Market` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Market` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."MarketCategory" AS ENUM ('CRYPTO', 'STOCKS', 'TECHNOLOGY', 'GAMING', 'DEFI_EVENTS', 'CELEBRITY_CRYPTO', 'AI_GAMING', 'MARKET_EVENTS');

-- CreateEnum
CREATE TYPE "public"."MarketStatus" AS ENUM ('ACTIVE', 'CANCELLED','CANCELLED');

-- AlterTable
ALTER TABLE "public"."Market" DROP COLUMN "category",
ADD COLUMN     "category" "public"."MarketCategory" NOT NULL DEFAULT 'CRYPTO',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."MarketStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "public"."Market"("status");

-- CreateIndex
CREATE INDEX "Market_category_idx" ON "public"."Market"("category");

-- CreateIndex
CREATE INDEX "Market_featured_status_idx" ON "public"."Market"("featured", "status");
