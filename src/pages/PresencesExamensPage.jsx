// src/pages/PresencesExamensPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Printer, Download, ChevronDown, ChevronUp } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

/* ─────────────────────────── utils ─────────────────────────── */
const cleanStr = (x) => (x ?? "").toString().trim();

function normalizeAcademicYear(y) {
  return cleanStr(y)
    .replace(/[–—]/g, "-")
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s*-\s*/g, "-");
}

function normalizeMode(sessionType) {
  return sessionType === "rattrapage" ? "retake" : "main";
}

async function asyncPool(limit, items, worker) {
  const ret = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    ret.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

/* ─────────────────────────── PDF helpers ─────────────────────────── */
function getSchoolHeaderHTML() {
  return `
    <div class="school-header">
      <div class="school-header-row">
        <div class="school-logo">
          <img src="/assets/ipmbtpe-logo.png" alt="IPMBTPE" />
        </div>
        <div class="school-text">
          <div class="school-name">Institut Polytechnique des Métiers du Bâtiment,<br/>des Travaux Publics et de l'Entrepreneuriat</div>
          <div class="school-subtitle"><strong><em>Autorisation d'ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025</em></strong></div>
          <div class="school-contact">BP : 16398 Mfou / Tél : (+237) 696 79 58 05 - 672 83 80 94 · www.ipmbtpe.cm · ipmbtpe@gmail.com</div>
        </div>
      </div>
      <div class="school-underline"></div>
    </div>
  `;
}

function buildPDFHtml({ cls, filteredStudents, byStudent, viewMode, semester, examType, sessionType, subjects }) {
  const sessionLabel = sessionType === "rattrapage" ? "RATTRAPAGE" : "PRINCIPALE";
  const viewLabel = viewMode === "composed" ? "Ont composé" : "N'ont pas composé";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const rows = filteredStudents.map(({ st, sid, info }, idx) => {
    const fullName = cleanStr(
      st?.fullName || `${cleanStr(st?.lastName)} ${cleanStr(st?.firstName)}`.trim()
    ).toUpperCase();
    const matricule = cleanStr(st?.matricule) || "—";

    const missingList = (info?.missing || []).map((m) => m.label);

    if (viewMode === "composed") {
      return `
        <tr>
          <td class="col-n">${idx + 1}</td>
          <td class="col-mat">${matricule}</td>
          <td class="col-name">${fullName}</td>
        </tr>
      `;
    } else {
      // "N'ont pas composé" → on montre les matières manquantes dans une 2ème ligne
      return `
        <tr>
          <td class="col-n">${idx + 1}</td>
          <td class="col-mat">${matricule}</td>
          <td class="col-name">
            <div class="st-name">${fullName}</div>
            ${
              missingList.length > 0
                ? `<div class="missing-subjects">${missingList.map((m) => `<span class="ms-pill">${m}</span>`).join("")}</div>`
                : `<div class="all-ok">Toutes les matières composées</div>`
            }
          </td>
        </tr>
      `;
    }
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Liste présence - ${cls.title}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; font-size: 12px; margin: 0; padding: 0; background: #fff; }

    .school-header { margin-bottom: 10px; }
    .school-header-row { display: flex; align-items: flex-start; gap: 12px; }
    .school-logo img { width: 100px; height: auto; }
    .school-text { flex: 1; text-align: center; }
    .school-name { font-size: 15px; font-weight: 700; line-height: 1.25; margin-bottom: 3px; }
    .school-subtitle { font-size: 10px; font-style: italic; margin-bottom: 2px; }
    .school-contact { font-size: 10px; }
    .school-underline { border-bottom: 3px solid #00b89c; margin: 6px 0 8px 0; }

    .doc-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .doc-title { font-size: 14px; font-weight: 700; margin: 0; }
    .doc-sub { font-size: 11px; color: #555; margin: 2px 0 0; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      border: 1px solid #ccc;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 700;
      color: #374151;
    }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    th { font-weight: 700; text-align: center; background: #f5f5f5; }
    .col-n { width: 32px; text-align: center; }
    .col-mat { width: 120px; text-align: center; font-family: "Courier New", monospace; font-size: 10.5px; }
    .col-name { text-align: left; }

    .st-name { font-weight: 600; }
    .missing-subjects { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ms-pill {
      border: 1px solid #f87171;
      border-radius: 6px;
      background: #fef2f2;
      color: #991b1b;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 600;
    }
    .all-ok { font-size: 10px; color: #6b7280; margin-top: 3px; font-style: italic; }

    .footer { margin-top: 18px; font-size: 10px; color: #6b7280; text-align: right; }
  </style>
</head>
<body>
  ${getSchoolHeaderHTML()}

  <div class="doc-meta">
    <div>
      <p class="doc-title">Liste de présence — ${viewLabel}</p>
      <p class="doc-sub">Classe : ${cls.title || cls.id} &nbsp;·&nbsp; Effectif filtré : ${filteredStudents.length} étudiant(s)</p>
    </div>
    <div class="chips">
      <span class="chip">Semestre : ${semester}</span>
      <span class="chip">Examen : ${examType}</span>
      <span class="chip">Session : ${sessionLabel}</span>
      <span class="chip">Matières : ${subjects.length}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-n">N°</th>
        <th class="col-mat">Matricule</th>
        <th class="col-name">
          Nom &amp; Prénoms
          ${viewMode === "missing" ? " / Matières non composées" : ""}
        </th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("")}
    </tbody>
  </table>

  <div class="footer">Édité le ${dateStr} · IPMBTPE</div>

  <script>
    window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };
  </script>
</body>
</html>
  `;
}

function openPDFWindow(html) {
  const w = window.open("", "_blank");
  if (!w) { alert("Popup bloquée. Autorise les popups pour exporter en PDF."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ─────────────────────────── composant ClassSection ─────────────────────────── */
function ClassSection({ cls, byStudent, viewMode, semester, examType, sessionType, subjects, isLoading }) {
  const [collapsed, setCollapsed] = useState(false);

  const filteredStudents = useMemo(() => {
    const out = [];
    for (const st of cls.students || []) {
      const sid = cleanStr(st?.id);
      if (!sid) continue;
      const info = byStudent[sid] || { composed: [], missing: [] };
      const hasComposed = info.composed.length > 0;
      const hasMissing = info.missing.length > 0;
      if (viewMode === "composed" && hasComposed) out.push({ st, sid, info });
      if (viewMode === "missing" && hasMissing) out.push({ st, sid, info });
    }
    return out;
  }, [cls.students, byStudent, viewMode]);

  const handleExportPDF = () => {
    const html = buildPDFHtml({ cls, filteredStudents, byStudent, viewMode, semester, examType, sessionType, subjects });
    openPDFWindow(html);
  };

  const sessionLabel = sessionType === "rattrapage" ? "RATTRAPAGE" : "PRINCIPALE";

  return (
    <div style={sx.classSection}>
      {/* ── En-tête de classe ── */}
      <div style={sx.classSectionHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={sx.classTitleText}>{cls.title || cls.id}</span>
            <span style={sx.effectifBadge}>{(cls.students || []).length} étudiants</span>
          </div>
          <div style={sx.classMeta}>
            {semester} · {examType} · Session {sessionLabel}
            {" · "}
            <span style={{ fontWeight: 700, color: viewMode === "missing" ? "#991B1B" : "#065F46" }}>
              {viewMode === "missing" ? "N'ont pas composé" : "Ont composé"}
              {!isLoading && ` : ${filteredStudents.length}`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={sx.btnPDF} onClick={handleExportPDF} disabled={isLoading || filteredStudents.length === 0}>
            <Printer size={15} />
            <span>PDF / Imprimer</span>
          </button>
          <button style={sx.btnCollapse} onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* ── Corps ── */}
      {!collapsed && (
        <div style={sx.classSectionBody}>
          {isLoading ? (
            <p style={sx.statusMsg}>Calcul en cours…</p>
          ) : filteredStudents.length === 0 ? (
            <p style={sx.statusMsg}>Aucun étudiant dans ce filtre pour cette classe.</p>
          ) : (
            <table style={sx.table}>
              <thead>
                <tr>
                  <th style={{ ...sx.th, width: 36, textAlign: "center" }}>N°</th>
                  <th style={{ ...sx.th, width: 130 }}>Matricule</th>
                  <th style={sx.th}>Nom &amp; Prénoms</th>
                  {viewMode === "missing" && (
                    <th style={{ ...sx.th, width: 320 }}>Matières non composées</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(({ st, sid, info }, idx) => {
                  const fullName = cleanStr(
                    st?.fullName || `${cleanStr(st?.lastName)} ${cleanStr(st?.firstName)}`.trim()
                  ).toUpperCase();
                  const matricule = cleanStr(st?.matricule) || "—";
                  const missingList = info?.missing || [];

                  return (
                    <tr key={sid} style={idx % 2 === 1 ? sx.trOdd : {}}>
                      <td style={{ ...sx.td, textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ ...sx.td, fontFamily: "monospace", fontSize: ".82rem" }}>{matricule}</td>
                      <td style={sx.td}>{fullName}</td>
                      {viewMode === "missing" && (
                        <td style={sx.td}>
                          {missingList.length === 0 ? (
                            <span style={{ color: "#6B7280", fontSize: ".8rem" }}>—</span>
                          ) : (
                            <div style={sx.pillsWrap}>
                              {missingList.map((m) => (
                                <span key={m.id} style={sx.missingPill}>{m.label}</span>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Page principale ─────────────────────────── */
export default function PresencesExamensPage({ currentSection = "liste_presence", onNavigate }) {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [classes, setClasses] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState("all"); // "all" ou classId
  const [semester, setSemester] = useState("S1");
  const [examType, setExamType] = useState("CC");
  const [sessionType, setSessionType] = useState("main");
  const [viewMode, setViewMode] = useState("missing");

  const [subjects, setSubjects] = useState([]);
  const [examCtx, setExamCtx] = useState(null);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // map classId -> map studentId -> { composed, missing }
  const [matrixByClass, setMatrixByClass] = useState({});

  const mode = normalizeMode(sessionType);

  /* ── 1. Charger toutes les classes ── */
  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      setErrorMsg("");
      setMatrixByClass({});
      try {
        const ay = normalizeAcademicYear(academicYear);
        const res = await fetch(`${API_BASE}/classes?year=${encodeURIComponent(ay)}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.classes) ? data.classes : [];
        setClasses(list);
      } catch (e) {
        setClasses([]);
        setErrorMsg(e?.message || "Erreur chargement classes");
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, [academicYear]);

  /* ── 2. Charger les matières (on prend la 1ère classe comme référence, ou on merge) ── */
  useEffect(() => {
    const load = async () => {
      setLoadingSubjects(true);
      setSubjects([]);
      setExamCtx(null);
      setMatrixByClass({});
      setErrorMsg("");

      // On prend les matières de la première classe (même programme pour toutes)
      const refClass = classes[0];
      if (!refClass) { setLoadingSubjects(false); return; }

      try {
        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", refClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", "SESSION PRINCIPALE");

        const res = await fetch(`${API_BASE}/evaluations/subjects?${qs.toString()}`);
        const data = await res.json();
        const all = Array.isArray(data?.subjects) ? data.subjects : [];

        const uniq = [];
        const seen = new Set();
        for (const s of all) {
          const label = cleanStr(s?.label || s?.name || "");
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push({
            ...s,
            id: s.subjectId || s.id,
            label,
            isAnonymous: !!s.isAnonymous,
            subjectCode: cleanStr(s.subjectCode || s.ecueCode || s.code || ""),
          });
        }
        uniq.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        setSubjects(uniq);
      } catch (e) {
        setSubjects([]);
        setErrorMsg(e?.message || "Erreur chargement matières");
      } finally {
        setLoadingSubjects(false);
      }
    };
    load();
  }, [classes, academicYear, semester, examType]);

  /* ── 3. examCtx si matières anonymes ── */
  const hasAnonymousSubjects = useMemo(() => subjects.some((s) => !!s.isAnonymous), [subjects]);

  useEffect(() => {
    const run = async () => {
      setExamCtx(null);
      if (!hasAnonymousSubjects || classes.length === 0) return;
      const refClass = classes[0];
      try {
        const qs = new URLSearchParams();
        qs.set("academicYear", normalizeAcademicYear(academicYear));
        qs.set("classId", refClass.id);
        qs.set("semester", semester);
        qs.set("examType", examType);
        qs.set("sessionName", "SESSION PRINCIPALE");
        const res = await fetch(`${API_BASE}/evaluation-session-anonymats/context?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur context anonymat");
        setExamCtx(data);
      } catch (e) {
        setExamCtx(null);
      }
    };
    run();
  }, [classes, academicYear, semester, examType, hasAnonymousSubjects]);

  /* ── 4. Construire la matrice pour TOUTES les classes ── */
  useEffect(() => {
    const run = async () => {
      setMatrixByClass({});
      setErrorMsg("");

      if (classes.length === 0 || subjects.length === 0) return;
      if (hasAnonymousSubjects && !examCtx?.examId) return;

      setLoadingMatrix(true);

      try {
        // Pour chaque classe, pour chaque matière → fetch sheet
        // On parallélise par classe (limit 2 classes en même temps)
        // et par matière (limit 4 par classe)

        const buildMatrixForClass = async (cls) => {
          const students = Array.isArray(cls.students) ? cls.students : [];
          const init = {};
          for (const st of students) {
            const sid = cleanStr(st?.id);
            if (sid) init[sid] = { composed: [], missing: [] };
          }

          const worker = async (subj) => {
            const subjectId = cleanStr(subj.id);
            const subjectCode = cleanStr(subj.subjectCode) || subjectId;
            if (!subjectId || !subjectCode) return null;

            const qs = new URLSearchParams();
            qs.set("academicYear", normalizeAcademicYear(academicYear));
            qs.set("classId", cls.id);
            qs.set("semester", semester);
            qs.set("examType", examType);
            qs.set("sessionName", "SESSION PRINCIPALE");
            qs.set("subjectId", subjectId);
            qs.set("subjectCode", subjectCode);
            qs.set("subjectLabel", cleanStr(subj.label) || "");
            qs.set("mode", mode);
            if (subj.isAnonymous) qs.set("examId", examCtx?.examId || "");

            try {
              const res = await fetch(`${API_BASE}/presences-examens/sheet?${qs.toString()}`);
              const data = await res.json();
              if (!res.ok) return null;
              const composedIds = new Set(
                (data?.composed || []).map((x) => cleanStr(x.studentId)).filter(Boolean)
              );
              return { subjectId, subjectLabel: subj.label, composedIds };
            } catch {
              return null;
            }
          };

          const results = await asyncPool(4, subjects, worker);

          for (const r of results) {
            if (!r) continue;
            for (const sid of Object.keys(init)) {
              if (r.composedIds.has(sid)) {
                init[sid].composed.push({ id: r.subjectId, label: r.subjectLabel });
              } else {
                init[sid].missing.push({ id: r.subjectId, label: r.subjectLabel });
              }
            }
          }

          return { classId: cls.id, matrix: init };
        };

        // On traite 2 classes en parallèle max
        const classResults = await asyncPool(2, classes, buildMatrixForClass);

        const newMatrix = {};
        for (const r of classResults) {
          if (r) newMatrix[r.classId] = r.matrix;
        }
        setMatrixByClass(newMatrix);
      } catch (e) {
        setErrorMsg(e?.message || "Erreur calcul présences");
      } finally {
        setLoadingMatrix(false);
      }
    };

    run();
  }, [classes, subjects, academicYear, semester, examType, sessionType, mode, hasAnonymousSubjects, examCtx?.examId]);

  const isCalculating = loadingClasses || loadingSubjects || loadingMatrix;

  // Classes affichées selon le filtre sélecteur
  const displayedClasses = useMemo(() => {
    if (selectedClassFilter === "all") return classes;
    return classes.filter((c) => c.id === selectedClassFilter);
  }, [classes, selectedClassFilter]);

  /* ── Export PDF global (classes affichées) ── */
  const handleExportAllPDF = () => {
    if (displayedClasses.length === 0) return;

    const allSections = displayedClasses.map((cls) => {
      const byStudent = matrixByClass[cls.id] || {};
      const filteredStudents = (cls.students || [])
        .map((st) => {
          const sid = cleanStr(st?.id);
          if (!sid) return null;
          const info = byStudent[sid] || { composed: [], missing: [] };
          const hasComposed = info.composed.length > 0;
          const hasMissing = info.missing.length > 0;
          if (viewMode === "composed" && !hasComposed) return null;
          if (viewMode === "missing" && !hasMissing) return null;
          return { st, sid, info };
        })
        .filter(Boolean);

      return buildPDFHtml({ cls, filteredStudents, byStudent, viewMode, semester, examType, sessionType, subjects });
    });

    // On assemble toutes les sections en un seul document avec page-break
    const combined = allSections.map((html) => {
      // Extraire le contenu du body pour chaque classe
      const match = html.match(/<body>([\s\S]*?)<\/body>/);
      return match ? match[1] : html;
    }).join('<div style="page-break-before: always;"></div>');

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Liste présences — Toutes les classes</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; font-size: 12px; margin: 0; padding: 0; }
    .school-header { margin-bottom: 10px; }
    .school-header-row { display: flex; align-items: flex-start; gap: 12px; }
    .school-logo img { width: 100px; height: auto; }
    .school-text { flex: 1; text-align: center; }
    .school-name { font-size: 15px; font-weight: 700; line-height: 1.25; margin-bottom: 3px; }
    .school-subtitle { font-size: 10px; font-style: italic; margin-bottom: 2px; }
    .school-contact { font-size: 10px; }
    .school-underline { border-bottom: 3px solid #00b89c; margin: 6px 0 8px 0; }
    .doc-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .doc-title { font-size: 14px; font-weight: 700; margin: 0; }
    .doc-sub { font-size: 11px; color: #555; margin: 2px 0 0; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border: 1px solid #ccc; border-radius: 999px; padding: 3px 10px; font-size: 10px; font-weight: 700; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    th { font-weight: 700; text-align: center; background: #f5f5f5; }
    .col-n { width: 32px; text-align: center; }
    .col-mat { width: 120px; text-align: center; font-family: "Courier New", monospace; font-size: 10.5px; }
    .col-name { text-align: left; }
    .st-name { font-weight: 600; }
    .missing-subjects { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ms-pill { border: 1px solid #f87171; border-radius: 6px; background: #fef2f2; color: #991b1b; padding: 2px 7px; font-size: 10px; font-weight: 600; }
    .all-ok { font-size: 10px; color: #6b7280; margin-top: 3px; font-style: italic; }
    .footer { margin-top: 18px; font-size: 10px; color: #6b7280; text-align: right; }
  </style>
</head>
<body>
  ${combined}
  <script>
    window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };
  </script>
</body>
</html>
    `;

    openPDFWindow(fullHtml);
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

            {/* ── Titre + filtres ── */}
            <section style={sx.filtersCard}>
              <div style={sx.filtersTop}>
                <div>
                  <h1 style={sx.pageTitle}>Liste de présence — Examens</h1>
                  <p style={sx.pageSubtitle}>
                    Sélectionne les paramètres pour afficher les listes par classe.
                  </p>
                </div>

                <button
                  style={{
                    ...sx.btnPDF,
                    opacity: isCalculating || displayedClasses.length === 0 ? 0.5 : 1,
                  }}
                  onClick={handleExportAllPDF}
                  disabled={isCalculating || displayedClasses.length === 0}
                >
                  <Download size={15} />
                  <span>PDF — Toutes les classes</span>
                </button>
              </div>

              <div style={sx.filtersRow}>
                <Field label="Année académique">
                  <input
                    style={sx.inputPill}
                    value={academicYear}
                    onChange={(e) => {
                      setAcademicYear(e.target.value);
                      setMatrixByClass({});
                    }}
                  />
                </Field>

                <Field label="Semestre">
                  <select
                    style={sx.inputPill}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </Field>

                <Field label="Type d'examen">
                  <select
                    style={sx.inputPill}
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                  >
                    <option value="CC">CC</option>
                    <option value="SN">SN</option>
                    <option value="EXAMEN">EXAMEN</option>
                  </select>
                </Field>

                <Field label="Session">
                  <select
                    style={sx.inputPill}
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                  >
                    <option value="main">Principale</option>
                    <option value="rattrapage">Rattrapage</option>
                  </select>
                </Field>

                <Field label="Afficher">
                  <select
                    style={{
                      ...sx.inputPill,
                      color: viewMode === "missing" ? "#991B1B" : "#065F46",
                      fontWeight: 700,
                    }}
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                  >
                    <option value="missing">N'ont pas composé</option>
                    <option value="composed">Ont composé</option>
                  </select>
                </Field>

                <Field label="Classe">
                  <select
                    style={sx.inputPill}
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    disabled={loadingClasses || classes.length === 0}
                  >
                    <option value="all">— Toutes les classes ({classes.length}) —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || c.abbrev || c.displayName || c.id}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Barre de statut */}
              {isCalculating && (
                <div style={sx.statusBar}>
                  <span style={sx.statusDot} />
                  {loadingClasses
                    ? "Chargement des classes…"
                    : loadingSubjects
                    ? "Chargement des matières…"
                    : "Calcul de la matrice de présences (toutes les classes)…"}
                </div>
              )}

              {errorMsg && (
                <div style={sx.errorBar}>{errorMsg}</div>
              )}

              {!isCalculating && !errorMsg && subjects.length > 0 && (
                <div style={sx.infoBar}>
                  {classes.length} classe(s) · {subjects.length} matière(s) chargée(s)
                </div>
              )}
            </section>

            {/* ── Une section par classe ── */}
            {!loadingClasses && displayedClasses.length === 0 && (
              <p style={sx.emptyMsg}>Aucune classe trouvée pour cette année académique.</p>
            )}

            {displayedClasses.map((cls) => (
              <ClassSection
                key={cls.id}
                cls={cls}
                byStudent={matrixByClass[cls.id] || {}}
                viewMode={viewMode}
                semester={semester}
                examType={examType}
                sessionType={sessionType}
                subjects={subjects}
                isLoading={isCalculating}
              />
            ))}

          </div>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────── Field ─────────────────────────── */
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: ".73rem", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */
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
    padding: "0 1.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },

  /* Filtres */
  filtersCard: {
    background: "var(--bg, #fff)",
    borderRadius: 16,
    border: "1px solid var(--border, #E5E7EB)",
    padding: "1rem 1.25rem",
    boxShadow: "0 4px 16px rgba(17,24,39,.05)",
  },
  filtersTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  pageTitle: { margin: 0, fontSize: "1.05rem", fontWeight: 900 },
  pageSubtitle: { margin: "4px 0 0", fontSize: ".83rem", color: "#6B7280" },
  filtersRow: { display: "flex", gap: ".75rem", flexWrap: "wrap" },
  inputPill: {
    height: 38,
    borderRadius: 999,
    border: "1px solid var(--border, #E5E7EB)",
    padding: "0 0.9rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #f9fafb)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },

  statusBar: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: ".82rem",
    color: "#374151",
    fontWeight: 600,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#F59E0B",
    flexShrink: 0,
    animation: "pulse 1.2s infinite",
  },
  errorBar: {
    marginTop: 10,
    color: "#B91C1C",
    fontWeight: 700,
    fontSize: ".85rem",
  },
  infoBar: {
    marginTop: 10,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  emptyMsg: { color: "#6B7280", fontSize: ".9rem" },

  /* Boutons */
  btnPDF: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: "#00b89c",
    color: "#fff",
    fontSize: ".83rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  btnCollapse: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid var(--border, #E5E7EB)",
    background: "var(--bg-input, #f9fafb)",
    cursor: "pointer",
    flexShrink: 0,
  },

  /* Section par classe */
  classSection: {
    background: "var(--bg, #fff)",
    borderRadius: 16,
    border: "1px solid var(--border, #E5E7EB)",
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(17,24,39,.04)",
  },
  classSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0.9rem 1.25rem",
    borderBottom: "1px solid var(--border, #E5E7EB)",
    background: "#FAFAFA",
    flexWrap: "wrap",
  },
  classTitleText: {
    fontWeight: 900,
    fontSize: "1rem",
    color: "#111827",
  },
  effectifBadge: {
    fontSize: ".75rem",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    color: "#374151",
  },
  classMeta: {
    fontSize: ".8rem",
    color: "#6B7280",
    marginTop: 2,
  },
  classSectionBody: {
    padding: "0.75rem 1.25rem 1rem",
    overflowX: "auto",
  },
  statusMsg: { margin: 0, color: "#6B7280", fontSize: ".85rem" },

  /* Table */
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".88rem", marginTop: 4 },
  th: {
    padding: "9px 12px",
    borderBottom: "2px solid #E5E7EB",
    textAlign: "left",
    fontWeight: 800,
    fontSize: ".75rem",
    color: "#6B7280",
    background: "#FAFAFA",
    whiteSpace: "nowrap",
  },
  td: { padding: "9px 12px", borderBottom: "1px solid #F3F4F6" },
  trOdd: { background: "#FAFBFC" },

  /* Pills matières manquantes */
  pillsWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
  missingPill: {
    fontSize: ".75rem",
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 8,
    border: "1px solid #FCA5A5",
    background: "#FEF2F2",
    color: "#991B1B",
  },
};