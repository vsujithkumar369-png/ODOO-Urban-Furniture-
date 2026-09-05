import client from './client';
export const getProducts  = () => client.get('/products');
export const getProduct   = (id) => client.get(`/products/${id}`);
export const createProduct = (data) => client.post('/products', data);
export const updateProduct = (id, data) => client.put(`/products/${id}`, data);
