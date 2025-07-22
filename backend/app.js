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

// Middleware setup
app.use(cors());
app.use(express.json());

// Make the database connection available to routes
app.locals.db = db;

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);

// Vercel Cron Job Route
app.get('/api/cron', cronHandler);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Custom error handler middleware
app.use(errorHandler);

app.get('/', (req, res) => {
    res.send('Welcome to the Grievance Management System API!')
});

const PORT = process.env.PORT || 3000;

// Start server only in local development, Vercel handles it in production
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the app for Vercel
export default app;