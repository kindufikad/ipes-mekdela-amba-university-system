import { useEffect, useState } from 'react';
import { evaluationApi } from '../services/api';

const formatScore = (value) => `${Number(value || 0).toFixed(1)}%`;

const DeptHeadPerformanceDashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadPerformance = async () => {
      try {
        const data = await evaluationApi.getDeptHeadPerformance();
        if (mounted) setReport(data || {});
      } catch (loadError) {
        if (mounted) setError(loadError?.message || 'Unable to load performance dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadPerformance();
    return () => { mounted = false; };
  }, []);

  if (loading) return <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading performance dashboard...</section>;
  if (error) return <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{error}</section>;

  const strengths = report?.strengths || report?.feedback?.strengths || [];
  const weaknesses = report?.weaknesses || report?.feedback?.improvements || [];
  const breakdown = report?.breakdown || {};
  const isComplete = report?.isComplete === true;
  const breakdownItems = [
    { key: 'student', label: 'Student Evaluation', weight: '50%' },
    { key: 'deptHead', label: 'Dean / Dept. Head Evaluation', weight: '30%' },
    { key: 'peer', label: 'Peer Evaluation', weight: '20%' },
  ];
  const hasAssignedCourse = report?.hasAssignedCourse !== false;
  const displayBreakdownItems = hasAssignedCourse ? breakdownItems : [
    { key: 'student', label: 'Student Evaluation', weight: '0%' },
    { key: 'deptHead', label: 'Dean / Dept. Head Evaluation', weight: '60%' },
    { key: 'peer', label: 'Peer Evaluation', weight: '40%' },
  ];

  return (
    <section className="space-y-6" aria-labelledby="dept-head-performance-title">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div><p className="text-sm font-medium text-gray-500">Total Weighted Evaluation Score</p><p id="dept-head-performance-title" className={`mt-1 text-4xl font-bold ${isComplete ? 'text-ieps-blue-700' : 'text-slate-500'}`}>{isComplete ? formatScore(report?.totalWeightedScore) : 'Pending'}</p><p className="mt-1 text-xs text-gray-500">100% total weight</p></div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isComplete ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{isComplete ? (report?.status || 'Completed') : 'Pending Complete Evaluation'}</span>
        </div>
        {!isComplete && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Total score will be published after the Department Head evaluation and incoming peer evaluation are recorded.</div>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {displayBreakdownItems.map((item) => {
          const score = breakdown[item.key] || {};
          const rawValue = item.key === 'student' && !hasAssignedCourse ? 'N/A' : formatScore(score.rawPercentage);
          const contributionValue = item.key === 'student' && !hasAssignedCourse ? '0.0%' : formatScore(score.weightedContribution);
          return <section key={item.key} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-gray-900">{item.label}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item.weight} weight</span></div><p className="mt-4 text-3xl font-bold text-ieps-blue-700">{rawValue}</p><p className="mt-1 text-sm text-gray-500">{item.key === 'student' && !hasAssignedCourse ? 'N/A - No Course Assigned' : 'Raw percentage'}</p><div className="mt-4 border-t border-gray-100 pt-3"><p className="text-sm text-gray-500">Weighted contribution</p><p className="text-xl font-bold text-gray-900">{contributionValue}</p></div></section>;
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6"><h3 className="mb-4 text-lg font-bold text-emerald-800">Strengths &amp; Positive Highlights</h3><ul className="space-y-3 text-sm text-emerald-950">{strengths.length ? strengths.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span>•</span><span>{item}</span></li>) : <li>No strengths have been recorded yet.</li>}</ul></section>
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6"><h3 className="mb-4 text-lg font-bold text-amber-800">Areas for Improvement</h3><ul className="space-y-3 text-sm text-amber-950">{weaknesses.length ? weaknesses.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span>•</span><span>{item}</span></li>) : <li>No improvement areas have been recorded yet.</li>}</ul></section>
      </div>
    </section>
  );
};

export default DeptHeadPerformanceDashboard;
