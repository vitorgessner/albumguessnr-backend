/*
  Warnings:

  - A unique constraint covering the columns `[normalizedName,normalizedArtist]` on the table `Album` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Album_normalizedName_normalizedArtist_year_key";

-- AlterTable
ALTER TABLE "Album" ALTER COLUMN "year" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Album_normalizedName_normalizedArtist_key" ON "Album"("normalizedName", "normalizedArtist");
