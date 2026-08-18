/*
  Warnings:

  - You are about to drop the column `lastfmIntegrationId` on the `User` table. All the data in the column will be lost.
  - The primary key for the `UserAlbumFamiliarity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `lastFmIntegrationId` on the `UserAlbumFamiliarity` table. All the data in the column will be lost.
  - You are about to drop the `LastFmIntegration` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[mainAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserAlbumFamiliarity` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'SYNCING', 'SUCCESS', 'SUCCEEDWITHFAILURE', 'FAILED');

-- AlterEnum
ALTER TYPE "PossibleApis" ADD VALUE 'SPOTIFY';

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_lastfmIntegrationId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumFamiliarity" DROP CONSTRAINT "UserAlbumFamiliarity_lastFmIntegrationId_fkey";

-- DropIndex
DROP INDEX "UserAlbumFamiliarity_lastFmIntegrationId_idx";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "displayUsername" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncCursor" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "syncingTimestamp" TIMESTAMP(3),
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastfmIntegrationId",
ADD COLUMN     "mainAccountId" TEXT;

-- AlterTable
ALTER TABLE "UserAlbumFamiliarity" DROP CONSTRAINT "UserAlbumFamiliarity_pkey",
DROP COLUMN "lastFmIntegrationId",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "UserAlbumFamiliarity_pkey" PRIMARY KEY ("userId", "albumId");

-- DropTable
DROP TABLE "LastFmIntegration";

-- CreateIndex
CREATE UNIQUE INDEX "User_mainAccountId_key" ON "User"("mainAccountId");

-- CreateIndex
CREATE INDEX "UserAlbumFamiliarity_userId_idx" ON "UserAlbumFamiliarity"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mainAccountId_fkey" FOREIGN KEY ("mainAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumFamiliarity" ADD CONSTRAINT "UserAlbumFamiliarity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
