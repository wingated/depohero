import mongoose from 'mongoose';
import type { Chat as ChatType, ChatMessage } from '@/types';

const chatMessageSchema = new mongoose.Schema<ChatMessage>({
  role: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

const chatSchema = new mongoose.Schema<ChatType>({
  case_id: { type: String, required: true },
  title: { type: String, required: true },
  messages: [chatMessageSchema],
  file_ids: [{ type: String, required: true }]
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      ret.created_at = ret.createdAt.toISOString();
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

export const Chat = mongoose.model<ChatType>('Chat', chatSchema); 