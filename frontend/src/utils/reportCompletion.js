export const getReportCompletion = (row = {}) => {
  const studentScore = Number(row.student_raw_score ?? row.studentRaw ?? row.student_score ?? row.studentScore ?? row.student_average ?? 0);
  const studentCount = Number(row.student_count ?? row.total_student_evaluators ?? row.total_students_evaluated_count ?? row.student_eval_count ?? 0);
  const peerScore = Number(row.peer_raw_score ?? row.peerRaw ?? row.peer_score ?? row.peerScore ?? row.peer_average ?? 0);
  const peerCount = Number(row.peer_count ?? row.total_peer_evaluators ?? row.total_peers_evaluated_count ?? row.peer_eval_count ?? 0);
  const deptHeadScore = Number(row.dept_head_raw_score ?? row.deptHeadRaw ?? row.dept_head_score ?? row.deptHeadScore ?? row.dept_head_average ?? 0);
  const deptHeadFlag = row.dept_head_submitted ?? row.deptHeadSubmitted ?? row.hasDeptHeadEval;
  const deptHeadSubmitted = deptHeadFlag === true
    || deptHeadFlag === 1
    || deptHeadFlag === '1'
    || String(deptHeadFlag || '').toLowerCase() === 'true'
    || String(row.dept_head_status ?? row.deptHeadStatus ?? '').toLowerCase() === 'submitted'
    || Number(row.total_dept_head_evaluators ?? row.dept_head_eval_count ?? 0) > 0;
  const rawCourseAssigned = row.has_assigned_courses ?? row.hasCourseAssigned ?? row.hasAssignedCourse ?? row.has_course_assigned ?? row.has_assigned_course ?? row.courseCount ?? row.course_count;
  const hasCourseAssigned = rawCourseAssigned === undefined
    ? true
    : String(rawCourseAssigned).toLowerCase() !== 'false'
      && String(rawCourseAssigned) !== '0'
      && Number(rawCourseAssigned) !== 0;
  const hasStudentEval = !hasCourseAssigned || row.hasStudentEval === true || studentScore > 0 || studentCount > 0;
  const hasDeptHeadEval = row.hasDeptHeadEval === true || deptHeadScore > 0 || deptHeadSubmitted;
  const hasPeerEval = row.hasPeerEval === true || peerScore > 0 || peerCount > 0;
  const finalScore = Number(row.final_score ?? row.finalScore ?? row.total_score ?? row.totalScore);
  const hasValidFinalScore = Number.isFinite(finalScore) && finalScore > 0;
  const targetRole = String(row.role ?? row.target_role ?? '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const isExecutiveReport = row.report_type === 'executive' || ['dean', 'college_dean'].includes(targetRole);
  const missing = [];

  if (!hasStudentEval) missing.push('Student Evaluation is pending');
  if (!hasDeptHeadEval) missing.push('Department Head Evaluation is pending');
  if (!hasPeerEval) missing.push('Peer Evaluation is pending');

  return {
    hasCourseAssigned,
    hasStudentEval,
    hasDeptHeadEval,
    hasPeerEval,
    hasValidFinalScore,
    canPrint: hasValidFinalScore && (isExecutiveReport || (hasStudentEval && hasDeptHeadEval && hasPeerEval)),
    missing: isExecutiveReport && hasValidFinalScore ? [] : missing,
    message: isExecutiveReport && hasValidFinalScore
      ? ''
      : missing.length
        ? `Cannot generate final letter: ${missing.join('; ')}`
        : hasValidFinalScore
          ? ''
          : 'A valid final score is required before printing.',
  };
};
