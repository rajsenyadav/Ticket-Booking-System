# MERN-Redis Ticket Booking System

A high-performance ticket booking system designed to handle high concurrency, prevent double-bookings, and manage ticket hoarding through an atomic Redis locking mechanism. Built with the MERN stack (MongoDB, Express, React, Node.js) and Redis.

## 🏛️ System Architecture

This application uses a hybrid storage approach to ensure maximum performance and data integrity:

- **Frontend (Client):** React.js built with Vite, styled with Tailwind CSS. Communicates securely via JWT-authenticated Axios requests.
- **Backend (API):** Node.js & Express.js. Acts as the orchestrator for authentication, transaction locking, and database reads/writes.
- **Persistent Storage (MongoDB):** The single source of truth for Users, Events, permanent Bookings, and Waitlist queues.
- **Concurrency Engine (Redis):** In-memory data store used specifically for **Atomic Locks** (`SET NX EX`). When thousands of users click a seat simultaneously, Redis guarantees only one request succeeds, temporarily locking the seat for 10 minutes during checkout.
- **Email Delivery:** Nodemailer handles SMTP delivery for OTP verification and automated e-ticket dispatch (with generated QR code attachments).

## 📂 Folder Structure

```text
Ticket Booking System/
│
├── backend/                  # Node.js Express Backend
│   ├── models/               # Mongoose DB Schemas (User, Event, Booking, Waitlist)
│   ├── routes/               # API Endpoints (auth, booking, events, admin, waitlist)
│   ├── utils/                # Helper functions (email.js for Nodemailer & QR codes)
│   ├── server.js             # Entry point, Middleware, & Database connections
│   └── .env                  # Backend Secrets (Mongo URI, Redis URL, SMTP Credentials)
│
├── frontend/                 # React.js Frontend (Vite)
│   ├── src/
    │   ├── api/              # Axios instance with automatic JWT Header attachment
    │   ├── components/       # Reusable UI components (Navbar)
    │   ├── pages/            # View Controllers (Catalog, SeatMap, Organiser, Admin, Login)
│   ├── App.jsx           # React Router configuration
│   └── index.css         # Global Tailwind styles & Custom Animations
└── package.json          # Frontend dependencies
```

## 🚀 Setup Guide

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)
- Redis server (Local or Upstash)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the backend server:
   ```bash
   npm run start
   # or
   node server.js
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5173`.

## ⚙️ Environment Variables (`.env.example`)

A sample `.env.example` file is provided in the `backend` directory.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ticket_booking
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=super_secret_booking_key_12345

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password


```

## 🏗️ Database Schema (MongoDB)

### User
- `email` (String, required, unique)
- `role` (String, enum: ['Organiser', 'Customer', 'Admin'], default: 'Customer')

### Event
- `title` (String, required)
- `description` (String)
- `date` (Date, required)
- `venueName` (String, required)
- `bannerImageUrl` (String)
- `venueLayout` (Object: `{ rows: Number, cols: Number }`)
- `basePrice` (Number, required)
- `organiserId` (ObjectId, ref: 'User')

### Booking
- `userId` (ObjectId, ref: 'User')
- `eventId` (ObjectId, ref: 'Event')
- `seatId` (String, required)
- `status` (String, enum: ['BOOKED', 'CANCELLED'], default: 'BOOKED')
- `bookingRef` (String, unique)

### Waitlist
- `eventId` (ObjectId, ref: 'Event')
- `userId` (ObjectId, ref: 'User')
- `joinedAt` (Date, default: Date.now)
- `status` (String, enum: ['WAITING', 'OFFERED'], default: 'WAITING')

## 🌐 API Documentation

### Auth Endpoints
- `POST /api/auth/send-otp` - Send login OTP to email (Uses real Nodemailer).
- `POST /api/auth/verify-otp` - Verify OTP and receive JWT.
- `POST /api/auth/demo-login` - Instant one-click login for 'Organiser', 'Customer', or 'Admin'.

### Event Endpoints
- `GET /api/events` - Get all upcoming events (Public).
- `GET /api/events/:id` - Get specific event details (Public).
- `POST /api/events` - Create an event (Requires Organiser JWT).
- `GET /api/events/analytics/my-stats` - Get organiser's revenue and waitlist stats (Requires Organiser JWT).

### Admin Endpoints (God Mode)
- `GET /api/admin/stats` - Get platform-wide revenue and live health stats (Requires Admin JWT).
- `GET /api/admin/organisers` - Get directory of all organisers (Requires Admin JWT).
- `GET /api/admin/events` - Get all events (Requires Admin JWT).
- `DELETE /api/admin/user/:id` - Cascade delete a user and their history (Requires Admin JWT).
- `DELETE /api/admin/event/:id` - Cascade delete an event and its history (Requires Admin JWT).

### Booking Endpoints
- `GET /api/book/status/:eventId` - Get list of permanently booked (Mongo) and temporarily held (Redis) seats.
- `POST /api/book/hold` - Request an atomic lock on a seat for 10 minutes (Requires Customer JWT).
- `POST /api/book/confirm` - Finalize booking, clear Redis lock, and save to Mongo (Requires Customer JWT).
- `POST /api/book/cancel` - Cancel ticket and automatically trigger waitlist auto-reallocation logic (Requires Customer JWT).

### Waitlist Endpoints
- `POST /api/waitlist/join` - Join the queue for a sold-out event (Requires Customer JWT).

## 🔒 Core Logic Explanations

### Concurrency Seat Hold Logic
To prevent two users from booking the exact same seat at the exact same millisecond, the system utilizes Redis Atomic Locks (`SET NX EX`). 

1. **Rate Limiting & Anti-Hoarding**: When a user clicks a seat, the system first ensures they aren't spamming the API (1-second rate limit) and aren't holding more than 4 seats for that specific event.
2. **Atomic Lock**: The backend executes `await redis.set('hold:eventId:seatId', userId, 'EX', 600, 'NX')`. 
3. **Outcome**: The `NX` flag ensures the key is only created if it doesn't already exist. If multiple requests arrive simultaneously, Redis natively ensures only the first request succeeds. The successful user gets a 10-minute hold (`EX 600`), and all other requests return a 409 Conflict.
4. **Completion**: If payment is successful, the temporary Redis lock is deleted, and a permanent `Booking` is created in MongoDB. If payment fails or the 10 minutes expire, Redis automatically drops the key, freeing the seat.

### Waitlist Auto-Reallocation Logic
The system automatically handles cancellations without manual intervention.

1. **Queueing**: Users join a MongoDB Waitlist collection for a sold-out event.
2. **Cancellation Trigger**: When a user cancels their `Booking`, the system immediately queries the Waitlist collection, sorting by `joinedAt: 1` to find the oldest entry.
3. **Offer Generation**: The system changes that waitlisted user's status to `OFFERED` and generates a secure, 15-minute temporary offer token in Redis (`SET waitlist_offer:token ... EX 900`).
4. **Fulfillment**: An email is dispatched with a unique checkout link containing the token, allowing the waitlisted user 15 minutes to claim the freshly opened seat.
