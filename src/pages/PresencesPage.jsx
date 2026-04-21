// src/pages/PresencesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PresencesPage({ academicYear = "2025-2026", onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // -------------------------
  // Filtres obligatoires
  // -------------------------
  const [selectedYear, setSelectedYear] = useState(academicYear);

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  // ✅ Date pickers (format YYYY-MM-DD)
  const [periodFrom, setPeriodFrom] = useState(""); // ex: 2025-01-05
  const [periodTo, setPeriodTo] = useState("");     // ex: 2025-01-09

  // Données chargées depuis le backend
  const [sheet, setSheet] = useState(null); // { id, dates:[], dayLabels:[], entries:{} }
  const [students, setStudents] = useState([]); // liste d'étudiants
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(null);
  const [classMeta, setClassMeta] = useState(null);

  // ✅ ligne active (étudiant en cours de saisie)
  const [activeStudentKey, setActiveStudentKey] = useState("");

  const loadTimerRef = useRef(null);
  const lastLoadKeyRef = useRef("");

  // -------------------------
  // Charger classes
  // -------------------------
  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(
          `${API_BASE}/classes?year=${encodeURIComponent(selectedYear)}`
        );
        const data = await res.json();

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
  }, [selectedYear]);

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );

  const sortedStudents = useMemo(() => {
    const arr = Array.isArray(students) ? [...students] : [];
    return arr.sort((a, b) => {
      const nameA = (a.fullName || "").toUpperCase();
      const nameB = (b.fullName || "").toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      const matA = (a.matricule || "").toUpperCase();
      const matB = (b.matricule || "").toUpperCase();
      return matA.localeCompare(matB);
    });
  }, [students]);

  const keyForStudent = (s) =>
    s.id || s.studentId || s.matricule || String(s._id || "");

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function fmtFR(isoDate) {
    // isoDate: "YYYY-MM-DD"
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-").map((x) => Number(x));
    const dt = new Date(Date.UTC(y, m - 1, d));
    const day = String(dt.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return `${day} ${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  }

  const periodLabel =
    periodFrom && periodTo ? `Du ${fmtFR(periodFrom)} au ${fmtFR(periodTo)}` : "—";

  // -------------------------
  // Get/Set heures d'absence (par date)
  // -------------------------
  const getHoursValue = (student, dateISO) => {
    const k = keyForStudent(student);
    if (!k || !sheet?.entries) return "";
    const row = sheet.entries[k] || {};
    const days = row.days || {};
    const v = days[dateISO];
    return v === null || v === undefined ? "" : String(v);
  };

  const setHoursValue = (student, dateISO, raw) => {
    if (!sheet) return;
    const k = keyForStudent(student);
    if (!k) return;

    let s = (raw ?? "").toString().replace(",", ".");
    if (s === "") {
      setSheet((prev) => {
        const next = structuredClone(prev);
        next.entries = next.entries || {};
        next.entries[k] =
          next.entries[k] || {
            studentId: student.id || null,
            matricule: student.matricule || null,
            fullName: student.fullName || "",
          };
        next.entries[k].days = next.entries[k].days || {};
        delete next.entries[k].days[dateISO];
        return next;
      });
      return;
    }

    const num = Number(s);
    if (Number.isNaN(num)) return;

    const max = typeof maxHoursPerDay === "number" ? maxHoursPerDay : 8;
    const safe = clamp(num, 0, max);

    setSheet((prev) => {
      const next = structuredClone(prev);
      next.entries = next.entries || {};
      next.entries[k] =
        next.entries[k] || {
          studentId: student.id || null,
          matricule: student.matricule || null,
          fullName: student.fullName || "",
        };
      next.entries[k].days = next.entries[k].days || {};
      next.entries[k].days[dateISO] = safe;
      return next;
    });
  };

  // -------------------------
  // Auto-load fiche (sans bouton)
  // -------------------------
  useEffect(() => {
    // reset affichage si filtres incomplets
    if (!selectedClassId || !selectedYear || !periodFrom || !periodTo) {
      setSheet(null);
      setStudents([]);
      setMaxHoursPerDay(null);
      setClassMeta(null);
      setActiveStudentKey("");
      return;
    }

    const loadKey = `${selectedClassId}__${selectedYear}__${periodFrom}__${periodTo}`;
    if (lastLoadKeyRef.current === loadKey) return;

    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    // petite “debounce” pour éviter de spammer quand tu tapes/changer
    loadTimerRef.current = setTimeout(async () => {
      lastLoadKeyRef.current = loadKey;

      setActiveStudentKey("");
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          classId: String(selectedClassId),
          academicYear: String(selectedYear || "").trim(),
          periodFrom: String(periodFrom),
          periodTo: String(periodTo),
        });

        const res = await fetch(`${API_BASE}/presences/sheet?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur lors du chargement.");

        setSheet(data?.sheet || null);
        setStudents(Array.isArray(data?.students) ? data.students : []);
        setMaxHoursPerDay(
          typeof data?.maxHoursPerDay === "number" ? data.maxHoursPerDay : null
        );
        setClassMeta(data?.class || null);
      } catch (e) {
        console.error("Erreur chargement presences:", e);
        alert(e.message || "Erreur réseau.");
        setSheet(null);
        setStudents([]);
        setMaxHoursPerDay(null);
        setClassMeta(null);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [selectedClassId, selectedYear, periodFrom, periodTo]);

  // -------------------------
  // Enregistrer fiche
  // -------------------------
  const handleSave = async () => {
    if (!selectedClassId) return alert("Veuillez choisir une classe.");
    if (!selectedYear) return alert("Année académique obligatoire.");
    if (!periodFrom || !periodTo) return alert("Période obligatoire (du / au).");
    if (!sheet) return alert("Aucune fiche chargée.");

    const dates = Array.isArray(sheet.dates) ? sheet.dates : [];
    const max = typeof maxHoursPerDay === "number" ? maxHoursPerDay : 8;

    const payloadEntries = (sortedStudents || []).map((s) => {
      const k = keyForStudent(s);
      const row = sheet.entries?.[k]?.days || {};
      const days = {};

      dates.forEach((dateISO) => {
        const raw = row[dateISO];
        if (raw === "" || raw === null || raw === undefined) return;
        const num = Number(String(raw).replace(",", "."));
        if (Number.isNaN(num)) return;
        days[dateISO] = clamp(num, 0, max);
      });

      return {
        studentKey: k,
        studentId: s.id || null,
        matricule: s.matricule || null,
        fullName: s.fullName || "",
        days,
      };
    });

    try {
      setSaving(true);
      const body = {
        classId: selectedClassId,
        academicYear: selectedYear,
        periodFrom,
        periodTo,
        entries: payloadEntries,
      };

      const res = await fetch(`${API_BASE}/presences/sheet/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l’enregistrement.");

      if (data?.sheet) setSheet(data.sheet);
      alert("Absences enregistrées avec succès.");
    } catch (e) {
      console.error("Erreur save presences:", e);
      alert(e.message || "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const classLabel = classMeta
    ? `${classMeta.academicYear || selectedYear} · ${
        classMeta.title || classMeta.displayName || classMeta.abbrev || ""
      }${classMeta.studyYear ? ` · Niveau ${classMeta.studyYear}` : ""}`
    : selectedClass
    ? `${selectedClass.academicYear || selectedYear} · ${
        selectedClass.title || selectedClass.displayName || selectedClass.abbrev || ""
      }${selectedClass.studyYear ? ` · Niveau ${selectedClass.studyYear}` : ""}`
    : "Aucune classe sélectionnée";

  const cycleLabel = classMeta?.cycle || selectedClass?.cycle || "BTS"; // ✅ défaut BTS
  const maxLabel = typeof maxHoursPerDay === "number" ? maxHoursPerDay : "—";

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* ---------------- Header ---------------- */}
      <section style={headerStyles.card}>
        <div style={headerStyles.left}>
          <h1 style={headerStyles.title}>Fiches de présence</h1>
          <p style={headerStyles.subtitle}>
            Sélectionne la classe + période, puis saisis les heures d’absence par jour.
          </p>

          <p style={headerStyles.badge}>
            {loading ? "Chargement…" : `${sortedStudents.length} étudiant(s)`}
          </p>

          <p style={headerStyles.classInfo}>{classLabel}</p>

          <p style={headerStyles.subjectInfo}>
            <strong>Cycle :</strong> {cycleLabel}
            {" · "}
            <strong>Max heures/jour :</strong> {maxLabel}
            {" · "}
            <strong>Période :</strong> {periodLabel}
          </p>
        </div>

        <div style={headerStyles.right}>
          <div style={headerStyles.filtersRow}>
            <Field label="Année académique">
              <input
                style={inputPill}
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedClassId("");
                  setPeriodFrom("");
                  setPeriodTo("");
                  setSheet(null);
                  setStudents([]);
                  setClassMeta(null);
                  setMaxHoursPerDay(null);
                  lastLoadKeyRef.current = "";
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
                  setSheet(null);
                  setStudents([]);
                  setClassMeta(null);
                  setMaxHoursPerDay(null);
                  lastLoadKeyRef.current = "";
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

            <Field label="Période Du (ex: 05 Jan 2025)">
              <input
                style={inputPill}
                type="date"
                value={periodFrom}
                onChange={(e) => {
                  setPeriodFrom(e.target.value);
                  lastLoadKeyRef.current = "";
                }}
              />
            </Field>

            <Field label="Au (ex: 09 Jan 2025)">
              <input
                style={inputPill}
                type="date"
                value={periodTo}
                onChange={(e) => {
                  setPeriodTo(e.target.value);
                  lastLoadKeyRef.current = "";
                }}
              />
              <div style={headerStyles.help}>
                Format: <strong>DD Mmm YYYY</strong> (ex: 05 Jan 2025)
                <br />
                Règle: BTS/Ingénieur = <strong>5 jours</strong>, Licence ={" "}
                <strong>6 jours</strong>.
              </div>
            </Field>
          </div>

          <div style={headerStyles.actionsRow}>
            <button
              type="button"
              style={headerStyles.btnPrimary}
              onClick={handleSave}
              disabled={saving || loading || !sheet}
            >
              <Save size={16} />
              <span>{saving ? "Enregistrement…" : "Enregistrer"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- Table ---------------- */}
      <section style={entryStyles.card}>
        <div style={entryStyles.headerRow}>
          <div>
            <h2 style={entryStyles.title}>Saisie des absences</h2>
            <p style={entryStyles.subtitle}>
              Saisis les heures d’absence par jour (0 → max/jour selon le cycle).
            </p>

            {!selectedClassId && (
              <p style={entryStyles.warn}>Choisis une classe.</p>
            )}
            {selectedClassId && (!periodFrom || !periodTo) && (
              <p style={entryStyles.warn}>Choisis la période (Du / Au).</p>
            )}
          </div>
        </div>

        <div style={entryStyles.tableWrapper}>
          {!sheet ? (
            <div style={entryStyles.emptyStateBox}>
              Renseigne les champs (classe + dates) : la fiche se charge automatiquement.
            </div>
          ) : sortedStudents.length === 0 ? (
            <div style={entryStyles.emptyStateBox}>
              Aucun étudiant dans cette classe.
            </div>
          ) : (
            <table style={entryStyles.table}>
              <thead>
                <tr>
                  <th style={entryStyles.thIndex}>#</th>
                  <th style={entryStyles.thMatricule}>Matricule</th>
                  <th style={entryStyles.thName}>Nom &amp; Prénoms</th>
                  {(sheet.dayLabels || []).map((lab, i) => (
                    <th key={`${lab}-${i}`} style={entryStyles.thDay}>
                      {lab}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedStudents.map((s, idx) => {
                  const key = keyForStudent(s) || String(idx);
                  const isActiveRow = activeStudentKey === key;

                  const tdBase = isActiveRow
                    ? { ...entryStyles.tdBase, ...stylesActiveCell }
                    : entryStyles.tdBase;

                  return (
                    <tr key={key} style={isActiveRow ? stylesActiveRow : undefined}>
                      <td style={{ ...entryStyles.tdIndex, ...tdBase }}>{idx + 1}</td>
                      <td style={{ ...entryStyles.tdMatricule, ...tdBase }}>
                        {s.matricule || "—"}
                      </td>
                      <td style={{ ...entryStyles.tdName, ...tdBase }}>
                        {(s.fullName || "").toUpperCase()}
                      </td>

                      {(sheet.dates || []).map((dateISO) => {
                        const val = getHoursValue(s, dateISO);
                        const max =
                          typeof maxHoursPerDay === "number" ? maxHoursPerDay : 8;

                        return (
                          <td
                            key={`${key}-${dateISO}`}
                            style={{ ...entryStyles.tdDay, ...tdBase }}
                          >
                            <input
                              type="number"
                              min={0}
                              max={max}
                              step="0.5"
                              value={val}
                              onChange={(e) => setHoursValue(s, dateISO, e.target.value)}
                              onFocus={() => setActiveStudentKey(key)}
                              onBlur={() => setActiveStudentKey("")}
                              style={{
                                ...entryStyles.dayInput,
                                ...(isActiveRow ? stylesActiveInput : null),
                              }}
                              title={`Absence (heures) - ${dateISO}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={entryStyles.footerRow}>
          <button
            type="button"
            style={entryStyles.btnPrimary}
            onClick={handleSave}
            disabled={saving || loading || !sheet}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </section>
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

/* ========================= Styles ========================= */

const headerStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
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
    alignItems: "flex-start",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  label: { fontSize: ".75rem", fontWeight: 600, color: "var(--ip-gray)" },
  help: {
    marginTop: 6,
    fontSize: ".75rem",
    color: "#6B7280",
    lineHeight: 1.35,
  },
  actionsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnPrimary: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    padding: "0.55rem 1.1rem",
    fontSize: ".85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
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
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: ".85rem",
    minWidth: 900,
  },

  tdBase: {},

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
    whiteSpace: "nowrap",
  },
  thName: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "left",
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
    minWidth: 240,
  },
  thDay: {
    padding: "8px 10px",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
    minWidth: 120,
    fontWeight: 600,
    fontSize: ".8rem",
    color: "#6B7280",
    whiteSpace: "nowrap",
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
  tdDay: {
    padding: "8px 10px",
    borderBottom: "1px solid #F3F4F6",
    textAlign: "center",
  },

  dayInput: {
    width: 78,
    height: 32,
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    background: "#F9FAFB",
    textAlign: "center",
    fontSize: ".85rem",
    outline: "none",
  },

  emptyStateBox: {
    padding: "14px 12px",
    fontSize: ".85rem",
    color: "#6B7280",
    background: "#fff",
  },

  footerRow: {
    padding: "0.75rem 0.25rem 0.75rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btnPrimary: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "#fff",
    padding: "0.55rem 1.2rem",
    fontSize: ".85rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};