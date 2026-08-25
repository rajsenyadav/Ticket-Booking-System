const express = require('express');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

const router = express.Router();
// Create Redis client (assumes REDIS_URL is in .env)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ----------------------------------------------------
// 1. Send OTP (Passwordless Login)
// ----------------------------------------------------
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Generate a 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // Save to Redis with a 5-minute (300 seconds) Expiry!
        await redis.set(`otp:${email}`, otpCode, 'EX', 300);

        // Send real email using Nodemailer
        const htmlContent = `
            <h2>Your Login OTP</h2>
            <p>Your one-time password to login is: <strong>${otpCode}</strong></p>
            <p>This code will expire in 5 minutes.</p>
        `;
        await sendEmail(email, "Your Ticket System OTP", htmlContent);
        console.log(`📧 [EMAIL SENT] OTP ${otpCode} sent to ${email}`);

        res.status(200).json({ message: "OTP sent successfully to email (check console for now)" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to generate OTP" });
    }
});

// ----------------------------------------------------
// 2. Verify OTP (Creates Account & Logs In)
// ----------------------------------------------------
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Check Redis for the OTP
        const savedOtp = await redis.get(`otp:${email}`);

        if (!savedOtp || savedOtp !== otp) {
            return res.status(401).json({ message: "Invalid or expired OTP!" });
        }

        // OTP is correct! Delete it from Redis so it can't be reused
        await redis.del(`otp:${email}`);

        // Find user in MongoDB. If they don't exist, create them!
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, role: 'Customer' });
            console.log("🆕 New User Account created!");
        }

        // Generate the JWT "ID Badge"
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '30d' } // Stay logged in for 30 days
        );

        res.status(200).json({ token, user: { email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during verification" });
    }
});

// ----------------------------------------------------
// 3. Demo Login (Instant One-Click)
// ----------------------------------------------------
router.post('/demo-login', async (req, res) => {
    const { role } = req.body; // e.g., 'Organiser', 'Customer', 'Admin'
    
    // Find a user with this role, or create a dummy one
    let user = await User.findOne({ role });
    if (!user) {
        user = await User.create({ 
            email: `demo_${role.toLowerCase()}@demo.com`, 
            role: role 
        });
    }

    // Instantly give them a token
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '1d' }
    );

    res.status(200).json({ 
        message: `Logged in as Demo ${role}`,
        token, 
        user: { email: user.email, role: user.role } 
    });
});

module.exports = router;
