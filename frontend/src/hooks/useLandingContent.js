import { useEffect, useState } from 'react';
import campus from '../assets/campus.jpg';
import classroom from '../assets/classroom.jpg';
import dashboard from '../assets/dashboard.jpg';
import mauLogo from '../assets/mau.jpg';
import { publicApi } from '../services/api';

const defaultLandingContent = {
  home_hero_images: [campus, classroom, dashboard],
  about_page_image: campus,
  system_logo: mauLogo,
  university_logo: mauLogo,
};

const useLandingContent = () => {
  const [content, setContent] = useState(defaultLandingContent);

  useEffect(() => {
    let isMounted = true;
    const loadLandingContent = async () => {
      try {
        const remoteContent = await publicApi.getLandingContent();
        if (!isMounted) return;
        setContent({
          ...defaultLandingContent,
          ...remoteContent,
          home_hero_images: remoteContent?.home_hero_images?.length
            ? remoteContent.home_hero_images
            : defaultLandingContent.home_hero_images,
          about_page_image: remoteContent?.about_page_image || defaultLandingContent.about_page_image,
          system_logo: remoteContent?.system_logo || defaultLandingContent.system_logo,
          university_logo: remoteContent?.university_logo || defaultLandingContent.university_logo,
        });
      } catch {
        if (isMounted) setContent(defaultLandingContent);
      }
    };
    void loadLandingContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return content;
};

export default useLandingContent;
