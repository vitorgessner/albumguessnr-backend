-- AlterTable
ALTER TABLE "GuessAttempt" ADD COLUMN     "tracksHit" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GuessedTrack" (
    "trackId" TEXT NOT NULL,
    "guessAttemptId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "GuessedTrack_pkey" PRIMARY KEY ("trackId","guessAttemptId")
);

-- AddForeignKey
ALTER TABLE "GuessedTrack" ADD CONSTRAINT "GuessedTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessedTrack" ADD CONSTRAINT "GuessedTrack_guessAttemptId_fkey" FOREIGN KEY ("guessAttemptId") REFERENCES "GuessAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
