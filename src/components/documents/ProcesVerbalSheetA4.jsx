// src/components/documents/ProcesVerbalSheetA4.jsx
import React, { useMemo, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";
import {
  cleanStr,
  toNumberOrNull,
  computeNF,
  fmtNote,
  fmtCredit,
  applyDeliberation,
  reduceNameUpper,
  inferSubjectsFromValues,
  buildModuleGroups,
  groupColSpan,
  paginateByMaxCols,
  splitStudentsIntoRowPages,
  toDataUrlFromPublicPath,
  computeStudentSummary,
} from "./procesVerbalShared.js";

const LOGO_PUBLIC_PATH = "/logo-ipmbtpe.png";

const MAX_COLS_DEFAULT = 38;
const MAX_ROWS = 22;
const NAME_MAX_PARTS = 4;

function paginateA4({ modules, noMod, modulesPerPage, maxCols }) {
  return paginateByMaxCols({ modules, noMod, modulesPerPage, maxCols });
}

function isLastColPage(page, columnPages) {
  return page.colPageIndex === columnPages.length - 1;
}

function buildSheetLegend(page) {
  const byModule = new Map();
  const noModEcues = [];

  for (const g of page?.groups || []) {
    for (const e of g.ecues || []) {
      const code = cleanStr(e.code);
      const label = cleanStr(e.label);
      if (!code || !label) continue;

      const mc = cleanStr(g.moduleCode || "");
      const ml = cleanStr(g.moduleLabel || "");
      const credits = Number(e.credits ?? 0) || 0;

      if (mc) {
        if (!byModule.has(mc)) byModule.set(mc, { moduleCode: mc, moduleLabel: ml, ecues: [] });
        const existing = byModule.get(mc);
        if (!existing.ecues.find((x) => x.code === code)) {
          existing.ecues.push({ code, label, credits });
        }
      } else {
        if (!noModEcues.find((x) => x.code === code)) {
          noModEcues.push({ code, label, credits });
        }
      }
    }
  }

  const modules = Array.from(byModule.values()).sort((a, b) =>
    a.moduleCode.localeCompare(b.moduleCode)
  );
  modules.forEach((m) => m.ecues.sort((a, b) => a.code.localeCompare(b.code)));
  noModEcues.sort((a, b) => a.code.localeCompare(b.code));

  return { modules, noModEcues };
}

export default function ProcesVerbalSheetA4({
  matrix,
  loadingMatrix,
  academicYear,
  semester,
  session,
  classFullName,
  selectedClass,
  delib,
  signatoryType = "DAAC",
}) {
  const [busy, setBusy] = useState(false);
  const [modulesPerPage, setModulesPerPage] = useState(3);
  const [maxCols, setMaxCols] = useState(MAX_COLS_DEFAULT);

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

  const valuesRaw = matrix?.values || {};

  const subjectsRaw = useMemo(() => {
    const hasAnyNote = (code) =>
      Object.values(valuesRaw).some((byStudent) => {
        const cell = byStudent?.[code];
        return cell != null && (cell.cc != null || cell.sn != null);
      });

    const fromApi = Array.isArray(matrix?.subjects) ? matrix.subjects : [];
    if (fromApi.length > 0) {
      return fromApi.filter((s) => hasAnyNote(cleanStr(s.code)));
    }
    return inferSubjectsFromValues(valuesRaw);
  }, [matrix?.subjects, valuesRaw]);

  const moduleGroups = useMemo(() => buildModuleGroups(subjectsRaw), [subjectsRaw]);

  const columnPages = useMemo(
    () => paginateA4({ modules: moduleGroups.modules, noMod: moduleGroups.noMod, modulesPerPage, maxCols }),
    [moduleGroups, modulesPerPage, maxCols]
  );

  const studentRowPages = useMemo(
    () => splitStudentsIntoRowPages(sortedStudents, MAX_ROWS),
    [sortedStudents]
  );

  const pages = useMemo(() => {
    const out = [];
    for (let c = 0; c < columnPages.length; c++) {
      for (let r = 0; r < studentRowPages.length; r++) {
        out.push({
          groups: columnPages[c].groups,
          students: studentRowPages[r],
          colPageIndex: c,
          colPageCount: columnPages.length,
          rowPageIndex: r,
          rowPageCount: studentRowPages.length,
        });
      }
    }
    return out;
  }, [columnPages, studentRowPages]);

  const totalPages = pages.length;
  const notesCount = matrix?.stats?.notes ?? 0;

  const getStudentName = (stu) => {
    const last = cleanStr(stu?.lastName || "").toUpperCase();
    const first = cleanStr(stu?.firstName || "");
    const fullUpper = cleanStr(`${last} ${first}`).toUpperCase();
    return reduceNameUpper(fullUpper, NAME_MAX_PARTS);
  };

  const buildCellAfterDelib = (sid, ecueCode) => {
    const byStudent = valuesRaw?.[sid] || {};
    const cell = byStudent?.[ecueCode] || null;
    const cc = cell?.cc ?? null;
    const sn = cell?.sn ?? null;
    return applyDeliberation({ cc, sn }, delib);
  };

  const computeModuleCreditsForStudent = (sid, group) => {
    if (!group?.hasCreditsCol) return "";
    const ecues = Array.isArray(group?.ecues) ? group.ecues : [];
    let sum = 0;
    for (const e of ecues) {
      const { nfAdj } = buildCellAfterDelib(sid, e.code);
      if (nfAdj !== null && nfAdj >= 10) sum += Number(e.credits ?? 0) || 0;
    }
    return fmtCredit(sum ?? 0);
  };

  const handleGeneratePdf = async () => {
    if (busy) return;
    if (!selectedClass) return alert("Veuillez d'abord choisir une classe.");
    setBusy(true);
    try {
      const logoDataUrl = await toDataUrlFromPublicPath(LOGO_PUBLIC_PATH);
      const html = generateProcesVerbalA4HTML({
        logoDataUrl,
        academicYear,
        semester,
        session,
        classTitle: classFullName,
        pages,
        columnPages,
        valuesRaw,
        delib,
        allSubjects: subjectsRaw,
        signatoryType,
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

  const renderLegend = (page, idx) => {
    const { modules, noModEcues } = buildSheetLegend(page);
    const hasContent = modules.length > 0 || noModEcues.length > 0;
    if (!hasContent) return null;

    return (
      <div style={previewStyles.legendBox} key={`legend-${idx}`}>
        <div style={previewStyles.legendTitle}>Légende des matières (ECUE)</div>
        {modules.map((mod) => (
          <div key={mod.moduleCode} style={previewStyles.legendModule}>
            <div style={previewStyles.legendModuleTitle}>{mod.moduleCode} — {mod.moduleLabel}</div>
            <div style={previewStyles.legendGrid}>
              {mod.ecues.map((e) => (
                <div key={e.code} style={previewStyles.legendItem}>
                  <span style={previewStyles.legendCode}>{e.code}</span>
                  <span style={previewStyles.legendSep}>—</span>
                  <span style={previewStyles.legendLabel}>{e.label}</span>
                  <span style={previewStyles.legendCredits}>({e.credits} crédit{e.credits > 1 ? "s" : ""})</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {noModEcues.length > 0 && (
          <div style={previewStyles.legendGrid}>
            {noModEcues.map((e) => (
              <div key={e.code} style={previewStyles.legendItem}>
                <span style={previewStyles.legendCode}>{e.code}</span>
                <span style={previewStyles.legendSep}>—</span>
                <span style={previewStyles.legendLabel}>{e.label}</span>
                <span style={previewStyles.legendCredits}>({e.credits} crédit{e.credits > 1 ? "s" : ""})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const footerText =
    signatoryType === "DAAC"
      ? "Nom, date et signature du DAAC :"
      : "Nom, date et signature du coordonnateur des Licences / Masters :";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={headerPillStyles}>
          <div style={headerPillTitle}>A4 paysage</div>
          <div style={headerPillText}>MAX {maxCols} colonnes • MAX {MAX_ROWS} lignes</div>
        </div>
      </div>

      {matrix?.stats?.subjectsSource && (
        <div style={debugBadge}>
          Source matières : <strong>{matrix.stats.subjectsSource}</strong>
          {" · "}Source étudiants : <strong>{matrix.stats.studentsSource}</strong>
          {matrix.meta?.sessionLabels && (
            <span> · Sessions recherchées : {matrix.meta.sessionLabels.slice(0, 2).join(", ")}…</span>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: ".82rem", fontWeight: 800, color: "#374151" }}>Modules / page</label>
        <select value={modulesPerPage} onChange={(e) => setModulesPerPage(Number(e.target.value))} style={topSelectStyles}>
          {[3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <label style={{ fontSize: ".82rem", fontWeight: 800, color: "#374151" }}>Colonnes max</label>
        <select value={maxCols} onChange={(e) => setMaxCols(Number(e.target.value))} style={topSelectStyles}>
          {[MAX_COLS_DEFAULT, MAX_COLS_DEFAULT - 3, MAX_COLS_DEFAULT - 6].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleGeneratePdf}
          disabled={busy}
          style={{
            ...topPrimaryBtnStyles,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Ouverture..." : "Générer PDF A4"}
        </button>
      </div>

      <div style={{ marginBottom: 10, fontSize: ".8rem", color: "#6B7280" }}>
        {!selectedClass ? (
          <span>Choisis une classe pour voir l'aperçu.</span>
        ) : loadingMatrix ? (
          <span>Chargement du PV…</span>
        ) : totalPages === 0 ? (
          <span>Aucune matière/ECUE trouvée pour cette classe.</span>
        ) : (
          <>
            <span>Pages : <strong>{totalPages}</strong></span>
            <span style={{ marginLeft: 10 }}>Notes : <strong>{notesCount}</strong></span>
            <span style={{ marginLeft: 10 }}>Étudiants : <strong>{sortedStudents.length}</strong></span>
          </>
        )}
      </div>

      <div style={styles.previewWrapper}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {totalPages === 0 ? (
            <div style={previewStyles.emptyBox}>Aucune matière/ECUE trouvée pour cette classe.</div>
          ) : (
            pages.map((page, pidx) => {
              const showSummary = isLastColPage(page, columnPages);
              return (
                <div key={`page-${pidx}`} style={previewStyles.page}>
                  <NotesHeader />
                  <div style={previewStyles.metaRow}>
                    <div>
                      <b>Année académique :</b> {academicYear}
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
                  </div>
                  <div style={previewStyles.titleRow}>
                    {`PROCES VERBAL (${(classFullName || "CLASSE").toUpperCase()}) — Feuille ${pidx + 1}/${totalPages}`}
                  </div>

                  <div style={previewStyles.tableWrap}>
                    <table style={previewStyles.table}>
                      <thead>
                        <tr>
                          <th style={previewStyles.thNum} rowSpan={3}></th>
                          <th style={previewStyles.thMat} rowSpan={3}>Matricule</th>
                          <th style={previewStyles.thName} rowSpan={3}>Noms et Prénoms</th>
                          {page.groups.map((g, gi) => (
                            <th key={`m1-${gi}`} style={previewStyles.thModule} colSpan={groupColSpan(g)}>
                              {g.moduleCode && g.moduleLabel
                                ? `${g.moduleCode} : ${g.moduleLabel}`
                                : g.moduleCode
                                ? g.moduleCode
                                : ""}
                            </th>
                          ))}
                          {showSummary && (
                            <>
                              <th style={previewStyles.thSummary} rowSpan={3}>
                                Moy<br />Gén
                              </th>
                              <th style={previewStyles.thSummary} rowSpan={3}>
                                CT
                              </th>
                              <th style={previewStyles.thSummary} rowSpan={3}>
                                CTO
                              </th>
                              <th style={previewStyles.thDecision} rowSpan={3}>
                                Décision
                              </th>
                            </>
                          )}
                        </tr>
                         <tr>
                          {page.groups.map((g, gi) => (
                            <React.Fragment key={`m2-${gi}`}>
                              {(g.ecues || []).length === 0 ? (
                                <th style={previewStyles.thEcue} colSpan={3}>
                                  —
                                </th>
                              ) : (
                                (g.ecues || []).map((e) => (
                                  <th
                                    key={`${gi}-${e.code}`}
                                    style={previewStyles.thEcue}
                                    colSpan={3}
                                    title={e.label || e.code}
                                  >
                                    {e.code}
                                  </th>
                                ))
                              )}
                              {g.hasCreditsCol && (
                                <th style={previewStyles.thCredit} rowSpan={2}>
                                  CR
                                </th>
                              )}
                            </React.Fragment>
                          ))}
                        </tr>
                        <tr>
                          {page.groups.map((g, gi) => (
                            <React.Fragment key={`m3-${gi}`}>
                              {((g.ecues || []).length === 0 ? [{}] : (g.ecues || [])).map((_, i) => (
                                <React.Fragment key={`${gi}-mini-${i}`}>
                                  <th style={previewStyles.thMini}>CC</th>
                                  <th style={previewStyles.thMini}>SN</th>
                                  <th style={previewStyles.thMini}>NF</th>
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {page.students.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                3 +
                                (page.groups || []).reduce((s, g) => s + groupColSpan(g), 0) +
                                (showSummary ? 4 : 0)
                              }
                              style={previewStyles.tdEmpty}
                            >
                              Aucun étudiant dans cette classe.
                            </td>
                          </tr>
                        ) : (
                          page.students.map((stu, sidx) => {
                            const sid = cleanStr(stu.id || "");
                            const summary = showSummary
                              ? computeStudentSummary(sid, subjectsRaw, valuesRaw, delib)
                              : null;
                            return (
                              <tr key={sid || sidx} style={sidx % 2 === 1 ? previewStyles.trZebra : null}>
                                <td style={previewStyles.tdCenter}>
                                  {(page.rowPageIndex || 0) * MAX_ROWS + sidx + 1}
                                </td>
                                <td style={previewStyles.tdMono}>{stu.matricule || ""}</td>
                                <td style={previewStyles.tdNameCell}>{getStudentName(stu)}</td>
                                {page.groups.map((g, gi) => (
                                  <React.Fragment key={`row-${sid}-${gi}`}>
                                    {(g.ecues || []).length === 0 ? (
                                      <>
                                        <td style={previewStyles.tdNote}></td>
                                        <td style={previewStyles.tdNote}></td>
                                        <td style={previewStyles.tdNote}></td>
                                      </>
                                    ) : (
                                      (g.ecues || []).map((e) => {
                                        const c = buildCellAfterDelib(sid, e.code);
                                        return (
                                          <React.Fragment key={`${sid}-${gi}-${e.code}`}>
                                            <td style={previewStyles.tdNote}>{fmtNote(c.ccAdj)}</td>
                                            <td style={previewStyles.tdNote}>{fmtNote(c.snAdj)}</td>
                                            <td style={previewStyles.tdNote}>{fmtNote(c.nfAdj)}</td>
                                          </React.Fragment>
                                        );
                                      })
                                    )}
                                    {g.hasCreditsCol && (
                                      <td style={previewStyles.tdCredit}>
                                        {computeModuleCreditsForStudent(sid, g)}
                                      </td>
                                    )}
                                  </React.Fragment>
                                ))}
                                {showSummary && summary && (
                                  <>
                                    <td style={previewStyles.tdSummary}>
                                      {summary.moyGen !== null ? fmtNote(summary.moyGen) : ""}
                                    </td>
                                    <td style={previewStyles.tdSummary}>{summary.ct}</td>
                                    <td style={previewStyles.tdSummary}>{summary.cto}</td>
                                    <td
                                      style={{
                                        ...previewStyles.tdDecision,
                                        color:
                                          summary.decision === "Semestre validé" ? "#065F46" : "#991B1B",
                                        background:
                                          summary.decision === "Semestre validé" ? "#D1FAE5" : "#FEE2E2",
                                      }}
                                    >
                                      {summary.decision}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {renderLegend(page, pidx)}

                    <div style={previewStyles.noteLegendFooter}>
                      <strong>CC</strong> <span>Contrôle Continu</span>
                      <span style={previewStyles.noteLegendSep}>•</span>
                      <strong>SN</strong> <span>Session Normale</span>
                      <span style={previewStyles.noteLegendSep}>•</span>
                      <strong>NF</strong> <span>Note Finale</span>
                      <span style={previewStyles.noteLegendSep}>•</span>
                      <strong>CR</strong> <span>Crédits acquis (module)</span>
                      <span style={previewStyles.noteLegendSep}>•</span>
                      <strong>CT</strong> <span>Crédits attendus</span>
                      <span style={previewStyles.noteLegendSep}>•</span>
                      <strong>CTO</strong> <span>Crédits totaux obtenus</span>
                    </div>
                  </div>
                  <div style={previewStyles.footerRow}>{footerText}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Génération HTML PDF A4                                          */
/* ─────────────────────────────────────────────────────────────── */
function generateProcesVerbalA4HTML({
  logoDataUrl,
  academicYear,
  semester,
  session,
  classTitle,
  pages,
  columnPages,
  valuesRaw,
  delib,
  allSubjects,
  signatoryType,
}) {
  const safeYear = academicYear || "—";
  const safeClassUpper = (classTitle || "—").toString().trim().toUpperCase();
  const safeSemester = semester || "—";
  const safeSession = session || "—";
  const vals = valuesRaw || {};

  const semNum = parseInt((semester || "S1").replace(/[^0-9]/g, ""), 10) || 1;
  const semesterLabel = semNum % 2 === 0 ? "SECOND SEMESTRE" : "PREMIER SEMESTRE";
  const MAIN_TITLE = `PROCES VERBAL DES RESULTATS DU ${semesterLabel}`;

  const HEADER_TITLE_1 = "Institut Polytechnique des Métiers du Bâtiment,";
  const HEADER_TITLE_2 = "des Travaux Publics et de l'Entrepreneuriat";
  const HEADER_SUB =
    "Autorisation d'ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS du 26 mars 2025";

  const clean = (x) => (x ?? "").toString().trim();
  const esc = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  const reduceName = (fullUpper) => reduceNameUpper(fullUpper, NAME_MAX_PARTS);

  // ---------- Fonctions internes (inchangées) ----------
  const numOrNull = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const computeNFLocal = (cc, sn) => {
    const a = numOrNull(cc);
    const b = numOrNull(sn);
    if (a === null && b === null) return null;
    return 0.3 * (a ?? 0) + 0.7 * (b ?? 0);
  };

  const applyDelibPDF = (cc, sn) => {
    const CC = numOrNull(cc);
    const SN = numOrNull(sn);
    if (CC === null && SN === null) return { ccAdj: null, snAdj: null, nfAdj: null };
    let ccAdj = CC,
      snAdj = SN;
    if (delib?.manualFillEnabled) {
      const mCC = numOrNull(delib.manualCC),
        mSN = numOrNull(delib.manualSN);
      if (ccAdj === null && snAdj !== null && mCC !== null) ccAdj = mCC;
      if (snAdj === null && ccAdj !== null && mSN !== null) snAdj = mSN;
    }
    const policy = delib?.missingPolicy || "mirror";
    if (policy === "zero") {
      if (ccAdj === null && snAdj !== null) ccAdj = 0;
      if (snAdj === null && ccAdj !== null) snAdj = 0;
    } else if (policy === "mirror") {
      if (ccAdj === null && snAdj !== null) ccAdj = snAdj;
      if (snAdj === null && ccAdj !== null) snAdj = ccAdj;
    }
    let nfAdj = computeNFLocal(ccAdj, snAdj);
    if (delib?.rescueEnabled && nfAdj !== null) {
      const from = numOrNull(delib.rescueFrom),
        threshold = from === null ? 8.5 : from;
      if (nfAdj >= threshold && nfAdj < 10) nfAdj = 10;
    }
    return { ccAdj, snAdj, nfAdj };
  };

  const computeSummaryPDF = (sid, byStudent) => {
    let sumNFxCr = 0,
      sumAllCr = 0,
      cto = 0;
    for (const subj of allSubjects || []) {
      const code = clean(subj.code),
        cr = Number(subj.credits ?? 0) || 0;
      sumAllCr += cr;
      const cell = byStudent[code] || {};
      const { nfAdj } = applyDelibPDF(cell?.cc ?? null, cell?.sn ?? null);
      if (nfAdj !== null) {
        sumNFxCr += nfAdj * cr;
        if (nfAdj >= 10) cto += cr;
      }
    }
    const ct = sumAllCr,
      moyGen = ct > 0 ? sumNFxCr / ct : null;
    const decision = ct > 0 && cto >= ct ? "Semestre validé" : "Semestre non validé";
    return { moyGen, ct, cto, decision };
  };

  const colSpanForGroup = (g) => Math.max(1, (g.ecues || []).length) * 3 + (g.hasCreditsCol ? 1 : 0);

  const buildHeaderHTML = () => `
    <div class="doc-header">
      <div class="doc-header__left">${
        logoDataUrl
          ? `<img class="doc-header__logo" src="${esc(logoDataUrl)}" alt="Logo" />`
          : `<div class="doc-header__logo-fallback"></div>`
      }</div>
      <div class="doc-header__center">
        <div class="doc-header__title">${esc(HEADER_TITLE_1)}</div>
        <div class="doc-header__title">${esc(HEADER_TITLE_2)}</div>
        <div class="doc-header__sub">${esc(HEADER_SUB)}</div>
      </div>
      <div class="doc-header__right"></div>
    </div>`;

  const buildWatermarkHTML = () =>
    !logoDataUrl
      ? ""
      : `<div class="watermark" aria-hidden="true"><img src="${esc(logoDataUrl)}" alt="" /></div>`;

  const buildLegendHTML = (page) => {
    const byModule = new Map(),
      noModEcues = [];
    for (const g of page.groups || []) {
      for (const e of g.ecues || []) {
        const code = clean(e.code),
          label = clean(e.label);
        if (!code || !label) continue;
        const mc = clean(g.moduleCode || ""),
          ml = clean(g.moduleLabel || ""),
          credits = Number(e.credits ?? 0) || 0;
        if (mc) {
          if (!byModule.has(mc)) byModule.set(mc, { mc, ml, ecues: [] });
          const mod = byModule.get(mc);
          if (!mod.ecues.find((x) => x.code === code)) mod.ecues.push({ code, label, credits });
        } else {
          if (!noModEcues.find((x) => x.code === code)) noModEcues.push({ code, label, credits });
        }
      }
    }
    const mods = Array.from(byModule.values()).sort((a, b) => a.mc.localeCompare(b.mc));
    mods.forEach((m) => m.ecues.sort((a, b) => a.code.localeCompare(b.code)));
    noModEcues.sort((a, b) => a.code.localeCompare(b.code));
    if (!mods.length && !noModEcues.length) return "";
    const ecueHTML = (e) => `
      <div class="legend-item">
        <span class="legend-code">${esc(e.code)}</span>
        <span class="legend-sep">—</span>
        <span class="legend-label">${esc(e.label)}</span>
        <span class="legend-credits">(${e.credits} crédit${e.credits > 1 ? "s" : ""})</span>
      </div>`;
    const modulesHTML = mods
      .map(
        (m) => `
      <div class="legend-module">
        <div class="legend-module-title">${esc(m.mc)} — ${esc(m.ml)}</div>
        <div class="legend-grid">${m.ecues.map(ecueHTML).join("")}</div>
      </div>`
      )
      .join("");
    const noModHTML = noModEcues.length
      ? `<div class="legend-grid">${noModEcues.map(ecueHTML).join("")}</div>`
      : "";
    return `<div class="legend"><div class="legend-title">Légende des matières (ECUE)</div>${modulesHTML}${noModHTML}</div>`;
  };

  const footerText =
    signatoryType === "DAAC"
      ? "Nom, date et signature du DAAC :"
      : "Nom, date et signature du coordonnateur des Licences / Masters :";

  const pagesHTML = (Array.isArray(pages) ? pages : [])
    .map((page, pageIdx) => {
      const showSummary = page.colPageIndex === columnPages.length - 1;
      const row1 = (page.groups || [])
        .map((g) => {
          const title =
            g.moduleCode && g.moduleLabel
              ? `${clean(g.moduleCode)} : ${clean(g.moduleLabel)}`
              : g.moduleCode
              ? clean(g.moduleCode)
              : "";
          return `<th class="th-module th-module-green" colspan="${colSpanForGroup(g)}">${esc(
            title
          )}</th>`;
        })
        .join("") +
        (showSummary
          ? `<th class="th-summary" rowspan="3">Moy<br/>Gén</th><th class="th-summary" rowspan="3">CT</th><th class="th-summary" rowspan="3">CTO</th><th class="th-decision" rowspan="3">Décision</th>`
          : "");

      const row2 = (page.groups || [])
        .map((g) => {
          const ecues = Array.isArray(g.ecues) ? g.ecues : [];
          return (
            (ecues.length ? ecues : [{ code: "—", label: "" }])
              .map(
                (e) =>
                  `<th class="th-ecue" colspan="3" title="${esc(e.label || e.code)}">${esc(
                    e.code
                  )}</th>`
              )
              .join("") + (g.hasCreditsCol ? `<th class="th-credit th-orange" rowspan="2">CR</th>` : "")
          );
        })
        .join("");

      const row3 = (page.groups || [])
        .map((g) => {
          const ecues = Array.isArray(g.ecues) ? g.ecues : [];
          return (ecues.length ? ecues : [{}])
            .map(
              () =>
                `<th class="th-mini th-orange">CC</th><th class="th-mini th-orange">SN</th><th class="th-mini th-orange">NF</th>`
            )
            .join("");
        })
        .join("");

      const totalExtraCols = (page.groups || []).reduce((s, g) => s + colSpanForGroup(g), 0);

      const students = Array.isArray(page.students) ? page.students : [];
      const rowsHTML = !students.length
        ? `<tr><td colspan="${
            3 + totalExtraCols + (showSummary ? 4 : 0)
          }" class="td-empty">Aucun étudiant.</td></tr>`
        : students
            .map((s, idx) => {
              const sid = clean(s?.id || "");
              const fullUpper = `${clean(s?.lastName || "").toUpperCase()} ${clean(
                s?.firstName || ""
              )}`
                .trim()
                .toUpperCase();
              const byStudent = sid ? vals[sid] || {} : {};
              const cells = (page.groups || [])
                .map((g) => {
                  const ecues = Array.isArray(g.ecues) ? g.ecues : [];
                  const ecCells = (ecues.length ? ecues : [{ code: "" }])
                    .map((e) => {
                      const cell = e.code ? byStudent[e.code] || {} : {};
                      const { ccAdj, snAdj, nfAdj } = applyDelibPDF(
                        cell?.cc ?? null,
                        cell?.sn ?? null
                      );
                      return `<td class="td-note td-note-orange">${esc(fmtNote(ccAdj))}</td><td class="td-note td-note-orange">${esc(
                        fmtNote(snAdj)
                      )}</td><td class="td-note td-note-orange">${esc(fmtNote(nfAdj))}</td>`;
                    })
                    .join("");
                  let cr = "";
                  if (g.hasCreditsCol) {
                    let sum = 0;
                    for (const e of ecues) {
                      const cell = e.code ? byStudent[e.code] || {} : {};
                      const { nfAdj } = applyDelibPDF(cell?.cc ?? null, cell?.sn ?? null);
                      if (nfAdj !== null && nfAdj >= 10) sum += Number(e.credits ?? 0) || 0;
                    }
                    cr = `<td class="td-credit td-credit-orange">${esc(fmtCredit(sum || 0))}</td>`;
                  }
                  return ecCells + cr;
                })
                .join("");
              let summaryHTML = "";
              if (showSummary) {
                const { moyGen, ct, cto, decision } = computeSummaryPDF(sid, byStudent);
                const isValide = decision === "Semestre validé";
                summaryHTML = `<td class="td-summary">${esc(
                  moyGen !== null ? fmtNote(moyGen) : ""
                )}</td><td class="td-summary">${ct}</td><td class="td-summary">${cto}</td><td class="td-decision ${
                  isValide ? "decision-ok" : "decision-ko"
                }">${esc(decision)}</td>`;
              }
              return `<tr class="${idx % 2 === 1 ? "zebra" : ""}"><td class="td-center">${
                (page.rowPageIndex || 0) * MAX_ROWS + idx + 1
              }</td><td class="td-mono">${esc(clean(s?.matricule || ""))}</td><td class="td-left">${esc(
                reduceName(fullUpper)
              )}</td>${cells}${summaryHTML}</tr>`;
            })
            .join("");

      return `<div class="page">${buildWatermarkHTML()}${buildHeaderHTML()}
      <div class="meta"><span><b>Année académique :</b> ${esc(safeYear)}</span><span><b>Classe :</b> ${esc(
        safeClassUpper
      )}</span><span><b>Semestre :</b> ${esc(safeSemester)}</span><span><b>Session :</b> ${esc(
        safeSession
      )}</span></div>
      <div class="title">${esc(MAIN_TITLE)} — Feuille ${pageIdx + 1}/${pages.length}</div>
      <table><thead><tr><th class="th-num" rowspan="3"></th><th class="th-mat" rowspan="3">Matricule</th><th class="th-name" rowspan="3">Noms et prénoms</th>${row1}</tr><tr>${row2}</tr><tr>${row3}</tr></thead><tbody>${rowsHTML}</tbody></table>
      ${buildLegendHTML(page)}
      <div class="note-legend-footer"><strong>CC</strong> <span>Contrôle Continu</span><span class="note-legend-footer__sep">•</span><strong>SN</strong> <span>Session Normale</span><span class="note-legend-footer__sep">•</span><strong>NF</strong> <span>Note Finale</span><span class="note-legend-footer__sep">•</span><strong>CR</strong> <span>Crédits acquis</span><span class="note-legend-footer__sep">•</span><strong>CT</strong> <span>Crédits attendus</span><span class="note-legend-footer__sep">•</span><strong>CTO</strong> <span>Crédits totaux obtenus</span></div>
      <div class="footer">${footerText}</div>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Proces-Verbal A4</title><style>
    html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    @page{size:A4 landscape;margin:10mm}
    body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#000;font-size:9.5px}
    .page{width:297mm;min-height:210mm;page-break-after:always;position:relative;overflow:hidden}
    .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
    .watermark img{width:120mm;height:auto;opacity:.08;transform:rotate(-12deg)}
    .doc-header,.meta,.title,table,.legend,.footer,.note-legend-footer{position:relative;z-index:1}
    .doc-header{display:grid;grid-template-columns:22mm 1fr 22mm;align-items:center;gap:6mm;padding:2mm 0;border-bottom:1px solid #000;margin-bottom:3mm}
    .doc-header__logo{width:18mm;height:18mm;object-fit:contain;display:block}
    .doc-header__logo-fallback{width:18mm;height:18mm}
    .doc-header__center{text-align:center;line-height:1.2}
    .doc-header__title{font-weight:900;font-size:11px}
    .doc-header__sub{margin-top:2px;font-size:9px;font-weight:600}
    .meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:2mm}
    .meta span b{font-weight:900}
    .title{text-align:center;font-weight:900;font-size:12px;margin:6px 0;text-decoration:underline;letter-spacing:.3px}
    table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed}
    th,td{border:1px solid #000;height:20px}
    th{padding:3px;text-align:center;background:#F8FAFC}
    td{padding:0 3px;text-align:center;vertical-align:middle;font-variant-numeric:tabular-nums}
    tr.zebra td{background:#FAFAFA}
    .th-num{width:26px}.th-mat{width:32mm}.th-name{width:42mm;text-align:left;padding-left:6px;background:#F8FAFC}
    .th-module{font-weight:900}.th-module-green{background:#B6FFF6!important;color:#000!important}
    .th-ecue{font-weight:900;white-space:nowrap;background:#F8FAFC}
    .th-mini{width:11mm;font-weight:900;font-size:9px;background:#fff}
    .th-orange{background:#F59E0B!important;color:#000!important}
    .th-credit{width:10mm;font-weight:900;font-size:9px;background:#F8FAFC}
    .td-credit{text-align:center;font-weight:900;font-size:9.5px}
    .td-credit-orange{background:#FDE68A!important}
    .th-summary{width:13mm;font-weight:900;font-size:9px;background:#EDE9FE!important;color:#4C1D95!important}
    .th-decision{width:28mm;font-weight:900;font-size:9px;background:#EDE9FE!important;color:#4C1D95!important}
    .td-summary{text-align:center;font-weight:900;font-size:9.5px;background:#F5F3FF!important}
    .td-decision{text-align:center;font-weight:900;font-size:8.5px}
    .decision-ok{background:#D1FAE5!important;color:#065F46!important}
    .decision-ko{background:#FEE2E2!important;color:#991B1B!important}
    .td-mono{font-family:"Courier New",monospace;font-size:10px;font-weight:900;letter-spacing:.2px}
    .td-left{text-align:left;padding-left:6px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;line-height:1.2}
    .td-center{text-align:center}.td-empty{text-align:center;font-style:italic;color:#666;padding:12px}
    .td-note{text-align:center;font-size:9.5px;font-weight:700;min-width:11mm}
    .td-note-orange{background:#FFF7ED!important}
    .legend{margin-top:8px;border:1px solid #CBD5E1;border-radius:8px;padding:6px 8px;background:#F8FAFC}
    .legend-title{font-weight:900;font-size:10px;margin-bottom:6px}
    .legend-module{margin-bottom:8px}
    .legend-module-title{font-weight:900;font-size:9.5px;color:#1E40AF;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #BFDBFE}
    .legend-grid{display:flex;flex-wrap:wrap;gap:4px 10px;padding-left:10px}
    .legend-item{display:flex;gap:5px;max-width:120mm}
    .legend-code{font-weight:900;font-family:"Courier New",monospace}
    .legend-sep{color:#64748B}.legend-label{color:#0F172A}
    .legend-credits{color:#6B7280;font-style:italic;font-size:8.5px}
    .note-legend-footer{margin-top:8px;font-size:9px;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
    .note-legend-footer__sep{color:#64748B}
    .footer{margin-top:8px;font-size:10px;text-align:right}
  </style></head><body>${pagesHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},700);};</script></body></html>`;
}

/* ── Styles preview ── */
const debugBadge = {
  marginBottom: 8,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#ECFEFF",
  border: "1px solid #7DD3FC",
  color: "#0369A1",
  fontSize: ".75rem",
  display: "inline-flex",
  gap: 6,
};
const headerPillStyles = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 12px",
  borderRadius: 12,
  background: "#EFF6FF",
  border: "1px solid #BFDBFE",
};
const headerPillTitle = { fontSize: ".9rem", fontWeight: 900, color: "#1D4ED8" };
const headerPillText = { fontSize: ".78rem", color: "#475569" };
const topSelectStyles = {
  height: 34,
  borderRadius: 999,
  border: "1px solid #D1D5DB",
  padding: "0 0.8rem",
  fontSize: ".85rem",
  background: "#ffffff",
  outline: "none",
};
const topPrimaryBtnStyles = {
  borderRadius: 999,
  border: "none",
  background: "#2563EB",
  color: "#ffffff",
  padding: "0.45rem 1.1rem",
  fontSize: ".85rem",
  fontWeight: 900,
};
const styles = { previewWrapper: { display: "flex", justifyContent: "center" } };

const previewStyles = {
  page: {
    width: "1123px",
    minHeight: "794px",
    background: "#ffffff",
    boxShadow: "0 0 0 1px #000000",
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
  tableWrap: { padding: "0 10px 10px 10px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  thNum: { border: "1px solid #000", padding: "2px 3px", width: 26, textAlign: "center" },
  thMat: { border: "1px solid #000", padding: "2px 3px", width: 130, textAlign: "center" },
  thName: { border: "1px solid #000", padding: "2px 4px", width: 160, textAlign: "left" },
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
    background: "#FFFFFF",
  },
  thCredit: {
    border: "1px solid #000",
    padding: "2px 4px",
    textAlign: "center",
    width: 40,
    fontSize: "9px",
    fontWeight: 900,
    background: "#F8FAFC",
  },
  thSummary: {
    border: "1px solid #000",
    padding: "2px 4px",
    textAlign: "center",
    width: 44,
    fontSize: "9px",
    fontWeight: 900,
    background: "#EDE9FE",
    color: "#4C1D95",
  },
  thDecision: {
    border: "1px solid #000",
    padding: "2px 4px",
    textAlign: "center",
    width: 110,
    fontSize: "9px",
    fontWeight: 900,
    background: "#EDE9FE",
    color: "#4C1D95",
  },
  tdCenter: {
    border: "1px solid #000",
    padding: "2px 3px",
    textAlign: "center",
    verticalAlign: "middle",
  },
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
  tdNameCell: {
    border: "1px solid #000",
    padding: "2px 4px",
    verticalAlign: "middle",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
  },
  tdNote: {
    border: "1px solid #000",
    padding: "0 2px",
    height: 18,
    textAlign: "center",
    verticalAlign: "middle",
    fontVariantNumeric: "tabular-nums",
    fontSize: "9.5px",
    fontWeight: 700,
  },
  tdCredit: {
    border: "1px solid #000",
    padding: "0 2px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: "9.5px",
  },
  tdSummary: {
    border: "1px solid #000",
    padding: "0 2px",
    height: 18,
    textAlign: "center",
    verticalAlign: "middle",
    fontWeight: 900,
    fontSize: "9.5px",
    background: "#F5F3FF",
  },
  tdDecision: {
    border: "1px solid #000",
    padding: "0 3px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "8.5px",
    fontWeight: 900,
  },
  tdEmpty: {
    border: "1px solid #000",
    padding: "10px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },
  trZebra: { background: "#FAFAFA" },
  legendBox: {
    marginTop: 10,
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#F8FAFC",
  },
  legendTitle: { fontWeight: 900, marginBottom: 8, fontSize: "10px" },
  legendModule: { marginBottom: 8 },
  legendModuleTitle: {
    fontWeight: 900,
    fontSize: "9.5px",
    color: "#1E40AF",
    marginBottom: 4,
    paddingBottom: 2,
    borderBottom: "1px solid #BFDBFE",
  },
  legendGrid: { display: "flex", flexWrap: "wrap", gap: "4px 14px", paddingLeft: 10 },
  legendItem: { display: "flex", gap: 5, alignItems: "baseline", maxWidth: 500 },
  legendCode: { fontWeight: 900, fontFamily: '"Courier New", monospace', fontSize: "9px" },
  legendSep: { color: "#64748B" },
  legendLabel: { color: "#0F172A" },
  legendCredits: { color: "#6B7280", fontStyle: "italic", fontSize: "8.5px" },
  noteLegendFooter: {
    marginTop: 8,
    fontSize: "9px",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 10px",
    alignItems: "center",
  },
  noteLegendSep: { color: "#64748B" },
  footerRow: { marginTop: 6, padding: "0 10px", fontSize: "10px", textAlign: "left" },
};