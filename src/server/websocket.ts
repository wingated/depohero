import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { mongoService } from '../lib/mongodb/service';
import { AssemblyAI } from 'assemblyai';
import { Buffer } from 'buffer';

const ASSEMBLY_AI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;
if (!ASSEMBLY_AI_API_KEY) {
  throw new Error('ASSEMBLY_AI_API_KEY environment variable is required');
}

const client = new AssemblyAI({ apiKey: ASSEMBLY_AI_API_KEY });

interface AudioDepositionConnection {
  ws: WebSocket;
  depositionId: string;
  assemblyAiStream?: any;
}

const connections = new Map<string, AudioDepositionConnection>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let connection: AudioDepositionConnection | null = null;

    ws.on('message', async (message: string) => {
      //console.log("Received message:", message);
      //console.log("Connection:", connection);

      try {
        const data = JSON.parse(message);
        //console.log("Data:", data);
        // look up the connection by the deposition id
        //const depositionId = data.depositionId;
        //connection = connections.get(depositionId);

        switch (data.type) {
          case 'start_recording':
            if (!connection) {
              console.log("Creating new deposition");
              const deposition = await mongoService.createAudioDeposition({
                case_id: data.caseId,
                witness_name: data.witnessName,
                deposition_conductor: data.depositionConductor,
                opposing_counsel: data.opposingCounsel,
                deposition_goals: data.depositionGoals,
                date: new Date().toISOString(),
                audio_chunks: [],
                transcript: '',
                status: 'recording'
              });

              // Initialize Assembly AI real-time transcription
              // https://www.assemblyai.com/docs/sdk-references/js/streaming
              const assemblyAiStream = await client.realtime.transcriber({
                sampleRate: 16000,
                //encoding: 'pcm_s16le',
                endUtteranceSilenceThreshold: 20000
              });

              assemblyAiStream.on('transcript', async (transcript) => {
                
                // console.log("Transcript received by the server:", transcript);

                if (connection && transcript.text.length > 0) {
                  // Update the transcript in the database
                  await mongoService.updateTranscript(connection.depositionId, transcript.text);
                  // Send the transcript update to the client
                  connection.ws.send(JSON.stringify({
                    type: transcript['message_type'], // can be 'PartialTranscript' or 'FinalTranscript'
                    transcript: transcript.text
                  }));
                }
              });

              await assemblyAiStream.connect();

              //console.log("Assembly AI stream initialized", assemblyAiStream);
              //console.log("AA socket:", assemblyAiStream.socket)
              //console.log("AA socket state", assemblyAiStream.socket.readyState);

              connection = {
                ws,
                depositionId: deposition.id,
                assemblyAiStream: assemblyAiStream
              };
              connections.set(deposition.id, connection);

              console.log("Done starting recording");
            } else {
              console.log("No connection found");
            }
            break;

          case 'audio_chunk':
            if (connection) {
              //console.log("Audio chunk received");
              // Store the audio chunk in the database
              await mongoService.appendAudioChunk(connection.depositionId, {
                data: Buffer.from(data.chunk, 'base64'),
                timestamp: new Date()
              });

              // Forward the audio chunk to Assembly AI
              if (connection.assemblyAiStream) {
                //console.log("Forwarding audio chunk to Assembly AI", data.chunk.length);
                const payload = {
                    audio_data: data.chunk, // already base64 encoded
                };
                connection.assemblyAiStream.send(JSON.stringify(payload));
              }
              //console.log("Successfully forwarded audio chunk to Assembly AI");
            } else {
              console.log("No connection found");
            }
            break;

          case 'stop_recording':
            if (connection) {
              // Stop the Assembly AI stream
              if (connection.assemblyAiStream) {
                await connection.assemblyAiStream.close();
              }

              // Update the deposition status
              await mongoService.updateAudioDeposition(connection.depositionId, {
                status: 'completed'
              });

              // Remove the connection
              connections.delete(connection.depositionId);
              //connection = null;

            } else {
              console.log("No connection found");
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'An error occurred'
        }));
      }
    });

    ws.on('close', async () => {
      console.log("Received close event");
      if (connection) {
        // Stop the Assembly AI stream if it's still running
        if (connection.assemblyAiStream) {
          await connection.assemblyAiStream.close();
        }

        // Update the deposition status
        await mongoService.updateAudioDeposition(connection.depositionId, {
          status: 'completed'
        });

        // Remove the connection
        connections.delete(connection.depositionId);
      }
    });
  });
} 