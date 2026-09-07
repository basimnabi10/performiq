-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "currentNumeric" DECIMAL(10,2),
ADD COLUMN     "currentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "currentValue" TEXT;
