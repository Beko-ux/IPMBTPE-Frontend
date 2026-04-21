// src/pages/AnonymatsSessionPage.jsx
import { useEffect, useMemo, useState } from "react";
import AcademicYearSelector from "../components/AcademicYearSelector";
import SemesterSelector from "../components/SemesterSelector";
import { api } from "../api/client";

const cleanStr = (x) => (x ?? "").toString().trim();

export default function AnonymatsSessionPage({ academicYear = "2025-2026", onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Contexte
  const [selectedYear, setSelectedYear] = useState(academicYear);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("SN");
  const [sessionName, setSessionName] = useState("SESSION PRINCIPALE");

  const [subjects, setSubjects] = useState([]);
  const [anonMap, setAnonMap] = useState({}); // subjectId -> boolean

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) || null,
    [classes, classId]
  );

  const totals = useMemo(() => {
    const total = subjects.length;
    const anon = Object.values(anonMap).filter(Boolean).length;
    return { total, anon, nom: total - anon };
  }, [subjects, anonMap]);

  // Chargement des classes
  useEffect(() => {
    let alive = true;
    async function loadClasses() {
      try {
        const data = await api.get(`/classes?year=${encodeURIComponent(selectedYear)}`);
        if (!alive) return;
        setClasses(Array.isArray(data) ? data : []);
        setClassId("");
      } catch (e) {
        if (alive) setErr(e.message);
      }
    }
    loadClasses();
    return () => (alive = false);
  }, [selectedYear]);

  // Chargement des matières
  useEffect(() => {
    if (!selectedClass || !selectedYear || !semester || !examType || !sessionName) {
      setSubjects([]);
      setAnonMap({});
      return;
    }

    let alive = true;
    async function loadSubjects() {
      setLoading(true);
      setErr("");
      setMsg("");
      try {
        const params = new URLSearchParams({
          academicYear: selectedYear,
          classId: selectedClass.id,
          semester,
          examType,
          sessionName,
        });
        const data = await api.get(`/evaluations/subjects?${params}`);
        if (!alive) return;
        const list = data.subjects || [];
        setSubjects(list);
        const map = {};
        list.forEach((s) => {
          const id = cleanStr(s.subjectId);
          if (id) map[id] = !!s.isAnonymous;
        });
        setAnonMap(map);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadSubjects();
    return () => (alive = false);
  }, [selectedClass, selectedYear, semester, examType, sessionName]);

  // Sauvegarde
  async function saveSelection() {
    if (!selectedClass) return setErr("Choisis une classe.");
    if (!subjects.length) return setErr("Aucune matière à enregistrer.");
    if (!cleanStr(sessionName)) return setErr("Renseigne le nom de session.");

    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const payload = {
        academicYear: selectedYear,
        classId: selectedClass.id,
        semester,
        examType,
        sessionName,
        items: subjects.map((s) => ({
          subjectId: cleanStr(s.subjectId),
          subjectCode: cleanStr(s.code) || cleanStr(s.subjectCode),
          subjectLabel: cleanStr(s.label),
          moduleCode: cleanStr(s.moduleCode),
          moduleLabel: cleanStr(s.moduleLabel),
          isAnonymous: !!anonMap[cleanStr(s.subjectId)],
        })),
      };
      await api.post("/evaluations/upsert", payload);
      setMsg("Enregistré ✅ (les ECUE non cochées sont nominatives).");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Actions de navigation
  function goDashboard() {
    onNavigate?.("dashboard");
  }
  function goNotes() {
    onNavigate?.("notes");
  }
  function goAnonymats() {
    onNavigate?.("anonymats");
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.h1Row}>
            <h1 style={styles.h1}>Évaluations (mode anonymat)</h1>
            <span style={styles.badgeYear}>{selectedYear || "—"}</span>
          </div>
          <div style={styles.sub}>
            {selectedYear || "—"} · {selectedClass?.title || "—"} · {semester} · {examType} · {cleanStr(sessionName) || "—"}
          </div>
        </div>
        <div style={styles.quickNav}>
          <button style={styles.pillBtn} onClick={goDashboard}>Dashboard</button>
          <button style={styles.pillBtn} onClick={goNotes}>Notes</button>
          <button style={styles.pillBtnPrimary} onClick={goAnonymats}>Anonymats</button>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={card}>
          <div style={styles.cardTop}>
            <h2 style={h2}>1) Choisir le contexte</h2>
            <div style={styles.counters}>
              <span style={styles.counter}>Total: {totals.total}</span>
              <span style={styles.counterAnon}>Anonyme: {totals.anon}</span>
              <span style={styles.counterNom}>Nominatif: {totals.nom}</span>
            </div>
          </div>

          <div style={row}>
            <div style={field}>
              <label style={label}>Année académique</label>
              <AcademicYearSelector value={selectedYear} onChange={setSelectedYear} />
            </div>
            <div style={field}>
              <label style={label}>Classe</label>
              <select
                style={input}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={!classes.length}
              >
                <option value="">-- choisir --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.displayName || c.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={row}>
            <div style={field}>
              <label style={label}>Semestre</label>
              <SemesterSelector
                studyYear={selectedClass?.studyYear}
                value={semester}
                onChange={setSemester}
                cycle={selectedClass?.cycle}
                includeAll={false}
                style={input}
              />
            </div>
            <div style={field}>
              <label style={label}>Type d’évaluation</label>
              <select style={input} value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="CC">CC</option>
                <option value="SN">SN</option>
                <option value="EXAMEN">EXAMEN</option>
              </select>
            </div>
          </div>

          <div style={row}>
            <div style={{ ...field, flex: 2 }}>
              <label style={label}>Nom de l’évaluation (session)</label>
              <input
                style={input}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="SESSION PRINCIPALE"
              />
              <div style={hint}>Ici tu coches quelles ECUE sont anonymes.</div>
            </div>
          </div>

          <div style={divider} />

          <div style={styles.cardTop}>
            <h2 style={h2}>2) Choisir les ECUE anonymes</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={pillBtn} onClick={() => setAnonMap(Object.fromEntries(subjects.map(s => [s.subjectId, true])))} disabled={!subjects.length}>
                Tout anonyme
              </button>
              <button style={pillBtn} onClick={() => setAnonMap(Object.fromEntries(subjects.map(s => [s.subjectId, false])))} disabled={!subjects.length}>
                Tout nominatif
              </button>
              <button style={btnPrimary} onClick={saveSelection} disabled={!subjects.length || loading}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>

          {!subjects.length ? (
            <div style={emptyBox}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                Aucune matière trouvée pour ce semestre.
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                Assure-toi que des matières sont activées pour cette classe/année et que leur semestre correspond.
              </div>
            </div>
          ) : (
            <div style={listBox}>
              {subjects.map((s) => {
                const sid = cleanStr(s.subjectId);
                const checked = !!anonMap[sid];
                return (
                  <div key={sid} style={styles.subjectRow}>
                    <label style={styles.subjectLeft}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setAnonMap(prev => ({ ...prev, [sid]: !prev[sid] }))}
                        style={{ transform: "scale(1.05)" }}
                      />
                      <span style={styles.subjectName}>{s.label || "—"}</span>
                    </label>
                    <span style={checked ? styles.tagAnon : styles.tagNom}>
                      {checked ? "ANONYME" : "NOMINATIF"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!!err && <div style={errBox}>{err}</div>}
          {!!msg && <div style={msgBox}>{msg}</div>}
        </section>

        <section style={card}>
          <h2 style={h2}>Statut</h2>
          <div style={infoBox}>
            <div><b>Période :</b> {semester} · {examType}</div>
            <div><b>Classe :</b> {selectedClass?.title || "—"}</div>
            <div><b>Anonymat :</b> {totals.anon} matière(s)</div>
          </div>
          <div style={noteBox}>
            ✅ Après <b>Enregistrer</b>, le backend met à jour tes docs <b>evaluation_anonymats</b>.
          </div>
          <button style={bigBtn} onClick={goAnonymats}>
            Aller aux anonymats →
          </button>
        </section>
      </div>
    </div>
  );
}

/* -------------------- styles -------------------- */
const styles = {
  container: { maxWidth: 1400, margin: "0 auto", padding: "1.25rem 1.5rem" },
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14, flexWrap: "wrap" },
  h1Row: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" },
  badgeYear: { fontSize: 12, fontWeight: 900, color: "#0f766e", background: "#e6fffb", border: "1px solid #99f6e4", borderRadius: 999, padding: "4px 10px" },
  sub: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  quickNav: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  grid: { display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14, alignItems: "start" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  counters: { display: "flex", gap: 8, flexWrap: "wrap" },
  counter: { fontSize: 12, fontWeight: 900, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999, padding: "4px 10px" },
  counterAnon: { fontSize: 12, fontWeight: 900, background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 999, padding: "4px 10px" },
  counterNom: { fontSize: 12, fontWeight: 900, background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", borderRadius: 999, padding: "4px 10px" },
  subjectRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px", borderBottom: "1px solid #F3F4F6" },
  subjectLeft: { display: "flex", alignItems: "center", gap: 10 },
  subjectName: { fontSize: 13, fontWeight: 800, color: "#111827" },
  tagAnon: { fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412" },
  tagNom: { fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8" },
  pillBtn: { height: 34, borderRadius: 999, border: "1px solid #E5E7EB", background: "#fff", padding: "0 12px", cursor: "pointer", fontSize: 13, fontWeight: 900 },
  pillBtnPrimary: { height: 34, borderRadius: 999, border: "none", background: "#00b89c", color: "#fff", padding: "0 12px", cursor: "pointer", fontSize: 13, fontWeight: 900 },
};

const card = { background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "14px 14px" };
const h2 = { margin: 0, fontSize: 16, fontWeight: 900, color: "#111827" };
const row = { display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" };
const field = { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 };
const label = { fontSize: 12, fontWeight: 900, color: "#6B7280" };
const hint = { fontSize: 12, color: "#6B7280" };
const input = { height: 40, borderRadius: 12, border: "1px solid #E5E7EB", padding: "0 12px", outline: "none", fontSize: 13, background: "#fff" };
const pillBtn = { height: 34, borderRadius: 999, border: "1px solid #E5E7EB", background: "#fff", padding: "0 12px", cursor: "pointer", fontSize: 13, fontWeight: 900 };
const btnPrimary = { ...pillBtn, height: 38, border: "none", background: "#00b89c", color: "#fff", padding: "0 14px" };
const divider = { height: 1, background: "#E5E7EB", margin: "14px 0" };
const listBox = { marginTop: 10, border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" };
const emptyBox = { marginTop: 10, padding: 14, borderRadius: 14, border: "1px dashed #E5E7EB", background: "#FAFAFA" };
const infoBox = { marginTop: 12, padding: "12px 12px", borderRadius: 14, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 13, color: "#111827", lineHeight: 1.45 };
const noteBox = { marginTop: 12, padding: "12px 12px", borderRadius: 14, border: "1px dashed #D1FAE5", background: "#ECFDF5", fontSize: 13, color: "#065F46", lineHeight: 1.45 };
const bigBtn = { marginTop: 12, width: "100%", height: 44, borderRadius: 14, border: "none", background: "#00b89c", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: 14 };
const errBox = { marginTop: 12, padding: "10px 12px", borderRadius: 14, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 13, fontWeight: 900, color: "#991b1b" };
const msgBox = { marginTop: 12, padding: "10px 12px", borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", fontSize: 13, fontWeight: 900, color: "#166534" };