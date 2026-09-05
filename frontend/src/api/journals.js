import client from './client';
export const getJournals  = () => client.get('/journals');
export const createJournal = (data) => client.post('/journals', data);
export const updateJournal = (id, data) => client.put(`/journals/${id}`, data);
