import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface TranscriptTurn {
  speaker: string;
  text: string;
}

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

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    witnessName: string;
    depositionConductor: string;
    opposingCounsel: string;
    depositionGoals: string;
  }) => void;
}

function SetupModal({ isOpen, onClose, onSubmit }: SetupModalProps) {
  const [witnessName, setWitnessName] = useState('');
  const [depositionConductor, setDepositionConductor] = useState('');
  const [opposingCounsel, setOpposingCounsel] = useState('');
  const [depositionGoals, setDepositionGoals] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      witnessName,
      depositionConductor,
      opposingCounsel,
      depositionGoals,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Set Up Deposition</h2>
        <form onSubmit={handleSubmit}>
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
              required
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
              required
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
              required
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
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Start Deposition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AudioDepositionPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [depositionInfo, setDepositionInfo] = useState<{
    witnessName: string;
    depositionConductor: string;
    opposingCounsel: string;
    depositionGoals: string;
  } | null>(null);
  const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
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
      if (!depositionInfo) {
        setError('Please set up the deposition first');
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
      const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
      websocketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start_recording',
          caseId,
          ...depositionInfo
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'PartialTranscript') {
          console.log("Partial transcript:", data.transcript);
        } else if (data.type === 'FinalTranscript') {
          console.log("Final transcript:", data.transcript);
        } else if (data.type === 'JSON_Transcript') {
          console.log("JSON transcript:", data.json_transcript);
          const turns = Array.isArray(data.json_transcript['turns']) ? data.json_transcript['turns'] : [];
          setTranscriptTurns(turns);
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
      console.log("Closing websocket");
      websocketRef.current.send(JSON.stringify({ type: 'stop_recording' }));
      websocketRef.current.close();
    }
  };

  const handleSetupSubmit = (data: {
    witnessName: string;
    depositionConductor: string;
    opposingCounsel: string;
    depositionGoals: string;
  }) => {
    setDepositionInfo(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {!depositionInfo ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="px-8 py-4 bg-blue-500 text-white text-xl font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Set up deposition
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Deposition Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Witness</p>
                  <p className="font-medium">{depositionInfo.witnessName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conductor</p>
                  <p className="font-medium">{depositionInfo.depositionConductor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opposing Counsel</p>
                  <p className="font-medium">{depositionInfo.opposingCounsel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Goals</p>
                  <p className="font-medium">{depositionInfo.depositionGoals}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Transcript</h2>
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

              <div className="space-y-4">
                {transcriptTurns.map((turn, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md ${
                      turn.speaker === depositionInfo.witnessName
                        ? 'bg-green-50'
                        : turn.speaker === depositionInfo.opposingCounsel
                        ? 'bg-red-50'
                        : 'bg-white'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-600 mb-1">
                      {turn.speaker}
                    </div>
                    <div className="text-gray-800">{turn.utterance}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      <SetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSubmit={handleSetupSubmit}
      />
    </div>
  );
} 