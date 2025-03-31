import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { connectDB } from '../lib/mongodb/config/db';
import { mongoService } from '../lib/mongodb/service';
import { Document as DocumentModel } from '../lib/mongodb/models/Document';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Connect to MongoDB
connectDB();

// Routes

// Cases
app.get('/cases', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const cases = await mongoService.getCases(userId);
    res.json(cases);
  } catch (error) {
    console.error('Error getting cases:', error);
    res.status(500).json({ error: 'Failed to get cases' });
  }
});

app.get('/cases/:id', async (req: Request, res: Response) => {
  try {
    const caseData = await mongoService.getCase(req.params.id);
    if (!caseData) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    res.json(caseData);
  } catch (error) {
    console.error('Error getting case:', error);
    res.status(500).json({ error: 'Failed to get case' });
  }
});

app.post('/cases', async (req: Request, res: Response) => {
  try {
    const newCase = await mongoService.createCase(req.body);
    res.status(201).json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// Documents
app.get('/documents', async (req: Request, res: Response) => {
  try {
    const caseId = req.query.caseId as string;
    const includeContent = req.query.includeContent === 'true';
    const documents = await mongoService.getDocuments(caseId, includeContent);
    res.json(documents);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

app.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const document = await mongoService.getDocument(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

app.post('/documents', async (req: Request, res: Response) => {
  try {
    const newDocument = await mongoService.createDocument(req.body);
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    await mongoService.deleteDocument(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Document upload endpoint
app.post('/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt || !['pdf', 'doc', 'docx', 'txt'].includes(fileExt)) {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }

    const newDocument = await mongoService.createDocument({
      case_id: req.body.caseId,
      name: req.file.originalname,
      content: req.file.buffer,
      type: fileExt as 'pdf' | 'doc' | 'docx' | 'txt'
    });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Document download endpoint
app.get('/documents/:id/download', async (req: Request, res: Response) => {
  try {
    const document = await DocumentModel.findById(req.params.id).select('+content');
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const doc = document.toObject();
    if (!doc.content) {
      res.status(404).json({ error: 'Document content not found' });
      return;
    }

    const buffer = doc.content.buffer as Buffer;
    const contentLength = buffer.length;
    console.log('Downloading document:', {
      id: doc._id.toString(),
      name: doc.name,
      type: doc.type,
      contentLength
    });

    res.setHeader('Content-Type', `application/${doc.type}`);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.setHeader('Content-Length', contentLength.toString());
    res.write(buffer);
    res.end();
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Depositions
app.get('/depositions', async (req: Request, res: Response) => {
  try {
    const caseId = req.query.caseId as string;
    const depositions = await mongoService.getDepositions(caseId);
    res.json(depositions);
  } catch (error) {
    console.error('Error getting depositions:', error);
    res.status(500).json({ error: 'Failed to get depositions' });
  }
});

app.get('/depositions/:id', async (req: Request, res: Response) => {
  try {
    const deposition = await mongoService.getDeposition(req.params.id);
    if (!deposition) {
      res.status(404).json({ error: 'Deposition not found' });
      return;
    }
    res.json(deposition);
  } catch (error) {
    console.error('Error getting deposition:', error);
    res.status(500).json({ error: 'Failed to get deposition' });
  }
});

app.post('/depositions', async (req: Request, res: Response) => {
  try {
    const newDeposition = await mongoService.createDeposition(req.body);
    res.status(201).json(newDeposition);
  } catch (error) {
    console.error('Error creating deposition:', error);
    res.status(500).json({ error: 'Failed to create deposition' });
  }
});

app.put('/depositions/:id', async (req: Request, res: Response) => {
  try {
    const updatedDeposition = await mongoService.updateDeposition(req.body);
    if (!updatedDeposition) {
      res.status(404).json({ error: 'Deposition not found' });
      return;
    }
    res.json(updatedDeposition);
  } catch (error) {
    console.error('Error updating deposition:', error);
    res.status(500).json({ error: 'Failed to update deposition' });
  }
});

app.delete('/depositions/:id', async (req: Request, res: Response) => {
  try {
    await mongoService.deleteDeposition(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting deposition:', error);
    res.status(500).json({ error: 'Failed to delete deposition' });
  }
});

// Deposition Analysis
app.get('/deposition-analyses/:depositionId', async (req: Request, res: Response) => {
  try {
    const analysis = await mongoService.getDepositionAnalysis(req.params.depositionId);
    if (!analysis) {
      res.status(404).json({ error: 'Deposition analysis not found' });
      return;
    }
    res.json(analysis);
  } catch (error) {
    console.error('Error getting deposition analysis:', error);
    res.status(500).json({ error: 'Failed to get deposition analysis' });
  }
});

app.post('/deposition-analyses', async (req: Request, res: Response) => {
  try {
    const newAnalysis = await mongoService.createDepositionAnalysis(req.body);
    res.status(201).json(newAnalysis);
  } catch (error) {
    console.error('Error creating deposition analysis:', error);
    res.status(500).json({ error: 'Failed to create deposition analysis' });
  }
});

// Document Analysis
app.get('/document-analyses/:documentId', async (req: Request, res: Response) => {
  try {
    const analysis = await mongoService.getDocumentAnalysis(req.params.documentId);
    if (!analysis) {
      res.status(404).json({ error: 'Document analysis not found' });
      return;
    }
    res.json(analysis);
  } catch (error) {
    console.error('Error getting document analysis:', error);
    res.status(500).json({ error: 'Failed to get document analysis' });
  }
});

app.get('/document-analyses', async (req: Request, res: Response) => {
  try {
    const caseId = req.query.caseId as string;
    const analyses = await mongoService.getDocumentAnalyses(caseId);
    res.json(analyses);
  } catch (error) {
    console.error('Error getting document analyses:', error);
    res.status(500).json({ error: 'Failed to get document analyses' });
  }
});

app.post('/document-analyses', async (req: Request, res: Response) => {
  try {
    const newAnalysis = await mongoService.createDocumentAnalysis(req.body);
    res.status(201).json(newAnalysis);
  } catch (error) {
    console.error('Error creating document analysis:', error);
    res.status(500).json({ error: 'Failed to create document analysis' });
  }
});

// Chat endpoints
app.get('/chats', async (req: Request, res: Response) => {
  try {
    const caseId = req.query.caseId as string;
    const chats = await mongoService.getChats(caseId);
    res.json(chats);
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

app.get('/chats/:id', async (req: Request, res: Response) => {
  try {
    const chat = await mongoService.getChat(req.params.id);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json(chat);
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

app.post('/chats', async (req: Request, res: Response) => {
  try {
    const newChat = await mongoService.createChat(req.body);
    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

app.post('/chats/:id/messages', async (req: Request, res: Response) => {
  try {
    const chat = await mongoService.addMessageToChat(req.params.id, req.body);
    res.json(chat);
  } catch (error) {
    console.error('Error adding message to chat:', error);
    res.status(500).json({ error: 'Failed to add message to chat' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 