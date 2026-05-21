-- AlterTable
ALTER TABLE "users" ADD COLUMN "companyName" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "buyerArchivedAt" DATETIME;
ALTER TABLE "conversations" ADD COLUMN "sellerArchivedAt" DATETIME;
