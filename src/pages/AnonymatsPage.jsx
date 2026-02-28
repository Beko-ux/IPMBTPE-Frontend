// src/pages/AnonymatsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar, { TopbarIcons } from "../components/HorizontalNavBar.jsx";
import { api } from "../api/client";

function cleanStr(x) {
  return (x ?? "").toString().trim();
}
function normalizeAcademicYear(y) {
  const s = cleanStr(y);
  if (!s) return "";
  return s.replace(/[–—]/g, "-").replace(/\s*\/\s*/g, "-").replace(/\s*-\s*/g, "-");
}
function normalizeSemester(s) {
  const v = cleanStr(s).toUpperCase();
  return v === "S1" || v === "S2" ? v : "S1";
}
function normalizeExamType(s) {
  const v = cleanStr(s).toUpperCase();
  return ["CC", "SN", "EXAMEN"].includes(v) ? v : "SN";
}

function examTypeLabel(code) {
  const v = cleanStr(code).toUpperCase();
  if (v === "CC") return "CONTROLE CONTINU";
  if (v === "SN") return "SESSION NORMALE";
  if (v === "EXAMEN") return "EXAMEN";
  return v || "—";
}

export default function AnonymatsPage({ currentSection = "anonymats", onNavigate }) {
  // Contexte
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("SN");
  const [sessionName, setSessionName] = useState("SESSION PRINCIPALE");

  // Context resolved
  const [examCtx, setExamCtx] = useState(null); // { exists, examId, locked, hasAnonymous }

  // ECUE list (join isAnonymous)
  const [subjects, setSubjects] = useState([]);

  // anonymats list
  const [includeStudents, setIncludeStudents] = useState(true);
  const [anonymats, setAnonymats] = useState([]);

  // génération options
  const [prefix, setPrefix] = useState("AT");
  const [startAt, setStartAt] = useState(101);
  const [width, setWidth] = useState(3);
  const [force, setForce] = useState(false);

  const [mode, setMode] = useState("RANDOM"); // RANDOM | ASC | DESC
  const [by, setBy] = useState("NAME"); // NAME | MATRICULE

  // UI state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const y = useMemo(() => normalizeAcademicYear(academicYear), [academicYear]);
  const semNorm = useMemo(() => normalizeSemester(semester), [semester]);
  const examNorm = useMemo(() => normalizeExamType(examType), [examType]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);

  const topbarSubtitle = useMemo(() => {
    return [
      y || "—",
      selectedClass?.title || selectedClass?.displayName || "Classe —",
      semNorm,
      examNorm,
      cleanStr(sessionName) || "—",
    ].join(" · ");
  }, [y, selectedClass, semNorm, examNorm, sessionName]);

  const actions = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: TopbarIcons.Dashboard, onClick: () => onNavigate?.("dashboard") },
      { key: "notes", label: "Notes", icon: TopbarIcons.Notes, onClick: () => onNavigate?.("notes") },
      { key: "evaluations", label: "Évaluations", icon: TopbarIcons.Evaluations, onClick: () => onNavigate?.("evaluations") },
    ],
    [onNavigate]
  );

  const hasAnonymousSubjects = useMemo(() => subjects.some((s) => !!s.isAnonymous), [subjects]);
  const isLocked = !!examCtx?.locked;

  const printAreaRef = useRef(null);

  // ✅ CSS print : imprime uniquement la zone + header propre
  const printStyle = `
    @page { margin: 12mm; }

    @media print {
      body * { visibility: hidden !important; }
      #anon-print-area, #anon-print-area * { visibility: visible !important; }
      #anon-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 0; }

      /* Optionnel: réduire les arrondis et bordures en impression */
      .print-card { border: none !important; border-radius: 0 !important; }
      .print-table th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  // -----------------------------
  // Load classes
  // -----------------------------
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setErr("");
        setMsg("");
        setClasses([]);
        setClassId("");
        setExamCtx(null);
        setSubjects([]);
        setAnonymats([]);

        if (!y) return;
        const data = await api.get(`/classes?year=${encodeURIComponent(y)}`);
        if (!alive) return;
        setClasses(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message);
      }
    }
    run();
    return () => (alive = false);
  }, [y]);

  async function loadAnonymats(examId) {
    const qs = new URLSearchParams();
    qs.set("examId", examId);
    qs.set("includeStudents", includeStudents ? "1" : "0");
    const data = await api.get(`/evaluation-session-anonymats?${qs.toString()}`);

    setAnonymats(Array.isArray(data?.anonymats) ? data.anonymats : []);

    // ✅ important: GET renvoie locked
    if (typeof data?.locked === "boolean") {
      setExamCtx((p) => (p ? { ...p, locked: data.locked } : p));
    }
  }

  // -----------------------------
  // Charger le contexte examen + sujets + anonymats
  // -----------------------------
  async function loadAll() {
    setErr("");
    setMsg("");
    setExamCtx(null);
    setSubjects([]);
    setAnonymats([]);

    if (!y || !selectedClass?.id || !semNorm || !examNorm || !cleanStr(sessionName)) {
      setErr("Renseigne Année, Classe, Semestre, Type, Nom de session.");
      return;
    }

    setLoading(true);
    try {
      // 1) Charger subjects + join isAnonymous
      {
        const qs = new URLSearchParams();
        qs.set("academicYear", y);
        qs.set("classId", selectedClass.id);
        qs.set("semester", semNorm);
        qs.set("examType", examNorm);
        qs.set("sessionName", cleanStr(sessionName));

        const data = await api.get(`/evaluations/subjects?${qs.toString()}`);
        const list = Array.isArray(data?.subjects) ? data.subjects : [];
        list.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
        setSubjects(list);
      }

      // 2) Context route
      {
        const qs = new URLSearchParams();
        qs.set("academicYear", y);
        qs.set("classId", selectedClass.id);
        qs.set("semester", semNorm);
        qs.set("examType", examNorm);
        qs.set("sessionName", cleanStr(sessionName));

        const ctx = await api.get(`/evaluation-session-anonymats/context?${qs.toString()}`);
        setExamCtx(ctx);

        if (!ctx?.exists) {
          setMsg("Aucune session/évaluation trouvée. Va dans Évaluations pour la créer.");
          return;
        }
        if (!ctx?.hasAnonymous) {
          setMsg("Session trouvée, mais aucune ECUE n'est en mode ANONYME (selon la config). Active l’anonymat dans Évaluations.");
          return;
        }

        await loadAnonymats(ctx.examId);

        if (ctx.locked) {
          setMsg("Anonymats déjà verrouillés ✅ (tu peux recharger/voir/imprimer, mais pas générer/enregistrer).");
        } else {
          setMsg("Contexte chargé ✅");
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Recharger anonymats si includeStudents change (même verrouillé = OK)
  useEffect(() => {
    if (!examCtx?.examId) return;
    loadAnonymats(examCtx.examId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeStudents]);

  // -----------------------------
  // Générer anonymats
  // -----------------------------
  async function generate() {
    setErr("");
    setMsg("");

    if (!examCtx?.examId) return setErr("Charge d'abord le contexte.");
    if (examCtx.locked) return setErr("Anonymats verrouillés. Impossible de générer.");
    if (!examCtx.hasAnonymous) return setErr("Aucune ECUE en mode ANONYME (configure d'abord dans Évaluations).");
    if (!hasAnonymousSubjects) return setErr("Aucune ECUE en mode ANONYME (selon la liste ECUE).");

    setLoading(true);
    try {
      await api.post(`/evaluation-session-anonymats/generate`, {
        examId: examCtx.examId,
        prefix: cleanStr(prefix) || "AT",
        force: !!force,
        startAt: Number(startAt) || 101,
        width: Number(width) || 3,
        mode,
        by,
      });
      setMsg("Anonymats générés ✅");
      await loadAnonymats(examCtx.examId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Enregistrer manuel (bulk)
  // -----------------------------
  async function saveManualAll() {
    setErr("");
    setMsg("");

    if (!examCtx?.examId) return setErr("Charge d'abord le contexte.");
    if (examCtx.locked) return setErr("Anonymats verrouillés. Impossible d’enregistrer.");
    if (!anonymats.length) return setErr("Aucun anonymat à enregistrer.");

    const items = anonymats
      .map((r) => ({
        studentId: cleanStr(r.studentId),
        anonCode: cleanStr(r.anonCode),
      }))
      .filter((x) => x.studentId && x.anonCode);

    if (!items.length) return setErr("Aucune ligne valide (studentId/anonCode).");

    setLoading(true);
    try {
      await api.post(`/evaluation-session-anonymats/set`, {
        examId: examCtx.examId,
        items,
      });
      setMsg("Enregistré ✅");
      await loadAnonymats(examCtx.examId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Verrouiller
  // -----------------------------
  async function lockNow() {
    setErr("");
    setMsg("");

    if (!examCtx?.examId) return setErr("Charge d'abord le contexte.");
    if (!anonymats.length) return setErr("Génère/charge d’abord la liste avant de verrouiller.");

    setLoading(true);
    try {
      await api.post(`/evaluation-session-anonymats/lock`, { examId: examCtx.examId, lock: true });
      setExamCtx((p) => (p ? { ...p, locked: true } : p));
      setMsg("Anonymats verrouillés ✅ (recharger/voir/imprimer OK, générer/enregistrer bloqués).");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function printCorrespondance() {
    window.print();
  }

  // ✅ valeurs imprimées
  const printMeta = useMemo(() => {
    return {
      academicYear: y || "—",
      classLabel: selectedClass?.title || selectedClass?.displayName || selectedClass?.id || "—",
      semester: semNorm || "—",
      examType: examTypeLabel(examNorm),
    };
  }, [y, selectedClass, semNorm, examNorm]);

  return (
    <div style={page.layout}>
      <style>{printStyle}</style>

      <aside style={page.sidebar}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={page.main}>
        <HorizontalNavBar
          title="Anonymats (attribution)"
          subtitle={topbarSubtitle}
          academicYear={y}
          userName="Gestionnaire"
          userRole="Admin système"
          avatarText="GI"
          actions={actions}
        />

        <div style={page.body}>
          <div style={page.container}>
            <div style={grid.twoCols}>
              {/* LEFT */}
              <section style={card.base}>
                <h2 style={typ.h2}>1) Charger l’évaluation</h2>

                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Année académique</label>
                    <input style={form.input} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
                  </div>
                  <div style={form.field}>
                    <label style={form.label}>Classe</label>
                    <select style={form.input} value={classId} onChange={(e) => setClassId(e.target.value)}>
                      <option value="">-- Choisir --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title || c.displayName || c.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Semestre</label>
                    <select style={form.input} value={semester} onChange={(e) => setSemester(e.target.value)}>
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                    </select>
                  </div>

                  <div style={form.field}>
                    <label style={form.label}>Type</label>
                    <select style={form.input} value={examType} onChange={(e) => setExamType(e.target.value)}>
                      <option value="CC">CC</option>
                      <option value="SN">SN</option>
                      <option value="EXAMEN">EXAMEN</option>
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
                    <button style={btn.primary} onClick={loadAll} disabled={loading}>
                      Charger
                    </button>
                  </div>
                </div>

                <div style={divider} />

                <h3 style={typ.h3}>ECUE de l’évaluation</h3>
                <div style={list.box}>
                  {!subjects.length ? (
                    <div style={empty}>Aucune ECUE chargée.</div>
                  ) : (
                    <table style={table.base}>
                      <thead>
                        <tr>
                          <th style={table.th}>ECUE</th>
                          <th style={table.th}>Code</th>
                          <th style={table.th}>Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((s) => (
                          <tr key={s.subjectId || s.id}>
                            <td style={table.td}>{s.label || "—"}</td>
                            <td style={table.td}>{s.code || "—"}</td>
                            <td style={table.td}>
                              {s.isAnonymous ? <span style={badges.anon}>ANONYME</span> : <span style={badges.nom}>NOMINATIF</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={note.tip}>
                  ✅ Après “Charger”, tu peux générer, modifier, enregistrer et imprimer la correspondance.
                </div>
              </section>

              {/* RIGHT */}
              <section style={card.base}>
                <div style={card.headerRow}>
                  <h2 style={typ.h2}>2) Attribuer les anonymats</h2>
                  <button style={btn.ghost} onClick={printCorrespondance} disabled={!anonymats.length}>
                    Imprimer
                  </button>
                </div>

                <div style={infoBox}>
                  <div><b>Contexte (examId) :</b> {examCtx?.examId || "—"}</div>
                  <div><b>Évaluation trouvée :</b> {examCtx?.exists ? "Oui" : "Non"}</div>
                  <div><b>Anonymat actif :</b> {examCtx?.hasAnonymous ? "Oui" : "Non"}</div>
                  <div><b>Verrouillé :</b> {isLocked ? "Oui" : "Non"}</div>
                </div>

                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Mode d’attribution</label>
                    <select style={form.input} value={mode} onChange={(e) => setMode(e.target.value)} disabled={isLocked}>
                      <option value="RANDOM">Aléatoire</option>
                      <option value="ASC">Croissant</option>
                      <option value="DESC">Décroissant</option>
                    </select>
                  </div>

                  <div style={form.field}>
                    <label style={form.label}>Trier par</label>
                    <select style={form.input} value={by} onChange={(e) => setBy(e.target.value)} disabled={isLocked}>
                      <option value="NAME">Nom</option>
                      <option value="MATRICULE">Matricule</option>
                    </select>
                  </div>
                </div>

                <div style={form.row}>
                  <div style={form.field}>
                    <label style={form.label}>Préfixe</label>
                    <input style={form.input} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="AT" disabled={isLocked} />
                    <div style={form.hint}>Ex: AT → AT101..AT120</div>
                  </div>

                  <div style={form.field}>
                    <label style={form.label}>StartAt</label>
                    <input style={form.input} value={String(startAt)} onChange={(e) => setStartAt(e.target.value)} placeholder="101" disabled={isLocked} />
                  </div>

                  <div style={form.field}>
                    <label style={form.label}>Width</label>
                    <input style={form.input} value={String(width)} onChange={(e) => setWidth(e.target.value)} placeholder="3" disabled={isLocked} />
                  </div>
                </div>

                <div style={form.row}>
                  <div style={{ ...form.field, justifyContent: "flex-end" }}>
                    <label style={form.label}>&nbsp;</label>

                    <label style={checkRow}>
                      <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={isLocked} />
                      Forcer (réassigner tous)
                    </label>

                    <label style={{ ...checkRow, marginTop: 8 }}>
                      <input type="checkbox" checked={includeStudents} onChange={(e) => setIncludeStudents(e.target.checked)} />
                      Inclure étudiants (nom/matricule)
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button style={btn.ghost} onClick={() => examCtx?.examId && loadAnonymats(examCtx.examId)} disabled={!examCtx?.examId || loading}>
                    Recharger
                  </button>

                  <button style={btn.primary} onClick={generate} disabled={!examCtx?.examId || loading || !examCtx?.hasAnonymous || isLocked}>
                    Générer anonymats
                  </button>

                  <button style={btn.ghost} onClick={saveManualAll} disabled={!examCtx?.examId || loading || !anonymats.length || isLocked}>
                    Enregistrer
                  </button>

                  <button style={btn.danger} onClick={lockNow} disabled={!examCtx?.examId || loading || !anonymats.length || isLocked}>
                    Verrouiller
                  </button>
                </div>

                <div style={{ marginTop: 10 }}>
                  {loading && <div style={note.loading}>Chargement…</div>}
                  {err && <div style={note.err}>{err}</div>}
                  {msg && <div style={note.ok}>{msg}</div>}
                </div>

                {/* ✅ Zone imprimable uniquement */}
                <div
                  id="anon-print-area"
                  ref={printAreaRef}
                  className="print-card"
                  style={{ ...list.box, marginTop: 12, maxHeight: 520, overflow: "auto", padding: 14 }}
                >
                  {/* ✅ Header PDF */}
                  <div style={print.header}>
                    <div style={print.title}>ANONYMAT</div>

                    <div style={print.metaGrid}>
                      <div><b>Année académique :</b> {printMeta.academicYear}</div>
                      <div><b>Classe :</b> {printMeta.classLabel}</div>
                      <div><b>Semestre :</b> {printMeta.semester}</div>
                      <div><b>Type :</b> {printMeta.examType}</div>
                    </div>

                    <div style={print.rule} />
                  </div>

                  {!anonymats.length ? (
                    <div style={empty}>Aucun anonymat chargé.</div>
                  ) : (
                    <table className="print-table" style={table.base}>
                      <thead>
                        <tr>
                          <th style={table.th}>Code</th>
                          <th style={table.th}>Étudiant</th>
                          <th style={table.th}>Matricule</th>
                          <th style={table.th}>Modifier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anonymats.map((r) => (
                          <AnonRow
                            key={r.studentId || r.anonCode}
                            row={r}
                            locked={isLocked}
                            onLocalChange={(studentId, newCode) => {
                              setAnonymats((prev) =>
                                prev.map((x) =>
                                  cleanStr(x.studentId) === cleanStr(studentId) ? { ...x, anonCode: newCode } : x
                                )
                              );
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={note.tip}>
                  ✅ L’impression/PDF inclut le titre et les informations (année, classe, semestre, type).
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AnonRow({ row, onLocalChange, locked }) {
  const [val, setVal] = useState(row.anonCode || "");

  useEffect(() => setVal(row.anonCode || ""), [row.anonCode]);

  return (
    <tr>
      <td style={table.td}><b>{row.anonCode || "—"}</b></td>
      <td style={table.td}>{row.fullName || "—"}</td>
      <td style={table.td}>{row.matricule || "—"}</td>
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

/* ---------- styles ---------- */
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
const form = { row: { display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }, field: { flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 6 }, label: { fontSize: 12, fontWeight: 800, color: "#6B7280" }, hint: { fontSize: 12, color: "#6B7280" }, input: { height: 40, borderRadius: 12, border: "1px solid #E5E7EB", padding: "0 12px", outline: "none", fontSize: 13, background: "#fff" } };
const checkRow = { display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 800, color: "#111827" };
const divider = { margin: "14px 0", borderTop: "1px solid #E5E7EB" };
const list = { box: { border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", background: "#fff" } };
const table = { base: { width: "100%", borderCollapse: "collapse", fontSize: 13 }, th: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#6B7280", fontSize: 12, fontWeight: 900, background: "#fafafa" }, td: { padding: "10px 12px", borderBottom: "1px solid #F3F4F6" } };
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

// ✅ Styles header PDF
const print = {
  header: { padding: "6px 2px 10px" },
  title: { fontSize: 20, fontWeight: 1000, letterSpacing: 1, textAlign: "center", marginBottom: 10 },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    fontSize: 13,
    lineHeight: "18px",
  },
  rule: { marginTop: 10, borderTop: "1px solid #E5E7EB" },
};