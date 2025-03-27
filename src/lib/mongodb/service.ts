import type { Case, Document, Deposition, DepositionAnalysis, DocumentAnalysis } from '@/types';
import { Case as CaseModel } from './models/Case';
import { Document as DocumentModel } from './models/Document';
import { Deposition as DepositionModel, DepositionAnalysis as DepositionAnalysisModel } from './models/Deposition';
import { DocumentAnalysis as DocumentAnalysisModel } from './models/DocumentAnalysis';
import type { Document as MongoDocument } from 'mongoose';

function transformDocument<T>(doc: MongoDocument): T {
  const transformed = doc.toJSON();
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
  async getDocuments(caseId: string): Promise<Document[]> {
    const documents = await DocumentModel.find({ case_id: caseId }).select('-content');
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
      content: doc.content as Buffer,
      created_at: doc.createdAt.toISOString()
    };

    console.log('Retrieved document with content:', {
      id: transformed.id,
      name: transformed.name,
      type: transformed.type,
      contentLength: transformed.content?.length || 0,
      content: transformed.content
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
    const deposition = await DepositionModel.findById(id);
    return deposition ? transformDocument<Deposition>(deposition) : null;
  },

  async getDepositions(caseId: string): Promise<Deposition[]> {
    const depositions = await DepositionModel.find({ case_id: caseId });
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
}; 