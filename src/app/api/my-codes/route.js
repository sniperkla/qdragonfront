import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CodeRequest from '@/lib/codeRequestModel';

// Get user's code requests
export async function GET(req) {
  try {
    const authData = verifyAuth(req);
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }

    await connectToDatabase();

    const codes = await CodeRequest.find({ userId: authData.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    return new Response(JSON.stringify({
      success: true,
      codes
    }), { status: 200 });

  } catch (error) {
    console.error('Error fetching codes:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// Update payment status (for webhooks or manual updates)
export async function PUT(req) {
  try {
    const authData = verifyAuth(req);
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }

    const { codeId, status, paymentId, paymentMethod } = await req.json();

    if (!codeId || !status) {
      return new Response(JSON.stringify({ error: 'Code ID and status are required' }), { status: 400 });
    }

    await connectToDatabase();

    const updateData = {
      status,
      ...(paymentId && { paymentId }),
      ...(paymentMethod && { paymentMethod })
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    if (status === 'activated') {
      updateData.activatedAt = new Date();
      updateData.isActive = true;
    }

    const codeRequest = await CodeRequest.findOneAndUpdate(
      { _id: codeId, userId: authData.id },
      updateData,
      { new: true }
    );

    if (!codeRequest) {
      return new Response(JSON.stringify({ error: 'Code not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Code status updated successfully',
      code: codeRequest
    }), { status: 200 });

  } catch (error) {
    console.error('Error updating code status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}