import {
    getAllDepartments,
    getAllLocations,
    getCategoriesByDept,
    createGrievance,
    getGrievancesByDepartment as getGrievancesByDepartmentFromModel,
    updateGrievanceStatus,
    getGrievancesByEmail
} from '../models/Grievance.js';
import { createApprovingAuthority } from '../models/ApprovingAuthority.js';
import { getWorkersByDepartment, createWorker } from '../models/Worker.js';
import {
    sendGrievanceStatusUpdateEmail,
    sendGrievanceAssignedEmailToUser,
    sendGrievanceAssignedEmailToWorker,
    sendRevertNotificationEmail,
    sendRevertToOfficeBearerEmail,
    sendGrievanceTransferNotification
} from '../utils/mail.js';
import { sendTicketIdEmail } from '../utils/sendTicketIdEmail.js';
import imagekit from '../config/imagekit.js';
import { db } from '../config/db.js';
import bcrypt from 'bcrypt';
import ErrorResponse from '../utils/errorResponse.js';

const calculateDeadline = (hours) => {
    let deadline = new Date();
    let remainingHours = hours;
    while (remainingHours > 0) {
        deadline.setHours(deadline.getHours() + 1);
        if (deadline.getDay() !== 0) {
            remainingHours--;
        }
    }
    return deadline;
};

export const getUserGrievanceHistory = (req, res, next) => {
    const { email } = req.params;
    getGrievancesByEmail(email, (err, results) => {
        if (err) {
            return next(new ErrorResponse('DB error fetching grievance history', 500));
        }
        res.json(results);
    });
};

export const listDepartments = (req, res, next) => {
    getAllDepartments((err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching departments', 500));
        res.json(results);
    });
};

// --- UPDATED ---
// Now returns ID and Name
export const listLocations = (req, res, next) => {
    getAllLocations((err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching locations', 500));
        // res.json(results.map(loc => loc.name)); // Old
        res.json(results); // New
    });
};

export const listCategories = (req, res, next) => {
    const deptId = req.params.deptId;
    getCategoriesByDept(deptId, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching categories', 500));
        res.json(results);
    });
};

