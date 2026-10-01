import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { courseAssignmentApi, departmentApi } from '../services/api';

const CourseAssignmentModal = ({ courses: initialCourses = [], instructors: initialInstructors = [], departmentId, onClose, onAssigned }) => {
  const [filters, setFilters] = useState({ programType: '', yearLevel: '', semester: '', section: '' });
  const [courses, setCourses] = useState(initialCourses);
  const defaultInstructors = initialInstructors;
  const [departments, setDepartments] = useState([]);
  const [allInstructors, setAllInstructors] = useState(initialInstructors);
  const [assignments, setAssignments] = useState({});
  const [instructorsMap, setInstructorsMap] = useState({});
  const rowInstructors = new Proxy(instructorsMap, {
    get: (current, courseId) => {
      const selectedDepartment = String(assignments[courseId]?.deptId || departmentId || '');
      const source = current[courseId] || allInstructors;
      return source.filter((instructor) => String(instructor.department_id || '') === selectedDepartment);
    },
  });
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const years = ['1st Year (Freshman)', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', '7th Year'];
  const sections = 'A B C D E F G H I J K L'.split(' ');
  const selectClass = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm';

  const updateFilter = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    departmentApi.getAll().then(async (rows) => {
      const availableDepartments = Array.isArray(rows) ? rows : [];
      setDepartments(availableDepartments);
      const instructorLists = await Promise.all(availableDepartments.map((department) => (
        courseAssignmentApi.getDepartmentInstructors(department.id).catch(() => [])
      )));
      const uniqueInstructors = new Map();
      instructorLists.flat().forEach((instructor) => {
        const instructorId = instructor.instructor_id || instructor.id || instructor.user_id;
        if (instructorId) uniqueInstructors.set(String(instructorId), instructor);
      });
      setAllInstructors([...uniqueInstructors.values()]);
    }).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!filters.yearLevel || !filters.semester) {
      setCourses([]);
      setAssignments({});
      return undefined;
    }
    let cancelled = false;
    setLoadingCourses(true);
    courseAssignmentApi.getFilteredCourses({ deptId: departmentId, year: filters.yearLevel, semester: filters.semester })
      .then((rows) => { if (!cancelled) { setCourses(Array.isArray(rows) ? rows : []); setAssignments({}); } })
      .catch(() => { if (!cancelled) { setCourses([]); setAssignments({}); } })
      .finally(() => { if (!cancelled) setLoadingCourses(false); });
    return () => { cancelled = true; };
  }, [departmentId, filters.yearLevel, filters.semester]);

  const loadInstructorsForCourse = async (courseId, deptId) => {
    if (!deptId) return;
    try {
      const rows = await courseAssignmentApi.getDepartmentInstructors(deptId);
      const normalizedRows = (Array.isArray(rows) ? rows : []).map((instructor) => ({
        ...instructor,
        instructor_id: instructor.instructor_id || instructor.id || instructor.user_id,
        full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || instructor.email || 'Unnamed instructor',
      }));
      setInstructorsMap((current) => ({ ...current, [courseId]: normalizedRows }));
    } catch {
      setInstructorsMap((current) => ({ ...current, [courseId]: [] }));
    }
  };
  const loadRowInstructors = () => undefined;
  useEffect(() => {
    if (!departmentId || !courses.length) return undefined;
    const loadInitialRowInstructors = async () => {
      await Promise.all(courses.map((course) => loadInstructorsForCourse(course.id, departmentId)));
    };
    void loadInitialRowInstructors();
    return undefined;
  }, [courses, departmentId]);

  const handleDeptChange = (courseId, value) => {
    setAssignments((current) => ({ ...current, [courseId]: { ...(current[courseId] || {}), deptId: value, instructorId: '', staffId: '', staffRole: '', role: '' } }));
    loadInstructorsForCourse(courseId, value || departmentId);
  };

  const updateRow = (courseId, field, value) => {
    if (field === 'instructorId') {
      setAssignments((current) => ({
        ...current,
        [courseId]: {
          ...(current[courseId] || {}),
          instructorId: value,
          staffId: value,
          role: current[courseId]?.staffRole || current[courseId]?.role || 'instructor',
        },
      }));
      return;
    }
    setAssignments((current) => ({ ...current, [courseId]: { ...(current[courseId] || {}), [field]: value } }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const assignedRows = courses
      .map((course) => {
        const row = assignments[course.id] || {};
        const staffId = row.staffId || row.instructorId;
        const role = String(row.staffRole || row.role || 'instructor').trim().toLowerCase();
        if (!staffId) return null;
        return { courseId: course.id, staffId, instructorId: staffId, role };
      })
      .filter(Boolean);
    if (!filters.programType || !filters.yearLevel || !filters.semester || !filters.section || !assignedRows.length) {
      toast.error('Select all filters, a section, and at least one staff member.');
      return;
    }
    setSaving(true);
    try {
      await courseAssignmentApi.batchAssignMatrix({ programType: filters.programType, yearLevel: filters.yearLevel, semester: filters.semester, section: filters.section, assignments: assignedRows });
      toast.success(`${assignedRows.length} course assignment${assignedRows.length === 1 ? '' : 's'} saved.`);
      onAssigned?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Unable to save course assignments.');
    } finally { setSaving(false); }
  };

  const getRoleLabel = (role) => {
    const normalized = String(role || 'instructor').toLowerCase();
    if (normalized === 'academic_director') return 'ACADEMIC DIRECTOR';
    if (normalized === 'department_head' || normalized === 'dept_head') return 'DEPT HEAD';
    if (normalized === 'college_dean' || normalized === 'dean') return 'COLLEGE DEAN';
    if (normalized === 'lab_assistant') return 'LAB ASSISTANT';
    return 'INSTRUCTOR';
  };

  const instructorLabel = (instructor) => {
    const name = instructor.full_name || instructor.instructor_name || instructor.name || instructor.email;
    return `${name} (${getRoleLabel(instructor.role)})`;
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"><form onSubmit={submit} className="w-full max-w-6xl rounded-3xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Assign Courses</h3><p className="text-sm text-gray-500">Select an instructor or lab assistant independently for each course.</p></div><button type="button" onClick={onClose} className="text-gray-500" aria-label="Close">✕</button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-4"><label className="text-sm text-gray-600"><span className="mb-1 block font-medium">Program Type</span><select value={filters.programType} onChange={updateFilter('programType')} className={selectClass}><option value="">Select</option><option>Regular</option><option>Extension</option><option>Summer</option></select></label><label className="text-sm text-gray-600"><span className="mb-1 block font-medium">Year Level</span><select value={filters.yearLevel} onChange={updateFilter('yearLevel')} className={selectClass}><option value="">Select</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="text-sm text-gray-600"><span className="mb-1 block font-medium">Semester</span><select value={filters.semester} onChange={updateFilter('semester')} className={selectClass}><option value="">Select</option><option>I</option><option>II</option></select></label><label className="text-sm text-gray-600"><span className="mb-1 block font-medium">Section</span><select value={filters.section} onChange={updateFilter('section')} className={selectClass}><option value="">Select</option>{sections.map((section) => <option key={section}>{section}</option>)}</select></label></div>
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Instructor Department</th><th className="px-4 py-3">Instructor / Lab Assistant</th></tr></thead><tbody className="divide-y divide-slate-100">{loadingCourses ? <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Loading courses...</td></tr> : courses.length ? courses.map((course) => { const row = assignments[course.id] || {}; const department = row.deptId || String(departmentId || ''); const instructors = rowInstructors[course.id] || (department === String(departmentId) ? defaultInstructors : []); return <tr key={course.id}><td className="px-4 py-4 font-medium text-slate-900">{course.code || course.course_code} · {course.name || course.course_title}</td><td className="px-4 py-4"><select value={department} onChange={(event) => handleDeptChange(course.id, event.target.value)} className={selectClass}><option value={String(departmentId || '')}>Current Department</option>{departments.filter((item) => String(item.id) !== String(departmentId)).map((item) => <option key={item.id} value={item.id}>{item.name || item.department_name}</option>)}</select></td><td className="px-4 py-4"><select value={row.instructorId || ''} onChange={(event) => {
            const staffId = event.target.value;
            const selectedStaff = instructors.find((item) => String(item.staff_id ?? item.instructor_id ?? item.id ?? item.user_id) === String(staffId)) || null;
            updateRow(course.id, 'instructorId', staffId);
            updateRow(course.id, 'staffRole', String(selectedStaff?.role || 'instructor').toLowerCase());
            const role = String(selectedStaff?.role || 'instructor').toLowerCase();
            updateRow(course.id, 'staffRole', role);
            updateRow(course.id, 'role', role);
          }} onFocus={() => loadRowInstructors(course.id, department)} className={selectClass}><option value="">Select instructor / lab assistant</option>{instructors.map((instructor) => <option key={instructor.staff_id ?? instructor.instructor_id ?? instructor.id ?? instructor.user_id} value={String(instructor.staff_id ?? instructor.instructor_id ?? instructor.id ?? instructor.user_id)}>{instructorLabel(instructor)}</option>)}</select></td></tr>; }) : <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Select Year Level and Semester to load courses.</td></tr>}</tbody></table></div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-ieps-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Assign Courses'}</button></div>
  </form></div>;
};

export default CourseAssignmentModal;
