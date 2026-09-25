-- HR reads the organization's review record and changes none of it. It is a
-- role rather than a flag on an admin so that read-only is the default and
-- has to be granted away, not the other way round: `requireRole` takes an
-- allowlist, and 'hr' appears in none of them.
ALTER TYPE "AuthRole" ADD VALUE IF NOT EXISTS 'hr';
