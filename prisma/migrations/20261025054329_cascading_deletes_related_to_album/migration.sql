-- DropForeignKey
ALTER TABLE "AlbumPools" DROP CONSTRAINT "AlbumPools_albumId_fkey";

-- DropForeignKey
ALTER TABLE "AlbumsArtist" DROP CONSTRAINT "AlbumsArtist_albumId_fkey";

-- DropForeignKey
ALTER TABLE "AlbumsArtist" DROP CONSTRAINT "AlbumsArtist_artistId_fkey";

-- DropForeignKey
ALTER TABLE "AlbumsGenre" DROP CONSTRAINT "AlbumsGenre_albumId_fkey";

-- DropForeignKey
ALTER TABLE "AlbumsGenre" DROP CONSTRAINT "AlbumsGenre_genreId_fkey";

-- DropForeignKey
ALTER TABLE "DailyAlbum" DROP CONSTRAINT "DailyAlbum_albumId_fkey";

-- DropForeignKey
ALTER TABLE "GuessAttempt" DROP CONSTRAINT "GuessAttempt_albumId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_albumId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumFamiliarity" DROP CONSTRAINT "UserAlbumFamiliarity_albumId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumScores" DROP CONSTRAINT "UserAlbumScores_albumId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumStats" DROP CONSTRAINT "UserAlbumStats_albumId_fkey";

-- DropForeignKey
ALTER TABLE "UserDailyAlbum" DROP CONSTRAINT "UserDailyAlbum_dailyAlbumId_fkey";

-- AddForeignKey
ALTER TABLE "GuessAttempt" ADD CONSTRAINT "GuessAttempt_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumScores" ADD CONSTRAINT "UserAlbumScores_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumStats" ADD CONSTRAINT "UserAlbumStats_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumFamiliarity" ADD CONSTRAINT "UserAlbumFamiliarity_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAlbum" ADD CONSTRAINT "DailyAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPools" ADD CONSTRAINT "AlbumPools_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbum" ADD CONSTRAINT "UserDailyAlbum_dailyAlbumId_fkey" FOREIGN KEY ("dailyAlbumId") REFERENCES "DailyAlbum"("albumId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsGenre" ADD CONSTRAINT "AlbumsGenre_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsGenre" ADD CONSTRAINT "AlbumsGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsArtist" ADD CONSTRAINT "AlbumsArtist_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumsArtist" ADD CONSTRAINT "AlbumsArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
