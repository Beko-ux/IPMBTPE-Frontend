// src/pages/NotesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Printer } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function NotesPage({ currentSection = "notes", onNavigate }) {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtres
  const [academicYear, setAcademicYear] = useState("");
  const [filiere, setFiliere] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [studyYear, setStudyYear] = useState("");

  // Charger les étudiants une fois pour alimenter les filtres
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/students`);
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setStudents([]);
      }
    };

    loadStudents();
  }, []);

  // Charger les fiches (groups) depuis le backend, selon les filtres
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url =
          `${API_BASE}/notes/preview` +
          `?academicYear=${encodeURIComponent(academicYear || "")}` +
          `&filiere=${encodeURIComponent(filiere || "")}` +
          `&specialite=${encodeURIComponent(specialite || "")}` +
          `&studyYear=${encodeURIComponent(studyYear || "")}`;

        const res = await fetch(url);
        const data = await res.json();
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch (e) {
        console.error(e);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [academicYear, filiere, specialite, studyYear]);

  // Années académiques possibles
  const academicYearOptions = useMemo(() => buildAcademicYears(), []);

  // Options de filtres calculées depuis les étudiants
  const filiereOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => s.filiere && set.add(s.filiere));
    return Array.from(set).sort();
  }, [students]);

  const specialiteOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (filiere && s.filiere !== filiere) return;
      if (s.specialite) set.add(s.specialite);
      if (s.specialiteCode) set.add(s.specialiteCode);
    });
    return Array.from(set).sort();
  }, [students, filiere]);

  const studyYearOptions = [1, 2, 3, 4, 5];

  const totalStudents = useMemo(
    () => groups.reduce((sum, g) => sum + (g.students?.length || 0), 0),
    [groups]
  );
  const groupCount = groups.length;

  // Fonction pour formater avec première lettre en majuscule
  const capitalizeFirst = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  // Fonction simplifiée pour afficher la spécialité
  const getSpecialiteDisplay = (group) => {
    if (group.displayName && group.displayName.trim() !== "") {
      return capitalizeFirst(group.displayName);
    }
    
    if (group.option && group.option.trim() !== "") {
      return capitalizeFirst(group.option);
    }
    
    if (group.specialite && group.specialite.trim() !== "") {
      return capitalizeFirst(group.specialite);
    }
    
    if (group.specialiteCode && group.specialiteCode.trim() !== "") {
      return group.specialiteCode;
    }
    
    if (group.optionCode && group.optionCode.trim() !== "") {
      return group.optionCode;
    }
    
    return "Spécialité non définie";
  };

  // Fonction pour détecter les chefs de classe
  function isClassRepresentativeRole(role) {
    if (!role) return false;
    const nr = role.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!nr) return false;
    return nr.startsWith("delegue") || nr.startsWith("adjoint") || nr.includes("chef");
  }

  // Fonction pour exporter/ouvrir une fiche en PDF (méthode simple)
  const exportGroupToPDF = (group) => {
    const html = generatePDFHTML(group, getSpecialiteDisplay, isClassRepresentativeRole);
    
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup bloquée. Autorisez les popups pour exporter en PDF.");
      return;
    }
    
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Fonction pour exporter toutes les fiches filtrées en PDF
  const exportAllToPDF = () => {
    if (groups.length === 0) {
      alert("Aucune fiche à exporter.");
      return;
    }

    const html = generateAllPDFsHTML(groups, getSpecialiteDisplay, isClassRepresentativeRole);
    
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup bloquée. Autorisez les popups pour exporter en PDF.");
      return;
    }
    
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar
          currentSection={currentSection}
          onNavigate={onNavigate}
        />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />
        <div style={styles.pageBody}>
          <div style={styles.container}>
            <NotesHeader
              loading={loading}
              totalStudents={totalStudents}
              groupCount={groupCount}
              academicYear={academicYear}
              setAcademicYear={setAcademicYear}
              academicYearOptions={academicYearOptions}
              filiere={filiere}
              setFiliere={setFiliere}
              filiereOptions={filiereOptions}
              specialite={specialite}
              setSpecialite={setSpecialite}
              specialiteOptions={specialiteOptions}
              studyYear={studyYear}
              setStudyYear={setStudyYear}
              studyYearOptions={studyYearOptions}
              groups={groups}
              exportAllToPDF={exportAllToPDF}
            />

            <NotesSheetPreview 
              groups={groups} 
              getSpecialiteDisplay={getSpecialiteDisplay}
              exportGroupToPDF={exportGroupToPDF}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================
 * Header : filtres + résumé + boutons d'export
 * ============================ */

function NotesHeader({
  loading,
  totalStudents,
  groupCount,
  academicYear,
  setAcademicYear,
  academicYearOptions,
  filiere,
  setFiliere,
  filiereOptions,
  specialite,
  setSpecialite,
  specialiteOptions,
  studyYear,
  setStudyYear,
  studyYearOptions,
  groups,
  exportAllToPDF,
}) {
  const inputStyle = (extra = {}) => ({
    height: 38,
    borderRadius: 999,
    border: "1px solid var(--border)",
    padding: "0 0.9rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #f9fafb)",
    outline: "none",
    minWidth: 0,
    ...extra,
  });

  return (
    <section style={headerStyles.card}>
      <div style={headerStyles.left}>
        <h1 style={headerStyles.title}>Gestion des notes</h1>
        <p style={headerStyles.subtitle}>
          Sélectionnez l&apos;année académique, la filière, la spécialité et le
          niveau pour générer les fiches de notes. Quand aucun filtre n&apos;est
          choisi, une fiche est générée pour <strong>chaque classe</strong>.
        </p>
        <p style={headerStyles.badge}>
          {loading
            ? "Chargement des fiches…"
            : `${totalStudents} étudiant(s) · ${groupCount} fiche(s)`}
        </p>
      </div>

      <div style={headerStyles.right}>
        <div style={headerStyles.filtersRow}>
          <div style={headerStyles.field}>
            <label style={headerStyles.label}>Année académique</label>
            <select
              style={inputStyle({ width: "100%" })}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              <option value="">Toutes</option>
              {academicYearOptions.map((ay) => (
                <option key={ay} value={ay}>
                  {ay}
                </option>
              ))}
            </select>
          </div>

          <div style={headerStyles.field}>
            <label style={headerStyles.label}>Filière</label>
            <select
              style={inputStyle({ width: "100%" })}
              value={filiere}
              onChange={(e) => {
                setFiliere(e.target.value);
                setSpecialite("");
              }}
            >
              <option value="">Toutes</option>
              {filiereOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div style={headerStyles.field}>
            <label style={headerStyles.label}>Spécialité</label>
            <select
              style={inputStyle({ width: "100%" })}
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
              disabled={!filiere}
            >
              <option value="">Toutes</option>
              {specialiteOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={headerStyles.field}>
            <label style={headerStyles.label}>Niveau</label>
            <select
              style={inputStyle({ width: "100%" })}
              value={studyYear}
              onChange={(e) => setStudyYear(e.target.value)}
            >
              <option value="">Tous</option>
              {studyYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={headerStyles.exportButtons}>
          <button
            type="button"
            style={headerStyles.exportBtnPrimary}
            onClick={exportAllToPDF}
            disabled={!groups || groups.length === 0}
          >
            <Printer size={16} />
            <span>Imprimer toutes les fiches</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================
 * Fiches de notes (plusieurs pages) - SANS EN-TÊTE DANS L'INTERFACE
 * ============================ */

function NotesSheetPreview({ groups, getSpecialiteDisplay, exportGroupToPDF }) {
  if (!groups || groups.length === 0) {
    return (
      <section>
        <h2 style={sheetStyles.sectionTitle}>Prévisualisation des fiches</h2>
        <div style={sheetStyles.wrapper}>
          <p style={{ fontSize: ".8rem", color: "#6B7280" }}>
            Aucun étudiant pour les filtres sélectionnés.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div style={sheetStyles.sectionHeader}>
        <h2 style={sheetStyles.sectionTitle}>Prévisualisation des fiches</h2>
        <p style={sheetStyles.sectionSubtitle}>
          Cliquez sur "Imprimer cette fiche" pour ouvrir une version imprimable d'une seule fiche
        </p>
      </div>
      <div style={sheetStyles.wrapper}>
        <div style={sheetStyles.pagesContainer}>
          {groups.map((group, index) => (
            <div key={group.key || index} style={sheetStyles.pageContainer}>
              <div style={sheetStyles.pageActions}>
                <button
                  type="button"
                  style={sheetStyles.printBtn}
                  onClick={() => exportGroupToPDF(group)}
                >
                  <Printer size={14} />
                  <span>Imprimer cette fiche</span>
                </button>
              </div>
              <div style={sheetStyles.page}>
                <h3 style={sheetStyles.pageTitle}>
                  {group.academicYear || "Année académique"} - {getSpecialiteDisplay(group)}
                </h3>
                <p style={sheetStyles.pageSubtitle}>
                  Niveau: {group.studyYear ? `Niveau ${group.studyYear}` : "Non spécifié"}
                </p>
                
                <table style={sheetStyles.table}>
                  <thead>
                    <tr>
                      <th style={sheetStyles.thN}>N°</th>
                      <th style={sheetStyles.thMatricule}>Matricule</th>
                      <th style={sheetStyles.thName}>Noms et prénoms</th>
                      <th style={sheetStyles.thNote}>
                        <div>CC</div>
                        <div>/ 20</div>
                      </th>
                      <th style={sheetStyles.thNote}>
                        <div>SN</div>
                        <div>/ 20</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((s, idx) => (
                      <tr key={s.id || idx}>
                        <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                        <td style={sheetStyles.tdCenter}>
                          {s.matricule || "\u00A0"}
                        </td>
                        <td style={sheetStyles.tdLeft}>
                          {formatFullName(s.lastName, s.firstName)}
                        </td>
                        <td style={sheetStyles.tdCenter} />
                        <td style={sheetStyles.tdCenter} />
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={sheetStyles.footerRow}>
                  Nom, date et signature de l&apos;enseignant :
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================
 * Fonctions pour générer le HTML PDF avec en-tête et couronnes
 * ============================ */

function generatePDFHTML(group, getSpecialiteDisplay, isClassRepresentativeRole) {
  const logoSrc = "/assets/ipmbtpe-logo.png";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiche de notes - ${group.academicYear || ''} - ${getSpecialiteDisplay(group)}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 10mm 15mm 10mm; /* MARGES AUGMENTÉES à 10mm (au lieu de 16mm) */
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-size: 12px;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      box-sizing: border-box;
      page-break-after: always;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-logo-box img {
      width: 110px;
      height: auto;
    }
    .header-text-box {
      flex: 1;
      text-align: center;
    }
    .school-name {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 3px;
    }
    .school-subtitle {
      font-size: 10px;
      font-weight: 700;
      font-style: italic;
      margin-bottom: 2px;
    }
    .school-contact {
      font-size: 10px;
    }
    .header-underline {
      border-bottom: 3px solid #00b89c;
      margin: 5px 0 12px 0;
    }
    .meta-block {
      margin: 10px 0;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
    }
    .meta-label {
      font-weight: 700;
    }
    .meta-value {
      font-weight: 400;
    }
    .center-title {
      text-align: center;
      font-weight: 800;
      font-size: 16px;
      text-decoration: underline;
      margin: 15px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
      vertical-align: middle;
      height: 25px;
    }
    .th-matiere {
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
      padding: 6px 10px;
    }
    .th-n {
      width: 30px;
    }
    .th-matricule {
      width: 90px;
    }
    .th-name {
      text-align: left;
      padding-left: 6px;
      width: 185px;
    }
    .th-note {
      width: 45px; /* COLONNES RÉDUITES à 45px (au lieu de 65px) */
      line-height: 1.2;
      padding: 2px 4px;
    }
    .th-note div {
      font-size: 10px;
    }
    .td-left {
      text-align: left;
      padding-left: 6px;
    }
    .crown {
      color: #FF8200;
      font-weight: bold;
      margin-left: 4px;
    }
    .footer-row {
      margin-top: 20px;
      border-top: 1px solid #000;
      padding-top: 8px;
      font-size: 12px;
      text-align: right;
    }
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
          INSTITUT POLYTECHNIQUE DES MÉTIERS DU BÂTIMENT,<br />
          TRAVAUX PUBLICS ET DE L'ENTREPRENEURIAT
        </div>
        <div class="school-subtitle">
          ARRÊTÉ N° ORDERN 25-01077 / MINESUP / SG / DDES / SDESUP / SDA / AOS du 26 Mars 2025
        </div>
        <div class="school-contact">
          BP : 16398 Mfou / Tél : (+237) 696 79 58 05 - 672 83 80 94 · Site web : www.ipmbtpe.cm · E-mail : ipmbtpe@gmail.com
        </div>
      </div>
    </div>
    <div class="header-underline"></div>

    <div class="meta-block">
      <div class="meta-row">
        <div>
          <span class="meta-label">Année académique :</span> ${group.academicYear || '—'}
        </div>
        <div>
          <span class="meta-label">Niveau :</span> ${group.studyYear ? `Niveau ${group.studyYear}` : '—'}
        </div>
      </div>
      <div class="meta-row">
        <div>
          <span class="meta-label">Spécialité :</span> ${getSpecialiteDisplay(group)}
        </div>
      </div>
    </div>

    <div class="center-title">FICHE DE NOTES</div>

    <table>
      <thead>
        <tr>
          <th class="th-matiere" colspan="5">Matière :</th>
        </tr>
        <tr>
          <th class="th-n">N°</th>
          <th class="th-matricule">Matricule</th>
          <th class="th-name">Noms et prénoms</th>
          <th class="th-note">
            <div>CC</div>
            <div>/ 20</div>
          </th>
          <th class="th-note">
            <div>SN</div>
            <div>/ 20</div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${group.students.map((s, idx) => {
          const isChief = isClassRepresentativeRole(s.classRole);
          return `
            <tr>
              <td>${idx + 1}</td>
              <td>${s.matricule || ''}</td>
              <td class="td-left">
                ${formatFullName(s.lastName, s.firstName)}
                ${isChief ? '<span class="crown">👑</span>' : ''}
              </td>
              <td></td>
              <td></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="footer-row">
      Nom, date et signature de l'enseignant :
    </div>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() {
        window.close();
      }, 500);
    };
  </script>
