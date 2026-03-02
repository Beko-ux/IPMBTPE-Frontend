// src/components/documents/ProcesVerbalPersonnalSheet.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// logo public (optionnel)
const LOGO_PUBLIC_PATH = "/logo-ipmbtpe.png";

// helpers
const cleanStr = (x) => (x ?? "").toString().trim();

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

async function toDataUrlFromPublicPath(path) {
  try {
    const absoluteUrl = new URL(path, window.location.origin).href;
    const res = await fetch(absoluteUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Logo fetch failed: HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmt2(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return (Math.round(n * 100) / 100).toString();
}

/**
 * ✅ Délibération (appliquée à l’affichage + PDF)
 * missingPolicy:
 *  - "zero": CC/SN manquant => 0
 *  - "blank": si CC ou SN manque => NF vide
 *  - "mirror": si CC manque mais SN existe => CC=SN (et inversement)
 *
 * rescueEnabled/rescueFrom:
 *  - si NF >= rescueFrom et NF < 10 => NF = 10
 */
function applyDeliberation({ cc, sn }, delib) {
  const CC = toNumberOrNull(cc);
  const SN = toNumberOrNull(sn);

  let ccAdj = CC;
  let snAdj = SN;

  const flags = [];

  // 1) notes manquantes
  if (delib?.missingPolicy === "blank") {
    if (ccAdj === null || snAdj === null) {
      if (ccAdj === null && snAdj !== null) flags.push("CC_MANQUANT");
      if (snAdj === null && ccAdj !== null) flags.push("SN_MANQUANT");
      if (ccAdj === null && snAdj === null) flags.push("CC_SN_MANQUANTS");
      return { cc: ccAdj, sn: snAdj, nf: null, flags };
    }
  }

  if (delib?.missingPolicy === "zero") {
    if (ccAdj === null && snAdj !== null) flags.push("CC_MANQUANT→0");
    if (snAdj === null && ccAdj !== null) flags.push("SN_MANQUANT→0");
    ccAdj = ccAdj === null ? 0 : ccAdj;
    snAdj = snAdj === null ? 0 : snAdj;
  }

  if (delib?.missingPolicy === "mirror") {
    if (ccAdj === null && snAdj !== null) {
      ccAdj = snAdj;
      flags.push("CC=SN");
    }
    if (snAdj === null && ccAdj !== null) {
      snAdj = ccAdj;
      flags.push("SN=CC");
    }
    if (ccAdj === null && snAdj === null) {
      flags.push("CC_SN_MANQUANTS");
      return { cc: null, sn: null, nf: null, flags };
    }
  }

  // 2) NF standard
  let nfAdj = 0.3 * (ccAdj ?? 0) + 0.7 * (snAdj ?? 0);

  // 3) repêchage
  if (delib?.rescueEnabled) {
    const from = Number(delib.rescueFrom ?? 7);
    if (Number.isFinite(from) && nfAdj >= from && nfAdj < 10) {
      nfAdj = 10;
      flags.push(`RATTRAPAGE(${from}→10)`);
    }
  }

  return { cc: ccAdj, sn: snAdj, nf: nfAdj, flags };
}

// UI constants
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const DEFAULT_YEAR = "2025-2026";
const SEMESTERS = ["S1", "S2"];
const SESSIONS = ["Principale", "Rattrapage"];

export default function ProcesVerbalPersonnalSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [session, setSession] = useState("Principale");

  const [matrix, setMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [busy, setBusy] = useState(false);

  // ✅ Délibération (visible + appliquée au PDF)
  const [delib, setDelib] = useState({
    missingPolicy: "mirror", // ← par défaut: "note définie" si un seul existe
    rescueEnabled: false,
    rescueFrom: 7,
  });

  // ---------- Load classes ----------
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

  const classFullName = selectedClass?.title || selectedClass?.abbrev || selectedClass?.id || "";

  // ---------- Load matrix ----------
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

  // students sorted
  const sortedStudents = useMemo(() => {
    const st = Array.isArray(matrix?.students) ? matrix.students : [];
    return [...st].sort((a, b) => {
      const A = `${cleanStr(a.lastName).toUpperCase()} ${cleanStr(a.firstName)}`.trim();
      const B = `${cleanStr(b.lastName).toUpperCase()} ${cleanStr(b.firstName)}`.trim();
      if (A < B) return -1;
      if (A > B) return 1;
      return cleanStr(a.matricule).localeCompare(cleanStr(b.matricule));
    });
  }, [matrix]);

  const values = matrix?.values || {};
  const subjects = Array.isArray(matrix?.subjects) ? matrix.subjects : [];

  // ✅ GROUP: 1 module = 1 page
  const modulePages = useMemo(() => {
    const map = new Map();

    for (const s of subjects) {
      const ecueCode = cleanStr(s?.code);
      if (!ecueCode) continue;

      const mCode = cleanStr(s?.moduleCode);
      const mLabel = cleanStr(s?.moduleLabel);

      const key = mCode ? `M__${mCode}` : `NOMOD__${ecueCode}`;
      if (!map.has(key)) {
        map.set(key, { moduleCode: mCode || "", moduleLabel: mLabel || "", ecues: [] });
      }
      map.get(key).ecues.push({
        code: ecueCode,
        label: cleanStr(s?.label || ""),
        moduleCode: mCode || "",
        moduleLabel: mLabel || "",
      });
    }

    for (const k of map.keys()) {
      const bucket = map.get(k);
      bucket.ecues.sort((a, b) => a.code.localeCompare(b.code));
      map.set(k, bucket);
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const aHas = !!a.moduleCode;
      const bHas = !!b.moduleCode;
      if (aHas !== bHas) return aHas ? -1 : 1; // modules first
      if (aHas && bHas) return a.moduleCode.localeCompare(b.moduleCode);
      return (a.ecues[0]?.code || "").localeCompare(b.ecues[0]?.code || "");
    });

    return arr;
  }, [subjects]);

  const totalPages = modulePages.length;

  // ✅ recalc notesCount AFTER deliberation (plus juste)
  const notesCountAfterDelib = useMemo(() => {
    let count = 0;
    for (const stu of sortedStudents) {
      const sid = cleanStr(stu.id);
      if (!sid) continue;
      const byStudent = values?.[sid] || {};
      for (const s of subjects) {
        const code = cleanStr(s?.code);
        if (!code) continue;
        const cell = byStudent?.[code] || {};
        const d = applyDeliberation({ cc: cell?.cc ?? null, sn: cell?.sn ?? null }, delib);
        if (d.nf !== null) count += 1;
      }
    }
    return count;
  }, [sortedStudents, values, subjects, delib]);

  const getStudentName = (stu) => {
    const last = cleanStr(stu?.lastName || "").toUpperCase();
    const first = cleanStr(stu?.firstName || "");
    return cleanStr(`${last} ${first}`).toUpperCase();
  };

  const buildCell = (sid, ecueCode) => {
    const byStudent = values?.[sid] || {};
    const cell = byStudent?.[ecueCode] || null;
    const cc = cell?.cc ?? null;
    const sn = cell?.sn ?? null;
    return applyDeliberation({ cc, sn }, delib);
  };

  const deliberationText = useMemo(() => {
    const a =
      delib.missingPolicy === "zero"
        ? "CC/SN manquant ⇒ 0"
        : delib.missingPolicy === "blank"
        ? "CC/SN manquant ⇒ NF vide"
        : "CC manquant ⇒ CC=SN ; SN manquant ⇒ SN=CC";

    const b = delib.rescueEnabled
      ? ` ; Repêchage: NF ≥ ${delib.rescueFrom} et < 10 ⇒ 10`
      : "";

    return `${a}${b}`;
  }, [delib]);

  const handleGeneratePdf = async () => {
    if (busy) return;
    if (!selectedClass) return alert("Veuillez d'abord choisir une classe.");

    setBusy(true);
    try {
      const logoDataUrl = await toDataUrlFromPublicPath(LOGO_PUBLIC_PATH);

      const html = generateProcesVerbalPDFHTML({
        logoDataUrl,
        academicYear,
        semester,
        session,
        classTitle: classFullName,
        deliberationText,
        delib,
        students: sortedStudents,
        pages: modulePages,
        values,
      });

      const w = window.open("", "_blank");
      if (!w) {
        alert("Popup bloquée. Autorisez les popups pour générer le PDF.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Procès-verbal (classe) — A4 paysage</h2>
            <p style={styles.modalSubtitle}>
              PDF : <b>1 module/UE par page</b> (CC / SN / NF). Le PDF sera identique à l’aperçu.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          {/* LEFT */}
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
                  <option value="">{loadingClasses ? "Chargement..." : "— Choisir —"}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title || cls.abbrev || cls.id}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Semestre</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} style={styles.pillSelect}>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Session</label>
                <select value={session} onChange={(e) => setSession(e.target.value)} style={styles.pillSelect}>
                  {SESSIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ DELIBERATION CONTROLS */}
              <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px dashed #D1D5DB" }}>
                <div style={{ fontSize: ".78rem", fontWeight: 900, color: "#111827", marginBottom: 6 }}>
                  Délibération
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Notes manquantes</label>
                  <select
                    value={delib.missingPolicy}
                    onChange={(e) => setDelib((d) => ({ ...d, missingPolicy: e.target.value }))}
                    style={styles.pillSelect}
                  >
                    <option value="mirror">CC manquant ⇒ CC=SN ; SN manquant ⇒ SN=CC</option>
                    <option value="zero">CC/SN manquant ⇒ 0</option>
                    <option value="blank">CC/SN manquant ⇒ NF vide</option>
                  </select>
                </div>

                <div style={{ ...styles.fieldGroup, marginTop: 6 }}>
                  <label style={styles.label}>Repêchage</label>

                  <div style={styles.rowInline}>
                    <input
                      type="checkbox"
                      checked={delib.rescueEnabled}
                      onChange={(e) => setDelib((d) => ({ ...d, rescueEnabled: e.target.checked }))}
                    />
                    <span style={styles.inlineText}>Activer: NF ≥</span>
                    <input
                      value={delib.rescueFrom}
                      onChange={(e) => setDelib((d) => ({ ...d, rescueFrom: e.target.value }))}
                      style={styles.smallInput}
                      disabled={!delib.rescueEnabled}
                      inputMode="decimal"
                    />
                    <span style={styles.inlineText}>et &lt; 10 ⇒ 10</span>
                  </div>
                </div>

                <div style={styles.delibPreview}>
                  <b>Règles actives :</b> {deliberationText}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {!selectedClass ? (
                <p style={styles.smallHint}>Choisis une classe pour voir l’aperçu.</p>
              ) : loadingMatrix ? (
                <p style={styles.smallHint}>Chargement du PV…</p>
              ) : totalPages === 0 ? (
                <p style={styles.smallHint}>Aucune matière/ECUE trouvée pour cette classe.</p>
              ) : (
                <>
                  <p style={styles.smallHint}>
                    Modules/pages : <strong>{totalPages}</strong>
                  </p>
                  <p style={styles.smallHint}>
                    Notes (après délibération) : <strong>{notesCountAfterDelib}</strong> — Étudiants :{" "}
                    <strong>{sortedStudents.length}</strong>
                  </p>
                </>
              )}

              {selectedClass && !loadingMatrix && !matrix && (
                <p style={{ ...styles.smallHint, color: "crimson" }}>
                  Impossible de charger le PV. Vérifie l’endpoint <b>/proces-verbal/matrix</b>.
                </p>
              )}
            </div>

            <div style={{ marginTop: 14, fontSize: ".78rem", color: "#6B7280" }}>
              Formule de base : <b>NF = 30% CC + 70% SN</b> (délibération appliquée si activée)
            </div>
          </div>

          {/* RIGHT PREVIEW (scroll) */}
          <div style={styles.previewPanel}>
            <div style={styles.previewWrapper}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {totalPages === 0 ? (
                  <div style={previewStyles.emptyBox}>Aucune matière/ECUE trouvée pour cette classe.</div>
                ) : (
                  modulePages.map((p, idx) => (
                    <div key={`${p.moduleCode || "NOMOD"}-${idx}`} style={previewStyles.page}>
                      <NotesHeader />

                      <div style={previewStyles.metaRow}>
                        <div>
                          <b>Année :</b> {academicYear}
                        </div>
                        <div>
                          <b>Classe :</b> {classFullName}
                        </div>
                        <div>
                          <b>Semestre :</b> {semester}
                        </div>
                        <div>
                          <b>Session :</b> {session}
                        </div>

                        {/* ✅ Délibération visible (comme demandé) */}
                        <div style={{ flexBasis: "100%" }}>
                          <b>Délibération :</b> {deliberationText}
                        </div>

                        <div>
                          <b>NF :</b> 30% CC + 70% SN
                        </div>
                      </div>

                      <div style={previewStyles.titleRow}>
                        Procès Verbal ({classFullName || "CLASSE"}) —{" "}
                        <span style={{ fontWeight: 900 }}>
                          {p.moduleCode ? `${p.moduleCode} : ${p.moduleLabel || p.moduleCode}` : "ECUE sans UE"}
                        </span>
                      </div>

                      <div style={previewStyles.tableWrap}>
                        <table style={previewStyles.table}>
                          <thead>
                            <tr>
                              <th style={previewStyles.thNum} rowSpan={3}></th>
                              <th style={previewStyles.thMat} rowSpan={3}>
                                Matricule
                              </th>
                              <th style={previewStyles.thName} rowSpan={3}>
                                Noms et Prénoms
                              </th>

                              <th style={previewStyles.thModule} colSpan={Math.max(1, p.ecues.length) * 3}>
                                {p.moduleCode ? (p.moduleLabel || p.moduleCode) : "ECUE sans UE"}
                              </th>
                            </tr>

                            <tr>
                              {p.ecues.length === 0 ? (
                                <th style={previewStyles.thEcue} colSpan={3}>
                                  —
                                </th>
                              ) : (
                                p.ecues.map((e) => (
                                  <th
                                    key={e.code}
                                    style={previewStyles.thEcue}
                                    colSpan={3}
                                    title={e.label || e.code}
                                  >
                                    {e.code}
                                  </th>
                                ))
                              )}
                            </tr>

                            <tr>
                              {p.ecues.length === 0 ? (
                                <>
                                  <th style={previewStyles.thMini}>CC</th>
                                  <th style={previewStyles.thMini}>SN</th>
                                  <th style={previewStyles.thMini}>NF</th>
                                </>
                              ) : (
                                p.ecues.map((e) => <FragmentMini key={`${e.code}-mini`} />)
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {sortedStudents.length === 0 ? (
                              <tr>
                                <td colSpan={3 + Math.max(1, p.ecues.length) * 3} style={previewStyles.tdEmpty}>
                                  Aucun étudiant dans cette classe.
                                </td>
                              </tr>
                            ) : (
                              sortedStudents.map((stu, sidx) => {
                                const sid = cleanStr(stu.id || "");
                                return (
                                  <tr key={sid || sidx}>
                                    <td style={previewStyles.tdCenter}>{sidx + 1}</td>
                                    <td style={previewStyles.tdMono}>{stu.matricule || ""}</td>
                                    <td style={previewStyles.tdNameCell}>{getStudentName(stu)}</td>

                                    {p.ecues.length === 0 ? (
                                      <>
                                        <td style={previewStyles.tdNote}></td>
                                        <td style={previewStyles.tdNote}></td>
                                        <td style={previewStyles.tdNote}></td>
                                      </>
                                    ) : (
                                      p.ecues.map((e) => {
                                        const c = buildCell(sid, e.code);

                                        const flagText = Array.isArray(c.flags) && c.flags.length ? c.flags.join(", ") : "";

                                        // ✅ petit marquage visuel quand délibération a touché
                                        const nfStyle =
                                          flagText && c.nf !== null
                                            ? { ...previewStyles.tdNote, ...previewStyles.tdNoteTouched }
                                            : previewStyles.tdNote;

                                        return (
                                          <Fragment key={`${sid}-${e.code}`}>
                                            <td style={previewStyles.tdNote} title={flagText}>
                                              {fmt2(c.cc)}
                                            </td>
                                            <td style={previewStyles.tdNote} title={flagText}>
                                              {fmt2(c.sn)}
                                            </td>
                                            <td style={nfStyle} title={flagText}>
                                              {fmt2(c.nf)}
                                            </td>
                                          </Fragment>
                                        );
                                      })
                                    )}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* ✅ LEGENDES (beau + clair) */}
                      <div style={previewStyles.legendRow}>
                        <div style={previewStyles.legendBox}>
                          <div style={previewStyles.legendTitle}>Légendes</div>
                          <div style={previewStyles.legendLine}>
                            <span style={previewStyles.pill}>CC</span> Contrôle Continu
                          </div>
                          <div style={previewStyles.legendLine}>
                            <span style={previewStyles.pill}>SN</span> Session Normale
                          </div>
                          <div style={previewStyles.legendLine}>
                            <span style={previewStyles.pill}>NF</span> Note Finale (après délibération si activée)
                          </div>
                          <div style={previewStyles.legendLine}>
                            <span style={previewStyles.pillTouched}>NF*</span> NF ajustée par délibération (survoler la cellule)
                          </div>
                        </div>

                        <div style={previewStyles.signBox}>
                          <div style={previewStyles.signLabel}>Nom, date et signature du DAAC :</div>
                          <div style={previewStyles.signLine}></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <footer style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>

          <button
            type="button"
            style={{
              ...styles.primaryBtn,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
            onClick={handleGeneratePdf}
            disabled={busy}
          >
            {busy ? "Ouverture..." : "Générer en PDF"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// tiny helper component
function FragmentMini() {
  return (
    <>
      <th style={previewStyles.thMini}>CC</th>
      <th style={previewStyles.thMini}>SN</th>
      <th style={previewStyles.thMini}>NF</th>
    </>
  );
}

/* ---------- styles modale ---------- */
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
  modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
  closeBtn: { border: "none", background: "transparent", fontSize: "1rem", cursor: "pointer" },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(320px, 380px) 1fr",
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem 1.25rem",
    borderRight: "1px solid #E5E7EB",
    overflowY: "auto",
  },
  previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
  previewWrapper: { display: "flex", justifyContent: "center" },
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
  rowInline: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  inlineText: { fontSize: ".85rem", color: "#111827" },
  smallInput: {
    width: 70,
    height: 32,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 10px",
    outline: "none",
    background: "#fff",
  },
  delibPreview: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
    fontSize: ".78rem",
    color: "#111827",
    lineHeight: 1.3,
  },
  smallHint: { margin: 0, marginTop: 6, fontSize: ".78rem", color: "#6B7280" },
  footer: {
    padding: "0.75rem 1.25rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#2563EB",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 900,
  },
};

/* ---------- styles preview A4 paysage ---------- */
const previewStyles = {
  page: {
    width: "1123px",
    minHeight: "794px",
    background: "#ffffff",
    boxShadow: "0 1px 0 1px rgba(0,0,0,.85)",
    borderRadius: 8,
    overflow: "hidden",
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    display: "flex",
    flexDirection: "column",
    fontSize: "9.5px",
    paddingBottom: 10,
  },
  emptyBox: {
    width: "1123px",
    padding: 16,
    border: "1px dashed #CBD5E1",
    borderRadius: 12,
    background: "#fff",
    color: "#64748B",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    padding: "6px 10px 0 10px",
    justifyContent: "space-between",
    fontSize: "9.5px",
  },
  titleRow: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: "12px",
    marginTop: 8,
    marginBottom: 6,
    textDecoration: "underline",
  },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },

  thNum: { border: "1px solid #000", padding: "2px 3px", width: 26, textAlign: "center" },
  thMat: { border: "1px solid #000", padding: "2px 3px", width: 130, textAlign: "center" },
  thName: { border: "1px solid #000", padding: "2px 4px", width: 320, textAlign: "left" },

  thModule: {
    border: "1px solid #000",
    padding: "2px 4px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: "10px",
    background: "#F8FAFC",
  },

  thEcue: {
    border: "1px solid #000",
    padding: "2px 4px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: "9.5px",
    whiteSpace: "nowrap",
  },

  thMini: {
    border: "1px solid #000",
    padding: "2px 0",
    textAlign: "center",
    width: 34,
    fontSize: "9px",
    fontWeight: 900,
  },

  tdCenter: { border: "1px solid #000", padding: "2px 3px", textAlign: "center", verticalAlign: "middle" },
  tdMono: {
    border: "1px solid #000",
    padding: "2px 3px",
    fontFamily: '"Courier New", monospace',
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.2px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdNameCell: { border: "1px solid #000", padding: "2px 4px", verticalAlign: "middle" },

  tdNote: {
    border: "1px solid #000",
    padding: "0 2px",
    height: 18,
    textAlign: "center",
    verticalAlign: "middle",
    fontVariantNumeric: "tabular-nums",
    fontSize: "9.5px",
  },

  // ✅ NF ajustée (délibération) => un petit fond discret
  tdNoteTouched: {
    background: "#FFF7ED", // léger
    fontWeight: 900,
  },

  tdEmpty: {
    border: "1px solid #000",
    padding: "10px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },

  legendRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "0 10px 10px 10px",
    alignItems: "end",
  },
  legendBox: {
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#F9FAFB",
  },
  legendTitle: { fontWeight: 900, marginBottom: 6, fontSize: "10px" },
  legendLine: { display: "flex", gap: 8, alignItems: "center", marginTop: 3 },
  pill: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#fff",
    fontWeight: 900,
    minWidth: 30,
    textAlign: "center",
  },
  pillTouched: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: 999,
    border: "1px solid #F59E0B",
    background: "#FFF7ED",
    fontWeight: 900,
    minWidth: 30,
    textAlign: "center",
  },
  signBox: {
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
  },
  signLabel: { fontWeight: 800, marginBottom: 8 },
  signLine: { borderBottom: "1px dashed #9CA3AF", height: 18 },
};

/* ---------- PDF HTML (A4 paysage) ---------- */
function generateProcesVerbalPDFHTML({
  logoDataUrl,
  academicYear,
  semester,
  session,
  classTitle,
  deliberationText,
  delib,
  students,
  pages,
  values,
}) {
  const safeYear = academicYear || "—";
  const safeClass = classTitle || "—";
  const safeSemester = semester || "—";
  const safeSession = session || "—";
  const safeDelib = deliberationText || "—";

  const vals = values || {};

  const HEADER_TITLE_1 = "Institut Polytechnique des Métiers du Bâtiment,";
  const HEADER_TITLE_2 = "des Travaux Publics et de l’Entrepreneuriat";
  const HEADER_SUB =
    "Autorisation d’ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025";

  const clean = (x) => (x ?? "").toString().trim();
  const esc = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const numOrNull = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return (Math.round(n * 100) / 100).toString();
  };

  // ✅ appliquer la même délibération dans le PDF
  const applyDelibPDF = ({ cc, sn }) => {
    const CC = numOrNull(cc);
    const SN = numOrNull(sn);

    let ccAdj = CC;
    let snAdj = SN;
    const flags = [];

    if (delib?.missingPolicy === "blank") {
      if (ccAdj === null || snAdj === null) return { cc: ccAdj, sn: snAdj, nf: null, touched: true, flags };
    }

    if (delib?.missingPolicy === "zero") {
      if (ccAdj === null && snAdj !== null) flags.push("CC→0");
      if (snAdj === null && ccAdj !== null) flags.push("SN→0");
      ccAdj = ccAdj === null ? 0 : ccAdj;
      snAdj = snAdj === null ? 0 : snAdj;
    }

    if (delib?.missingPolicy === "mirror") {
      if (ccAdj === null && snAdj !== null) {
        ccAdj = snAdj;
        flags.push("CC=SN");
      }
      if (snAdj === null && ccAdj !== null) {
        snAdj = ccAdj;
        flags.push("SN=CC");
      }
      if (ccAdj === null && snAdj === null) return { cc: null, sn: null, nf: null, touched: true, flags };
    }

    let nfAdj = 0.3 * (ccAdj ?? 0) + 0.7 * (snAdj ?? 0);
    let touched = flags.length > 0;

    if (delib?.rescueEnabled) {
      const from = Number(delib.rescueFrom ?? 7);
      if (Number.isFinite(from) && nfAdj >= from && nfAdj < 10) {
        nfAdj = 10;
        touched = true;
        flags.push(`RATTRAPAGE(${from}→10)`);
      }
    }

    return { cc: ccAdj, sn: snAdj, nf: nfAdj, touched, flags };
  };

  const buildHeaderHTML = () => `
    <div class="doc-header">
      <div class="doc-header__left">
        ${
          logoDataUrl
            ? `<img class="doc-header__logo" src="${esc(logoDataUrl)}" alt="Logo" />`
            : `<div class="doc-header__logo-fallback"></div>`
        }
      </div>
      <div class="doc-header__center">
        <div class="doc-header__title">${esc(HEADER_TITLE_1)}</div>
        <div class="doc-header__title">${esc(HEADER_TITLE_2)}</div>
        <div class="doc-header__sub">${esc(HEADER_SUB)}</div>
      </div>
      <div class="doc-header__right"></div>
    </div>
  `;

  const buildRowsHTML = (ecues) => {
    if (!students || !students.length) {
      return `
        <tr><td colspan="${3 + Math.max(1, ecues.length) * 3}" class="td-empty">Aucun étudiant.</td></tr>
      `;
    }

    return students
      .map((s, idx) => {
        const sid = clean(s?.id || "");
        const last = clean(s?.lastName || "").toUpperCase();
        const first = clean(s?.firstName || "");
        const full = clean(`${last} ${first}`).toUpperCase();
        const matricule = clean(s?.matricule || "");
        const byStudent = sid ? vals[sid] || {} : {};

        const cells = (ecues.length ? ecues : [{ code: "" }])
          .map((e) => {
            const code = clean(e.code);
            const cell = code ? byStudent[code] || {} : {};
            const cc0 = cell?.cc ?? null;
            const sn0 = cell?.sn ?? null;

            const d = applyDelibPDF({ cc: cc0, sn: sn0 });

            const touchedClass = d.touched && d.nf !== null ? "td-note td-note--touched" : "td-note";
            const title = d.flags?.length ? esc(d.flags.join(", ")) : "";

            return `
              <td class="td-note" title="${title}">${esc(fmt(d.cc))}</td>
              <td class="td-note" title="${title}">${esc(fmt(d.sn))}</td>
              <td class="${touchedClass}" title="${title}">${esc(fmt(d.nf))}</td>
            `;
          })
          .join("");

        return `
          <tr>
            <td class="td-center">${idx + 1}</td>
            <td class="td-mono">${esc(matricule)}</td>
            <td class="td-left">${esc(full)}</td>
            ${cells}
          </tr>
        `;
      })
      .join("");
  };

  const buildLegendHTML = () => `
    <div class="legend-wrap">
      <div class="legend">
        <div class="legend__title">Légendes</div>
        <div class="legend__line"><span class="pill">CC</span> Contrôle Continu</div>
        <div class="legend__line"><span class="pill">SN</span> Session Normale</div>
        <div class="legend__line"><span class="pill">NF</span> Note Finale (après délibération si activée)</div>
        <div class="legend__line"><span class="pill pill--touched">NF*</span> NF ajustée par délibération (survoler la cellule)</div>
      </div>

      <div class="sign">
        <div class="sign__label">Nom, date et signature du DAAC :</div>
        <div class="sign__line"></div>
      </div>
    </div>
  `;

  const pagesHTML = (Array.isArray(pages) ? pages : [])
    .map((p) => {
      const ecues = Array.isArray(p?.ecues) ? p.ecues : [];
      const moduleTitle = p?.moduleCode
        ? `${clean(p.moduleCode)} : ${clean(p.moduleLabel) || clean(p.moduleCode)}`
        : "ECUE sans UE";

      const ecueRow2 = (ecues.length ? ecues : [{ code: "—", label: "" }])
        .map((e) => `<th class="th-ecue" colspan="3" title="${esc(e.label || e.code)}">${esc(e.code)}</th>`)
        .join("");

      const ecueRow3 = (ecues.length ? ecues : [{ code: "—" }])
        .map(
          () => `
          <th class="th-mini">CC</th>
          <th class="th-mini">SN</th>
          <th class="th-mini">NF</th>
        `
        )
        .join("");

      const bodyRowsHTML = buildRowsHTML(ecues);

      return `
        <div class="page">
          ${buildHeaderHTML()}

          <div class="meta">
            <span><b>Année :</b> ${esc(safeYear)}</span>
            <span><b>Classe :</b> ${esc(safeClass)}</span>
            <span><b>Semestre :</b> ${esc(safeSemester)}</span>
            <span><b>Session :</b> ${esc(safeSession)}</span>
            <span class="meta__full"><b>Délibération :</b> ${esc(safeDelib)}</span>
            <span><b>NF :</b> 30% CC + 70% SN</span>
          </div>

          <div class="title">Procès Verbal (${esc(safeClass)}) — ${esc(moduleTitle)}</div>

          <table>
            <thead>
              <tr>
                <th class="th-num" rowspan="3"></th>
                <th class="th-mat" rowspan="3">Matricule</th>
                <th class="th-name" rowspan="3">Noms et prénoms</th>
                <th class="th-module" colspan="${Math.max(1, ecues.length) * 3}">${esc(
        p?.moduleCode ? (p?.moduleLabel || p?.moduleCode) : "ECUE sans UE"
      )}</th>
              </tr>
              <tr>${ecueRow2}</tr>
              <tr>${ecueRow3}</tr>
            </thead>
            <tbody>${bodyRowsHTML}</tbody>
          </table>

          ${buildLegendHTML()}
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proces-Verbal</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 9.5px; }

    .page { width: 297mm; min-height: 210mm; page-break-after: always; }

    .doc-header{
      display:grid;
      grid-template-columns: 22mm 1fr 22mm;
      align-items:center;
      gap: 6mm;
      padding-top: 2mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #000;
      margin-bottom: 3mm;
    }
    .doc-header__logo{ width: 18mm; height: 18mm; object-fit: contain; display:block; }
    .doc-header__logo-fallback{ width:18mm; height:18mm; }
    .doc-header__center{ text-align:center; line-height: 1.2; }
    .doc-header__title{ font-weight: 900; font-size: 11px; }
    .doc-header__sub{ margin-top: 2px; font-size: 9px; font-weight: 600; }

    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 2mm; }
    .meta span b { font-weight: 900; }
    .meta__full { flex-basis: 100%; }

    .title { text-align: center; font-weight: 900; font-size: 12px; margin: 6px 0 6px; text-decoration: underline; }

    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000; height: 20px; }
    th { padding: 3px; text-align: center; }
    td { padding: 0 3px; text-align: center; vertical-align: middle; font-variant-numeric: tabular-nums; }

    .th-num { width: 26px; }
    .th-mat { width: 32mm; }
    .th-name { width: 85mm; text-align: left; padding-left: 6px; }

    .th-module { font-weight: 900; background: #F8FAFC; }
    .th-ecue { font-weight: 900; white-space: nowrap; }
    .th-mini { width: 11mm; font-weight: 900; font-size: 9px; }

    .td-mono { font-family: "Courier New", monospace; font-size: 10px; font-weight: 900; letter-spacing: .2px; }
    .td-left { text-align: left; padding-left: 6px; }
    .td-center { text-align: center; }
    .td-empty { text-align: center; font-style: italic; color: #666; padding: 12px; }

    .td-note--touched { background: #FFF7ED; font-weight: 900; }

    /* ✅ Legend + signature */
    .legend-wrap{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .legend{
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 8px 10px;
      background: #F9FAFB;
    }
    .legend__title{ font-weight: 900; margin-bottom: 6px; font-size: 10px; }
    .legend__line{ display:flex; gap: 8px; align-items:center; margin-top: 3px; }

    .pill{
      display:inline-block;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid #D1D5DB;
      background: #fff;
      font-weight: 900;
      min-width: 30px;
      text-align:center;
    }
    .pill--touched{
      border-color: #F59E0B;
      background: #FFF7ED;
    }

    .sign{
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 8px 10px;
      background:#fff;
    }
    .sign__label{ font-weight: 800; margin-bottom: 8px; }
    .sign__line{ border-bottom: 1px dashed #9CA3AF; height: 18px; }
  </style>
</head>
<body>
  ${pagesHTML}

  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 700);
    };
  </script>
</body>
</html>`;
}