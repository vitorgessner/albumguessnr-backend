/*
  Warnings:

  - A unique constraint covering the columns `[albumName,artist,cause]` on the table `FailedAlbumsSync` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "FailedAlbumsSync_albumName_artist_apiError_key";

-- CreateIndex
CREATE UNIQUE INDEX "FailedAlbumsSync_albumName_artist_cause_key" ON "FailedAlbumsSync"("albumName", "artist", "cause");