export const submitGrievance = async (req, res, next) => {
    try {
        let imageUrl = null;
        if (req.file && req.file.buffer) {
            const uploadResponse = await imagekit.upload({
                file: req.file.buffer,
                fileName: `grievance_${Date.now()}_${req.file.originalname}`,
                folder: "/",
                isPrivateFile: false
            });
            console.log("ImageKit Upload Response:", uploadResponse);
            imageUrl = uploadResponse.url;
            console.log("URL being saved to database:", imageUrl);
        }

        const { title, description, location, department, category, urgency = 'Normal', mobileNumber, complainantName, email } = req.body;
        const department_id = parseInt(department, 10);
        const category_id = parseInt(category, 10);

        let response_deadline, resolution_deadline;
        let resolveIn;
        switch (urgency) {
            case 'Emergency':
                response_deadline = calculateDeadline(6);
                resolution_deadline = calculateDeadline(24);
                resolveIn = "24 hours";
                break;
            case 'High':
                response_deadline = calculateDeadline(36);
                resolution_deadline = calculateDeadline(72);
                resolveIn = "3 working days";
                break;
            default:
                response_deadline = calculateDeadline(60);
                resolution_deadline = calculateDeadline(120);
                resolveIn = "5 working days";
                break;
        }

        let grievanceData;
        let maxRetries = 5;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');

                const [rows] = await db.promise().query(`SELECT COUNT(*) AS count FROM grievances WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`, [month, year]);
                const serialNo = String(rows[0].count + 1).padStart(4, '0');
                const ticket_id = `lnm/${year}/${month}/${serialNo}`;

                grievanceData = {
                    ticket_id, title, description, location, department_id, category_id, urgency,
                    attachmentPath: imageUrl, mobile_number: mobileNumber, complainant_name: complainantName,
                    email, response_deadline, resolution_deadline
                };

                const dbPromise = () => new Promise((resolve, reject) => {
                    createGrievance(grievanceData, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                await dbPromise();

                break;

            } catch (err) {
                if (err.errno === 1062) {
                    console.warn(`Attempt ${attempt + 1}: Duplicate ticket ID detected. Retrying...`);
                    attempt++;
                    if (attempt === maxRetries) {
                        throw new ErrorResponse('Failed to generate a unique ticket ID after multiple retries.', 500);
                    }
                } else {
                    throw err;
                }
            }
        }

        try {
            await sendTicketIdEmail(email, complainantName, grievanceData.ticket_id, urgency, resolveIn);
            res.status(201).json({ message: 'Grievance submitted successfully', ticket_id: grievanceData.ticket_id });
        } catch (emailError) {
            console.error("Failed to send ticket ID email:", emailError);
            res.status(201).json({ message: 'Grievance submitted, but notification email failed.', ticket_id: grievanceData.ticket_id });
        }
    } catch (err) {
        console.error("--- IMAGEKIT UPLOAD FAILED OR OTHER ERROR ---", err);
        next(err);
    }
};

export const trackGrievance = async (req, res, next) => {
    try {
        const { ticket_id } = req.params;
        const [rows] = await db.promise().query('SELECT ticket_id, status, created_at, updated_at FROM grievances WHERE ticket_id = ?', [ticket_id]);
        if (!rows.length) return next(new ErrorResponse('Grievance not found', 404));
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
};

export const getGrievancesByDepartment = (req, res, next) => {
    const { departmentId } = req.params;
    getGrievancesByDepartmentFromModel(departmentId, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching grievances', 500));
        res.json(results);
    });
};

export const listWorkersByDepartment = (req, res, next) => {
    const { departmentId } = req.params;
    getWorkersByDepartment(departmentId, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching workers', 500));
        res.json(results);
    });
};

export const addNewWorker = (req, res, next) => {
    const { name, email, phone_number, department_id } = req.body;
    createWorker({ name, email, phone_number, department_id }, (err, result) => {
        if (err) return next(new ErrorResponse('DB error creating worker', 500));
        res.status(201).json({ message: 'Worker added successfully', workerId: result.insertId });
    });
};

export const assignGrievance = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const { workerId, officeBearerEmail } = req.body;

        const [workerDetails] = await db.promise().query('SELECT * FROM workers WHERE id = ?', [workerId]);
        if (!workerDetails.length) {
            return next(new ErrorResponse('Worker not found.', 404));
        }
        const worker = workerDetails[0];

        await updateGrievanceStatus(ticketId, 'In Progress', workerId);

        const [grievanceDetails] = await db.promise().query('SELECT g.*, c.name as category_name, u.roll_number FROM grievances g LEFT JOIN categories c ON g.category_id = c.id LEFT JOIN users u ON g.email = u.email WHERE g.ticket_id = ?', [ticketId]);
        const [bearerDetails] = await db.promise().query('SELECT name, email, mobile_number FROM office_bearers WHERE email = ?', [officeBearerEmail]);

        if (grievanceDetails.length) {
            const grievance = grievanceDetails[0];
            const officeBearer = bearerDetails.length ? bearerDetails[0] : null;

            await sendGrievanceAssignedEmailToUser(grievance.email, grievance.complainant_name, ticketId, worker);
            if (officeBearer) {
                await sendGrievanceAssignedEmailToWorker(worker.email, worker.name, ticketId, grievance, officeBearer);
            }
        }

        res.status(200).json({ message: 'Grievance assigned successfully' });
    } catch (err) {
        console.error("Assign grievance error:", err);
        if (err.message.includes("email")) {
            return next(new ErrorResponse('Grievance assigned, but failed to send notification emails.', 500));
        }
        next(err);
    }
};

