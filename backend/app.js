// backend/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import cronHandler from './api/cron.js';

dotenv.config();

const app = express();

// --- IMPORTANT: CORS Configuration for Separate Deployments ---
// This list contains all the URLs that are allowed to make requests to your backend.
const allowedOrigins = [
    'https://gmp-user-ui41.vercel.app', // Your deployed frontend
    'http://localhost:5174'             // Your local development environment
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// -----------------------------------------------------------

// Standard Middleware
app.use(express.json());

// Make the database connection available to routes
app.locals.db = db;

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);

// Vercel Cron Job Route
app.get('/api/cron', cronHandler);

// Serve uploaded files statically (if you have an 'uploads' directory)
app.use('/uploads', express.static('uploads'));

// Custom error handler middleware
app.use(errorHandler);

// A root endpoint for health checks
app.get('/', (req, res) => {
    res.send('Welcome to the Grievance Management System API!');
});

const PORT = process.env.PORT || 3000;


if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running locally on port ${PORT}`);
    });
}


export default app;