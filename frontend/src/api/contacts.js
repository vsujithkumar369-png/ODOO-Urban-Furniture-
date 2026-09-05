import client from './client';
export const getContacts  = (params) => client.get('/contacts', { params });
export const getContact   = (id) => client.get(`/contacts/${id}`);
export const createContact = (data) => client.post('/contacts', data);
export const updateContact = (id, data) => client.put(`/contacts/${id}`, data);
