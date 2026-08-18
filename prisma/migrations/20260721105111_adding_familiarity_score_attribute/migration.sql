/*
  Warnings:

  - Added the required column `familiarityScore` to the `UserAlbumFamiliarity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserAlbumFamiliarity" ADD COLUMN     "familiarityScore" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "timesListened" DROP NOT NULL,
ALTER COLUMN "tracksListened" DROP NOT NULL;
