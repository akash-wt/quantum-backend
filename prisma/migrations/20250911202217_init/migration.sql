-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "wallet_address" VARCHAR(44) NOT NULL,
    "username" VARCHAR(50),
    "email" VARCHAR(255),
    "reputation_score" INTEGER NOT NULL DEFAULT 1000,
    "total_volume" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "win_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "total_predictions" INTEGER NOT NULL DEFAULT 0,
    "correct_predictions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_level" INTEGER NOT NULL DEFAULT 0,
    "referral_code" VARCHAR(10),
    "referred_by" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Market" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "market_type" VARCHAR(20) NOT NULL DEFAULT 'BINARY',
    "creator_id" TEXT,
    "oracle_source" VARCHAR(50) NOT NULL,
    "oracle_config" JSONB NOT NULL,
    "resolution_criteria" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "resolution_time" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "outcome" BOOLEAN,
    "total_volume" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "yes_pool" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "no_pool" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "fee_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "tags" TEXT[],
    "image_url" VARCHAR(500),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "contract_address" VARCHAR(44),
    "program_id" VARCHAR(44),

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "position_type" VARCHAR(10) NOT NULL,
    "amount_staked" DECIMAL(20,9) NOT NULL,
    "shares_owned" DECIMAL(20,9) NOT NULL,
    "average_price" DECIMAL(10,6) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "payout_amount" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "profit_loss" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ(6),
    "stake_tx_hash" VARCHAR(88),
    "payout_tx_hash" VARCHAR(88),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "market_id" TEXT,
    "position_id" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(20,9) NOT NULL,
    "token" VARCHAR(10) NOT NULL DEFAULT 'SOL',
    "tx_hash" VARCHAR(88),
    "block_height" BIGINT,
    "slot" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Oracle_Data" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "data_type" VARCHAR(30) NOT NULL,
    "raw_data" JSONB NOT NULL,
    "processed_value" DECIMAL(20,9),
    "string_value" TEXT,
    "boolean_value" BOOLEAN,
    "confidence_score" DECIMAL(3,2),
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Oracle_Data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_address_key" ON "public"."User"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "User_referral_code_key" ON "public"."User"("referral_code");

-- CreateIndex
CREATE INDEX "User_wallet_address_idx" ON "public"."User"("wallet_address");

-- CreateIndex
CREATE INDEX "User_reputation_score_idx" ON "public"."User"("reputation_score" DESC);

-- CreateIndex
CREATE INDEX "User_total_volume_idx" ON "public"."User"("total_volume" DESC);

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "public"."Market"("status");

-- CreateIndex
CREATE INDEX "Market_category_idx" ON "public"."Market"("category");

-- CreateIndex
CREATE INDEX "Market_end_time_idx" ON "public"."Market"("end_time");

-- CreateIndex
CREATE INDEX "Market_total_volume_idx" ON "public"."Market"("total_volume" DESC);

-- CreateIndex
CREATE INDEX "Market_featured_status_idx" ON "public"."Market"("featured", "status");

-- CreateIndex
CREATE INDEX "Position_user_id_idx" ON "public"."Position"("user_id");

-- CreateIndex
CREATE INDEX "Position_market_id_idx" ON "public"."Position"("market_id");

-- CreateIndex
CREATE INDEX "Position_settled_idx" ON "public"."Position"("settled");

-- CreateIndex
CREATE UNIQUE INDEX "Position_user_id_market_id_position_type_key" ON "public"."Position"("user_id", "market_id", "position_type");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_tx_hash_key" ON "public"."Transaction"("tx_hash");

-- CreateIndex
CREATE INDEX "Transaction_user_id_idx" ON "public"."Transaction"("user_id");

-- CreateIndex
CREATE INDEX "Transaction_tx_hash_idx" ON "public"."Transaction"("tx_hash");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Oracle_Data_market_id_idx" ON "public"."Oracle_Data"("market_id");

-- CreateIndex
CREATE INDEX "Oracle_Data_timestamp_idx" ON "public"."Oracle_Data"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Oracle_Data_source_data_type_idx" ON "public"."Oracle_Data"("source", "data_type");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Market" ADD CONSTRAINT "Market_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Oracle_Data" ADD CONSTRAINT "Oracle_Data_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
