export interface HajjPeriod {
  year: number;
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
}

export interface HajjPeriodCheckResult {
  canRegister: boolean;
  period: HajjPeriod | null;
  message: string;
}

/**
 * Check if user can register for Hajj journey based on current date
 * @returns Promise with registration status and message
 */
export async function checkHajjPeriod(): Promise<HajjPeriodCheckResult> {
  try {
    const response = await fetch('/api/hajj-periods/current', {
      method: 'GET',
      cache: 'no-store' // Always get fresh data
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hajj period');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking hajj period:', error);
    return {
      canRegister: false,
      period: null,
      message: 'Tidak dapat memeriksa periode Haji saat ini. Silakan coba lagi.'
    };
  }
}

/**
 * Check if user can register for Hajj journey - Server-side version
 * Use this in Server Components
 */
export async function checkHajjPeriodServer(): Promise<HajjPeriodCheckResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/hajj-periods/current`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hajj period');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking hajj period:', error);
    return {
      canRegister: false,
      period: null,
      message: 'Tidak dapat memeriksa periode Haji saat ini. Silakan coba lagi.'
    };
  }
}
