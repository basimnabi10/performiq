-- An organization can carry its own mark in the sidebar. Nullable, so every
-- existing organization keeps the default one until somebody uploads.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
