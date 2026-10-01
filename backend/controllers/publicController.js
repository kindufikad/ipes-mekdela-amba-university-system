const pool = require('../config/db');

const fallbackContactInfo = {
  email: 'kindufikad085@gmail.com',
  phone: '+251 961806188',
  officeHours: 'Monday-Saturday, 2:00 - 11:00',
};

const landingContentDefaults = {
  systemName: 'IPES',
  news: [],
  home_hero_images: [],
  about_page_image: null,
  system_logo: null,
  university_logo: null,
};

const parseLandingSetting = (key, value) => {
  if (key === 'home_hero_images') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : [];
    } catch (_error) {
      return [];
    }
  }
  return typeof value === 'string' && value.trim() ? value : null;
};

const getLandingContent = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key IN ('home_hero_images', 'about_page_image', 'system_logo', 'university_logo')
    `);
    const content = { ...landingContentDefaults };
    (rows || []).forEach((row) => {
      content[row.setting_key] = parseLandingSetting(row.setting_key, row.setting_value);
    });
    return res.status(200).json({ success: true, data: content });
  } catch (error) {
    const message = error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_TABLE_ERROR'
      ? 'Landing content is temporarily unavailable; using default content.'
      : 'Unable to load landing content.';
    console.warn(message, error?.message || error);
    return res.status(200).json({ success: true, data: landingContentDefaults, message });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const [evaluationRows, instructorRows, departmentRows, participationRows] = await Promise.all([
      pool.query("SELECT COUNT(*) AS evaluationsCompleted FROM student_evaluation_submissions WHERE status = 'submitted'"),
      pool.query('SELECT COUNT(*) AS activeInstructors FROM instructors'),
      pool.query('SELECT COUNT(*) AS totalDepartments FROM departments'),
      pool.query(`
        SELECT
          COUNT(DISTINCT ses.student_id) AS participatingStudents,
          (SELECT COUNT(*) FROM students) AS totalStudents
        FROM student_evaluation_submissions ses
        WHERE ses.status = 'submitted' AND ses.student_id IS NOT NULL
      `),
    ]);

    const evaluationCount = Number(evaluationRows[0][0]?.evaluationsCompleted || 0);
    const activeInstructorCount = Number(instructorRows[0][0]?.activeInstructors || 0);
    const departmentCount = Number(departmentRows[0][0]?.totalDepartments || 0);
    const participatingStudents = Number(participationRows[0][0]?.participatingStudents || 0);
    const totalStudents = Number(participationRows[0][0]?.totalStudents || 0);
    const studentParticipation = totalStudents > 0
      ? Number(((participatingStudents / totalStudents) * 100).toFixed(2))
      : 0;

    return res.json({
      success: true,
      message: { en: 'System statistics retrieved successfully.', am: 'የሥርዓቱ ስታቲስቲክስ በተሳካ ሁኔታ ተገኝቷል።' },
      data: {
        evaluationsCompleted: evaluationCount,
        activeInstructors: activeInstructorCount,
        totalDepartments: departmentCount,
        studentParticipation,
      },
    });
  } catch (error) {
    console.error('Unable to retrieve public system statistics:', error);
    return res.status(200).json({
      success: true,
      message: { en: 'System statistics are temporarily unavailable.', am: 'የሥርዓቱ ስታቲስቲክስ ለጊዜው አይገኙም።' },
      data: {
        evaluationsCompleted: 0,
        activeInstructors: 0,
        totalDepartments: 0,
        studentParticipation: 0,
      },
    });
  }
};

const getContactInfo = async (req, res) => {
  try {
    let rows = [];

    try {
      [rows] = await pool.query(`
        SELECT setting_key, setting_value
        FROM system_settings
        WHERE setting_key IN ('contact_email', 'contact_phone', 'contact_office_hours', 'office_hours')
      `);
    } catch (settingsError) {
      console.warn('system_settings lookup failed or table is missing. Falling back to hardcoded contact info.', settingsError);
      rows = [];
    }

    const settingMap = Object.fromEntries(
      (rows || []).map((row) => [row.setting_key, row.setting_value])
    );

    const contactInfo = {
      email: settingMap.contact_email || fallbackContactInfo.email,
      phone: settingMap.contact_phone || fallbackContactInfo.phone,
      officeHours: settingMap.contact_office_hours || settingMap.office_hours || fallbackContactInfo.officeHours,
    };

    return res.status(200).json({
      success: true,
      message: { en: 'Contact information retrieved successfully.', am: 'የመገናኛ መረጃ በተሳካ ሁኔታ ተገኝቷል።' },
      data: contactInfo,
    });
  } catch (error) {
    console.error('Unable to retrieve public contact information:', error);
    return res.status(200).json({
      success: true,
      message: { en: 'Contact information retrieved successfully using fallback values.', am: 'የመገናኛ መረጃ በፋልባክ ዋጋ ተገኝቷል።' },
      data: fallbackContactInfo,
    });
  }
};

module.exports = { getSystemStats, getContactInfo, getLandingContent };