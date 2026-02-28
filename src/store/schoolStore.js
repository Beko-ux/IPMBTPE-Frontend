import { create } from "zustand";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebaseClient";

const cleanStr = (x) => (x ?? "").toString().trim();

function normalizeAcademicYear(y) {
  const s = cleanStr(y);
  if (!s) return "";
  return s.replace(/[–—]/g, "-").replace(/\s*\/\s*/g, "-").replace(/\s*-\s*/g, "-");
}

function buildClassesFromStudents(students, year) {
  const list = students.filter((s) => cleanStr(s.academicYear) === year);

  list.sort((a, b) => {
    const na = (a.fullName || "").toUpperCase();
    const nb = (b.fullName || "").toUpperCase();
    if (na !== nb) return na.localeCompare(nb);
    return (a.matricule || "").localeCompare(b.matricule || "");
  });

  const map = new Map();

  for (const s of list) {
    const key = [
      s.academicYear || "",
      s.filiere || "",
      s.specialiteCode || "",
      s.optionCode || "",
      s.cycle || "",
      s.studyYear != null ? String(s.studyYear).trim() : "",
    ].join("|");

    if (!map.has(key)) {
      const refKey = s.optionCode || s.specialiteCode || "";
      const level =
        s.cycle && s.studyYear !== "" && s.studyYear != null
          ? `${s.cycle}${String(s.studyYear)}`
          : "";

      const displayName = (s.option || s.specialite || refKey || "").toString().trim();

      map.set(key, {
        id: key,
        key,

        academicYear: s.academicYear || "",
        filiere: s.filiere || "",

        specialite: s.specialite || "",
        specialiteCode: s.specialiteCode || "",

        option: s.option || "",
        optionCode: s.optionCode || "",

        cycle: s.cycle || "",
        studyYear: s.studyYear ?? "",

        level,
        displayName,
        title: displayName ? `${displayName}${level ? ` - ${level}` : ""}` : key,

        students: [],
      });
    }

    map.get(key).students.push({
      id: s.id,
      matricule: s.matricule || "",
      fullName: s.fullName || "",
      lastName: s.lastName || "",
      firstName: s.firstName || "",

      classRole: s.classRole || "Aucune",
      schoolRole: s.schoolRole || "Aucune",
      contact: s.contact || "",
    });
  }

  const out = Array.from(map.values());

  out.forEach((c) => {
    c.students.sort((a, b) => {
      const na = (a.fullName || "").toUpperCase();
      const nb = (b.fullName || "").toUpperCase();
      if (na !== nb) return na.localeCompare(nb);
      return (a.matricule || "").localeCompare(b.matricule || "");
    });
  });

  out.sort((a, b) => String(a.title).localeCompare(String(b.title)));

  return out;
}

export const useSchoolStore = create((set, get) => ({
  students: [],
  classesByYear: {},

  loadingStudents: false,
  error: "",

  unsubStudents: null,

  subscribeStudentsByYear: (academicYear) => {
    const year = normalizeAcademicYear(academicYear);
    if (!year) return;

    // stop previous subscription
    const prev = get().unsubStudents;
    if (prev) prev();

    set({ loadingStudents: true, error: "" });

    const q = query(collection(db, "students"), where("academicYear", "==", year));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const students = snap.docs.map((d) => {
          const s = d.data() || {};
          const ln = cleanStr(s.lastName).toUpperCase();
          const fn = cleanStr(s.firstName);
          const fullName = `${ln} ${fn}`.trim() || cleanStr(s.fullName);

          return {
            id: d.id,
            matricule: cleanStr(s.matricule),
            fullName,
            lastName: cleanStr(s.lastName),
            firstName: cleanStr(s.firstName),

            academicYear: cleanStr(s.academicYear),
            filiere: cleanStr(s.filiere),
            specialite: cleanStr(s.specialite),
            specialiteCode: cleanStr(s.specialiteCode),
            option: cleanStr(s.option),
            optionCode: cleanStr(s.optionCode),
            cycle: cleanStr(s.cycle),
            studyYear: s.studyYear ?? "",

            classRole: cleanStr(s.classRole || "Aucune") || "Aucune",
            schoolRole: cleanStr(s.schoolRole || "Aucune") || "Aucune",
            contact: cleanStr(s.contact),
          };
        });

        const classes = buildClassesFromStudents(students, year);

        set((st) => ({
          students,
          classesByYear: { ...st.classesByYear, [year]: classes },
          loadingStudents: false,
        }));
      },
      (err) => {
        set({ error: err.message || "Erreur Firestore", loadingStudents: false });
      }
    );

    set({ unsubStudents: unsub });
  },

  getClassesForYear: (academicYear) => {
    const y = normalizeAcademicYear(academicYear);
    return get().classesByYear[y] || [];
  },
}));