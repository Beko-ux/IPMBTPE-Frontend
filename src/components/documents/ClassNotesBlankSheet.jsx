// src/components/documents/ClassNotesBlankSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const DEFAULT_YEAR = "2025-2026";

export default function ClassNotesBlankSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [busy, setBusy] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [level, setLevel] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  const sheetRef = useRef(null);

  // ---------- Chargement des classes ----------
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(
          `${API_BASE}/classes?year=${encodeURIComponent(DEFAULT_YEAR)}`
        );
        const data = await res.json();
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

  useEffect(() => {
    if (!selectedClass) return;

    if (selectedClass.academicYear) setAcademicYear(selectedClass.academicYear);

    if (selectedClass.level || selectedClass.niveau) {
      setLevel(selectedClass.level || selectedClass.niveau);
    } else if (selectedClass.title) {
      setLevel(selectedClass.title);
    }

    setSelectedSubjectIds([]);
    setSubjectName("");
  }, [selectedClass]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const nameA = (a.fullName || "").toUpperCase();
      const nameB = (b.fullName || "").toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      const matA = (a.matricule || "").toUpperCase();
      const matB = (b.matricule || "").toUpperCase();
      return matA.localeCompare(matB);
    });
  }, [students]);

  const getSubjectLabel = (s) =>
    String(s?.label || s?.ueLabel || s?.name || "").trim();

  // ✅ Charger matières pour la classe (globales, pas par année)
  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedClass) {
        setSubjects([]);
        return;
      }
      setLoadingSubjects(true);
      try {
        // on peut passer classId, mais les matières globales resteront visibles
        const res = await fetch(`${API_BASE}/subjects?classId=${encodeURIComponent(selectedClass.id)}`);
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];

        // clé de la classe
        const classFiliere = selectedClass.filiere || "";
        const classRefKey = selectedClass.optionCode || selectedClass.specialiteCode || "";
        const classCycle = selectedClass.cycle || "";
        const classStudyYear = selectedClass.studyYear != null ? String(selectedClass.studyYear) : "";

        const filtered = all.filter((s) => {
          const label = getSubjectLabel(s);
          if (!label) return false;

          const sFiliere = s.filiere || "";
          const sRefKey = s.optionCode || s.specialiteCode || "";
          const sCycle = s.cycle || "";
          const sStudyYear = s.studyYear != null ? String(s.studyYear) : "";
          const isOpt = !!s.isOptional;

          // Toujours: même filière si elle est définie
          if (classFiliere && sFiliere && sFiliere !== classFiliere) return false;

          // Toujours: même cycle/année si définis
          if (classCycle && sCycle && sCycle !== classCycle) return false;
          if (classStudyYear && sStudyYear && sStudyYear !== classStudyYear) return false;

          // ✅ Règle clé:
          // - Si c'est optionnel => on ne force PAS le refKey
          // - Si ce n'est pas optionnel => refKey doit matcher (si présent)
          if (!isOpt) {
            if (classRefKey && sRefKey && sRefKey !== classRefKey) return false;
          }

          return true;
        });

        // dédoublonner par label
        const seen = new Set();
        const uniq = [];
        for (const s of filtered) {
          const label = getSubjectLabel(s);
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push({ ...s, label });
        }

        uniq.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setSubjects(uniq);
      } catch (err) {
        console.error("Erreur chargement matières:", err);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  const specDisplay = getSpecialiteDisplay(selectedClass);

  const selectedSubjects = useMemo(() => {
    const map = new Map(subjects.map((s) => [s.id, s]));
    return selectedSubjectIds.map((id) => map.get(id)).filter(Boolean);
  }, [subjects, selectedSubjectIds]);

  const toggleSubject = (id) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSubjectIds(subjects.map((s) => s.id));
  const clearAll = () => setSelectedSubjectIds([]);

  const openPrintableWindow = (subjectsToPrint) => {
    const html = generateReportSheetPDFHTML({
      group: selectedClass,
      academicYear,
      level,
      subjectsToPrint,
      getSpecialiteDisplay,
      students: sortedStudents,
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

  const handleDownloadPdf = () => {
    if (busy) return;
    if (!selectedClass) {
      alert("Veuillez d'abord choisir une classe.");
      return;
    }

    const picked = selectedSubjects;
    const manual = subjectName.trim();

    if (picked.length === 0 && !manual) {
      alert("Veuillez cocher au moins une matière (ou renseigner le nom).");
      return;
    }

    setBusy(true);
    try {
      const toPrint =
        picked.length > 0 ? picked.map((s) => getSubjectLabel(s)) : [manual];

      openPrintableWindow(toPrint);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Fiche de report de notes</h2>
            <p style={styles.modalSubtitle}>
              Sélectionne une classe, puis coche les matières à imprimer (1 page par matière).
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
              <p style={styles.smallHint}>
                Les étudiants de cette classe remplissent automatiquement le tableau.
              </p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Année académique</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={styles.input}
                placeholder="Ex : 2025-2026"
              />
              <p style={styles.smallHint}>
                (Pour l’instant les matières sont globales, on ne filtre pas par année.)
              </p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Niveau</label>
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={styles.input}
                placeholder="Ex : BTS1"
              />
            </div>

            <div style={{ ...styles.fieldGroup, marginTop: 8 }}>
              <label style={styles.label}>Matières (UE) de la classe</label>

              {!selectedClass ? (
                <p style={styles.smallHint}>Choisis une classe pour voir ses matières.</p>
              ) : loadingSubjects ? (
                <p style={styles.smallHint}>Chargement des matières…</p>
              ) : subjects.length === 0 ? (
                <p style={styles.smallHint}>
                  Aucune matière trouvée (normal + optionnelles). On vérifiera ensuite le semestre.
                </p>
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
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(s.id)}
                          onChange={() => toggleSubject(s.id)}
                        />
                        <span style={{ fontSize: ".85rem" }}>
                          {getSubjectLabel(s)}{" "}
                          {s.isOptional ? (
                            <em style={{ color: "#6B7280" }}>(optionnelle)</em>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Matière (manuel - optionnel)</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                style={{
                  ...styles.input,
                  opacity: selectedSubjectIds.length > 0 ? 0.5 : 1,
                }}
                disabled={selectedSubjectIds.length > 0}
                placeholder="Ex : Algèbre Linéaire"
              />
              {selectedSubjectIds.length > 0 && (
                <p style={styles.smallHint}>
                  Désactivé car tu as coché {selectedSubjectIds.length} matière(s).
                </p>
              )}
            </div>

            <p style={styles.smallHint}>
              Spécialité détectée automatiquement à partir de la classe (displayName / option / codes…).
            </p>
          </div>

          <div style={styles.previewPanel}>
            <div style={styles.previewWrapper}>
              <div ref={sheetRef} style={sheetStyles.sheet}>
                <NotesHeader />

                <div style={sheetStyles.infoRow}>
                  <div>
                    <span style={sheetStyles.infoLabel}>Année académique :</span>{" "}
                    <span style={sheetStyles.infoValue}>{academicYear || ""}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.infoLabel}>Niveau :</span>{" "}
                    <span style={sheetStyles.infoValue}>{level || ""}</span>
                  </div>
                </div>

                <div style={sheetStyles.infoRow}>
                  <div>
                    <span style={sheetStyles.infoLabel}>Spécialité :</span>{" "}
                    <span style={sheetStyles.infoValue}>{specDisplay || ""}</span>
                  </div>
                </div>

                <div style={sheetStyles.titleRow}>FICHE DE REPORT DE NOTES</div>

                <div style={sheetStyles.tableWrap}>
                  <table style={sheetStyles.table}>
                    <thead>
                      <tr>
                        <th colSpan={5} style={sheetStyles.thMatiere}>
                          Matière :{" "}
                          {selectedSubjects.length > 0
                            ? `${selectedSubjects.length} matière(s) sélectionnée(s)`
                            : subjectName || ""}
                        </th>
                      </tr>
                      <tr>
                        <th style={sheetStyles.thNum}>N°</th>
                        <th style={sheetStyles.th}>Matricule</th>
                        <th style={sheetStyles.th}>Noms et prénoms</th>
                        <th style={sheetStyles.thSmall}>
                          CC
                          <br />/ 20
                        </th>
                        <th style={sheetStyles.thSmall}>
                          SN
                          <br />/ 20
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.length === 0 && (
                        <tr>
                          <td style={sheetStyles.tdEmpty} colSpan={5}>
                            Aucune classe sélectionnée ou aucun étudiant.
                          </td>
                        </tr>
                      )}
                      {sortedStudents.map((stu, idx) => (
                        <tr key={stu.id || idx}>
                          <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                          <td style={sheetStyles.tdMono}>{stu.matricule || ""}</td>
                          <td style={sheetStyles.tdName}>{(stu.fullName || "").toUpperCase()}</td>
                          <td style={sheetStyles.tdBlank}></td>
                          <td style={sheetStyles.tdBlank}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={sheetStyles.footerRow}>Nom, date et signature de l&apos;enseignant :</div>
              </div>
            </div>
          </div>
        </div>

        <footer style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
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
          </div>
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
    maxWidth: "1400px",
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
  modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 700 },
  modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
  closeBtn: { border: "none", background: "transparent", fontSize: "1rem", cursor: "pointer" },
  body: { flex: 1, display: "grid", gridTemplateColumns: "minmax(320px, 360px) 1fr", minHeight: 0 },
  leftPanel: { padding: "1rem 1.25rem", borderRight: "1px solid #E5E7EB", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" },
  previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
  previewWrapper: { display: "flex", justifyContent: "center" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".8rem", fontWeight: 600, color: "#374151" },
  input: { height: 34, borderRadius: 8, border: "1px solid #D1D5DB", padding: "0 0.6rem", fontSize: ".85rem" },
  select: { height: 34, borderRadius: 8, border: "1px solid #D1D5DB", padding: "0 0.6rem", fontSize: ".85rem", background: "#ffffff" },
  smallHint: { margin: 0, marginTop: 2, fontSize: ".75rem", color: "#6B7280" },
  footer: { padding: "0.75rem 1.25rem", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" },
  secondaryBtn: { borderRadius: 999, border: "1px solid #D1D5DB", background: "#ffffff", padding: "0.45rem 1.1rem", fontSize: ".85rem", cursor: "pointer" },
  primaryBtn: { borderRadius: 999, border: "none", background: "#2563EB", color: "#ffffff", padding: "0.45rem 1.1rem", fontSize: ".85rem", cursor: "pointer", fontWeight: 700 },
  subjectBox: { border: "1px solid #D1D5DB", borderRadius: 10, padding: 10, background: "#fff", maxHeight: 220, overflow: "auto" },
  subjectRow: { display: "flex", gap: 8, alignItems: "center" },
  smallBtn: { borderRadius: 999, border: "1px solid #D1D5DB", background: "#fff", padding: "4px 10px", fontSize: ".75rem", cursor: "pointer", fontWeight: 600 },
};

/* ---------- styles fiche ---------- */
const sheetStyles = {
  sheet: { width: "794px", minHeight: "1123px", background: "#ffffff", boxShadow: "0 0 0 1px #000000", fontFamily: 'Arial, "Helvetica Neue", sans-serif', display: "flex", flexDirection: "column", fontSize: "11px" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "4px 10px 0 10px" },
  infoLabel: { fontWeight: "bold" },
  infoValue: { fontWeight: "normal" },
  titleRow: { textAlign: "center", fontWeight: "800", fontSize: "16px", marginTop: 10, marginBottom: 6, textDecoration: "underline" },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px" },
  table: { width: "100%", borderCollapse: "collapse" },
  thMatiere: { border: "1px solid #000000", padding: "6px 8px", textAlign: "left", fontWeight: "bold" },
  thNum: { border: "1px solid #000000", padding: "3px 4px", width: 30, textAlign: "center" },
  th: { border: "1px solid #000000", padding: "3px 4px", textAlign: "center" },
  thSmall: { border: "1px solid #000000", padding: "3px 4px", width: 55, textAlign: "center", whiteSpace: "pre-line" },
  tdCenter: { border: "1px solid #000000", padding: "3px 4px", textAlign: "center" },
  tdMono: { border: "1px solid #000000", padding: "3px 4px", fontFamily: '"Courier New", monospace', fontSize: "10px" },
  tdName: { border: "1px solid #000000", padding: "3px 4px" },
  tdBlank: { border: "1px solid #000000", padding: "3px 4px", height: 16 },
  tdEmpty: { border: "1px solid #000000", padding: "6px", textAlign: "center", fontStyle: "italic", color: "#6B7280" },
  footerRow: { marginTop: 4, borderTop: "none", paddingTop: 2, fontSize: "0.8rem", textAlign: "left" },
};

// --- ton generateReportSheetPDFHTML reste inchangé ici ---
function generateReportSheetPDFHTML({ group, academicYear, level, subjectsToPrint, getSpecialiteDisplay, students }) {
  const safeYear = academicYear || "—";
  const safeLevel = level || "—";
  const safeSpec = group ? getSpecialiteDisplay(group) || "—" : "—";
  const logoSrc = "/assets/ipmbtpe-logo.png";

  const rowsHTML =
    students && students.length
      ? students
          .map((s, idx) => {
            const full = (s.fullName || "").toUpperCase();
            const matricule = s.matricule || "";
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${matricule}</td>
                <td class="td-left">${full}</td>
                <td></td>
                <td></td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="5">Aucun étudiant.</td>
        </tr>
      `;

  const pages = (subjectsToPrint || [""]).map((subj) => {
    const safeSubject = subj || "";
    return `
      <div class="page">
        <div class="header-row">
          <div class="header-logo-box">
            <img src="${logoSrc}" alt="IPMBTPE" />
          </div>
          <div class="header-text-box">
            <div class="school-name">
              Institut Polytechnique des Métiers du Bâtiment,<br />
              des Travaux Publics et de l’Entrepreneuriat
            </div>
            <div class="school-subtitle">
              <strong><em>Autorisation d’ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025</em></strong>
            </div>
            <div class="school-contact">
              BP : 16398 Mfou / Tél : (+237) 696 79 58 05 - 672 83 80 94 · Site web : www.ipmbtpe.cm · E-mail : ipmbtpe@gmail.com
            </div>
          </div>
        </div>
        <div class="header-underline"></div>

        <div class="meta-block">
          <div class="meta-row">
            <div><span class="meta-label">Année académique :</span> ${safeYear}</div>
            <div><span class="meta-label">Niveau :</span> ${safeLevel}</div>
          </div>
          <div class="meta-row">
            <div><span class="meta-label">Spécialité :</span> ${safeSpec}</div>
            <div></div>
          </div>
        </div>

        <div class="center-title">FICHE DE REPORT DE NOTES</div>

        <table>
          <thead>
            <tr>
              <th class="th-matiere" colspan="5">Matière : ${safeSubject}</th>
            </tr>
            <tr>
              <th class="th-n">N°</th>
              <th class="th-matricule">Matricule</th>
              <th class="th-name">Noms et prénoms</th>
              <th class="th-note"><div>CC</div><div>/ 20</div></th>
              <th class="th-note"><div>SN</div><div>/ 20</div></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="footer-row">
          Nom, date et signature de l&apos;enseignant :
        </div>
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiche de report de notes</title>
  <style>
    @page { size: A4; margin: 10mm 10mm 15mm 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 12px; }
    .page { width: 210mm; min-height: 297mm; page-break-after: always; }
    .header-row { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 6px; margin-bottom: 8px; }
    .header-logo-box img { width: 110px; height: auto; }
    .header-text-box { flex: 1; text-align: center; }
    .school-name { font-size: 16px; font-weight: 700; line-height: 1.3; margin-bottom: 3px; }
    .school-subtitle { font-size: 10px; font-weight: 700; font-style: italic; margin-bottom: 2px; }
    .school-contact { font-size: 10px; }
    .header-underline { border-bottom: 3px solid #00b89c; margin: 5px 0 12px 0; }
    .meta-block { margin: 10px 0; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-label { font-weight: 700; }
    .center-title { text-align: center; font-weight: 800; font-size: 16px; text-decoration: underline; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 5px; text-align: center; height: 25px; }
    .th-matiere { text-align: left; font-weight: bold; padding: 8px 10px; }
    .th-n { width: 30px; }
    .th-matricule { width: 87px; }
    .th-name { text-align: left; padding-left: 6px; width: 182px; }
    .th-note { width: 45px; line-height: 1.2; padding: 2px 4px; }
    .th-note div { font-size: 10px; }
    .td-left { text-align: left; padding-left: 6px; }
    .footer-row { margin-top: 6px; font-size: 12px; text-align: right; }
  </style>
</head>
<body>
  ${pages.join("")}
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function () { window.close(); }, 700);
    };
  </script>
</body>
</html>
`;
}
