// src/pages/PresencesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Même DICT que tes modales (pour spécialités/options)
const DICT = {
  "Filières de gestion": {
    type: "gestion",
    specialites: [
      ["Comptabilité et Gestion des Entreprises", "CGE"],
      ["Administration des Collectivités Territoriales", "ACT"],
      ["Gestion des ONG", "ONG"],
      ["Gestion de Projets", "GPR"],
      ["Gestion des Ressources Humaines", "GRH"],
      ["Assistant Manager", "AMA"],
      ["Banque et Finance", "BAF"],
      ["Marketing – Commerce – Vente", "MCV"],
      ["Commerce International", "CIN"],
      ["Gestion Logistique et Transport", "GLT"],
      ["Statistiques", "STA"],
      ["Douane et Transit", "DTR"],
      ["Comptabilité – Contrôle – Audit", "CCA"],
      ["Finance – Comptabilité", "FIC"],
      ["Banque – Finance et Assurance", "BFA"],
      ["Marketing et Communication Digitale", "MCD"],
      ["Marketing – Management Opérationnel", "MMO"],
      ["Management des Organisations", "MOR"],
      ["Gestion des Ressources Humaines", "GRH"],
      ["Management de la Qualité", "MAQ"],
      ["Management des Projets", "MPR"],
    ],
  },
  "Filières carrières juridiques": {
    type: "juridique",
    specialites: [
      ["Droit Foncier et Domanial", "DFD"],
      ["Professions Immobilières", "PRI"],
      ["Douane et Transit", "DTR"],
      ["Droit des Affaires et de l’Entreprise", "DAE"],
    ],
  },
  "Filières industrielles": {
    type: "industriel",
    specialites: [
      ["Génie Civil", ""],
      ["Génie Informatique", ""],
      ["Télécommunication", ""],
      ["Génie Mécanique", ""],
      ["Génie Thermique", ""],
      ["Génie Électrique", ""],
    ],
    optionsBySpecialite: {
      "Génie Civil": [
        ["Bâtiment", "BAT"],
        ["Travaux Publics", "TPU"],
        ["Géométrie Topographe", "GTP"],
        ["Installation Sanitaire", "INS"],
      ],
      "Génie Informatique": [
        ["Génie Logiciel", "GLI"],
        ["E-Commerce et Marketing Numérique", "ECM"],
        ["Gestion des Systèmes Informatiques", "GSI"],
        ["Informatique Industrielle et Automatisme", "IIA"],
      ],
      Télécommunication: [
        ["Télécommunication", "TEL"],
        ["Réseau et Sécurité", "RES"],
      ],
      "Génie Mécanique": [
        ["Chaudronnerie et Soudure", "CHS"],
        ["Fabrication Mécanique", "FBM"],
        ["Mécatronique", "MEC"],
        ["Maintenance Systèmes Industriels", "MSI"],
        ["Électromécanique", "ELM"],
      ],
      "Génie Thermique": [
        ["Énergies Renouvelables", "ENR"],
        ["Froid et Climatisation", "FRC"],
      ],
      "Génie Électrique": [
        ["Maintenance Appareils Biomédicaux", "MAB"],
        ["Électrotechnique", "ELT"],
      ],
    },
  },
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function buildAcademicYears() {
  const start = 2025;
  const thisYear = new Date().getFullYear();
  const end = thisYear + 6;
  const out = [];
  for (let y = start; y <= end; y++) out.push(`${y}-${y + 1}`);
  return out;
}

export default function PresencesPage({
  currentSection = "presences",
  onNavigate,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtres classe
  const AY_LIST = useMemo(buildAcademicYears, []);
  const [academicYear, setAcademicYear] = useState(AY_LIST[0] || "");
  const [filiere, setFiliere] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [option, setOption] = useState("");
  const [cycle, setCycle] = useState("");
  const [studyYear, setStudyYear] = useState("");

  // période (texte libre comme sur ton exemple)
  const [periode, setPeriode] = useState("");

  // modal preview
  const [openSheet, setOpenSheet] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const currentConf = filiere ? DICT[filiere] : null;
  const isIndus = currentConf?.type === "industriel";
  const specialites = currentConf?.specialites || [];
  const options =
    isIndus && specialite
      ? currentConf?.optionsBySpecialite?.[specialite] || []
      : [];

  // reset cascades quand filière change
  useEffect(() => {
    setSpecialite("");
    setOption("");
  }, [filiere]);

  useEffect(() => {
    if (isIndus) setOption("");
  }, [specialite, isIndus]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => (academicYear ? s.academicYear === academicYear : true))
      .filter((s) => (filiere ? s.filiere === filiere : true))
      .filter((s) => (cycle ? s.cycle === cycle : true))
      .filter((s) =>
        studyYear ? Number(s.studyYear) === Number(studyYear) : true
      )
      .filter((s) =>
        specialite
          ? (s.specialite || "") === specialite ||
            (s.specialiteName || "") === specialite
          : true
      )
      .filter((s) => (option ? (s.option || "") === option : true))
      .sort((a, b) => {
        const na = `${a.lastName || ""} ${a.firstName || ""}`.toLowerCase();
        const nb = `${b.lastName || ""} ${b.firstName || ""}`.toLowerCase();
        return na.localeCompare(nb);
      });
  }, [students, academicYear, filiere, specialite, option, cycle, studyYear]);

  const days = useMemo(() => {
    if (cycle === "LICENCE") {
      return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    }
    return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  }, [cycle]);

  const classLabel = useMemo(() => {
    const code =
      (isIndus ? option : "") ||
      specialites.find(([lab]) => lab === specialite)?.[1] ||
      "";
    const yearPart = cycle && studyYear ? ` - ${cycle}${studyYear}` : "";
    return `${code || specialite || filiere || "Classe"}${yearPart}`.trim();
  }, [isIndus, option, specialite, filiere, cycle, studyYear, specialites]);

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
            {/* Header/Filtres */}
            <div style={styles.headerCard}>
              <div>
                <h2 style={styles.h2}>Fiches de présence</h2>
                <p style={styles.sub}>
                  Sélectionne une classe puis génère la fiche A4 paysage.
                </p>
              </div>

              <div style={styles.filtersGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Année académique</label>
                  <select
                    style={styles.select}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  >
                    {AY_LIST.map((ay) => (
                      <option key={ay} value={ay}>
                        {ay}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Filière</label>
                  <select
                    style={styles.select}
                    value={filiere}
                    onChange={(e) => setFiliere(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    <option>Filières industrielles</option>
                    <option>Filières de gestion</option>
                    <option>Filières carrières juridiques</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Spécialité</label>
                  <select
                    style={styles.select}
                    value={specialite}
                    onChange={(e) => setSpecialite(e.target.value)}
                    disabled={!currentConf}
                  >
                    <option value="">Toutes</option>
                    {specialites.map(([lab]) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </div>

                {isIndus && (
                  <div style={styles.field}>
                    <label style={styles.label}>Option</label>
                    <select
                      style={styles.select}
                      value={option}
                      onChange={(e) => setOption(e.target.value)}
                      disabled={!specialite}
                    >
                      <option value="">Toutes</option>
                      {options.map(([lab]) => (
                        <option key={lab} value={lab}>
                          {lab}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>Cycle</label>
                  <select
                    style={styles.select}
                    value={cycle}
                    onChange={(e) => {
                      setCycle(e.target.value);
                      setStudyYear("");
                    }}
                  >
                    <option value="">Tous</option>
                    <option value="BTS">BTS</option>
                    <option value="LICENCE">LICENCE</option>
                    <option value="MASTER">MASTER</option>
                    <option value="INGÉNIEUR">INGÉNIEUR</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Année d’étude</label>
                  <select
                    style={styles.select}
                    value={studyYear}
                    onChange={(e) => setStudyYear(e.target.value)}
                  >
                    <option value="">Toutes</option>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        {y}e année
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldWide}>
                  <label style={styles.label}>Période (ex: 24 au 28 Nov 2025)</label>
                  <input
                    style={styles.input}
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="Période de la fiche"
                  />
                </div>
              </div>

              <div style={styles.headerActions}>
                <div style={styles.countPill}>
                  {loading
                    ? "Chargement..."
                    : `${filteredStudents.length} étudiant(s)`}
                </div>
                <button
                  style={styles.primaryBtn}
                  onClick={() => setOpenSheet(true)}
                  disabled={filteredStudents.length === 0}
                >
                  Prévisualiser la fiche
                </button>
              </div>
            </div>

            {/* petite preview list */}
            <div style={styles.listCard}>
              <h3 style={styles.h3}>Étudiants de la classe sélectionnée</h3>
              {filteredStudents.length === 0 ? (
                <p style={styles.empty}>
                  Aucun étudiant avec ces filtres.
                </p>
              ) : (
                <ol style={styles.ol}>
                  {filteredStudents.map((s, i) => (
                    <li key={s.id || i} style={styles.li}>
                      {(s.lastName || "").toUpperCase()} {s.firstName || ""}
                      {s.matricule ? (
                        <span style={styles.matricule}> · {s.matricule}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </main>

      {openSheet && (
        <PresenceSheetModal
          onClose={() => setOpenSheet(false)}
          students={filteredStudents}
          days={days}
          classLabel={classLabel}
          academicYear={academicYear}
          periode={periode}
        />
      )}
    </div>
  );
}

/* ---------------- MODAL FICHE + PRINT/PDF ---------------- */

function PresenceSheetModal({
  students,
  days,
  classLabel,
  academicYear,
  periode,
  onClose,
}) {
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const waitForAssets = async (rootEl) => {
    try {
      if (document?.fonts?.ready) await document.fonts.ready;
    } catch (_) {}
    if (!rootEl) return;

    const imgs = Array.from(rootEl.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          })
      )
    );
  };

  const capture = async () => {
    const el = sheetRef.current;
    if (!el) throw new Error("Sheet introuvable");
    await waitForAssets(el);

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        // ⚠️ Fix "oklch" : on neutralise toute couleur moderne dans le clone
        const style = doc.createElement("style");
        style.innerHTML = `
          * {
            color: #000 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
          }
          .presence-sheet-root {
            background: #fff !important;
          }
          table, th, td { border-color:#000 !important; }
        `;
        doc.head.appendChild(style);
      },
    });

    return canvas;
  };

  const handleDownloadPdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const canvas = await capture();
      const imgData = canvas.toDataURL("image/png");

      // A4 paysage
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);

      const d = new Date().toISOString().slice(0, 10);
      pdf.save(`fiche-presence-${classLabel}-${d}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Impossible de générer le PDF.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy(true);

    const win = window.open("", "_blank");
    if (!win) {
      setBusy(false);
      alert("La fenêtre d'impression a été bloquée.");
      return;
    }

    win.document.write(`
      <html><head><title>Fiche présence</title>
      <style>
        body { margin:0; padding:0; font-family: Arial, sans-serif; }
        img { width:100%; display:block; }
      </style></head>
      <body><p style="padding:12px;">Préparation...</p></body></html>
    `);
    win.document.close();

    try {
      const canvas = await capture();
      const src = canvas.toDataURL("image/png");

      win.document.open();
      win.document.write(`
        <html><head><title>Fiche présence</title>
        <style>
          body { margin:0; padding:0; font-family: Arial, sans-serif; }
          img { width:100%; display:block; }
        </style></head>
        <body><img src="${src}" /></body></html>
      `);
      win.document.close();

      win.focus();
      win.print();
    } catch (e) {
      console.error(e);
      win.close();
      alert("Impossible d'imprimer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={sheetStyles.overlay}>
      <div style={sheetStyles.modal}>
        <header style={sheetStyles.header}>
          <div>
            <h2 style={sheetStyles.title}>Prévisualisation fiche de présence</h2>
            <p style={sheetStyles.sub}>
              Format A4 paysage · {students.length} étudiant(s)
            </p>
          </div>
          <button onClick={onClose} style={sheetStyles.closeBtn}>✕</button>
        </header>

        <div style={sheetStyles.previewWrap}>
          <div ref={sheetRef} className="presence-sheet-root" style={sheetStyles.sheet}>
            <PresenceSheetTable
              students={students}
              days={days}
              classLabel={classLabel}
              academicYear={academicYear}
              periode={periode}
            />
          </div>
        </div>

        <footer style={sheetStyles.footer}>
          <button onClick={onClose} style={sheetStyles.secondaryBtn}>
            Fermer
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePrint}
              disabled={busy}
              style={{
                ...sheetStyles.outlineBtn,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Préparation..." : "Imprimer"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={busy}
              style={{
                ...sheetStyles.primaryBtn,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Génération..." : "Générer en PDF"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PresenceSheetTable({ students, days, classLabel, academicYear, periode }) {
  const logoSrc = "/assets/ipmbtpe-header.png";

  return (
    <div style={tableStyles.root}>
      {/* header fiche */}
      <div style={tableStyles.topHeader}>
        <div style={tableStyles.schoolBlock}>
          <div style={tableStyles.schoolName}>
            Institut Polytechnique des Métiers du Bâtiment, des Travaux Publics et de l’Entrepreneuriat
          </div>
          <div style={tableStyles.metaRow}>
            <div><b>Spécialité / Classe :</b> {classLabel || "—"}</div>
            <div><b>Année académique :</b> {academicYear || "—"}</div>
            <div><b>Période :</b> {periode || "—"}</div>
          </div>
        </div>
        <div style={tableStyles.logoBox}>
          <img
            src={logoSrc}
            alt="IPMBTPE"
            crossOrigin="anonymous"
            style={{ width: "100%", height: "auto" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      </div>

      <div style={tableStyles.titleBar}>FICHE DE PRÉSENCE</div>

      {/* tableau */}
      <table style={tableStyles.table}>
        <thead>
          <tr>
            <th style={{...tableStyles.th, ...tableStyles.thNum}}>N°</th>
            <th style={{...tableStyles.th, ...tableStyles.thName}}>NOMS & PRÉNOMS</th>
            {days.map((d) => (
              <th key={d} style={tableStyles.thDay}>{d.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id || i}>
              <td style={tableStyles.tdNum}>{i + 1}</td>
              <td style={tableStyles.tdName}>
                {(s.lastName || "").toUpperCase()} {s.firstName || ""}
              </td>
              {days.map((d) => (
                <td key={d} style={tableStyles.tdDay}></td>
              ))}
            </tr>
          ))}

          {/* lignes vides pour compléter la feuille */}
          {Array.from({ length: Math.max(0, 25 - students.length) }).map((_, k) => (
            <tr key={`empty-${k}`}>
              <td style={tableStyles.tdNum}>{students.length + k + 1}</td>
              <td style={tableStyles.tdName}></td>
              {days.map((d) => (
                <td key={d} style={tableStyles.tdDay}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={tableStyles.signatureRow}>
        <div style={tableStyles.signatureBox}>
          Enseignant + signature :
        </div>
      </div>
    </div>
  );
}

/* ---------------- STYLES (simple HEX uniquement) ---------------- */

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
    gap: "1rem",
  },

  headerCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  h2: { margin: 0, fontSize: "1.1rem", fontWeight: 800 },
  sub: { margin: 0, color: "#6B7280", fontSize: ".9rem" },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldWide: { display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 3" },
  label: { fontSize: ".8rem", fontWeight: 700, color: "#111827" },
  select: {
    height: 40,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    padding: "0 .6rem",
    background: "#fff",
  },
  input: {
    height: 40,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    padding: "0 .6rem",
    background: "#fff",
  },

  headerActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  countPill: {
    background: "#ECFDF3",
    border: "1px solid #A7F3D0",
    color: "#047857",
    fontWeight: 800,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: ".85rem",
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#059669",
    color: "#fff",
    padding: "0.55rem 1.2rem",
    fontSize: ".9rem",
    cursor: "pointer",
    fontWeight: 800,
  },

  listCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "1rem",
  },
  h3: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  empty: { marginTop: 8, color: "#6B7280" },
  ol: { marginTop: 8, paddingLeft: 18 },
  li: { padding: "2px 0", fontSize: ".9rem" },
  matricule: { color: "#6B7280", fontSize: ".85rem" },
};

const sheetStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000,
    padding: "1rem",
  },
  modal: {
    width: "95vw",
    maxWidth: 1300,
    maxHeight: "95vh",
    background: "#fff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "0.8rem 1rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  sub: { margin: 0, fontSize: ".85rem", color: "#6B7280" },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem" },

  previewWrap: {
    flex: 1,
    background: "#F3F4F6",
    overflow: "auto",
    padding: 12,
    display: "flex",
    justifyContent: "center",
  },

  // A4 paysage ~ 1123 x 794 à 96dpi
  sheet: {
    width: 1123,
    minHeight: 794,
    background: "#fff",
    boxShadow: "0 0 0 1px #E5E7EB",
    padding: 12,
    boxSizing: "border-box",
  },

  footer: {
    padding: "0.8rem 1rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#fff",
    padding: "0.45rem 1.1rem",
    fontSize: ".9rem",
    cursor: "pointer",
  },
  outlineBtn: {
    borderRadius: 999,
    border: "1px solid #059669",
    background: "#fff",
    color: "#059669",
    padding: "0.45rem 1.1rem",
    fontSize: ".9rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#059669",
    color: "#fff",
    padding: "0.45rem 1.1rem",
    fontSize: ".9rem",
    cursor: "pointer",
    fontWeight: 800,
  },
};

const tableStyles = {
  root: { width: "100%", color: "#000", background: "#fff", fontFamily: "Arial, sans-serif" },

  topHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 12,
    border: "2px solid #000",
    padding: 8,
  },
  schoolBlock: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  schoolName: { fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.25 },
  metaRow: { display: "flex", gap: 14, fontSize: "0.85rem", flexWrap: "wrap" },
  logoBox: { width: 220, display: "flex", alignItems: "center" },

  titleBar: {
    marginTop: 6,
    border: "2px solid #000",
    borderTop: "none",
    textAlign: "center",
    fontWeight: 900,
    padding: "6px 0",
    fontSize: "1rem",
    letterSpacing: 0.6,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 8,
  },
  th: {
    border: "1px solid #000",
    fontSize: "0.8rem",
    padding: "6px 4px",
    textAlign: "center",
    fontWeight: 900,
  },
  thNum: { width: 40 },
  thName: { width: 320, textAlign: "left", paddingLeft: 8 },
  thDay: { width: 120 },

  tdNum: { border: "1px solid #000", textAlign: "center", fontSize: "0.8rem", height: 28 },
  tdName: { border: "1px solid #000", fontSize: "0.85rem", paddingLeft: 8 },
  tdDay: { border: "1px solid #000", height: 28 },

  signatureRow: { marginTop: 8, display: "flex", justifyContent: "flex-start" },
  signatureBox: {
    border: "1px solid #000",
    width: "100%",
    height: 40,
    padding: 6,
    fontSize: "0.85rem",
    fontWeight: 700,
  },
};
