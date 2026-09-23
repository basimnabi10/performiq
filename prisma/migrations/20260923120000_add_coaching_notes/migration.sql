
-- CreateTable
CREATE TABLE "CoachingNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachingNote_memberId_createdAt_idx" ON "CoachingNote"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachingNote_orgId_idx" ON "CoachingNote"("orgId");

-- AddForeignKey
ALTER TABLE "CoachingNote" ADD CONSTRAINT "CoachingNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingNote" ADD CONSTRAINT "CoachingNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingNote" ADD CONSTRAINT "CoachingNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
