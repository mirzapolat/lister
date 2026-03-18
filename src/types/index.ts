export interface List {
  id: number;
  name: string;
  description: string;
  created_at: string;
  contact_count?: number;
}

export interface Contact {
  id: number;
  list_id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  list_id: number | null;
  status: 'draft' | 'sent';
  created_at: string;
  sent_at: string | null;
  list_name?: string;
}

export interface SmtpSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_tls: string;
  sender_name: string;
  sender_email: string;
}

export interface Subscriber {
  id: number;
  email: string;
  name: string;
  created_at: string;
  list_count?: number;
  tags?: string; // comma-joined
}

export type Page = 'lists' | 'list-detail' | 'campaigns' | 'campaign-editor' | 'settings' | 'subscribers';

export interface AppState {
  currentPage: Page;
  selectedListId: number | null;
  selectedCampaignId: number | null;
}

export interface ImportHistory {
  id: number;
  list_id: number;
  added_count: number;
  skipped_count: number;
  source: string;
  created_at: string;
}

export interface Bounce {
  id: number;
  email: string;
  reason: string;
  created_at: string;
}

export interface ContactTag {
  contact_id: number;
  tag: string;
}

export interface SenderProfile {
  id: number;
  name: string;
  sender_name: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_tls: string;
  is_default: number;
  rate_limit_ms: number;
  created_at: string;
}

export interface CampaignSend {
  id: number;
  campaign_id: number | null;
  campaign_name: string | null;
  campaign_subject: string | null;
  subscriber_id: number;
  sent_at: string;
  status: 'sent' | 'failed';
  error: string;
}
