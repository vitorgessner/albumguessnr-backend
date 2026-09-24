-- DropForeignKey
ALTER TABLE "DailyAlbumTry" DROP CONSTRAINT "DailyAlbumTry_userDailyAlbumId_fkey";

-- DropForeignKey
ALTER TABLE "FailedAlbumsSync" DROP CONSTRAINT "FailedAlbumsSync_userId_fkey";

-- DropForeignKey
ALTER TABLE "GuessAttempt" DROP CONSTRAINT "GuessAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumDataErrorsLogs" DROP CONSTRAINT "UserAlbumDataErrorsLogs_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumFamiliarity" DROP CONSTRAINT "UserAlbumFamiliarity_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumScores" DROP CONSTRAINT "UserAlbumScores_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAlbumStats" DROP CONSTRAINT "UserAlbumStats_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserDailyAlbum" DROP CONSTRAINT "UserDailyAlbum_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserDailyAlbumOverallStatistics" DROP CONSTRAINT "UserDailyAlbumOverallStatistics_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_receivedRequestsId_fkey";

-- DropForeignKey
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_sentRequestsId_fkey";

-- DropForeignKey
ALTER TABLE "UserStats" DROP CONSTRAINT "UserStats_userId_fkey";

-- AlterTable
ALTER TABLE "DailyAlbumTry" ALTER COLUMN "userDailyAlbumId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FailedAlbumsSync" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserAlbumDataErrorsLogs" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserDailyAlbum" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuessAttempt" ADD CONSTRAINT "GuessAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumScores" ADD CONSTRAINT "UserAlbumScores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumStats" ADD CONSTRAINT "UserAlbumStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumFamiliarity" ADD CONSTRAINT "UserAlbumFamiliarity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_sentRequestsId_fkey" FOREIGN KEY ("sentRequestsId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_receivedRequestsId_fkey" FOREIGN KEY ("receivedRequestsId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbum" ADD CONSTRAINT "UserDailyAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAlbumTry" ADD CONSTRAINT "DailyAlbumTry_userDailyAlbumId_fkey" FOREIGN KEY ("userDailyAlbumId") REFERENCES "UserDailyAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyAlbumOverallStatistics" ADD CONSTRAINT "UserDailyAlbumOverallStatistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedAlbumsSync" ADD CONSTRAINT "FailedAlbumsSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlbumDataErrorsLogs" ADD CONSTRAINT "UserAlbumDataErrorsLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