</body>
</html>
`;
}

function generateAllPDFsHTML(groups, getSpecialiteDisplay, isClassRepresentativeRole) {
  const logoSrc = "/assets/ipmbtpe-logo.png";
  
  const pagesHTML = groups.map(group => `
    <div class="page">
      <div class="header-row">
        <div class="header-logo-box">
          <img src="${logoSrc}" alt="IPMBTPE" />
        </div>
        <div class="header-text-box">
          <div class="school-name">
            INSTITUT POLYTECHNIQUE DES MÉTIERS DU BÂTIMENT,<br />
            TRAVAUX PUBLICS ET DE L'ENTREPRENEURIAT
          </div>
          <div class="school-subtitle">
            ARRÊTÉ N° ORDERN 25-01077 / MINESUP / SG / DDES / SDESUP / SDA / AOS du 26 Mars 2025
          </div>
          <div class="school-contact">
            BP : 16398 Mfou / Tél : (+237) 696 79 58 05 - 672 83 80 94 · Site web : www.ipmbtpe.cm · E-mail : ipmbtpe@gmail.com
          </div>
        </div>
      </div>
      <div class="header-underline"></div>

      <div class="meta-block">
        <div class="meta-row">
          <div>
            <span class="meta-label">Année académique :</span> ${group.academicYear || '—'}
          </div>
          <div>
            <span class="meta-label">Niveau :</span> ${group.studyYear ? `Niveau ${group.studyYear}` : '—'}
          </div>
        </div>
        <div class="meta-row">
          <div>
            <span class="meta-label">Spécialité :</span> ${getSpecialiteDisplay(group)}
          </div>
        </div>
      </div>

      <div class="center-title">FICHE DE NOTES</div>

      <table>
        <thead>
          <tr>
            <th class="th-matiere" colspan="5">Matière :</th>
          </tr>
          <tr>
            <th class="th-n">N°</th>
            <th class="th-matricule">Matricule</th>
            <th class="th-name">Noms et prénoms</th>
            <th class="th-note">
              <div>CC</div>
              <div>/ 20</div>
            </th>
            <th class="th-note">
              <div>SN</div>
              <div>/ 20</div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${group.students.map((s, idx) => {
            const isChief = isClassRepresentativeRole(s.classRole);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${s.matricule || ''}</td>
                <td class="td-left">
                  ${formatFullName(s.lastName, s.firstName)}
                  ${isChief ? '<span class="crown">👑</span>' : ''}
                </td>
                <td></td>
                <td></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer-row">
        Nom, date et signature de l'enseignant :
      </div>
    </div>
    <div style="page-break-after: always;"></div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fiches de notes - ${groups[0]?.academicYear || 'Toutes classes'}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 10mm 15mm 10mm; /* MARGES AUGMENTÉES à 10mm (au lieu de 16mm) */
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-size: 12px;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      box-sizing: border-box;
      page-break-after: always;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-logo-box img {
      width: 110px;
      height: auto;
    }
    .header-text-box {
      flex: 1;
      text-align: center;
    }
    .school-name {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 3px;
    }
    .school-subtitle {
      font-size: 10px;
      font-weight: 700;
      font-style: italic;
      margin-bottom: 2px;
    }
    .school-contact {
      font-size: 10px;
    }
    .header-underline {
      border-bottom: 3px solid #00b89c;
      margin: 5px 0 12px 0;
    }
    .meta-block {
      margin: 10px 0;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
    }
    .meta-label {
      font-weight: 700;
    }
    .meta-value {
      font-weight: 400;
    }
    .center-title {
      text-align: center;
      font-weight: 800;
      font-size: 16px;
      text-decoration: underline;
      margin: 15px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
      vertical-align: middle;
      height: 25px;
    }
    .th-matiere {
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
      padding: 6px 10px;
    }
    .th-n {
      width: 30px;
    }
    .th-matricule {
      width: 90px;
    }
    .th-name {
      text-align: left;
      padding-left: 6px;
      width: 185px;
    }
    .th-note {
      width: 45px; /* COLONNES RÉDUITES à 45px (au lieu de 65px) */
      line-height: 1.2;
      padding: 2px 4px;
    }
    .th-note div {
      font-size: 10px;
    }
    .td-left {
      text-align: left;
      padding-left: 6px;
    }
    .crown {
      color: #FF8200;
      font-weight: bold;
      margin-left: 4px;
    }
    .footer-row {
      margin-top: 20px;
      border-top: 1px solid #000;
      padding-top: 8px;
      font-size: 12px;
      text-align: right;
    }
  </style>
</head>
<body>
  ${pagesHTML}
  
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
`;
}

/* ============================
 * Helpers & styles
 * ============================ */

function buildAcademicYears() {
  const start = 2025;
  const thisYear = new Date().getFullYear();
  const end = thisYear + 6;
  const out = [];
  for (let y = start; y <= end; y++) {
    out.push(`${y}-${y + 1}`);
  }
  return out;
}

function formatFullName(lastName, firstName) {
  if (!lastName && !firstName) return "";
  const last = (lastName || "").toUpperCase();
  const first = firstName || "";
  return `${last} ${first}`.trim();
}

/* ====== Styles ====== */

const styles = {
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 10%) 1fr",
    width: "100vw",
    height: "100vh",
    background: "#f5f6f8",
    overflow: "hidden",
  },
  left: {
    height: "100%",
    overflowY: "auto",
    background: "var(--bg)",
    borderRight: "1px solid var(--border)",
  },
  right: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100%",
    overflow: "hidden",
    background: "#f5f6f8",
  },
  pageBody: { flex: 1, overflowY: "auto" },
  container: {
    maxWidth: "1600px",
    margin: "1.5rem auto",
    padding: "0 1.5rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
};

const headerStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
  },
  left: { flex: 1, minWidth: 0 },
  right: {
    flex: 1.2,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  title: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: ".85rem",
    color: "var(--ip-gray)",
  },
  badge: {
    marginTop: 8,
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    background: "#ECFEFF",
    color: "#0369A1",
    border: "1px solid #7DD3FC",
  },
  filtersRow: {
    display: "flex",
    gap: ".5rem",
    flexWrap: "wrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  label: {
    fontSize: ".75rem",
    fontWeight: 600,
    color: "var(--ip-gray)",
  },
  exportButtons: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },
  exportBtnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "white",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
};

const sheetStyles = {
  sectionHeader: {
    marginBottom: "0.5rem",
  },
  sectionTitle: {
    margin: 0,
    fontSize: ".9rem",
    fontWeight: 600,
    color: "var(--ip-gray)",
  },
  sectionSubtitle: {
    margin: "4px 0 0",
    fontSize: ".8rem",
    color: "#6B7280",
  },
  wrapper: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    background: "#E5E7EB",
    borderRadius: 12,
    overflowX: "auto",
  },
  pagesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  pageContainer: {
    position: "relative",
  },
  pageActions: {
    position: "absolute",
    top: "-28px",
    right: "10px",
    zIndex: 10,
  },
  printBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #00b89c",
    background: "white",
    color: "#00b89c",
    fontSize: ".75rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  page: {
    width: "760px",
    minHeight: "1080px",
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #111827",
    padding: "18px 22px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  pageSubtitle: {
    margin: "4px 0 10px 0",
    fontSize: ".85rem",
    color: "#6B7280",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 8,
    fontSize: "0.8rem",
  },
  thN: {
    border: "1px solid #000",
    padding: "4px 4px",
    width: "28px",
    textAlign: "center",
  },
  thMatricule: {
    border: "1px solid #000",
    padding: "4px 4px",
    width: "80px",
    textAlign: "center",
  },
  thName: {
    border: "1px solid #000",
    padding: "4px 4px",
    textAlign: "left",
    width: "185px",
  },
  thNote: {
    border: "1px solid #000",
    padding: "2px 4px",
    width: "45px", /* COLONNES RÉDUITES à 45px (au lieu de 65px) */
    textAlign: "center",
    fontSize: "0.75rem",
    lineHeight: "1.2",
  },
  tdCenter: {
    border: "1px solid #000",
    padding: "3px 4px",
    textAlign: "center",
    height: "20px",
  },
  tdLeft: {
    border: "1px solid #000",
    padding: "3px 4px",
    textAlign: "left",
  },
  footerRow: {
    marginTop: 18,
    borderTop: "1px solid #000",
    paddingTop: 6,
    fontSize: "0.8rem",
    textAlign: "right",
  },
};