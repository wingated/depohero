import mongoose from 'mongoose';
import type { Chat as ChatType, ChatMessage } from '@/types';

interface ChatMessageDoc extends Omit<ChatMessage, 'id'> {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new mongoose.Schema<ChatMessageDoc>({
  role: { type: String, required: true },
  content: { type: String, required: true },
  file_ids: [{ type: String }]
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      ret.created_at = ret.createdAt.toISOString();
      delete ret._id;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

const chatSchema = new mongoose.Schema<ChatType>({
  case_id: { type: String, required: true },
  title: { type: String, required: true },
  messages: [chatMessageSchema],
  file_ids: [{ type: String }]
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