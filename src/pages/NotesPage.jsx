// src/pages/NotesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Printer, Lock, BarChart2, Download, Shield } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

/* ------------------ utils ------------------ */
const cleanStr = (x) => (x ?? "").toString().trim();

function normalizeKey(str) {
  return cleanStr(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeAcademicYear(y) {
  const s = cleanStr(y);
  if (!s) return "";
  return s.replace(/[–—]/g, "-").replace(/\s*\/\s*/g, "-").replace(/\s*-\s*/g, "-");
}

function examTypeLabel(t) {
  const v = cleanStr(t).toUpperCase();
  if (v === "CC") return "CONTRÔLE CONTINU";
  if (v === "SN") return "SESSION NORMALE";
  if (v === "EXAMEN") return "EXAMEN";
  return v || "—";
}

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

  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("CC");
  const [sessionType, setSessionType] = useState("main"); // main | rattrapage

  // ✅ sessionName (contexte)
  const [sessionName, setSessionName] = useState("SESSION PRINCIPALE");

  // subjects
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // catalogue
  const [catalogMap, setCatalogMap] = useState({});
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // notes
  const [notes, setNotes] = useState({}); // nominatif: key=studentKey | anonyme: key=anonCode
  const [locked, setLocked] = useState(false);
  const [preFilled, setPreFilled] = useState({});
  const [activeKey, setActiveKey] = useState("");

  // ✅ anonymat session context + list
  const [examCtx, setExamCtx] = useState(null); // { exists, examId, hasAnonymous, locked? }
  const [anonList, setAnonList] = useState([]); // [{anonCode, studentId?}]
  const [loadingAnon, setLoadingAnon] = useState(false);

  /* ------------------------- Charger classes ------------------------- */
  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const ay = normalizeAcademicYear(academicYear);
        const res = await fetch(`${API_BASE}/classes?year=${encodeURIComponent(ay)}`);
        const data = await res.json();

        const list = Array.isArray(data)
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

  /* ------------------------- Charger matières (ECUE) avec isAnonymous -------------------------
     ✅ On utilise /evaluations/subjects pour récupérer {label, code, isAnonymous, subjectId}
  ------------------------------------------------------------------------------------------- */
  const getSubjectLabel = (s) => String(s?.label || s?.ueLabel || s?.name || "").trim();

  useEffect(() => {
    const loadSubjects = async () => {
      setSubjects([]);
      setSelectedSubjectId("");
      setNotes({});
      setPreFilled({});
      setLocked(false);
      setActiveKey("");
      setExamCtx(null);
      setAnonList([]);

      if (!selectedClass) return;

      setLoadingSubjects(true);
      try {
        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", selectedClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", cleanStr(sessionName) || "SESSION PRINCIPALE");

        const res = await fetch(`${API_BASE}/evaluations/subjects?${qs.toString()}`);
        const data = await res.json();

        const all = Array.isArray(data?.subjects) ? data.subjects : [];

        const uniq = [];
        const seen = new Set();
        for (const s of all) {
          const label = getSubjectLabel(s);
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          uniq.push({
            ...s,
            id: s.subjectId || s.id, // ✅ important: subjectId stable
            label,
            isAnonymous: !!s.isAnonymous,
          });
        }

        uniq.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setSubjects(uniq);
      } catch (e) {
        console.error("Erreur chargement matières:", e);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClassId, academicYear, semester, examType, sessionName]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(selectedSubjectId)) || null,
    [subjects, selectedSubjectId]
  );

  const isAnonymousSubject = !!selectedSubject?.isAnonymous;

  /* ------------------------- Charger catalogue code ECUE (optionnel) ------------------------- */
  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogMap({});
      if (!selectedClass) return;

      const studyYear = selectedClass.studyYear ?? "";
      const cycle = selectedClass.cycle ?? "";
      if (studyYear === "" || cycle === "") return;

      setLoadingCatalog(true);
      try {
        const qs = new URLSearchParams();
        qs.set("studyYear", String(studyYear));
        qs.set("cycle", String(cycle));

        const res = await fetch(`${API_BASE}/subjects/catalog?${qs.toString()}`);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setCatalogMap({});
          return;
        }

        const arr = Array.isArray(data) ? data : [];
        const map = {};
        for (const it of arr) {
          const label = cleanStr(it?.label);
          const code = cleanStr(it?.code);
          if (!label || !code) continue;
          map[normalizeKey(label)] = code;
        }
        setCatalogMap(map);
      } catch (e) {
        setCatalogMap({});
      } finally {
        setLoadingCatalog(false);
      }
    };

    loadCatalog();
  }, [selectedClassId]);

  /* ------------------------- Helpers notes ------------------------- */
  const scaleMax = 20;

  const keyForStudent = (s) => s.id || s.matricule || String(s._id || "");
  const isRetake = sessionType === "rattrapage";
  const mode = isRetake ? "retake" : "main";

  // ✅ Résolution subjectCode (backend l'exige)
  const resolvedSubjectCode = useMemo(() => {
    if (!selectedSubject) return "";

    const direct =
      cleanStr(selectedSubject.subjectCode) ||
      cleanStr(selectedSubject.ecueCode) ||
      cleanStr(selectedSubject.code);

    if (direct) return direct;

    const label = getSubjectLabel(selectedSubject);
    const fromCat = catalogMap[normalizeKey(label)];
    if (fromCat) return fromCat;

    return cleanStr(selectedSubject.id);
  }, [selectedSubject, catalogMap]);

  const canEdit = useMemo(() => {
    if (!selectedClass || !selectedSubject) return false;
    if (isRetake) return true;
    return !locked;
  }, [selectedClass, selectedSubject, isRetake, locked]);

  const handleNoteChange = (key, value) => {
    if (!canEdit) return;

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

  /* ------------------------- (A) Charger examCtx + anonymats si ECUE anonyme ------------------------- */
  useEffect(() => {
    const run = async () => {
      setExamCtx(null);
      setAnonList([]);
      if (!selectedClass || !selectedSubject || !isAnonymousSubject) return;
      if (!cleanStr(sessionName)) return;

      setLoadingAnon(true);
      try {
        // 1) context -> examId
        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", selectedClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", cleanStr(sessionName));

        const res1 = await fetch(`${API_BASE}/evaluation-session-anonymats/context?${qs.toString()}`);
        const ctx = await res1.json();
        if (!res1.ok) throw new Error(ctx?.error || "Erreur context anonymats");

        setExamCtx(ctx);

        if (!ctx?.exists) {
          // pas de session/évaluation
          setAnonList([]);
          return;
        }

        if (!ctx?.hasAnonymous) {
          // session existe mais aucun item anonyme
          setAnonList([]);
          return;
        }

        // 2) list anonymats
        const qs2 = new URLSearchParams();
        qs2.set("examId", ctx.examId);
        qs2.set("includeStudents", "0"); // privacy: pas de noms

        const res2 = await fetch(`${API_BASE}/evaluation-session-anonymats?${qs2.toString()}`);
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2?.error || "Erreur chargement anonymats");

        const list = Array.isArray(data2?.anonymats) ? data2.anonymats : [];
        list.sort((a, b) => String(a.anonCode || "").localeCompare(String(b.anonCode || "")));
        setAnonList(list);
      } catch (e) {
        console.error(e);
        setExamCtx(null);
        setAnonList([]);
      } finally {
        setLoadingAnon(false);
      }
    };

    run();
  }, [selectedClassId, selectedSubjectId, academicYear, semester, examType, sessionName, isAnonymousSubject]);

  /* ------------------------- Charger sheet (nominatif OU anonyme) ------------------------- */
  useEffect(() => {
    const loadSheet = async () => {
      setNotes({});
      setPreFilled({});
      setLocked(false);
      setActiveKey("");

      if (!selectedClass || !selectedSubject) return;
      if (!resolvedSubjectCode) return;

      // si anonyme, il faut examCtx.examId
      if (isAnonymousSubject && !examCtx?.examId) return;

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          classId: selectedClass.id,
          academicYear: normalizeAcademicYear(academicYear),
          semester,
          examType,
          subjectId: String(selectedSubject.id),
          subjectLabel: getSubjectLabel(selectedSubject) || "",
          subjectCode: resolvedSubjectCode,
        });

        if (isAnonymousSubject) qs.set("examId", examCtx.examId);

        const res = await fetch(`${API_BASE}/notes/sheet?${qs.toString()}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Bad Request");

        const sheet = data?.sheet || null;
        if (!sheet) return;

        setLocked(!!sheet.locked);

        const entries = sheet.entries || {};
        const map = {};
        const filled = {};

        if (isAnonymousSubject) {
          // keys = anonCode
          (anonList || []).forEach((a) => {
            const k = cleanStr(a.anonCode);
            if (!k) return;
            const e = entries[k] || {};
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });

          // entrées orphelines
          Object.keys(entries).forEach((k) => {
            if (map[k] !== undefined) return;
            const e = entries[k];
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });
        } else {
          // nominatif: keys = studentKey
          (sortedStudents || []).forEach((s) => {
            const k = keyForStudent(s);
            if (!k) return;
            const e = entries[k];
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });

          Object.keys(entries).forEach((k) => {
            if (map[k] !== undefined) return;
            const e = entries[k];
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });
        }

        setNotes(map);
        setPreFilled(filled);
      } catch (e) {
        console.error("Erreur chargement sheet:", e);
        setNotes({});
        setPreFilled({});
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
    resolvedSubjectCode,
    isAnonymousSubject,
    examCtx?.examId,
    anonList,
  ]);

  /* ------------------------- Save ------------------------- */
  const handleSave = async () => {
    if (!selectedClass) return alert("Veuillez choisir une classe.");
    if (!selectedSubject) return alert("Veuillez choisir une matière.");
    if (!semester) return alert("Veuillez choisir le semestre (S1 / S2).");
    if (!examType) return alert("Veuillez choisir le type d’examen (CC / SN / EXAMEN).");
    if (!resolvedSubjectCode) return alert("ECUE code introuvable (subjectCode).");

    if (!canEdit) {
      return alert("Cette feuille est verrouillée (session principale). Utilisez un rattrapage.");
    }

    // ✅ payload selon mode
    let payloadNotes = [];

    if (isAnonymousSubject) {
      if (!examCtx?.examId) return alert("Contexte anonymat introuvable (examId).");
      if (!anonList.length) return alert("Aucun anonymat trouvé. Génère d'abord les anonymats.");

      payloadNotes = anonList
        .map((a) => {
          const anonCode = cleanStr(a.anonCode);
          if (!anonCode) return null;
          const raw = notes[anonCode];
          if (raw === "" || raw == null) return null;
          const value = Number(String(raw).replace(",", "."));
          if (Number.isNaN(value)) return null;
          return { anonCode, value };
        })
        .filter(Boolean);
    } else {
      payloadNotes = (sortedStudents || [])
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
    }

    if (payloadNotes.length === 0) return alert("Aucune note à enregistrer.");

    const body = {
      academicYear: normalizeAcademicYear(academicYear),
      classId: selectedClass.id,
      semester,
      examType,

      subjectId: String(selectedSubject.id),
      subjectLabel: getSubjectLabel(selectedSubject),
      subjectCode: resolvedSubjectCode,

      scaleMax,
      mode,
      notes: payloadNotes,
    };

    // ✅ examId en mode anonyme
    if (isAnonymousSubject) body.examId = examCtx.examId;

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
        const filled = {};

        if (isAnonymousSubject) {
          (anonList || []).forEach((a) => {
            const k = cleanStr(a.anonCode);
            if (!k) return;
            const e = entries[k];
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });
        } else {
          (sortedStudents || []).forEach((s) => {
            const k = keyForStudent(s);
            if (!k) return;
            const e = entries[k];
            const val = mode === "retake" ? e?.retake : e?.main;
            const strVal = val === null || val === undefined ? "" : String(val);
            map[k] = strVal;
            if (strVal !== "") filled[k] = true;
          });
        }

        setNotes(map);
        setPreFilled(filled);
      }

      alert("Notes enregistrées avec succès.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Échec de l’enregistrement des notes.");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------- Lock ------------------------- */
  const handleLock = async () => {
    if (!selectedClass || !selectedSubject) return alert("Choisissez d’abord la classe et la matière.");
    if (!resolvedSubjectCode) return alert("ECUE code introuvable (subjectCode).");
    if (sessionType !== "main") {
      return alert("Le verrouillage s’applique à la session principale (pas au rattrapage).");
    }
    if (!window.confirm("Valider / verrouiller ces notes ? (elles ne seront plus modifiables)")) return;

    const body = {
      academicYear: normalizeAcademicYear(academicYear),
      classId: selectedClass.id,
      semester,
      examType,

      subjectId: String(selectedSubject.id),
      subjectLabel: getSubjectLabel(selectedSubject) || "",
      subjectCode: resolvedSubjectCode,

      scaleMax,
    };

    if (isAnonymousSubject) {
      if (!examCtx?.examId) return alert("Contexte anonymat introuvable (examId).");
      body.examId = examCtx.examId;
    }

    try {
      setSaving(true);

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
      setActiveKey("");
      setNotes({});
      setPreFilled({});
    }
  };

  const classLabel = selectedClass
    ? `${selectedClass.academicYear || academicYear} · ${selectedClass.title || selectedClass.displayName || ""} ${
        selectedClass.studyYear ? `· Niveau ${selectedClass.studyYear}` : ""
      }`
    : "Aucune classe sélectionnée";

  // UI states
  const showAnonWarning =
    isAnonymousSubject &&
    selectedClass &&
    selectedSubject &&
    (!examCtx?.exists || !examCtx?.hasAnonymous || !anonList.length);

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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h1 style={headerStyles.title}>Gestion des notes</h1>

                  {isAnonymousSubject && (
                    <span style={pillAnon}>
                      <Shield size={14} />
                      Mode ANONYME
                    </span>
                  )}
                </div>

                <p style={headerStyles.subtitle}>
                  Sélectionnez l’année, la classe, le semestre, l’examen, la session et la matière (ECUE).
                </p>

                <p style={headerStyles.badge}>
                  {loading ? "Chargement…" : `${isAnonymousSubject ? anonList.length : sortedStudents.length} ligne(s)`}
                </p>

                <p style={headerStyles.classInfo}>{classLabel}</p>

                <p style={headerStyles.subjectInfo}>
                  <strong>Matière :</strong> {selectedSubject ? getSubjectLabel(selectedSubject) : "—"}
                  {" · "}
                  <strong>Code ECUE :</strong> {selectedSubject ? (resolvedSubjectCode || "—") : "—"}
                  {" · "}
                  <strong>Semestre :</strong> {semester}
                  {" · "}
                  <strong>Examen :</strong> {examTypeLabel(examType)}
                  {" · "}
                  <strong>Session :</strong> {sessionType === "rattrapage" ? "Rattrapage" : "Principale"}
                  {" · "}
                  <strong>Verrouillé :</strong> {locked ? "Oui" : "Non"}
                  {loadingCatalog && (
                    <>
                      {" · "}
                      <span style={{ color: "#6B7280" }}>Catalogue ECUE…</span>
                    </>
                  )}
                </p>

                {isAnonymousSubject && (
                  <div style={anonInfoBox}>
                    <div><b>ExamId :</b> {examCtx?.examId || "—"}</div>
                    <div><b>Évaluation trouvée :</b> {examCtx?.exists ? "Oui" : "Non"}</div>
                    <div><b>Anonymats disponibles :</b> {examCtx?.hasAnonymous ? "Oui" : "Non"}</div>
                  </div>
                )}
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
                      <option value="EXAMEN">EXAMEN</option>
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

                  <Field label="Nom de session">
                    <input
                      style={inputPill}
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      disabled={!selectedClass}
                      placeholder="SESSION PRINCIPALE"
                    />
                  </Field>

                  <Field label="Matière (ECUE)">
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
                          {getSubjectLabel(s)}{s.isAnonymous ? " (ANONYME)" : ""}
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
                        cursor: sessionType === "main" && selectedSubjectId ? "pointer" : "not-allowed",
                      }}
                      onClick={handleLock}
                      disabled={saving || !selectedSubjectId || sessionType !== "main" || !resolvedSubjectCode}
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
                    {isAnonymousSubject ? " (ANONYME)" : ""}
                  </h2>
                  <p style={entryStyles.subtitle}>
                    {semester} · {examTypeLabel(examType)} ·{" "}
                    {sessionType === "rattrapage" ? "Rattrapage" : "Session principale"} · Échelle 0–{scaleMax}
                  </p>

                  {!selectedClassId && <p style={entryStyles.warn}>Choisissez d’abord une classe.</p>}
                  {selectedClassId && !selectedSubjectId && <p style={entryStyles.warn}>Choisissez la matière (ECUE).</p>}

                  {selectedClassId && selectedSubjectId && !resolvedSubjectCode && (
                    <p style={entryStyles.warn}>
                      Impossible de déterminer le <b>code ECUE</b>. (Le backend exige subjectCode)
                    </p>
                  )}

                  {selectedClassId && selectedSubjectId && locked && sessionType === "main" && (
                    <p style={entryStyles.warn}>
                      Cette feuille est verrouillée (session principale). Passez en <strong>Rattrapage</strong>.
                    </p>
                  )}

                  {showAnonWarning && (
                    <p style={entryStyles.warn}>
                      Mode ANONYME: aucun anonymat disponible. Va d’abord dans <b>Anonymats</b> → Générer anonymats.
                    </p>
                  )}
                </div>
              </div>

              <div style={entryStyles.tableWrapper}>
                {!selectedClassId ? (
                  <p style={entryStyles.emptyState}>Choisissez une classe.</p>
                ) : !selectedSubjectId ? (
                  <p style={entryStyles.emptyState}>Choisissez la matière (ECUE).</p>
                ) : isAnonymousSubject ? (
                  // ✅ TABLE ANONYME
                  anonList.length === 0 ? (
                    <p style={entryStyles.emptyState}>
                      {loadingAnon ? "Chargement des anonymats…" : "Aucun anonymat disponible."}
                    </p>
                  ) : (
                    <table style={entryStyles.table}>
                      <thead>
                        <tr>
                          <th style={entryStyles.thIndex}>#</th>
                          <th style={thAnon}>Anonymat</th>
                          <th style={entryStyles.thNote}>Note /{scaleMax}</th>
                          <th style={entryStyles.thMention}>Mention</th>
                          <th style={entryStyles.thStatus}>Statut</th>
                        </tr>
                      </thead>

                      <tbody>
                        {anonList.map((a, idx) => {
                          const k = cleanStr(a.anonCode) || String(idx);
                          const val = notes[k] ?? "";
                          const mention = computeMention(val);
                          const status = computeStatus(val);

                          const isActiveRow = activeKey === k;
                          const isPrefilled = !!preFilled[k] && val !== "";

                          const tdBase = isActiveRow ? { ...entryStyles.tdBase, ...stylesActiveCell } : entryStyles.tdBase;

                          return (
                            <tr key={k} style={isActiveRow ? stylesActiveRow : undefined}>
                              <td style={{ ...entryStyles.tdIndex, ...tdBase }}>{idx + 1}</td>

                              <td style={{ ...tdAnon, ...tdBase }}>
                                <span style={anonBadge}>{k}</span>
                              </td>

                              <td style={{ ...entryStyles.tdNote, ...tdBase }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={scaleMax}
                                  step="0.25"
                                  value={val}
                                  disabled={!canEdit}
                                  onChange={(e) => handleNoteChange(k, e.target.value)}
                                  onFocus={() => setActiveKey(k)}
                                  onBlur={() => setActiveKey("")}
                                  style={{
                                    ...entryStyles.noteInput,
                                    ...(canEdit ? null : stylesDisabledInput),
                                    ...(isActiveRow && canEdit ? stylesActiveInput : null),
                                    ...(!isActiveRow && isPrefilled ? stylesPrefilledInput : null),
                                  }}
                                />
                              </td>

                              <td style={{ ...entryStyles.tdMention, ...tdBase }}>{mention}</td>
                              <td style={{ ...entryStyles.tdStatus, ...tdBase }}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : (
                  // ✅ TABLE NOMINATIVE (inchangée)
                  sortedStudents.length === 0 ? (
                    <p style={entryStyles.emptyState}>Aucun étudiant dans cette classe.</p>
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
                          const val = notes[key] ?? "";
                          const mention = computeMention(val);
                          const status = computeStatus(val);
                          const isActiveRow = activeKey === key;
                          const isPrefilled = !!preFilled[key] && val !== "";

                          const tdBase = isActiveRow ? { ...entryStyles.tdBase, ...stylesActiveCell } : entryStyles.tdBase;

                          return (
                            <tr key={key} style={isActiveRow ? stylesActiveRow : undefined}>
                              <td style={{ ...entryStyles.tdIndex, ...tdBase }}>{idx + 1}</td>
                              <td style={{ ...entryStyles.tdMatricule, ...tdBase }}>{s.matricule || "—"}</td>
                              <td style={{ ...entryStyles.tdName, ...tdBase }}>{(s.fullName || "").toUpperCase()}</td>

                              <td style={{ ...entryStyles.tdNote, ...tdBase }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={scaleMax}
                                  step="0.25"
                                  value={val}
                                  disabled={!canEdit}
                                  onChange={(e) => handleNoteChange(key, e.target.value)}
                                  onFocus={() => setActiveKey(key)}
                                  onBlur={() => setActiveKey("")}
                                  style={{
                                    ...entryStyles.noteInput,
                                    ...(canEdit ? null : stylesDisabledInput),
                                    ...(isActiveRow && canEdit ? stylesActiveInput : null),
                                    ...(!isActiveRow && isPrefilled ? stylesPrefilledInput : null),
                                  }}
                                />
                              </td>

                              <td style={{ ...entryStyles.tdMention, ...tdBase }}>{mention}</td>
                              <td style={{ ...entryStyles.tdStatus, ...tdBase }}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
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
                    !resolvedSubjectCode ||
                    !canEdit ||
                    (isAnonymousSubject && anonList.length === 0)
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

// ✅ LIGNE active
const stylesActiveRow = { background: "#F0FDFA" };

// ✅ CELLULES actives
const stylesActiveCell = {
  borderTop: "1px solid #22C55E",
  borderBottom: "1px solid #22C55E",
};

// ✅ prérempli
const stylesPrefilledInput = {
  background: "#EFF6FF",
  border: "1px solid #3B82F6",
  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.14)",
};

// ✅ disabled
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
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    boxShadow: "0 10px 22px rgba(17, 24, 39, 0.04)",
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
  title: { margin: 0, fontSize: "1.05rem", fontWeight: 800 },
  subtitle: { margin: "4px 0 0", fontSize: ".85rem", color: "var(--ip-gray)" },
  badge: {
    marginTop: 8,
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    background: "#ECFEFF",
    color: "#0369A1",
    border: "1px solid #7DD3FC",
    width: "fit-content",
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
  label: { fontSize: ".75rem", fontWeight: 700, color: "var(--ip-gray)" },
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
    fontWeight: 700,
    cursor: "default",
    opacity: 0.7,
  },
  actionsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
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
    gap: 8,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    fontSize: ".85rem",
    fontWeight: 800,
  },
};

const entryStyles = {
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    boxShadow: "0 10px 22px rgba(17, 24, 39, 0.04)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  subtitle: { margin: "4px 0 0", fontSize: ".8rem", color: "#6B7280" },
  warn: { margin: "8px 0 0", fontSize: ".8rem", color: "#B45309" },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  tdBase: {},
  thIndex: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    width: 40,
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  thMatricule: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    width: 190,
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  thName: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  thNote: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 140,
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  thMention: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 140,
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  thStatus: {
    padding: "10px 12px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    width: 140,
    fontWeight: 800,
    fontSize: ".8rem",
    color: "#6B7280",
    background: "#FAFAFB",
  },
  tdIndex: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".82rem",
    color: "#6B7280",
  },
  tdMatricule: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".82rem",
    color: "#111827",
    whiteSpace: "nowrap",
  },
  tdName: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: ".85rem",
    color: "#111827",
  },
  tdNote: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
  },
  tdMention: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
    fontSize: ".82rem",
    color: "#4B5563",
  },
  tdStatus: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
    fontSize: ".82rem",
    color: "#4B5563",
  },
  noteInput: {
    width: 90,
    height: 34,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    background: "#F9FAFB",
    textAlign: "center",
    fontSize: ".9rem",
    outline: "none",
  },
  emptyState: { padding: "12px 14px", fontSize: ".85rem", color: "#6B7280" },
  footerRow: {
    padding: "0.85rem 0.25rem 0.75rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  btnGhost: {
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "#111827",
    padding: "0.55rem 1rem",
    fontSize: ".88rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnPrimary: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    padding: "0.55rem 1.2rem",
    fontSize: ".88rem",
    fontWeight: 900,
    cursor: "pointer",
  },
};

// ✅ ANON UI bits
const pillAnon = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#ECFDF5",
  border: "1px solid #A7F3D0",
  color: "#047857",
  fontSize: ".75rem",
  fontWeight: 900,
};

const anonInfoBox = {
  marginTop: 10,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #E5E7EB",
  background: "#F9FAFB",
  fontSize: 13,
  lineHeight: "20px",
};

const thAnon = {
  padding: "10px 12px",
  borderBottom: "1px solid #E5E7EB",
  textAlign: "left",
  width: 220,
  fontWeight: 800,
  fontSize: ".8rem",
  color: "#6B7280",
  background: "#FAFAFB",
};

const tdAnon = {
  padding: "10px 12px",
  borderBottom: "1px solid #F3F4F6",
};

const anonBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #3B82F6",
  background: "#EFF6FF",
  color: "#1D4ED8",
  fontWeight: 900,
  fontSize: ".8rem",
};