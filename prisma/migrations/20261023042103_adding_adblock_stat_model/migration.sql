-- CreateTable
CREATE TABLE "AdblockStat" (
    "date" DATE NOT NULL,
    "checked" INTEGER NOT NULL DEFAULT 0,
    "blocked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdblockStat_pkey" PRIMARY KEY ("date")
);
