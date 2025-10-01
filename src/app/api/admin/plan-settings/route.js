import { connectToDatabase } from '@/lib/mongodb'
import PlanSetting from '@/lib/planSettingModel'

// Get all plan settings
export async function GET(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') === 'true'

    await connectToDatabase()

    // Seed default plans if none exist
    await PlanSetting.seedDefaultPlans()

    let query = {}
    if (activeOnly) {
      query.isActive = true
    }

    const plans = await PlanSetting.find(query).sort({ sortOrder: 1, days: 1 })

    console.log(`Admin fetching plan settings: found ${plans.length} plans`)

    return new Response(
      JSON.stringify({
        success: true,
        plans: plans.map(plan => ({
          id: plan._id,
          name: plan.name,
          days: plan.days,
          price: plan.price,
          points: plan.points,
          description: plan.description,
          isActive: plan.isActive,
          isLifetime: plan.isLifetime,
          sortOrder: plan.sortOrder,
          displayName: plan.displayName,
          pricePerDay: plan.getPricePerDay(),
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt
        }))
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Plan settings fetch error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Create new plan setting
export async function POST(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { name, days, price, points, description, isActive, isLifetime, sortOrder } = await req.json()

    if (!name || !days || price === undefined || points === undefined) {
      return new Response(
        JSON.stringify({ error: 'Name, days, price, and points are required' }),
        { status: 400 }
      )
    }

    if (days <= 0 || price < 0 || points < 0) {
      return new Response(
        JSON.stringify({ error: 'Days must be positive, price and points cannot be negative' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Check for duplicate plan names
    const existingPlan = await PlanSetting.findOne({ name: name.trim() })
    if (existingPlan) {
      return new Response(
        JSON.stringify({ error: 'A plan with this name already exists' }),
        { status: 400 }
      )
    }

    const planData = {
      name: name.trim(),
      days: parseInt(days),
      price: parseFloat(price),
      points: parseFloat(points),
      description: description?.trim() || '',
      isActive: isActive !== false, // Default to true
      isLifetime: isLifetime === true,
      sortOrder: parseInt(sortOrder) || 0,
      createdBy: 'admin',
      updatedBy: 'admin'
    }

    // If it's lifetime, set days to 999999
    if (planData.isLifetime) {
      planData.days = 999999
    }

    const newPlan = new PlanSetting(planData)
    await newPlan.save()

    console.log(`New plan created: ${newPlan.name} (${newPlan.days} days, $${newPlan.price})`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plan created successfully',
        plan: {
          id: newPlan._id,
          name: newPlan.name,
          days: newPlan.days,
          price: newPlan.price,
          points: newPlan.points,
          description: newPlan.description,
          isActive: newPlan.isActive,
          isLifetime: newPlan.isLifetime,
          sortOrder: newPlan.sortOrder,
          displayName: newPlan.displayName,
          pricePerDay: newPlan.getPricePerDay()
        }
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('Plan creation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Update plan setting
export async function PUT(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { planId, name, days, price, points, description, isActive, isLifetime, sortOrder } = await req.json()

    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Plan ID is required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    const plan = await PlanSetting.findById(planId)
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404 }
      )
    }

    // Check for duplicate names (excluding current plan)
    if (name && name.trim() !== plan.name) {
      const existingPlan = await PlanSetting.findOne({ 
        name: name.trim(),
        _id: { $ne: planId }
      })
      if (existingPlan) {
        return new Response(
          JSON.stringify({ error: 'A plan with this name already exists' }),
          { status: 400 }
        )
      }
    }

    // Update fields
    if (name !== undefined) plan.name = name.trim()
    if (days !== undefined) {
      if (days <= 0) {
        return new Response(
          JSON.stringify({ error: 'Days must be positive' }),
          { status: 400 }
        )
      }
      plan.days = parseInt(days)
    }
    if (price !== undefined) {
      if (price < 0) {
        return new Response(
          JSON.stringify({ error: 'Price cannot be negative' }),
          { status: 400 }
        )
      }
      plan.price = parseFloat(price)
    }
    if (points !== undefined) {
      if (points < 0) {
        return new Response(
          JSON.stringify({ error: 'Points cannot be negative' }),
          { status: 400 }
        )
      }
      plan.points = parseFloat(points)
    }
    if (description !== undefined) plan.description = description.trim()
    if (isActive !== undefined) plan.isActive = isActive
    if (isLifetime !== undefined) {
      plan.isLifetime = isLifetime
      if (isLifetime) {
        plan.days = 999999
      }
    }
    if (sortOrder !== undefined) plan.sortOrder = parseInt(sortOrder)
    
    plan.updatedBy = 'admin'

    await plan.save()

    console.log(`Plan updated: ${plan.name} (${plan.days} days, $${plan.price})`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plan updated successfully',
        plan: {
          id: plan._id,
          name: plan.name,
          days: plan.days,
          price: plan.price,
          points: plan.points,
          description: plan.description,
          isActive: plan.isActive,
          isLifetime: plan.isLifetime,
          sortOrder: plan.sortOrder,
          displayName: plan.displayName,
          pricePerDay: plan.getPricePerDay()
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Plan update error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Delete plan setting
export async function DELETE(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { planId } = await req.json()

    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Plan ID is required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    const plan = await PlanSetting.findById(planId)
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404 }
      )
    }

    await PlanSetting.findByIdAndDelete(planId)

    console.log(`Plan deleted: ${plan.name}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plan deleted successfully'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Plan deletion error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}