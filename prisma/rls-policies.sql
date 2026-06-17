-- =============================================================================
-- Row-Level Security policies for TruckFixr ShopOps
--
-- Run this in the Supabase SQL editor AFTER running `prisma migrate dev`.
--
-- Strategy: every shop-specific table has a company_id column. RLS policies
-- verify that company_id matches the value set via set_config() at the start
-- of each Prisma transaction (see src/lib/rls.ts). Server-side Prisma queries
-- use the withRLS() helper to set this context before executing any query.
-- =============================================================================

-- Helper: extract company_id from the request JWT claims set per-transaction
CREATE OR REPLACE FUNCTION current_company_id() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid
$$ LANGUAGE sql STABLE;

-- Helper: extract user sub (id) from the request JWT claims
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- Enable RLS on all shop-specific tables
-- =============================================================================

ALTER TABLE companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_capture_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_correction_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback             ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- companies — user can only see their own company
-- =============================================================================

CREATE POLICY "companies_company_isolation" ON companies
  FOR ALL USING (id = current_company_id());

-- =============================================================================
-- users — scoped to same company
-- =============================================================================

CREATE POLICY "users_company_isolation" ON users
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- customers
-- =============================================================================

CREATE POLICY "customers_company_isolation" ON customers
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- vehicles
-- =============================================================================

CREATE POLICY "vehicles_company_isolation" ON vehicles
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- items
-- =============================================================================

CREATE POLICY "items_company_isolation" ON items
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- labour_templates
-- =============================================================================

CREATE POLICY "labour_templates_company_isolation" ON labour_templates
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- estimates
-- =============================================================================

CREATE POLICY "estimates_company_isolation" ON estimates
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- estimate_lines — isolated via parent estimate
-- =============================================================================

CREATE POLICY "estimate_lines_company_isolation" ON estimate_lines
  FOR ALL USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE company_id = current_company_id()
    )
  );

-- =============================================================================
-- work_orders
-- =============================================================================

CREATE POLICY "work_orders_company_isolation" ON work_orders
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- invoices
-- =============================================================================

CREATE POLICY "invoices_company_isolation" ON invoices
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- invoice_lines — isolated via parent invoice
-- =============================================================================

CREATE POLICY "invoice_lines_company_isolation" ON invoice_lines
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id = current_company_id()
    )
  );

-- =============================================================================
-- payments
-- =============================================================================

CREATE POLICY "payments_company_isolation" ON payments
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- attachments
-- =============================================================================

CREATE POLICY "attachments_company_isolation" ON attachments
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- tax_rates
-- =============================================================================

CREATE POLICY "tax_rates_company_isolation" ON tax_rates
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- export_logs
-- =============================================================================

CREATE POLICY "export_logs_company_isolation" ON export_logs
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- ai_capture_logs
-- =============================================================================

CREATE POLICY "ai_capture_logs_company_isolation" ON ai_capture_logs
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- ai_correction_logs
-- =============================================================================

CREATE POLICY "ai_correction_logs_company_isolation" ON ai_correction_logs
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- feedback
-- =============================================================================

CREATE POLICY "feedback_company_isolation" ON feedback
  FOR ALL USING (company_id = current_company_id());

-- =============================================================================
-- Public read policy for estimate approval (magic link)
-- The approval view reads an estimate by its approval_token — no auth required.
-- Only exposes non-sensitive fields via a dedicated API route, not direct DB.
-- This policy is intentionally narrow: SELECT only, token must not be expired.
-- =============================================================================

CREATE POLICY "estimates_public_approval_read" ON estimates
  FOR SELECT USING (
    approval_token IS NOT NULL
    AND approval_token_expires_at > now()
  );
