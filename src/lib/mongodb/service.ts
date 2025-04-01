import type { Case, Document, Deposition, DepositionAnalysis, DocumentAnalysis, Chat, ChatMessage, AudioDeposition } from '@/types';
import { Case as CaseModel } from './models/Case';
import { Document as DocumentModel } from './models/Document';
import { Deposition as DepositionModel, DepositionAnalysis as DepositionAnalysisModel } from './models/Deposition';
import { DocumentAnalysis as DocumentAnalysisModel } from './models/DocumentAnalysis';
import { Chat as ChatModel } from './models/Chat';
import { AudioDeposition as AudioDepositionModel } from './models/AudioDeposition';
import type { Document as MongoDocument, Types } from 'mongoose';
import { Types as MongooseTypes } from 'mongoose';

function transformDocument<T>(doc: MongoDocument): T {
  const transformed = doc.toJSON();
  if (transformed._id) {
    transformed.id = transformed._id.toString();
    delete transformed._id;
  }
  if (transformed.createdAt) {
    transformed.created_at = transformed.createdAt.toISOString();
    delete transformed.createdAt;
  }
  if (transformed.updatedAt) {
    delete transformed.updatedAt;
  }
  if (transformed.messages) {
    transformed.messages = transformed.messages.map((msg: any) => {
      const messageId = typeof msg._id === 'object' && msg._id !== null ? msg._id.toString() : String(Date.now());
      const messageCreatedAt = msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date().toISOString();
      return {
        ...msg,
        id: messageId,
        created_at: messageCreatedAt,
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };
    });
  }
  return transformed as T;
}

