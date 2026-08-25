# Tech & Libraries Requirement Checklist

This document lists all the necessary technologies, platforms, and specific npm packages required to build the **Ticket Booking System** using the MERN + Redis stack. Keeping dependencies minimal is a core requirement of your assignment.

---

## 🏗️ Core Platforms & Databases
* **Node.js** (Runtime Environment)
* **MongoDB Atlas** (Free-tier cloud database for permanent data)
* **Upstash Redis** (Free-tier serverless Redis for seat locks)
* **Vercel** or **Render** (For hosting the Frontend and Backend)

---

## ⚙️ Backend (Node.js API) Requirements

To initialize your backend, run:
`npm init -y`

Then install the following strictly necessary libraries:

### 1. Framework & Core
* `express` - The core web server framework.
* `cors` - To allow your React frontend to communicate with your backend API.
* `dotenv` - To load secret API keys and database URLs from your `.env` file.

### 2. Database & Auth
* `mongoose` - The ODM to interact with MongoDB (Schemas and Queries).
* `ioredis` - The best Redis client for Node.js (handles the `SETNX` locks and TTLs).
* `bcryptjs` - To securely hash customer passwords before saving to MongoDB.
* `jsonwebtoken` - To generate session tokens for Role-Based Auth (Admin/Organiser/Customer).

### 3. Utilities (For PDF Deliverables)
* `qrcode` - Converts a booking reference string into a base64 QR code image.
* `nodemailer` - Sends the confirmation email with the QR code attached.
* `node-cron` *(Optional)* - To schedule a background task that sweeps expired waitlist offers.

**Installation Command:**
```bash
npm install express cors dotenv mongoose ioredis bcryptjs jsonwebtoken qrcode nodemailer
```

---

## 🎨 Frontend (React UI) Requirements

To initialize your frontend, use Vite for a fast React setup:
`npm create vite@latest frontend -- --template react`

### 1. Core Libraries
* `react` & `react-dom` - Built-in with Vite.
* `react-router-dom` - To navigate between pages (Home, Login, Seat Map, Checkout, Profile).
* `axios` - To easily make API requests to your Node.js backend.

### 2. Styling & UI
* `tailwindcss` - For fast, responsive styling (highly recommended to build the complex seat grid easily without huge CSS files).
* `lucide-react` - A lightweight library for crisp SVG icons (e.g., ticket icons, user profiles).

**Installation Command:**
```bash
npm install react-router-dom axios lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## ❌ What NOT to use (Based on Assignment Rules)
* **Do not use heavy state managers** like `Redux`. React's built-in `useState` and `Context API` are enough.
* **Do not use bloated component libraries** like `Material UI` or `Bootstrap` if possible. Tailwind CSS keeps the bundle size tiny and native.
* **Do not install a real payment SDK** (like `stripe`) unless you finish everything else early and want bonus points. Use the Mock Payment component approach first.
