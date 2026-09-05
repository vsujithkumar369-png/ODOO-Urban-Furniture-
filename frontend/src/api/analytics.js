import client from './client';
export const getAnalytics  = () => client.get('/analytics');
export const createAnalytic = (data) => client.post('/analytics', data);
export const updateAnalytic = (id, data) => client.put(`/analytics/${id}`, data);
