import mauLogo from '../assets/mau.jpg';
import { formatCollegeName } from '../utils/formatCollegeName';

const labels = {
  student: 'Evaluation by Students',
  peer: 'Evaluation by Peer Instructors',
  deptHead: 'Evaluation by Department Head',
  directorate: 'Evaluation by Academic Directorate',
};

const normalizeDepartmentHeadScore = (score) => {
  const numeric = Number(score || 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 0 && numeric <= 30) return (numeric / 30) * 100;
  return Math.min(numeric, 100);
};

const formatAcademicYear = (value) => {
  const text = String(value || '').trim();
  if (!text) return '________________';
  if (/\bE\.?\s*C\.?$/i.test(text)) return text.replace(/\s*E\.?\s*C\.?$/i, ' E.C');
  return `${text.split('/')[0]} E.C`;
};

const formatSemester = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('second') || text === 'ii' || text.endsWith(' 2')) return 'Second Semester';
  if (text.includes('first') || text === 'i' || text.endsWith(' 1')) return 'First Semester';
  return value || '________________';
};

const getGradeClassification = (score) => {
  const numeric = Number(score || 0);
  if (numeric >= 85) return 'Excellent';
  if (numeric >= 75) return 'Very Good';
  if (numeric >= 70) return 'Good';
  if (numeric >= 50) return 'Satisfactory';
  return 'Needs Improvement';
};

const getScoreValue = (...values) => values.find((value) => (
  value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value))
    && Number(value) >= 0
  )) ?? null;

const getComponentRawScore = (rawValues, weightedValues, weight) => {
  const rawScore = getScoreValue(...rawValues);
  if (rawScore !== null) return rawScore;
  const weightedScore = getScoreValue(...weightedValues);
  return weightedScore === null ? 0 : Number(weightedScore) / weight;
};

