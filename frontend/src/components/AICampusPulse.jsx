import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, MapPinned, Sparkles, Users } from 'lucide-react';
import { useTranslation } from '../context/useTranslation';

const CAMPUS_NODES = [
  { id: 'block-a', labelKey: 'blockA', x: 120, y: 100, color: '#2563eb' },
  { id: 'block-b', labelKey: 'blockB', x: 260, y: 105, color: '#0f766e' },
  { id: 'library', labelKey: 'library', x: 390, y: 88, color: '#10b981' },
  { id: 'cafe', labelKey: 'cafe', x: 220, y: 220, color: '#f59e0b' },
  { id: 'admin', labelKey: 'admin', x: 410, y: 250, color: '#7c3aed' },
];

const timeBandProfiles = [
  { start: 8, end: 10, density: 48, mobility: 58, pulse: 18, activityKey: 'morningArrival' },
  { start: 10, end: 12, density: 62, mobility: 78, pulse: 42, activityKey: 'blockActivity' },
  { start: 12, end: 14, density: 70, mobility: 84, pulse: 36, activityKey: 'cafeteriaMovement' },
  { start: 14, end: 17, density: 64, mobility: 69, pulse: 30, activityKey: 'academicCirculation' },
  { start: 17, end: 20, density: 46, mobility: 52, pulse: 16, activityKey: 'campusEvening' },
];

const formatHour = (hour, t) => {
  const suffix = hour >= 12 ? t('about.pm') : t('about.am');
  const displayHour = hour % 12 || 12;
  const minutes = hour % 1 === 0 ? '00' : '30';
  return `${displayHour}:${minutes} ${suffix}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getProfile = (hour) => {
  const base = timeBandProfiles.find((band) => hour >= band.start && hour < band.end) || timeBandProfiles[0];
  const drift = Math.sin(hour * 1.6) * 6;

  return {
    density: clamp(Math.round(base.density + drift), 20, 92),
    mobility: clamp(Math.round(base.mobility + drift * 0.8), 20, 96),
    pulse: clamp(Math.round(base.pulse + drift * 0.7), 8, 55),
    activityKey: base.activityKey,
  };
};

const AICampusPulse = () => {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState(10.5);
  const [activeNode, setActiveNode] = useState('block-a');

  useEffect(() => {
    if (!isRunning) return undefined;

    const timer = setInterval(() => {
      setTimeOfDay((current) => {
        const next = current >= 20 ? 8 : current + 0.5;
        return Number(next.toFixed(1));
      });
      setActiveNode((current) => {
        const currentIndex = CAMPUS_NODES.findIndex((node) => node.id === current);
        const nextIndex = (currentIndex + 1) % CAMPUS_NODES.length;
        return CAMPUS_NODES[nextIndex].id;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isRunning]);

  const profile = useMemo(() => getProfile(timeOfDay), [timeOfDay]);

  const activeNodeMeta = CAMPUS_NODES.find((node) => node.id === activeNode) ?? CAMPUS_NODES[0];
  const animatedLinks = [
    { from: 'block-a', to: 'block-b' },
    { from: 'block-a', to: 'library' },
    { from: 'block-a', to: 'cafe' },
    { from: 'block-b', to: 'library' },
    { from: 'cafe', to: 'admin' },
    { from: 'block-b', to: 'admin' },
    { from: 'library', to: 'admin' },
  ];

  return (
    <section className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0b3a72] via-[#0f4fa1] to-[#0b82b6] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-50/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('about.campus_intelligence')}
            </div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">{t('about.campus_pulse_title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-blue-100 md:text-base">
              {t('about.campus_pulse_description')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRunning((current) => !current)}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
              isRunning
                ? 'border-emerald-300 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/25'
                : 'border-white/20 bg-slate-950/10 text-white hover:bg-slate-950/20'
            }`}
          >
            <span className={`mr-2 h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`} />
            {isRunning ? t('about.use_simulation') : t('about.start_simulation')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)] lg:p-8">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner md:p-4">
            <svg viewBox="0 0 520 330" className="h-[310px] w-full" role="img" aria-label={t('about.campus_map_aria')}>
              <defs>
                <linearGradient id="mapGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.5" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="520" height="330" rx="18" fill="url(#mapGlow)" />

              {animatedLinks.map(({ from, to }) => {
                const source = CAMPUS_NODES.find((node) => node.id === from);
                const target = CAMPUS_NODES.find((node) => node.id === to);
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="8 10"
                    opacity="0.8"
                  />
                );
              })}

              {[0, 1, 2, 3, 4].map((index) => {
                const node = CAMPUS_NODES[index];
                const isActive = activeNode === node.id;
                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isActive ? 34 : 26}
                      fill={node.color}
                      fillOpacity={isActive ? 0.2 : 0.08}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isActive ? 17 : 13}
                      fill={node.color}
                      stroke="white"
                      strokeWidth="4"
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
                      {t(`about.campusNodes.${node.labelKey}`).slice(0, 2).toUpperCase()}
                    </text>
                  </g>
                );
              })}

              {isRunning && (
                <>
                  {animatedLinks.map(({ from, to }, index) => {
                    const source = CAMPUS_NODES.find((node) => node.id === from);
                    const target = CAMPUS_NODES.find((node) => node.id === to);
                    const x = source.x + ((target.x - source.x) * (0.3 + ((index + 1) % 3) * 0.15));
                    const y = source.y + ((target.y - source.y) * (0.3 + ((index + 2) % 3) * 0.15));

                    return (
                      <circle
                        key={`pulse-${from}-${to}`}
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#2563eb"
                        opacity="0.6"
                      >
                        <animate attributeName="opacity" values="0.2;0.9;0.2" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    );
                  })}
                </>
              )}
            </svg>

            <div className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
              <MapPinned className="h-3.5 w-3.5 text-ieps-blue-600" />
              {t('about.active_zones')}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock3 className="h-4 w-4 text-ieps-blue-600" />
                {t('about.timeline')}
              </div>
              <span className="rounded-full bg-ieps-blue-50 px-3 py-1 text-sm font-semibold text-ieps-blue-700">
                {formatHour(timeOfDay, t)}
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="20"
              step="0.5"
              value={timeOfDay}
              onChange={(event) => setTimeOfDay(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-ieps-blue-600"
              aria-label={t('about.timeline_aria')}
            />
            <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500">
              <span>8:00 AM</span>
              <span>12:00 PM</span>
              <span>8:00 PM</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            <Activity className="h-4 w-4 text-ieps-blue-600" />
            {t('about.ai_insights')}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">{t('about.active_density')}</p>
            <p className="mt-3 text-lg font-bold text-slate-800">{t(`about.activities.${profile.activityKey}`)}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500" style={{ width: `${profile.density}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">{profile.density}% {t('about.estimated_activity')}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">{t('about.mobility_index')}</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-800">{profile.mobility}%</span>
              <Users className="mb-1 h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 text-sm text-slate-600">{t('about.students_moving')}</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">{t('about.evaluation_pulse')}</p>
            <p className="mt-3 text-2xl font-bold text-slate-800">{profile.pulse} {t('about.students')}</p>
            <p className="mt-2 text-sm text-slate-600">{t('about.currently_evaluating')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AICampusPulse;
