/*
  Warnings:

  - You are about to drop the column `cover_url` on the `Album` table. All the data in the column will be lost.
  - You are about to drop the column `lastTimeListened` on the `UserAlbumFamiliarity` table. All the data in the column will be lost.
  - You are about to drop the column `timesListened` on the `UserAlbumFamiliarity` table. All the data in the column will be lost.
  - You are about to drop the column `tracksListened` on the `UserAlbumFamiliarity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Album" DROP COLUMN "cover_url";

-- AlterTable
ALTER TABLE "UserAlbumFamiliarity" DROP COLUMN "lastTimeListened",
DROP COLUMN "timesListened",
DROP COLUMN "tracksListened";
