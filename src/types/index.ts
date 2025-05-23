export interface Case {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
}

export interface Document {
  id: string;
  case_id: string;
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'txt';
  content?: Buffer;
  created_at: string;
}

export interface Deposition {
  id: string;
  case_id: string;
  witness_name: string;
  date: string;
  transcript?: string;
  analysis?: DepositionAnalysis;
  created_at: string;
}

export interface DepositionAnalysis {
  id: string;
  deposition_id: string;
  discrepancies: Discrepancy[];
  suggested_questions: string[];
  created_at: string;
}

export interface CreateDepositionAnalysis {
  deposition_id: string;
  discrepancies: Discrepancy[];
  suggested_questions: string[];
}

export interface Discrepancy {
  testimony_excerpt: string;
  document_reference: {
    document_id: string;
    excerpt: string;
  };
  explanation: string;
}

export interface DocumentAnalysis {
  id: string;
  case_id: string;
  goals: string;
  key_evidence: Array<{
    document: string;
    excerpt: string;
    relevance: string;
    supports_goals: boolean;
  }>;
  suggested_inquiries: Array<{
    topic: string;
    rationale: string;
    specific_questions: string[];
  }>;
  potential_weaknesses: Array<{
    issue: string;
    explanation: string;
    mitigation_strategy: string;
  }>;
  created_at: string;
}

export interface Chat {
  id: string;
  case_id: string;
  title: string;
  messages: ChatMessage[];
  file_ids?: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  file_ids?: string[];
  created_at: string;
}

export interface AudioDeposition {
  id: string;
  case_id: string;
  witness_name: string;
  deposition_conductor: string;
  opposing_counsel: string;
  deposition_goals: string;
  date: string;
  audio_chunks: Array<{
    data: Buffer;
    timestamp: string;
  }>;
  transcript: string;
  assembly_ai_id?: string;
  status: 'recording' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
}