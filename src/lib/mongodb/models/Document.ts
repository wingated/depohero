import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  case_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  content: {
    type: Buffer,
    required: true,
    select: false // Don't include content by default in queries
  },
  type: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt'],
    required: true
  }
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

export const Document = mongoose.model('Document', documentSchema); 