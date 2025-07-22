// backend/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import cron from 'node-cron'; // REMOVE THIS LINE
import { db } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import errorHandler from './middleware/errorHandler.js';
// import { checkAndEscalateGrievances } from './scripts/escalationCron.js'; // REMOVE THIS LINE

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

// --- NEW ---
// Add the new cron job route.
// Note: Vercel might handle routing directly via the /api directory,
// but adding it here ensures it works in local development too.
import cronHandler from './api/cron.js';
app.post('/api/cron', cronHandler);


// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Custom error handler middleware
app.use(errorHandler);


app.get('/', (req, res) => {
    res.send('Welcome to the Grievance Management System!')
})
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // --- REMOVE THE ENTIRE AUTOMATED ESCALATION JOB BLOCK ---
    // console.log('Starting automated grievance escalation job...');
    // cron.schedule('*/30 * * * *', () => {
    //     console.log('Performing scheduled escalation check.');
    //     checkAndEscalateGrievances();
    // });
    // console.log(`Escalation check scheduled to run every 30 minutes.`);
});

// Export the app for Vercel
export default app;