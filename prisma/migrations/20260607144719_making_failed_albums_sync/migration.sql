-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PossibleApis" AS ENUM ('LASTFM', 'MUSICBRAINZ');

-- CreateTable
CREATE TABLE "FailedAlbumsSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "mbid" TEXT,
    "artist" TEXT NOT NULL,
    "normalizedAlbum" TEXT NOT NULL,
    "cause" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "apiError" "PossibleApis" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedAlbumsSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FailedAlbumsSync_albumName_artist_apiError_key" ON "FailedAlbumsSync"("albumName", "artist", "apiError");

-- AddForeignKey
ALTER TABLE "FailedAlbumsSync" ADD CONSTRAINT "FailedAlbumsSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
