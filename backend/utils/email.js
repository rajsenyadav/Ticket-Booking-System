const { Resend } = require('resend');

// Using Resend's HTTP API instead of SMTP (Nodemailer/Gmail)
// Reason: Render's free tier blocks outbound SMTP ports (465, 587),
// so we use Resend's HTTP-based API which bypasses this restriction.
const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER = 'Ticket System <onboarding@resend.dev>';

// Utility to send simple text/HTML emails via HTTP API
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const htmlWithFooter = `
            ${htmlContent}
            <hr style="margin-top:30px; border:none; border-top:1px solid #eee;">
            <p style="font-size:11px; color:#999; margin-top:10px;">
                📡 Delivered via HTTP API (Resend) — SMTP is blocked on Render's free tier.
            </p>
        `;

        await resend.emails.send({
            from: SENDER,
            to: [to],
            subject,
            html: htmlWithFooter
        });
        console.log(`✅ Email sent successfully to ${to} (via Resend HTTP API)`);
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error.message);
        // Email failure is non-fatal — OTP is still logged in console
    }
};

// Utility to send email with an attachment (like a QR code image) via HTTP API
const sendEmailWithAttachment = async (to, subject, htmlContent, attachmentName, base64DataUrl) => {
    try {
        // Strip the data:image/png;base64, part if present
        const base64Data = base64DataUrl.split(';base64,').pop();

        const htmlWithFooter = `
            ${htmlContent}
            <hr style="margin-top:30px; border:none; border-top:1px solid #eee;">
            <p style="font-size:11px; color:#999; margin-top:10px;">
                📡 Delivered via HTTP API (Resend) — SMTP is blocked on Render's free tier.
            </p>
        `;

        await resend.emails.send({
            from: SENDER,
            to: [to],
            subject,
            html: htmlWithFooter,
            attachments: [
                {
                    filename: attachmentName,
                    content: base64Data // Resend accepts base64 strings directly
                }
            ]
        });
        console.log(`✅ Email with attachment sent to ${to} (via Resend HTTP API)`);
    } catch (error) {
        console.error(`❌ Error sending attachment email to ${to}:`, error.message);
        // Email failure is non-fatal — QR code is still shown on screen
    }
};

module.exports = { sendEmail, sendEmailWithAttachment };
