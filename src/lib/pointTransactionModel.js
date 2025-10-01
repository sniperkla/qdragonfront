import mongoose from 'mongoose'

const PointTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['credit', 'deduction', 'topup', 'purchase', 'extension', 'refund', 'adjustment'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    balance: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true
    },
    reference: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
)

// Index for faster queries
PointTransactionSchema.index({ userId: 1, createdAt: -1 })
PointTransactionSchema.index({ type: 1 })
PointTransactionSchema.index({ status: 1 })

// Static method to get user transaction history
PointTransactionSchema.statics.getUserTransactions = async function(userId, limit = 50) {
  return await this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
}

// Static method to get transaction by reference
PointTransactionSchema.statics.findByReference = async function(reference) {
  return await this.findOne({ reference })
}

export default mongoose.models.PointTransaction || mongoose.model('PointTransaction', PointTransactionSchema)
