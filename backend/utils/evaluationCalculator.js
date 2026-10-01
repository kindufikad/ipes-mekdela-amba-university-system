const pool = require('../config/db');

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const calculateAndSaveInstructorResult = async (instructorId, academicYear, semester, database = pool) => {
  const resolvedInstructorId = Number(instructorId);
  const resolvedAcademicYear = String(academicYear || new Date().getFullYear());
  const resolvedSemester = String(semester || '');

  if (!resolvedInstructorId) return null;

  const [[instructor]] = await database.query(
    'SELECT department_id, user_id FROM instructors WHERE id = ? LIMIT 1',
    [resolvedInstructorId]
  );
  if (!instructor) return null;

  const [[studentRow]] = await database.query(
        `SELECT COALESCE(AVG(ses.score), 0) AS student_average,
          COUNT(DISTINCT ses.id) AS total_students_evaluated_count
     FROM student_evaluation_submissions ses
     INNER JOIN evaluation_dispatches ed ON ed.id = ses.dispatch_id
     INNER JOIN course_assignments ca ON ca.id = ed.assignment_id
     WHERE ca.instructor_id = ?
       AND LOWER(COALESCE(ed.target_type, 'instructor')) = 'instructor'
       AND LOWER(COALESCE(ses.status, 'submitted')) IN ('submitted', 'completed', 'approved')
       AND (? = '' OR ed.academic_year = ?)
       AND (? = '' OR ed.semester = ?)`,
    [resolvedInstructorId, resolvedAcademicYear, resolvedAcademicYear, resolvedSemester, resolvedSemester]
  );

  const [[deptHeadRow]] = await database.query(
    `SELECT COALESCE(AVG(dhe.total_score), 0) AS dept_head_average,
            COUNT(DISTINCT dhe.id) AS total_dept_head_evaluated_count
     FROM dept_head_evaluations dhe
     WHERE (dhe.evaluatee_id = ? OR dhe.instructor_id = ?)
       AND LOWER(COALESCE(dhe.target_role, 'instructor')) IN ('instructor', 'dept_head', 'department_head', 'depthead')
       AND LOWER(COALESCE(dhe.status, 'pending')) IN ('submitted', 'completed', 'approved')
       AND (? = '' OR dhe.academic_year = ?)
       AND (? = '' OR dhe.semester = ?)`,
    [resolvedInstructorId, resolvedInstructorId, resolvedAcademicYear, resolvedAcademicYear, resolvedSemester, resolvedSemester]
  );

  const [[peerRow]] = await database.query(
        `SELECT COALESCE(AVG(pes.score), 0) AS peer_average,
          COUNT(DISTINCT pes.id) AS total_peers_evaluated_count
     FROM peer_evaluation_submissions pes
     INNER JOIN peer_evaluations pe ON pe.id = pes.peer_evaluation_id
     LEFT JOIN evaluation_dispatches ed ON ed.id = pe.dispatch_id
     WHERE pe.evaluatee_id = ?
       AND LOWER(COALESCE(pes.status, 'submitted')) IN ('submitted', 'completed', 'approved')
       AND (pe.dispatch_id IS NULL OR (? = '' OR ed.academic_year = ?))
       AND (pe.dispatch_id IS NULL OR (? = '' OR ed.semester = ?))`,
    [resolvedInstructorId, resolvedAcademicYear, resolvedAcademicYear, resolvedSemester, resolvedSemester]
  );

  const studentAverage = Number(toNumber(studentRow?.student_average).toFixed(2));
  const totalStudentsEvaluatedCount = Number(studentRow?.total_students_evaluated_count || 0);
  const deptHeadScore = Number(toNumber(deptHeadRow?.dept_head_average).toFixed(2));
  const peerAverage = Number(toNumber(peerRow?.peer_average).toFixed(2));
  const totalPeersEvaluatedCount = Number(peerRow?.total_peers_evaluated_count || 0);
  const deptHeadPercentage = deptHeadScore > 0 && deptHeadScore <= 30
    ? (deptHeadScore / 30) * 100
    : deptHeadScore;
  const totalScore = Number((studentAverage * 0.5 + deptHeadPercentage * 0.3 + peerAverage * 0.2).toFixed(2));

  await database.query(
    `INSERT INTO evaluation_results
       (instructor_id, department_id, academic_year, semester,
        student_average, student_score, peer_average, peer_score,
        dept_head_score, total_score, final_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       instructor_id = VALUES(instructor_id),
       academic_year = VALUES(academic_year),
       semester = VALUES(semester),
       department_id = VALUES(department_id),
       student_average = VALUES(student_average),
       student_score = VALUES(student_score),
       peer_average = VALUES(peer_average),
       peer_score = VALUES(peer_score),
       dept_head_score = VALUES(dept_head_score),
       total_score = VALUES(total_score),
       final_score = VALUES(final_score),
       published_at = CURRENT_TIMESTAMP`,
    [
      resolvedInstructorId,
      instructor.department_id,
      resolvedAcademicYear,
      resolvedSemester,
      studentAverage,
      studentAverage,
      peerAverage,
      peerAverage,
      deptHeadScore,
      totalScore,
      totalScore,
    ]
  );

  return {
    instructor_id: resolvedInstructorId,
    academic_year: resolvedAcademicYear,
    semester: resolvedSemester,
    student_average: studentAverage,
    student_weighted: Number((studentAverage * 0.5).toFixed(2)),
    dept_head_score: deptHeadScore,
    dept_head_weighted: Number((deptHeadPercentage * 0.3).toFixed(2)),
    peer_average: peerAverage,
    peer_weighted: Number((peerAverage * 0.2).toFixed(2)),
    total_students_evaluated_count: totalStudentsEvaluatedCount,
    total_peers_evaluated_count: totalPeersEvaluatedCount,
    total_dept_head_evaluated_count: Number(deptHeadRow?.total_dept_head_evaluated_count || 0),
    total_score: totalScore,
    final_score: totalScore,
  };
};

module.exports = { calculateAndSaveInstructorResult };