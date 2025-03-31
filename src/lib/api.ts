import type { Case, Document, Deposition, DepositionAnalysis, DocumentAnalysis, CreateDepositionAnalysis, Chat, ChatMessage } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  // Case endpoints
  async getCases(userId: string): Promise<Case[]> {
    const response = await fetch(`${API_URL}/cases?userId=${userId}`);
    return response.json();
  },

  async getCase(id: string): Promise<Case> {
    const response = await fetch(`${API_URL}/cases/${id}`);
    return response.json();
  },

  async createCase(data: Case): Promise<Case> {
    const response = await fetch(`${API_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Document endpoints
  async getDocuments(caseId: string, includeContent: boolean = false): Promise<Document[]> {
    const response = await fetch(`${API_URL}/documents?caseId=${caseId}&includeContent=${includeContent}`);
    return response.json();
  },

  async getDocument(id: string): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${id}`);
    return response.json();
  },

  async createDocument(data: Document): Promise<Document> {
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async uploadDocument(file: File, caseId: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  async downloadDocument(id: string): Promise<Blob> {
    const response = await fetch(`${API_URL}/documents/${id}/download`);
    return response.blob();
  },

  async deleteDocument(id: string): Promise<void> {
    await fetch(`${API_URL}/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // Deposition endpoints
  async getDeposition(id: string): Promise<Deposition> {
    const response = await fetch(`${API_URL}/depositions/${id}`);
    return response.json();
  },

  async getDepositions(caseId: string): Promise<Deposition[]> {
    const response = await fetch(`${API_URL}/depositions?caseId=${caseId}`);
    return response.json();
  },

  async createDeposition(data: Deposition): Promise<Deposition> {
    const response = await fetch(`${API_URL}/depositions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateDeposition(data: Deposition): Promise<Deposition> {
    const response = await fetch(`${API_URL}/depositions/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteDeposition(id: string): Promise<void> {
    await fetch(`${API_URL}/depositions/${id}`, {
      method: 'DELETE',
    });
  },

  // Deposition Analysis endpoints
  async getDepositionAnalysis(depositionId: string): Promise<DepositionAnalysis> {
    const response = await fetch(`${API_URL}/deposition-analyses/${depositionId}`);
    return response.json();
  },

  async createDepositionAnalysis(data: CreateDepositionAnalysis): Promise<DepositionAnalysis> {
    const response = await fetch(`${API_URL}/deposition-analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Document Analysis endpoints
  async getDocumentAnalysis(documentId: string): Promise<DocumentAnalysis> {
    const response = await fetch(`${API_URL}/document-analyses/${documentId}`);
    return response.json();
  },

  async getDocumentAnalyses(caseId: string): Promise<DocumentAnalysis[]> {
    const response = await fetch(`${API_URL}/document-analyses?caseId=${caseId}`);
    return response.json();
  },

  async createDocumentAnalysis(data: DocumentAnalysis): Promise<DocumentAnalysis> {
    const response = await fetch(`${API_URL}/document-analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Chat endpoints
  async getChats(caseId: string): Promise<Chat[]> {
    const response = await fetch(`${API_URL}/chats?caseId=${caseId}`);
    return response.json();
  },

  async getChat(id: string): Promise<Chat> {
    const response = await fetch(`${API_URL}/chats/${id}`);
    return response.json();
  },

  async createChat(data: Omit<Chat, 'id' | 'created_at'>): Promise<Chat> {
    const response = await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async addMessageToChat(chatId: string, message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<Chat> {
    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.json();
  }
}; 