
-- CreateEnum
CREATE TYPE "KpiLifecycle" AS ENUM ('draft', 'active');

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "lifecycle" "KpiLifecycle" NOT NULL DEFAULT 'active',
ADD COLUMN     "rubric" TEXT;

-- CreateTable
CREATE TABLE "KpiCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KpiCategory_orgId_idx" ON "KpiCategory"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiCategory_orgId_name_key" ON "KpiCategory"("orgId", "name");

-- CreateIndex
CREATE INDEX "Kpi_categoryId_idx" ON "Kpi"("categoryId");

-- AddForeignKey
ALTER TABLE "KpiCategory" ADD CONSTRAINT "KpiCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KpiCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed the three categories every organization starts with. Done here rather
-- than in application code so a fresh environment has them before anyone
-- opens the KPI form, and ON CONFLICT so re-running is harmless.
INSERT INTO "KpiCategory" ("id", "orgId", "name", "createdAt")
SELECT
  md5(o."id" || ':' || c."name"),
  o."id",
  c."name",
  CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (VALUES ('Performance'), ('Professionalism'), ('Growth')) AS c("name")
ON CONFLICT ("orgId", "name") DO NOTHING;
