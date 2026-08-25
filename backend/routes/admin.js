const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');

const router = express.Router();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3
});

// Middleware to verify JWT and check if user is an Admin
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_booking_key_12345');
        if (decoded.role !== 'Admin') {
            return res.status(403).json({ message: "Access Denied: Admins Only!" });
        }
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token!" });
    }
};

// ----------------------------------------------------
// 1. Get Platform Stats (God Mode)
// ----------------------------------------------------
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        // 1. Calculate Total Platform Revenue and Total Tickets Sold
        const revenueStats = await Booking.aggregate([
            { $match: { status: 'BOOKED' } },
            {
                $lookup: {
                    from: 'events',
                    localField: 'eventId',
                    foreignField: '_id',
                    as: 'eventDetails'
                }
            },
            { $unwind: '$eventDetails' },
            {
                $group: {
                    _id: null,
                    totalTicketsSold: { $sum: 1 },
                    totalRevenue: { $sum: '$eventDetails.basePrice' }
                }
            }
        ]);

        const stats = revenueStats[0] || { totalTicketsSold: 0, totalRevenue: 0 };

        // 2. Count Total Users
        const totalUsers = await User.countDocuments();

        // 3. Count Total Active Events
        const activeEvents = await Event.countDocuments({ date: { $gte: new Date() } });

        // 4. Live System Health (Redis check for currently held seats)
        const allHoldKeys = await redis.keys('hold:*');
        const liveTrafficHolds = allHoldKeys.length;

        res.status(200).json({
            totalRevenue: stats.totalRevenue,
            totalTicketsSold: stats.totalTicketsSold,
            totalUsers,
            activeEvents,
            liveTrafficHolds
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch admin stats" });
    }
});

// ----------------------------------------------------
// 2. Get All Organisers Directory
// ----------------------------------------------------
router.get('/organisers', verifyAdmin, async (req, res) => {
    try {
        const organisers = await User.aggregate([
            { $match: { role: 'Organiser' } },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: 'organiserId',
                    as: 'events'
                }
            },
            {
                $project: {
                    email: 1,
                    createdAt: 1,
                    totalEventsHosted: { $size: '$events' }
                }
            }
        ]);

        res.status(200).json(organisers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch organisers directory" });
    }
});

// ----------------------------------------------------
// 3. Get All Events
// ----------------------------------------------------
router.get('/events', verifyAdmin, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch events" });
    }
});

// ----------------------------------------------------
// 4. DANGER: Delete Event (Cascading)
// ----------------------------------------------------
router.delete('/event/:id', verifyAdmin, async (req, res) => {
    try {
        const eventId = req.params.id;
        
        await Event.findByIdAndDelete(eventId);
        await Booking.deleteMany({ eventId });
        await Waitlist.deleteMany({ eventId });
        
        const keys = await redis.keys(`hold:${eventId}:*`);
        if (keys.length > 0) await redis.del(...keys);

        res.status(200).json({ message: "Event, bookings, and waitlists permanently wiped!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete event" });
    }
});

// ----------------------------------------------------
// 5. DANGER: Delete User (Cascading)
// ----------------------------------------------------
router.delete('/user/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 1. Delete User Account
        await User.findByIdAndDelete(userId);
        
        // 2. Delete all their personal tickets/waitlists
        await Booking.deleteMany({ userId });
        await Waitlist.deleteMany({ userId });

        // 3. If Organiser, delete all their events and those events' tickets!
        if (user.role === 'Organiser') {
            const events = await Event.find({ organiserId: userId });
            for (let ev of events) {
                await Booking.deleteMany({ eventId: ev._id });
                await Waitlist.deleteMany({ eventId: ev._id });
                const keys = await redis.keys(`hold:${ev._id}:*`);
                if (keys.length > 0) await redis.del(...keys);
            }
            await Event.deleteMany({ organiserId: userId });
        }

        res.status(200).json({ message: "User and all related history completely wiped!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

module.exports = router;