export const resolveGrievance = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        await updateGrievanceStatus(ticketId, 'Resolved', null);

        try {
            const [details] = await db.promise().query('SELECT email, complainant_name FROM grievances WHERE ticket_id = ?', [ticketId]);
            if (details.length) {
                const grievance = details[0];
                await sendGrievanceStatusUpdateEmail(grievance.email, grievance.complainant_name, ticketId, 'Resolved');
            }
            res.status(200).json({ message: 'Grievance resolved successfully' });
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            return next(new ErrorResponse('Grievance resolved, but failed to send notification email.', 500));
        }
    } catch (err) {
        next(err);
    }
};

export const getEscalatedGrievances = (req, res, next) => {
    const sql = 'SELECT g.ticket_id, g.title, g.urgency, g.status, g.created_at, g.updated_at, g.escalation_level, d.name AS department_name FROM grievances g JOIN departments d ON g.department_id = d.id WHERE g.escalation_level = 1 ORDER BY g.created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching escalated grievances', 500));
        res.json(results);
    });
};

export const revertGrievance = async (req, res, next) => {
    const { ticketId } = req.params;
    const { new_resolution_days, comment, authorityEmail } = req.body;
    if (!comment || !new_resolution_days || new_resolution_days <= 0) {
        return next(new ErrorResponse('Comment and a valid number of new resolution days are required.', 400));
    }
    try {
        const new_resolution_hours = new_resolution_days * 24;
        const new_resolution_deadline = calculateDeadline(new_resolution_hours);

        const new_response_hours = new_resolution_hours / 2;
        const new_response_deadline = calculateDeadline(new_response_hours);

        const [grievanceRows] = await db.promise().query('SELECT g.ticket_id, d.name as department_name FROM grievances g JOIN departments d ON g.department_id = d.id WHERE g.ticket_id = ?', [ticketId]);
        if (grievanceRows.length === 0) {
            return next(new ErrorResponse('Grievance not found.', 404));
        }
        const departmentName = grievanceRows[0].department_name;
        const [bearers] = await db.promise().query('SELECT email FROM office_bearers WHERE department = ?', [departmentName]);
        const bearerEmails = bearers.map(b => b.email);

        const sql = `
            UPDATE grievances
            SET
                status = 'Submitted',
                assigned_worker_id = NULL,
                response_deadline = ?,
                resolution_deadline = ?,
                escalation_level = 0,
                updated_at = NOW()
            WHERE ticket_id = ?
        `;
        await db.promise().query(sql, [new_response_deadline, new_resolution_deadline, ticketId]);

        if (bearerEmails.length > 0) {
            await sendRevertToOfficeBearerEmail(grievanceRows[0], comment, authorityEmail, bearerEmails);
        }
        res.status(200).json({ message: 'Grievance reverted with new deadlines and office bearers notified.' });
    } catch (err) {
        next(err);
    }
};

export const transferGrievance = async (req, res, next) => {
    const { ticketId, newDepartmentId } = req.body;
    if (!ticketId || !newDepartmentId) {
        return next(new ErrorResponse('Ticket ID and new department ID are required.', 400));
    }
    try {
        const [grievanceRows] = await db.promise().query('SELECT * FROM grievances WHERE ticket_id = ?', [ticketId]);
        if (grievanceRows.length === 0) {
            return next(new ErrorResponse('Grievance not found.', 404));
        }
        const grievance = grievanceRows[0];
        let response_deadline, resolution_deadline;
        switch (grievance.urgency) {
            case 'Emergency':
                response_deadline = calculateDeadline(6);
                resolution_deadline = calculateDeadline(24);
                break;
            case 'High':
                response_deadline = calculateDeadline(36);
                resolution_deadline = calculateDeadline(72);
                break;
            default:
                response_deadline = calculateDeadline(60);
                resolution_deadline = calculateDeadline(120);
                break;
        }
        const updateSql = 'UPDATE grievances SET department_id = ?, status = \'Submitted\', assigned_worker_id = NULL, escalation_level = 0, response_deadline = ?, resolution_deadline = ?, updated_at = NOW() WHERE ticket_id = ?';
        await db.promise().query(updateSql, [newDepartmentId, response_deadline, resolution_deadline, ticketId]);
        const [newDepartmentRows] = await db.promise().query('SELECT name FROM departments WHERE id = ?', [newDepartmentId]);
        const newDepartmentName = newDepartmentRows[0]?.name;
        if (newDepartmentName) {
            const [bearers] = await db.promise().query('SELECT email FROM office_bearers WHERE department = ?', [newDepartmentName]);
            const bearerEmails = bearers.map(b => b.email);
            if (bearerEmails.length > 0) {
                await sendGrievanceTransferNotification(grievance, newDepartmentName, bearerEmails);
            }
        }
        res.status(200).json({ message: 'Grievance transferred successfully.' });
    } catch (err) {
        next(err);
    }
};

