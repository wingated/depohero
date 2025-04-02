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
  const [depositionConductor, setDepositionConductor] = useState('');
  const [opposingCounsel, setOpposingCounsel] = useState('');
  const [depositionGoals, setDepositionGoals] = useState('');
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pcmProcessorRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (pcmProcessorRef.current) {
        pcmProcessorRef.current.disconnect();
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!witnessName || !depositionConductor || !opposingCounsel || !depositionGoals) {
        setError('Please fill in all required fields');
        return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
  
      // Load AudioWorklet
      await audioContext.audioWorklet.addModule("/pcmProcessor.tsx");
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      const pcmProcessor = new AudioWorkletNode(audioContext, "pcm-processor", {
        processorOptions: { bufferSize: 4000 } // 4000 samples = 16000 * 250ms
      });
      pcmProcessorRef.current = pcmProcessor;
      
      source.connect(pcmProcessor);
  
      // Set up WebSocket connection
      console.log("Setting up WebSocket connection");
      const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
      websocketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start_recording',
          caseId,
          witnessName,
          depositionConductor,
          opposingCounsel,
          depositionGoals
        }));
      };

      ws.onmessage = (event) => {
        //console.log("Received message from server", event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'PartialTranscript') {
          //console.log("Partial transcript:", data.transcript);

        } else if (data.type === 'FinalTranscript') {
            setTranscript(prevTranscript => prevTranscript + " " + data.transcript);

        } else if (data.type === 'error') {
          setError(data.message);
          
        } else {
          console.log("Unknown message type:", data);
        }
      };

      ws.onerror = (error) => {
        setError('WebSocket error occurred');
        console.error('WebSocket error:', error);
      };

      pcmProcessor.port.onmessage = (event) => {
        let int16Array = new Int16Array(event.data);
        const uint8Array = new Uint8Array(int16Array.buffer);
        let binaryString = String.fromCharCode(...uint8Array);
        const base64data = btoa(binaryString);
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          chunk: base64data
        }));
      };

      setIsRecording(true);
    } catch (error) {
      setError('Failed to start recording');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (pcmProcessorRef.current) {
      pcmProcessorRef.current.disconnect();
      pcmProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);

    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({ type: 'stop_recording' }));
      websocketRef.current.close();
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

          <div className="mb-4">
            <label htmlFor="depositionConductor" className="block text-sm font-medium text-gray-700 mb-2">
              Deposition Conductor
            </label>
            <input
              type="text"
              id="depositionConductor"
              value={depositionConductor}
              onChange={(e) => setDepositionConductor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name of person conducting the deposition"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="opposingCounsel" className="block text-sm font-medium text-gray-700 mb-2">
              Opposing Counsel
            </label>
            <input
              type="text"
              id="opposingCounsel"
              value={opposingCounsel}
              onChange={(e) => setOpposingCounsel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name of opposing counsel"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="depositionGoals" className="block text-sm font-medium text-gray-700 mb-2">
              Deposition Goals
            </label>
            <textarea
              id="depositionGoals"
              value={depositionGoals}
              onChange={(e) => setDepositionGoals(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the goals of this deposition"
              rows={3}
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