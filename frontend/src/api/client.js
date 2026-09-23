import axios from 'axios';

const isLocalBrowser = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API = axios.create({
  baseURL: isLocalBrowser ? '/api' : (import.meta.env.VITE_API_URL || 'https://medwin-api.onrender.com'),
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

export default API;
