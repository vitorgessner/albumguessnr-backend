-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "mbid" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_normalizedName_albumId_key" ON "Track"("normalizedName", "albumId");

-- CreateIndex
CREATE INDEX "UserAlbumFamiliarity_lastFmIntegrationId_idx" ON "UserAlbumFamiliarity"("lastFmIntegrationId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
