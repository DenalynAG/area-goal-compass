ALTER TABLE public.audit_plans
ADD COLUMN IF NOT EXISTS audit_type TEXT NOT NULL DEFAULT 'anual';

ALTER TABLE public.audit_plans
DROP CONSTRAINT IF EXISTS audit_plans_audit_type_check;

ALTER TABLE public.audit_plans
ADD CONSTRAINT audit_plans_audit_type_check CHECK (audit_type IN ('anual', 'diaria'));