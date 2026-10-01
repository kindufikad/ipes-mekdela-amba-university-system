import { useEffect, useMemo, useState } from 'react';
import { deanApi } from '../services/api';
import { useEvaluation } from '../context/useEvaluation';

const round = (value) => Number(Number(value || 0).toFixed(2));

const calculateWeightedDepartmentHeadScore = (row = {}) => {
  const studentAverage = Number(row.student_average ?? row.studentScore ?? 0);
  const deptHeadAverage = Number(row.dept_head_average ?? row.department_head_average ?? row.dept_head_score ?? 0);
  const peerAverage = Number(row.peer_average ?? row.peerScore ?? 0);
  const rawHasAssignedCourse = row.hasCourseAssigned ?? row.has_course_assigned ?? row.has_assigned_course ?? row.hasAssignedCourse ?? '1';
  const hasAssignedCourse = String(rawHasAssignedCourse).toLowerCase() !== 'false' && String(rawHasAssignedCourse) !== '0' && Number(rawHasAssignedCourse) !== 0;
  const persistedFinalScore = Number(row.final_score ?? row.total_score ?? row.totalWeightedScore ?? row.score ?? 0);

  const normalizedDeptHead = row.dept_head_is_normalized
    ? Math.min(deptHeadAverage, 100)
    : deptHeadAverage <= 30
      ? (deptHeadAverage / 30) * 100
      : Math.min(deptHeadAverage, 100);
  const normalizedPeer = peerAverage <= 100 ? peerAverage : Math.min(peerAverage, 100);

  const fallbackWeightedScore = hasAssignedCourse
    ? ((studentAverage * 0.5) + (normalizedDeptHead * 0.3) + (normalizedPeer * 0.2))
    : ((normalizedDeptHead * 0.6) + (normalizedPeer * 0.4));

  const weightedScore = persistedFinalScore > 0 ? persistedFinalScore : fallbackWeightedScore;

  return {
    studentAverage,
    deptHeadAverage,
    peerAverage,
    normalizedDeptHead,
    normalizedPeer,
    hasAssignedCourse,
    weightedScore: round(weightedScore),
    warning: hasAssignedCourse ? '' : 'Student evaluation is excluded because no course was assigned for this semester.',
  };
};

const DeanEvaluationTrackingPanel = () => {
  const [allRows, setAllRows] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [selectedDepartmentHeadId, setSelectedDepartmentHeadId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { refreshVersion } = useEvaluation();

  useEffect(() => {
    let mounted = true;
    const loadTracking = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const [trackingResponse, departmentHeadResponse] = await Promise.all([
          deanApi.getEvaluationTracking(),
          deanApi.getDepartmentHeadsForEvaluation(),
        ]);

        if (!mounted) return;
        setAllRows(Array.isArray(trackingResponse) ? trackingResponse : []);
        setDepartmentHeads(Array.isArray(departmentHeadResponse) ? departmentHeadResponse : []);
      } catch (requestError) {
        if (!mounted) return;
        setAllRows([]);
        setDepartmentHeads([]);
        setError(requestError?.message || 'Unable to load evaluation tracking.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadTracking();
    return () => { mounted = false; };
  }, [refreshVersion]);

  const filteredRows = useMemo(() => {
    if (selectedDepartmentHeadId === 'all') return allRows;

    const selectedHead = departmentHeads.find((head) => String(head.department_head_id ?? head.instructor_id) === String(selectedDepartmentHeadId));
    if (!selectedHead) return allRows;

    const targetDepartment = selectedHead.department || selectedHead.department_name || '';
    const targetName = selectedHead.department_head_name || selectedHead.name || '';

    return allRows.filter((row) => {
      const departmentMatches = !targetDepartment || row.department === targetDepartment;
      const headMatches = !targetName || row.department_head_name === targetName;
      return departmentMatches || headMatches;
    });
  }, [allRows, departmentHeads, selectedDepartmentHeadId]);

  const handleFetch = async () => {
    setFetching(true);
    setError('');
    setMessage('');

    try {
      const data = await deanApi.getEvaluationTracking();
      const nextRows = Array.isArray(data) ? data : [];
      setAllRows(nextRows);

      if (!nextRows.length) {
        setMessage('No evaluation tracking results are available for your college right now.');
      } else {
        setMessage('Evaluation tracking data refreshed successfully.');
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to refresh evaluation tracking.');
    } finally {
      setFetching(false);
    }
  };

  const handlePublish = () => {
    const visibleCount = filteredRows.length;
    if (!visibleCount) {
      setMessage('There are no rows ready to publish yet.');
      return;
    }

    const total = filteredRows.reduce((sum, row) => sum + calculateWeightedDepartmentHeadScore(row).weightedScore, 0);
    const averageFinalScore = visibleCount ? total / visibleCount : 0;
    setMessage(`Final results calculated for ${visibleCount} department head record(s). Average final score: ${round(averageFinalScore).toFixed(2)}%.`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Evaluation Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Track completion, weighted department-head scores, and final totals across your college.</p>
        </div>

        <div className="flex w-full flex-col gap-3 md:max-w-xl md:flex-row md:items-end">
          <label className="block flex-1">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Department Head</span>
            <select
              value={selectedDepartmentHeadId}
              onChange={(event) => setSelectedDepartmentHeadId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">All Department Heads</option>
              {departmentHeads.map((head) => (
                <option key={`${head.department_head_id ?? head.instructor_id ?? head.department ?? head.department_head_name}`} value={String(head.department_head_id ?? head.instructor_id ?? head.department ?? head.department_head_name)}>
                  {head.department_head_name || head.name || 'Department Head'}
                  {head.department ? ` - ${head.department}` : ''}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {fetching ? 'Fetching...' : 'Fetch Data'}
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Department Head</th>
              <th className="px-4 py-3">Completion</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Dept. Head</th>
              <th className="px-4 py-3">Peer</th>
              <th className="px-4 py-3">Final Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading evaluation tracking...</td>
              </tr>
            ) : filteredRows.length ? filteredRows.map((row) => {
              const summary = calculateWeightedDepartmentHeadScore(row);
              return (
                <tr key={`${row.instructor_id ?? row.department_head_id ?? row.department_id ?? row.department_head_name}`}>
                  <td className="px-4 py-4 font-medium text-slate-900">{row.department || 'Unassigned Department'}</td>
                  <td className="px-4 py-4 text-slate-700">{row.department_head_name || '—'}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${Number(row.completion_rate ?? 0) >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.completed_evaluations ?? 0}/{row.total_instructors ?? 0} ({Number(row.completion_rate ?? 0).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {String(row.hasCourseAssigned ?? row.has_course_assigned ?? row.has_assigned_course ?? '1') === '0' || String(row.hasCourseAssigned ?? row.has_course_assigned ?? row.has_assigned_course ?? '1') === 'false'
                      ? 'N/A'
                      : `${summary.studentAverage.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{summary.deptHeadAverage.toFixed(2)}</td>
                  <td className="px-4 py-4 text-slate-700">{summary.peerAverage.toFixed(2)}</td>
                  <td className="px-4 py-4 font-bold text-blue-700">{summary.weightedScore.toFixed(1)}%</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" className="px-4 py-10 text-center text-slate-500">No evaluation tracking data is available for this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">Final results status</p>
            <p className="mt-1 text-sm text-blue-700">
              {filteredRows.length
                ? `${filteredRows.length} department-head record(s) are ready for calculation.`
                : 'No department-head records are available for final publishing.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!filteredRows.length}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Calculate & Publish Final Results
          </button>
        </div>
      </div>
    </section>
  );
};

export default DeanEvaluationTrackingPanel;
