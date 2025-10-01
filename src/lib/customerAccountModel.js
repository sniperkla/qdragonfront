import mongoose from 'mongoose'

const CustomerAccountSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    license: { type: String, required: true },
    expireDate: { type: String, required: true }, // Format: "MM/DD/YYYY HH:mm"
    status: {
      type: String,
      default: 'valid',
      enum: ['valid', 'expired', 'suspended']
    },
    platform: { type: String, required: true },
    accountNumber: { type: String, required: true },
    plan: { type: Number, required: true }, // 30, 60, or 90 days
    isDemo: { type: Boolean, default: false }, // Marks demo accounts
    demoDays: { type: Number }, // Original number of demo days granted
    activatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'user' }, // 'user' or 'admin'
    adminGenerated: { type: Boolean, default: false } // true if created by admin
  },
  {
    timestamps: true
  }
)

// Index for faster queries
CustomerAccountSchema.index({ license: 1 }, { unique: true })
CustomerAccountSchema.index({ user: 1 })
CustomerAccountSchema.index({ status: 1 })
CustomerAccountSchema.index({ expireDate: 1 })

export default mongoose.models.CustomerAccount ||
  mongoose.model('CustomerAccount', CustomerAccountSchema)
