import axios from 'axios';

// In production, set the absolute base URL for the deployed backend.
// In development, the base URL is an empty string. This makes API calls relative 
// (e.g., '/api/auth/login'), which allows the Vite proxy to intercept them and
// forward them to the target backend, avoiding CORS errors.
axios.defaults.baseURL = import.meta.env.PROD ? 'https://gmp-lnmiit.vercel.app' : '';

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