const OfficialDepartmentReport = ({ departmentName, academicYear, semester, reportRow, reportDate, departmentHeadName, evaluatorLabel = labels.deptHead, reportType = 'department' }) => {
  const row = reportRow || {};
  const rawDepartmentName = departmentName || row.department_name || '';
  const normalizedDepartmentName = String(rawDepartmentName).replace(/^Department of\s+/i, '').trim() || '________________';
  const roleValue = row.user_role || row.designation || row.role || row.target_role;
  const normalizedRole = String(roleValue || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const roleTitles = {
    instructor: 'Instructor',
    lab_assistant: 'Lab Assistant',
    dept_head: 'Department Head',
    department_head: 'Department Head',
    depthead: 'Department Head',
    college_dean: 'College Dean',
    dean: 'College Dean',
    academic_director: 'Academic Director',
    academic_directorate: 'Academic Directorate',
    directorate: 'Academic Directorate',
  };
  const roleLabel = roleTitles[normalizedRole] || String(roleValue || 'Instructor').trim();
  const normalizeReportDeptHeadScore = roleLabel === 'Lab Assistant'
    ? (score) => Number(score || 0)
    : normalizeDepartmentHeadScore;
  const rawCourseAssigned = row.has_assigned_courses ?? row.hasCourseAssigned ?? row.hasAssignedCourse ?? row.has_course_assigned ?? row.has_assigned_course ?? row.courseCount ?? row.course_count;
  const hasCourseAssigned = rawCourseAssigned === undefined
    ? true
    : String(rawCourseAssigned).toLowerCase() !== 'false'
      && String(rawCourseAssigned) !== '0'
      && Number(rawCourseAssigned) !== 0;
  const weights = hasCourseAssigned
    ? { student: 50, deptHead: 30, peer: 20 }
    : { student: 0, deptHead: 60, peer: 40 };
  const rawScores = {
    student: getComponentRawScore(
      [row.studentRaw, row.student_raw_percentage, row.student_raw_score, row.student_score, row.student_average, row.studentScore],
      [row.studentWeighted, row.student_weighted, row.student_weighted_score],
      0.5
    ),
    peer: getComponentRawScore(
      [row.peerRaw, row.peer_raw, row.raw_peer_score, row.peer_raw_percentage, row.peer_raw_score, row.peer_score, row.peer_average, row.peerScore],
      [row.peerWeighted, row.peer_weighted, row.peer_weighted_score],
      0.2
    ),
    deptHead: getComponentRawScore(
      [row.deptHeadRaw, row.dean_raw, row.raw_dean_score, row.dept_head_raw_percentage, row.dept_head_raw_score, row.dept_head_score, row.dept_head_average, row.deptHeadScore],
      [row.deptHeadWeighted, row.dept_head_weighted, row.dept_head_weighted_score],
      0.3
    ),
    directorate: getComponentRawScore(
      [row.directorateRaw, row.directorate_score, row.directorateScore, row.academic_directorate_score],
      [row.directorateWeighted, row.directorate_weighted],
      weights.deptHead / 100
    ),
  };
  const normalizedDeptHead = Number(normalizeReportDeptHeadScore(rawScores.deptHead).toFixed(2));
  const weightedRow = (key, label, weight, value) => ({
    key,
    label,
    weight,
    value: Number(value.toFixed(2)),
    contribution: Number((value * weight / 100).toFixed(2)),
  });
  const scoreRows = reportType === 'executive'
    ? hasCourseAssigned
      ? [
        weightedRow('student', labels.student, weights.student, rawScores.student),
        weightedRow('peer', labels.peer, weights.peer, rawScores.peer),
        weightedRow('directorate', labels.directorate, weights.deptHead, rawScores.directorate),
      ]
      : [
        weightedRow('directorate', labels.directorate, weights.deptHead, rawScores.directorate),
        weightedRow('peer', labels.peer, weights.peer, rawScores.peer),
      ]
    : [
      ...(hasCourseAssigned ? [{ key: 'student', label: labels.student, weight: weights.student, value: Number(rawScores.student.toFixed(2)), contribution: Number((rawScores.student * weights.student / 100).toFixed(2)) }] : []),
      { key: 'deptHead', label: evaluatorLabel, weight: weights.deptHead, value: normalizedDeptHead, contribution: Number((normalizedDeptHead * weights.deptHead / 100).toFixed(2)) },
      { key: 'peer', label: labels.peer, weight: weights.peer, value: Number(rawScores.peer.toFixed(2)), contribution: Number((rawScores.peer * weights.peer / 100).toFixed(2)) },
    ];
  const calculatedTotal = scoreRows.reduce((sum, scoreRow) => sum + scoreRow.contribution, 0);
  const finalScore = Number(calculatedTotal.toFixed(2));
  const yearLabel = formatAcademicYear(row.academic_year ?? academicYear);
  const semesterLabel = formatSemester(row.semester ?? semester);
  const instructorName = row.name || row.full_name || row.instructorName || '________________';
  const department = normalizedDepartmentName;
  const collegeName = formatCollegeName(row.college_name) || 'College name unavailable';
  const recipientName = row.recipient_name || instructorName;
  const reference = row.reference_number || row.referenceNumber || '________________';
  const totalScore = finalScore;
  const studentCompletionRate = Number(row.studentCompletionRate ?? row.student_completion_rate ?? 0);
  const deptHeadStatus = String(row.deptHeadStatus ?? row.dept_head_status ?? '').toLowerCase();
  const isEligibleForPrint = totalScore > 0
    || (studentCompletionRate === 100 && deptHeadStatus === 'submitted');

  if (!isEligibleForPrint) {
    return <article className="official-report" aria-label="Incomplete evaluation report"><p>Cannot generate final letter: Evaluation data is incomplete for this instructor.</p></article>;
  }

  return (
  <article className="official-report print-container" aria-label="Official department evaluation report">
    <header className="official-report__header">
      <div className="official-report__brand-mark"><img src={mauLogo} alt="Mekdela Amba University Logo" /></div>
      <div>
        <h1>Mekdela Amba University</h1>
        <p>{collegeName}</p>
        <p>Department of {department}</p>
        <p>{roleLabel}</p>
      </div>
      <div className="official-report__amharic">መቅደላ አምባ ዩኒቨርሲቲ<br />የትምህርት ጥራት ማረጋገጫ</div>
    </header>

    <div className="official-report__rule" />
    <div className="official-report__reference" aria-label="Letter reference and date">
      <span>Ref. No: <strong>{reference}</strong></span>
      <span>Date: <strong>{reportDate || new Date().toLocaleDateString()} / {yearLabel}</strong></span>
    </div>

    <div className="official-report__recipient">
      <p><strong>To: {recipientName}</strong></p>
      <p><strong>Department of {department}</strong></p>
    </div>

    <h2 className="official-report__subject">Subject: To notify {yearLabel} {semesterLabel.toLowerCase()} efficiency evaluation result</h2>
    <p>As try to describe above in the subject, Department of {department} would like to inform you of your {semesterLabel.toLowerCase()} semester efficiency result in {yearLabel} academic year. The summary of the overall evaluation is given in the table below.</p>

    <table className="official-report__table">
      <thead><tr><th>S/No</th><th>Evaluation Type</th><th>Weight (%)</th><th>Raw Score (%)</th><th>Weighted Contribution (%)</th></tr></thead>
      <tbody>
        {scoreRows.map((scoreRow, index) => <tr key={scoreRow.key}><td>{index + 1}</td><td><strong>{scoreRow.label}</strong></td><td>{scoreRow.weight}%</td><td>{scoreRow.value.toFixed(2)}%</td><td>{scoreRow.contribution.toFixed(2)}%</td></tr>)}
        <tr><td colSpan="2" className="official-report__total-label">Total Score</td><td><strong>100%</strong></td><td></td><td><strong>{finalScore.toFixed(2)}%</strong></td></tr>
      </tbody>
    </table>

    <p className="official-report__classification"><strong>Final Grade Classification:</strong> {getGradeClassification(finalScore)} ({finalScore.toFixed(2)}%)</p>

    <p>With best regard!</p>

    <div className="official-report__signature">
      <div><strong>{departmentHeadName || 'Department Head'}</strong><br />Signature: ____________________________<br />Date: ____________________</div>
      <div className="official-report__stamp">MEKDELA AMBA UNIVERSITY<br />DEPT OF {department.toUpperCase()}<br />SEAL</div>
    </div>
    <div className="official-report__cc"><strong>CC:</strong><br />❖ Department of {department}<br />❖ {collegeName}<br />❖ Educational quality and relevance assurance<br />❖ Human Resource Development Directorate</div>
    <footer className="official-report__footer"><span>Department of {department}</span><span>{yearLabel} / {semesterLabel}</span></footer>
  </article>
  );
};

export default OfficialDepartmentReport;
