import { useEffect, useState } from 'react';
import { directorateApi } from '../services/api';

const formatPercent = (value) => value == null ? 'N/A' : `${Number(value).toFixed(2)}%`;

const componentMeta = [
  { key: 'peer', label: 'Peer Evaluation', color: 'emerald' },
  { key: 'dean', label: 'College Deans Evaluation', color: 'blue' },
  { key: 'student', label: 'Student Evaluation', color: 'amber' },
];

const MyPerformancePanel = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadPerformance = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await directorateApi.getMyPerformance();
        if (mounted) setReport(data || {});
      } catch (loadError) {
        if (mounted) {
          setReport({});
          setError(loadError?.message || 'Unable to load your performance.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadPerformance();
    return () => { mounted = false; };
  }, []);

  if (loading) return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your performance...</section>;
  if (error) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</section>;

  const components = report?.components || {};
  const details = report?.details || {};
  const isComplete = report?.isComplete === true;
  const totalScore = report?.totalScore;

  return (
    <section className="space-y-6" aria-labelledby="director-performance-title">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Academic Directorate</p>
        <h2 id="director-performance-title" className="mt-2 text-2xl font-bold text-slate-900">My Performance</h2>
        <p className="mt-1 text-sm text-slate-500">Your weighted evaluation summary and supporting feedback.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Weighted Score</p>
            <p className={`mt-1 text-4xl font-bold ${isComplete ? 'text-blue-700' : 'text-slate-500'}`}>{isComplete ? formatPercent(totalScore) : 'Pending'}</p>
            <p className="mt-1 text-xs text-slate-500">{report?.status || 'Pending Complete Evaluation'}</p>
          </div>
          <div className="h-3 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(Math.max(Number(totalScore) || 0, 0), 100)}%` }} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {componentMeta.map(({ key, label, color }) => {
          const component = components[key] || {};
          const maxWeight = component.maxWeight || (key === 'peer' ? 20 : key === 'dean' ? 30 : 50);
          const tone = color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-blue-700';
          return (
            <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-slate-900">{label}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">/{maxWeight}%</span>
              </div>
              <p className={`mt-5 text-3xl font-bold ${tone}`}>{component.isNA ? 'N/A' : formatPercent(component.rawScore)}</p>
              <p className="mt-1 text-sm text-slate-500">{component.isNA ? 'Not applicable' : `${component.count || 0} evaluation${component.count === 1 ? '' : 's'}`}</p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-500">Weighted contribution</p>
                <p className="text-xl font-bold text-slate-900">{formatPercent(component.weightedScore)}</p>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Evaluation Details and Feedback</h3>
        <div className="mt-4 space-y-3">
          {componentMeta.map(({ key, label }) => {
            const rows = Array.isArray(details[key]) ? details[key] : [];
            return (
              <details key={key} className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer font-semibold text-slate-800">{label} ({rows.length})</summary>
                {rows.length ? <div className="mt-4 space-y-3">{rows.map((row, index) => <div key={`${key}-${index}`} className="border-t border-slate-100 pt-3 text-sm"><p className="font-semibold text-slate-900">Score: {formatPercent(row.score)}{row.evaluator ? ` - ${row.evaluator}` : ''}</p>{row.strengths ? <p className="mt-1 text-slate-600">Strengths: {row.strengths}</p> : null}{row.suggestions ? <p className="mt-1 text-slate-600">Suggestions: {row.suggestions}</p> : null}{row.weaknesses ? <p className="mt-1 text-slate-600">Areas for improvement: {row.weaknesses}</p> : null}{row.feedback ? <p className="mt-1 text-slate-600">Feedback: {row.feedback}</p> : null}</div>)}</div> : <p className="mt-3 text-sm text-slate-500">No submitted evaluations are available yet.</p>}
              </details>
            );
          })}
        </div>
      </section>
    </section>
  );
};

export default MyPerformancePanel;
