import { create } from "zustand";

const YEAR_KEY = "ipmbtpe:academicYear";
const SECTION_KEY = "ipmbtpe:last_section";

function detectCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

function buildAcademicYears() {
  const start = 2023;
  const end = new Date().getFullYear() + 6;
  const out = [];
  for (let y = start; y <= end; y++) out.push(`${y}-${y + 1}`);
  return out;
}

const defaultYear =
  localStorage.getItem(YEAR_KEY) || detectCurrentAcademicYear();

const defaultSection =
  localStorage.getItem(SECTION_KEY) || "dashboard";

const YEAR_LIST = buildAcademicYears();

const useAppStore = create((set) => ({
  /* ── Année académique ── */
  academicYear: defaultYear,
  academicYearList: YEAR_LIST,

  setAcademicYear: (year) => {
    localStorage.setItem(YEAR_KEY, year);
    set({ academicYear: year });
  },

  /* ── Navigation ── */
  section: defaultSection,

  setSection: (section) => {
    localStorage.setItem(SECTION_KEY, section);
    set({ section });
  },
}));

export default useAppStore;