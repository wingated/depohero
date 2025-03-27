import type { Document } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeDeposition(deposition: any, transcript: string, documents: { content: string; name: string }[]) {
  console.log("Analyzing deposition...");
  console.log(deposition);
  
  const systemPrompt = `You are an expert legal analyst. Analyze the provided deposition transcript and compare it with the discovery documents to:
1. Identify any discrepancies between the testimony and the documents
2. Suggest follow-up questions based on potential inconsistencies or areas that need clarification
Format your response as JSON with the following structure:
{
  "discrepancies": [
    {
      "testimony_excerpt": "...",
      "document_reference": { "document_id": "...", "excerpt": "..." },
      "explanation": "..."
    }
  ],
  "suggested_questions": ["..."]
}

Begin your response with a single { character, and then produce a complete JSON object that can be directly parsed.`;

  const documentsContext = documents
    .map(doc => `Document: ${doc.name}\nContent: ${doc.content}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Discovery Documents:\n${documentsContext}\n\nThe following is the deposition transcript. The deposition was offered by ${deposition.witness_name} on ${deposition.date}:\n${transcript}` }
    ]
  });

  try {
    var response_string = response.choices[0].message.content;
    if (response_string.startsWith("```json\n")) {
      response_string = response_string.replace("```json\n","");
      response_string = response_string.replace("```","");
    }
    console.log(response_string);
    return JSON.parse(response_string || '{}');
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return {
      discrepancies: [],
      suggested_questions: []
    };
  }
}

export async function analyzeDocuments(documents: { content: string; name: string }[], goals: string) {
  const prompt = `Please analyze the following documents with these goals in mind: ${goals}

Documents:
${documents.map(doc => `${doc.name}:\n${doc.content}\n`).join('\n')}

Please provide:
1. Key evidence and important points from each document
2. Suggested lines of inquiry or questions to explore
3. Potential weaknesses or areas that need clarification

Format your response as JSON with the following structure:
{
  "goals": "Brief summary of analysis goals",
  "key_evidence": [{"point": "...", "importance": "..."}],
  "suggested_inquiries": [{"topic": "...", "questions": ["..."]}],
  "potential_weaknesses": [{"issue": "...", "impact": "..."}]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a legal document analysis assistant." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const responseContent = response.choices[0].message.content;
  if (!responseContent) {
    throw new Error('No response content from OpenAI');
  }

  return JSON.parse(responseContent);
}

export async function analyzeDocument(document: Document) {
  const documentContent = await downloadDocumentContent(document.url);
  
  const prompt = `Please analyze the following document: ${document.name}
  
Content:
${documentContent}

Please provide:
1. Key evidence and important points
2. Suggested lines of inquiry or questions to explore
3. Potential weaknesses or areas that need clarification

Format your response as JSON with the following structure:
{
  "goals": "Brief summary of document goals",
  "key_evidence": [{"point": "...", "importance": "..."}],
  "suggested_inquiries": [{"topic": "...", "questions": ["..."]}],
  "potential_weaknesses": [{"issue": "...", "impact": "..."}]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a legal document analysis assistant." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const responseContent = response.choices[0].message.content;
  if (!responseContent) {
    throw new Error('No response content from OpenAI');
  }

  return JSON.parse(responseContent);
}

async function downloadDocumentContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`);
  }
  const text = await response.text();
  if (!text) {
    throw new Error('Document content is empty');
  }
  return text;
}