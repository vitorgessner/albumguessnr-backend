/*
  Warnings:

  - A unique constraint covering the columns `[lastfmUsername]` on the table `LastFmIntegration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LastFmIntegration_lastfmUsername_key" ON "LastFmIntegration"("lastfmUsername");
