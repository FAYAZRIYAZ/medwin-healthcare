import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

export default API;
