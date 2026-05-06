/*
  Warnings:

  - The primary key for the `UserFriends` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `UserFriends` table. All the data in the column will be lost.
  - Added the required column `requesterUserId` to the `UserFriends` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_userId_fkey";

-- AlterTable
ALTER TABLE "UserFriends" DROP CONSTRAINT "UserFriends_pkey",
DROP COLUMN "userId",
ADD COLUMN     "requesterUserId" TEXT NOT NULL,
ADD CONSTRAINT "UserFriends_pkey" PRIMARY KEY ("requesterUserId", "requestedUserId");

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
