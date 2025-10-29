import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    timezone: "+05:30",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('MySQL Promise Pool configured.');


export const db = {

    promise: () => pool,
    query: (sql, params, callback) => {

        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params)
            .then(([results]) => {
                callback(null, results);
            })
            .catch(err => {
                console.error('Database Query Error:', err);
                callback(err, null);
            });
    }
};