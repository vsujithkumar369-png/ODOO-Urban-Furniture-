import client from './client';
export const getDocuments  = (params) => client.get('/documents', { params });
export const getDocument   = (id) => client.get(`/documents/${id}`);
export const createDocument = (data) => client.post('/documents', data);
export const updateDocument = (id, data) => client.put(`/documents/${id}`, data);
export const confirmDocument = (id) => client.post(`/documents/${id}/confirm`);
export const convertDocument = (id) => client.post(`/documents/${id}/convert`);
