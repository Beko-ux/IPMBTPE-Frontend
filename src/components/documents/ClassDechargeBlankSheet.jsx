// src/components/documents/ClassDechargeBlankSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const DEFAULT_YEAR = "2025-2026";

export default function ClassDechargeBlankSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [busy, setBusy] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [level, setLevel] = useState("");

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

    if (group.option && group.option.trim() !== "")
      return capitalizeFirst(group.option);
    if (group.specialite && group.specialite.trim() !== "")
      return capitalizeFirst(group.specialite);
    if (group.specialiteCode && group.specialiteCode.trim() !== "")
      return group.specialiteCode;
    if (group.optionCode && group.optionCode.trim() !== "")
      return group.optionCode;
    if (group.filiere && group.filiere.trim() !== "")
      return capitalizeFirst(group.filiere);
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

  const specDisplay = getSpecialiteDisplay(selectedClass);

  const openPrintableWindow = () => {
    const html = generateDechargeSheetPDFHTML({
      group: selectedClass,
      academicYear,
      level,
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

    setBusy(true);
    try {
      openPrintableWindow();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Fiche de décharge (classe)</h2>
            <p style={styles.modalSubtitle}>
              Sélectionne une classe, puis génère la fiche.
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
                  {loadingClasses
                    ? "Chargement des classes..."
                    : "-- Sélectionner une classe --"}
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title || cls.abbrev || cls.id}
                  </option>
                ))}
              </select>
              <p style={styles.smallHint}>
                Les étudiants de cette classe remplissent automatiquement le
                tableau.
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

            <p style={styles.smallHint}>
              Spécialité détectée automatiquement à partir de la classe
              (displayName / option / codes…).
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

                <div style={sheetStyles.titleRow}>FICHE DE DÉCHARGE</div>

                <div style={sheetStyles.tableWrap}>
                  <table style={sheetStyles.table}>
                    <thead>
                      <tr>
                        <th style={sheetStyles.thNum}>N°</th>
                        <th style={sheetStyles.thMat}>Matricule</th>
                        <th style={sheetStyles.thName}>Noms et prénoms</th>
                        <th style={sheetStyles.thExtra}></th>
                        <th style={sheetStyles.thExtra}></th>
                        <th style={sheetStyles.thExtra}></th>
                        <th style={sheetStyles.thExtra}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.length === 0 && (
                        <tr>
                          <td style={sheetStyles.tdEmpty} colSpan={7}>
                            Aucune classe sélectionnée ou aucun étudiant.
                          </td>
                        </tr>
                      )}
                      {sortedStudents.map((stu, idx) => (
                        <tr key={stu.id || idx}>
                          <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                          <td style={sheetStyles.tdMono}>{stu.matricule || ""}</td>
                          <td style={sheetStyles.tdName}>
                            {(stu.fullName || "").toUpperCase()}
                          </td>
                          <td style={sheetStyles.tdBlank}></td>
                          <td style={sheetStyles.tdBlank}></td>
                          <td style={sheetStyles.tdBlank}></td>
                          <td style={sheetStyles.tdBlank}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={sheetStyles.footerRow}>
                  Nom, date et signature du surveillant :
                </div>
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
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: "1rem",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(320px, 360px) 1fr",
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
  label: { fontSize: ".8rem", fontWeight: 600, color: "#374151" },
  input: {
    height: 34,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    padding: "0 0.6rem",
    fontSize: ".85rem",
  },
  select: {
    height: 34,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    padding: "0 0.6rem",
    fontSize: ".85rem",
    background: "#ffffff",
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
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#2563EB",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 700,
  },
};

/* ---------- styles fiche ---------- */
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
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 10px 0 10px",
  },
  infoLabel: { fontWeight: "bold" },
  infoValue: { fontWeight: "normal" },
  titleRow: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: "16px",
    marginTop: 10,
    marginBottom: 6,
    textDecoration: "underline",
  },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px" },
  table: { width: "100%", borderCollapse: "collapse" },

  thNum: {
    border: "1px solid #000000",
    padding: "3px 4px",
    width: 30,
    textAlign: "center",
  },
  thMat: {
    border: "1px solid #000000",
    padding: "3px 4px",
    width: 110,
    textAlign: "center",
  },
  thName: { border: "1px solid #000000", padding: "3px 6px", textAlign: "left" },
  thExtra: {
    border: "1px solid #000000",
    padding: "3px 4px",
    width: 70,
    textAlign: "center",
  },

  tdCenter: { border: "1px solid #000000", padding: "3px 4px", textAlign: "center" },
  tdMono: {
    border: "1px solid #000000",
    padding: "3px 4px",
    fontFamily: '"Courier New", monospace',
    fontSize: "10px",
    textAlign: "center",
  },
  tdName: { border: "1px solid #000000", padding: "3px 6px" },
  tdBlank: { border: "1px solid #000000", padding: "3px 4px", height: 18 },
  tdEmpty: {
    border: "1px solid #000000",
    padding: "6px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },
  footerRow: {
    marginTop: 4,
    borderTop: "none",
    paddingTop: 2,
    fontSize: "0.8rem",
    textAlign: "left",
  },
};

function generateDechargeSheetPDFHTML({ group, academicYear, level, getSpecialiteDisplay, students }) {
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
                <td></td>
                <td></td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="7">Aucun étudiant.</td>
        </tr>
      `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiche de décharge</title>
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

    .th-n { width: 30px; }
    .th-matricule { width: 95px; }
    .th-name { text-align: left; padding-left: 6px; }
    .th-extra { width: 22mm; }
    .td-left { text-align: left; padding-left: 6px; }

    .footer-row { margin-top: 8px; font-size: 12px; text-align: right; }
  </style>
</head>
<body>
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

    <div class="center-title">FICHE DE DÉCHARGE</div>

    <table>
      <thead>
        <tr>
          <th class="th-n">N°</th>
          <th class="th-matricule">Matricule</th>
          <th class="th-name">Noms et prénoms</th>
          <th class="th-extra"></th>
          <th class="th-extra"></th>
          <th class="th-extra"></th>
          <th class="th-extra"></th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>

    <div class="footer-row">
      Nom, date et signature du surveillant :
    </div>
  </div>

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
