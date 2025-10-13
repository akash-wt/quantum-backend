/*
  Warnings:

  - A unique constraint covering the columns `[user_id,market_id]` on the table `UserBetOnMarket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."UserBetOnMarket_market_id_idx";

-- DropIndex
DROP INDEX "public"."UserBetOnMarket_user_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserBetOnMarket_user_id_market_id_key" ON "public"."UserBetOnMarket"("user_id", "market_id");
