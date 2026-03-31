const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// Request Logger (non-GET only, skip in test/production logs)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });
}

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams',   require('./routes/teams'));
app.use('/api/auction', require('./routes/auction'));

// Health-check (useful for deployment platforms)
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Socket.io events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Socket connected: ${socket.id}`);
  }
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Socket disconnected: ${socket.id}`);
    }
  });
});

// ── Database & Server Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected.');

    // Auto-seed admin user after successful connection
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('eeswar@2711', salt);
      await User.create({ username: 'eeswar', password: hashedPassword, role: 'admin' });
      console.log('Admin auto-seeded: eeswar / eeswar@2711');
    }

  } catch (err) {
    console.warn('Primary MongoDB unavailable. Falling back to in-memory DB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('In-Memory MongoDB Connected.');

      // Auto-seed admin user for fallback memory DB
      const User = require('./models/User');
      const bcrypt = require('bcryptjs');
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('eeswar@2711', salt);
        await User.create({ username: 'eeswar', password: hashedPassword, role: 'admin' });
        console.log('Admin auto-seeded: eeswar / eeswar@2711');
      }
    } catch (memErr) {
      console.error('Fatal: Could not connect to any database.', memErr);
      process.exit(1);
    }
  }
};

// Connect first, then start listening
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
});
