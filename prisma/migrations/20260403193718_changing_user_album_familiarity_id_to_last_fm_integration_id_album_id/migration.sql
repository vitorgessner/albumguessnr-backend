/*
  Warnings:

  - The primary key for the `UserAlbumFamiliarity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `UserAlbumFamiliarity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserAlbumFamiliarity" DROP CONSTRAINT "UserAlbumFamiliarity_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "UserAlbumFamiliarity_pkey" PRIMARY KEY ("lastFmIntegrationId", "albumId");
