import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ChevronLeft, MessageSquare, Plus, FileText, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { Case, Document, Chat, ChatMessage } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function CaseChat() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth0();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add effect to log selected chat changes
  useEffect(() => {
    console.log('Selected chat changed:', selectedChat?.title || 'none');
  }, [selectedChat]);

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  async function loadData() {
    if (!caseId || !user?.sub) return;

    try {
      const [caseData, documents, chats] = await Promise.all([
        api.getCase(caseId),
        api.getDocuments(caseId, true),
        api.getChats(caseId)
      ]);

      if (caseData) setCaseData(caseData);
      if (documents) setDocuments(documents);
      if (chats) {
        setChats(chats);
        // Don't automatically select a chat when loading
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    }
  }

  async function createNewChat() {
    if (!caseId || !user?.sub) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload selected documents to OpenAI
      const fileIds = await Promise.all(
        selectedDocuments.map(async (docId) => {
          const doc = documents.find(d => d.id === docId);
          if (!doc) throw new Error('Document not found');
          if (!doc.content) throw new Error('Document has no content');

          // Create a File object from the document content
          const file = new File(
            [doc.content],
            doc.name,
            { type: 'text/plain' }
          );

          const uploadedFile = await openai.files.create({
            file,
            purpose: 'assistants' // Changed from 'user_data' to 'assistants'
          });

          return uploadedFile.id;
        })
      );

      // Create a new chat in our database
      const newChat = await api.createChat({
        case_id: caseId,
        title: `New Chat ${chats.length + 1}`,
        messages: [],
        file_ids: fileIds
      });

      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat); // Select the newly created chat
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to create chat');
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    if (!selectedChat?.id ) {
        console.log('No chat');
        return;
    }
    if (!newMessage.trim()) {
        console.log('No message');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to chat
      const updatedChat = await api.addMessageToChat(selectedChat.id, {
        role: 'user',
        content: newMessage
      });

      setSelectedChat(updatedChat); // Update selected chat with user's message
      setNewMessage('');

      // Prepare messages for OpenAI with file references
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a legal document analysis assistant. Help the user understand and analyze the provided legal documents.'
        },
        {
          role: 'user' as const,
          content: [
            ...selectedChat.file_ids.map(fileId => ({
              type: 'file' as const,
              file: { file_id: fileId }
            })),
            {
              type: 'text' as const,
              text: newMessage
            }
          ]
        }
      ];

      // Get assistant response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages
      });

      const assistantMessage = completion.choices[0].message.content;
      if (!assistantMessage) {
        throw new Error('No response from assistant');
      }

      // Add assistant message to chat
      const finalChat = await api.addMessageToChat(selectedChat.id, {
        role: 'assistant',
        content: assistantMessage
      });

      setSelectedChat(finalChat); // Update selected chat with assistant's response
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!caseData) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <button
            onClick={createNewChat}
            disabled={isLoading || selectedDocuments.length === 0}
            className="p-2 text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => {
                console.log('Clicked chat:', chat.title, 'ID:', chat.id);
                console.log('Current selected chat:', selectedChat?.title, 'ID:', selectedChat?.id);
                setSelectedChat(chat);
              }}
              className={`w-full text-left p-2 rounded-md ${
                selectedChat?.id === chat.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{chat.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <Link
              to={`/cases/${caseId}`}
              className="flex items-center text-gray-600 hover:text-indigo-600"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to {caseData.title}</span>
            </Link>
          </div>
        </div>

        {/* Document selection */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Documents</h3>
          <div className="flex flex-wrap gap-2">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDocuments(prev =>
                    prev.includes(doc.id)
                      ? prev.filter(id => id !== doc.id)
                      : [...prev, doc.id]
                  );
                }}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  selectedDocuments.includes(doc.id)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>{doc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedChat ? (
            selectedChat.messages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a chat or create a new one
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              disabled={!selectedChat || isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!selectedChat || isLoading || !newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 