import express from 'express';
import multer from 'multer';
import {
    listDepartments,
    listLocations,
    listCategories,
    submitGrievance,
    trackGrievance,
    getGrievancesByDepartment,
    listWorkersByDepartment,
    addNewWorker,
    assignGrievance,
    resolveGrievance,
    getEscalatedGrievances,
    revertGrievance,
    addOfficeBearer,
    getAllGrievancesForAdmin,
    getAdminDashboardStats,
    getLevel2Grievances,
    revertToLevel1,
    addApprovingAuthority,
    addLocation,
    addDepartment,
    addCategory,
    getUserGrievanceHistory,
    transferGrievance,
    getAllOfficeBearers,
    deleteOfficeBearer,
    getAllAuthorities,
    deleteApprovingAuthority,
    deleteLocation,
    deleteDepartment,
    getAllCategories,
    deleteCategory
} from '../controllers/grievanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.use(protect);


router.get('/history/:email', getUserGrievanceHistory);
router.post('/submit', upload.single('attachment'), submitGrievance);
router.get('/track/:ticket_id(.*)', trackGrievance);
router.get('/departments', listDepartments);
router.get('/locations', listLocations);
router.get('/categories/:deptId', listCategories);

router.get('/department/:departmentId', getGrievancesByDepartment);
router.get('/workers/:departmentId', listWorkersByDepartment);
router.post('/workers', addNewWorker);
router.put('/:ticketId(.*)/assign', assignGrievance);
router.put('/:ticketId(.*)/resolve', resolveGrievance);


router.get('/escalated', getEscalatedGrievances);
router.put('/revert/:ticketId(.*)', revertGrievance);
router.post('/add-office-bearer', addOfficeBearer);
router.put('/transfer', transferGrievance);


router.get('/office-bearers', getAllOfficeBearers);
router.delete('/office-bearer/:id', deleteOfficeBearer);



router.get('/admin/all', getAllGrievancesForAdmin);
router.get('/admin/stats', getAdminDashboardStats);
router.get('/admin/escalated-level2', getLevel2Grievances);
router.put('/admin/revert-to-level-1/:ticketId(.*)', revertToLevel1);


router.post('/admin/add-authority', addApprovingAuthority);
router.post('/admin/add-location', addLocation);
router.post('/admin/add-department', addDepartment);
router.post('/admin/add-category', addCategory);


router.get('/admin/all-authorities', getAllAuthorities);
router.delete('/admin/authority/:id', deleteApprovingAuthority);

router.get('/admin/all-categories', getAllCategories); // To list all for deletion
router.delete('/admin/category/:id', deleteCategory);

router.delete('/admin/department/:id', deleteDepartment);
router.delete('/admin/location/:id', deleteLocation);


export default router;