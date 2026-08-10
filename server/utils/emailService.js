const nodemailer = require('nodemailer');

/**
 * Creates an SMTP transporter if environment variables are defined.
 */
function createTransporter() {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!host || !user || !pass) {
        return null; // SMTP credentials not set
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user,
            pass,
        },
    });
}

/**
 * Sends an email notification when a payment is recorded for a friend.
 * Returns { success: boolean, message: string }
 */
async function sendPaymentNotificationEmail({ toEmail, friendName, payerName, amount, description, date }) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.log('[EmailService] SMTP credentials not configured. Skipping live email send.');
            return {
                success: false,
                message: 'SMTP credentials not configured.',
            };
        }

        const dateFormatted = date
            ? new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@paperless.app';

        const mailOptions = {
            from: `"Paperless" <${fromAddress}>`,
            to: toEmail,
            subject: 'Paperless — Payment Made on Your Behalf',
            text: `Hi ${friendName},

${payerName} paid ₹${amount} on your behalf.

Details:
Description: ${description || 'N/A'}
Date: ${dateFormatted}
Amount: ₹${amount}

Please settle ₹${amount} with ${payerName}.

— Paperless`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #4f46e5; margin-top: 0;">Paperless</h2>
                    <p style="font-size: 16px; color: #1e293b;">Hi <strong>${friendName}</strong>,</p>
                    <p style="font-size: 15px; color: #334155; line-height: 1.5;">
                        <strong>${payerName}</strong> paid <strong>₹${amount}</strong> on your behalf.
                    </p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Description:</strong> ${description || 'N/A'}</p>
                        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Date:</strong> ${dateFormatted}</p>
                        <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Amount:</strong> ₹${amount}</p>
                    </div>
                    <p style="font-size: 15px; color: #334155;">
                        Please settle <strong>₹${amount}</strong> with ${payerName}.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent via Paperless expense manager</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('[EmailService] Email sending error:', err.message);
        return { success: false, message: err.message };
    }
}

module.exports = {
    sendPaymentNotificationEmail,
};
