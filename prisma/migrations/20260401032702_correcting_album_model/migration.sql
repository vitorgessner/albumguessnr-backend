/*
  Warnings:

  - A unique constraint covering the columns `[normalizedName,normalizedArtist,year]` on the table `Album` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedArtist` to the `Album` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "normalizedArtist" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Album_normalizedName_normalizedArtist_year_key" ON "Album"("normalizedName", "normalizedArtist", "year");
