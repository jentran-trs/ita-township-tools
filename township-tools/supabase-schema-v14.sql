-- v14: fix Supabase "Security Definer View" lint finding on cv_completion_stats.
--
-- Postgres views default to running with the OWNER's privileges (effective
-- SECURITY DEFINER), which bypasses RLS on the underlying tables for any
-- caller that comes in through PostgREST. Flip the view to SECURITY INVOKER
-- so RLS is evaluated against the querying role (anon, authenticated,
-- service_role) instead of the view owner.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- Safe to run repeatedly. Server-side API routes use the service role key,
-- which bypasses RLS, so no behavior change for the app.

ALTER VIEW cv_completion_stats SET (security_invoker = true);
