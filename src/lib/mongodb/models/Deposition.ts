import mongoose from 'mongoose';

const discrepancySchema = new mongoose.Schema({
  testimony_excerpt: String,
  document_reference: {
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    excerpt: String
  },
  explanation: String
});

const depositionAnalysisSchema = new mongoose.Schema({
  deposition_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposition',
    required: true
  },
  discrepancies: [discrepancySchema],
  suggested_questions: [String]
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

const depositionSchema = new mongoose.Schema({
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
    required: true
  },
  transcript: {
    type: String,
    required: false
  },
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepositionAnalysis'
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
      if (ret.date) ret.date = ret.date.toISOString().split('T')[0];
      return ret;
    }
  }
});

export const Deposition = mongoose.model('Deposition', depositionSchema);
export const DepositionAnalysis = mongoose.model('DepositionAnalysis', depositionAnalysisSchema); 