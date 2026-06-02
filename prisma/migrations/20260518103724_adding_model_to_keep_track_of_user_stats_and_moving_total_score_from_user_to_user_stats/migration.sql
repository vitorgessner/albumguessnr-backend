/*
  Warnings:

  - You are about to drop the column `totalScore` on the `User` table. All the data in the column will be lost.
  - Added the required column `userStatsId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "totalScore",
ADD COLUMN     "userStatsId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "guessedAlbums" INTEGER NOT NULL DEFAULT 0,
    "rightGuessedAlbums" INTEGER NOT NULL DEFAULT 0,
    "guessedArtists" INTEGER NOT NULL DEFAULT 0,
    "rightGuessedArtist" INTEGER NOT NULL DEFAULT 0,
    "guessedGenres" INTEGER NOT NULL DEFAULT 0,
    "rightGuessedGenres" INTEGER NOT NULL DEFAULT 0,
    "guessedYears" INTEGER NOT NULL DEFAULT 0,
    "rightGuessedYears" INTEGER NOT NULL DEFAULT 0,
    "guessedTracks" INTEGER NOT NULL DEFAULT 0,
    "rightGuessedTracks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
