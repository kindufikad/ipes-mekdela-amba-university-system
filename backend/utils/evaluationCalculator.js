const pool = require('../config/db');

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getInstructorRoleStatus = async (instructorId, academicYear, semester, database = pool) => {
  const resolvedInstructorId = Number(instructorId);
  if (!Number.isInteger(resolvedInstructorId) || resolvedInstructorId <= 0) {
    throw new TypeError('A valid instructorId is required to determine teaching status.');
  }

  const resolvedAcademicYear = String(academicYear || '').trim();
  const resolvedSemester = String(semester || '').trim();
  const filters = ['instructor_id = ?'];
  const params = [resolvedInstructorId];

  if (resolvedAcademicYear) {
    const academicYearStart = resolvedAcademicYear.split('/')[0];
    filters.push('(academic_year IS NULL OR academic_year = ? OR academic_year = ?)');
    params.push(resolvedAcademicYear, academicYearStart);
  }
  if (resolvedSemester) {
    filters.push('(semester IS NULL OR LOWER(TRIM(semester)) = LOWER(TRIM(?)))');
    params.push(resolvedSemester);
  }

  const [[assignmentStatus]] = await database.query(
    `SELECT COUNT(*) AS assigned_course_count
     FROM course_assignments
     WHERE ${filters.join(' AND ')}`,
    params
  );
  const assignedCourseCount = Number(assignmentStatus?.assigned_course_count || 0);

  return {
    isTeaching: assignedCourseCount > 0,
    assignedCourseCount,
  };
};

const calculateInstructorFinalScore = ({ studentRawScore = 0, peerRawScore = 0, directorateRawScore = 0, isTeaching }) => {
  const student = Math.min(Math.max(toNumber(studentRawScore), 0), 100);
  const peer = Math.min(Math.max(toNumber(peerRawScore), 0), 100);
  const directorate = Math.min(Math.max(toNumber(directorateRawScore), 0), 100);
  const studentContribution = isTeaching ? student * 0.5 : 0;
  const peerContribution = peer * 0.2;
  const directorateContribution = directorate * 0.3;
  const rawSubtotal = Number((peerContribution + directorateContribution).toFixed(2));

  if (isTeaching) {
    return {
      finalScore: Number((studentContribution + rawSubtotal).toFixed(2)),
      role: 'Teaching',
      activeWeight: 100,
      studentContribution: Number(studentContribution.toFixed(2)),
      peerContribution: Number(peerContribution.toFixed(2)),
      directorateContribution: Number(directorateContribution.toFixed(2)),
    };
  }

  return {
    finalScore: Number((rawSubtotal / 50 * 100).toFixed(2)),
    role: 'Non-Teaching',
    activeWeight: 50,
    rawSubtotal,
    studentContribution: 0,
    peerContribution: Number(peerContribution.toFixed(2)),
    directorateContribution: Number(directorateContribution.toFixed(2)),
  };
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
  const roleStatus = await getInstructorRoleStatus(
    resolvedInstructorId,
    resolvedAcademicYear,
    resolvedSemester,
    database
  );

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
  const score = calculateInstructorFinalScore({
    studentRawScore: studentAverage,
    peerRawScore: peerAverage,
    directorateRawScore: deptHeadPercentage,
    isTeaching: roleStatus.isTeaching,
  });
  const totalScore = score.finalScore;

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
    student_weighted: score.studentContribution,
    dept_head_score: deptHeadScore,
    dept_head_weighted: score.directorateContribution,
    peer_average: peerAverage,
    peer_weighted: score.peerContribution,
    role: score.role,
    active_weight: score.activeWeight,
    raw_subtotal: score.rawSubtotal,
    total_students_evaluated_count: totalStudentsEvaluatedCount,
    total_peers_evaluated_count: totalPeersEvaluatedCount,
    total_dept_head_evaluated_count: Number(deptHeadRow?.total_dept_head_evaluated_count || 0),
    total_score: totalScore,
    final_score: totalScore,
  };
};

module.exports = {
  calculateAndSaveInstructorResult,
  getInstructorRoleStatus,
  calculateInstructorFinalScore,
};