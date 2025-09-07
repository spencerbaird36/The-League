export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://the-league-f8fa1bccd03a.herokuapp.com' 
  : 'http://localhost:5000';

export const apiRequest = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};