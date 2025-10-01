import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import SystemSetting from '@/lib/systemSettingModel'
import PointTransaction from '@/lib/pointTransactionModel'
import { verifyAuth } from '@/lib/auth'
import { emitCustomerAccountUpdate, emitPointsUpdate } from '@/lib/websocket'

export async function POST(request) {
  try {
    // Verify authentication
    const authData = verifyAuth(request)
    if (!authData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { licenseCode, newAccountNumber } = await request.json()

    if (!licenseCode || !newAccountNumber) {
      return NextResponse.json(
        { error: 'License code and new account number are required' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Check if feature is enabled
    const isEnabled = await SystemSetting.getSetting('account_number_change_enabled', true)
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Account number change feature is currently disabled' },
        { status: 403 }
      )
    }

    // Get the cost for changing account number
    const changeCost = await SystemSetting.getSetting('account_number_change_cost', 1000)

    // Get user - authData.id contains the user ID
    const user = await User.findById(authData.id)
    if (!user) {
      console.error('User not found with ID:', authData.id)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has enough credits
    if (user.points < changeCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: changeCost,
          current: user.points
        },
        { status: 400 }
      )
    }

    // Find the license - first try CodeRequest (primary source)
    const codeRequest = await CodeRequest.findOne({
      userId: authData.id,
      code: licenseCode
    })

    if (!codeRequest) {
      console.error('License not found in CodeRequest:', {
        userId: authData.id,
        licenseCode,
        username: user.username
      })
      return NextResponse.json(
        { error: 'License not found or does not belong to you' },
        { status: 404 }
      )
    }

    // Check if new account number is already in use for this user in CodeRequest
    const existingCodeRequest = await CodeRequest.findOne({
      userId: authData.id,
      accountNumber: newAccountNumber,
      code: { $ne: licenseCode } // Different license
    })

    if (existingCodeRequest) {
      return NextResponse.json(
        { error: 'This account number is already in use with another license' },
        { status: 400 }
      )
    }

    // Store old account number for transaction record
    const oldAccountNumber = codeRequest.accountNumber

    // Deduct credits from user
    user.points -= changeCost
    await user.save()

    // Update CodeRequest (primary)
    codeRequest.accountNumber = newAccountNumber
    await codeRequest.save()
    console.log('Updated CodeRequest account number for license:', licenseCode)

    // Also update CustomerAccount if it exists
    const customerAccount = await CustomerAccount.findOne({
      license: licenseCode,
      user: user.username
    })
    
    if (customerAccount) {
      customerAccount.accountNumber = newAccountNumber
      await customerAccount.save()
      console.log('Updated CustomerAccount account number for license:', licenseCode)
    } else {
      console.log('No CustomerAccount found for license:', licenseCode, '(this is OK)')
    }

    // Record the transaction
    await PointTransaction.create({
      userId: user._id,
      type: 'deduction',
      amount: changeCost,
      balance: user.points,
      description: `Account number changed from ${oldAccountNumber} to ${newAccountNumber} for license ${licenseCode}`,
      reference: `account_change_${licenseCode}`,
      status: 'completed'
    })

    // Emit WebSocket updates
    try {
      await emitCustomerAccountUpdate(authData.id, {
        action: 'account_number_changed',
        license: licenseCode,
        oldAccountNumber,
        newAccountNumber,
        creditsDeducted: changeCost
      })
      await emitPointsUpdate(authData.id, user.points)
    } catch (wsError) {
      console.warn('WebSocket emission failed (non-fatal):', wsError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Account number changed successfully',
      data: {
        licenseCode,
        oldAccountNumber,
        newAccountNumber,
        creditsDeducted: changeCost,
        remainingCredits: user.points
      }
    })
  } catch (error) {
    console.error('Error changing account number:', error)
    return NextResponse.json(
      { error: 'Failed to change account number', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Verify authentication
    const authData = verifyAuth(request)
    if (!authData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    // Get settings
    const isEnabled = await SystemSetting.getSetting('account_number_change_enabled', true)
    const changeCost = await SystemSetting.getSetting('account_number_change_cost', 1000)

    // Get user's current credits
    const user = await User.findById(authData.id)
    
    return NextResponse.json({
      success: true,
      data: {
        enabled: isEnabled,
        cost: changeCost,
        userCredits: user ? user.points : 0,
        canAfford: user ? user.points >= changeCost : false
      }
    })
  } catch (error) {
    console.error('Error fetching account change settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    )
  }
}
