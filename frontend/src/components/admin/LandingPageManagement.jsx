import { Component, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import './LandingPageManagement.css';

const defaultSettings = {
  assets: { home_hero_images: [], about_page_image: null, system_logo: null, university_logo: null },
  contact: {
    email: 'kindufikad085@gmail.com',
    phone: '+251 961806188',
    office_hours: 'Monday-Saturday, 2:00 - 11:00',
  },
  vision: {
    en: 'To empower academic excellence through data-driven decisions and transparent feedback mechanisms.',
    am: 'በመረጃ ላይ በተመሠረቱ ውሳኔዎች እና ግልጽ የግብረመልስ ዘዴዎች የአካዳሚክ የላቀነትን ማበረታታት።',
  },
  mission: {
    en: 'To foster a culture of continuous improvement in teaching by providing a transparent, efficient, and accessible platform for evaluation.',
    am: 'ግልጽ፣ ቀልጣፋ እና ተደራሽ የግምገማ መድረክ በማቅረብ በማስተማር ላይ ቀጣይ የማሻሻያ ባህልን ማበረታታት።',
  },
  objectives: {
    en: [
      'Replace manual paper-based evaluation with a digital solution',
      'Increase student participation in the evaluation process',
      'Provide real-time analytics and reports for administrators',
      'Support faculty development through actionable feedback',
      'Enhance the overall quality of education at Mekdela Amba University',
    ],
    am: [
      'በወረቀት ላይ የሚካሄድ ግምገማን በዲጂታል መፍትሔ መተካት',
      'በግምገማ ሂደት የተማሪዎችን ተሳትፎ ማሳደግ',
      'ለአስተዳዳሪዎች በቅጽበት የትንታኔ መረጃዎችን እና ሪፖርቶችን ማቅረብ',
      'በተግባር ላይ ሊውል በሚችል ግብረመልስ የመምህራንን ሙያዊ እድገት መደገፍ',
      'በመቅደላ አምባ ዩኒቨርሲቲ አጠቃላይ የትምህርት ጥራትን ማሻሻል',
    ],
  },
  announcements: [],
  social_links: {
    facebook: 'https://www.facebook.com/MekdelaAmbaUniversityOfficial',
    telegram: 'https://t.me/MekdelaAmbaUniversity_MAU',
    linkedin: 'https://www.linkedin.com/school/mekdela-amba-university/',
    youtube: 'https://www.youtube.com/@mekdelaambauniversity',
  },
};

const tabs = [
  { id: 'public', label: 'Public information' },
  { id: 'assets', label: 'Images & logos' },
  { id: 'institution', label: 'Vision & objectives' },
  { id: 'announcements', label: 'Calendar & notices' },
];

const normalizeSettings = (value = {}) => ({
  ...defaultSettings,
  ...value,
  assets: { ...defaultSettings.assets, ...(value.assets || {}) },
  contact: { ...defaultSettings.contact, ...(value.contact || {}) },
  vision: {
    en: value.vision?.en || defaultSettings.vision.en,
    am: value.vision?.am || defaultSettings.vision.am,
  },
  mission: {
    en: value.mission?.en || defaultSettings.mission.en,
    am: value.mission?.am || defaultSettings.mission.am,
  },
  objectives: {
    en: value.objectives?.en?.length ? value.objectives.en : defaultSettings.objectives.en,
    am: value.objectives?.am?.length ? value.objectives.am : defaultSettings.objectives.am,
  },
  announcements: Array.isArray(value.announcements) ? value.announcements : [],
  social_links: { ...defaultSettings.social_links, ...(value.social_links || {}) },
});

const linesToList = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const listToLines = (value) => (Array.isArray(value) ? value.join('\n') : '');

class LandingPageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Landing page management render failed:', error);
    toast.error('Landing Page Management could not be displayed.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="landing-manager__fatal" role="alert">
          <div>
            <h2>Landing Page Management is unavailable</h2>
            <p>Reload this section to try again.</p>
          </div>
          <button type="button" onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LandingPageManagementContent = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState('public');
  const [loading, setLoading] = useState(true);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadPreviews, setUploadPreviews] = useState({});
  const [announcementDraft, setAnnouncementDraft] = useState({ title_en: '', title_am: '', message_en: '', message_am: '', active: true });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const fileInputs = useRef({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.getLandingPageSettings();
      setSettings(normalizeSettings(result));
      setHasLoadedSettings(true);
    } catch (loadError) {
      const message = loadError?.message || 'Failed to retrieve landing page settings.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const persistSettings = async (nextSettings, successMessage = 'Landing page settings saved.') => {
    setSaving(true);
    setError('');
    try {
      const result = await adminApi.updateLandingPageSettings(nextSettings);
      setSettings(normalizeSettings(result));
      toast.success(successMessage);
      return true;
    } catch (saveError) {
      const message = saveError?.message || 'Unable to save landing page settings.';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section, key, value) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };

  const saveForm = (event) => {
    event.preventDefault();
    void persistSettings(settings);
  };

  const uploadImages = async (key, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const previews = files.map((file) => URL.createObjectURL(file));
    setUploadPreviews((current) => ({ ...current, [key]: previews }));
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('key', key);
      files.forEach((file) => formData.append('files', file));
      const result = await adminApi.createLandingPageSetting(formData);
      setSettings(normalizeSettings(result));
      toast.success('Image uploaded and published.');
    } catch (uploadError) {
      const message = uploadError?.message || 'Unable to upload image.';
      setError(message);
      toast.error(message);
    } finally {
      previews.forEach((url) => URL.revokeObjectURL(url));
      setUploadPreviews((current) => ({ ...current, [key]: [] }));
      setSaving(false);
    }
  };

  const deleteContent = async (key, extras = {}) => {
    setSaving(true);
    setError('');
    try {
      const result = await adminApi.deleteLandingPageSetting({ key, ...extras });
      setSettings(normalizeSettings(result));
      toast.success(key === 'announcements' ? 'Notice deleted.' : 'Image removed.');
    } catch (deleteError) {
      const message = deleteError?.message || 'Unable to delete landing page content.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const moveHeroImage = async (index, offset) => {
    const images = [...settings.assets.home_hero_images];
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
    await persistSettings({ ...settings, assets: { ...settings.assets, home_hero_images: images } }, 'Hero image order updated.');
  };

  const editAnnouncement = (announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementDraft({ ...announcement });
  };

  const resetAnnouncementDraft = () => {
    setEditingAnnouncementId(null);
    setAnnouncementDraft({ title_en: '', title_am: '', message_en: '', message_am: '', active: true });
  };

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    if (editingAnnouncementId) {
      const announcements = settings.announcements.map((announcement) => (
        announcement.id === editingAnnouncementId ? { ...announcementDraft, id: editingAnnouncementId } : announcement
      ));
      if (await persistSettings({ ...settings, announcements }, 'Notice updated.')) resetAnnouncementDraft();
      return;
    }

    setSaving(true);
    try {
      const result = await adminApi.createLandingPageSetting({ announcement: announcementDraft });
      setSettings(normalizeSettings(result));
      resetAnnouncementDraft();
      toast.success('Notice published.');
    } catch (createError) {
      const message = createError?.message || 'Unable to publish notice.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAnnouncement = (announcement) => {
    const announcements = settings.announcements.map((item) => (
      item.id === announcement.id ? { ...item, active: !item.active } : item
    ));
    void persistSettings({ ...settings, announcements }, announcement.active ? 'Notice hidden.' : 'Notice published.');
  };

  const renderImageCard = (key, title, description, multiple = false) => {
    const value = settings.assets[key];
    const savedImages = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
    const previews = uploadPreviews[key] || [];

    return (
      <article className="landing-manager__asset" key={key}>
        <div className="landing-manager__asset-heading">
          <div><h3>{title}</h3><p>{description}</p></div>
          <ImagePlus aria-hidden="true" />
        </div>
        <div className={`landing-manager__previews${multiple ? ' is-carousel' : ''}`}>
          {savedImages.map((image, index) => (
            <div className="landing-manager__preview" key={`${image}-${index}`}>
              <img src={image} alt={`${title} preview ${index + 1}`} />
              {multiple && <span className="landing-manager__image-order">{String(index + 1).padStart(2, '0')}</span>}
              {multiple && <div className="landing-manager__image-actions">
                <button type="button" onClick={() => void moveHeroImage(index, -1)} disabled={saving || index === 0} aria-label={`Move image ${index + 1} earlier`}><ArrowUp size={16} /></button>
                <button type="button" onClick={() => void moveHeroImage(index, 1)} disabled={saving || index === savedImages.length - 1} aria-label={`Move image ${index + 1} later`}><ArrowDown size={16} /></button>
                <button type="button" onClick={() => void deleteContent(key, { index })} disabled={saving} aria-label={`Delete image ${index + 1}`}><Trash2 size={16} /></button>
              </div>}
                {!multiple && <button type="button" className="landing-manager__remove-image" onClick={() => void deleteContent(key)} disabled={saving} aria-label={`Remove ${title}`}><X size={16} /></button>}
            </div>
          ))}
          {previews.map((preview, index) => <div className="landing-manager__preview is-uploading" key={preview}><img src={preview} alt={`Uploading ${title} ${index + 1}`} /><span><LoaderCircle className="is-spinning" size={18} /> Uploading</span></div>)}
          {!savedImages.length && !previews.length && <div className="landing-manager__empty-image"><ImagePlus size={22} /><span>Default image in use</span></div>}
        </div>
        <input
          ref={(element) => { fileInputs.current[key] = element; }}
          type="file"
          accept="image/*"
          multiple={multiple}
          hidden
          onChange={(event) => { void uploadImages(key, event.target.files); event.target.value = ''; }}
        />
        <button type="button" className="landing-manager__button landing-manager__button--primary" onClick={() => fileInputs.current[key]?.click()} disabled={saving}>
          <Upload size={16} /> {multiple ? 'Add carousel images' : value ? 'Replace image' : 'Upload image'}
        </button>
      </article>
    );
  };

  if (loading) {
    return <div className="landing-manager__loading" role="status"><LoaderCircle className="is-spinning" size={24} /> Loading landing page settings…</div>;
  }

  if (!hasLoadedSettings) {
    return <div className="landing-manager__fatal" role="alert"><div><h2>Landing page settings could not be loaded</h2><p>{error || 'Check the connection and retry.'}</p></div><button type="button" onClick={() => void loadSettings()}><RefreshCw size={15} /> Retry</button></div>;
  }

  return (
    <section className="landing-manager" aria-labelledby="landing-manager-title">
      <header className="landing-manager__header">
        <div>
          <p className="landing-manager__eyebrow">PUBLIC SITE · CONTENT CONTROL</p>
          <h2 id="landing-manager-title">Landing Page Management</h2>
          <p>Manage the content, assets, and public notices shown across the university site.</p>
        </div>
        <button type="button" className="landing-manager__button landing-manager__button--secondary" onClick={() => void loadSettings()} disabled={loading || saving}>
          <RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Refresh
        </button>
      </header>

      {error && <div className="landing-manager__error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadSettings()}><RefreshCw size={15} /> Retry</button></div>}

      <div className="landing-manager__tabs" role="tablist" aria-label="Landing page settings">
        {tabs.map((tab) => (
          <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'public' && <div className="landing-manager__panel">
        <form className="landing-manager__form" onSubmit={saveForm}>
          <div className="landing-manager__section-heading"><div><h3>Contact information</h3><p>Published in the public footer and Contact page.</p></div></div>
          <div className="landing-manager__field-grid">
            <label>Admin email<input type="email" required value={settings.contact.email} onChange={(event) => updateField('contact', 'email', event.target.value)} /></label>
            <label>Support phone number<input type="tel" required value={settings.contact.phone} onChange={(event) => updateField('contact', 'phone', event.target.value)} /></label>
            <label>Office hours<input type="text" required value={settings.contact.office_hours} onChange={(event) => updateField('contact', 'office_hours', event.target.value)} /></label>
          </div>
          <div className="landing-manager__section-heading landing-manager__section-heading--spaced"><div><h3>Social media links</h3><p>Leave a field empty to hide that social link from the footer.</p></div></div>
          <div className="landing-manager__field-grid landing-manager__field-grid--two">
            {Object.entries({ facebook: 'Facebook URL', telegram: 'Telegram URL', linkedin: 'LinkedIn URL', youtube: 'YouTube URL' }).map(([key, label]) => (
              <label key={key}>{label}<span className="landing-manager__url-field"><ExternalLink size={15} /><input type="url" value={settings.social_links[key] || ''} onChange={(event) => updateField('social_links', key, event.target.value)} placeholder="https://" /></span></label>
            ))}
          </div>
          <div className="landing-manager__form-actions"><button type="submit" className="landing-manager__button landing-manager__button--primary" disabled={saving}><Save size={16} />{saving ? 'Saving…' : 'Save public information'}</button></div>
        </form>
      </div>}

      {activeTab === 'assets' && <div className="landing-manager__asset-grid">
        {renderImageCard('home_hero_images', 'Hero carousel images', 'Add, reorder, preview, or remove images from the home-page carousel.', true)}
        {renderImageCard('system_logo', 'System logo', 'Used for the IPES identity across public pages.')}
        {renderImageCard('university_logo', 'University crest / logo', 'Used to represent Mekdela Amba University.')}
        {renderImageCard('about_page_image', 'About page image', 'The lead image shown on the About page.')}
      </div>}

      {activeTab === 'institution' && <form className="landing-manager__panel landing-manager__form" onSubmit={saveForm}>
        <div className="landing-manager__section-heading"><div><h3>Vision & mission</h3><p>Enter public-facing text in both languages.</p></div></div>
        <div className="landing-manager__field-grid landing-manager__field-grid--two">
          <label>Vision · English<textarea rows={4} value={settings.vision.en} onChange={(event) => updateField('vision', 'en', event.target.value)} /></label>
          <label>Vision · Amharic<textarea rows={4} lang="am" value={settings.vision.am} onChange={(event) => updateField('vision', 'am', event.target.value)} /></label>
          <label>Mission · English<textarea rows={4} value={settings.mission.en} onChange={(event) => updateField('mission', 'en', event.target.value)} /></label>
          <label>Mission · Amharic<textarea rows={4} lang="am" value={settings.mission.am} onChange={(event) => updateField('mission', 'am', event.target.value)} /></label>
        </div>
        <div className="landing-manager__section-heading landing-manager__section-heading--spaced"><div><h3>Academic quality objectives</h3><p>Use one objective per line.</p></div></div>
        <div className="landing-manager__field-grid landing-manager__field-grid--two">
          <label>Objectives · English<textarea rows={7} value={listToLines(settings.objectives.en)} onChange={(event) => updateField('objectives', 'en', linesToList(event.target.value))} /></label>
          <label>Objectives · Amharic<textarea rows={7} lang="am" value={listToLines(settings.objectives.am)} onChange={(event) => updateField('objectives', 'am', linesToList(event.target.value))} /></label>
        </div>
        <div className="landing-manager__form-actions"><button type="submit" className="landing-manager__button landing-manager__button--primary" disabled={saving}><Save size={16} />{saving ? 'Saving…' : 'Save vision & objectives'}</button></div>
      </form>}

      {activeTab === 'announcements' && <div className="landing-manager__announcement-layout">
        <form className="landing-manager__form landing-manager__announcement-form" onSubmit={saveAnnouncement}>
          <div className="landing-manager__section-heading"><div><h3>{editingAnnouncementId ? 'Edit evaluation notice' : 'New evaluation notice'}</h3><p>Active notices appear on the public home page.</p></div><CalendarDays size={20} /></div>
          <label>Title · English<input required maxLength={180} value={announcementDraft.title_en} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title_en: event.target.value }))} placeholder="Semester I 2026 E.C Evaluation Active" /></label>
          <label>Title · Amharic<input required maxLength={180} lang="am" value={announcementDraft.title_am} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title_am: event.target.value }))} /></label>
          <label>Message · English<textarea rows={3} value={announcementDraft.message_en} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message_en: event.target.value }))} /></label>
          <label>Message · Amharic<textarea rows={3} lang="am" value={announcementDraft.message_am} onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message_am: event.target.value }))} /></label>
          <div className="landing-manager__form-actions">
            <button type="submit" className="landing-manager__button landing-manager__button--primary" disabled={saving}><Save size={16} />{saving ? 'Saving…' : editingAnnouncementId ? 'Save notice' : 'Publish notice'}</button>
            {editingAnnouncementId && <button type="button" className="landing-manager__button landing-manager__button--secondary" onClick={resetAnnouncementDraft}>Cancel edit</button>}
          </div>
        </form>

        <div className="landing-manager__notice-list">
          <div className="landing-manager__section-heading"><div><h3>Evaluation cycle notices</h3><p>{settings.announcements.length} notice{settings.announcements.length === 1 ? '' : 's'}</p></div></div>
          {settings.announcements.length ? settings.announcements.map((announcement) => (
            <article className={`landing-manager__notice${announcement.active ? ' is-active' : ''}`} key={announcement.id}>
              <div className="landing-manager__notice-copy"><span className={`landing-manager__status${announcement.active ? ' is-active' : ''}`}>{announcement.active ? 'Published' : 'Hidden'}</span><h4>{announcement.title_en || announcement.title_am}</h4><p lang="am">{announcement.title_am}</p>{announcement.message_en && <p>{announcement.message_en}</p>}</div>
              <div className="landing-manager__notice-actions">
                <label className="landing-manager__toggle"><input type="checkbox" checked={Boolean(announcement.active)} onChange={() => toggleAnnouncement(announcement)} disabled={saving} /><span>{announcement.active ? 'Visible' : 'Hidden'}</span></label>
                <button type="button" className="landing-manager__icon-button" onClick={() => editAnnouncement(announcement)} aria-label={`Edit ${announcement.title_en || 'notice'}`}>Edit</button>
                <button type="button" className="landing-manager__icon-button is-danger" onClick={() => void deleteContent('announcements', { id: announcement.id })} disabled={saving} aria-label={`Delete ${announcement.title_en || 'notice'}`}><Trash2 size={16} /></button>
              </div>
            </article>
          )) : <div className="landing-manager__empty-notices"><CalendarDays size={24} /><p>No evaluation notices have been added.</p></div>}
        </div>
      </div>}
    </section>
  );
};

const LandingPageManagement = () => (
  <LandingPageErrorBoundary>
    <LandingPageManagementContent />
  </LandingPageErrorBoundary>
);

export default LandingPageManagement;