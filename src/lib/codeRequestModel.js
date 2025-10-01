import mongoose from 'mongoose'

const CodeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: { type: String, required: true },
    accountNumber: { type: String, required: true },
    platform: { type: String, required: true },
    plan: { type: Number, required: true }, // 30, 60, or 90 days
    code: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'activated', 'expired', 'cancelled'],
      default: 'pending_payment'
    },
    paymentMethod: { type: String }, // 'stripe', 'paypal', 'bank_transfer', etc.
    paymentId: { type: String }, // Payment processor transaction ID
    paidAt: { type: Date },
    activatedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    pointsUsed: { type: Number, default: 0 }, // Points used for this license (0 = paid with money)
    activationEmailSent: { type: Boolean, default: false },
    activationEmailSentAt: { type: Date },
    activationEmailResentCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
)

// Index for faster queries
CodeRequestSchema.index({ code: 1 }, { unique: true })
CodeRequestSchema.index({ userId: 1 })
CodeRequestSchema.index({ status: 1 })

export default mongoose.models.CodeRequest ||
  mongoose.model('CodeRequest', CodeRequestSchema)
