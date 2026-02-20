// src/components/documents/ClassNotesMatrixSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const DEFAULT_YEAR = "2025-2026";

const SEMESTERS = ["S1", "S2"];
const EXAMS = ["CC", "SN", "EXAMEN"];
const SESSIONS = ["Principale", "Rattrapage"];

// ✅ ton logo doit être accessible publiquement (public/)
// exemple : public/logo-ipmbtpe.png  => /logo-ipmbtpe.png
const LOGO_PUBLIC_PATH = "/logo-ipmbtpe.png";

// --- helpers ---
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

function cleanStr(x) {
  return (x ?? "").toString().trim();
}

// ✅ convertit une image (URL) en dataURL (base64) => marche dans window.open + print preview
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
  } catch (e) {
    console.warn("Logo non chargé (PDF):", e);
    return ""; // on laisse vide => l'entête reste, sans logo
  }
}

/**
 * ✅ Affiche 0..9 comme 00..09 ET 2.5 / 2,5 comme 02.5
 * (padding sur la partie entière)
 */
function formatNote2Digits(v) {
  if (v === undefined || v === null) return "";
  let s = String(v).trim();
  if (s === "") return "";

  // gérer la virgule française: 2,5 -> 2.5 (pour le traitement)
  s = s.replace(",", ".");

  // accepter formats: "2", "2.5", "02.5", "10", "14.5"
  const m = s.match(/^(\d+)(\.\d+)?$/);
  if (!m) return String(v).trim(); // si non-numérique, on laisse tel quel

  const intPart = m[1]; // "2"
  const decPart = m[2] || ""; // ".5" ou ""

  const padded = intPart.padStart(2, "0") + decPart;

  // ⚠️ Si tu veux afficher avec virgule dans l'UI/PDF, remplace la ligne du return par:
  // return padded.replace(".", ",");

  return padded; // garde le point (02.5)
}

