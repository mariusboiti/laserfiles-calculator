import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';


export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
