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
  const systemPrompt = `You are an expert legal analyst. Analyze the provided documents in the context of the specified goals to:
1. Identify key evidence that supports or contradicts the goals
2. Suggest lines of inquiry for depositions
3. Highlight potential weaknesses or areas needing further investigation
Format your response as JSON with the following structure:
{
  "key_evidence": [
    {
      "document": "...",
      "excerpt": "...",
      "relevance": "...",
      "supports_goals": boolean
    }
  ],
  "suggested_inquiries": [
    {
      "topic": "...",
      "rationale": "...",
      "specific_questions": ["..."]
    }
  ],
  "potential_weaknesses": [
    {
      "issue": "...",
      "explanation": "...",
      "mitigation_strategy": "..."
    }
  ]
}`;

  const documentsContext = documents
    .map(doc => `Document: ${doc.name}\nContent: ${doc.content}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Goals:\n${goals}\n\nDocuments:\n${documentsContext}` }
    ]
  });

  try {
    var response_string = response.choices[0].message.content;
    if (response_string.startsWith("```json\n")) {
      response_string = response_string.replace("```json\n","");
      response_string = response_string.replace("```","");
    }
    return JSON.parse(response_string || '{}');
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return {
      key_evidence: [],
      suggested_inquiries: [],
      potential_weaknesses: []
    };
  }
}