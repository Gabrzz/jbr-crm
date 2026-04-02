-- Adiciona IDs relacionados à integração do Chatwoot na tabela leads
alter table public.leads
add column if not exists chatwoot_contact_id text,
add column if not exists chatwoot_conversation_id text;
