import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface TenantPaymentConfig {
  id: string;
  tenant_id: string;
  midtrans_server_key: string | null;
  midtrans_merchant_id: string | null;
  midtrans_client_key?: string | null;
  is_production?: boolean;
  enabled?: boolean;
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('❌ No session or email')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('👤 User email:', session.user.email)

    // Get user profile to get tenant_id
    const profile = await prisma.profiles.findUnique({
      where: { email: session.user.email },
      include: { tenant: true }
    });

    console.log('📋 Profile found:', !!profile, 'Tenant ID:', profile?.tenant_id)

    if (!profile?.tenant_id) {
      console.log('❌ No tenant_id found for user')
      return NextResponse.json(
        { success: false, error: 'No tenant found' },
        { status: 400 }
      );
    }

    // Check if TenantPaymentConfig exists using Prisma (not raw query)
    const paymentConfig = await prisma.tenantPaymentConfig.findUnique({
      where: { tenant_id: profile.tenant_id }
    })

    console.log('💳 Payment config found:', !!paymentConfig)
    console.log('🔐 Client key:', paymentConfig?.midtrans_client_key ? 'SET' : 'MISSING')
    console.log('🔑 Server key:', paymentConfig?.midtrans_server_key ? 'SET' : 'MISSING')

    if (!paymentConfig || !paymentConfig.midtrans_server_key || !paymentConfig.midtrans_client_key) {
      console.log('❌ Payment config incomplete')
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Payment configuration not found'
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      message: 'Payment configuration found',
      clientKey: paymentConfig.midtrans_client_key,
      isProduction: paymentConfig.is_production === true,
    });

  } catch (error) {
    console.error('❌ Error checking payment config:', error);
    const errorMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check payment configuration',
        details: errorMsg
      },
      { status: 500 }
    );
  }
}
