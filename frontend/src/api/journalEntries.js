import client from './client';
export const getJournalEntries = (params) => client.get('/journal-entries', { params });
export const getJournalEntry   = (id) => client.get(`/journal-entries/${id}`);
