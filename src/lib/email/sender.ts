import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface PayoutAlertDetails {
  userName: string;
  userEmail: string;
  method: 'wise' | 'paypal' | 'bank';
  payoutDetails: string;
  amount: number;
}

/**
 * Sends an email notification to the administrator when a payout is requested.
 * Logs to Firestore fallback if SMTP details are missing or fail.
 */
export async function sendAdminPayoutAlert(details: PayoutAlertDetails): Promise<void> {
  const adminEmail = 'gerkinkofficial@gmail.com';
  const subject = `💸 [ACTION REQUIRED] New Affiliate Payout Request - $${details.amount.toFixed(2)} USD`;
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

  const htmlBody = `
    <div style="font-family: 'Inter', sans-serif; background-color: #07090e; color: #f3f4f6; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
      <h2 style="color: #ff6b6b; font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 12px;">
        New Affiliate Payout Request
      </h2>
      
      <p style="font-size: 16px; line-height: 1.6;">
        A new affiliate commission payout has been requested and requires manual processing.
      </p>

      <div style="background-color: #0d1117; padding: 20px; border-radius: 8px; border: 1px solid #21262d; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #58a6ff; font-size: 18px;">Affiliate Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e; width: 140px;">Name:</td>
            <td style="padding: 6px 0; color: #c9d1d9;">${details.userName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e;">Email:</td>
            <td style="padding: 6px 0; color: #c9d1d9;">${details.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e;">Date Requested:</td>
            <td style="padding: 6px 0; color: #c9d1d9;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e;">Amount:</td>
            <td style="padding: 6px 0; color: #238636; font-weight: bold;">$${details.amount.toFixed(2)} USD</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #0d1117; padding: 20px; border-radius: 8px; border: 1px solid #21262d; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #58a6ff; font-size: 18px;">Payout Preference</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e; width: 140px;">Method:</td>
            <td style="padding: 6px 0; color: #c9d1d9; text-transform: uppercase; font-weight: bold;">${details.method}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #8b949e; vertical-align: top;">Details:</td>
            <td style="padding: 6px 0; color: #c9d1d9; white-space: pre-wrap; font-family: monospace;">${details.payoutDetails}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #161b22; padding: 16px; border-radius: 8px; border-left: 4px solid #d29922; margin-top: 32px;">
        <p style="margin: 0; font-size: 14px; color: #c9d1d9;">
          <strong>Action Required:</strong> Log in to your <strong>Wise Business account</strong>, choose send money, select email or bank transfer, and process a transfer of exactly <strong>$100.00 USD</strong> using the details above. Under the user agreement, the transfer fees will be deducted from this balance.
        </p>
      </div>
      
      <p style="font-size: 12px; color: #8b949e; margin-top: 32px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
        Sent automatically by GERKINK Referral System.
      </p>
    </div>
  `;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  // Symmetrical fallback if SMTP credentials are not set up or configured
  if (!user || !pass || !host) {
    console.warn('SMTP Credentials missing. Writing alert payload to Firestore "system_emails" collection...');
    await adminDb.collection('system_emails').add({
      to: adminEmail,
      subject,
      html: htmlBody,
      status: 'pending_smtp_config',
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"GERKINK Referrals" <${user}>`,
      to: adminEmail,
      subject,
      html: htmlBody,
    });

    console.log(`Alert email successfully sent to ${adminEmail}`);

    // Log to Firestore for audit purposes
    await adminDb.collection('system_emails').add({
      to: adminEmail,
      subject,
      status: 'sent',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    console.error('Failed to send SMTP email. Writing to fallback log database:', err.message);
    await adminDb.collection('system_emails').add({
      to: adminEmail,
      subject,
      html: htmlBody,
      status: 'failed_smtp_delivery',
      errorMessage: err.message,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
