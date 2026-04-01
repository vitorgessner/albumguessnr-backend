/*
  Warnings:

  - You are about to drop the column `emailVerifies` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifies",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastfmIntegrationId" TEXT;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "token" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "LastFmIntegration" (
    "id" TEXT NOT NULL,
    "lastfmUsername" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastFmIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAlbumScores" (
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL,

    CONSTRAINT "UserAlbumScores_pkey" PRIMARY KEY ("userId","albumId","gameModeId")
);

-- CreateTable
CREATE TABLE "UserAlbumStats" (
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "lastTimeGuessed" TIMESTAMP(3) NOT NULL,
    "timesGuessed" INTEGER NOT NULL,

    CONSTRAINT "UserAlbumStats_pkey" PRIMARY KEY ("userId","albumId")
);

-- CreateTable
CREATE TABLE "UserAlbumFamiliarity" (
    "id" TEXT NOT NULL,
    "timesListened" INTEGER NOT NULL,
    "tracksListened" INTEGER NOT NULL,
    "lastTimeListened" TIMESTAMP(3) NOT NULL,
    "albumId" TEXT NOT NULL,
    "lastFmIntegrationId" TEXT NOT NULL,

    CONSTRAINT "UserAlbumFamiliarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "mbid" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "year" TIMESTAMP(3) NOT NULL,
    "cover_url" TEXT NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumsGenre" (
    "albumId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "AlbumsGenre_pkey" PRIMARY KEY ("albumId","genreId")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "mbid" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumsArtist" (
    "albumId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "AlbumsArtist_pkey" PRIMARY KEY ("albumId","artistId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_userId_key" ON "VerificationToken"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastfmIntegrationId_fkey" FOREIGN KEY ("lastfmIntegrationId") REFERENCES "LastFmIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumScores" ADD CONSTRAINT "UserAlbumScores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumScores" ADD CONSTRAINT "UserAlbumScores_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumScores" ADD CONSTRAINT "UserAlbumScores_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumStats" ADD CONSTRAINT "UserAlbumStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumStats" ADD CONSTRAINT "UserAlbumStats_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumFamiliarity" ADD CONSTRAINT "UserAlbumFamiliarity_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumFamiliarity" ADD CONSTRAINT "UserAlbumFamiliarity_lastFmIntegrationId_fkey" FOREIGN KEY ("lastFmIntegrationId") REFERENCES "LastFmIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsGenre" ADD CONSTRAINT "AlbumsGenre_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsGenre" ADD CONSTRAINT "AlbumsGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsArtist" ADD CONSTRAINT "AlbumsArtist_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsArtist" ADD CONSTRAINT "AlbumsArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
