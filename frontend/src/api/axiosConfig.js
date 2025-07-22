import axios from 'axios';

// --- IMPORTANT: Set the base URL to your live backend ---
// This ensures that all API calls from the frontend are directed to your
// deployed backend at 'https://gmp-lnmiit.vercel.app'.
axios.defaults.baseURL = 'https://gmp-lnmiit.vercel.app';
// ----------------------------------------------------

// This interceptor attaches the JWT token to every outgoing request
// if it exists in localStorage.
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // This handles errors that might occur during request setup
        return Promise.reject(error);
    }
);

export default axios;
