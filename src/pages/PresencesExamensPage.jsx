// src/pages/PresencesExamensPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

const cleanStr = (x) => (x ?? "").toString().trim();

function normalizeAcademicYear(y) {
  const s = cleanStr(y);
  if (!s) return "";
  return s
    .replace(/[–—]/g, "-")
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s*-\s*/g, "-");
}

function normalizeMode(sessionType) {
  return sessionType === "rattrapage" ? "retake" : "main";
}

// mini pool concurrency (éviter 25 requêtes d'un coup)
async function asyncPool(limit, items, worker) {
  const ret = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    ret.push(p);

    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

export default function PresencesExamensPage({
  currentSection = "liste_presence",
  onNavigate,
}) {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("CC");
  const [sessionType, setSessionType] = useState("main"); // main|rattrapage

  const mode = normalizeMode(sessionType);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [examCtx, setExamCtx] = useState(null);
  const [loadingExamCtx, setLoadingExamCtx] = useState(false);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [loadingPresenceMatrix, setLoadingPresenceMatrix] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ filtre affichage
  // "missing" => n'ont pas composé au moins une matière (on affiche matières manquantes)
  // "composed" => ont composé au moins une matière
  const [viewMode, setViewMode] = useState("missing");

  // accordéons
  const [openStudentIds, setOpenStudentIds] = useState(() => new Set());

  // résultat calculé:
  // map studentId -> { missing: [subject], composed: [subject] }
  const [byStudent, setByStudent] = useState({});

  // 1) Load classes (auto select first)
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      setErrorMsg("");
      try {
        const ay = normalizeAcademicYear(academicYear);
        const res = await fetch(`${API_BASE}/classes?year=${encodeURIComponent(ay)}`);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.classes)
          ? data.classes
          : [];

        setClasses(list);
        if (!selectedClassId && list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch (e) {
        setClasses([]);
        setSelectedClassId("");
        setErrorMsg(e?.message || "Erreur chargement classes");
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  // 2) students from class doc payload already in list
  useEffect(() => {
    const load = async () => {
      setLoadingStudents(true);
      setStudents([]);
      setByStudent({});
      setOpenStudentIds(new Set());
      setErrorMsg("");

      try {
        if (!selectedClass) return;
        const list = Array.isArray(selectedClass?.students) ? selectedClass.students : [];
        setStudents(list);
      } catch (e) {
        setStudents([]);
        setErrorMsg(e?.message || "Erreur chargement étudiants");
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, [selectedClassId, selectedClass]);

  // 3) subjects via /evaluations/subjects
  useEffect(() => {
    const load = async () => {
      setLoadingSubjects(true);
      setSubjects([]);
      setByStudent({});
      setOpenStudentIds(new Set());
      setErrorMsg("");

      try {
        if (!selectedClass) return;

        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", selectedClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", "SESSION PRINCIPALE"); // ✅ champ supprimé côté UI

        const res = await fetch(`${API_BASE}/evaluations/subjects?${qs.toString()}`);
        const data = await res.json();
        const all = Array.isArray(data?.subjects) ? data.subjects : [];

        const uniq = [];
        const seen = new Set();
        for (const s of all) {
          const label = cleanStr(s?.label || s?.name || "");
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push({
            ...s,
            id: s.subjectId || s.id,
            label,
            isAnonymous: !!s.isAnonymous,
            subjectCode: cleanStr(s.subjectCode || s.ecueCode || s.code || ""),
          });
        }
        uniq.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setSubjects(uniq);
      } catch (e) {
        setSubjects([]);
        setErrorMsg(e?.message || "Erreur chargement matières");
      } finally {
        setLoadingSubjects(false);
      }
    };
    load();
  }, [selectedClassId, academicYear, semester, examType]);

  // 4) si au moins 1 matière anonyme -> charger examCtx (examId)
  const hasAnonymousSubjects = useMemo(
    () => subjects.some((s) => !!s.isAnonymous),
    [subjects]
  );

  useEffect(() => {
    const run = async () => {
      setExamCtx(null);
      if (!selectedClass || !hasAnonymousSubjects) return;

      setLoadingExamCtx(true);
      try {
        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", selectedClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", "SESSION PRINCIPALE");

        const res = await fetch(`${API_BASE}/evaluation-session-anonymats/context?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur context anonymat");
        setExamCtx(data);
      } catch (e) {
        setExamCtx(null);
        setErrorMsg(e?.message || "Erreur context anonymat");
      } finally {
        setLoadingExamCtx(false);
      }
    };
    run();
  }, [selectedClassId, academicYear, semester, examType, hasAnonymousSubjects]);

  // 5) construire la matrice composed/missing par étudiant
  useEffect(() => {
    const run = async () => {
      setByStudent({});
      setOpenStudentIds(new Set());
      setErrorMsg("");

      if (!selectedClass) return;
      if (students.length === 0) return;
      if (subjects.length === 0) return;

      // si matières anonymes, il faut examId
      if (hasAnonymousSubjects && !examCtx?.examId) return;

      setLoadingPresenceMatrix(true);

      try {
        // init map
        const init = {};
        for (const st of students) {
          const sid = cleanStr(st?.id);
          if (!sid) continue;
          init[sid] = { composed: [], missing: [] };
        }

        const worker = async (subj) => {
          const subjectId = cleanStr(subj.id);
          const subjectCode = cleanStr(subj.subjectCode) || subjectId;
          if (!subjectId || !subjectCode) return null;

          const qs = new URLSearchParams();
          qs.set("academicYear", normalizeAcademicYear(academicYear));
          qs.set("classId", selectedClass.id);
          qs.set("semester", semester);
          qs.set("examType", examType);
          qs.set("sessionName", "SESSION PRINCIPALE");
          qs.set("subjectId", subjectId);
          qs.set("subjectCode", subjectCode);
          qs.set("subjectLabel", cleanStr(subj.label) || "");
          qs.set("mode", mode);
          if (subj.isAnonymous) qs.set("examId", examCtx?.examId || "");

          const res = await fetch(`${API_BASE}/presences-examens/sheet?${qs.toString()}`);
          const data = await res.json();
          if (!res.ok) {
            // on ne bloque pas tout, mais on signale
            console.warn("sheet error", subj.label, data?.error);
            return { subjectId, subjectLabel: subj.label, error: data?.error || "Erreur sheet" };
          }

          const composedIds = new Set((data?.composed || []).map((x) => cleanStr(x.studentId)).filter(Boolean));
          return { subjectId, subjectLabel: subj.label, composedIds };
        };

        // ✅ limite concurrence
        const results = await asyncPool(4, subjects, worker);

        // remplir init
        for (const r of results) {
          if (!r) continue;
          if (r.error) continue;

          for (const sid of Object.keys(init)) {
            const isComposed = r.composedIds.has(sid);
            if (isComposed) init[sid].composed.push({ id: r.subjectId, label: r.subjectLabel });
            else init[sid].missing.push({ id: r.subjectId, label: r.subjectLabel });
          }
        }

        setByStudent(init);
      } catch (e) {
        setErrorMsg(e?.message || "Erreur calcul présences");
      } finally {
        setLoadingPresenceMatrix(false);
      }
    };

    run();
  }, [
    selectedClassId,
    students,
    subjects,
    academicYear,
    semester,
    examType,
    sessionType,
    mode,
    hasAnonymousSubjects,
    examCtx?.examId,
  ]);

  const classLabel = selectedClass
    ? `${selectedClass.academicYear || academicYear} · ${
        selectedClass.title || selectedClass.abbrev || selectedClass.displayName || selectedClass.id
      }`
    : "Aucune classe détectée";

  const sessionLabel = sessionType === "rattrapage" ? "RATTRAPAGE" : "PRINCIPALE";

  const filteredStudents = useMemo(() => {
    const out = [];

    for (const st of students) {
      const sid = cleanStr(st?.id);
      if (!sid) continue;

      const info = byStudent[sid] || { composed: [], missing: [] };

      const hasComposed = info.composed.length > 0;
      const hasMissing = info.missing.length > 0;

      if (viewMode === "composed") {
        // ont composé au moins une matière
        if (hasComposed) out.push({ st, sid, info });
      } else {
        // n'ont pas composé (au moins une matière)
        if (hasMissing) out.push({ st, sid, info });
      }
    }

    return out;
  }, [students, byStudent, viewMode]);

  const toggleStudent = (sid) => {
    setOpenStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />

        <div style={styles.pageBody}>
          <div style={styles.container}>
            <section style={cardStyles.card}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>
                  Liste de présence (examens)
                </h1>

                <p style={{ margin: "6px 0 0", color: "#6B7280", fontSize: ".85rem" }}>
                  Choisis semestre + type d’examen + session. Ensuite tu peux afficher “ont composé” ou “n’ont pas composé”.
                </p>

                <p style={{ marginTop: 10, fontSize: ".85rem", color: "#111827", fontWeight: 800 }}>
                  Classe : <span style={{ color: "#374151" }}>{classLabel}</span>
                </p>

                {hasAnonymousSubjects && (
                  <p style={{ margin: "6px 0 0", color: "#6B7280", fontSize: ".82rem" }}>
                    Matières anonymes détectées · ExamId: <b>{examCtx?.examId || "—"}</b>{" "}
                    {loadingExamCtx ? "(chargement…)" : ""}
                  </p>
                )}
              </div>

              <div style={{ flex: 1.2, minWidth: 0 }}>
                <div style={filtersRow}>
                  <Field label="Année académique">
                    <input
                      style={inputPill}
                      value={academicYear}
                      onChange={(e) => {
                        setAcademicYear(e.target.value);
                        setSelectedClassId("");
                        setOpenStudentIds(new Set());
                      }}
                    />
                  </Field>

                  <Field label="Semestre">
                    <select
                      style={inputPill}
                      value={semester}
                      onChange={(e) => {
                        setSemester(e.target.value);
                        setOpenStudentIds(new Set());
                      }}
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
                      onChange={(e) => {
                        setExamType(e.target.value);
                        setOpenStudentIds(new Set());
                      }}
                      disabled={!selectedClass}
                    >
                      <option value="CC">CC</option>
                      <option value="SN">SN</option>
                      <option value="EXAMEN">EXAMEN</option>
                    </select>
                  </Field>

                  <Field label="Session">
                    <select
                      style={inputPill}
                      value={sessionType}
                      onChange={(e) => {
                        setSessionType(e.target.value);
                        setOpenStudentIds(new Set());
                      }}
                      disabled={!selectedClass}
                    >
                      <option value="main">Principale</option>
                      <option value="rattrapage">Rattrapage</option>
                    </select>
                  </Field>

                  <Field label="Afficher">
                    <select
                      style={inputPill}
                      value={viewMode}
                      onChange={(e) => {
                        setViewMode(e.target.value);
                        setOpenStudentIds(new Set());
                      }}
                      disabled={!selectedClass}
                    >
                      <option value="missing">N’ont pas composé</option>
                      <option value="composed">Ont composé</option>
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            <section style={cardStyles.card}>
              {errorMsg ? (
                <p style={{ margin: 0, color: "#B91C1C", fontWeight: 800 }}>{errorMsg}</p>
              ) : loadingClasses || loadingStudents || loadingSubjects || loadingPresenceMatrix ? (
                <p style={{ margin: 0, color: "#6B7280" }}>
                  Chargement…{" "}
                  {loadingPresenceMatrix
                    ? "(calcul des matières composées / non composées)"
                    : ""}
                </p>
              ) : !selectedClass ? (
                <p style={{ margin: 0, color: "#6B7280" }}>Aucune classe.</p>
              ) : filteredStudents.length === 0 ? (
                <p style={{ margin: 0, color: "#6B7280" }}>
                  Aucun étudiant dans ce filtre.
                </p>
              ) : (
                <div style={{ width: "100%" }}>
                  <div style={metaBar}>
                    <span style={metaChip}>Semestre: {semester}</span>
                    <span style={metaChip}>Examen: {examType}</span>
                    <span style={metaChip}>Session: {sessionLabel}</span>
                    <span style={metaChip}>Matières: {subjects.length}</span>
                    <span style={metaChip}>
                      <Filter size={14} style={{ marginRight: 6 }} />
                      {viewMode === "missing" ? "N’ont pas composé" : "Ont composé"}:{" "}
                      {filteredStudents.length}
                    </span>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
                    <thead>
                      <tr>
                        <th style={th}>#</th>
                        <th style={th}>Matricule</th>
                        <th style={th}>Nom & Prénoms</th>
                        <th style={th}>(Non composées)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(({ st, sid, info }, idx) => {
                        const fullName = cleanStr(
                          st?.fullName ||
                            `${cleanStr(st?.lastName)} ${cleanStr(st?.firstName)}`.trim()
                        );
                        const isOpen = openStudentIds.has(sid);

                        const missingCount = info?.missing?.length || 0;

                        return (
                          <>
                            <tr
                              key={sid}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (viewMode !== "missing") return; // ✅ accordéon utile surtout sur missing
                                toggleStudent(sid);
                              }}
                            >
                              <td style={td}>
                                {viewMode === "missing" ? (
                                  <span style={chevWrap}>
                                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </span>
                                ) : null}
                                {idx + 1}
                              </td>
                              <td style={td}>{cleanStr(st?.matricule) || "—"}</td>
                              <td style={td}>{(fullName || "—").toUpperCase()}</td>
                              <td style={td}>
                                {viewMode === "missing" ? (
                                  <span style={countPill}>{missingCount}</span>
                                ) : (
                                  <span style={{ color: "#6B7280" }}>—</span>
                                )}
                              </td>
                            </tr>

                            {viewMode === "missing" && isOpen && (
                              <tr key={`${sid}__details`}>
                                <td colSpan={4} style={detailsCell}>
                                  <div style={detailsBox}>
                                    <div style={{ fontWeight: 900, marginBottom: 8 }}>
                                      Matières non composées ({missingCount})
                                    </div>

                                    {missingCount === 0 ? (
                                      <div style={{ color: "#6B7280" }}>
                                        Aucune (il/elle a composé toutes les matières).
                                      </div>
                                    ) : (
                                      <div style={subjectsGrid}>
                                        {info.missing.map((m) => (
                                          <div key={m.id} style={subjectCard}>
                                            {m.label}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
      <label style={{ fontSize: ".75rem", fontWeight: 800, color: "#6B7280" }}>{label}</label>
      {children}
    </div>
  );
}

/* styles */
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

const cardStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    boxShadow: "0 10px 22px rgba(17, 24, 39, 0.04)",
  },
};

const filtersRow = { display: "flex", gap: ".5rem", flexWrap: "wrap", width: "100%" };

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

const th = {
  padding: "10px 12px",
  borderBottom: "1px solid #E5E7EB",
  textAlign: "left",
  fontWeight: 900,
  fontSize: ".78rem",
  color: "#6B7280",
  background: "#FAFAFB",
};

const td = { padding: "10px 12px", borderBottom: "1px solid #F3F4F6" };

const metaBar = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 };
const metaChip = {
  fontSize: 12,
  fontWeight: 900,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  background: "#FAFAFB",
  color: "#374151",
  display: "inline-flex",
  alignItems: "center",
};

const chevWrap = { display: "inline-flex", alignItems: "center", marginRight: 8, color: "#6B7280" };

const detailsCell = { padding: 0, borderBottom: "1px solid #F3F4F6" };
const detailsBox = {
  padding: 14,
  background: "#F9FAFB",
  borderTop: "1px solid #E5E7EB",
};

const subjectsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const subjectCard = {
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  background: "#fff",
  padding: 10,
  fontWeight: 800,
  color: "#111827",
};

const countPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 34,
  height: 26,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  color: "#991B1B",
  fontWeight: 900,
  fontSize: 12,
};