export const mongoService = {
  // Case methods
  async getCases(userId: string): Promise<Case[]> {
    const cases = await CaseModel.find({ user_id: userId });
    return cases.map(doc => transformDocument<Case>(doc));
  },

  async getCase(id: string): Promise<Case | null> {
    const caseData = await CaseModel.findById(id);
    return caseData ? transformDocument<Case>(caseData) : null;
  },

  async createCase(data: Case): Promise<Case> {
    const newCase = await CaseModel.create(data);
    return transformDocument<Case>(newCase);
  },

  // Document methods
  async getDocuments(caseId: string, includeContent: boolean = false): Promise<Document[]> {
    const documents = await DocumentModel.find({ case_id: caseId })
      .select(includeContent ? '+content' : '-content');
    return documents.map(doc => transformDocument<Document>(doc));
  },

  async getDocument(id: string): Promise<Document | null> {
    const document = await DocumentModel.findById(id).select('-content');
    return document ? transformDocument<Document>(document) : null;
  },

  async getDocumentWithContent(id: string): Promise<Document | null> {
    const document = await DocumentModel.findById(id).select('+content');
    if (!document) return null;

    const doc = document.toObject();
    const transformed: Document = {
      id: doc._id.toString(),
      case_id: doc.case_id?.toString() || '',
      name: doc.name as string,
      type: doc.type as 'pdf' | 'doc' | 'docx' | 'txt',
      content: doc.content ? Buffer.from(doc.content) : undefined,
      created_at: doc.createdAt.toISOString()
    };

    console.log('Retrieved document with content:', {
      id: transformed.id,
      name: transformed.name,
      type: transformed.type,
      contentLength: transformed.content?.length || 0
    });

    return transformed;
  },

  async createDocument(data: Document): Promise<Document> {
    const newDocument = await DocumentModel.create(data);
    return transformDocument<Document>(newDocument);
  },

  async deleteDocument(id: string): Promise<void> {
    await DocumentModel.findByIdAndDelete(id);
  },

  // Deposition methods
  async getDeposition(id: string): Promise<Deposition | null> {
    const deposition = await DepositionModel.findById(id).populate('analysis');
    return deposition ? transformDocument<Deposition>(deposition) : null;
  },

  async getDepositions(caseId: string): Promise<Deposition[]> {
    const depositions = await DepositionModel.find({ case_id: caseId }).populate('analysis');
    return depositions.map(doc => transformDocument<Deposition>(doc));
  },

  async createDeposition(data: Deposition): Promise<Deposition> {
    const depositionData = {
      ...data,
      date: new Date(data.date)
    };
    const newDeposition = await DepositionModel.create(depositionData);
    return transformDocument<Deposition>(newDeposition);
  },

  async updateDeposition(data: Deposition): Promise<Deposition | null> {
    const updatedDeposition = await DepositionModel.findByIdAndUpdate(
      data.id,
      data,
      { new: true }
    );
    return updatedDeposition ? transformDocument<Deposition>(updatedDeposition) : null;
  },

  async deleteDeposition(id: string): Promise<void> {
    await DepositionModel.findByIdAndDelete(id);
  },

  // Deposition Analysis methods
  async getDepositionAnalysis(depositionId: string): Promise<DepositionAnalysis | null> {
    const analysis = await DepositionAnalysisModel.findOne({ deposition_id: depositionId });
    return analysis ? transformDocument<DepositionAnalysis>(analysis) : null;
  },

  async createDepositionAnalysis(data: DepositionAnalysis): Promise<DepositionAnalysis> {
    const newAnalysis = await DepositionAnalysisModel.create(data);
    
    // Update the deposition with the new analysis
    await DepositionModel.findByIdAndUpdate(
      data.deposition_id,
      { analysis: newAnalysis._id }
    );
    
    return transformDocument<DepositionAnalysis>(newAnalysis);
  },

  // Document Analysis methods
  async getDocumentAnalysis(documentId: string): Promise<DocumentAnalysis | null> {
    const analysis = await DocumentAnalysisModel.findOne({ document_id: documentId });
    return analysis ? transformDocument<DocumentAnalysis>(analysis) : null;
  },

  async getDocumentAnalyses(caseId: string): Promise<DocumentAnalysis[]> {
    const analyses = await DocumentAnalysisModel.find({ case_id: caseId });
    return analyses.map(doc => transformDocument<DocumentAnalysis>(doc));
  },

  async createDocumentAnalysis(data: DocumentAnalysis): Promise<DocumentAnalysis> {
    const newAnalysis = await DocumentAnalysisModel.create(data);
    return transformDocument<DocumentAnalysis>(newAnalysis);
  },

  // Chat methods
  async getChats(caseId: string): Promise<Chat[]> {
    const chats = await ChatModel.find({ case_id: caseId }).sort({ created_at: -1 });
    return chats.map(doc => transformDocument<Chat>(doc));
  },

  async getChat(id: string): Promise<Chat | null> {
    const chat = await ChatModel.findOne({ _id: id });
    return chat ? transformDocument<Chat>(chat) : null;
  },

  async createChat(data: Omit<Chat, 'id' | 'created_at'>): Promise<Chat> {
    const newChat = await ChatModel.create(data);
    return transformDocument<Chat>(newChat);
  },

  async deleteChat(id: string): Promise<void> {
    const result = await ChatModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new Error('Chat not found');
    }
  },

  async addMessageToChat(chatId: string, message: Omit<ChatMessage, 'id'>): Promise<Chat> {
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const newMessage: ChatMessage = {
      ...message,
      id: new MongooseTypes.ObjectId().toString(),
      created_at: new Date().toISOString()
    };

    chat.messages.push(newMessage);
    await chat.save();

    return transformDocument<Chat>(chat);
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    return chat.messages.map(msg => ({
      id: (msg as any)._id.toString(),
      role: (msg as any).role as 'user' | 'assistant',
      content: (msg as any).content,
      file_ids: (msg as any).file_ids,
      created_at: (msg as any).createdAt.toISOString()
    }));
  },

  // AudioDeposition methods
  async getAudioDeposition(id: string): Promise<AudioDeposition | null> {
    const deposition = await AudioDepositionModel.findById(id);
    return deposition ? transformDocument<AudioDeposition>(deposition) : null;
  },

  async getAudioDepositions(caseId: string): Promise<AudioDeposition[]> {
    const depositions = await AudioDepositionModel.find({ case_id: caseId });
    return depositions.map(doc => transformDocument<AudioDeposition>(doc));
  },

  async createAudioDeposition(data: Omit<AudioDeposition, 'id' | 'created_at'>): Promise<AudioDeposition> {
    const newDeposition = await AudioDepositionModel.create(data);
    return transformDocument<AudioDeposition>(newDeposition);
  },

  async updateAudioDeposition(id: string, data: Partial<AudioDeposition>): Promise<AudioDeposition | null> {
    const updatedDeposition = await AudioDepositionModel.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
    return updatedDeposition ? transformDocument<AudioDeposition>(updatedDeposition) : null;
  },

  async appendAudioChunk(id: string, chunk: { data: Buffer; timestamp: Date }): Promise<AudioDeposition | null> {
    const updatedDeposition = await AudioDepositionModel.findByIdAndUpdate(
      id,
      { $push: { audio_chunks: chunk } },
      { new: true }
    );
    return updatedDeposition ? transformDocument<AudioDeposition>(updatedDeposition) : null;
  },

  async updateTranscript(id: string, transcript: string): Promise<AudioDeposition | null> {
    const updatedDeposition = await AudioDepositionModel.findByIdAndUpdate(
      id,
      { transcript },
      { new: true }
    );
    return updatedDeposition ? transformDocument<AudioDeposition>(updatedDeposition) : null;
  },

  async deleteAudioDeposition(id: string): Promise<void> {
    await AudioDepositionModel.findByIdAndDelete(id);
  }
}; 