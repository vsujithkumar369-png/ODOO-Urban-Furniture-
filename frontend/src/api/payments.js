import client from './client';
export const createPayment = (data) => client.post('/payments', data);
export const getPayments   = (documentId) => client.get('/payments', { params: { document_id: documentId } });
