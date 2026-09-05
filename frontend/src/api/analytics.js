import client from './client';

export const getAnalytics  = (params) => client.get('/analytics', { params });
export const getAnalytic   = (id) => client.get(`/analytics/${id}`);
export const createAnalytic = (data) => client.post('/analytics', data);
export const updateAnalytic = (id, data) => client.put(`/analytics/${id}`, data);
export const deleteAnalytic = (id) => client.delete(`/analytics/${id}`);
