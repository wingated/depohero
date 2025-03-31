import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ChevronLeft, MessageSquare, Plus, FileText, Send, Paperclip, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Case, Document, Chat, ChatMessage } from '../types';
import OpenAI , { toFile } from 'openai';

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
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
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
      setChats(chats || []); // Ensure chats is always an array
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
      setChats([]); // Set empty array on error
    }
  }

  async function createNewChat() {
    if (!caseId || !user?.sub) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create a new chat in our database
      const newChat = await api.createChat({
        case_id: caseId,
        title: `New Chat ${chats.length + 1}`,
        messages: []
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
      // Upload selected documents to OpenAI if any are selected
      const fileIds = await Promise.all(
        selectedDocuments.map(async (docId) => {
          const doc = documents.find(d => d.id === docId);
          if (!doc) throw new Error('Document not found');
          if (!doc.content) throw new Error('Document has no content');

          console.log('Document content:', doc.content);

          const uploadedFile = await openai.files.create({
            file: await toFile(new Uint8Array(doc.content.data), doc.name),
            purpose: 'assistants'
          });

          console.log('Uploaded file:', uploadedFile);

          return uploadedFile.id;
        })
      );

      // Add user message to chat with file IDs
      const updatedChat = await api.addMessageToChat(selectedChat.id, {
        role: 'user',
        content: newMessage,
        file_ids: fileIds,
        created_at: new Date().toISOString()
      });

      // Update chat state with user's message
      setSelectedChat(updatedChat);
      setNewMessage('');
      setSelectedDocuments([]);
      setIsDocumentModalOpen(false);

      // Get all messages for OpenAI context
      const db_messages = await api.getMessages(selectedChat.id);

      const messages = [{
        role: 'system' as const,
        content: 'You are a legal document analysis assistant. Help the user understand and analyze the provided legal documents.'
      }];
      
      for (const msg of db_messages) {
        const convo_turn = {
          role: msg.role as const,
          content: [
            { type: "text", text: msg.content }
          ]
        }
        if (msg.file_ids) {
          convo_turn.content.push(...msg.file_ids.map(fileId => ({
            type: 'file' as const,
            file: { file_id: fileId }
          })));
        }
        messages.push(convo_turn);
      }

      // Get assistant response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages
      });

      const assistantMessage = completion.choices[0].message.content;
      if (!assistantMessage) {
        throw new Error('No response from assistant');
      }

      // Add assistant message to chat
      const finalChat = await api.addMessageToChat(selectedChat.id, {
        role: 'assistant',
        content: assistantMessage,
        created_at: new Date().toISOString()
      });

      // Update chat state with assistant's message
      setSelectedChat(finalChat);
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

  async function deleteChat(chatId: string) {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat');
    } finally {
      setIsLoading(false);
    }
  }

  if (!caseData) return null;

  return (
    <div className="flex h-[85vh] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            <button
              onClick={createNewChat}
              disabled={isLoading}
              className="p-2 text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  selectedChat?.id === chat.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => {
                    console.log('Clicked chat:', chat.title, 'ID:', chat.id);
                    console.log('Current selected chat:', selectedChat?.title, 'ID:', selectedChat?.id);
                    setSelectedChat(chat);
                  }}
                  className="flex-1 flex items-center space-x-2 text-left"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate">{chat.title}</span>
                </button>
                <button
                  onClick={() => deleteChat(chat.id)}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
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
                    {message.file_ids && message.file_ids.length > 0 && (
                      <div className="mt-2 text-sm opacity-75">
                        Attached documents: {message.file_ids.length}
                      </div>
                    )}
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
        </div>

        {/* Message input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              disabled={!selectedChat || isLoading}
              className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-50"
              title="Attach documents"
            >
              <Paperclip className="h-5 w-5" />
            </button>
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

      {/* Document Selection Modal */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Documents to Attach
            </h3>
            <div className="space-y-4">
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
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDocumentModalOpen(false);
                    setSelectedDocuments([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsDocumentModalOpen(false);
                    // Don't clear selected documents as they'll be used when sending the message
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 