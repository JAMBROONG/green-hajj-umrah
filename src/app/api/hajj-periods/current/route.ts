import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Find hajj period for current year
    const hajjPeriod = await prisma.hajj_periods.findFirst({
      where: {
        year: currentYear,
        is_active: true
      }
    });

    if (!hajjPeriod) {
      return NextResponse.json({
        canRegister: false,
        period: null,
        message: `Data periode Haji ${currentYear} belum tersedia. Silakan hubungi administrator.`
      });
    }

    const registrationOpen = new Date(hajjPeriod.registration_open_date);
    const registrationClose = new Date(hajjPeriod.registration_close_date);

    // Check if today is within registration period
    const canRegister = today >= registrationOpen && today <= registrationClose;

    let message = '';
    if (!canRegister) {
      if (today < registrationOpen) {
        message = `Pendaftaran Haji ${currentYear} akan dibuka pada ${registrationOpen.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}`;
      } else {
        message = `Periode pendaftaran Haji ${currentYear} telah ditutup pada ${registrationClose.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}`;
      }
    } else {
      message = `Pendaftaran Haji ${currentYear} sedang dibuka hingga ${registrationClose.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`;
    }

    return NextResponse.json({
      canRegister,
      period: {
        year: hajjPeriod.year,
        startDate: hajjPeriod.start_date,
        endDate: hajjPeriod.end_date,
        registrationOpenDate: hajjPeriod.registration_open_date,
        registrationCloseDate: hajjPeriod.registration_close_date
      },
      message
    });

  } catch (error) {
    console.error('Error checking hajj period:', error);
    return NextResponse.json(
      { 
        canRegister: false, 
        period: null,
        message: 'Terjadi kesalahan saat memeriksa periode Haji. Silakan coba lagi.' 
      },
      { status: 500 }
    );
  }
}
