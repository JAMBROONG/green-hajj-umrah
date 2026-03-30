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
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to get tenant_id
    const profile = await prisma.profiles.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    });

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'No tenant found' },
        { status: 400 }
      );
    }

    // Check if TenantPaymentConfig exists using raw query
    const paymentConfigs = await prisma.$queryRaw<TenantPaymentConfig[]>`
      SELECT * FROM "TenantPaymentConfig" WHERE tenant_id = ${profile.tenant_id}
    `;

    const paymentConfig = paymentConfigs[0];

    if (!paymentConfig || !paymentConfig.midtrans_server_key || !paymentConfig.midtrans_merchant_id) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Payment configuration not found'
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      message: 'Payment configuration found'
    });

  } catch (error) {
    console.error('Error checking payment config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check payment configuration'
      },
      { status: 500 }
    );
  }
}
