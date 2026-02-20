// src/components/documents/ClassAbsencesReportSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, User, X, CheckCircle, Clock4, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const DEFAULT_YEAR = "2025-2026";

function safeStr(x) {
  return (x ?? "").toString();
}
function toISOFromInput(val) {
  return safeStr(val).trim();
}
function frDateLabel(dateISO) {
  try {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
      timeZone: "UTC",
    });
    return fmt.format(dt);
  } catch {
    return dateISO;
  }
}
function fmtHours(h) {
  const n = Number(h || 0);
  if (!Number.isFinite(n)) return "0h";
  if (n === 0) return "0h";
  if (Math.floor(n) === n) return `${n}h`;
  return `${n}h`;
}
function slugifyFilename(s) {
  return safeStr(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 80);
}
function frDateShort(iso) {
  // YYYY-MM-DD -> DD-MM-YYYY (pour filename)
  const p = safeStr(iso).split("-");
  if (p.length !== 3) return safeStr(iso);
  return `${p[2]}-${p[1]}-${p[0]}`;
}

export default function ClassAbsencesReportSheet({ onClose }) {
  const [activeTab, setActiveTab] = useState("class"); // "class" | "student"

  // filters
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classId, setClassId] = useState("");

  const [from, setFrom] = useState("2026-01-05");
  const [to, setTo] = useState("2026-01-09");
  const [onlyAbsents, setOnlyAbsents] = useState(true);

  // report data
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // list search
  const [q, setQ] = useState("");

  // student view
  const [selectedStudentKey, setSelectedStudentKey] = useState("");
  const selectedStudentRow = useMemo(() => {
    if (!report?.rows?.length || !selectedStudentKey) return null;
    return report.rows.find((r) => r.studentKey === selectedStudentKey) || null;
  }, [report, selectedStudentKey]);

  const studentDetails = useMemo(() => {
    if (!report?.detailsByStudent || !selectedStudentKey) return [];
    return report.detailsByStudent[selectedStudentKey] || [];
  }, [report, selectedStudentKey]);

  // ---- Load classes ----
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(`${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`);
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, [academicYear]);

  // ---- Auto load report when filters ok ----
  useEffect(() => {
    const canLoad = classId && academicYear && from && to;
    if (!canLoad) {
      setReport(null);
      setErrorMsg("");
      return;
    }
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, academicYear, from, to, onlyAbsents]);

  const loadReport = async () => {
    setLoadingReport(true);
    setErrorMsg("");
    try {
      const url =
        `${API_BASE}/absences/report?academicYear=${encodeURIComponent(academicYear)}` +
        `&classId=${encodeURIComponent(classId)}` +
        `&from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&onlyAbsents=${onlyAbsents ? "1" : "0"}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur serveur");

      const safe = {
        ...data,
        rows: Array.isArray(data?.rows) ? data.rows : [],
        detailsByStudent:
          data?.detailsByStudent && typeof data.detailsByStudent === "object"
            ? data.detailsByStudent
            : {},
      };

      setReport(safe);

      if (activeTab === "student" && selectedStudentKey) {
        const exists = (safe.rows || []).some((r) => r.studentKey === selectedStudentKey);
        if (!exists) {
          setSelectedStudentKey("");
          setActiveTab("class");
        }
      }
    } catch (e) {
      console.error(e);
      setReport(null);
      setErrorMsg(e.message || "Erreur");
    } finally {
      setLoadingReport(false);
    }
  };

  const filteredRows = useMemo(() => {
    const rows = report?.rows || [];
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const name = safeStr(r.fullName).toLowerCase();
      const mat = safeStr(r.matricule).toLowerCase();
      return name.includes(query) || mat.includes(query);
    });
  }, [report, q]);

  const classTitle = useMemo(() => {
    const c = classes.find((x) => x.id === classId);
    return c?.title || report?.class?.title || "";
  }, [classes, classId, report]);

  // totals for student view
  const studentTotals = useMemo(() => {
    const arr = studentDetails || [];
    let raw = 0;
    let just = 0;
    let net = 0;
    for (const it of arr) {
      raw += Number(it.hours || 0);
      just += Number(it.justifiedHours || 0);
      net += Number(it.netHours || 0);
    }
    return { raw, just, net };
  }, [studentDetails]);

  // ----- Justification UI state (per date) -----
  const [draftJustif, setDraftJustif] = useState({});
  useEffect(() => {
    const map = {};
    for (const it of studentDetails || []) {
      map[it.dateISO] = {
        hoursJustified: it.justifiedHours || 0,
        reason: it.reason || "",
        status: it.status || (it.justifiedHours > 0 ? "CONFIRMED" : ""),
      };
    }
    setDraftJustif(map);
  }, [selectedStudentKey, report]);

  const saveJustification = async (dateISO, maxHoursForThatDay) => {
    if (!selectedStudentRow) return;

    const d = draftJustif[dateISO] || { hoursJustified: 0, reason: "", status: "CONFIRMED" };
    const hj = Math.max(0, Number(d.hoursJustified || 0));
    const clamped = Math.min(hj, Number(maxHoursForThatDay || 0));

    setLoadingReport(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/absences/justify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          academicYear,
          studentKey: selectedStudentRow.studentKey,
          studentId: selectedStudentRow.studentId || null,
          dateISO,
          hoursJustified: clamped,
          reason: clamped <= 0 ? "" : safeStr(d.reason || ""),
          status: "CONFIRMED",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur serveur");

      if (clamped <= 0) {
        setDraftJustif((prev) => ({
          ...prev,
          [dateISO]: { hoursJustified: 0, reason: "", status: "" },
        }));
      }

      await loadReport();
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Erreur");
    } finally {
      setLoadingReport(false);
    }
  };

  // -------------------- PDF DOWNLOAD --------------------
  const paperRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const buildPdfFilename = () => {
    const basePeriod = `${frDateShort(from)}_au_${frDateShort(to)}`;
    if (activeTab === "student" && selectedStudentRow) {
      const stu = slugifyFilename(selectedStudentRow.fullName || "etudiant");
      return `fiche_absence_${stu}_${basePeriod}.pdf`;
    }
    const cls = slugifyFilename(classTitle || "classe");
    return `rapport_absences_${cls}_${basePeriod}.pdf`;
  };

  const downloadPdf = async () => {
    if (!paperRef.current) return;
    setExporting(true);
    setErrorMsg("");

    try {
      // On masque un peu les ombres pour rendu propre
      const el = paperRef.current;

      const canvas = await html2canvas(el, {
        scale: 2, // qualité
        useCORS: true, // pour logo / images
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Dimensions image dans pdf (en mm)
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Si tout tient sur une page
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(buildPdfFilename());
        return;
      }

      // Multi-pages
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 2) {
        pdf.addPage();
        position = - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(buildPdfFilename());
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Erreur export PDF");
    } finally {
      setExporting(false);
    }
  };

  // ---------- UI ----------
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Rapports d’absences</h2>
            <p style={styles.modalSubtitle}>
              Rapport Classe + Fiche Étudiant sur une période libre (1 jour → 1 an).
            </p>
          </div>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={{
                ...styles.downloadBtn,
                opacity:
                  exporting || loadingReport || !classId || !from || !to
                    ? 0.6
                    : 1,
                cursor:
                  exporting || loadingReport || !classId || !from || !to
                    ? "not-allowed"
                    : "pointer",
              }}
              onClick={downloadPdf}
              disabled={exporting || loadingReport || !classId || !from || !to}
              title={!classId ? "Choisis une classe pour générer un PDF" : ""}
            >
              <Download size={16} />
              {exporting ? "Export…" : "Télécharger PDF"}
            </button>

            <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div style={styles.body}>
          {/* Left filters */}
          <aside style={styles.leftPanel}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Année Académique</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setClassId("");
                  setReport(null);
                  setSelectedStudentKey("");
                  setActiveTab("class");
                }}
                style={styles.select}
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Classe *</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSelectedStudentKey("");
                  setActiveTab("class");
                }}
                style={styles.select}
              >
                <option value="">
                  {loadingClasses ? "Chargement..." : "-- Sélectionner une classe --"}
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.id}
                  </option>
                ))}
              </select>
              <p style={styles.smallHint}>Les noms sortent quand une classe est choisie (auto).</p>
            </div>

            <div style={styles.periodGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Du *</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(toISOFromInput(e.target.value))}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Au *</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(toISOFromInput(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={onlyAbsents}
                onChange={(e) => setOnlyAbsents(e.target.checked)}
              />
              <span>Uniquement les absents</span>
            </label>

            <div style={styles.statusBox}>
              {loadingReport ? (
                <span style={styles.statusText}>Chargement…</span>
              ) : errorMsg ? (
                <span style={{ ...styles.statusText, color: "#B91C1C" }}>{errorMsg}</span>
              ) : report?.ok ? (
                <span style={styles.statusText}>Rapport chargé.</span>
              ) : (
                <span style={styles.statusText}>Renseigne les champs (classe + dates).</span>
              )}
            </div>

            <div style={styles.pdfHint}>
              Astuce : Le bouton “Télécharger PDF” exporte exactement la fiche visible (rapport ou fiche étudiant).
            </div>
          </aside>

          {/* Right content */}
          <section style={styles.rightPanel}>
            {/* Tabs */}
            <div style={styles.tabsRow}>
              <button
                type="button"
                onClick={() => setActiveTab("class")}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "class" ? styles.tabActive : {}),
                }}
              >
                <Users size={16} />
                Rapport Classe
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("student")}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "student" ? styles.tabActive : {}),
                  opacity: selectedStudentKey ? 1 : 0.55,
                }}
                disabled={!selectedStudentKey}
                title={!selectedStudentKey ? "Clique 'Voir fiche' sur un étudiant" : ""}
              >
                <User size={16} />
                Fiche Étudiant
              </button>
            </div>

            {/* Document frame */}
            <div style={styles.paper} ref={paperRef}>
              {/* Header doc */}
              <div style={styles.paperHeader}>
                <div style={styles.logoBox}>
                  <img
                    src="/assets/ipmbtpe-logo.png"
                    alt="Logo"
                    style={{ width: 120, height: "auto" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.schoolName}>
                    Institut Polytechnique des Métiers du Bâtiment, <br />
                    des Travaux Publics et de l’Entrepreneuriat
                  </div>
                  <div style={styles.schoolMeta}>
                    Année Académique : <strong>{academicYear}</strong>
                  </div>
                </div>
                <div style={styles.reportChip}>
                  {activeTab === "class"
                    ? "RAPPORT GLOBAL DES ABSENCES"
                    : "FICHE INDIVIDUELLE D’ABSENCE"}
                  <div style={styles.generatedAt}>
                    Généré le : {new Intl.DateTimeFormat("fr-FR").format(new Date())}
                  </div>
                </div>
              </div>

              <div style={styles.hr} />

              {/* Meta row */}
              <div style={styles.metaRow}>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>CLASSE</div>
                  <div style={styles.metaValue}>{classTitle || "—"}</div>
                </div>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>PÉRIODE DU RAPPORT</div>
                  <div style={styles.metaValue}>
                    {from ? from.split("-").reverse().join("/") : "—"} au{" "}
                    {to ? to.split("-").reverse().join("/") : "—"}
                  </div>
                </div>
              </div>

              {/* Content */}
              {activeTab === "class" ? (
                <>
                  {/* Search row */}
                  <div style={styles.searchRow}>
                    <div style={styles.searchInputWrap}>
                      <span style={styles.searchIcon}>
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Rechercher un étudiant…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={styles.searchInput}
                      />
                    </div>
                    <div style={styles.resultCount}>
                      {filteredRows.length} résultat(s)
                    </div>
                  </div>

                  {/* Table */}
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.thN}>N°</th>
                          <th style={styles.thMat}>MATRICULE</th>
                          <th style={styles.thName}>NOM &amp; PRÉNOMS</th>
                          <th style={styles.thHours}>TOTAL HEURES (NET)</th>
                          <th style={styles.thDays}>JOURS IMPACTÉS</th>
                          <th style={styles.thAct}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!classId || loadingReport ? (
                          <tr>
                            <td style={styles.tdEmpty} colSpan={6}>
                              {loadingReport
                                ? "Chargement du rapport…"
                                : "Choisis une classe et des dates."}
                            </td>
                          </tr>
                        ) : !filteredRows.length ? (
                          <tr>
                            <td style={styles.tdEmpty} colSpan={6}>
                              Aucun résultat pour cette période.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((r) => (
                            <tr key={r.studentKey}>
                              <td style={styles.tdCenter}>{r.n}</td>
                              <td style={styles.tdMono}>{r.matricule || ""}</td>
                              <td style={styles.tdName}>
                                {safeStr(r.fullName).toUpperCase()}
                              </td>
                              <td style={styles.tdCenter}>
                                <div style={{ fontWeight: 800 }}>
                                  {fmtHours(r.totalHoursNet)}
                                </div>
                                {(r.totalHoursJustified || 0) > 0 && (
                                  <div style={styles.smallSub}>
                                    Justifié: {fmtHours(r.totalHoursJustified)}
                                  </div>
                                )}
                              </td>
                              <td style={styles.tdCenter}>
                                <div style={{ fontWeight: 800 }}>
                                  {r.daysImpactedNet} j
                                </div>
                                {(r.daysImpactedRaw || 0) !==
                                  (r.daysImpactedNet || 0) && (
                                  <div style={styles.smallSub}>
                                    Brut: {r.daysImpactedRaw} j
                                  </div>
                                )}
                              </td>
                              <td style={styles.tdCenter}>
                                <button
                                  type="button"
                                  style={styles.linkBtn}
                                  onClick={() => {
                                    setSelectedStudentKey(r.studentKey);
                                    setActiveTab("student");
                                  }}
                                >
                                  Voir fiche
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {!selectedStudentRow ? (
                    <div style={styles.emptyStudent}>
                      Sélectionne un étudiant depuis “Rapport Classe” → “Voir fiche”.
                    </div>
                  ) : (
                    <>
                      {/* Student header */}
                      <div style={styles.studentHeader}>
                        <div style={styles.avatarCircle}>
                          <User size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={styles.studentName}>
                            {safeStr(selectedStudentRow.fullName).toUpperCase()}
                          </div>
                          <div style={styles.studentMeta}>
                            Matricule :{" "}
                            <strong>{selectedStudentRow.matricule || "—"}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          style={styles.backBtn}
                          onClick={() => setActiveTab("class")}
                        >
                          ← Retour à la liste
                        </button>
                      </div>

                      {/* Totals */}
                      <div style={styles.totalsRow}>
                        <div style={styles.totalCard}>
                          <div style={styles.totalLabel}>TOTAL BRUT</div>
                          <div style={styles.totalValue}>
                            {fmtHours(studentTotals.raw)}
                          </div>
                        </div>
                        <div style={styles.totalCard}>
                          <div style={styles.totalLabel}>TOTAL JUSTIFIÉ</div>
                          <div style={styles.totalValue}>
                            {fmtHours(studentTotals.just)}
                          </div>
                        </div>
                        <div style={styles.totalCard}>
                          <div style={styles.totalLabel}>TOTAL NET</div>
                          <div style={styles.totalValue}>
                            {fmtHours(studentTotals.net)}
                          </div>
                        </div>
                      </div>

                      {/* Detail table */}
                      <div style={{ marginTop: 14 }}>
                        <div style={styles.sectionTitle}>
                          DÉTAIL CHRONOLOGIQUE DES ABSENCES
                        </div>

                        <div style={styles.tableWrap}>
                          <table style={styles.table2}>
                            <thead>
                              <tr>
                                <th style={styles.thDate}>DATE</th>
                                <th style={styles.thHours2}>HEURES</th>
                                <th style={styles.thJust}>JUSTIFIER (h)</th>
                                <th style={styles.thReason}>MOTIF / OBSERVATIONS</th>
                                <th style={styles.thStatus}>STATUT</th>
                                <th style={styles.thAct2}>ACTION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!studentDetails.length ? (
                                <tr>
                                  <td style={styles.tdEmpty} colSpan={6}>
                                    Aucun détail pour cet étudiant dans cette période.
                                  </td>
                                </tr>
                              ) : (
                                studentDetails.map((it) => {
                                  const d = draftJustif[it.dateISO] || {
                                    hoursJustified: it.justifiedHours || 0,
                                    reason: it.reason || "",
                                    status: it.status || "",
                                  };
                                  const maxH = Number(it.hours || 0);

                                  const confirmed =
                                    safeStr(it.status).toUpperCase() === "CONFIRMED" &&
                                    (it.justifiedHours || 0) > 0;

                                  return (
                                    <tr key={it.dateISO}>
                                      <td style={styles.tdDate}>
                                        {frDateLabel(it.dateISO)}
                                      </td>
                                      <td style={styles.tdCenter}>
                                        <div style={{ fontWeight: 800 }}>
                                          {fmtHours(it.hours)}
                                        </div>
                                        {(it.justifiedHours || 0) > 0 && (
                                          <div style={styles.smallSub}>
                                            Net: {fmtHours(it.netHours)}
                                          </div>
                                        )}
                                      </td>

                                      <td style={styles.tdCenter}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={maxH}
                                          step="0.5"
                                          value={Number(d.hoursJustified || 0)}
                                          onChange={(e) => {
                                            const v = Number(e.target.value || 0);
                                            setDraftJustif((prev) => ({
                                              ...prev,
                                              [it.dateISO]: { ...d, hoursJustified: v },
                                            }));
                                          }}
                                          style={styles.justInput}
                                        />
                                        <div style={styles.smallSub}>Max: {fmtHours(maxH)}</div>
                                      </td>

                                      <td style={styles.tdReason}>
                                        <textarea
                                          value={d.reason || ""}
                                          onChange={(e) =>
                                            setDraftJustif((prev) => ({
                                              ...prev,
                                              [it.dateISO]: { ...d, reason: e.target.value },
                                            }))
                                          }
                                          style={styles.textarea}
                                          placeholder="Ex: Maladie, retard transport..."
                                        />
                                      </td>

                                      <td style={styles.tdCenter}>
                                        {confirmed ? (
                                          <span style={styles.badgeOk}>
                                            <CheckCircle size={14} />
                                            Confirmé
                                          </span>
                                        ) : Number(d.hoursJustified || 0) > 0 ||
                                          (d.reason || "").trim() ? (
                                          <span style={styles.badgeWait}>
                                            <Clock4 size={14} />
                                            À confirmer
                                          </span>
                                        ) : (
                                          <span style={styles.badgeNone}>—</span>
                                        )}
                                      </td>

                                      <td style={styles.tdCenter}>
                                        <button
                                          type="button"
                                          style={styles.primaryMiniBtn}
                                          onClick={() => saveJustification(it.dateISO, maxH)}
                                          disabled={loadingReport}
                                        >
                                          Confirmer
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div style={styles.footerSignRow}>
                          <div style={styles.signBox}>Le Parent / Tuteur</div>
                          <div style={styles.signBox}>L’Administration</div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>

          <div style={styles.footerRight}>
            <div style={styles.footerHint}>
              {classId && from && to ? "Chargement automatique activé." : ""}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// -------------------- Styles --------------------
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
    width: "96vw",
    maxWidth: 1500,
    height: "92vh",
    background: "#fff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 18px 60px rgba(0,0,0,.18)",
  },
  modalHeader: {
    padding: "0.85rem 1.15rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#fff",
  },
  modalTitle: { margin: 0, fontSize: "1.05rem", fontWeight: 800 },
  modalSubtitle: { margin: 0, marginTop: 3, fontSize: ".82rem", color: "var(--ip-gray)" },

  headerActions: { display: "flex", alignItems: "center", gap: 10 },

  downloadBtn: {
    border: "1px solid #E5E7EB",
    background: "#fff",
    borderRadius: 999,
    padding: "0.55rem 0.95rem",
    fontSize: ".85rem",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  closeBtn: {
    border: "1px solid #E5E7EB",
    background: "#fff",
    width: 34,
    height: 34,
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "320px 1fr",
  },

  leftPanel: {
    borderRight: "1px solid #E5E7EB",
    padding: "1rem 1.1rem",
    background: "#fff",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  rightPanel: {
    background: "#F3F4F6",
    padding: "1rem",
    overflow: "auto",
  },

  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: ".8rem", fontWeight: 700, color: "#374151" },
  input: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 0.75rem",
    fontSize: ".9rem",
    outline: "none",
    background: "var(--bg-input)",
  },
  select: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 0.75rem",
    fontSize: ".9rem",
    outline: "none",
    background: "#fff",
  },
  periodGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  smallHint: { margin: 0, fontSize: ".76rem", color: "var(--ip-gray)" },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: ".85rem",
    color: "#111827",
    userSelect: "none",
    marginTop: 6,
  },

  statusBox: {
    border: "1px solid #E5E7EB",
    background: "#FAFAFA",
    borderRadius: 12,
    padding: "0.75rem",
    marginTop: 6,
  },
  statusText: { fontSize: ".82rem", color: "#374151" },

  pdfHint: {
    marginTop: 6,
    fontSize: ".78rem",
    color: "var(--ip-gray)",
    lineHeight: 1.35,
  },

  tabsRow: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  tabBtn: {
    border: "1px solid #E5E7EB",
    background: "#fff",
    borderRadius: 999,
    padding: "0.55rem 0.95rem",
    fontSize: ".85rem",
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#111827",
  },
  tabActive: {
    background: "var(--ip-teal)",
    borderColor: "var(--ip-teal)",
    color: "var(--on-color)",
  },

  paper: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    boxShadow: "0 6px 18px rgba(0,0,0,.06)",
    padding: "1.1rem 1.1rem 1.25rem",
    minHeight: 640,
  },

  paperHeader: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  logoBox: { width: 130, display: "flex", alignItems: "center" },
  schoolName: { fontSize: ".95rem", fontWeight: 900, lineHeight: 1.2 },
  schoolMeta: { marginTop: 6, fontSize: ".82rem", color: "#111827" },
  reportChip: {
    minWidth: 260,
    textAlign: "right",
    fontSize: ".8rem",
    fontWeight: 900,
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    padding: "0.6rem 0.85rem",
    borderRadius: 12,
  },
  generatedAt: { fontSize: ".74rem", marginTop: 4, color: "var(--ip-gray)", fontWeight: 600 },
  hr: { height: 1, background: "#111827", opacity: 0.2, margin: "0.9rem 0 1rem" },

  metaRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  metaCard: {
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
    borderRadius: 12,
    padding: "0.75rem 0.9rem",
  },
  metaLabel: { fontSize: ".72rem", fontWeight: 900, color: "var(--ip-gray)" },
  metaValue: { marginTop: 4, fontSize: "1.02rem", fontWeight: 900, color: "#111827" },

  searchRow: { display: "flex", alignItems: "center", gap: 12, margin: "0.35rem 0 0.75rem" },
  searchInputWrap: { position: "relative", flex: 1 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ip-gray)" },
  searchInput: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    padding: "0 1rem 0 38px",
    fontSize: ".9rem",
    outline: "none",
    background: "var(--bg-input)",
  },
  resultCount: { fontSize: ".82rem", color: "var(--ip-gray)", fontWeight: 700 },

  tableWrap: { borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" },
  table: { width: "100%", borderCollapse: "collapse" },
  thN: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "left", width: 55 },
  thMat: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "left", width: 140 },
  thName: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "left" },
  thHours: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "center", width: 170 },
  thDays: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "center", width: 160 },
  thAct: { background: "#0F172A", color: "#fff", padding: "10px 10px", fontSize: ".75rem", textAlign: "center", width: 130 },

  tdCenter: { borderTop: "1px solid #EEF2F7", padding: "10px 10px", textAlign: "center", fontSize: ".86rem" },
  tdName: { borderTop: "1px solid #EEF2F7", padding: "10px 10px", textAlign: "left", fontSize: ".86rem", fontWeight: 800 },
  tdMono: { borderTop: "1px solid #EEF2F7", padding: "10px 10px", textAlign: "left", fontSize: ".84rem", fontFamily: '"Courier New", monospace' },
  tdEmpty: { padding: 16, textAlign: "center", fontSize: ".86rem", color: "var(--ip-gray)" },

  linkBtn: {
    border: "none",
    background: "transparent",
    color: "var(--ip-teal)",
    fontWeight: 900,
    cursor: "pointer",
  },
  smallSub: { fontSize: ".72rem", color: "var(--ip-gray)", marginTop: 3, fontWeight: 700 },

  emptyStudent: {
    padding: "1rem",
    border: "1px dashed #D1D5DB",
    borderRadius: 12,
    color: "var(--ip-gray)",
    fontSize: ".9rem",
  },
  studentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0.55rem 0.65rem",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ip-gray)",
  },
  studentName: { fontSize: "1.05rem", fontWeight: 1000, color: "#111827" },
  studentMeta: { marginTop: 3, fontSize: ".82rem", color: "var(--ip-gray)", fontWeight: 700 },
  backBtn: {
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    padding: "0.45rem 0.85rem",
    fontSize: ".82rem",
    fontWeight: 900,
    cursor: "pointer",
  },

  totalsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 },
  totalCard: {
    border: "1px solid #E5E7EB",
    background: "#fff",
    borderRadius: 12,
    padding: "0.65rem 0.8rem",
  },
  totalLabel: { fontSize: ".72rem", color: "var(--ip-gray)", fontWeight: 900 },
  totalValue: { marginTop: 4, fontSize: "1.05rem", fontWeight: 1000 },

  sectionTitle: {
    fontSize: ".78rem",
    fontWeight: 1000,
    letterSpacing: ".08em",
    color: "var(--ip-gray)",
    marginBottom: 8,
    marginTop: 6,
  },

  table2: { width: "100%", borderCollapse: "collapse" },
  thDate: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "left", borderBottom: "1px solid #E5E7EB" },
  thHours2: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "center", borderBottom: "1px solid #E5E7EB", width: 110 },
  thJust: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "center", borderBottom: "1px solid #E5E7EB", width: 130 },
  thReason: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "left", borderBottom: "1px solid #E5E7EB" },
  thStatus: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "center", borderBottom: "1px solid #E5E7EB", width: 130 },
  thAct2: { background: "#F3F4F6", padding: 10, fontSize: ".75rem", textAlign: "center", borderBottom: "1px solid #E5E7EB", width: 120 },

  tdDate: { borderTop: "1px solid #EEF2F7", padding: 10, fontSize: ".86rem", fontWeight: 800 },
  tdReason: { borderTop: "1px solid #EEF2F7", padding: 10, verticalAlign: "top" },

  justInput: {
    width: 80,
    height: 34,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 10px",
    fontSize: ".9rem",
    outline: "none",
    background: "var(--bg-input)",
    textAlign: "center",
    fontWeight: 900,
  },
  textarea: {
    width: "100%",
    minHeight: 60,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "8px 10px",
    fontSize: ".86rem",
    outline: "none",
    resize: "vertical",
    background: "var(--bg-input)",
  },

  badgeOk: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0.28rem 0.55rem",
    borderRadius: 999,
    border: "1px solid rgba(5,150,105,.35)",
    background: "rgba(5,150,105,.10)",
    color: "#065F46",
    fontSize: ".78rem",
    fontWeight: 900,
  },
  badgeWait: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0.28rem 0.55rem",
    borderRadius: 999,
    border: "1px solid rgba(245,158,11,.35)",
    background: "rgba(245,158,11,.12)",
    color: "#92400E",
    fontSize: ".78rem",
    fontWeight: 900,
  },
  badgeNone: { color: "var(--ip-gray)", fontWeight: 800 },

  primaryMiniBtn: {
    borderRadius: 999,
    border: "none",
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    padding: "0.45rem 0.85rem",
    fontSize: ".82rem",
    fontWeight: 1000,
    cursor: "pointer",
  },

  footerSignRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 22,
  },
  signBox: {
    flex: 1,
    textAlign: "center",
    fontWeight: 900,
    borderTop: "1px solid #111827",
    paddingTop: 10,
  },

  footer: {
    padding: "0.85rem 1.15rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#fff",
    padding: "0.5rem 1.05rem",
    fontSize: ".88rem",
    cursor: "pointer",
    fontWeight: 900,
  },
  footerRight: { display: "flex", alignItems: "center", gap: 10 },
  footerHint: { fontSize: ".8rem", color: "var(--ip-gray)", fontWeight: 700 },
};
