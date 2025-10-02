-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "nonce" VARCHAR(32),
ADD COLUMN     "nonce_expires" TIMESTAMPTZ(6);
