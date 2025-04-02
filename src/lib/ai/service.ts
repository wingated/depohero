import OpenAI from 'openai';
import { mongoService } from '../mongodb/service';

const OPENAI_API_KEY = process.env.OPENAI_AD_FORMATTER_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_AD_FORMATTER_API_KEY environment variable is required');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const serverSideAI = {
  async analyzeDeposition(depositionId: string) {
    // Get the deposition data from MongoDB
    const deposition = await mongoService.getAudioDeposition(depositionId);
    if (!deposition) {
      throw new Error('Deposition not found');
    }

    const prompt = `Analyze the following deposition transcript and format it into a JSON array of turns, where each turn represents a single utterance. 
    For each turn, identify the speaker (either the witness,"${deposition.witness_name}", the attorney conducting the deposition,"${deposition.deposition_conductor}", or the opposing counsel, "${deposition.opposing_counsel}") 
    based on the content and context of what was said.

    Format the response as a JSON array of objects, where each object has:
    - speaker: The name of the person speaking
    - text: The text that was spoken

    Here's the transcript to analyze:

    <BEGIN TRANSCRIPT>

    ${deposition.transcript}

    <END TRANSCRIPT>

    Respond with ONLY the JSON array, no other text.`;

    console.log("Prompt:", prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes deposition transcripts and formats them into structured JSON data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for more consistent output
      max_tokens: 16384,
      response_format: { type: "json_object" }
    });



    const response = completion.choices[0].message.content;
    if (!response) {
      console.log("Completion:", completion);
      console.log("Completion.choices[0]:", completion.choices[0]);
      console.log("Completion.choices[0].message:", completion.choices[0].message);
      throw new Error('No / bad / refusal response from OpenAI');
    }

    // Parse the response to ensure it's valid JSON
    const analysis = JSON.parse(response);
    return analysis;
  }
}; 