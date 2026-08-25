const express = require('express');
const Waitlist = require('../models/Waitlist');
const jwt = require('jsonwebtoken');

const router = express.Router();

const verifyCustomer = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token provided!" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_booking_key_12345');
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token!" });
    }
};

// ----------------------------------------------------
// 1. JOIN THE WAITLIST
// ----------------------------------------------------
router.post('/join', verifyCustomer, async (req, res) => {
    const { eventId } = req.body;
    const userId = req.user.userId;

    try {
        // Check if they are already on the waitlist
        const existing = await Waitlist.findOne({ eventId, userId, status: 'WAITING' });
        if (existing) {
            return res.status(400).json({ message: "You are already on the waitlist for this event!" });
        }

        const waitlistEntry = await Waitlist.create({ eventId, userId, status: 'WAITING' });
        
        res.status(201).json({ 
            message: "Successfully joined the waitlist! We will email you if a seat opens up.",
            entry: waitlistEntry
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to join waitlist" });
    }
});

module.exports = router;
