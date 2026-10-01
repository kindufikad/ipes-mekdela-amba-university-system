const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getAdminDashboardStats, getDepartmentAnalytics, getSecurityLogs, exportSecurityLogs, getDatabaseHealth, getSystemHealth, triggerBackup, updateBackupRetention, updateSystemLock, cleanupSecurityLogs, createCollege, getColleges, getDepartmentsByCollege, getCollegesWithDepartments, getManagementRoleOccupant, assignRoleWithHierarchy, resetManagementRole, resetUserPassword, updateUserByAdmin, toggleUserArchive, deleteUserByAdmin, getRoleCandidates, getLandingContentAdmin, updateLandingContent, deleteLandingContent, getContactSettings, updateContactSetting, updateAdminProfile } = require('../controllers/adminController');
const { getDatabaseHealth: getSystemAdminDatabaseHealth, getSystemHealth: getSystemAdminSystemHealth } = require('../controllers/systemAdminController');
const { changePassword } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendBotBroadcast } = require('../controllers/broadcastController');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'landing');
fs.mkdirSync(uploadDirectory, { recursive: true });
const landingUpload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, callback) => callback(null, uploadDirectory),
		filename: (_req, file, callback) => callback(null, `landing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

router.get('/dashboard-stats', authenticateToken, authorizeRoles('admin', 'systemadmin'), getAdminDashboardStats);
router.get('/department-analytics', authenticateToken, authorizeRoles('admin', 'systemadmin'), getDepartmentAnalytics);
router.get('/security-logs/export', authenticateToken, authorizeRoles('admin', 'systemadmin'), exportSecurityLogs);
router.get('/security-logs', authenticateToken, authorizeRoles('admin', 'systemadmin'), getSecurityLogs);
router.delete('/security-logs', authenticateToken, authorizeRoles('admin', 'systemadmin'), cleanupSecurityLogs);
router.get('/database-health', authenticateToken, authorizeRoles('admin', 'systemadmin'), getSystemAdminDatabaseHealth);
router.get('/system-health', authenticateToken, authorizeRoles('admin', 'systemadmin'), getSystemAdminSystemHealth);
router.post('/trigger-backup', authenticateToken, authorizeRoles('admin', 'systemadmin'), triggerBackup);
router.put('/backup-retention', authenticateToken, authorizeRoles('admin', 'systemadmin'), updateBackupRetention);
router.put('/system-lock', authenticateToken, authorizeRoles('admin', 'systemadmin'), updateSystemLock);
router.put('/profile', authenticateToken, authorizeRoles('admin', 'systemadmin'), updateAdminProfile);
router.put('/change-password', authenticateToken, authorizeRoles('admin', 'systemadmin'), changePassword);
router.get('/colleges', authenticateToken, authorizeRoles('admin', 'systemadmin'), getColleges);
router.get('/colleges-with-departments', authenticateToken, authorizeRoles('admin', 'systemadmin'), getCollegesWithDepartments);
router.get('/departments', authenticateToken, authorizeRoles('admin', 'systemadmin'), getDepartmentsByCollege);
router.post('/colleges', authenticateToken, authorizeRoles('admin', 'systemadmin'), createCollege);
router.get('/management-role-occupant', authenticateToken, authorizeRoles('admin', 'systemadmin'), getManagementRoleOccupant);
router.put('/users/:id/management-role', authenticateToken, authorizeRoles('admin', 'systemadmin'), assignRoleWithHierarchy);
router.put('/users/:id/management-role/reset', authenticateToken, authorizeRoles('admin', 'systemadmin'), resetManagementRole);
router.put('/users/:id/password/reset', authenticateToken, authorizeRoles('admin', 'systemadmin'), resetUserPassword);
router.put('/users/:id', authenticateToken, authorizeRoles('admin', 'systemadmin'), updateUserByAdmin);
router.put('/users/:id/toggle-archive', authenticateToken, authorizeRoles('admin', 'systemadmin'), toggleUserArchive);
router.delete('/users/:id', authenticateToken, authorizeRoles('admin', 'systemadmin'), deleteUserByAdmin);
router.get('/role-candidates', authenticateToken, authorizeRoles('admin', 'systemadmin'), getRoleCandidates);
router.get('/landing-content', authenticateToken, authorizeRoles('admin', 'systemadmin'), getLandingContentAdmin);
router.post('/landing-content/:key', authenticateToken, authorizeRoles('admin', 'systemadmin'), landingUpload.array('files', 10), updateLandingContent);
router.delete('/landing-content/:key', authenticateToken, authorizeRoles('admin', 'systemadmin'), deleteLandingContent);
router.get('/contact-settings', authenticateToken, authorizeRoles('admin', 'systemadmin'), getContactSettings);
router.put('/contact-settings/:key', authenticateToken, authorizeRoles('admin', 'systemadmin'), updateContactSetting);
router.post('/send-bot-broadcast', authenticateToken, authorizeRoles('admin', 'systemadmin'), sendBotBroadcast);

module.exports = router;