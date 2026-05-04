export interface Settings {
  id: number;
  condo_name: string;
  closing_day: number;
  anthropic_key: string | null;
  ollama_url: string;
  ollama_model: string;
  ollama_api_key: string | null;
  ai_system_prompt: string | null;
  updated_at: string;
}

export interface Period {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  is_closed: number;
  is_current: number;
  created_at: string;
}

export type TransactionType = 'revenue' | 'expense';
export type TransactionSource = 'manual' | 'ai';

export interface Transaction {
  id: number;
  period_id: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: number;
  period_id: number;
  uri: string;
  ai_raw_response: string | null;
  created_at: string;
}

export interface PeriodBalance {
  total_receita: number;
  total_despesa: number;
  saldo: number;
}

export interface ExtractedTransaction {
  date: string | null;
  description: string;
  amount: number | null;
  type: TransactionType;
}
