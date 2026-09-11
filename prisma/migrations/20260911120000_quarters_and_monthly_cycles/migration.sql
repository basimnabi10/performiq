
-- CreateEnum
CREATE TYPE "QuarterStatus" AS ENUM ('planning', 'in_progress', 'closed');

-- DropForeignKey
ALTER TABLE "Kpi" DROP CONSTRAINT "Kpi_cycleId_fkey";

-- DropIndex
DROP INDEX "Kpi_cycleId_idx";

-- AlterTable
ALTER TABLE "Kpi" DROP COLUMN "cycleId",
ADD COLUMN     "quarterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReviewCycle" ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "quarterId" TEXT,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "runsOwnCycles" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Quarter" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "departmentId" TEXT,
    "teamId" TEXT,
    "status" "QuarterStatus" NOT NULL DEFAULT 'in_progress',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quarter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quarter_orgId_idx" ON "Quarter"("orgId");

-- CreateIndex
CREATE INDEX "Quarter_departmentId_idx" ON "Quarter"("departmentId");

-- CreateIndex
CREATE INDEX "Quarter_teamId_idx" ON "Quarter"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Quarter_orgId_year_index_departmentId_teamId_key" ON "Quarter"("orgId", "year", "index", "departmentId", "teamId");

-- CreateIndex
CREATE INDEX "Kpi_quarterId_idx" ON "Kpi"("quarterId");

-- CreateIndex
CREATE INDEX "ReviewCycle_teamId_idx" ON "ReviewCycle"("teamId");

-- CreateIndex
CREATE INDEX "ReviewCycle_quarterId_idx" ON "ReviewCycle"("quarterId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCycle_orgId_year_month_departmentId_teamId_key" ON "ReviewCycle"("orgId", "year", "month", "departmentId", "teamId");

-- AddForeignKey
ALTER TABLE "Quarter" ADD CONSTRAINT "Quarter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quarter" ADD CONSTRAINT "Quarter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quarter" ADD CONSTRAINT "Quarter_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "Quarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "Quarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

