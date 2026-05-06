-- CreateEnum
CREATE TYPE "FriendsStats" AS ENUM ('PENDING', 'FRIEND', 'DENIED');

-- CreateTable
CREATE TABLE "UserFriends" (
    "userId" TEXT NOT NULL,
    "requestedUserId" TEXT NOT NULL,
    "stat" "FriendsStats" NOT NULL,
    "timesRequested" INTEGER NOT NULL DEFAULT 0,
    "timesRejected" INTEGER NOT NULL DEFAULT 0,
    "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFriends_pkey" PRIMARY KEY ("userId","requestedUserId")
);

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_requestedUserId_fkey" FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
