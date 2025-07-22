import axios from 'axios';

// This line is causing the CORS error. It forces requests to a different domain.
// By removing it, requests will go to the same domain as the frontend,
// and Vercel's rewrite rules will handle routing to the backend API.
// axios.defaults.baseURL = 'https://gmp-lnmiit.vercel.app'; // <-- REMOVE OR COMMENT OUT THIS LINE

axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Sets the Authorization header for every request if a token exists
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axios;