export default function ClassNotesMatrixSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [exam, setExam] = useState("CC");
  const [session, setSession] = useState("Principale");

  // ✅ La matrix vient du backend (fusion notes + note_sheets)
  const [matrix, setMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);

  // ---------- Chargement des classes ----------
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      setSelectedClassId("");
      setClasses([]);
      setMatrix(null);

      try {
        const url1 = `${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`;
        const url2 = `${API_BASE}/api/classes?year=${encodeURIComponent(academicYear)}`;
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
  }, [academicYear]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const capitalizeFirst = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const getSpecialiteDisplay = (group) => {
    if (!group) return "";
    if (group.displayName && group.displayName.trim() !== "") {
      const beforeDash = group.displayName.split("-")[0].trim();
      if (beforeDash) return capitalizeFirst(beforeDash);
    }
    if (group.option && group.option.trim() !== "") return capitalizeFirst(group.option);
    if (group.specialite && group.specialite.trim() !== "") return capitalizeFirst(group.specialite);
    if (group.specialiteCode && group.specialiteCode.trim() !== "") return group.specialiteCode;
    if (group.optionCode && group.optionCode.trim() !== "") return group.optionCode;
    if (group.filiere && group.filiere.trim() !== "") return capitalizeFirst(group.filiere);
    return "";
  };

  const specDisplay = useMemo(() => getSpecialiteDisplay(selectedClass), [selectedClass]);

  // ✅ Charger la matrix (students + subjects(codes+labels) + values(notes) + stats)
  useEffect(() => {
    const loadMatrix = async () => {
      setMatrix(null);
      if (!selectedClassId || !academicYear || !semester || !exam || !session) return;

      setLoadingMatrix(true);
      try {
        const params = new URLSearchParams({
          academicYear: cleanStr(academicYear),
          classId: cleanStr(selectedClassId),
          semester: cleanStr(semester),
          exam: cleanStr(exam),
          session: cleanStr(session),
        });

        const url1 = `${API_BASE}/class-reports/notes-matrix?${params.toString()}`;
        const url2 = `${API_BASE}/api/class-reports/notes-matrix?${params.toString()}`;

        const data = await fetchJsonFirstOk([url1, url2]);
        setMatrix(data || null);
      } catch (err) {
        console.error("Erreur chargement notes matrix:", err);
        setMatrix(null);
      } finally {
        setLoadingMatrix(false);
      }
    };

    loadMatrix();
  }, [selectedClassId, academicYear, semester, exam, session]);

  // ✅ Colonnes UE = codes renvoyés par le backend (source de vérité)
  const subjectColumns = useMemo(() => {
    const cols =
      Array.isArray(matrix?.subjects) && matrix.subjects.length
        ? matrix.subjects.map((s) => cleanStr(s.code || "")).filter(Boolean)
        : [];
    return cols;
  }, [matrix]);

  // ✅ Légende: code -> label
  const legendItems = useMemo(() => {
    const items =
      Array.isArray(matrix?.subjects) && matrix.subjects.length
        ? matrix.subjects
            .map((s) => ({
              code: cleanStr(s.code || ""),
              label: cleanStr(s.label || ""),
            }))
            .filter((x) => x.code && x.label)
        : [];

    const seen = new Set();
    const uniq = [];
    for (const it of items) {
      if (seen.has(it.code)) continue;
      seen.add(it.code);
      uniq.push(it);
    }
    uniq.sort((a, b) => a.code.localeCompare(b.code));
    return uniq;
  }, [matrix]);

  // ✅ Étudiants = ceux renvoyés par le backend (source de vérité)
  const sortedStudents = useMemo(() => {
    const st = Array.isArray(matrix?.students) && matrix.students.length ? matrix.students : [];
    return [...st].sort((a, b) => {
      const nameA = `${cleanStr(a.lastName).toUpperCase()} ${cleanStr(a.firstName)}`.trim();
      const nameB = `${cleanStr(b.lastName).toUpperCase()} ${cleanStr(b.firstName)}`.trim();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return cleanStr(a.matricule).localeCompare(cleanStr(b.matricule));
    });
  }, [matrix]);

  const valuesMap = matrix?.values || {};
  const notesCount = matrix?.stats?.notes ?? 0;

  const getStudentDisplayName = (stu) => {
    const last = cleanStr(stu?.lastName || "").toUpperCase();
    const first = cleanStr(stu?.firstName || "");
    return cleanStr(`${last} ${first}`).toUpperCase();
  };

  // ✅ IMPORTANT: "Classe" du titre PDF = nom complet (title) si dispo
  const classFullName = selectedClass?.title || selectedClass?.abbrev || selectedClass?.id || "";

  const handleGeneratePdf = async () => {
    if (busy) return;
    if (!selectedClass) {
      alert("Veuillez d'abord choisir une classe.");
      return;
    }

    setBusy(true);
    try {
      // ✅ garantie logo visible dans PDF: dataURL
      const logoDataUrl = await toDataUrlFromPublicPath(LOGO_PUBLIC_PATH);

      const html = generateNotesMatrixPDFHTML({
        academicYear,
        classTitle: classFullName,
        specialite: specDisplay || "",
        semester,
        exam,
        students: sortedStudents,
        subjectColumns,
        values: valuesMap,
        legendItems,
        logoDataUrl,
      });

      const w = window.open("", "_blank");
      if (!w) {
        alert("Popup bloquée. Autorisez les popups pour générer le PDF.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Procès-verbal(classe) — A4 paysage</h2>
            <p style={styles.modalSubtitle}>
              Sélectionne Année / Classe / Semestre / Examen / Session, puis génère la liste.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          {/* LEFT */}
          <div style={styles.leftPanel}>
            <div style={styles.filtersRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Année académique</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={styles.pillSelect}
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Classe</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={styles.pillSelect}
                >
                  <option value="">{loadingClasses ? "Chargement..." : "— Choisir —"}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title || cls.abbrev || cls.id}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Semestre</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} style={styles.pillSelect}>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Examen</label>
                <select value={exam} onChange={(e) => setExam(e.target.value)} style={styles.pillSelect}>
                  {EXAMS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)} style={styles.pillSelect}>
                  {SESSIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {!selectedClass ? (
                <p style={styles.smallHint}>Choisis une classe pour voir l’aperçu.</p>
              ) : loadingMatrix ? (
                <p style={styles.smallHint}>Chargement des notes…</p>
              ) : subjectColumns.length === 0 ? (
                <p style={styles.smallHint}>Aucune UE trouvée pour cette classe.</p>
              ) : (
                <>
                  <p style={styles.smallHint}>
                    Colonnes UE (codes) : <strong>{subjectColumns.length}</strong>
                  </p>
                  <p style={styles.smallHint}>
                    Notes trouvées : <strong>{notesCount}</strong> — Étudiants :{" "}
                    <strong>{sortedStudents.length}</strong>
                  </p>
                </>
              )}

              {selectedClass && !loadingMatrix && !matrix && (
                <p style={{ ...styles.smallHint, color: "crimson" }}>
                  Impossible de charger les notes. Vérifie l’endpoint /class-reports/notes-matrix.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <div style={styles.previewPanel}>
            <div style={styles.previewWrapper}>
              <div ref={sheetRef} style={sheetStyles.sheetLandscape}>
                <NotesHeader />

                <div style={sheetStyles.metaRow}>
                  <div>
                    <span style={sheetStyles.metaLabel}>Année académique :</span>{" "}
                    <span style={sheetStyles.metaValue}>{academicYear || ""}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Classe :</span>{" "}
                    <span style={sheetStyles.metaValue}>{classFullName}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Semestre :</span>{" "}
                    <span style={sheetStyles.metaValue}>{semester}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Examen :</span>{" "}
                    <span style={sheetStyles.metaValue}>{exam}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Session :</span>{" "}
                    <span style={sheetStyles.metaValue}>{session}</span>
                  </div>
                </div>

                <div style={sheetStyles.metaRow}>
                  <div>
                    <span style={sheetStyles.metaLabel}>Spécialité :</span>{" "}
                    <span style={sheetStyles.metaValue}>{specDisplay || ""}</span>
                  </div>
                </div>

                <div style={sheetStyles.titleRow}>Procès Verbal ({classFullName || "CLASSE"})</div>

                <div style={sheetStyles.tableWrap}>
                  <table style={sheetStyles.table}>
                    <thead>
                      <tr>
                        <th style={sheetStyles.thNum}></th>
                        <th style={sheetStyles.thMat}>Matricule</th>
                        <th style={sheetStyles.thName}>Noms et prénoms</th>
                        {subjectColumns.map((code) => (
                          <th key={code} style={sheetStyles.thSubj} title={code}>
                            {code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedClass ? (
                        <tr>
                          <td colSpan={3 + Math.max(subjectColumns.length, 1)} style={sheetStyles.tdEmpty}>
                            Choisis une classe.
                          </td>
                        </tr>
                      ) : sortedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3 + Math.max(subjectColumns.length, 1)} style={sheetStyles.tdEmpty}>
                            Aucun étudiant dans cette classe.
                          </td>
                        </tr>
                      ) : (
                        sortedStudents.map((stu, idx) => {
                          const sid = cleanStr(stu.id || "");
                          const row = sid ? valuesMap?.[sid] || {} : {};
                          return (
                            <tr key={sid || idx}>
                              <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                              <td style={sheetStyles.tdMono}>{stu.matricule || ""}</td>
                              <td style={sheetStyles.tdNameCell}>{getStudentDisplayName(stu)}</td>
                              {subjectColumns.map((code) => {
                                const v = row?.[code];
                                const show = formatNote2Digits(v);
                                return (
                                  <td key={`${sid}-${code}`} style={sheetStyles.tdBlank}>
                                    {show}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={sheetStyles.footerRow}>Nom, date et signature du DAAC :</div>
              </div>
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
            onClick={handleGeneratePdf}
            disabled={busy}
          >
            {busy ? "Ouverture..." : "Générer en PDF"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- styles modale ---------- */
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
    maxWidth: "1600px",
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
  modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
  closeBtn: { border: "none", background: "transparent", fontSize: "1rem", cursor: "pointer" },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(360px, 420px) 1fr",
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem 1.25rem",
    borderRight: "1px solid #E5E7EB",
    overflowY: "auto",
  },
  previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
  previewWrapper: { display: "flex", justifyContent: "center" },
  filtersRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".78rem", fontWeight: 700, color: "#374151" },
  pillSelect: {
    height: 34,
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    padding: "0 0.8rem",
    fontSize: ".85rem",
    background: "#ffffff",
    outline: "none",
  },
  smallHint: { margin: 0, marginTop: 6, fontSize: ".78rem", color: "#6B7280" },
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
    fontWeight: 600,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#2563EB",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 800,
  },
};

/* ---------- styles fiche (preview) ---------- */
const sheetStyles = {
  sheetLandscape: {
    width: "1123px",
    minHeight: "794px",
    background: "#ffffff",
    boxShadow: "0 0 0 1px #000000",
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    display: "flex",
    flexDirection: "column",
    fontSize: "11px",
    paddingBottom: 10,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    padding: "6px 10px 0 10px",
    justifyContent: "space-between",
  },
  metaLabel: { fontWeight: 800 },
  metaValue: { fontWeight: 500 },
  titleRow: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: "14px",
    marginTop: 10,
    marginBottom: 6,
    textDecoration: "underline",
  },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },

  thNum: { border: "1px solid #000", padding: "3px 4px", width: 30, textAlign: "center" },
  thMat: { border: "1px solid #000", padding: "3px 4px", width: 130, textAlign: "center" },
  thName: { border: "1px solid #000", padding: "3px 6px", width: 360, textAlign: "left" },
  thSubj: {
    border: "1px solid #000",
    padding: "3px 4px",
    minWidth: 52,
    textAlign: "center",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },

  tdCenter: { border: "1px solid #000", padding: "3px 4px", textAlign: "center", verticalAlign: "middle" },

  // ✅ Police matricule plus visible (preview)
  tdMono: {
    border: "1px solid #000",
    padding: "3px 4px",
    fontFamily: '"Courier New", monospace',
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.2px",
    textAlign: "center",
    verticalAlign: "middle",
  },

  tdNameCell: { border: "1px solid #000", padding: "3px 6px", verticalAlign: "middle" },

  tdBlank: {
    border: "1px solid #000",
    padding: "0 4px",
    height: 18,
    textAlign: "center",
    verticalAlign: "middle",
    fontVariantNumeric: "tabular-nums",
  },

  tdEmpty: {
    border: "1px solid #000",
    padding: "10px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },
  footerRow: { marginTop: 4, padding: "0 10px", fontSize: "0.85rem", textAlign: "left" },
};

/* ---------- PDF HTML (A4 paysage) ---------- */
function generateNotesMatrixPDFHTML({
  academicYear,
  classTitle,
  specialite,
  semester,
  exam,
  students,
  subjectColumns,
  values,
  legendItems,
  logoDataUrl,
}) {
  const safeYear = academicYear || "—";
  const safeClass = classTitle || "—";
  const safeSpec = specialite || "—";
  const safeSemester = semester || "—";
  const safeExam = exam || "—";

  const colsAll = Array.isArray(subjectColumns) ? subjectColumns.filter(Boolean) : [];
  const vals = values || {};
  const legendAll = Array.isArray(legendItems) ? legendItems : [];

  const HEADER_TITLE_1 = "Institut Polytechnique des Métiers du Bâtiment,";
  const HEADER_TITLE_2 = "des Travaux Publics et de l’Entrepreneuriat";
  const HEADER_SUB =
    "Autorisation d’ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025";

  // chunk subjects by 11
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out.length ? out : [[]];
  };
  const pagesCols = chunk(colsAll, 11);

  const legendMap = new Map();
  for (const it of legendAll) {
    if (!it?.code || !it?.label) continue;
    legendMap.set(String(it.code), String(it.label));
  }

  const buildHeaderHTML = () => {
    return `
      <div class="doc-header">
        <div class="doc-header__left">
          ${
            logoDataUrl
              ? `<img class="doc-header__logo" src="${escapeHtml(logoDataUrl)}" alt="Logo" />`
              : `<div class="doc-header__logo-fallback"></div>`
          }
        </div>
        <div class="doc-header__center">
          <div class="doc-header__title">${escapeHtml(HEADER_TITLE_1)}</div>
          <div class="doc-header__title">${escapeHtml(HEADER_TITLE_2)}</div>
          <div class="doc-header__sub">${escapeHtml(HEADER_SUB)}</div>
        </div>
        <div class="doc-header__right"></div>
      </div>
    `;
  };

  const buildRowsHTML = (cols) => {
    if (!students || !students.length) {
      return `
        <tr>
          <td colspan="${3 + Math.max(cols.length, 1)}" class="td-empty">Aucun étudiant.</td>
        </tr>
      `;
    }

    return students
      .map((s, idx) => {
        const sid = cleanStr(s?.id || "");
        const last = cleanStr(s?.lastName || "").toUpperCase();
        const first = cleanStr(s?.firstName || "");
        const full = cleanStr(`${last} ${first}`).toUpperCase();
        const matricule = cleanStr(s?.matricule || "");
        const row = sid ? vals[sid] || {} : {};

        const cells = cols
          .map((code) => {
            const v = row?.[code];
            const txt = formatNote2Digits(v);
            return `<td class="td-note">${escapeHtml(txt)}</td>`;
          })
          .join("");

        return `
          <tr>
            <td class="td-center">${idx + 1}</td>
            <td class="td-mono">${escapeHtml(matricule)}</td>
            <td class="td-left">${escapeHtml(full)}</td>
            ${cells}
          </tr>
        `;
      })
      .join("");
  };

  const buildLegendHTML = (cols) => {
    const items = cols
      .map((code) => {
        const label = legendMap.get(code) || "";
        if (!label) return null;
        return { code, label };
      })
      .filter(Boolean);

    if (!items.length) return `<div class="legend-empty">Aucune légende disponible.</div>`;

    const list = items
      .map((it) => `<div class="legend-item"><b>${escapeHtml(it.code)}</b> = ${escapeHtml(it.label)}</div>`)
      .join("");

    return `<div class="legend-list">${list}</div>`;
  };

  const pagesHTML = pagesCols
    .map((cols) => {
      const headColsHTML = cols.map((c) => `<th class="th-subj">${escapeHtml(c)}</th>`).join("");
      const bodyRowsHTML = buildRowsHTML(cols);

      const legendOnRight = cols.length > 0 && cols.length <= 6;
      const legendHTML = buildLegendHTML(cols);

      return `
        <div class="page">
          ${buildHeaderHTML()}

          <div class="meta">
            <span><b>Année :</b> ${escapeHtml(safeYear)}</span>
            <span><b>Classe :</b> ${escapeHtml(safeClass)}</span>
            <span><b>Semestre :</b> ${escapeHtml(safeSemester)}</span>
            <span><b>Examen :</b> ${escapeHtml(safeExam)}</span>
          </div>
          <div class="meta" style="margin-top:6px;">
            <span><b>Spécialité :</b> ${escapeHtml(safeSpec)}</span>
          </div>

          <div class="title">Procès Verbal (${escapeHtml(safeClass)})</div>

          ${
            legendOnRight
              ? `
                <div class="layout">
                  <div class="table-area">
                    <table>
                      <thead>
                        <tr>
                          <th class="th-num"></th>
                          <th class="th-mat">Matricule</th>
                          <th class="th-name">Noms et prénoms</th>
                          ${headColsHTML}
                        </tr>
                      </thead>
                      <tbody>${bodyRowsHTML}</tbody>
                    </table>
                  </div>

                  <div class="legend-right">
                    <div class="legend-title">LÉGENDE (UE)</div>
                    ${legendHTML}
                  </div>
                </div>
              `
              : `
                <table>
                  <thead>
                    <tr>
                      <th class="th-num"></th>
                      <th class="th-mat">Matricule</th>
                      <th class="th-name">Noms et prénoms</th>
                      ${headColsHTML}
                    </tr>
                  </thead>
                  <tbody>${bodyRowsHTML}</tbody>
                </table>

                <div class="legend-bottom">
                  <div class="legend-title">LÉGENDE (UE)</div>
                  ${legendHTML}
                </div>
              `
          }

          <div class="footer">
            Nom, date et signature du DAAC :
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Liste des notes</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 11px; }
    .page { width: 297mm; min-height: 210mm; page-break-after: always; }

    /* ENTÊTE PDF (sur chaque page) */
    .doc-header{
      display:grid;
      grid-template-columns: 22mm 1fr 22mm;
      align-items:center;
      gap: 6mm;
      padding-top: 2mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #000;
      margin-bottom: 3mm;
    }
    .doc-header__logo{
      width: 18mm;
      height: 18mm;
      object-fit: contain;
      display:block;
    }
    .doc-header__logo-fallback{
      width:18mm; height:18mm;
    }
    .doc-header__center{
      text-align:center;
      line-height: 1.2;
    }
    .doc-header__title{
      font-weight: 900;
      font-size: 12px;
    }
    .doc-header__sub{
      margin-top: 2px;
      font-size: 9.5px;
      font-weight: 600;
    }

    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 2mm; }
    .meta span b { font-weight: 800; }

    .title { text-align: center; font-weight: 900; font-size: 14px; margin: 6px 0 6px; text-decoration: underline; }

    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000; height: 22px; }
    th { padding: 4px; text-align: center; }
    td { padding: 0 4px; text-align: center; vertical-align: middle; font-variant-numeric: tabular-nums; }

    .th-num { width: 30px; }

    /* ✅ PDF: matricule plus visible */
    .th-mat { width: 32mm; }
    .td-mono { font-family: "Courier New", monospace; font-size: 12px; font-weight: 900; letter-spacing: .2px; }

    /* ✅ PDF: noms plus large */
    .th-name { width: 90mm; text-align: left; padding-left: 6px; }
    .td-left { text-align: left; padding-left: 6px; }

    /* ✅ PDF: matières plus étroites */
    .th-subj { min-width: 14mm; font-size: 10px; white-space: nowrap; }

    .td-center { text-align: center; }
    .td-empty { text-align: center; font-style: italic; color: #666; padding: 12px; }
    .td-note { text-align: center; vertical-align: middle; font-variant-numeric: tabular-nums; }

    .legend-title { font-weight: 900; font-size: 11px; margin-bottom: 6px; text-decoration: underline; }
    .legend-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
    .legend-item { font-size: 10px; }
    .legend-empty { font-size: 10px; color: #666; font-style: italic; }

    .legend-bottom { margin-top: 10px; border-top: 1px solid #000; padding-top: 6px; }

    .layout { display: grid; grid-template-columns: 1fr 72mm; gap: 8mm; align-items: start; }
    .table-area { min-width: 0; }
    .legend-right { border: 1px solid #000; padding: 6px; }

    .footer { margin-top: 8px; font-size: 12px; text-align: right; }
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

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
