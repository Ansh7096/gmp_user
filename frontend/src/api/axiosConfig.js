import axios from 'axios';

// This sets the base URL for all axios requests
axios.defaults.baseURL = 'https://gmp-lnmiit.vercel.app';

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