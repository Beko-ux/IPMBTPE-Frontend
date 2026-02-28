// src/pages/ScolaritePage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { colors } from "../styles/theme";
import { Download, RefreshCcw, Search, Users, CheckCircle2, AlertTriangle, Clock3, Save } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ---------------- Helpers ---------------- */

function cleanStr(x) {
  return (x ?? "").toString().trim();
}
function normalizeStatus(s) {
  return cleanStr(s).toUpperCase();
}
function sanitizeFileName(name = "export") {
  return (
    name
      .toString()
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "export"
  );
}

function statusLabel(status) {
  const s = normalizeStatus(status);
  switch (s) {
    case "A_JOUR":
      return "À jour";
    case "EN_RETARD":
      return "En retard";
    case "PARTIEL":
      return "Partiel";
    case "INCONNU":
      return "Inconnu";
    default:
      return s || "—";
  }
}

function statusTone(status) {
  const s = normalizeStatus(status);
  switch (s) {
    case "A_JOUR":
      return { bg: "rgba(0, 184, 156, .12)", fg: colors.teal, border: "rgba(0,184,156,.35)" };
    case "PARTIEL":
      return { bg: "rgba(255, 165, 0, .14)", fg: colors.orange, border: "rgba(255,165,0,.35)" };
    case "INCONNU":
      return { bg: "rgba(148, 163, 184, .16)", fg: "#475569", border: "rgba(148,163,184,.35)" };
    case "EN_RETARD":
    default:
      return { bg: "rgba(216, 67, 21, .10)", fg: "#d84315", border: "rgba(216,67,21,.30)" };
  }
}

