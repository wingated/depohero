import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface AudioDeposition {
  id: string;
  case_id: string;
  witness_name: string;
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

export function AudioDepositionPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [witnessName, setWitnessName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!witnessName) {
        setError('Please enter the witness name');
        return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=pcm',
        audioBitsPerSecond: 16000
      });

      // Set up WebSocket connection
      console.log("Setting up WebSocket connection");
      const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
      websocketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start_recording',
          caseId,
          witnessName
        }));
      };

      ws.onmessage = (event) => {
        console.log("Received message from server", event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'transcript_update') {
          setTranscript(data.transcript);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      };

      ws.onerror = (error) => {
        setError('WebSocket error occurred');
        console.error('WebSocket error:', error);
      };

      // Set up audio recording
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          //console.log("Audio chunk received", event.data);
          audioChunksRef.current.push(event.data);
          // Convert blob to base64 and send to server
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const bdata = base64data.split(',')[1];
            //console.log("Sending audio chunk to server", bdata.length);
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              chunk: bdata
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(250); // Send chunks every 0.25 seconds; AA docs say 100-400ms is best.  read limited at 131073 bytes
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      setError('Failed to start recording');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({ type: 'stop_recording' }));
        websocketRef.current.close();
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Record Deposition</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="witnessName" className="block text-sm font-medium text-gray-700 mb-2">
              Witness Name
            </label>
            <input
              type="text"
              id="witnessName"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter witness name"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Live Transcript</h2>
          <div className="min-h-[200px] p-4 bg-gray-50 rounded-md">
            {transcript || 'Transcript will appear here...'}
          </div>
        </div>
      </div>
    </div>
  );
} 