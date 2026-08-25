const express = require('express');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const User = require('../models/User');
const { sendEmail, sendEmailWithAttachment } = require('../utils/email');

const router = express.Router();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3
});

// Middleware to verify JWT and check if user is a Customer
const verifyCustomer = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided! Please login." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_booking_key_12345');
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token!" });
    }
};

// ----------------------------------------------------
// 1. HOLD A SEAT (The Core Concurrency Engine)
// ----------------------------------------------------
router.post('/hold', verifyCustomer, async (req, res) => {
    const { eventId, seatId } = req.body;
    const userId = req.user.userId;

    if (!eventId || !seatId) {
        return res.status(400).json({ message: "Event ID and Seat ID are required." });
    }

    try {
        // --- SECURITY: RATE LIMITING ---
        // Prevent bots from spamming the API (Max 1 request per second)
        const rateKey = `rate_limit:${userId}`;
        const canRequest = await redis.set(rateKey, 'locked', 'EX', 1, 'NX');
        if (!canRequest) {
            return res.status(429).json({ message: "Too many requests. Please slow down!" });
        }

        // --- SECURITY: ANTI-HOARDING ---
        // Increment a counter. If they have > 4 active holds for this event, block them.
        const hoardKey = `hoard:${eventId}:${userId}`;
        const activeHolds = await redis.incr(hoardKey);
        if (activeHolds === 1) {
            await redis.expire(hoardKey, 600); // Reset hoard counter after 10 mins
        }
        if (activeHolds > 4) {
            await redis.decr(hoardKey); // Reverse the increment
            return res.status(403).json({ message: "Anti-Hoarding: You cannot hold more than 4 seats at a time!" });
        }

        // Step 1: Check MongoDB to see if it's already permanently booked
        const existingBooking = await Booking.findOne({ eventId, seatId, status: 'BOOKED' });
        if (existingBooking) {
            return res.status(409).json({ message: "Seat is already completely booked!" });
        }

        // Step 2: The Atomic Redis Lock!
        // Key: hold:event123:A1
        // Value: user456
        // NX = Only set if it doesn't exist
        // EX 600 = Expire exactly in 10 minutes (600 seconds)
        const lockKey = `hold:${eventId}:${seatId}`;
        const isLocked = await redis.set(lockKey, userId, 'EX', 600, 'NX');

        if (!isLocked) {
            // Someone else clicked it milliseconds before you!
            return res.status(423).json({ message: "Someone else is currently holding this seat!" });
        }

        // Success! You got the lock.
        res.status(200).json({ 
            message: "Seat held successfully for 10 minutes!", 
            expiresInSeconds: 600 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during seat lock." });
    }
});

// ----------------------------------------------------
// 2. CONFIRM BOOKING (After Mock Payment Success)
// ----------------------------------------------------
router.post('/confirm', verifyCustomer, async (req, res) => {
    const { eventId, seatId, paymentStatus } = req.body;
    const userId = req.user.userId;
    const lockKey = `hold:${eventId}:${seatId}`;

    if (paymentStatus === 'FAILED') {
        // Instant Auto-Release! If payment fails, we don't wait 10 mins. We delete the lock instantly.
        await redis.del(lockKey);
        return res.status(400).json({ message: "Payment failed. Seat has been released back to the public." });
    }

    try {
        // Step 1: Verify they still own the Redis Lock!
        const currentLockOwner = await redis.get(lockKey);
        if (currentLockOwner !== userId) {
            return res.status(400).json({ message: "Your 10-minute hold expired or you don't own this seat!" });
        }

        // Step 2: Create the Permanent Booking in MongoDB
        const bookingRef = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const newBooking = await Booking.create({
            userId,
            eventId,
            seatId,
            status: 'BOOKED',
            bookingRef
        });

        // Step 3: Delete the temporary Redis lock (since it is now permanently in MongoDB)
        await redis.del(lockKey);

        // Step 4: Generate the QR Code (Base64 Image)
        const qrCodeDataUrl = await QRCode.toDataURL(bookingRef);

        // Step 5: Email the QR code using Nodemailer
        const user = await User.findById(userId);
        if (user && user.email) {
            const htmlContent = `
                <h2>Your Ticket is Confirmed!</h2>
                <p>Booking Reference: <strong>${bookingRef}</strong></p>
                <p>Please find your QR code attached.</p>
            `;
            await sendEmailWithAttachment(user.email, `Ticket Confirmation: ${bookingRef}`, htmlContent, `ticket_${bookingRef}.png`, qrCodeDataUrl);
            console.log(`🎟️ [EMAIL SENT] Sent Ticket ${bookingRef} to ${user.email}`);
        }

        res.status(200).json({ 
            message: "Booking confirmed!", 
            ticket: newBooking,
            qrCode: qrCodeDataUrl
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during booking confirmation." });
    }
});

// ----------------------------------------------------
// 3. CANCEL BOOKING & TRIGGER WAITLIST
// ----------------------------------------------------
router.post('/cancel', verifyCustomer, async (req, res) => {
    const { bookingId } = req.body;
    const userId = req.user.userId;

    try {
        // Step 1: Find and Cancel the Booking in MongoDB
        const booking = await Booking.findOneAndUpdate(
            { _id: bookingId, userId },
            { status: 'CANCELLED' },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: "Booking not found or not owned by you." });
        }

        // Step 2: Pop the top person from the Waitlist queue for this Event
        const nextInLine = await Waitlist.findOneAndUpdate(
            { eventId: booking.eventId, status: 'WAITING' },
            { status: 'OFFERED' },
            { sort: { joinedAt: 1 }, new: true } // sort: 1 means oldest (first in line) gets it
        ).populate('userId');

        if (nextInLine) {
            // Step 3: Create a 15-minute special Offer Token in Redis!
            const offerToken = Math.random().toString(36).substr(2, 10);
            const offerKey = `waitlist_offer:${offerToken}`;
            
            // EX 900 = 15 Minutes
            await redis.set(offerKey, JSON.stringify({
                waitlistId: nextInLine._id,
                userId: nextInLine.userId._id,
                seatId: booking.seatId
            }), 'EX', 900);

            // Step 4: Email the special 15-min checkout link to this user!
            const email = nextInLine.userId.email;
            if (email) {
                const checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?token=${offerToken}`;
                const htmlContent = `
                    <h2>Good News! A seat opened up!</h2>
                    <p>A seat (${booking.seatId}) is now available for the event you waitlisted for.</p>
                    <p>You have exactly <strong>15 minutes</strong> to claim it.</p>
                    <a href="${checkoutUrl}" style="padding:10px 20px; background:green; color:white; text-decoration:none;">Claim Seat Now</a>
                `;
                // Fire and forget email
                sendEmail(email, "Waitlist Offer: Claim your seat!", htmlContent).catch(console.error);
                console.log(`📧 [EMAIL SENT] Waitlist Offer sent to ${email} for Seat ${booking.seatId}`);
            }
        }

        res.status(200).json({ message: "Ticket cancelled successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during cancellation." });
    }
});

// ----------------------------------------------------
// 4. GET SEAT STATUS (Live Mongo + Redis Sync)
// ----------------------------------------------------
router.get('/status/:eventId', async (req, res) => {
    const { eventId } = req.params;
    try {
        // 1. Get permanently booked seats from MongoDB
        const bookings = await Booking.find({ eventId, status: 'BOOKED' });
        const bookedSeats = bookings.map(b => b.seatId);

        // 2. Get temporarily held seats from Redis
        const allKeys = await redis.keys(`hold:${eventId}:*`);
        const heldSeats = allKeys.map(key => key.split(':')[2]); // Extract seatId from "hold:eventId:seatId"

        res.status(200).json({ bookedSeats, heldSeats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch seat statuses." });
    }
});

module.exports = router;
