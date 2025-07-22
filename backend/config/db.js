import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool. This is more efficient than creating a new connection
// for every request, and mysql2/promise handles the connection management.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    timezone: "+05:30", // Ensure your database server is also set to a consistent timezone
    waitForConnections: true,
    connectionLimit: 10, // Default is 10, adjust if needed
    queueLimit: 0
});

console.log('MySQL Pool configured.');

// Export the promise-based pool directly.
// You can also add a legacy query function if other parts of your app need it.
export const db = {
    promise: () => pool,
    query: (sql, params, callback) => {
        pool.query(sql, params)
            .then(([results]) => callback(null, results))
            .catch(err => callback(err, null));
    }
};