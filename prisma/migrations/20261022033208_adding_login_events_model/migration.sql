-- CreateTable
CREATE TABLE "LoginEvents" (
    "userId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginEvents_userId_loggedAt_key" ON "LoginEvents"("userId", "loggedAt");

-- AddForeignKey
ALTER TABLE "LoginEvents" ADD CONSTRAINT "LoginEvents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
