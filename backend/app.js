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


const allowedOrigins = [
    'https://gmp-user-ui41.vercel.app',
    'http://localhost:5174'
];


const corsOptions = {
    origin: function (origin, callback) {

        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));



app.use(express.json());


app.locals.db = db;


app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);


app.get('/api/cron', cronHandler);


app.use('/uploads', express.static('uploads'));


app.use(errorHandler);


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