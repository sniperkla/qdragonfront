import mongoose from 'mongoose'

const ExtensionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    codeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodeRequest',
      required: false
    },
    customerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      required: false
    },
    licenseSource: {
      type: String,
      enum: ['codeRequest', 'customerAccount', 'both'],
      required: true
    },
    username: { type: String, required: true },
    licenseCode: { type: String, required: true },
    currentExpiry: { type: String, required: true },
    requestedPlan: { type: String, required: true },
    requestedDays: { type: Number, required: true },
    // Total days on the license AFTER this extension (base + all extensions)
    cumulativePlanDays: { type: Number },
    // Sum of all extension days applied so far (excluding original base plan)
    totalExtendedDays: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: String },
    rejectionReason: { type: String }
  },
  { timestamps: true }
)

export default mongoose.models.ExtensionRequest ||
  mongoose.model('ExtensionRequest', ExtensionRequestSchema)
