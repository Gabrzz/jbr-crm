-- Adding new stages to lead_stage enum
-- Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction in some PG versions,
-- but typically works in independent migration files.
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'negociacao' AFTER 'proposta';
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'contrato' AFTER 'negociacao';
