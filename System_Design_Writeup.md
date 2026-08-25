# Ticket Booking System: System Design & Architecture Write-up

## Introduction
The Ticket Booking System is designed to handle high-demand, high-concurrency ticket sales for popular events. Built on the MERN stack (MongoDB, Express, React, Node.js) and supercharged by Redis, the architecture prioritizes data integrity, prevention of double-bookings, and automated queue management. This document outlines the core mechanisms that guarantee a seamless, race-condition-free user experience.

## 1. Concurrency Prevention (The Double-Booking Problem)
In a traditional relational database setup, if two users attempt to book the same seat (e.g., Seat A1) at the exact same millisecond, both requests might read the seat as "available" before either transaction commits, resulting in a double-booking. 

To solve this, our system introduces **Redis** as an in-memory concurrency engine to intercept checkout requests before they ever reach MongoDB. We utilize the Redis `SET` command with the `NX` (Not eXists) flag. 

When a user clicks a seat, the Node.js backend executes:
`await redis.set('hold:eventId:seatId', userId, 'EX', 600, 'NX')`

Because Redis is strictly single-threaded, it processes incoming commands one by one at lightning speed. The `NX` flag guarantees that the key is only created if it does not already exist. Therefore, even if 10,000 users request the exact same seat simultaneously, Redis natively ensures that only the very first request succeeds. The winning user is granted the lock, while the remaining 9,999 requests receive an immediate HTTP 409 Conflict response, completely eliminating race conditions.

## 2. Seat Hold and TTL (Time-To-Live) Mechanism
Once a user successfully secures a seat lock, they are placed into a checkout flow. However, to prevent malicious users (or abandoned browser tabs) from hoarding tickets, the system enforces a strict time limit on unpurchased seats.

This is achieved using the Redis `EX` (Expire) flag set to `600` seconds (10 minutes). This Time-To-Live (TTL) mechanism is handled entirely natively by the Redis engine. 
- If the user completes the payment within 10 minutes, the backend validates the transaction, writes a permanent `Booking` document to MongoDB, and manually deletes the Redis lock.
- If the user abandons the checkout, the Redis TTL expires, and the key automatically vanishes from memory. The frontend, which polls the backend for seat status, instantly reflects the seat as available again.

By offloading expiration logic to Redis, the Node.js backend is freed from having to run expensive background cron jobs or `setInterval` loops to clean up stale shopping carts.

## 3. Waitlist Auto-Assignment Flow
When an event's capacity reaches 100%, the frontend dynamically swaps the checkout interface for a "Join Waitlist" workflow. Users are inserted into a MongoDB `Waitlist` collection with their `userId`, `eventId`, and a `joinedAt` timestamp.

The system handles reallocation automatically without human intervention. When a user cancels a purchased ticket, a database trigger (or API handler) immediately initiates the reallocation logic:
1. The system queries the `Waitlist` collection for the specific event.
2. The query uses `.sort({ joinedAt: 1 })` to isolate the oldest entry (First-In, First-Out).
3. The system updates that specific waitlist document's status from `WAITING` to `OFFERED`.

## 4. Time-Limited Offer Handling
Once a waitlisted user is selected for reallocation, they must be given a fair but strictly limited window to claim their ticket.

The backend generates a secure, randomized cryptographic token. This token is stored in Redis mapped to the user's ID, utilizing a TTL of `EX 900` (15 minutes). 

Simultaneously, the Node.js backend utilizes `Nodemailer` to dispatch a real-time email to the user, containing a unique, tokenized checkout link. 
- If the user clicks the link and completes the checkout within 15 minutes, the token is verified against Redis, the booking is permanently saved in MongoDB, and the Waitlist entry is marked as resolved.
- If the user ignores the email, the Redis TTL silently drops the token after 15 minutes. The system's subsequent check recognizes the expired offer and automatically rotates the opportunity to the next chronologically sorted user in the MongoDB Waitlist collection.

## Conclusion
By utilizing MongoDB for persistent, relational data mapping and Redis for ephemeral, high-speed atomic locks, this architecture successfully mitigates the bottlenecks of live ticketing. It prevents race conditions, auto-heals abandoned carts via TTL, and manages sold-out queue friction automatically, resulting in a production-ready system capable of handling enterprise-level traffic spikes.
