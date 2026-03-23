// src/utils/semesters.js  (Frontend)
// utils/semesters.js      (Backend — copier dans backend-ipmbtpe/utils/)
//
// ✅ Logique centralisée des semestres IPMBTPE
//
// Règle :
//   studyYear 1 → S1,  S2,  S1&S2
//   studyYear 2 → S3,  S4,  S3&S4
//   studyYear 3 → S5,  S6,  S5&S6
//   studyYear 4 → S7,  S8,  S7&S8
//   studyYear 5 → S9,  S10, S9&S10
//
// Correspondance cycle/studyYear → semestres absolus :
//   BTS       : année 1 = S1/S2 | année 2 = S3/S4
//   LICENCE   : année 3 = S5/S6
//   MASTER    : année 4 = S7/S8 | année 5 = S9/S10
//   INGÉNIEUR : année 1=S1/S2 | 2=S3/S4 | 3=S5/S6 | 4=S7/S8 | 5=S9/S10

/* ─────────────────────────────────────────────
   Constantes
───────────────────────────────────────────── */

/**
 * Calcule les numéros de semestres absolus depuis studyYear
 * studyYear=1 → [1, 2]
 * studyYear=2 → [3, 4]
 * studyYear=3 → [5, 6]
 */
export function getSemesterNumbers(studyYear) {
  const y = Math.max(1, Math.min(5, Number(studyYear) || 1));
  const base = (y - 1) * 2;
  return [base + 1, base + 2]; // ex: [3, 4] pour year=2
}

/**
 * Retourne les codes semestres disponibles pour une année d'étude
 * Inclut toujours le "les deux" en 3ème position
 *
 * studyYear=1 → ["S1", "S2", "S1&S2"]
 * studyYear=2 → ["S3", "S4", "S3&S4"]
 */
export function getSemesterOptions(studyYear) {
  const [a, b] = getSemesterNumbers(studyYear);
  return [
    { value: `S${a}`,       label: `S${a}`,       short: `S${a}` },
    { value: `S${b}`,       label: `S${b}`,       short: `S${b}` },
    { value: `S${a}&S${b}`, label: `S${a} & S${b}`, short: `S${a}&S${b}` },
  ];
}

/**
 * Code "les deux semestres" pour une année d'étude
 * studyYear=1 → "S1&S2"
 * studyYear=2 → "S3&S4"
 */
export function getBothSemestersCode(studyYear) {
  const [a, b] = getSemesterNumbers(studyYear);
  return `S${a}&S${b}`;
}

/**
 * Vérifie si un code semestre appartient à une année d'étude
 * semesterMatchesStudyYear("S3", 2) → true
 * semesterMatchesStudyYear("S1", 2) → false
 * semesterMatchesStudyYear("S3&S4", 2) → true
 */
export function semesterMatchesStudyYear(semesterCode, studyYear) {
  const [a, b] = getSemesterNumbers(studyYear);
  const both = `S${a}&S${b}`;
  const s = (semesterCode || "").toString().trim();
  return s === `S${a}` || s === `S${b}` || s === both;
}

/**
 * Normalise un code semestre legacy (S1, S2) vers
 * le bon semestre absolu selon studyYear
 *
 * Cas d'usage : données existantes ont "S1" ou "S2"
 * mais studyYear=2 → "S1" doit devenir "S3", "S2" → "S4"
 *
 * normalizeSemesterCode("S1", 2) → "S3"
 * normalizeSemesterCode("S2", 2) → "S4"
 * normalizeSemesterCode("S3", 2) → "S3" (déjà correct)
 * normalizeSemesterCode("S1&S2", 2) → "S3&S4"
 */
