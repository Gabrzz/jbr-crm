export type LeadStage = 'novo_lead' | 'contato' | 'visita' | 'proposta' | 'negociacao' | 'contrato' | 'fechado';
export type LeadOrigin = 'site' | 'indicacao' | 'portal' | 'outro';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  email: string;
  stage: LeadStage;
  origin: LeadOrigin;
  property_interest: string;
  assigned_to: string;
  notes: string;
  last_activity_at: string;
  is_archived: boolean;
  followup_at: string | null;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  user_id: string;
  action: string;
  timestamp: string;
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  novo_lead: 'Novo Lead',
  contato: 'Contato',
  visita: 'Visita',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  contrato: 'Contrato',
  fechado: 'Fechado',
};

export const STAGE_ORDER: LeadStage[] = ['novo_lead', 'contato', 'visita', 'proposta', 'negociacao', 'contrato', 'fechado'];

export const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  site: 'Site',
  indicacao: 'Indicação',
  portal: 'Portal',
  outro: 'Outro',
};
