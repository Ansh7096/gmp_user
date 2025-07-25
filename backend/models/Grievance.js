// backend/models/Grievance.js
import { db } from '../config/db.js';

// ... (existing functions: getAllDepartments, getAllLocations, etc.)

// NEW: Fetch all grievances for a specific user by email
export const getGrievancesByEmail = (email, callback) => {
  const sql = `
    SELECT
      g.ticket_id,
      g.title,
      g.status,
      g.created_at,
      g.updated_at,
      d.name AS department_name
    FROM grievances g
    JOIN departments d ON g.department_id = d.id
    WHERE g.email = ?
    ORDER BY g.created_at DESC
  `;
  db.query(sql, [email], callback);
};


// Fetch all departments (id, name)
export const getAllDepartments = (callback) => {
  const sql = `
    SELECT id, name
      FROM departments
  ORDER BY name
  `;
  db.query(sql, callback);
};

// NEW: Fetch all locations
export const getAllLocations = (callback) => {
  const sql = `SELECT name FROM locations ORDER BY name`;
  db.query(sql, callback);
};


// Fetch categories by department (id, name, urgency)
export const getCategoriesByDept = (deptId, callback) => {
  const sql = `
    SELECT id, name, urgency
      FROM categories
     WHERE department_id = ?
  ORDER BY name
  `;
  db.query(sql, [deptId], callback);
};

// Create a new grievance ticket
export const createGrievance = (data, callback) => {
  const {
    ticket_id,
    title,
    description,
    location,
    department_id,
    category_id,
    urgency,
    attachmentPath,
    mobile_number,
    complainant_name,
    email,
    response_deadline,
    resolution_deadline,
  } = data;

  const sql = `
    INSERT INTO grievances
      (ticket_id,
       title,
       description,
       location,
       department_id,
       category_id,
       urgency,
       attachment,
       mobile_number,
       complainant_name,
       email,
       status,
       created_at,
       updated_at,
       response_deadline,
       resolution_deadline)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', CONVERT_TZ(NOW(), 'UTC', '+05:30'), CONVERT_TZ(NOW(), 'UTC', '+05:30'), ?, ?)
  `;

  db.query(
    sql,
    [
      ticket_id,
      title,
      description,
      location,
      department_id,
      category_id,
      urgency,
      attachmentPath || null,
      mobile_number,
      complainant_name,
      email,
      response_deadline,
      resolution_deadline,
    ],
    callback
  );
};

// Get grievances for a given department, including category name, roll number, timestamps
export const getGrievancesByDepartment = (departmentId, callback) => {
  const sql = `
    SELECT
      g.id,
      g.ticket_id,
      g.title,
      g.description,
      g.location,
      g.urgency,
      g.status,
      g.attachment,
      g.mobile_number,
      g.complainant_name,
      g.email,
      g.created_at,
      g.updated_at,
      c.name AS category_name,
      u.roll_number,
      g.escalation_level,
      w.name AS worker_name,
      w.phone_number AS worker_phone_number 
    FROM grievances g
    JOIN categories c ON g.category_id = c.id
    LEFT JOIN users u ON g.email = u.email
    LEFT JOIN workers w ON g.assigned_worker_id = w.id
   WHERE g.department_id = ?
ORDER BY g.created_at DESC
  `;
  db.query(sql, [departmentId], callback);
};
// Update status (and optionally assigned worker) of a ticket
export const updateGrievanceStatus = (ticketId, status, workerId, callback) => {
  const sql = workerId
    ? `UPDATE grievances SET status = ?, assigned_worker_id = ?, updated_at = CONVERT_TZ(NOW(), 'UTC', '+05:30') WHERE ticket_id = ?`
    : `UPDATE grievances SET status = ?, updated_at = CONVERT_TZ(NOW(), 'UTC', '+05:30') WHERE ticket_id = ?`;
  const params = workerId
    ? [status, workerId, ticketId]
    : [status, ticketId];

  db.query(sql, params, callback);
};

// Get detailed info for a single grievance
export const getGrievanceDetails = (ticketId, callback) => {
  const sql = `
    SELECT
      g.id,
      g.ticket_id,
      g.title,
      g.description,
      g.location,
      g.urgency,
      g.status,
      g.attachment,
      g.mobile_number,
      g.complainant_name,
      g.email,
      g.created_at,
      g.updated_at,
      c.name AS category_name,
      d.name AS department_name,
      w.id   AS worker_id,
      w.name AS worker_name,
      w.email AS worker_email,
      w.phone_number AS worker_phone
    FROM grievances g
    LEFT JOIN categories c ON g.category_id = c.id
    LEFT JOIN departments d ON g.department_id = d.id
    LEFT JOIN workers w ON g.assigned_worker_id = w.id
   WHERE g.ticket_id = ?
  `;
  db.query(sql, [ticketId], callback);
};
