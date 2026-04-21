import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar, { TopbarIcons } from "../components/HorizontalNavBar.jsx";
import AcademicYearSelector from "../components/AcademicYearSelector";
import SemesterSelector from "../components/SemesterSelector";
import { api } from "../api/client";

const cleanStr = (x) => (x ?? "").toString().trim();

export default function AnonymatsPage({ currentSection = "anonymats", onNavigate }) {
  // Contexte général
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("SN");
  const [sessionName, setSessionName] = useState("SESSION PRINCIPALE");

  // État de la session
  const [examCtx, setExamCtx] = useState(null); // { exists, examId, locked, hasAnonymous, subjects }
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Liste des matières (depuis le contexte)
  const [subjects, setSubjects] = useState([]);

  // Options d’affichage
  const [includeStudents, setIncludeStudents] = useState(true);
  const [anonymats, setAnonymats] = useState([]);

  // Paramètres de génération
  const [prefix, setPrefix] = useState("AT");
  const [startAt, setStartAt] = useState(101);
  const [width, setWidth] = useState(3);
  const [force, setForce] = useState(false);
  const [mode, setMode] = useState("RANDOM");
  const [by, setBy] = useState("NAME");

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const selectedClass = useMemo(() => classes.find(c => c.id === classId) || null, [classes, classId]);

  const topbarSubtitle = useMemo(() => {
    return [
      academicYear || "—",
      selectedClass?.title || selectedClass?.displayName || "Classe —",
      semester,
      examType,
      cleanStr(sessionName) || "—",
    ].join(" · ");
  }, [academicYear, selectedClass, semester, examType, sessionName]);

  const actions = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: TopbarIcons.Dashboard, onClick: () => onNavigate?.("dashboard") },
      { key: "notes", label: "Notes", icon: TopbarIcons.Notes, onClick: () => onNavigate?.("notes") },
      { key: "evaluations", label: "Évaluations", icon: TopbarIcons.Evaluations, onClick: () => onNavigate?.("evaluations") },
    ],
    [onNavigate]
  );

  const printAreaRef = useRef(null);

  const printStyle = `
    @page { size: A4; margin: 12mm; }
    @media print {
      body * { visibility: hidden !important; }
      #anon-print-area, #anon-print-area * { visibility: visible !important; }
      #anon-print-area { 
        position: fixed; left: 0; top: 0; width: 100%; padding: 0;
        max-height: none !important; overflow: visible !important;
      }
      .print-card { border: none !important; border-radius: 0 !important; }
      .print-table th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-table th:nth-child(4),
      .print-table td:nth-child(4) { display: none !important; }
      .hide-students th:nth-child(2),
      .hide-students td:nth-child(2),
      .hide-students th:nth-child(3),
      .hide-students td:nth-child(3) { display: none !important; }
    }
  `;

  // Charger les classes
  useEffect(() => {
    let alive = true;
    async function loadClasses() {
      try {
        const data = await api.get(`/classes?year=${encodeURIComponent(academicYear)}`);
        if (!alive) return;
        setClasses(Array.isArray(data) ? data : []);
        setClassId("");
      } catch (e) {
        if (alive) setErr(e.message);
      }
    }
    loadClasses();
    return () => (alive = false);
  }, [academicYear]);

  // Charger le contexte (examId, matières, verrouillage)
  const loadContext = useCallback(async () => {
    if (!academicYear || !classId || !semester || !examType || !sessionName) {
      setErr("Renseignez tous les champs.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const params = new URLSearchParams({
        academicYear,
        classId,
        semester,
        examType,
        sessionName,
      });
      const ctx = await api.get(`/evaluation-session-anonymats/context?${params}`);
      setExamCtx(ctx);
      setSubjects(ctx.subjects || []);
      if (!ctx.exists) {
        setMsg("Aucune session/évaluation trouvée. Va dans Évaluations pour la créer.");
        setSelectedSubjectId("");
        setAnonymats([]);
        return;
      }
      if (!ctx.hasAnonymous) {
        setMsg("Session trouvée, mais aucune ECUE n'est en mode ANONYME.");
        setSelectedSubjectId("");
        setAnonymats([]);
        return;
      }
      // Sélectionner automatiquement la première matière anonyme
      const firstAnon = (ctx.subjects || []).find(s => s.isAnonymous);
      if (firstAnon) {
        setSelectedSubjectId(firstAnon.subjectId);
      } else {
        setSelectedSubjectId("");
      }
      setMsg("Contexte chargé ✅");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [academicYear, classId, semester, examType, sessionName]);

  // Charger les anonymats pour la matière courante
  const loadAnonymats = useCallback(async (examId, subjectId) => {
    if (!examId || !subjectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        examId,
        subjectId,
        includeStudents: includeStudents ? "1" : "0",
      });
      const data = await api.get(`/evaluation-session-anonymats?${params}`);
      setAnonymats(Array.isArray(data?.anonymats) ? data.anonymats : []);
      if (typeof data?.locked === "boolean") {
        setExamCtx(prev => prev ? { ...prev, locked: data.locked } : prev);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [includeStudents]);

  // Recharger quand la matière sélectionnée change
  useEffect(() => {
    if (examCtx?.examId && selectedSubjectId) {
      loadAnonymats(examCtx.examId, selectedSubjectId);
    }
  }, [examCtx?.examId, selectedSubjectId, loadAnonymats]);

  // Recharger quand includeStudents change (si matière déjà sélectionnée)
  useEffect(() => {
    if (examCtx?.examId && selectedSubjectId) {
      loadAnonymats(examCtx.examId, selectedSubjectId);
    }
  }, [includeStudents]);

  // Génération pour la matière courante
  const generate = useCallback(async () => {
    if (!examCtx?.examId || !selectedSubjectId) {
      return setErr("Charge d'abord le contexte et sélectionne une matière.");
    }
    if (examCtx.locked) return setErr("Anonymats verrouillés.");
    if (!examCtx.hasAnonymous) return setErr("Aucune ECUE en mode ANONYME.");
    const subject = subjects.find(s => s.subjectId === selectedSubjectId);
    if (!subject?.isAnonymous) return setErr("Cette matière n'est pas en mode anonyme.");

    setLoading(true);
    try {
      await api.post("/evaluation-session-anonymats/generate", {
        examId: examCtx.examId,
        subjectId: selectedSubjectId,
        prefix: cleanStr(prefix) || "AT",
        force: !!force,
        startAt: Number(startAt) || 101,
        width: Number(width) || 3,
        mode,
        by,
      });
      setMsg(`Anonymats générés pour ${subject.label} ✅`);
      await loadAnonymats(examCtx.examId, selectedSubjectId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [examCtx, selectedSubjectId, subjects, prefix, force, startAt, width, mode, by, loadAnonymats]);

  // Enregistrement manuel
  const saveManualAll = useCallback(async () => {
    if (!examCtx?.examId || !selectedSubjectId) return setErr("Charge d'abord le contexte.");
    if (examCtx.locked) return setErr("Anonymats verrouillés.");
    if (!anonymats.length) return setErr("Aucun anonymat à enregistrer.");

    const items = anonymats
      .map(r => ({
        studentId: cleanStr(r.studentId),
        anonCode: cleanStr(r.anonCode),
      }))
      .filter(x => x.studentId && x.anonCode);

    if (!items.length) return setErr("Aucune ligne valide.");

    setLoading(true);
    try {
      await api.post("/evaluation-session-anonymats/set", {
        examId: examCtx.examId,
        subjectId: selectedSubjectId,
        items,
      });
      setMsg("Enregistré ✅");
      await loadAnonymats(examCtx.examId, selectedSubjectId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [examCtx, selectedSubjectId, anonymats, loadAnonymats]);

  // Verrouillage
  const lockNow = useCallback(async () => {
    if (!examCtx?.examId) return setErr("Charge d'abord le contexte.");
    if (!anonymats.length) return setErr("Génère/charge d’abord la liste.");
    setLoading(true);
    try {
      await api.post("/evaluation-session-anonymats/lock", { examId: examCtx.examId, lock: true });
      setExamCtx(prev => prev ? { ...prev, locked: true } : prev);
      setMsg("Anonymats verrouillés ✅");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [examCtx, anonymats.length]);

  const printCorrespondance = () => window.print();

  const printMeta = useMemo(() => ({
    academicYear,
    classLabel: selectedClass?.title || selectedClass?.displayName || selectedClass?.id || "—",
    semester,
    examType,
    subjectLabel: subjects.find(s => s.subjectId === selectedSubjectId)?.label || "—",
  }), [academicYear, selectedClass, semester, examType, subjects, selectedSubjectId]);

  return (
    <div style={page.layout}>
      <style>{printStyle}</style>
      <aside style={page.sidebar}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>
      <main style={page.main}>
        <HorizontalNavBar
          title="Anonymats (attribution par matière)"
          subtitle={topbarSubtitle}
          academicYear={academicYear}
          userName="Gestionnaire"
          userRole="Admin système"
          avatarText="GI"
          actions={actions}
        />
        <div style={page.body}>
          <div style={page.container}>
            <div style={grid.twoCols}>
              {/* LEFT PANEL */}
              <section style={card.base}>
                <h2 style={typ.h2}>1) Charger l’évaluation</h2>
                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Année académique</label>
                    <AcademicYearSelector value={academicYear} onChange={setAcademicYear} />
                  </div>
                  <div style={form.field}>
                    <label style={form.label}>Classe</label>
                    <select style={form.input} value={classId} onChange={(e) => setClassId(e.target.value)}>
                      <option value="">-- Choisir --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.title || c.displayName || c.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Semestre</label>
                    <SemesterSelector
                      studyYear={selectedClass?.studyYear}
                      value={semester}
                      onChange={setSemester}
                      cycle={selectedClass?.cycle}
                      includeAll={false}
                      style={form.input}
                    />
                  </div>
                  <div style={form.field}>
                    <label style={form.label}>Type</label>
                    <select style={form.input} value={examType} onChange={(e) => setExamType(e.target.value)}>
                      <option value="CC">CC</option><option value="SN">SN</option><option value="EXAMEN">EXAMEN</option>
                    </select>
                  </div>
                </div>
                <div style={form.row}>
                  <div style={{ ...form.field, flex: 2 }}>
                    <label style={form.label}>Nom de session</label>
                    <input style={form.input} value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                    <div style={form.hint}>Doit correspondre à l’évaluation configurée dans “Évaluations”.</div>
                  </div>
                  <div style={{ ...form.field, justifyContent: "flex-end" }}>
                    <button style={btn.primary} onClick={loadContext} disabled={loading}>Charger</button>
                  </div>
                </div>
                <div style={divider} />
                <h3 style={typ.h3}>ECUE de l’évaluation</h3>
                <div style={list.box}>
                  {!subjects.length ? (
                    <div style={empty}>Aucune ECUE chargée.</div>
                  ) : (
                    <table style={table.base}>
                      <thead><tr><th style={table.th}>ECUE</th><th style={table.th}>Code</th><th style={table.th}>Mode</th></tr></thead>
                      <tbody>
                        {subjects.map(s => (
                          <tr key={s.subjectId}>
                            <td style={table.td}>{s.label}</td>
                            <td style={table.td}>{s.subjectId}</td>
                            <td style={table.td}>
                              {s.isAnonymous ? <span style={badges.anon}>ANONYME</span> : <span style={badges.nom}>NOMINATIF</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={note.tip}>✅ Après “Charger”, sélectionne une matière anonyme à droite.</div>
              </section>

              {/* RIGHT PANEL */}
              <section style={card.base}>
                <div style={card.headerRow}>
                  <h2 style={typ.h2}>2) Attribuer les anonymats</h2>
                  <button style={btn.ghost} onClick={printCorrespondance} disabled={!anonymats.length}>Imprimer</button>
                </div>

                <div style={infoBox}>
                  <div><b>Session :</b> {examCtx?.examId || "—"}</div>
                  <div><b>Verrouillé :</b> {examCtx?.locked ? "Oui" : "Non"}</div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontWeight: 800 }}>Matière (ECUE) : </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      disabled={!examCtx?.hasAnonymous || examCtx?.locked}
                      style={{ ...form.input, width: "auto", minWidth: 200 }}
                    >
                      <option value="">-- Choisir une matière anonyme --</option>
                      {subjects.filter(s => s.isAnonymous).map(s => (
                        <option key={s.subjectId} value={s.subjectId}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Mode</label>
                    <select style={form.input} value={mode} onChange={(e) => setMode(e.target.value)} disabled={examCtx?.locked}>
                      <option value="RANDOM">Aléatoire</option><option value="ASC">Croissant</option><option value="DESC">Décroissant</option>
                    </select>
                  </div>
                  <div style={form.field}>
                    <label style={form.label}>Trier par</label>
                    <select style={form.input} value={by} onChange={(e) => setBy(e.target.value)} disabled={examCtx?.locked}>
                      <option value="NAME">Nom</option><option value="MATRICULE">Matricule</option>
                    </select>
                  </div>
                </div>

                <div style={form.row}>
                  <div style={form.field}><label>Préfixe</label><input style={form.input} value={prefix} onChange={(e) => setPrefix(e.target.value)} disabled={examCtx?.locked} /></div>
                  <div style={form.field}><label>StartAt</label><input style={form.input} value={startAt} onChange={(e) => setStartAt(e.target.value)} disabled={examCtx?.locked} /></div>
                  <div style={form.field}><label>Width</label><input style={form.input} value={width} onChange={(e) => setWidth(e.target.value)} disabled={examCtx?.locked} /></div>
                </div>

                <div style={form.row}>
                  <div style={{ ...form.field, justifyContent: "flex-end" }}>
                    <label style={checkRow}><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={examCtx?.locked} /> Forcer (réassigner tous)</label>
                    <label style={{ ...checkRow, marginTop: 8 }}><input type="checkbox" checked={includeStudents} onChange={(e) => setIncludeStudents(e.target.checked)} /> Inclure étudiants (nom/matricule)</label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button style={btn.ghost} onClick={() => examCtx?.examId && selectedSubjectId && loadAnonymats(examCtx.examId, selectedSubjectId)} disabled={!examCtx?.examId || !selectedSubjectId || loading}>Recharger</button>
                  <button style={btn.primary} onClick={generate} disabled={!examCtx?.examId || !selectedSubjectId || loading || !examCtx?.hasAnonymous || examCtx?.locked}>Générer</button>
                  <button style={btn.ghost} onClick={saveManualAll} disabled={!examCtx?.examId || !selectedSubjectId || loading || !anonymats.length || examCtx?.locked}>Enregistrer</button>
                  <button style={btn.danger} onClick={lockNow} disabled={!examCtx?.examId || loading || !anonymats.length || examCtx?.locked}>Verrouiller</button>
                </div>

                <div style={{ marginTop: 10 }}>
                  {loading && <div style={note.loading}>Chargement…</div>}
                  {err && <div style={note.err}>{err}</div>}
                  {msg && <div style={note.ok}>{msg}</div>}
                </div>

                {/* Zone imprimable */}
                <div id="anon-print-area" ref={printAreaRef} className="print-card" style={{ ...list.box, marginTop: 12, maxHeight: 520, overflow: "auto", padding: 14 }}>
                  <div style={print.header}>
                    <div style={print.title}>ANONYMAT – {printMeta.subjectLabel}</div>
                    <div style={print.metaGrid}>
                      <div><b>Année :</b> {printMeta.academicYear}</div><div><b>Classe :</b> {printMeta.classLabel}</div>
                      <div><b>Semestre :</b> {printMeta.semester}</div><div><b>Type :</b> {printMeta.examType}</div>
                    </div>
                    <div style={print.rule} />
                  </div>
                  {!anonymats.length ? (
                    <div style={empty}>Aucun anonymat chargé pour cette matière.</div>
                  ) : (
                    <table className={`print-table ${includeStudents ? "" : "hide-students"}`} style={table.base}>
                      <thead><tr><th style={table.th}>Code</th>{includeStudents && <th>Étudiant</th>}{includeStudents && <th>Matricule</th>}<th style={table.th}>Modifier</th></tr></thead>
                      <tbody>
                        {anonymats.map(row => (
                          <AnonRow
                            key={row.studentId}
                            row={row}
                            locked={examCtx?.locked}
                            includeStudents={includeStudents}
                            onLocalChange={(studentId, newCode) => {
                              setAnonymats(prev => prev.map(x => x.studentId === studentId ? { ...x, anonCode: newCode } : x));
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={note.tip}>✅ L’impression PDF (A4) inclut la matière sélectionnée.</div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Composant de ligne avec mise à jour locale optimisée
function AnonRow({ row, onLocalChange, locked, includeStudents }) {
  const [val, setVal] = useState(row.anonCode || "");
  useEffect(() => setVal(row.anonCode || ""), [row.anonCode]);
  return (
    <tr>
      <td style={table.td}><b>{row.anonCode || "—"}</b></td>
      {includeStudents && <td style={table.td}>{row.fullName || "—"}</td>}
      {includeStudents && <td style={table.td}>{row.matricule || "—"}</td>}
      <td style={{ ...table.td, whiteSpace: "nowrap" }}>
        <input
          style={inputSmall}
          value={val}
          disabled={locked || !row.studentId}
          onChange={(e) => {
            const v = e.target.value;
            setVal(v);
            if (row.studentId) onLocalChange(row.studentId, v);
          }}
          placeholder="AT101"
        />
      </td>
    </tr>
  );
}

// Styles (inchangés, mais conservés pour complétude)
const page = {
  layout: { display: "grid", gridTemplateColumns: "260px 1fr", width: "100vw", height: "100vh", background: "#f5f6f8", overflow: "hidden" },
  sidebar: { height: "100%", overflowY: "auto", background: "var(--bg)", borderRight: "1px solid var(--border)" },
  main: { display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" },
  body: { flex: 1, overflowY: "auto" },
  container: { maxWidth: 1600, margin: "18px auto", padding: "0 18px 18px" },
};
const grid = { twoCols: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "start" } };
const card = { base: { background: "#fff", borderRadius: 16, border: "1px solid var(--border)", padding: 16 }, headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } };
const typ = { h2: { margin: 0, fontSize: 18, fontWeight: 900 }, h3: { margin: "0 0 10px", fontSize: 14, fontWeight: 900 } };
const form = {
  row: { display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" },
  field: { flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 800, color: "#6B7280" },
  hint: { fontSize: 12, color: "#6B7280" },
  input: { height: 40, borderRadius: 12, border: "1px solid #E5E7EB", padding: "0 12px", outline: "none", fontSize: 13, background: "#fff" },
};
const checkRow = { display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 800, color: "#111827" };
const divider = { margin: "14px 0", borderTop: "1px solid #E5E7EB" };
const list = { box: { border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", background: "#fff" } };
const table = {
  base: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#6B7280", fontSize: 12, fontWeight: 900, background: "#fafafa" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F3F4F6" },
};
const empty = { padding: 14, color: "#6B7280" };
const badges = {
  anon: { fontSize: 12, fontWeight: 900, color: "#92400E", border: "1px solid #F59E0B", background: "#FEF3C7", borderRadius: 999, padding: "4px 10px" },
  nom: { fontSize: 12, fontWeight: 900, color: "#1D4ED8", border: "1px solid #3B82F6", background: "#EFF6FF", borderRadius: 999, padding: "4px 10px" },
};
const infoBox = { marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 13, lineHeight: "20px" };
const note = {
  ok: { color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: 10, borderRadius: 12, fontWeight: 800 },
  err: { color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", padding: 10, borderRadius: 12, fontWeight: 800 },
  loading: { color: "#111827", background: "#F3F4F6", border: "1px solid #E5E7EB", padding: 10, borderRadius: 12, fontWeight: 800 },
  tip: { marginTop: 12, fontSize: 12, color: "#6B7280", background: "#fff", border: "1px dashed #E5E7EB", borderRadius: 16, padding: 12, lineHeight: "18px" },
};
const btn = {
  primary: { height: 38, borderRadius: 12, border: "none", background: "#00b89c", color: "#fff", fontWeight: 900, padding: "0 14px", cursor: "pointer" },
  ghost: { height: 38, borderRadius: 12, border: "1px solid #E5E7EB", background: "#fff", color: "#111827", fontWeight: 900, padding: "0 14px", cursor: "pointer" },
  danger: { height: 38, borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 900, padding: "0 14px", cursor: "pointer" },
};
const inputSmall = { height: 34, borderRadius: 12, border: "1px solid #E5E7EB", padding: "0 10px", outline: "none", fontSize: 13, width: 140, background: "#fff" };
const print = {
  header: { padding: "6px 2px 10px" },
  title: { fontSize: 20, fontWeight: 1000, letterSpacing: 1, textAlign: "center", marginBottom: 10 },
  metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13, lineHeight: "18px" },
  rule: { marginTop: 10, borderTop: "1px solid #E5E7EB" },
};