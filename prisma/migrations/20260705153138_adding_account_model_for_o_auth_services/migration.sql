/*
  Warnings:

  - The `status` column on the `FailedAlbumsSync` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('PENDING', 'RESOLVED');

-- AlterEnum
ALTER TYPE "PossibleApis" ADD VALUE 'SERVER';

-- AlterTable
ALTER TABLE "FailedAlbumsSync" ADD COLUMN     "albumId" TEXT NOT NULL DEFAULT '',
DROP COLUMN "status",
ADD COLUMN     "status" "ErrorStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- DropEnum
DROP TYPE "SyncStatus";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAlbumDataErrorsLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "mbid" TEXT,
    "artist" TEXT NOT NULL,
    "normalizedAlbum" TEXT NOT NULL,
    "fieldsWithErrors" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ErrorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAlbumDataErrorsLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumDataErrorsLogs" ADD CONSTRAINT "UserAlbumDataErrorsLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
