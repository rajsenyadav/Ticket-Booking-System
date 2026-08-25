const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT and check if user is an Organiser
const verifyOrganiser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_booking_key_12345');
        if (decoded.role !== 'Organiser') {
            return res.status(403).json({ message: "Only Organisers can create events!" });
        }
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token!" });
    }
};

// ----------------------------------------------------
// 1. Create a New Event (Organisers Only)
// ----------------------------------------------------
router.post('/', verifyOrganiser, async (req, res) => {
    try {
        const { title, description, date, venueName, bannerImageUrl, rows, cols, basePrice } = req.body;

        const newEvent = await Event.create({
            title,
            description,
            date,
            venueName,
            bannerImageUrl,
            venueLayout: { rows, cols },
            basePrice,
            organiserId: req.user.userId
        });

        res.status(201).json({ message: "Event created successfully!", event: newEvent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create event" });
    }
});

// ----------------------------------------------------
// 2. Get Organiser Analytics (My Stats)
// ----------------------------------------------------
router.get('/analytics/my-stats', verifyOrganiser, async (req, res) => {
    try {
        const organiserId = new mongoose.Types.ObjectId(req.user.userId);

        // Calculate Revenue and Tickets Sold for this Organiser's events
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
            { $match: { 'eventDetails.organiserId': organiserId } },
            {
                $group: {
                    _id: null,
                    totalTicketsSold: { $sum: 1 },
                    totalRevenue: { $sum: '$eventDetails.basePrice' }
                }
            }
        ]);

        const stats = revenueStats[0] || { totalTicketsSold: 0, totalRevenue: 0 };

        // Calculate Waitlist Demand for this Organiser's events
        const waitlistStats = await Waitlist.aggregate([
            { $match: { status: 'WAITING' } },
            {
                $lookup: {
                    from: 'events',
                    localField: 'eventId',
                    foreignField: '_id',
                    as: 'eventDetails'
                }
            },
            { $unwind: '$eventDetails' },
            { $match: { 'eventDetails.organiserId': organiserId } },
            {
                $group: {
                    _id: null,
                    totalWaitlisted: { $sum: 1 }
                }
            }
        ]);

        const waitlistDemand = waitlistStats[0]?.totalWaitlisted || 0;

        res.status(200).json({
            totalRevenue: stats.totalRevenue,
            totalTicketsSold: stats.totalTicketsSold,
            waitlistDemand
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch analytics" });
    }
});

// ----------------------------------------------------
// 3. Get All Events (Public - For Event Catalog)
// ----------------------------------------------------
router.get('/', async (req, res) => {
    try {
        // Only return events where the date is greater than or equal to right now (hides past events)
        const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch events" });
    }
});

// ----------------------------------------------------
// 4. Get Single Event Details (Public - For Seat Map Page)
// ----------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        
        res.status(200).json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch event" });
    }
});

module.exports = router;
