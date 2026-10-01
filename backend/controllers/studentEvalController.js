const pool = require('../config/db');

const getConsolidatedStudentScore = async (req, res) => {
  try {
    const instructorId = Number(req.params.instructorId);
    const academicYear = String(req.query.academicYear || '2026 E.C').trim();
    const semester = String(req.query.semester || 'Semester I').trim();

    if (!Number.isInteger(instructorId) || instructorId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid instructor id is required.' });
    }

    // Student submissions are linked to an instructor through their dispatch assignment.
    // This aggregates every course, section, year level, and department in the term.
    const [rows] = await pool.query(
      `SELECT
         ca.instructor_id,
         COALESCE(ed.academic_year, ca.academic_year) AS academic_year,
         COALESCE(ed.semester, ca.semester) AS semester,
         COUNT(DISTINCT ses.id) AS total_students_evaluated,
         COUNT(DISTINCT ca.course_id) AS total_courses_taught,
         AVG(ses.score) AS overall_raw_score
       FROM student_evaluation_submissions ses
       INNER JOIN evaluation_dispatches ed ON ed.id = ses.dispatch_id
       INNER JOIN course_assignments ca ON ca.id = ed.assignment_id
       WHERE ca.instructor_id = ?
         AND LOWER(COALESCE(ed.target_type, 'instructor')) = 'instructor'
         AND LOWER(COALESCE(ses.status, 'submitted')) IN ('submitted', 'completed', 'approved', 'published')
         AND COALESCE(ed.academic_year, ca.academic_year) = ?
         AND COALESCE(ed.semester, ca.semester) = ?
       GROUP BY ca.instructor_id,
         COALESCE(ed.academic_year, ca.academic_year),
         COALESCE(ed.semester, ca.semester)`,
      [instructorId, academicYear, semester]
    );

    const summary = rows[0] || {};
    const rawScore = Number(Number(summary.overall_raw_score || 0).toFixed(2));
    const weightedContribution = Number((rawScore * 0.5).toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        instructorId,
        academicYear,
        semester,
        totalCoursesTaught: Number(summary.total_courses_taught || 0),
        totalEvaluationsSubmitted: Number(summary.total_students_evaluated || 0),
        studentRawPercentage: rawScore.toFixed(2),
        studentWeightedScore: weightedContribution.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Error aggregating student evaluations:', error);
    return res.status(500).json({ success: false, message: 'Server error during score aggregation' });
  }
};

module.exports = { getConsolidatedStudentScore };