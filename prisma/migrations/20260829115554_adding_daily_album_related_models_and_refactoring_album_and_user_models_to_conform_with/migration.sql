-- CreateEnum
CREATE TYPE "UserDailyAlbumStatus" AS ENUM ('UNFINISHED', 'FINISHED');

-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "descriptors" TEXT[],
ADD COLUMN     "rymRanking" DECIMAL(65,30),
ADD COLUMN     "rymRating" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DailyAlbum" (
    "albumId" TEXT NOT NULL,
    "lastfmListeners" TEXT,
    "lastfmPlaycount" TEXT,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAlbum_pkey" PRIMARY KEY ("albumId")
);

-- CreateTable
CREATE TABLE "AlbumPools" (
    "albumId" TEXT NOT NULL,
    "electable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AlbumPools_pkey" PRIMARY KEY ("albumId")
);

-- CreateTable
CREATE TABLE "UserDailyAlbum" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyAlbumId" TEXT NOT NULL,
    "nthPlayerToGuess" INTEGER,
    "status" "UserDailyAlbumStatus" NOT NULL,

    CONSTRAINT "UserDailyAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAlbumTry" (
    "id" TEXT NOT NULL,
    "userDailyAlbumId" TEXT NOT NULL,
    "nthTry" INTEGER NOT NULL,
    "albumGuessId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAlbumTry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyAlbumOverallStatistics" (
    "userId" TEXT NOT NULL,
    "totalGuessed" INTEGER NOT NULL DEFAULT 0,
    "correctlyGuessed" INTEGER NOT NULL DEFAULT 0,
    "meanToGuess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numberOfFirstGuesses" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserDailyAlbumOverallStatistics_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyAlbum_albumId_key" ON "DailyAlbum"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAlbum_date_key" ON "DailyAlbum"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumPools_albumId_key" ON "AlbumPools"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyAlbum_userId_dailyAlbumId_key" ON "UserDailyAlbum"("userId", "dailyAlbumId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAlbumTry_userDailyAlbumId_albumGuessId_key" ON "DailyAlbumTry"("userDailyAlbumId", "albumGuessId");

-- AddForeignKey
ALTER TABLE "DailyAlbum" ADD CONSTRAINT "DailyAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPools" ADD CONSTRAINT "AlbumPools_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbum" ADD CONSTRAINT "UserDailyAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbum" ADD CONSTRAINT "UserDailyAlbum_dailyAlbumId_fkey" FOREIGN KEY ("dailyAlbumId") REFERENCES "DailyAlbum"("albumId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAlbumTry" ADD CONSTRAINT "DailyAlbumTry_userDailyAlbumId_fkey" FOREIGN KEY ("userDailyAlbumId") REFERENCES "UserDailyAlbum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAlbumTry" ADD CONSTRAINT "DailyAlbumTry_albumGuessId_fkey" FOREIGN KEY ("albumGuessId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbumOverallStatistics" ADD CONSTRAINT "UserDailyAlbumOverallStatistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
