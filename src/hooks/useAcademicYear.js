import useAppStore from "../store/useAppStore";

export default function useAcademicYear() {
  const academicYear = useAppStore((s) => s.academicYear);
  const setAcademicYear = useAppStore((s) => s.setAcademicYear);
  const academicYearList = useAppStore((s) => s.academicYearList || []);

  return {
    academicYear,
    setAcademicYear,
    academicYearList,
  };
}