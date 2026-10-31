-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "replacedAt" DROP NOT NULL,
ALTER COLUMN "replacedAt" DROP DEFAULT;
