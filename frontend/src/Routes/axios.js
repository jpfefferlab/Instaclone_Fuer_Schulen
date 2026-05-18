import axios from 'axios';

let env = 'prod'; // Not sure what this line does

// Axios custom hooks
// https://dev.to/hey_yogini/useaxios-a-simple-custom-hook-for-calling-apis-using-axios-2dkj

// Routing for production and local development
//const baseURL = process.env.NODE_ENV === 'production'
//  ? 'https://c339-2a02-2455-2df-1500-b82e-218f-d0b4-357e.eu.ngrok.io' // Defined in settings.py
//  : 'http://localhost:8000';  // Change this to match your backend port

const fetchClient = () => {
  const defaultOptions = {
   // baseURL: baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Create instance
  let instance = axios.create(defaultOptions);

  // Set the AUTH token for any request
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('jwt');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

export default fetchClient();
