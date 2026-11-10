/*
  Warnings:

  - You are about to drop the column `lastfmListeners` on the `DailyAlbum` table. All the data in the column will be lost.
  - You are about to drop the column `lastfmPlaycount` on the `DailyAlbum` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mbid]` on the table `Album` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CoverUrlEnum" AS ENUM ('RELEASE_GROUP', 'RELEASE', 'FALSE');

-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "hasCoverUrl" "CoverUrlEnum" NOT NULL DEFAULT 'FALSE';

-- AlterTable
ALTER TABLE "DailyAlbum" DROP COLUMN "lastfmListeners",
DROP COLUMN "lastfmPlaycount";

-- CreateIndex
CREATE UNIQUE INDEX "Album_mbid_key" ON "Album"("mbid");
