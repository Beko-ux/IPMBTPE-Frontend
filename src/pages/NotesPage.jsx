// src/pages/NotesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Printer, Lock, BarChart2, Download } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function NotesPage({ currentSection = "notes", onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // -------------------------
  // Filtres obligatoires
  // -------------------------
  const [academicYear, setAcademicYear] = useState("2025-2026");

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1"); // S1 | S2
  const [examType, setExamType] = useState("CC"); // CC | SN
  const [sessionType, setSessionType] = useState("main"); // main | rattrapage

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Etat notes
  const [notes, setNotes] = useState({}); // { studentKey: "12.5" }
  const [locked, setLocked] = useState(false); // verrouillage de la session principale

  // ✅ NEW: ligne active (étudiant en cours de saisie)
  const [activeStudentKey, setActiveStudentKey] = useState("");

  // -------------------------
  // Charger classes
  // -------------------------
  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(
          `${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`
        );
        const data = await res.json();

        // ✅ accepte: [] OU {classes:[]} OU {data:[]}
        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.classes)
            ? data.classes
            : Array.isArray(data?.data)
            ? data.data
            : [];

        setClasses(list);
      } catch (e) {
        console.error("Erreur chargement classes:", e);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    loadClasses();
  }, [academicYear]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const students = selectedClass?.students || [];

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

  // -------------------------
  // Charger matières liées à la classe
  // -------------------------
  const getSubjectLabel = (s) =>
    String(s?.label || s?.ueLabel || s?.name || "").trim();

  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedClass) {
        setSubjects([]);
        setSelectedSubjectId("");
        return;
      }

      setLoadingSubjects(true);
      try {
        const classFiliere = selectedClass.filiere || "";
        const classRefKey =
          selectedClass.optionCode || selectedClass.specialiteCode || "";
        const classCycle = selectedClass.cycle || "";
        const classStudyYear =
          selectedClass.studyYear != null ? String(selectedClass.studyYear) : "";

        const params = new URLSearchParams();
        if (classFiliere) params.set("filiere", classFiliere);
        if (classRefKey) params.set("specialiteCode", classRefKey);
        if (classCycle) params.set("cycle", classCycle);
        if (classStudyYear) params.set("studyYear", classStudyYear);

        const res = await fetch(`${API_BASE}/subjects?${params.toString()}`);
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];

        // dédoublonner par label
        const seen = new Set();
        const uniq = [];
        for (const s of all) {
          const label = getSubjectLabel(s);
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push({ ...s, label });
        }

        uniq.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setSubjects(uniq);

        if (uniq.length === 0) setSelectedSubjectId("");
      } catch (e) {
        console.error("Erreur chargement matières:", e);
        setSubjects([]);
        setSelectedSubjectId("");
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClassId, academicYear]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  // -------------------------
  // Helpers notes
  // -------------------------
  const scaleMax = 20;
  const keyForStudent = (s) => s.id || s.matricule || String(s._id || "");

  const isRetake = sessionType === "rattrapage";
  const mode = isRetake ? "retake" : "main";

  const canEdit =
    !!selectedClass && !!selectedSubject && (isRetake || !locked);

  const handleNoteChange = (student, value) => {
    if (!canEdit) return;

    const key = keyForStudent(student);
    let v = (value ?? "").toString().replace(",", ".");
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

  // -------------------------
  // Charger notes existantes (sheet)
  // -------------------------
  useEffect(() => {
    const loadSheet = async () => {
      setNotes({});
      setLocked(false);
      setActiveStudentKey("");

      if (!selectedClass || !selectedSubject) return;

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          classId: selectedClass.id,
          academicYear: academicYear || "",
          semester,
          examType,
          subjectId: selectedSubject.id,
          subjectLabel: getSubjectLabel(selectedSubject) || "",
        });

        const res = await fetch(`${API_BASE}/notes/sheet?${qs.toString()}`);
        const data = await res.json();

        const sheet = data?.sheet || null;
        if (!sheet) {
          setNotes({});
          setLocked(false);
          return;
        }

        setLocked(!!sheet.locked);

        const entries = sheet.entries || {};
        const map = {};

        (sortedStudents || []).forEach((s) => {
          const k = keyForStudent(s);
          if (!k) return;
          const e = entries[k];
          const val = mode === "retake" ? e?.retake : e?.main;
          map[k] = val === null || val === undefined ? "" : String(val);
        });

        Object.keys(entries).forEach((k) => {
          if (map[k] !== undefined) return;
          const e = entries[k];
          const val = mode === "retake" ? e?.retake : e?.main;
          map[k] = val === null || val === undefined ? "" : String(val);
        });

        setNotes(map);
      } catch (e) {
        console.error("Erreur chargement sheet:", e);
        setNotes({});
        setLocked(false);
      } finally {
        setLoading(false);
      }
    };

    loadSheet();
  }, [
    selectedClassId,
    selectedSubjectId,
    academicYear,
    semester,
    examType,
    sessionType,
    sortedStudents,
  ]);

  // -------------------------
  // Save notes
  // -------------------------
  const handleSave = async () => {
    if (!selectedClass) {
      alert("Veuillez choisir une classe.");
      return;
    }
    if (!selectedSubject) {
      alert("Veuillez choisir une matière.");
      return;
    }
    if (!semester) {
      alert("Veuillez choisir le semestre (S1 / S2).");
      return;
    }
    if (!examType) {
      alert("Veuillez choisir le type d’examen (CC / SN).");
      return;
    }

    if (!canEdit) {
      alert(
        "Cette feuille est verrouillée (session principale). Utilisez un rattrapage."
      );
      return;
    }

    const payloadNotes = (sortedStudents || [])
      .map((s) => {
        const key = keyForStudent(s);
        const raw = notes[key];
        if (raw === "" || raw == null) return null;
        const value = Number(String(raw).replace(",", "."));
        if (Number.isNaN(value)) return null;

        return {
          studentId: s.id || null,
          matricule: s.matricule || null,
          fullName: s.fullName || "",
          value,
        };
      })
      .filter(Boolean);

    if (payloadNotes.length === 0) {
      alert("Aucune note à enregistrer.");
      return;
    }

    const body = {
      academicYear,
      classId: selectedClass.id,
      semester,
      examType,
      subjectId: selectedSubject.id,
      subjectLabel: getSubjectLabel(selectedSubject),
      scaleMax,
      mode, // main | retake
      notes: payloadNotes,
    };

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/notes/sheet/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l’enregistrement.");

      const sheet = data?.sheet || null;
      if (sheet) {
        setLocked(!!sheet.locked);

        const entries = sheet.entries || {};
        const map = {};
        (sortedStudents || []).forEach((s) => {
          const k = keyForStudent(s);
          if (!k) return;
          const e = entries[k];
          const val = mode === "retake" ? e?.retake : e?.main;
          map[k] = val === null || val === undefined ? "" : String(val);
        });
        setNotes(map);
      }

      alert("Notes enregistrées avec succès.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Échec de l’enregistrement des notes.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------
  // Lock
  // -------------------------
  const handleLock = async () => {
    if (!selectedClass || !selectedSubject) {
      alert("Choisissez d’abord la classe et la matière.");
      return;
    }
    if (sessionType !== "main") {
      alert("Le verrouillage s’applique à la session principale (pas au rattrapage).");
      return;
    }
    if (
      !window.confirm(
        "Valider / verrouiller ces notes ? (elles ne seront plus modifiables)"
      )
    )
      return;

    try {
      setSaving(true);

      const body = {
        academicYear,
        classId: selectedClass.id,
        semester,
        examType,
        subjectId: selectedSubject.id,
        subjectLabel: getSubjectLabel(selectedSubject) || "",
        scaleMax,
      };

      const res = await fetch(`${API_BASE}/notes/sheet/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors du verrouillage.");

      setLocked(true);
      alert("Notes verrouillées.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Échec du verrouillage.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Annuler les modifications non enregistrées ?")) {
      setNotes({});
      setActiveStudentKey("");
    }
  };

  const classLabel = selectedClass
    ? `${selectedClass.academicYear || academicYear} · ${
        selectedClass.title || selectedClass.displayName || ""
      } ${selectedClass.studyYear ? `· Niveau ${selectedClass.studyYear}` : ""}`
    : "Aucune classe sélectionnée";

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />

        <div style={styles.pageBody}>
          <div style={styles.container}>
            <section style={headerStyles.card}>
              <div style={headerStyles.left}>
                <h1 style={headerStyles.title}>Gestion des notes</h1>
                <p style={headerStyles.subtitle}>
                  Sélectionnez l’année, la classe, le semestre, l’examen, la session
                  et la matière.
                </p>

                <p style={headerStyles.badge}>
                  {loading ? "Chargement…" : `${sortedStudents.length} étudiant(s)`}
                </p>

                <p style={headerStyles.classInfo}>{classLabel}</p>

                <p style={headerStyles.subjectInfo}>
                  <strong>Matière :</strong>{" "}
                  {selectedSubject ? getSubjectLabel(selectedSubject) : "—"}
                  {" · "}
                  <strong>Semestre :</strong> {semester}
                  {" · "}
                  <strong>Examen :</strong> {examType}
                  {" · "}
                  <strong>Session :</strong>{" "}
                  {sessionType === "rattrapage" ? "Rattrapage" : "Principale"}
                  {" · "}
                  <strong>Verrouillé :</strong> {locked ? "Oui" : "Non"}
                </p>
              </div>

              <div style={headerStyles.right}>
                <div style={headerStyles.filtersRow}>
                  <Field label="Année académique">
                    <input
                      style={inputPill}
                      value={academicYear}
                      onChange={(e) => {
                        setAcademicYear(e.target.value);
                        setSelectedClassId("");
                        setSelectedSubjectId("");
                      }}
                      placeholder="Ex: 2025-2026"
                    />
                  </Field>

                  <Field label="Classe">
                    <select
                      style={inputPill}
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedSubjectId("");
                      }}
                    >
                      <option value="">
                        {loadingClasses ? "Chargement..." : "-- Sélectionner --"}
                      </option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title || c.abbrev || c.displayName || c.id}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Semestre">
                    <select
                      style={inputPill}
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      disabled={!selectedClass}
                    >
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                    </select>
                  </Field>

                  <Field label="Examen">
                    <select
                      style={inputPill}
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      disabled={!selectedClass}
                    >
                      <option value="CC">CC</option>
                      <option value="SN">SN</option>
                    </select>
                  </Field>

                  <Field label="Session">
                    <select
                      style={inputPill}
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      disabled={!selectedClass}
                    >
                      <option value="main">Principale</option>
                      <option value="rattrapage">Rattrapage</option>
                    </select>
                  </Field>

                  <Field label="Matière">
                    <select
                      style={inputPill}
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      disabled={!selectedClass || loadingSubjects}
                    >
                      <option value="">
                        {!selectedClass
                          ? "Choisir une classe d’abord"
                          : loadingSubjects
                          ? "Chargement..."
                          : "-- Sélectionner --"}
                      </option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {getSubjectLabel(s)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={headerStyles.topButtons}>
                  <button type="button" style={headerStyles.configBtn} disabled>
                    <Printer size={16} />
                    <span>Imprimer (à venir)</span>
                  </button>

                  <div style={headerStyles.actionsRow}>
                    <button type="button" style={headerStyles.smallBtn} disabled>
                      <BarChart2 size={15} />
                      <span>Statistiques</span>
                    </button>

                    <button type="button" style={headerStyles.smallBtn} disabled>
                      <Download size={15} />
                      <span>Exporter</span>
                    </button>

                    <button
                      type="button"
                      style={{
                        ...headerStyles.lockBtn,
                        opacity: sessionType === "main" && selectedSubjectId ? 1 : 0.6,
                        cursor:
                          sessionType === "main" && selectedSubjectId
                            ? "pointer"
                            : "not-allowed",
                      }}
                      onClick={handleLock}
                      disabled={saving || !selectedSubjectId || sessionType !== "main"}
                      title="Verrouiller les notes de la session principale"
                    >
                      <Lock size={16} />
                      <span>Verrouiller</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section style={entryStyles.card}>
              <div style={entryStyles.headerRow}>
                <div>
                  <h2 style={entryStyles.title}>
                    Saisie des notes
                    {selectedSubject ? ` — ${getSubjectLabel(selectedSubject)}` : ""}
                  </h2>
                  <p style={entryStyles.subtitle}>
                    {semester} · {examType} ·{" "}
                    {sessionType === "rattrapage" ? "Rattrapage" : "Session principale"} ·
                    Échelle 0–{scaleMax}
                  </p>

                  {!selectedClassId && (
                    <p style={entryStyles.warn}>Choisissez d’abord une classe.</p>
                  )}
                  {selectedClassId && !selectedSubjectId && (
                    <p style={entryStyles.warn}>
                      Choisissez la matière (liée à cette classe).
                    </p>
                  )}
                  {selectedClassId && selectedSubjectId && locked && sessionType === "main" && (
                    <p style={entryStyles.warn}>
                      Cette feuille est verrouillée (session principale). Passez en{" "}
                      <strong>Rattrapage</strong> pour modifier légalement.
                    </p>
                  )}
                </div>
              </div>

              <div style={entryStyles.tableWrapper}>
                {sortedStudents.length === 0 ? (
                  <p style={entryStyles.emptyState}>
                    Aucun étudiant dans cette classe (ou classe non sélectionnée).
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
                      {sortedStudents.map((s, idx) => {
                        const key = keyForStudent(s) || String(idx);
                        const val = getNoteValue(s);
                        const mention = computeMention(val);
                        const status = computeStatus(val);
                        const isActiveRow = activeStudentKey === key;

                        const tdBase = isActiveRow
                          ? { ...entryStyles.tdBase, ...stylesActiveCell }
                          : entryStyles.tdBase;

                        return (
                          <tr
                            key={key}
                            style={isActiveRow ? stylesActiveRow : undefined}
                          >
                            <td style={{ ...entryStyles.tdIndex, ...tdBase }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...entryStyles.tdMatricule, ...tdBase }}>
                              {s.matricule || "—"}
                            </td>
                            <td style={{ ...entryStyles.tdName, ...tdBase }}>
                              {(s.fullName || "").toUpperCase()}
                            </td>
                            <td style={{ ...entryStyles.tdNote, ...tdBase }}>
                              <input
                                type="number"
                                min={0}
                                max={scaleMax}
                                step="0.25"
                                value={val}
                                disabled={!canEdit}
                                onChange={(e) => handleNoteChange(s, e.target.value)}
                                onFocus={() => setActiveStudentKey(key)}
                                onBlur={() => setActiveStudentKey("")}
                                style={{
                                  ...entryStyles.noteInput,
                                  ...(canEdit ? null : stylesDisabledInput),
                                  ...(isActiveRow && canEdit ? stylesActiveInput : null),
                                }}
                              />
                            </td>
                            <td style={{ ...entryStyles.tdMention, ...tdBase }}>
                              {mention}
                            </td>
                            <td style={{ ...entryStyles.tdStatus, ...tdBase }}>
                              {status}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={entryStyles.footerRow}>
                <button type="button" style={entryStyles.btnGhost} onClick={handleCancel}>
                  Annuler
                </button>
                <button
                  type="button"
                  style={entryStyles.btnPrimary}
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !selectedClassId ||
                    !selectedSubjectId ||
                    sortedStudents.length === 0 ||
                    !canEdit
                  }
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({ label, children }) {
  return (
    <div style={headerStyles.field}>
      <label style={headerStyles.label}>{label}</label>
      {children}
    </div>
  );
}

const inputPill = {
  height: 38,
  borderRadius: 999,
  border: "1px solid var(--border)",
  padding: "0 0.9rem",
  fontSize: ".85rem",
  background: "var(--bg-input, #f9fafb)",
  outline: "none",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

// ✅ CASE active (input)
const stylesActiveInput = {
  background: "#F0FDFA",
  border: "1px solid #22C55E",
  boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.18)",
};

// ✅ LIGNE active (toute la ligne)
const stylesActiveRow = {
  background: "#F0FDFA",
};

// ✅ CELLULES actives (pour “encadrer” la ligne)
const stylesActiveCell = {
  borderTop: "1px solid #22C55E",
  borderBottom: "1px solid #22C55E",
};

// ✅ style disabled
const stylesDisabledInput = {
  opacity: 0.5,
  cursor: "not-allowed",
};

/* ========================= Styles ========================= */

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
  title: { margin: 0, fontSize: "1.05rem", fontWeight: 700 },
  subtitle: { margin: "4px 0 0", fontSize: ".85rem", color: "var(--ip-gray)" },
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
  classInfo: { marginTop: 6, fontSize: ".8rem", color: "#4B5563" },
  subjectInfo: { marginTop: 2, fontSize: ".8rem", color: "#111827" },
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
  label: { fontSize: ".75rem", fontWeight: 600, color: "var(--ip-gray)" },
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
    cursor: "default",
    opacity: 0.7,
  },
  actionsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
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
  title: { margin: 0, fontSize: "1rem", fontWeight: 600 },
  subtitle: { margin: "4px 0 0", fontSize: ".8rem", color: "#6B7280" },
  warn: { margin: "8px 0 0", fontSize: ".8rem", color: "#B45309" },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },

  // ✅ base “td” (pour pouvoir ajouter un bord actif proprement)
  tdBase: {
    // on ne met pas de borderLeft/Right ici (ça sera appliqué sur 1ère/dernière cellule)
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
  emptyState: { padding: "10px 12px", fontSize: ".8rem", color: "#6B7280" },
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
