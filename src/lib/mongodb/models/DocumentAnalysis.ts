import mongoose from 'mongoose';

const keyEvidenceSchema = new mongoose.Schema({
  document: String,
  excerpt: String,
  relevance: String,
  supports_goals: Boolean
});

const suggestedInquirySchema = new mongoose.Schema({
  topic: String,
  rationale: String,
  specific_questions: [String]
});

const potentialWeaknessSchema = new mongoose.Schema({
  issue: String,
  explanation: String,
  mitigation_strategy: String
});

const documentAnalysisSchema = new mongoose.Schema({
  case_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true
  },
  goals: {
    type: String,
    required: true
  },
  key_evidence: [keyEvidenceSchema],
  suggested_inquiries: [suggestedInquirySchema],
  potential_weaknesses: [potentialWeaknessSchema]
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

export const DocumentAnalysis = mongoose.model('DocumentAnalysis', documentAnalysisSchema); 