function StatusBadge({ status }) {
  const t = statusTone(status);
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: ".75rem",
        fontWeight: 800,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

/* -------- CSV export (classes filtrées) -------- */

function rowsToCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = (v ?? "").toString();
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))];
  return "\uFEFF" + lines.join("\n");
}
function downloadCSV(filename, rows) {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Page ---------------- */

export default function ScolaritePage({ currentSection = "scolarite", onNavigate }) {
  const [academicYear, setAcademicYear] = useState("2025-2026");

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtres
  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // UI: open/close par classe
  const [openMap, setOpenMap] = useState({}); // { [classId]: true/false }

  // Edition locale
  // key = `${studentId}__${academicYear}`
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState("");
  const [errorKey, setErrorKey] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/scolarite/classes?year=${encodeURIComponent(academicYear)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => []);
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement scolarité:", e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  // Pré-remplir drafts depuis API: student.scolariteStatus
  useEffect(() => {
    const next = {};
    for (const cls of classes || []) {
      for (const s of cls.students || []) {
        const k = `${s.id}__${academicYear}`;
        next[k] = {
          studentId: s.id,
          status: normalizeStatus(s.scolariteStatus || "INCONNU") || "INCONNU",
        };
      }
    }
    setDrafts(next);
  }, [classes, academicYear]);

  const filteredClasses = useMemo(() => {
    const q = cleanStr(search).toLowerCase();

    const classMatchesStatus = (cls) => {
      if (statusFilter === "all") return true;
      const wanted = normalizeStatus(statusFilter);
      return (cls.students || []).some((s) => {
        const k = `${s.id}__${academicYear}`;
        const st = normalizeStatus(drafts?.[k]?.status || s.scolariteStatus || "INCONNU");
        return st === wanted;
      });
    };

    return (classes || []).filter((cls) => {
      // filière mapping
      if (filiereFilter !== "all") {
        const t =
          cls.filiere === "Filières industrielles"
            ? "industriel"
            : cls.filiere === "Filières de gestion"
            ? "gestion"
            : cls.filiere === "Filières carrières juridiques"
            ? "juridique"
            : null;
        if (t !== filiereFilter) return false;
      }

      if (cycleFilter !== "all" && cleanStr(cls.cycle) !== cleanStr(cycleFilter)) return false;

      if (!classMatchesStatus(cls)) return false;

      if (q) {
        const inTitle =
          cleanStr(cls.title).toLowerCase().includes(q) ||
          cleanStr(cls.displayName).toLowerCase().includes(q);

        if (inTitle) return true;

        const inStudents = (cls.students || []).some((s) => {
          const name = cleanStr(s.fullName).toLowerCase();
          const mat = cleanStr(s.matricule).toLowerCase();
          return name.includes(q) || mat.includes(q);
        });

        if (!inStudents) return false;
      }

      return true;
    });
  }, [classes, drafts, academicYear, search, filiereFilter, cycleFilter, statusFilter]);

  const stats = useMemo(() => {
    let totalStudents = 0;
    let aJour = 0;
    let enRetard = 0;
    let partiel = 0;

    for (const cls of filteredClasses) {
      for (const s of cls.students || []) {
        totalStudents++;
        const k = `${s.id}__${academicYear}`;
        const st = normalizeStatus(drafts?.[k]?.status || s.scolariteStatus || "INCONNU");

        if (st === "A_JOUR") aJour++;
        else if (st === "PARTIEL") partiel++;
        else if (st === "EN_RETARD") enRetard++;
      }
    }

    return { totalStudents, aJour, enRetard, partiel };
  }, [filteredClasses, drafts, academicYear]);

  const toggleClassOpen = (classId) => {
    setOpenMap((p) => ({ ...p, [classId]: !p[classId] }));
  };

  const setDraftField = (studentId, field, value) => {
    const k = `${studentId}__${academicYear}`;
    setDrafts((p) => ({
      ...p,
      [k]: {
        ...(p[k] || { studentId, status: "INCONNU" }),
        [field]: value,
      },
    }));
  };

  // ✅ Sauvegarde status => PATCH /scolarite/status
  const saveStudent = async (studentId) => {
    const k = `${studentId}__${academicYear}`;
    const d = drafts[k];
    if (!d) return;

    const payload = {
      academicYear,
      studentId,
      status: normalizeStatus(d.status) || "INCONNU",
      note: "",
    };

    setSavingKey(k);
    setErrorKey("");

    try {
      const res = await fetch(`${API_BASE}/scolarite/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Erreur save scolarité:", data);
        setErrorKey(k);
        setSavingKey("");
        return;
      }

      // ✅ Patch local state classes (réfléchit immédiatement)
      setClasses((prev) =>
        (prev || []).map((cls) => ({
          ...cls,
          students: (cls.students || []).map((s) => (s.id === studentId ? { ...s, scolariteStatus: payload.status } : s)),
        }))
      );

      setSavingKey("");
    } catch (e) {
      console.error(e);
      setErrorKey(k);
      setSavingKey("");
    }
  };

  const exportFilteredCSV = () => {
    const rows = [];
    for (const cls of filteredClasses) {
      const classTitle = cleanStr(cls.title || cls.displayName || "Classe");
      for (const s of cls.students || []) {
        const k = `${s.id}__${academicYear}`;
        const st = drafts?.[k]?.status || s.scolariteStatus || "INCONNU";

        rows.push({
          "Année académique": academicYear,
          Classe: classTitle,
          Matricule: cleanStr(s.matricule),
          Nom: cleanStr(s.fullName),
          Statut: statusLabel(st),
        });
      }
    }

    if (!rows.length) return alert("Aucun étudiant à exporter.");

    const file = sanitizeFileName(
      `scolarite_${academicYear}_${cycleFilter}_${statusFilter}_${new Date().toISOString().slice(0, 10)}`
    );

    downloadCSV(`${file}.csv`, rows);
  };

  return (
    <div style={sx.layout}>
      <aside style={sx.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={sx.right}>
        <HorizontalNavBar />

        <div style={sx.pageBody}>
          <div style={sx.container}>
            <header style={sx.pageHeader}>
              <div>
                <h1 style={sx.pageTitle}>Scolarité</h1>
                <p style={sx.pageSubtitle}>Afficher les classes → choisir pour chaque étudiant s’il est à jour ou non</p>
              </div>

              <button type="button" style={sx.reloadBtn} onClick={loadData}>
                <RefreshCcw size={16} />
                <span>Rafraîchir</span>
              </button>
            </header>

            {/* Année */}
            <section style={sx.card}>
              <p style={sx.cardTitle}>Année académique</p>
              <div style={{ marginTop: 10, maxWidth: 260 }}>
                <input style={sx.input} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Ex: 2025-2026" />
              </div>
            </section>

            {/* Stats */}
            <section style={sx.statsRow}>
              <StatCard icon={<Users size={18} />} label="Étudiants" value={stats.totalStudents} helper="Filtrés" />
              <StatCard icon={<CheckCircle2 size={18} />} label="À jour" value={stats.aJour} helper="OK" />
              <StatCard icon={<AlertTriangle size={18} />} label="En retard" value={stats.enRetard} helper="À régulariser" />
              <StatCard icon={<Clock3 size={18} />} label="Partiel" value={stats.partiel} helper="Incomplet" />
            </section>

            {/* Filtres */}
            <section style={sx.card}>
              <p style={sx.cardTitle}>Filtres</p>
              <p style={sx.cardSub}>Affiner par classe / étudiant / filière / cycle / statut</p>

              <div style={sx.filtersRow}>
                <div style={sx.searchWrap}>
                  <Search size={16} />
                  <input
                    style={sx.searchInputBare}
                    placeholder="Rechercher (nom, matricule, classe)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select style={sx.select} value={filiereFilter} onChange={(e) => setFiliereFilter(e.target.value)}>
                  <option value="all">Toutes les filières</option>
                  <option value="industriel">Filières industrielles</option>
                  <option value="gestion">Filières de gestion</option>
                  <option value="juridique">Filières carrières juridiques</option>
                </select>

                <select style={sx.select} value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value)}>
                  <option value="all">Toutes les promotions</option>
                  <option value="BTS">BTS</option>
                  <option value="LICENCE">Licence</option>
                  <option value="MASTER">Master</option>
                  <option value="INGÉNIEUR">Ingénieur</option>
                </select>

                <select style={sx.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Tous les statuts</option>
                  <option value="A_JOUR">À jour</option>
                  <option value="EN_RETARD">En retard</option>
                  <option value="PARTIEL">Partiel</option>
                  <option value="INCONNU">Inconnu</option>
                </select>

                <button
                  type="button"
                  style={sx.resetBtn}
                  onClick={() => {
                    setSearch("");
                    setFiliereFilter("all");
                    setCycleFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Réinitialiser
                </button>
              </div>

              <div style={sx.exportRow}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={sx.exportHint}>Export CSV des classes filtrées</span>
                  <span style={sx.exportMini}>Inclut: classe, matricule, nom, statut</span>
                </div>

                <button type="button" style={sx.exportBtnGhost} onClick={exportFilteredCSV}>
                  <Download size={16} />
                  <span>Exporter CSV</span>
                </button>
              </div>
            </section>

            {/* CLASSES LIST */}
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {loading && <p style={sx.muted}>Chargement des classes…</p>}

              {!loading && filteredClasses.length === 0 && <p style={sx.muted}>Aucune classe trouvée avec ces filtres.</p>}

              {!loading &&
                filteredClasses.map((cls) => (
                  <ScolariteClassCard
                    key={cls.id || cls.key}
                    cls={cls}
                    academicYear={academicYear}
                    isOpen={!!openMap[cls.id || cls.key]}
                    onToggle={() => toggleClassOpen(cls.id || cls.key)}
                    drafts={drafts}
                    setDraftField={setDraftField}
                    onSaveStudent={saveStudent}
                    savingKey={savingKey}
                    errorKey={errorKey}
                  />
                ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- Components ---------------- */

function StatCard({ icon, label, value, helper }) {
  return (
    <div style={sx.statCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon ? <div style={sx.statIcon}>{icon}</div> : null}
        <div>
          <p style={sx.statLabel}>{label}</p>
          <p style={sx.statValue}>{value}</p>
          <p style={sx.statHelper}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

function ScolariteClassCard({ cls, academicYear, isOpen, onToggle, drafts, setDraftField, onSaveStudent, savingKey, errorKey }) {
  const classTitle = cleanStr(cls.title || cls.displayName || cls.key || "Classe");
  const effectif = Array.isArray(cls.students) ? cls.students.length : 0;

  const mini = useMemo(() => {
    let aJour = 0;
    let enRetard = 0;
    let partiel = 0;

    for (const s of cls.students || []) {
      const k = `${s.id}__${academicYear}`;
      const st = normalizeStatus(drafts?.[k]?.status || s.scolariteStatus || "INCONNU");
      if (st === "A_JOUR") aJour++;
      else if (st === "PARTIEL") partiel++;
      else if (st === "EN_RETARD") enRetard++;
    }

    return { aJour, enRetard, partiel };
  }, [cls.students, drafts, academicYear]);

  return (
    <article style={sx.classCard}>
      <header style={sx.classHeader}>
        <div>
          <p style={sx.classTitle}>{classTitle}</p>
          <p style={sx.classSubtitle}>
            Effectif : {effectif} · À jour: {mini.aJour} · Partiel: {mini.partiel} · En retard: {mini.enRetard}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" style={sx.openBtn} onClick={onToggle}>
            {isOpen ? "Fermer" : "Ouvrir"}
          </button>
        </div>
      </header>

      {isOpen && (
        <section style={sx.studentsSection}>
          <p style={sx.studentsTitle}>Étudiants de la classe</p>

          {(cls.students || []).map((s) => {
            const k = `${s.id}__${academicYear}`;
            const d = drafts?.[k] || {};
            const status = d.status || s.scolariteStatus || "INCONNU";

            const isSaving = savingKey === k;
            const hasError = errorKey === k;

            return (
              <div key={s.id} style={sx.stRow}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={sx.stName}>{cleanStr(s.fullName).toUpperCase()}</p>
                  <p style={sx.stMeta}>
                    <span style={sx.stMat}>{cleanStr(s.matricule)}</span>
                    {s.contact ? <span style={sx.dot}>•</span> : null}
                    {s.contact ? <span>{cleanStr(s.contact)}</span> : null}
                  </p>
                </div>

                <div style={sx.stControls}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={status} />

                    <select
                      style={sx.selectSmall}
                      value={status}
                      onChange={(e) => setDraftField(s.id, "status", e.target.value)}
                      title="Choisir statut"
                    >
                      <option value="A_JOUR">À jour</option>
                      <option value="EN_RETARD">En retard</option>
                      <option value="PARTIEL">Partiel</option>
                      <option value="INCONNU">Inconnu</option>
                    </select>
                  </div>

                  <button type="button" style={sx.saveBtn} onClick={() => onSaveStudent(s.id)} disabled={isSaving} title="Enregistrer">
                    <Save size={16} />
                    <span>{isSaving ? "..." : "Enregistrer"}</span>
                  </button>

                  {hasError ? <span style={sx.errMini}>Erreur</span> : null}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </article>
  );
}

/* ---------------- Styles ---------------- */

const sx = {
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
    borderRight: `1px solid ${colors.border}`,
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
    gap: "1.25rem",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pageTitle: { margin: 0, fontSize: "1.2rem", fontWeight: 900 },
  pageSubtitle: { margin: 0, marginTop: 4, fontSize: ".9rem", color: "var(--ip-gray)" },

  reloadBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    cursor: "pointer",
    fontSize: ".82rem",
    fontWeight: 800,
  },

  card: {
    background: "#fff",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
  },
  cardTitle: { margin: 0, fontWeight: 800, fontSize: ".9rem" },
  cardSub: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "var(--ip-gray)" },

  input: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 1rem",
    fontSize: ".9rem",
    background: "var(--bg-input)",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "0.9rem 1rem",
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "var(--bg-sidebar-hi)",
    display: "grid",
    placeItems: "center",
    border: `1px solid ${colors.border}`,
  },
  statLabel: { margin: 0, fontSize: ".8rem", color: "var(--ip-gray)" },
  statValue: { margin: "4px 0", fontSize: "1.15rem", fontWeight: 900 },
  statHelper: { margin: 0, fontSize: ".75rem", color: "var(--ip-gray)" },

  filtersRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
    gap: 10,
    alignItems: "center",
  },

  searchWrap: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-input)",
  },
  searchInputBare: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    fontSize: ".9rem",
  },

  select: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 0.9rem",
    fontSize: ".85rem",
    background: "var(--bg-input)",
  },

  resetBtn: {
    height: 40,
    padding: "0 1.2rem",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    fontSize: ".8rem",
    cursor: "pointer",
    fontWeight: 800,
  },

  exportRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px dashed ${colors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  exportHint: { fontSize: ".82rem", fontWeight: 900, color: "#333" },
  exportMini: { fontSize: ".78rem", color: "var(--ip-gray)" },

  exportBtnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    background: "#fff",
    color: "#333",
    fontSize: ".82rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  classCard: {
    background: "#fff",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.2rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  classHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: 8,
    gap: 10,
  },
  classTitle: { margin: 0, fontWeight: 800, fontSize: ".95rem" },
  classSubtitle: { margin: 0, marginTop: 4, fontSize: ".82rem", color: "var(--ip-gray)" },

  openBtn: {
    height: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: ".82rem",
  },

  studentsSection: { marginTop: 10 },
  studentsTitle: { margin: 0, fontSize: ".82rem", fontWeight: 900, marginBottom: 8 },

  stRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: `1px solid #f1f2f5`,
  },
  stName: { margin: 0, fontSize: ".86rem", fontWeight: 800 },
  stMeta: { margin: "3px 0 0", fontSize: ".78rem", color: "var(--ip-gray)" },
  stMat: { fontFamily: '"Courier New", monospace', fontSize: ".78rem" },
  dot: { margin: "0 6px" },

  stControls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: 820,
  },

  selectSmall: {
    height: 34,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 0.8rem",
    fontSize: ".82rem",
    background: "var(--bg-input)",
    fontWeight: 700,
  },

  saveBtn: {
    height: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: "none",
    background: colors.teal,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },

  errMini: { fontSize: ".78rem", fontWeight: 900, color: "#e53935" },
  muted: { fontSize: ".9rem", color: "var(--ip-gray)", margin: 0 },
};