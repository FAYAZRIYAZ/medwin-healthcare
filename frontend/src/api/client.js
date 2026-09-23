import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://medwin-api.onrender.com'),
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

export default API;
