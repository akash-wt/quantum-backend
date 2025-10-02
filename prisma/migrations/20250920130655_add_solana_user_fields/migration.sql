-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "last_active" TIMESTAMPTZ(6),
ADD COLUMN     "signature_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "User_last_active_idx" ON "public"."User"("last_active" DESC);
