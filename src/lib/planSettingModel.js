import mongoose from 'mongoose'

const PlanSettingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    days: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    points: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isLifetime: {
      type: Boolean,
      default: false
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: String,
      default: 'admin'
    },
    updatedBy: {
      type: String,
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
)

// Index for faster queries
PlanSettingSchema.index({ isActive: 1, sortOrder: 1 })
PlanSettingSchema.index({ days: 1 })
PlanSettingSchema.index({ isLifetime: 1 })

// Virtual for display name
PlanSettingSchema.virtual('displayName').get(function() {
  if (this.isLifetime) {
    return `${this.name} (Lifetime)`
  }
  return `${this.name} (${this.days} days)`
})

// Method to get price per day
PlanSettingSchema.methods.getPricePerDay = function() {
  if (this.isLifetime) return null
  return (this.price / this.days).toFixed(4)
}

// Static method to get active plans
PlanSettingSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, days: 1 })
}

// Static method to seed default plans
PlanSettingSchema.statics.seedDefaultPlans = async function() {
  const count = await this.countDocuments()
  if (count === 0) {
    const defaultPlans = [
      {
        name: 'Trial',
        days: 7,
        price: 10,
        points: 10,
        description: 'Perfect for testing our services',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Monthly',
        days: 30,
        price: 35,
        points: 35,
        description: 'Most popular monthly plan',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Quarterly',
        days: 90,
        price: 90,
        points: 90,
        description: 'Save more with quarterly plan',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Semi-Annual',
        days: 180,
        price: 160,
        points: 160,
        description: 'Great value for 6 months',
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Annual',
        days: 365,
        price: 300,
        points: 300,
        description: 'Best value - full year access',
        sortOrder: 5,
        isActive: true
      },
      {
        name: 'Lifetime',
        days: 999999,
        price: 500,
        points: 500,
        description: 'One-time payment, lifetime access',
        sortOrder: 6,
        isActive: true,
        isLifetime: true
      }
    ]

    await this.insertMany(defaultPlans)
    console.log('✅ Default plans seeded successfully')
  }
}

export default mongoose.models.PlanSetting || mongoose.model('PlanSetting', PlanSettingSchema)