/*
  Warnings:

  - The primary key for the `UserFriends` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `requestedUserId` on the `UserFriends` table. All the data in the column will be lost.
  - You are about to drop the column `requesterUserId` on the `UserFriends` table. All the data in the column will be lost.
  - Added the required column `receivedRequestsId` to the `UserFriends` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sentRequestsId` to the `UserFriends` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_requestedUserId_fkey";

-- DropForeignKey
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_requesterUserId_fkey";

-- AlterTable
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_pkey",
DROP COLUMN "requestedUserId",
DROP COLUMN "requesterUserId",
ADD COLUMN     "receivedRequestsId" TEXT NOT NULL,
ADD COLUMN     "sentRequestsId" TEXT NOT NULL,
ADD CONSTRAINT "UserFriends_pkey" PRIMARY KEY ("sentRequestsId", "receivedRequestsId");

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_sentRequestsId_fkey" FOREIGN KEY ("sentRequestsId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_receivedRequestsId_fkey" FOREIGN KEY ("receivedRequestsId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
