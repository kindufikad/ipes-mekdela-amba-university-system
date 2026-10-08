import { useContext } from 'react';
import useLandingContent from '../hooks/useLandingContent';
import { LanguageContext } from '../context/LanguageContext';
import { useTranslation } from '../context/useTranslation';

const About = () => {
  const landingContent = useLandingContent();
  const { language } = useContext(LanguageContext);
  const { t } = useTranslation();
  const objectives = landingContent.objectives?.[language]?.length
    ? landingContent.objectives[language]
    : t('about.objectives', []);
  const mission = landingContent.mission?.[language] || t('about.mission_description');
  const vision = landingContent.vision?.[language] || t('about.vision_description');
  return (
    <div className="container-custom py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-ieps-blue-600 mb-3">{t('about.title')}</h1>
        <p className="mb-6 text-lg font-semibold text-slate-700">{t('about.system_name')}</p>
        <img src={landingContent.about_page_image} alt={t('about.campus_image_alt')} className="mb-8 h-64 w-full rounded-2xl object-cover shadow-md" />
        <div className="prose prose-lg text-gray-600 space-y-4">
          <p>{t('about.description')}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.mission_title')}</h2>
          <p>{mission}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.vision_title')}</h2>
          <p>{vision}</p>
          <h2 className="text-2xl font-semibold text-ieps-blue-600 mt-8">{t('about.objectives_title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            {objectives.map((objective, index) => <li key={index}>{objective}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About;