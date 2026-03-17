// src/components/documents/ClassNotesBlankSheet.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const DEFAULT_YEAR = "2025-2026";
const SEMESTERS = ["S1", "S2"];
const MAX_ROWS_PER_PAGE = 32;
const LOGO_PUBLIC_PATH = "/logo-ipmbtpe.png";

const TEMPLATE_OPTIONS = [
  {
    value: "CC_SPLIT",
    label: "FICHE DE REPORT DE NOTE (Présence / TD / Évaluation écrite / Note finale)",
  },
  {
    value: "PRESENCE_DAYS",
    label: "FICHE DE PRÉSENCE (Lundi → Samedi)",
  },
  {
    value: "NOTE20_SN",
    label: "FICHE DE REPORT DE NOTE (Note /20 - Session normale)",
  },
];

const CYCLE_OPTIONS = [
  "Cycle LMD",
  "Licence Professionnelle",
  "Master Professionnel",
  "Cycle INGÉNIEUR",
  "Cycle BTS / HND",
];

/* ---------------- helpers ---------------- */
const cleanStr = (x) => (x ?? "").toString().trim();
const toUpper = (s) => cleanStr(s).toUpperCase();

function normalizeAcademicYear(y) {
  const s = cleanStr(y);
  if (!s) return "";
  return s
    .replace(/[–—]/g, "-")
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s*-\s*/g, "-");
}

function normalizeSemester(v) {
  const s = cleanStr(v).toUpperCase();
  if (!s) return "";
  if (s === "1" || s === "SEM1" || s === "SEMESTRE1" || s === "SEMESTRE 1") return "S1";
  if (s === "2" || s === "SEM2" || s === "SEMESTRE2" || s === "SEMESTRE 2") return "S2";
  if (s === "S1" || s === "S2" || s === "S1S2") return s;
  return s;
}

function subjectMatchesSemester(subjectSemesterMode, selectedSemester) {
  const sm = normalizeSemester(subjectSemesterMode || "S1");
  const sel = normalizeSemester(selectedSemester || "S1");

  if (sel === "S1") return sm === "S1" || sm === "S1S2";
  if (sel === "S2") return sm === "S2" || sm === "S1S2";
  return true;
}

async function fetchJsonFirstOk(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} on ${url}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Aucune URL n'a répondu correctement.");
}

