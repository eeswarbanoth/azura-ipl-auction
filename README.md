# IPL Auction Management System

A production-ready, highly visual IPL Auction Management System built for offline college events. Serves as a Control Panel for the Auctioneer, a Dashboard for Franchises, and a Full-screen Projector Display for the live audience.

## Features

- **Admin Control Panel**: Add/Edit players, manage teams, organize the auction queue, and conduct bids.
- **Franchise Dashboard**: View team budget, past purchases, squad composition, and upcoming players.
- **Projector Mode**: A stunning, real-time updated display screen (dark theme, neon accents) featuring sold/unsold animations and confetti effects via WebSockets.
- **Advanced Tools**: Export auction history to CSV, category filtering, search, and warnings for low budgets.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, JsonWebToken (JWT)
- **Database**: MongoDB (Mongoose)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or via a cloud URI)

### 1. Clone & Install Dependencies

Open two separate terminals.

**Terminal 1: Backend**
```bash
cd backend
npm install
```

**Terminal 2: Frontend**
```bash
cd frontend
npm install
```

### 2. Environment Variables

In the `backend` folder, create a `.env` file (if not already existing) with:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ipl-auction
JWT_SECRET=supersecret_ipl_auction_key_2026
```

### 3. Seed Admin Data
Run the backend seeder script to create the initial Admin account.
```bash
cd backend
node seed.js
```
*This will create an admin user with username: `admin` and password: `admin123`.*

---

## 🏃‍♂️ Run Commands

To start the application, run the backend and frontend at the same time:

**Start Backend (Terminal 1)**
```bash
cd backend
npm run start
# OR use nodemon for dev: npx nodemon server.js
```
*Backend runs on `http://localhost:5000`*

**Start Frontend (Terminal 2)**
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173` (or similar depending on Vite)*

---

## 🎮 Usage Guide

1. Open `http://localhost:5173` in your browser.
2. Select **Admin** and login with `admin` / `admin123`.
3. In the Admin Dashboard:
   - Navigate to **Teams** and create participating franchises.
   - Navigate to **Players** and add players to the pool.
   - Navigate to **Queue** and move active players into the auction queue.
4. Start a separate Browser Window (or connect to a projector) and navigate to `http://localhost:5173/projector`. Make sure to login as Admin to access this screen.
5. In the **Auction Control**, select "Start Auction". You can now take live bids offline and use the control panel to assign players and trigger the live visual effects on the projector.
6. Provide Franchises with their login credentials (if you create them via a Registration flow later). They can use the Franchise portal to track their purchases!