export const addOfficeBearer = (req, res, next) => {
    const { name, email, password, mobile_number, role, department } = req.body;
    bcrypt.hash(password, 6, (err, hashedPassword) => {
        if (err) return next(new ErrorResponse('Error hashing password', 500));
        const sql = 'INSERT INTO office_bearers (name, email, password, mobile_number, role, department) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [name, email, hashedPassword, mobile_number, role, department], (err, result) => {
            if (err) return next(new ErrorResponse('Error creating office bearer', 500));
            res.status(201).json({ message: 'Office bearer added successfully', id: result.insertId });
        });
    });
};

export const getAllGrievancesForAdmin = (req, res, next) => {
    const sql = 'SELECT g.*, d.name as department_name, c.name as category_name FROM grievances g JOIN departments d ON g.department_id = d.id JOIN categories c ON g.category_id = c.id ORDER BY g.created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching all grievances', 500));
        res.json(results);
    });
};

export const getAdminDashboardStats = (req, res, next) => {
    const queries = {
        byDepartment: 'SELECT d.name, COUNT(g.id) as count FROM grievances g JOIN departments d ON g.department_id = d.id GROUP BY d.name',
        byStatus: 'SELECT status, COUNT(id) as count FROM grievances GROUP BY status',
        byEscalation: 'SELECT escalation_level, COUNT(id) as count FROM grievances WHERE escalation_level > 0 GROUP BY escalation_level',
    };
    db.promise().query(queries.byDepartment)
        .then(([deptRows]) => {
            db.promise().query(queries.byStatus)
                .then(([statusRows]) => {
                    db.promise().query(queries.byEscalation)
                        .then(([escalationRows]) => {
                            res.json({ byDepartment: deptRows, byStatus: statusRows, byEscalation: escalationRows });
                        });
                });
        })
        .catch(err => next(new ErrorResponse('DB error fetching stats', 500, err)));
};

export const getLevel2Grievances = (req, res, next) => {
    const sql = 'SELECT g.ticket_id, g.title, g.escalation_level, d.name as department_name FROM grievances g JOIN departments d ON g.department_id = d.id WHERE g.escalation_level >= 2 ORDER BY g.escalation_level DESC, g.created_at ASC';
    db.query(sql, (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching Level 2 grievances', 500));
        res.json(results);
    });
};

export const revertToLevel1 = async (req, res, next) => {
    const { ticketId } = req.params;
    const { new_resolution_days, comment, adminEmail } = req.body;
    if (!comment || !new_resolution_days || new_resolution_days <= 0) {
        return next(new ErrorResponse('Comment and a valid number of new resolution days are required.', 400));
    }
    try {
        const new_resolution_hours = new_resolution_days * 24;
        const new_resolution_deadline = calculateDeadline(new_resolution_hours);

        const new_response_hours = new_resolution_hours / 2;
        const new_response_deadline = calculateDeadline(new_response_hours);

        const updateSql = `
            UPDATE grievances
            SET
                response_deadline = ?,
                resolution_deadline = ?,
                escalation_level = 1,
                updated_at = NOW()
            WHERE ticket_id = ?
        `;
        await db.promise().query(updateSql, [new_response_deadline, new_resolution_deadline, ticketId]);

        const [authorities] = await db.promise().query('SELECT email FROM approving_authorities');
        const authorityEmails = authorities.map(a => a.email);
        if (authorityEmails.length > 0) {
            const grievanceDetails = { ticket_id: ticketId };
            await sendRevertNotificationEmail(grievanceDetails, comment, adminEmail, authorityEmails);
        }
        res.status(200).json({ message: 'Grievance reverted to Level 1 and Approving Authorities notified.' });
    } catch (err) {
        next(err);
    }
};

