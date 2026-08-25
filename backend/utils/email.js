const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use STARTTLS instead of SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Needs an App Password if using Gmail
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
});

// Utility to send simple text/HTML emails
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"Ticket System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error.message);
        // Email failure is non-fatal — OTP is still logged in console
    }
};

// Utility to send email with an attachment (like a QR code image)
const sendEmailWithAttachment = async (to, subject, htmlContent, attachmentName, base64DataUrl) => {
    try {
        // Strip the data:image/png;base64, part if present
        const base64Data = base64DataUrl.split(';base64,').pop();
        
        const mailOptions = {
            from: `"Ticket System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
            attachments: [
                {
                    filename: attachmentName,
                    content: base64Data,
                    encoding: 'base64'
                }
            ]
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email with attachment sent to ${to}`);
    } catch (error) {
        console.error(`❌ Error sending attachment email to ${to}:`, error.message);
        // Email failure is non-fatal — QR code is still shown on screen
    }
};

module.exports = { sendEmail, sendEmailWithAttachment };
