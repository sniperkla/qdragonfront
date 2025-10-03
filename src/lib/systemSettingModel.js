import mongoose from 'mongoose'

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['general', 'pricing', 'features', 'limits'],
      default: 'general'
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
// Note: 'key' already has unique:true which creates an index automatically
SystemSettingSchema.index({ category: 1 })

// Static method to get setting by key
SystemSettingSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key })
  return setting ? setting.value : defaultValue
}

// Static method to set/update setting
SystemSettingSchema.statics.setSetting = async function(key, value, description = '', category = 'general', updatedBy = 'admin') {
  return await this.findOneAndUpdate(
    { key },
    { value, description, category, updatedBy },
    { upsert: true, new: true }
  )
}

// Static method to seed default settings
SystemSettingSchema.statics.seedDefaultSettings = async function() {
  const defaultSettings = [
    {
      key: 'account_number_change_cost',
      value: 1000,
      description: 'Cost in credits to change account number',
      category: 'pricing'
    },
    {
      key: 'account_number_change_enabled',
      value: true,
      description: 'Enable/disable account number change feature',
      category: 'features'
    },
    {
      key: 'license_extension_cost_per_day',
      value: 1,
      description: 'Cost in credits per day for license extension (1 credit = 1 day by default)',
      category: 'pricing'
    },
    {
      key: 'license_extension_enabled',
      value: true,
      description: 'Enable/disable license extension feature',
      category: 'features'
    },
    {
      key: 'license_extension_max_days',
      value: 365,
      description: 'Maximum days allowed per extension request',
      category: 'limits'
    }
  ]

  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true, new: true }
    )
  }
  
  console.log('✅ Default system settings seeded successfully')
}

export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema)
