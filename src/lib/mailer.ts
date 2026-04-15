import nodemailer from 'nodemailer';
import { APP_NAME } from './featureFlags';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'mail.bats-consulting.com',
  port: Number(process.env.MAIL_PORT) || 465,
  secure: Number(process.env.MAIL_PORT) !== 587, // true untuk port 465 (SSL), false untuk 587 (STARTTLS)
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail: string, otp: string, name?: string) {
  const fromName = process.env.MAIL_FROM_NAME || APP_NAME;
  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: toEmail,
    subject: `Kode OTP Reset Kata Sandi - ${APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #0a5c42 0%, #1a9668 100%); padding: 32px 24px; text-align: center; }
          .header img { width: 80px; }
          .header h1 { color: #fff; font-size: 18px; margin: 12px 0 4px; }
          .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; }
          .body { padding: 32px 24px; }
          .otp-box { background: #f0faf5; border: 2px dashed #1a9668; border-radius: 12px; text-align: center; padding: 24px; margin: 24px 0; }
          .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #0a5c42; }
          .otp-note { font-size: 13px; color: #666; margin-top: 8px; }
          .footer { background: #f9f9f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #999; }
          p { color: #444; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${APP_NAME}</h1>
            <p>Jejak Karbon Perjalanan Ibadahmu</p>
          </div>
          <div class="body">
            <p>Halo${name ? ' <strong>' + name + '</strong>' : ''},</p>
            <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Gunakan kode OTP berikut:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="otp-note">Berlaku selama <strong>15 menit</strong></div>
            </div>
            <p>Jika Anda tidak meminta reset kata sandi, abaikan email ini. Akun Anda tetap aman.</p>
            <p style="font-size:13px; color:#999;">Kode ini bersifat rahasia. Jangan bagikan kepada siapapun.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${APP_NAME} · Email otomatis, jangan dibalas.
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
