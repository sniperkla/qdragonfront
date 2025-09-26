import { connectToDatabase } from '@/lib/mongodb';
import CustomerAccount from '@/lib/customerAccountModel';

// Get all customer accounts (admin only)
export async function GET(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value;
    if (adminSession !== 'authenticated') {
      return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const user = searchParams.get('user');

    await connectToDatabase();

    let query = {};
    
    if (user) {
      query.user = { $regex: user, $options: 'i' };
    }
    
    if (status !== 'all') {
      query.status = status;
    }

    const customerAccounts = await CustomerAccount.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    // Check for expired accounts and update status
    const now = new Date();
    const expiredAccounts = [];
    
    for (const account of customerAccounts) {
      const expireDate = new Date(account.expireDate);
      if (expireDate < now && account.status === 'valid') {
        account.status = 'expired';
        await account.save();
        expiredAccounts.push(account.license);
      }
    }

    if (expiredAccounts.length > 0) {
      console.log(`Updated ${expiredAccounts.length} expired accounts:`, expiredAccounts);
    }

    return new Response(JSON.stringify({
      success: true,
      total: customerAccounts.length,
      accounts: customerAccounts
    }), { status: 200 });

  } catch (error) {
    console.error('Admin customer accounts fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// Update customer account status (admin only)
export async function PUT(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value;
    if (adminSession !== 'authenticated') {
      return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 });
    }

    const { accountId, status, expireDate } = await req.json();

    if (!accountId || !status) {
      return new Response(JSON.stringify({ error: 'Account ID and status are required' }), { status: 400 });
    }

    await connectToDatabase();

    const updateData = { status };
    
    if (expireDate) {
      updateData.expireDate = expireDate;
    }

    const customerAccount = await CustomerAccount.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true }
    );

    if (!customerAccount) {
      return new Response(JSON.stringify({ error: 'Customer account not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Customer account status updated successfully',
      account: customerAccount
    }), { status: 200 });

  } catch (error) {
    console.error('Admin customer account update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// Delete customer account (admin only)
export async function DELETE(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value;
    if (adminSession !== 'authenticated') {
      return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 });
    }

    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Account ID is required' }), { status: 400 });
    }

    await connectToDatabase();

    const deletedAccount = await CustomerAccount.findByIdAndDelete(accountId);

    if (!deletedAccount) {
      return new Response(JSON.stringify({ error: 'Customer account not found' }), { status: 404 });
    }

    // Also delete associated code request if exists
    try {
      const CodeRequest = (await import('@/lib/codeRequestModel')).default;
      await CodeRequest.deleteOne({ code: deletedAccount.license });
    } catch (codeError) {
      console.error('Error deleting associated code request:', codeError);
      // Don't fail the main request if code request deletion fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Customer account deleted successfully',
      account: deletedAccount
    }), { status: 200 });

  } catch (error) {
    console.error('Admin customer account delete error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}