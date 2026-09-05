const { pool } = require('../db');
const bcrypt = require('bcrypt');
const { errorResponse, ok } = require('../utils/errors');

const getContacts = async (req, res, next) => {
  try {
    const typeFilter = req.query.type;
    let query = 'SELECT * FROM contacts';
    const params = [];
    if (typeFilter && typeFilter !== 'all') {
      query += ' WHERE LOWER(type) = LOWER($1)';
      params.push(typeFilter);
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    return ok(res, result.rows);
  } catch (error) { next(error); }
};

const getContactById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (result.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Contact not found');
    return ok(res, result.rows[0]);
  } catch (error) { next(error); }
};

const createContact = async (req, res, next) => {
  try {
    const { name, type, email, mobile, street, city, state, country, pincode, image_url } = req.body;
    if (!name || !type) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'name and type are required');
    }

    const insertRes = await pool.query(
      `INSERT INTO contacts (name, type, email, mobile, street, city, state, country, pincode, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, type, email || null, mobile || null, street || null, city || null, state || null, country || null, pincode || null, image_url || null]
    );

    const contact = insertRes.rows[0];

    let portalUser = null;
    if (email) {
      const tempPassword = Math.random().toString(36).slice(-10) + 'A!1';
      const password_hash = await bcrypt.hash(tempPassword, 10);
      try {
        const uRes = await pool.query(
          'INSERT INTO users (name, login_id, email, password, role, contact_id) VALUES ($1, $2, $3, $4, \'contact\', $5) ON CONFLICT (login_id) DO NOTHING RETURNING id, login_id, email, role, contact_id',
          [contact.name, email, email, password_hash, contact.id]
        );
        if (uRes.rows.length > 0) {
          portalUser = {
            ...uRes.rows[0],
            temporary_password: tempPassword
          };
        }
      } catch (uErr) {
        console.error('Error creating portal user:', uErr);
      }
    }

    return ok(res, { ...contact, portal_access_created: !!portalUser, portal_user: portalUser }, 201);
  } catch (error) { next(error); }
};

const updateContact = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, email, mobile, street, city, state, country, pincode, image_url } = req.body;
    const updateRes = await pool.query(
      `UPDATE contacts
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           email = COALESCE($3, email),
           mobile = COALESCE($4, mobile),
           street = COALESCE($5, street),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           country = COALESCE($8, country),
           pincode = COALESCE($9, pincode),
           image_url = COALESCE($10, image_url)
       WHERE id = $11
       RETURNING *`,
      [name, type, email, mobile, street, city, state, country, pincode, image_url, id]
    );

    if (updateRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Contact not found');
    return ok(res, updateRes.rows[0]);
  } catch (error) { next(error); }
};

const deleteContact = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const delRes = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    if (delRes.rows.length === 0) return errorResponse(res, 404, 'NOT_FOUND', 'Contact not found');
    return ok(res, { id, deleted: true });
  } catch (error) { next(error); }
};

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact
};

