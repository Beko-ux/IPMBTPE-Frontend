// src/components/documents/ProcesVerbalPersonnalSheet.jsx
import React, { useEffect, useMemo, useState } from "react";
import ProcesVerbalSheetA4 from "./ProcesVerbalSheetA4.jsx";
import ProcesVerbalSheetA3 from "./ProcesVerbalSheetA3.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const DEFAULT_YEAR = "2025-2026";
const SEMESTERS = ["S1", "S2"];
const SESSIONS = ["Principale", "Rattrapage"];

const cleanStr = (x) => (x ?? "").toString().trim();

function relativeToAbsolute(relativeSemester, studyYear) {
  const y = Number(studyYear);
  if (isNaN(y) || y < 1) return relativeSemester;
  const base = (y - 1) * 2;
  if (relativeSemester === "S1") return `S${base + 1}`;
  if (relativeSemester === "S2") return `S${base + 2}`;
  return relativeSemester;
}

async function fetchJsonFirstOk(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} on ${url}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Aucune URL n'a répondu correctement.");
}

export default function ProcesVerbalPersonnalSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [session, setSession] = useState("Principale");

  const [matrix, setMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [paperFormat, setPaperFormat] = useState("A4");

  // ✅ Deux signatures : DAAC toujours présente, Coordonnateur optionnel
  const [showCoordinator, setShowCoordinator] = useState(false);

  const [delib, setDelib] = useState({
    missingPolicy: "mirror",
    rescueEnabled: false,
    rescueFrom: 8.5,
    manualFillEnabled: false,
    manualCC: "",
    manualSN: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      setSelectedClassId("");
      setClasses([]);
      setMatrix(null);

      try {
        const url1 = `${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`;
        const url2 = `${API_BASE}/api/classes?year=${encodeURIComponent(academicYear)}`;
        const data = await fetchJsonFirstOk([url1, url2]);
        setClasses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur chargement classes:", err);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, [academicYear]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const absoluteSemester = useMemo(() => {
    return relativeToAbsolute(semester, selectedClass?.studyYear);
  }, [semester, selectedClass]);

  const classFullName =
    selectedClass?.title || selectedClass?.abbrev || selectedClass?.id || "";

  useEffect(() => {
    const loadMatrix = async () => {
      setMatrix(null);
      if (!selectedClassId || !academicYear || !semester || !session) return;

      setLoadingMatrix(true);
      try {
        const params = new URLSearchParams({
          academicYear: cleanStr(academicYear),
          classId: cleanStr(selectedClassId),
          semester: cleanStr(semester),
          session: cleanStr(session),
        });

        const url1 = `${API_BASE}/proces-verbal/matrix?${params.toString()}`;
        const url2 = `${API_BASE}/api/proces-verbal/matrix?${params.toString()}`;

        const data = await fetchJsonFirstOk([url1, url2]);
        setMatrix(data || null);
      } catch (err) {
        console.error("Erreur chargement PV matrix:", err);
        setMatrix(null);
      } finally {
        setLoadingMatrix(false);
      }
    };

    loadMatrix();
  }, [selectedClassId, academicYear, semester, session]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Procès-verbal (classe)</h2>
            <p style={styles.modalSubtitle}>
              A4 et A3 sont désormais séparés en composants distincts.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          <div style={styles.leftPanel}>
            <div style={styles.filtersCol}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Année académique</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={styles.pillSelect}
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Classe</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={styles.pillSelect}
                >
                  <option value="">
                    {loadingClasses ? "Chargement..." : "— Choisir —"}
                  </option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title || cls.abbrev || cls.id}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Semestre</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  style={styles.pillSelect}
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {selectedClass?.studyYear && (
                  <div style={{ fontSize: ".7rem", color: "#6B7280", marginTop: 2 }}>
                    (absolu : {absoluteSemester})
                  </div>
                )}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  style={styles.pillSelect}
                >
                  {SESSIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Format papier</label>
                <select
                  value={paperFormat}
                  onChange={(e) => setPaperFormat(e.target.value)}
                  style={styles.pillSelect}
                >
                  <option value="A4">A4 paysage</option>
                  <option value="A3">A3 paysage</option>
                </select>
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid #E5E7EB",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    marginBottom: 6,
                    fontSize: ".85rem",
                  }}
                >
                  Délibération
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Notes manquantes</label>
                  <select
                    value={delib.missingPolicy}
                    onChange={(e) =>
                      setDelib((d) => ({ ...d, missingPolicy: e.target.value }))
                    }
                    style={styles.pillSelect}
                  >
                    <option value="mirror">
                      Si 1 note existe: CC vide ⇒ CC=SN ; SN vide ⇒ SN=CC
                    </option>
                    <option value="zero">
                      Si 1 note existe: CC vide ⇒ 0 ; SN vide ⇒ 0
                    </option>
                    <option value="blank">Ne rien modifier</option>
                  </select>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>Repêchage (arrondi à 10)</label>
                  <div style={styles.rowInline}>
                    <input
                      type="checkbox"
                      checked={delib.rescueEnabled}
                      onChange={(e) =>
                        setDelib((d) => ({
                          ...d,
                          rescueEnabled: e.target.checked,
                        }))
                      }
                    />
                    <span style={styles.inlineText}>Activer si NF ≥</span>
                    <input
                      value={delib.rescueFrom}
                      onChange={(e) =>
                        setDelib((d) => ({ ...d, rescueFrom: e.target.value }))
                      }
                      style={styles.smallInput}
                      inputMode="decimal"
                    />
                    <span style={styles.inlineText}>et &lt; 10</span>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>
                    Remplissage manuel des notes manquantes
                  </label>

                  <div style={styles.rowInline}>
                    <input
                      type="checkbox"
                      checked={delib.manualFillEnabled}
                      onChange={(e) =>
                        setDelib((d) => ({
                          ...d,
                          manualFillEnabled: e.target.checked,
                        }))
                      }
                    />
                    <span style={styles.inlineText}>Activer</span>
                  </div>

                  {delib.manualFillEnabled && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "#6B7280",
                          marginBottom: 6,
                        }}
                      >
                        Appliqué seulement si une note existe déjà.
                      </div>

                      <div style={styles.rowInline}>
                        <span style={styles.inlineText}>CC manquant →</span>
                        <input
                          value={delib.manualCC}
                          onChange={(e) =>
                            setDelib((d) => ({ ...d, manualCC: e.target.value }))
                          }
                          style={styles.smallInput}
                          inputMode="decimal"
                        />
                      </div>

                      <div style={{ ...styles.rowInline, marginTop: 6 }}>
                        <span style={styles.inlineText}>SN manquant →</span>
                        <input
                          value={delib.manualSN}
                          onChange={(e) =>
                            setDelib((d) => ({ ...d, manualSN: e.target.value }))
                          }
                          style={styles.smallInput}
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>
                    <input
                      type="checkbox"
                      checked={showCoordinator}
                      onChange={(e) => setShowCoordinator(e.target.checked)}
                      style={{ marginRight: 6 }}
                    />
                    Ajouter la signature du Coordonnateur des Licences / Masters
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: ".78rem", color: "#6B7280" }}>
                {paperFormat === "A3"
                  ? "Le composant A3 est branché ci-contre."
                  : "Le composant A4 est branché ci-contre."}
              </div>
            </div>
          </div>

          <div style={styles.previewPanel}>
            {paperFormat === "A4" ? (
              <ProcesVerbalSheetA4
                matrix={matrix}
                loadingMatrix={loadingMatrix}
                academicYear={academicYear}
                semester={absoluteSemester}
                session={session}
                classFullName={classFullName}
                selectedClass={selectedClass}
                delib={delib}
                showCoordinator={showCoordinator}
                onClose={onClose}
              />
            ) : (
              <ProcesVerbalSheetA3
                matrix={matrix}
                loadingMatrix={loadingMatrix}
                academicYear={academicYear}
                semester={absoluteSemester}
                session={session}
                classFullName={classFullName}
                selectedClass={selectedClass}
                delib={delib}
                showCoordinator={showCoordinator}
                onClose={onClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2100,
  },
  modal: {
    width: "95vw",
    maxWidth: "1700px",
    maxHeight: "95vh",
    background: "#ffffff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 900 },
  modalSubtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: "1rem",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) 1fr",
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem 1.25rem",
    borderRight: "1px solid #E5E7EB",
    overflowY: "auto",
  },
  previewPanel: {
    padding: "1rem",
    background: "#F3F4F6",
    overflow: "auto",
  },
  filtersCol: { display: "flex", flexDirection: "column", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".78rem", fontWeight: 800, color: "#374151" },
  pillSelect: {
    height: 34,
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    padding: "0 0.8rem",
    fontSize: ".85rem",
    background: "#ffffff",
    outline: "none",
  },
  rowInline: { display: "flex", alignItems: "center", gap: 8 },
  inlineText: { fontSize: ".78rem", color: "#374151", fontWeight: 700 },
  smallInput: {
    width: 78,
    height: 30,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 10px",
    fontSize: ".85rem",
    outline: "none",
  },
};