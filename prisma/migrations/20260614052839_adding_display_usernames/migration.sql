-- AlterTable
ALTER TABLE "LastFmIntegration" ADD COLUMN     "lastfmDisplayUsername" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "displayUsername" TEXT NOT NULL DEFAULT '';
