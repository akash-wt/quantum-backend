/*
  Warnings:

  - You are about to alter the column `tx_hash` on the `MarketTransactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(88)`.
  - Added the required column `amount` to the `MarketTransactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MarketTransactions" ADD COLUMN     "amount" DECIMAL(20,9) NOT NULL,
ALTER COLUMN "tx_hash" SET NOT NULL,
ALTER COLUMN "tx_hash" SET DATA TYPE VARCHAR(88);
