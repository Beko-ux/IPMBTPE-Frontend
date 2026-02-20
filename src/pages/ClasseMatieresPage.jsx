import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const SEMESTERS = ["S1", "S2"];

function cleanStr(x) {
  return (x ?? "").toString().trim();
}
const getUELabel = (s) => (s?.ueLabel || s?.label || s?.name || "").toString();

export default function ClasseMatieresPage({ currentSection = "classe-matieres", onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);

  // filtres
  const [filiere, setFiliere] = useState("");
  const [specialiteCode, setSpecialiteCode] = useState("");
  const [cycle, setCycle] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [semester, setSemester] = useState("S1");

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filiere) qs.set("filiere", filiere);
      if (specialiteCode) qs.set("specialiteCode", specialiteCode);
      if (cycle) qs.set("cycle", cycle);
      if (studyYear !== "") qs.set("studyYear", String(studyYear));
      if (semester) qs.set("semester", semester);

      const res = await fetch(`${API_BASE}/subjects?${qs.toString()}`);
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filiere, specialiteCode, cycle, studyYear, semester]);

  // group by UE
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of subjects) {
      const ue = cleanStr(getUELabel(s));
      if (!ue) continue;
      if (!map.has(ue)) map.set(ue, []);
      map.get(ue).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [subjects]);

  const stats = useMemo(() => {
    const total = subjects.length;
    const creditsTotal = subjects.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
    const optionals = subjects.filter((s) => !!s.isOptional).length;
    return { total, creditsTotal, optionals };
  }, [subjects]);

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />
        <div style={styles.pageBody}>
          <div style={styles.container}>
            <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Matières d’une classe</h1>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: ".85rem" }}>
              Sélectionne une salle (filière + code + niveau + cycle) et consulte crédits / coefficients.
            </p>

            {/* Filtres */}
            <section style={card}>
              <div style={grid}>
                <Field label="Filière">
                  <input value={filiere} onChange={(e) => setFiliere(e.target.value)} placeholder="Ex: Filières industrielles" style={input} />
                </Field>

                <Field label="Code salle (spécialitéCode)">
                  <input value={specialiteCode} onChange={(e) => setSpecialiteCode(e.target.value)} placeholder="Ex: GLI, BAF..." style={input} />
                </Field>

                <Field label="Cycle">
                  <input value={cycle} onChange={(e) => setCycle(e.target.value)} placeholder="Ex: BTS / LICENCE / MASTER" style={input} />
                </Field>

                <Field label="Niveau (studyYear)">
                  <input value={studyYear} onChange={(e) => setStudyYear(e.target.value)} placeholder="1..5" style={input} />
                </Field>

                <Field label="Semestre">
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} style={input}>
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="button" onClick={load} style={btn}>
                    {loading ? "Chargement…" : "Rafraîchir"}
                  </button>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section style={card}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: ".85rem" }}>
                <Stat label="Matières" value={loading ? "…" : stats.total} />
                <Stat label="Total crédits" value={loading ? "…" : stats.creditsTotal} />
                <Stat label="Optionnelles" value={loading ? "…" : stats.optionals} />
              </div>
            </section>

            {/* Liste groupée */}
            <section style={card}>
              {grouped.length === 0 ? (
                <p style={{ margin: 0, color: "#6B7280", fontSize: ".85rem" }}>
                  Aucune matière pour ces filtres.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {grouped.map(([ue, list]) => {
                    const ueCredits = list.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
                    return (
                      <div key={ue} style={ueCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                          <div style={{ fontWeight: 800 }}>{ue}</div>
                          <div style={{ fontSize: ".8rem", color: "#6B7280" }}>{ueCredits} crédit(s)</div>
                        </div>

                        <div style={{ marginTop: 8, overflowX: "auto" }}>
                          <table style={table}>
                            <thead>
                              <tr>
                                <th style={th}>EC</th>
                                <th style={thCenter}>Crédits</th>
                                <th style={thCenter}>Coef.</th>
                                <th style={thCenter}>Option</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((s) => (
                                <tr key={s.id}>
                                  <td style={td}>{s.ecTitle || <span style={{ color: "#9CA3AF" }}>—</span>}</td>
                                  <td style={tdCenter}>{s.credits ?? "—"}</td>
                                  <td style={tdCenter}>{s.coefficient ?? "—"}</td>
                                  <td style={tdCenter}>{s.isOptional ? "Oui" : "Non"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: ".8rem", fontWeight: 700 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ color: "#6B7280" }}>{label}</div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const styles = {
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 10%) 1fr",
    width: "100vw",
    height: "100vh",
    background: "#f5f6f8",
    overflow: "hidden",
  },
  left: { height: "100%", overflowY: "auto", background: "var(--bg)", borderRight: `1px solid ${colors.border}` },
  right: { display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden", background: "#f5f6f8" },
  pageBody: { flex: 1, overflowY: "auto" },
  container: { maxWidth: 1200, margin: "1.5rem auto", padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" },
};

const card = {
  background: "var(--bg)",
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  padding: "1rem",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 12,
};

const input = {
  width: "100%",
  height: 38,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  padding: "0 .7rem",
  fontSize: ".85rem",
  background: "#F9FAFB",
  outline: "none",
  boxSizing: "border-box",
};

const btn = {
  height: 38,
  borderRadius: 999,
  border: "none",
  background: "#00b89c",
  color: "white",
  padding: "0 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const ueCard = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 12,
  background: "#fff",
};

const table = { width: "100%", borderCollapse: "collapse", fontSize: ".85rem", marginTop: 6 };
const th = { textAlign: "left", padding: "8px 8px", borderBottom: `1px solid ${colors.border}` };
const thCenter = { ...th, textAlign: "center", width: 100 };
const td = { padding: "8px 8px", borderBottom: "1px solid #E5E7EB" };
const tdCenter = { ...td, textAlign: "center" };