async function toDataUrlFromPublicPath(path) {
  try {
    const absoluteUrl = new URL(path, window.location.origin).href;
    const res = await fetch(absoluteUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Logo fetch failed: HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function splitIntoPages(items, pageSize) {
  const out = [];
  const arr = Array.isArray(items) ? items : [];
  for (let i = 0; i < arr.length; i += pageSize) out.push(arr.slice(i, i + pageSize));
  return out.length ? out : [[]];
}

function getSubjectLabel(s) {
  return cleanStr(s?.label || s?.ueLabel || s?.name || s?.ecTitle || "");
}

function getSpecialiteDisplayFull(group) {
  if (!group) return "";

  const dn = cleanStr(group.displayName);
  if (dn) {
    const beforeDash = cleanStr(dn.split("-")[0]);
    if (beforeDash) return toUpper(beforeDash);
    return toUpper(dn);
  }

  const opt = cleanStr(group.option);
  if (opt) return toUpper(opt);

  const spec = cleanStr(group.specialite);
  if (spec) return toUpper(spec);

  const specCode = cleanStr(group.specialiteCode);
  if (specCode) return toUpper(specCode);

  const optCode = cleanStr(group.optionCode);
  if (optCode) return toUpper(optCode);

  const fil = cleanStr(group.filiere);
  if (fil) return toUpper(fil);

  return "";
}

function inferLevelFromClass(cls) {
  if (!cls) return "";
  return cleanStr(cls.level || cls.niveau || "");
}

function inferCycleFromClass(cls) {
  if (!cls) return "";

  const rawCandidates = [
    cls.cycleLabel,
    cls.cycle,
    cls.cycleName,
    cls.cursus,
    cls.programCycle,
  ]
    .map(cleanStr)
    .filter(Boolean);

  for (const raw of rawCandidates) {
    const low = raw.toLowerCase();
    if (low.includes("bts") || low.includes("hnd")) return "Cycle BTS / HND";
    if (low.includes("ing")) return "Cycle INGÉNIEUR";
    if (low.includes("master")) return "Master Professionnel";
    if (low.includes("licence")) return "Licence Professionnelle";
    if (low.includes("lmd")) return "Cycle LMD";
  }

  return "";
}

function getSessionLabelForTemplate(template) {
  if (template === "NOTE20_SN") return "SESSION NORMALE";
  return "CONTRÔLE CONTINU";
}

function getTemplateColumns(template) {
  if (template === "PRESENCE_DAYS") {
    return [
      { key: "no", label: "No", className: "col-no" },
      { key: "name", label: "NOMS ET PRENOMS", className: "col-name" },
      { key: "lundi", label: "Lundi", className: "col-day" },
      { key: "mardi", label: "Mardi", className: "col-day" },
      { key: "mercredi", label: "Mercredi", className: "col-day" },
      { key: "jeudi", label: "Jeudi", className: "col-day" },
      { key: "vendredi", label: "Vendredi", className: "col-day" },
      { key: "samedi", label: "Samedi", className: "col-day" },
    ];
  }

  if (template === "NOTE20_SN") {
    return [
      { key: "no", label: "No", className: "col-no" },
      { key: "name", label: "NOMS ET PRENOMS", className: "col-name" },
      { key: "note20", label: "Note /20", className: "col-note20" },
    ];
  }

  return [
    { key: "no", label: "No", className: "col-no" },
    { key: "name", label: "NOMS ET PRENOMS", className: "col-name" },
    { key: "presence", label: "Présence /08", className: "col-small" },
    { key: "td", label: "TD /04", className: "col-small" },
    { key: "eval", label: "Évaluation écrite /8", className: "col-small" },
    { key: "final", label: "Note final /20", className: "col-small" },
  ];
}

function getBlankCellsForTemplate(template) {
  if (template === "PRESENCE_DAYS") return 6;
  if (template === "NOTE20_SN") return 1;
  return 4;
}

function mapColumnClassToStyleKey(className) {
  if (className === "col-no") return "thNum";
  if (className === "col-name") return "thName";
  if (className === "col-day") return "thDay";
  if (className === "col-note20") return "thNote20";
  return "thSmall";
}

function dedupeSubjectsByLabelAndSemester(list) {
  const seen = new Set();
  const out = [];

  for (const s of Array.isArray(list) ? list : []) {
    const label = getSubjectLabel(s);
    if (!label) continue;

    const sem = normalizeSemester(s?.semesterMode || s?.semester || "S1");
    const key = `${label.toLowerCase()}__${sem}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...s, label });
  }

  return out.sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

/* ---------------- component ---------------- */
export default function ClassNotesBlankSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [busy, setBusy] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [semester, setSemester] = useState("S1");
  const [templateType, setTemplateType] = useState("CC_SPLIT");
  const [sessionLabel, setSessionLabel] = useState(getSessionLabelForTemplate("CC_SPLIT"));

  const [cycleLabel, setCycleLabel] = useState("");
  const [level, setLevel] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [credit, setCredit] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  const sheetRef = useRef(null);

  /* ---------- load classes ---------- */
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      setSelectedClassId("");
      setClasses([]);
      try {
        const url1 = `${API_BASE}/classes?year=${encodeURIComponent(DEFAULT_YEAR)}`;
        const url2 = `${API_BASE}/api/classes?year=${encodeURIComponent(DEFAULT_YEAR)}`;
        const data = await fetchJsonFirstOk([url1, url2]);
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur chargement classes:", err);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, []);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const students = selectedClass?.students || [];

  /* ---------- auto session label from template ---------- */
  useEffect(() => {
    setSessionLabel(getSessionLabelForTemplate(templateType));
  }, [templateType]);

  /* ---------- sync metadata from class ---------- */
  useEffect(() => {
    if (!selectedClass) return;

    if (selectedClass.academicYear) {
      setAcademicYear(selectedClass.academicYear);
    }

    const lv = inferLevelFromClass(selectedClass);
    if (lv) setLevel(lv);

    const cyc = inferCycleFromClass(selectedClass);
    if (cyc) setCycleLabel(cyc);

    setSelectedSubjectIds([]);
    setSubjectName("");
    setCredit("");
  }, [selectedClass]);

  const sortedStudents = useMemo(() => {
    return [...(students || [])].sort((a, b) => {
      const fullA = cleanStr(
        a.fullName || `${cleanStr(a.lastName).toUpperCase()} ${cleanStr(a.firstName)}`
      ).toUpperCase();
      const fullB = cleanStr(
        b.fullName || `${cleanStr(b.lastName).toUpperCase()} ${cleanStr(b.firstName)}`
      ).toUpperCase();

      if (fullA < fullB) return -1;
      if (fullA > fullB) return 1;

      const matA = cleanStr(a.matricule).toUpperCase();
      const matB = cleanStr(b.matricule).toUpperCase();
      return matA.localeCompare(matB);
    });
  }, [students]);

  /* ---------- load subjects : same source as MatieresPage ---------- */
  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedClass) {
        setSubjects([]);
        return;
      }

      setLoadingSubjects(true);
      try {
        // IMPORTANT :
        // on colle à la logique de MatieresPage :
        // groupement principalement par filiere + specialiteCode + studyYear + cycle
        const classFiliere = cleanStr(selectedClass.filiere);
        const classSpecialiteCode = cleanStr(selectedClass.specialiteCode);
        const classCycle = cleanStr(selectedClass.cycle);
        const classStudyYear =
          selectedClass.studyYear != null ? String(selectedClass.studyYear) : "";

        // on ne filtre PAS par academicYear côté backend car certains subjects ne l'ont pas
        const params = new URLSearchParams();
        if (classFiliere) params.set("filiere", classFiliere);
        if (classSpecialiteCode) params.set("specialiteCode", classSpecialiteCode);
        if (classCycle) params.set("cycle", classCycle);
        if (classStudyYear) params.set("studyYear", classStudyYear);

        const url1 = `${API_BASE}/subjects?${params.toString()}`;
        const url2 = `${API_BASE}/api/subjects?${params.toString()}`;
        const data = await fetchJsonFirstOk([url1, url2]);

        const all = Array.isArray(data) ? data : [];

        const filtered = all.filter((s) => {
          const label = getSubjectLabel(s);
          if (!label) return false;
          if (s?.isArchived) return false;

          const sFiliere = cleanStr(s.filiere);
          const sSpecialiteCode = cleanStr(s.specialiteCode);
          const sCycle = cleanStr(s.cycle);
          const sStudyYear = s.studyYear != null ? String(s.studyYear) : "";
          const sSemesterMode = cleanStr(s.semesterMode || s.semester || "S1");

          if (classFiliere && sFiliere && sFiliere !== classFiliere) return false;
          if (classSpecialiteCode && sSpecialiteCode && sSpecialiteCode !== classSpecialiteCode) return false;
          if (classCycle && sCycle && sCycle !== classCycle) return false;
          if (classStudyYear && sStudyYear && sStudyYear !== classStudyYear) return false;

          if (!subjectMatchesSemester(sSemesterMode, semester)) return false;

          return true;
        });

        setSubjects(dedupeSubjectsByLabelAndSemester(filtered));
      } catch (err) {
        console.error("Erreur chargement matières:", err);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClass, semester]);

  const specialiteDisplay = getSpecialiteDisplayFull(selectedClass);

  const selectedSubjects = useMemo(() => {
    const map = new Map(subjects.map((s) => [s.id, s]));
    return selectedSubjectIds.map((id) => map.get(id)).filter(Boolean);
  }, [subjects, selectedSubjectIds]);

  const previewColumns = useMemo(() => getTemplateColumns(templateType), [templateType]);
  const previewBlankCells = getBlankCellsForTemplate(templateType);

  const toggleSubject = (id) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSubjectIds(subjects.map((s) => s.id));
  const clearAll = () => setSelectedSubjectIds([]);

  const openPrintableWindow = async (subjectsToPrint) => {
    const logoDataUrl = await toDataUrlFromPublicPath(LOGO_PUBLIC_PATH);

    const html = generateReportSheetPDFHTML({
      logoDataUrl,
      group: selectedClass,
      academicYear,
      semester,
      sessionLabel,
      cycleLabel,
      level,
      credit,
      templateType,
      subjectsToPrint,
      students: sortedStudents,
      maxRowsPerPage: MAX_ROWS_PER_PAGE,
    });

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup bloquée. Autorisez les popups pour générer le PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleDownloadPdf = async () => {
    if (busy) return;

    if (!selectedClass) {
      alert("Veuillez d'abord choisir une classe.");
      return;
    }

    const picked = selectedSubjects;
    const manual = cleanStr(subjectName);

    if (picked.length === 0 && !manual) {
      alert("Veuillez cocher au moins une matière (ou renseigner le nom).");
      return;
    }

    setBusy(true);
    try {
      const toPrint = picked.length > 0 ? picked.map((s) => getSubjectLabel(s)) : [manual];
      await openPrintableWindow(toPrint);
    } finally {
      setBusy(false);
    }
  };

  const previewSubjectText =
    selectedSubjects.length > 0
      ? `${selectedSubjects.length} matière(s) sélectionnée(s)`
      : subjectName || "";

  const previewTitle =
    templateType === "PRESENCE_DAYS" ? "FICHE DE PRÉSENCE" : "FICHE DE REPORT DE NOTE";

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Fiches vierges IPMBTPE</h2>
            <p style={styles.modalSubtitle}>
              3 modèles · 32 lignes max par page · filigrane · en-têtes répétés · matières filtrées par semestre
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          <div style={styles.leftPanel}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Classe</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={styles.select}
              >
                <option value="">
                  {loadingClasses ? "Chargement des classes..." : "-- Sélectionner une classe --"}
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title || cls.abbrev || cls.id}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Année académique</label>
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={styles.select}>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Semestre</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} style={styles.select}>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p style={styles.smallHint}>Les matières affichées sont filtrées selon {semester}.</p>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Modèle</label>
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} style={styles.select}>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Cycle</label>
                <select value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} style={styles.select}>
                  <option value="">-- Choisir --</option>
                  {CYCLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Niveau</label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={styles.input}
                  placeholder="Ex : BTS1 ou 3"
                />
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Session (texte)</label>
                <input
                  type="text"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Crédit (optionnel)</label>
                <input
                  type="text"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  style={styles.input}
                  placeholder="Ex : 3"
                />
              </div>
            </div>

            <div style={{ ...styles.fieldGroup, marginTop: 8 }}>
              <label style={styles.label}>Matières de la classe ({semester})</label>

              {!selectedClass ? (
                <p style={styles.smallHint}>Choisis une classe pour voir ses matières.</p>
              ) : loadingSubjects ? (
                <p style={styles.smallHint}>Chargement des matières…</p>
              ) : subjects.length === 0 ? (
                <p style={styles.smallHint}>Aucune matière trouvée pour cette classe et ce semestre.</p>
              ) : (
                <div style={styles.subjectBox}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button type="button" style={styles.smallBtn} onClick={selectAll}>
                      Tout cocher
                    </button>
                    <button type="button" style={styles.smallBtn} onClick={clearAll}>
                      Tout décocher
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {subjects.map((s) => (
                      <label key={s.id} style={styles.subjectRow}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.includes(s.id)}
                            onChange={() => toggleSubject(s.id)}
                          />
                          <span style={{ fontSize: ".85rem" }}>{getSubjectLabel(s)}</span>
                        </span>
                        <span style={styles.subjectSemesterBadge}>
                          {normalizeSemester(s.semesterMode || s.semester || "S1")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Matière (manuel)</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                style={{
                  ...styles.input,
                  opacity: selectedSubjectIds.length > 0 ? 0.5 : 1,
                }}
                disabled={selectedSubjectIds.length > 0}
                placeholder="Ex : Comptabilité Analytique de Gestion"
              />
              {selectedSubjectIds.length > 0 && (
                <p style={styles.smallHint}>
                  Désactivé car tu as coché {selectedSubjectIds.length} matière(s).
                </p>
              )}
            </div>

            <div style={styles.infoBox}>
              <div><b>Spécialité :</b> {specialiteDisplay || "—"}</div>
              <div><b>Pagination :</b> {MAX_ROWS_PER_PAGE} lignes max par page</div>
            </div>
          </div>

          <div style={styles.previewPanel}>
            <div style={styles.previewWrapper}>
              <div ref={sheetRef} style={sheetStyles.sheet}>
                <NotesHeader />

                <div style={sheetStyles.bigTitle}>{previewTitle}</div>

                <div style={sheetStyles.metaGrid}>
                  <div><b>CYCLE :</b> {cycleLabel || ""}</div>
                  <div style={{ textAlign: "right" }}><b>Année Académique :</b> {academicYear || ""}</div>

                  <div><b>SPECIALITE :</b> {specialiteDisplay || ""}</div>
                  <div style={{ textAlign: "right" }}><b>NIVEAU :</b> {level || ""}</div>

                  <div><b>SEMESTRE :</b> {semester === "S2" ? "2" : "1"}</div>
                  <div style={{ textAlign: "right" }}><b>{sessionLabel || ""}</b></div>
                </div>

                <div style={sheetStyles.metaGrid2}>
                  <div><b>MATIERE :</b> {previewSubjectText}</div>
                  <div style={{ textAlign: "right" }}><b>CREDIT :</b> {credit || ""}</div>
                </div>

                <div style={sheetStyles.tableWrap}>
                  <table style={sheetStyles.table}>
                    <thead>
                      <tr>
                        {previewColumns.map((col) => (
                          <th
                            key={col.key}
                            style={sheetStyles[mapColumnClassToStyleKey(col.className)]}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.length === 0 ? (
                        <tr>
                          <td style={sheetStyles.tdEmpty} colSpan={previewColumns.length}>
                            Aucune classe sélectionnée ou aucun étudiant.
                          </td>
                        </tr>
                      ) : (
                        sortedStudents.slice(0, MAX_ROWS_PER_PAGE).map((stu, idx) => (
                          <tr key={stu.id || idx}>
                            <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                            <td style={sheetStyles.tdNameCell}>
                              {cleanStr(
                                stu.fullName ||
                                  `${cleanStr(stu.lastName).toUpperCase()} ${cleanStr(stu.firstName)}`
                              ).toUpperCase()}
                            </td>
                            {Array.from({ length: previewBlankCells }).map((_, blankIdx) => (
                              <td key={blankIdx} style={sheetStyles.tdBlank}></td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={sheetStyles.signRow}>Nom, date et signature de l&apos;enseignant :</div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: ".8rem", color: "#6B7280" }}>
              Aperçu limité à {MAX_ROWS_PER_PAGE} lignes. En PDF, si la classe dépasse {MAX_ROWS_PER_PAGE} étudiants,
              des pages supplémentaires sont générées automatiquement.
            </div>
          </div>
        </div>

        <footer style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>

          <button
            type="button"
            style={{
              ...styles.primaryBtn,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
            onClick={handleDownloadPdf}
            disabled={busy}
          >
            {busy ? "Ouverture..." : "Générer en PDF"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- modal styles ---------------- */
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2100,
  },
  modal: {
    width: "95vw",
    maxWidth: "1500px",
    maxHeight: "95vh",
    background: "#ffffff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 900 },
  modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
  closeBtn: { border: "none", background: "transparent", fontSize: "1rem", cursor: "pointer" },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) 1fr",
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem 1.25rem",
    borderRight: "1px solid #E5E7EB",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
  previewWrapper: { display: "flex", justifyContent: "center" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { fontSize: ".8rem", fontWeight: 800, color: "#374151" },
  input: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 0.6rem",
    fontSize: ".85rem",
    outline: "none",
  },
  select: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 0.6rem",
    fontSize: ".85rem",
    background: "#ffffff",
    outline: "none",
  },
  smallHint: { margin: 0, marginTop: 2, fontSize: ".75rem", color: "#6B7280" },
  footer: {
    padding: "0.75rem 1.25rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 800,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#2563EB",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 900,
  },
  subjectBox: {
    border: "1px solid #D1D5DB",
    borderRadius: 10,
    padding: 10,
    background: "#fff",
    maxHeight: 240,
    overflow: "auto",
  },
  subjectRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectSemesterBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    height: 22,
    borderRadius: 999,
    fontSize: ".72rem",
    fontWeight: 800,
    background: "#EFF6FF",
    color: "#1D4ED8",
    border: "1px solid #BFDBFE",
    padding: "0 8px",
  },
  smallBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#fff",
    padding: "4px 10px",
    fontSize: ".75rem",
    cursor: "pointer",
    fontWeight: 800,
  },
  infoBox: {
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    background: "#F9FAFB",
    padding: "10px 12px",
    fontSize: ".82rem",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
};

/* ---------------- preview styles ---------------- */
const sheetStyles = {
  sheet: {
    width: "794px",
    minHeight: "1123px",
    background: "#ffffff",
    boxShadow: "0 0 0 1px #000000",
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    display: "flex",
    flexDirection: "column",
    fontSize: "11px",
    paddingBottom: 10,
  },
  bigTitle: {
    textAlign: "center",
    fontWeight: 900,
    fontSize: "16px",
    marginTop: 8,
    marginBottom: 10,
    textDecoration: "underline",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px 12px",
    padding: "0 10px 6px 10px",
    fontSize: "11px",
  },
  metaGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px 12px",
    padding: "0 10px 10px 10px",
    fontSize: "11px",
  },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px" },
  table: { width: "100%", borderCollapse: "collapse" },

  thNum: { border: "1px solid #000", padding: "4px", width: 34, textAlign: "center", background: "transparent" },
  thName: { border: "1px solid #000", padding: "4px", textAlign: "center", background: "transparent" },
  thSmall: { border: "1px solid #000", padding: "4px", width: 105, textAlign: "center", background: "transparent" },
  thDay: { border: "1px solid #000", padding: "4px", width: 72, textAlign: "center", background: "transparent" },
  thNote20: { border: "1px solid #000", padding: "4px", width: 120, textAlign: "center", background: "transparent" },

  tdCenter: { border: "1px solid #000", padding: "4px", textAlign: "center", height: 20 },
  tdNameCell: { border: "1px solid #000", padding: "4px", textAlign: "left", height: 20 },
  tdBlank: { border: "1px solid #000", padding: "4px", height: 20 },
  tdEmpty: {
    border: "1px solid #000",
    padding: "8px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },
  signRow: {
    padding: "0 10px",
    fontSize: "12px",
    marginTop: 6,
    textAlign: "left",
    fontWeight: 700,
  },
};

/* ---------------- printable HTML ---------------- */
function generateReportSheetPDFHTML({
  logoDataUrl,
  group,
  academicYear,
  semester,
  sessionLabel,
  cycleLabel,
  level,
  credit,
  templateType,
  subjectsToPrint,
  students,
  maxRowsPerPage,
}) {
  const safeYear = cleanStr(academicYear) || "—";
  const safeLevel = cleanStr(level) || "—";
  const safeSemesterNum = String(semester).toUpperCase() === "S2" ? "2" : "1";
  const safeSession = cleanStr(sessionLabel) || "";
  const safeCredit = cleanStr(credit) || "";
  const safeCycle = cleanStr(cycleLabel) || "—";
  const safeSpec = cleanStr(getSpecialiteDisplayFull(group)) || "—";

  const HEADER_TITLE_1 = "Institut Polytechnique des Métiers du Bâtiment,";
  const HEADER_TITLE_2 = "des Travaux Publics et de l’Entrepreneuriat";
  const HEADER_SUB = "Autorisation N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025";
  const CONTACT =
    "BP : 16398 Mfou / Tél : (+237) 696 79 58 05 - 672 83 80 94 · Site web : www.ipmbtpe.cm · E-mail : ipmbtpe@gmail.com";

  const esc = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const stuArr = Array.isArray(students) ? students : [];
  const studentPages = splitIntoPages(stuArr, Math.max(1, Number(maxRowsPerPage) || 32));
  const subjects = Array.isArray(subjectsToPrint) && subjectsToPrint.length ? subjectsToPrint : [""];

  const columns = getTemplateColumns(templateType);
  const blankCells = getBlankCellsForTemplate(templateType);
  const docTitle = templateType === "PRESENCE_DAYS" ? "FICHE DE PRÉSENCE" : "FICHE DE REPORT DE NOTE";

  const buildHeaderHTML = () => `
    <div class="doc-header">
      <div class="doc-header__left">
        ${
          logoDataUrl
            ? `<img class="doc-header__logo" src="${esc(logoDataUrl)}" alt="Logo" />`
            : `<div class="doc-header__logo-fallback"></div>`
        }
      </div>
      <div class="doc-header__center">
        <div class="doc-header__title">${esc(HEADER_TITLE_1)}</div>
        <div class="doc-header__title">${esc(HEADER_TITLE_2)}</div>
        <div class="doc-header__sub">${esc(HEADER_SUB)}</div>
        <div class="doc-header__contact">${esc(CONTACT)}</div>
      </div>
      <div class="doc-header__right"></div>
    </div>
    <div class="header-underline"></div>
  `;

  const buildWatermarkHTML = () => {
    if (!logoDataUrl) return "";
    return `
      <div class="watermark" aria-hidden="true">
        <img src="${esc(logoDataUrl)}" alt="" />
      </div>
    `;
  };

  const buildMetaHTML = (subjectLabel) => `
    <div class="meta-grid">
      <div><b>CYCLE :</b> ${esc(safeCycle)}</div>
      <div class="right"><b>Année Académique :</b> ${esc(safeYear)}</div>

      <div><b>SPECIALITE :</b> ${esc(safeSpec)}</div>
      <div class="right"><b>NIVEAU :</b> ${esc(safeLevel)}</div>

      <div><b>SEMESTRE :</b> ${esc(safeSemesterNum)}</div>
      <div class="right"><b>${esc(safeSession)}</b></div>
    </div>

    <div class="meta-grid2">
      <div><b>MATIERE :</b> ${esc(subjectLabel || "")}</div>
      <div class="right"><b>CREDIT :</b> ${esc(safeCredit)}</div>
    </div>
  `;

  const buildTheadHTML = () => {
    const ths = columns
      .map((col) => `<th class="${esc(col.className)}">${esc(col.label)}</th>`)
      .join("");
    return `<thead><tr>${ths}</tr></thead>`;
  };

  const buildRowsHTML = (pageStudents, rowOffset) => {
    if (!pageStudents.length) {
      return `<tr><td colspan="${columns.length}" class="td-empty">Aucun étudiant.</td></tr>`;
    }

    return pageStudents
      .map((s, i) => {
        const no = rowOffset + i + 1;
        const full = cleanStr(
          s.fullName || `${cleanStr(s.lastName).toUpperCase()} ${cleanStr(s.firstName)}`
        ).toUpperCase();

        const blanks = Array.from({ length: blankCells })
          .map(() => `<td class="td-blank"></td>`)
          .join("");

        return `
          <tr>
            <td class="td-center">${esc(no)}</td>
            <td class="td-left">${esc(full)}</td>
            ${blanks}
          </tr>
        `;
      })
      .join("");
  };

  const pagesHTML = subjects
    .map((subjectLabel) =>
      studentPages
        .map((pageStudents, pageIdx) => {
          const rowOffset = pageIdx * Math.max(1, Number(maxRowsPerPage) || 32);
          return `
            <div class="page">
              ${buildWatermarkHTML()}
              ${buildHeaderHTML()}

              <div class="big-title">${docTitle}</div>

              ${buildMetaHTML(subjectLabel)}

              <table>
                ${buildTheadHTML()}
                <tbody>${buildRowsHTML(pageStudents, rowOffset)}</tbody>
              </table>

              <div class="sign">Nom, date et signature de l’enseignant :</div>
            </div>
          `;
        })
        .join("")
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiche IPMBTPE</title>
  <style>
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }

    @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 11px; }

    .page {
      width: 210mm;
      min-height: 297mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      padding: 0 0 6mm 0;
      box-sizing: border-box;
    }

    .watermark{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      pointer-events:none;
      z-index:0;
      transform: translateY(-12mm);
    }
    .watermark img{
      width: 285mm;
      height: auto;
      opacity: 0.09;
      transform: rotate(-18deg);
    }

    .doc-header, .header-underline, .big-title, .meta-grid, .meta-grid2, table, .sign {
      position: relative;
      z-index: 1;
    }

    .doc-header{
      display:grid;
      grid-template-columns: 24mm 1fr 24mm;
      align-items:center;
      gap: 6mm;
      padding-top: 2mm;
    }
    .doc-header__logo{ width: 18mm; height: 18mm; object-fit: contain; display:block; }
    .doc-header__logo-fallback{ width:18mm; height:18mm; }
    .doc-header__center{ text-align:center; line-height: 1.15; }
    .doc-header__title{ font-weight: 900; font-size: 12px; }
    .doc-header__sub{ margin-top: 2px; font-size: 9px; font-weight: 700; }
    .doc-header__contact{ margin-top: 2px; font-size: 8.5px; font-weight: 600; }

    .header-underline{
      border-bottom: 2px solid #000;
      margin: 3mm 0 2mm 0;
    }

    .big-title{
      text-align:center;
      font-weight: 900;
      font-size: 16px;
      text-decoration: underline;
      margin: 3mm 0 3mm;
    }

    .meta-grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm 6mm;
      padding: 0 0 2mm 0;
      font-size: 11px;
    }
    .meta-grid2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm 6mm;
      padding: 0 0 3mm 0;
      font-size: 11px;
    }
    .right{ text-align:right; }

    table{
      width: 100%;
      border-collapse: collapse;
      margin-top: 1mm;
      table-layout: fixed;
    }

    th, td{
      border:1px solid #000;
      padding: 3px 4px;
      height: 20px;
      background: transparent !important;
      box-sizing: border-box;
    }

    th{
      font-weight: 900;
      text-align:center;
      word-break: break-word;
    }

    td{
      text-align:center;
      vertical-align: middle;
    }

    .col-no{ width: 6%; }
    .col-name{ width: 54%; }
    .col-small{ width: 10%; }
    .col-day{ width: 6.666%; }
    .col-note20{ width: 40%; }

    .td-left{
      text-align:left;
      padding-left: 6px;
      word-break: break-word;
    }

    .td-center{ text-align:center; }
    .td-blank{}
    .td-empty{ text-align:center; font-style: italic; padding: 10px; }

    .sign{
      margin-top: 4mm;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }
  </style>
</head>
<body>
  ${pagesHTML}
  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 700);
    };
  </script>
</body>
</html>`;
}