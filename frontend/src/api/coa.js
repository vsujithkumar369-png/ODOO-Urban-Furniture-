import client from './client';
export const getCoa    = () => client.get('/coa');
export const createCoa = (data) => client.post('/coa', data);
export const updateCoa = (id, data) => client.put(`/coa/${id}`, data);
