/*
  Warnings:

  - The primary key for the `UserAlbumScores` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `gameModeId` on the `UserAlbumScores` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `UserAlbumScores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameMode` to the `UserAlbumScores` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('ALBUM', 'ARTIST', 'GENRE', 'YEAR', 'TRACKLIST');

-- DropForeignKey
ALTER TABLE "UserAlbumScores" DROP CONSTRAINT "UserAlbumScores_gameModeId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserAlbumScores" DROP CONSTRAINT "UserAlbumScores_pkey",
DROP COLUMN "gameModeId",
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "gameMode" "GameCategory" NOT NULL,
ALTER COLUMN "bestScore" SET DEFAULT 0,
ADD CONSTRAINT "UserAlbumScores_pkey" PRIMARY KEY ("userId", "albumId", "gameMode", "date");

-- DropTable
DROP TABLE "Category";

-- CreateTable
CREATE TABLE "GuessAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL,

    CONSTRAINT "GuessAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuessAttemptCategory" (
    "id" TEXT NOT NULL,
    "guessAttemptId" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GuessAttemptCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuessAttempt_userId_albumId_date_idx" ON "GuessAttempt"("userId", "albumId", "date");

-- CreateIndex
CREATE INDEX "GuessAttempt_albumId_idx" ON "GuessAttempt"("albumId");

-- AddForeignKey
ALTER TABLE "GuessAttempt" ADD CONSTRAINT "GuessAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessAttempt" ADD CONSTRAINT "GuessAttempt_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessAttemptCategory" ADD CONSTRAINT "GuessAttemptCategory_guessAttemptId_fkey" FOREIGN KEY ("guessAttemptId") REFERENCES "GuessAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