// --- NEW MANAGEMENT FUNCTIONS ---

const createDeleteHandler = (tableName, friendlyName) => async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.promise().query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
        res.status(200).json({ message: `${friendlyName} deleted successfully.` });
    } catch (err) {
        if (err.errno === 1451) {
            return next(new ErrorResponse(`Cannot delete ${friendlyName} as it is currently in use by a grievance or other record.`, 400));
        }
        next(new ErrorResponse(`DB error deleting ${friendlyName}.`, 500, err));
    }
};

export const getAllCategories = (req, res, next) => {
    db.query('SELECT c.id, c.name, d.name as department_name FROM categories c JOIN departments d ON c.department_id = d.id ORDER BY d.name, c.name', (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching all categories', 500));
        res.json(results);
    });
};

export const getAllAuthorities = (req, res, next) => {
    db.query('SELECT id, name, email FROM approving_authorities ORDER BY name', (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching authorities', 500));
        res.json(results);
    });
};

export const getAllOfficeBearers = (req, res, next) => {
    db.query('SELECT id, name, email, department FROM office_bearers ORDER BY department, name', (err, results) => {
        if (err) return next(new ErrorResponse('DB error fetching office bearers', 500));
        res.json(results);
    });
};


export const addApprovingAuthority = (req, res, next) => {
    const { name, email, password, mobile_number } = req.body;
    bcrypt.hash(password, 6, (err, hashedPassword) => {
        if (err) return next(new ErrorResponse('Password encryption failed.', 500));
        createApprovingAuthority({ name, email, hashedPassword, mobile_number, role: 'Approving Authority' }, (err2, result) => {
            if (err2) return next(new ErrorResponse('Database error.', 500));
            res.status(201).json({ message: 'Approving Authority added successfully.', id: result.insertId });
        });
    });
};

export const addLocation = (req, res, next) => {
    const { name } = req.body;
    db.query('INSERT INTO locations (name) VALUES (?)', [name], (err, result) => {
        if (err) return next(new ErrorResponse('DB error adding location', 500));
        res.status(201).json({ message: 'Location added successfully', id: result.insertId });
    });
};

export const addDepartment = (req, res, next) => {
    const { name } = req.body;
    db.query('INSERT INTO departments (name) VALUES (?)', [name], (err, result) => {
        if (err) return next(new ErrorResponse('DB error adding department', 500));
        res.status(201).json({ message: 'Department added successfully', id: result.insertId });
    });
};

export const addCategory = (req, res, next) => {
    const { name, department_id, urgency } = req.body;
    db.query('INSERT INTO categories (name, department_id, urgency) VALUES (?, ?, ?)', [name, department_id, urgency], (err, result) => {
        if (err) return next(new ErrorResponse('DB error adding category', 500));
        res.status(201).json({ message: 'Category added successfully', id: result.insertId });
    });
};

// --- NEW DELETE HANDLERS ---
export const deleteDepartment = createDeleteHandler('departments', 'Department');
export const deleteLocation = createDeleteHandler('locations', 'Location');
export const deleteCategory = createDeleteHandler('categories', 'Category');
export const deleteApprovingAuthority = createDeleteHandler('approving_authorities', 'Approving Authority');
export const deleteOfficeBearer = createDeleteHandler('office_bearers', 'Office Bearer');