import axios from 'axios';
import { toast } from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.PROD ? 'https://gmp-lnmiit.vercel.app' : '';

axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {

        return response;
    },
    (error) => {

        if (error.response && error.response.status === 401) {

            if (window.location.pathname !== '/login') {
                toast.error('Your session has expired. Please log in again.');
                localStorage.clear();


                window.location.href = '/login';
            }
        }


        return Promise.reject(error);
    }
);

export default axios;