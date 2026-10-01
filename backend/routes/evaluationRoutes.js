const express = require('express');
const pool = require('../config/db');
const {
  submitDepartmentHeadEvaluation,
  submitStudentEvaluation,
  getActiveEvaluationForms,
  publishEvaluationForm,
  autoExpireForms,
  getPerformanceWithStudentEvaluations,
  getInstructorEvaluationDetails,
} = require('../controllers/evaluationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getConsolidatedStudentScore } = require('../controllers/studentEvalController');

const router = express.Router();

/**
 * Department Head Evaluation Submission
 * POST /api/evaluations/submit
 * Supports both Instructor and Lab Assistant targets
 */
router.post(
  '/submit',
  authenticateToken,
  authorizeRoles('dept_head', 'admin'),
  submitDepartmentHeadEvaluation
);

/**
 * Student Course Evaluation Submission
 * POST /api/evaluations/submit-student
 * Routes to BOTH Instructor and Lab Assistant if assigned
 */
router.post(
  '/submit-student',
  authenticateToken,
  authorizeRoles('student'),
  submitStudentEvaluation
);

/**
 * Get Active Evaluation Forms
 * GET /api/evaluations/active-forms
 * Returns only non-expired forms
 */
router.get(
  '/active-forms',
  authenticateToken,
  getActiveEvaluationForms
);

router.get('/active-deadline', authenticateToken, authorizeRoles('student', 'instructor', 'lab_assistant', 'dept_head', 'dean', 'college_dean', 'academic_director', 'directorate', 'admin'), async (req, res) => {
  const departmentId = Number(req.user?.department_id || req.user?.departmentId || req.user?.department || 0);
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS evaluation_periods (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      academic_year VARCHAR(64) NOT NULL,
      semester VARCHAR(64) NOT NULL,
      deadline DATETIME NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      updated_by INT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_evaluation_period_term (academic_year, semester),
      INDEX idx_evaluation_period_status (status, deadline)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [[period]] = await pool.query('SELECT deadline FROM evaluation_periods WHERE status = \'active\' ORDER BY id DESC LIMIT 1');
    if (period?.deadline) return res.json({ deadlineAt: period.deadline, autoLock: new Date(period.deadline).getTime() > Date.now() });
    if (!departmentId) return res.json({ deadlineAt: null, autoLock: true });
    const [[settings]] = await pool.query('SELECT deadline_at, auto_lock FROM evaluation_deadline_settings WHERE department_id = ? LIMIT 1', [departmentId]);
    if (settings?.deadline_at) return res.json({ deadlineAt: settings.deadline_at, autoLock: settings.auto_lock !== 0 });
    const [[dispatch]] = await pool.query(`SELECT deadline FROM evaluation_dispatches WHERE department_id = ? AND deadline IS NOT NULL AND LOWER(COALESCE(status, 'pending')) IN ('pending', 'active', 'published') ORDER BY id DESC LIMIT 1`, [departmentId]);
    return res.json({ deadlineAt: dispatch?.deadline || null, autoLock: true });
  } catch (error) {
    console.error('Active evaluation deadline fetch failed:', error);
    return res.status(500).json({ message: 'Unable to load active evaluation deadline.' });
  }
});

/**
 * Publish Evaluation Form (3-day expiration)
 * POST /api/evaluations/publish-form
 * Sets expires_at to NOW + 72 hours
 */
router.post(
  '/publish-form',
  authenticateToken,
  authorizeRoles('dept_head', 'dean', 'academic_director', 'admin'),
  publishEvaluationForm
);

/**
 * Auto-Expire Forms (Cron Job)
 * GET /api/evaluations/auto-expire
 * Called by scheduled task or middleware to mark expired forms as inactive
 */
router.get(
  '/auto-expire',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    const result = await autoExpireForms();
    res.json(result);
  }
);

/**
 * Get Performance with Student Evaluations
 * GET /api/evaluations/performance
 * Returns combined student and department head evaluation scores
 */
router.get(
  '/performance',
  authenticateToken,
  getPerformanceWithStudentEvaluations
);

router.get(
  '/instructor-details/:instructorId',
  authenticateToken,
  authorizeRoles('dept_head'),
  getInstructorEvaluationDetails
);

/**
 * Get one student-evaluation aggregate across all instructor assignments in a term
 * GET /api/evaluations/consolidated-student-score/:instructorId
 */
router.get(
  '/consolidated-student-score/:instructorId',
  authenticateToken,
  authorizeRoles('instructor', 'dept_head', 'college_dean', 'dean', 'academic_director', 'directorate', 'admin'),
  getConsolidatedStudentScore
);

module.exports = router;
