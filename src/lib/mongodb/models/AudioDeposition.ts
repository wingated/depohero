import mongoose from 'mongoose';

const audioChunkSchema = new mongoose.Schema({
  data: {
    type: mongoose.Schema.Types.Buffer,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  }
});

const audioDepositionSchema = new mongoose.Schema({
  case_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  witness_name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  audio_chunks: [audioChunkSchema],
  transcript: {
    type: String,
    default: ''
  },
  assembly_ai_id: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['recording', 'completed', 'error'],
    default: 'recording'
  },
  error_message: {
    type: String,
    required: false
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
      if (ret.date) ret.date = ret.date.toISOString();
      return ret;
    }
  }
});

export const AudioDeposition = mongoose.model('AudioDeposition', audioDepositionSchema); 