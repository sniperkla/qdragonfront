import mongoose from 'mongoose'

const TopUpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: { type: String, required: true },
    amount: { type: Number, required: true }, // Amount paid in THB
    points: { type: Number, required: true }, // Points to be credited (1 THB = 1 point)
    paymentMethod: { type: String, required: true }, // bank_transfer, paypal, etc.
    paymentProof: { type: String }, // URL or description of payment proof
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    processedBy: { type: String }, // Admin username who processed
    processedAt: { type: Date },
    rejectionReason: { type: String },
    transactionRef: { type: String }, // Reference number for tracking
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
)

// Index for faster queries
TopUpSchema.index({ userId: 1 })
TopUpSchema.index({ status: 1 })
TopUpSchema.index({ createdAt: -1 })

export default mongoose.models.TopUp || mongoose.model('TopUp', TopUpSchema)
