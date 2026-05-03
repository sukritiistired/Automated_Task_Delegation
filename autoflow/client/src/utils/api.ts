import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
});

export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff`;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return `${API_BASE}/public/${url}`;
};
