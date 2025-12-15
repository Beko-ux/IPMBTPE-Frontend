// src/pages/NotesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Printer, Lock, BarChart2, Download } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function NotesPage({ currentSection = "notes", onNavigate }) {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtres pour choisir la CLASSE
  const [academicYear, setAcademicYear] = useState("");
  const [filiere, setFiliere] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [studyYear, setStudyYear] = useState("");

  // Config de la fiche (matière, session, échelle…)
  const [configOpen, setConfigOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState({
    subjectLabel: "",
    session: "normale", // "normale" | "rattrapage"
    scaleMax: 20,
  });

  // Onglets : Saisie / Rattrapage / Synthèse
  const [activeTab, setActiveTab] = useState("saisie");

  // Notes saisies dans le tableau
  // clé = student.id OU matricule
  const [notes, setNotes] = useState({});

  // Charger les étudiants (pour générer les listes de filières/spécialités)
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

  // Charger les "groups" (une group = une classe avec liste d'étudiants)
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
        const groupsArray = Array.isArray(data.groups) ? data.groups : [];
        setGroups(groupsArray);
        setNotes({}); // reset des notes quand la classe change
      } catch (e) {
        console.error(e);
        setGroups([]);
        setNotes({});
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [academicYear, filiere, specialite, studyYear]);

  // Années académiques possibles
  const academicYearOptions = useMemo(() => buildAcademicYears(), []);

  // Listes de filtres depuis les étudiants
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

  const currentGroup = useMemo(
    () => (groups.length > 0 ? groups[0] : null),
    [groups]
  );

  const totalStudents = currentGroup?.students?.length || 0;
  const groupCount = groups.length;

  // -------- Helpers pour la saisie de notes --------

  const scaleMax = Number(sheetConfig.scaleMax) || 20;

  const keyForStudent = (s) => s.id || s.matricule || String(s._id || "");

  const handleNoteChange = (student, value) => {
    const key = keyForStudent(student);
    let v = value.replace(",", "."); // au cas où quelqu'un tape 12,5
    if (v === "") {
      setNotes((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    const num = Number(v);
    if (Number.isNaN(num)) return;
    if (num < 0) return;
    if (num > scaleMax) return;
    setNotes((prev) => ({ ...prev, [key]: v }));
  };

  const getNoteValue = (student) => {
    const key = keyForStudent(student);
    return notes[key] ?? "";
  };

  const computeMention = (raw) => {
    if (raw === "" || raw == null) return "—";
    const n = Number(raw);
    if (Number.isNaN(n)) return "—";
    if (n < 10) return "Ajourné";
    if (n < 12) return "Passable";
    if (n < 14) return "Assez bien";
    if (n < 16) return "Bien";
    return "Très bien";
  };

  const computeStatus = (raw) => {
    if (raw === "" || raw == null) return "—";
    const n = Number(raw);
    if (Number.isNaN(n)) return "—";
    return n >= 10 ? "Validé" : "Non validé";
  };

  const sessionLabel =
    sheetConfig.session === "rattrapage" ? "Session de rattrapage" : "Session normale";

  // -------- Enregistrement des notes --------

  const handleSave = async () => {
    if (!currentGroup) {
      alert("Aucune classe sélectionnée.");
      return;
    }
    if (!sheetConfig.subjectLabel.trim()) {
      alert("Veuillez d'abord choisir la matière (bouton « Configurer la fiche de notes »).");
      return;
    }

    const payloadNotes = (currentGroup.students || [])
      .map((s) => {
        const key = keyForStudent(s);
        const raw = notes[key];
        if (raw === "" || raw == null) return null;
        const note = Number(raw);
        if (Number.isNaN(note)) return null;
        const mention = computeMention(note);
        const status = computeStatus(note);
        return {
          studentId: s.id || s._id || null,
          matricule: s.matricule || null,
          note,
          mention,
          status,
        };
      })
      .filter(Boolean);

    if (payloadNotes.length === 0) {
      alert("Aucune note à enregistrer.");
      return;
    }

    const body = {
      academicYear: currentGroup.academicYear || academicYear || null,
      filiere: currentGroup.filiere || filiere || null,
      specialite: currentGroup.specialite || currentGroup.displayName || specialite || null,
      studyYear: currentGroup.studyYear || Number(studyYear) || null,
      subjectLabel: sheetConfig.subjectLabel,
      session: sheetConfig.session,
      scaleMax: scaleMax,
      notes: payloadNotes,
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/notes/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l’enregistrement des notes.");
      }
      alert("Notes enregistrées avec succès.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Échec de l’enregistrement des notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Annuler les modifications non enregistrées ?")) {
      setNotes({});
    }
  };

  // -------- Rendu principal --------

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />
        <div style={styles.pageBody}>
          <div style={styles.container}>
            {/* Header : filtres + bouton config fiche */}
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
              currentGroup={currentGroup}
              sheetConfig={sheetConfig}
              onOpenConfig={() => setConfigOpen(true)}
            />

            {/* Carte de saisie des notes */}
            <NotesEntryCard
              currentGroup={currentGroup}
              sheetConfig={sheetConfig}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              scaleMax={scaleMax}
              getNoteValue={getNoteValue}
              handleNoteChange={handleNoteChange}
              computeMention={computeMention}
              computeStatus={computeStatus}
              onCancel={handleCancel}
              onSave={handleSave}
              saving={saving}
            />
          </div>
        </div>
      </main>

      {/* Pop-up de configuration de la fiche (matière / session / échelle) */}
      {configOpen && (
        <NoteConfigModal
          initialConfig={sheetConfig}
          onClose={() => setConfigOpen(false)}
          onSave={(cfg) => {
            setSheetConfig(cfg);
            setConfigOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================
 * Header : filtres + résumé + config fiche
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
  currentGroup,
  sheetConfig,
  onOpenConfig,
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

  const classLabel = currentGroup
    ? `${currentGroup.academicYear || ""} · ${currentGroup.displayName || ""} ${
        currentGroup.studyYear ? `· Niveau ${currentGroup.studyYear}` : ""
      }`
    : "Aucune classe sélectionnée (ajustez les filtres)";

  const subjectDisplay = sheetConfig.subjectLabel
    ? sheetConfig.subjectLabel
    : "Aucune matière sélectionnée";

  return (
    <section style={headerStyles.card}>
      <div style={headerStyles.left}>
        <h1 style={headerStyles.title}>Gestion des notes</h1>
        <p style={headerStyles.subtitle}>
          Choisissez la classe avec les filtres ci-dessous, configurez la matière, puis
          saisissez les notes des étudiants.
        </p>
        <p style={headerStyles.badge}>
          {loading
            ? "Chargement des étudiants…"
            : `${totalStudents} étudiant(s) dans la classe sélectionnée · ${groupCount} groupe(s) trouvé(s)`}
        </p>
        <p style={headerStyles.classInfo}>{classLabel}</p>
        <p style={headerStyles.subjectInfo}>
          <strong>Matière :</strong> {subjectDisplay}
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

        <div style={headerStyles.topButtons}>
          <button
            type="button"
            style={headerStyles.configBtn}
            onClick={onOpenConfig}
          >
            <Printer size={16} />
            <span>Configurer la fiche de notes</span>
          </button>

          {/* Boutons décoratifs comme sur ta capture : pas encore implémentés */}
          <div style={headerStyles.actionsRow}>
            <button type="button" style={headerStyles.smallBtn} disabled>
              <BarChart2 size={15} />
              <span>Statistiques</span>
            </button>
            <button type="button" style={headerStyles.smallBtn} disabled>
              <Download size={15} />
              <span>Exporter</span>
            </button>
            <button type="button" style={headerStyles.lockBtn} disabled>
              <Lock size={16} />
              <span>Verrouiller</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
 * Carte de saisie des notes
 * ============================ */

function NotesEntryCard({
  currentGroup,
  sheetConfig,
  activeTab,
  setActiveTab,
  scaleMax,
  getNoteValue,
  handleNoteChange,
  computeMention,
  computeStatus,
  onCancel,
  onSave,
  saving,
}) {
  const students = currentGroup?.students || [];

  const sessionLabel =
    sheetConfig.session === "rattrapage" ? "Session de rattrapage" : "Session normale";

  return (
    <section style={entryStyles.card}>
      <div style={entryStyles.headerRow}>
        <div>
          <h2 style={entryStyles.title}>
            Saisie des notes
            {sheetConfig.subjectLabel ? ` - ${sheetConfig.subjectLabel}` : ""}
          </h2>
          <p style={entryStyles.subtitle}>
            {sessionLabel} · Échelle de 0 à {scaleMax}
          </p>
        </div>
      </div>

      {/* Onglets (comme sur ta capture : Saisie / Rattrapage / Synthèse) */}
      <div style={entryStyles.tabsRow}>
        <TabButton
          label="Saisie"
          active={activeTab === "saisie"}
          onClick={() => setActiveTab("saisie")}
        />
        <TabButton
          label="Rattrapage"
          active={activeTab === "rattrapage"}
          onClick={() => setActiveTab("rattrapage")}
          disabled
        />
        <TabButton
          label="Synthèse"
          active={activeTab === "synthese"}
          onClick={() => setActiveTab("synthese")}
          disabled
        />
      </div>

      {/* Tableau principal */}
      <div style={entryStyles.tableWrapper}>
        {students.length === 0 ? (
          <p style={entryStyles.emptyState}>
            Aucun étudiant pour les filtres et la classe sélectionnés.
          </p>
        ) : (
          <table style={entryStyles.table}>
            <thead>
              <tr>
                <th style={entryStyles.thIndex}>#</th>
                <th style={entryStyles.thMatricule}>Matricule</th>
                <th style={entryStyles.thName}>Nom &amp; Prénoms</th>
                <th style={entryStyles.thNote}>Note /{scaleMax}</th>
                <th style={entryStyles.thMention}>Mention</th>
                <th style={entryStyles.thStatus}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const val = getNoteValue(s);
                const mention = computeMention(val);
                const status = computeStatus(val);
                return (
                  <tr key={s.id || s.matricule || idx}>
                    <td style={entryStyles.tdIndex}>{idx + 1}</td>
                    <td style={entryStyles.tdMatricule}>{s.matricule || "—"}</td>
                    <td style={entryStyles.tdName}>
                      {formatFullName(s.lastName, s.firstName)}
                    </td>
                    <td style={entryStyles.tdNote}>
                      <input
                        type="number"
                        min={0}
                        max={scaleMax}
                        step="0.25"
                        style={entryStyles.noteInput}
                        value={val}
                        onChange={(e) => handleNoteChange(s, e.target.value)}
                      />
                    </td>
                    <td style={entryStyles.tdMention}>{mention}</td>
                    <td style={entryStyles.tdStatus}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer actions */}
      <div style={entryStyles.footerRow}>
        <button type="button" style={entryStyles.btnGhost} onClick={onCancel}>
          Annuler
        </button>
        <button
          type="button"
          style={entryStyles.btnPrimary}
          onClick={onSave}
          disabled={saving || students.length === 0}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}

/* ============================
 * Tab button
 * ============================ */

function TabButton({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...entryStyles.tabBtn,
        ...(active ? entryStyles.tabBtnActive : {}),
        ...(disabled ? entryStyles.tabBtnDisabled : {}),
      }}
    >
      {label}
    </button>
  );
}

/* ============================
 * Modal de configuration de la fiche
 * ============================ */

function NoteConfigModal({ initialConfig, onClose, onSave }) {
  const [subjectLabel, setSubjectLabel] = useState(initialConfig.subjectLabel || "");
  const [session, setSession] = useState(initialConfig.session || "normale");
  const [scaleMax, setScaleMax] = useState(String(initialConfig.scaleMax || 20));

  const submit = () => {
    const max = Number(scaleMax);
    if (!subjectLabel.trim()) {
      alert("Veuillez saisir le nom de la matière.");
      return;
    }
    if (Number.isNaN(max) || max <= 0) {
      alert("L’échelle maximale doit être un nombre positif.");
      return;
    }
    onSave({
      subjectLabel: subjectLabel.trim(),
      session,
      scaleMax: max,
    });
  };

  const inputStyle = {
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--border)",
    padding: "0 0.75rem",
    fontSize: ".9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div
        style={modalStyles.modal}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 style={modalStyles.title}>Configurer la fiche de notes</h3>
        <p style={modalStyles.subtitle}>
          Choisissez la matière, le type de session et l&apos;échelle des notes.
        </p>

        <div style={modalStyles.body}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Matière *</label>
            <input
              style={inputStyle}
              placeholder="Ex : RDM I, Maths appliquées, Droit civil…"
              value={subjectLabel}
              onChange={(e) => setSubjectLabel(e.target.value)}
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Session</label>
            <select
              style={inputStyle}
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="normale">Session normale</option>
              <option value="rattrapage">Session de rattrapage</option>
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Échelle maximale</label>
            <input
              type="number"
              min={1}
              max={100}
              style={inputStyle}
              value={scaleMax}
              onChange={(e) => setScaleMax(e.target.value)}
            />
            <small style={modalStyles.hint}>Par défaut : 20</small>
          </div>
        </div>

        <div style={modalStyles.footer}>
          <button type="button" style={modalStyles.btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================
 * Helpers généraux
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

/* ============================
 * Styles
 * ============================ */

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
    flex: 1.3,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    alignItems: "flex-end",
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
  classInfo: {
    marginTop: 6,
    fontSize: ".8rem",
    color: "#4B5563",
  },
  subjectInfo: {
    marginTop: 2,
    fontSize: ".8rem",
    color: "#111827",
  },
  filtersRow: {
    display: "flex",
    gap: ".5rem",
    flexWrap: "wrap",
    width: "100%",
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
  topButtons: {
    display: "flex",
    flexDirection: "column",
    gap: ".5rem",
    alignItems: "flex-end",
    width: "100%",
  },
  configBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "white",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  actionsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "#374151",
    fontSize: ".8rem",
    cursor: "default",
  },
  lockBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    fontSize: ".8rem",
    fontWeight: 600,
    cursor: "default",
  },
};

const entryStyles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: ".8rem",
    color: "#6B7280",
  },
  tabsRow: {
    marginTop: 4,
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    background: "#F3F4F6",
  },
  tabBtn: {
    border: "none",
    background: "transparent",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: ".8rem",
    cursor: "pointer",
    color: "#4B5563",
  },
  tabBtnActive: {
    background: "#fff",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
    color: "#111827",
    fontWeight: 600,
  },
  tabBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: ".85rem",
  },
  thIndex: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    width: 40,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  thMatricule: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    width: 190,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  thName: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  thNote: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 120,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  thMention: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 120,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  thStatus: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 120,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  tdIndex: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".8rem",
    color: "#6B7280",
  },
  tdMatricule: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".8rem",
    color: "#111827",
    whiteSpace: "nowrap",
  },
  tdName: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".85rem",
    color: "#111827",
  },
  tdNote: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
  },
  tdMention: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
    fontSize: ".8rem",
    color: "#4B5563",
  },
  tdStatus: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
    fontSize: ".8rem",
    color: "#4B5563",
  },
  noteInput: {
    width: 80,
    height: 32,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    background: "#F9FAFB",
    textAlign: "center",
    fontSize: ".85rem",
    outline: "none",
  },
  emptyState: {
    padding: "10px 12px",
    fontSize: ".8rem",
    color: "#6B7280",
  },
  footerRow: {
    padding: "0.75rem 0.25rem 0.75rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btnGhost: {
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "#111827",
    padding: "0.5rem 1rem",
    fontSize: ".85rem",
    cursor: "pointer",
  },
  btnPrimary: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    padding: "0.5rem 1.2rem",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 60,
  },
  modal: {
    width: "min(460px, 96vw)",
    background: "var(--bg)",
    color: "var(--fg)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    boxShadow: "0 16px 40px rgba(0,0,0,.2)",
    padding: "1rem 1.25rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  body: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: ".8rem",
    fontWeight: 600,
    color: "#4B5563",
  },
  hint: {
    fontSize: ".75rem",
    color: "#6B7280",
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
    borderTop: "1px solid var(--border)",
    paddingTop: 8,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btnGhost: {
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "#111827",
    padding: "0.45rem 1rem",
    fontSize: ".85rem",
    cursor: "pointer",
  },
  btnPrimary: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
