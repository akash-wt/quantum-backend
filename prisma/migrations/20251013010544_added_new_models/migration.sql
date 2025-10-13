-- CreateTable
CREATE TABLE "public"."MarketTransactions" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tx_hash" TEXT[],

    CONSTRAINT "MarketTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBetOnMarket" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "yes_pool" INTEGER NOT NULL,
    "no_pool" INTEGER NOT NULL,

    CONSTRAINT "UserBetOnMarket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketTransactions_market_id_idx" ON "public"."MarketTransactions"("market_id");

-- CreateIndex
CREATE INDEX "UserBetOnMarket_market_id_idx" ON "public"."UserBetOnMarket"("market_id");

-- CreateIndex
CREATE INDEX "UserBetOnMarket_user_id_idx" ON "public"."UserBetOnMarket"("user_id");

-- AddForeignKey
ALTER TABLE "public"."MarketTransactions" ADD CONSTRAINT "MarketTransactions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketTransactions" ADD CONSTRAINT "MarketTransactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBetOnMarket" ADD CONSTRAINT "UserBetOnMarket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBetOnMarket" ADD CONSTRAINT "UserBetOnMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