export function normalizeSemesterCode(semesterCode, studyYear) {
  const s = (semesterCode || "").toString().trim();
  const [a, b] = getSemesterNumbers(studyYear);

  // Déjà correct → retourner tel quel
  if (s === `S${a}` || s === `S${b}` || s === `S${a}&S${b}`) return s;

  // Legacy "S1" → premier semestre de l'année
  if (s === "S1") return `S${a}`;
  // Legacy "S2" → deuxième semestre de l'année
  if (s === "S2") return `S${b}`;
  // Legacy "S1&S2" ou "S1S2"
  if (s === "S1&S2" || s === "S1S2") return `S${a}&S${b}`;

  // Essayer d'extraire le numéro
  const match = s.match(/^S(\d+)$/);
  if (match) {
    const n = Number(match[1]);
    // Si le numéro correspond déjà à cette année → ok
    if (n === a || n === b) return s;
    // Sinon — numéro relatif (1 ou 2) → mapper
    if (n === 1) return `S${a}`;
    if (n === 2) return `S${b}`;
  }

  return s; // fallback
}

/**
 * Indique si un semestre "matche" (pour le filtrage)
 * Un semestre "S3&S4" matche S3 et S4
 * Un semestre "S3" ne matche que S3
 */
export function semesterMatches(subjectSemester, requestedSemester) {
  const sub = (subjectSemester || "").toString().trim();
  const req = (requestedSemester || "").toString().trim();
  if (!req) return true;
  if (sub === req) return true;
  // S3&S4 matche S3 et S4
  if (sub.includes("&")) {
    const parts = sub.split("&").map((x) => x.trim());
    return parts.includes(req);
  }
  return false;
}

/**
 * Retourne le label d'affichage d'un semestre
 * Ajoute l'info de l'année d'étude si disponible
 *
 * getSemesterLabel("S3", 2) → "S3 — Année 2"
 * getSemesterLabel("S3")    → "S3"
 */
export function getSemesterLabel(semesterCode, studyYear = null) {
  const s = (semesterCode || "").toString().trim();
  if (!studyYear) return s;
  const y = Number(studyYear);
  if (!Number.isFinite(y)) return s;
  const [a, b] = getSemesterNumbers(y);
  if (s === `S${a}` || s === `S${b}` || s === `S${a}&S${b}`) {
    return `${s} — Année ${y}`;
  }
  return s;
}

/**
 * Depuis un studyYear et un cycle, retourne la liste
 * complète des semestres avec labels enrichis
 *
 * getFullSemesterOptions(1, "BTS") → [
 *   { value: "S1", label: "S1", description: "1er semestre — BTS Année 1" },
 *   { value: "S2", label: "S2", description: "2e semestre — BTS Année 1" },
 *   { value: "S1&S2", label: "S1 & S2", description: "Les deux semestres — BTS Année 1" },
 * ]
 */
export function getFullSemesterOptions(studyYear, cycle = "") {
  const y = Math.max(1, Math.min(5, Number(studyYear) || 1));
  const [a, b] = getSemesterNumbers(y);
  const cycleLabel = cycle ? ` — ${cycle} Année ${y}` : ` — Année ${y}`;
  const ordinals = ["1er", "2e", "3e", "4e", "5e", "6e", "7e", "8e", "9e", "10e"];
  return [
    {
      value: `S${a}`,
      label: `S${a}`,
      description: `${ordinals[a - 1] || a + "e"} semestre${cycleLabel}`,
    },
    {
      value: `S${b}`,
      label: `S${b}`,
      description: `${ordinals[b - 1] || b + "e"} semestre${cycleLabel}`,
    },
    {
      value: `S${a}&S${b}`,
      label: `S${a} & S${b}`,
      description: `Les deux semestres${cycleLabel}`,
    },
  ];
}

/**
 * Retourne studyYear depuis un semestre absolu
 * getStudyYearFromSemester("S3") → 2
 * getStudyYearFromSemester("S5") → 3
 */
export function getStudyYearFromSemester(semesterCode) {
  const s = (semesterCode || "").toString().trim();
  const match = s.match(/^S(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Math.ceil(n / 2);
}

/* ─────────────────────────────────────────────
   Export CommonJS (pour le backend Node.js)
   Décommenter si utilisé côté backend
───────────────────────────────────────────── */
// module.exports = {
//   getSemesterNumbers,
//   getSemesterOptions,
//   getBothSemestersCode,
//   semesterMatchesStudyYear,
//   normalizeSemesterCode,
//   semesterMatches,
//   getSemesterLabel,
//   getFullSemesterOptions,
//   getStudyYearFromSemester,
// };