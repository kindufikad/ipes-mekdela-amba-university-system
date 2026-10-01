import useLandingContent from '../hooks/useLandingContent';
import AICampusPulse from '../components/AICampusPulse';
import { useTranslation } from '../context/useTranslation';

const About = () => {
  const landingContent = useLandingContent();
  const { t } = useTranslation();
  const objectives = t('about.objectives', []);
  return (
    <div className="container-custom py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-ieps-blue-600 mb-3">{t('about.title')}</h1>
        <p className="mb-6 text-lg font-semibold text-slate-700">{t('about.system_name')}</p>
        <img src={landingContent.about_page_image} alt={t('about.campus_image_alt')} className="mb-8 h-64 w-full rounded-2xl object-cover shadow-md" />
        <div className="prose prose-lg text-gray-600 space-y-4">
          <p>{t('about.description')}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.mission_title')}</h2>
          <p>{t('about.mission_description')}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.vision_title')}</h2>
          <p>{t('about.vision_description')}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.objectives_title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            {objectives.map((objective, index) => <li key={index}>{objective}</li>)}
          </ul>
        </div>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold text-ieps-blue-600">{t('about.location_title')}</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-5 text-slate-600">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ieps-blue-600">{t('about.institution_label')}</p>
                <p className="mt-1 text-lg font-medium text-slate-800">
                  {t('about.campus_name')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ieps-blue-600">{t('about.region_label')}</p>
                <p className="mt-1 text-lg text-slate-800">{t('about.region')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ieps-blue-600">{t('about.landmark_label')}</p>
                <p className="mt-1 text-lg text-slate-800">{t('about.landmark')}</p>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Mekdela+Amba+University+Tulu+Awulia+Gimba"
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center justify-center"
              >
                {t('about.open_maps')}
              </a>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
              <iframe
                title={t('about.map_title')}
                src="https://www.google.com/maps?q=Mekdela+Amba+University+Tulu+Awulia+Gimba&output=embed"
                className="h-72 w-full md:h-80"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </section>

        <AICampusPulse />
      </div>
    </div>
  );
};

export default About;