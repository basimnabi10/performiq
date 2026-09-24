-- Retiring a KPI cannot mean deleting it: reviews already scored against it,
-- and those scores are part of someone's record. `archived` keeps the row and
-- its history while taking it out of new review forms and out of the team's
-- 100% weight budget.
ALTER TYPE "KpiLifecycle" ADD VALUE IF NOT EXISTS 'archived';
