//  src/components/documents/procesVerbalShared.js
export const cleanStr = (x) => (x ?? "").toString().trim();

export function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function computeNF(cc, sn) {
  const a = toNumberOrNull(cc);
  const b = toNumberOrNull(sn);
  if (a === null && b === null) return null;
  const ccV = a === null ? 0 : a;
  const snV = b === null ? 0 : b;
  return 0.3 * ccV + 0.7 * snV;
}

export function fmtNote(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const rounded = Math.round(n * 100) / 100;
  const fixed = rounded.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const paddedInt =
    Number(intPart) < 10 && Number(intPart) >= 0
      ? String(intPart).padStart(2, "0")
      : intPart;

  return `${paddedInt},${decPart}`;
}

export function fmtCredit(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return (Math.round(n * 100) / 100).toString().replace(".", ",");
}

export function applyDeliberation({ cc, sn }, delib) {
  const CC = toNumberOrNull(cc);
  const SN = toNumberOrNull(sn);

  const hasAny = CC !== null || SN !== null;
  if (!hasAny) return { ccAdj: null, snAdj: null, nfAdj: null };

  let ccAdj = CC;
  let snAdj = SN;

  if (delib?.manualFillEnabled) {
    const mCC = toNumberOrNull(delib.manualCC);
    const mSN = toNumberOrNull(delib.manualSN);
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

  let nfAdj = computeNF(ccAdj, snAdj);

  if (delib?.rescueEnabled && nfAdj !== null) {
    const from = toNumberOrNull(delib.rescueFrom);
    const threshold = from === null ? 8.5 : from;
    if (nfAdj >= threshold && nfAdj < 10) nfAdj = 10;
  }

  return { ccAdj, snAdj, nfAdj };
}

export function reduceNameUpper(fullUpper, maxParts = 2) {
  const s = cleanStr(fullUpper).replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(" ").filter(Boolean);
  return parts.slice(0, Math.max(1, Number(maxParts) || 2)).join(" ");
}

export function inferSubjectsFromValues(valuesRaw) {
  const vals = valuesRaw || {};
  const set = new Set();

  for (const sid of Object.keys(vals)) {
    const byStudent = vals[sid] || {};
    for (const code of Object.keys(byStudent)) {
      const c = cleanStr(code);
      if (c) set.add(c);
    }
  }

  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({
      id: `__inferred__${code}`,
      code,
      label: code,
      credits: 0,
      moduleCode: "",
      moduleLabel: "",
    }));
}

export function buildModuleGroups(subjectsRaw) {
  const m = new Map();
  const noMod = { moduleCode: "", moduleLabel: "", ecues: [] };

  for (const s of subjectsRaw || []) {
    const ecueCode = cleanStr(s?.code);
    if (!ecueCode) continue;

    const item = {
      code: ecueCode,
      label: cleanStr(s?.label || ""),
      credits: Number(s?.credits ?? 0) || 0,
      moduleCode: cleanStr(s?.moduleCode || ""),
      moduleLabel: cleanStr(s?.moduleLabel || ""),
    };

    if (item.moduleCode) {
      const key = item.moduleCode;
      if (!m.has(key)) {
        m.set(key, {
          moduleCode: item.moduleCode,
          moduleLabel: item.moduleLabel,
          ecues: [],
        });
      }
      m.get(key).ecues.push(item);
    } else {
      noMod.ecues.push(item);
    }
  }

  for (const key of m.keys()) {
    m.get(key).ecues.sort((a, b) => a.code.localeCompare(b.code));
  }
  noMod.ecues.sort((a, b) => a.code.localeCompare(b.code));

  const modules = Array.from(m.values()).sort((a, b) =>
    a.moduleCode.localeCompare(b.moduleCode)
  );
  return { modules, noMod };
}

export function groupColSpan(g) {
  const ec = Math.max(1, (g.ecues || []).length) * 3;
  return ec + (g.hasCreditsCol ? 1 : 0);
}

export function pageTotalCols(page) {
  const fixed = 3;
  const extras = (page.groups || []).reduce((sum, g) => sum + groupColSpan(g), 0);
  return fixed + extras;
}

export function paginateByMaxCols({ modules, noMod, modulesPerPage, maxCols }) {
  const per = Math.max(3, Math.min(6, Number(modulesPerPage) || 4));
  const pages = [];

  const newPage = () => ({ groups: [] });

  const canAddGroup = (page, group) =>
    pageTotalCols({ groups: [...(page.groups || []), group] }) <= maxCols;

  const maxEcueFit = (remainingCols, hasCR) => {
    const rem = remainingCols - (hasCR ? 1 : 0);
    if (rem <= 0) return 0;
    return Math.floor(rem / 3);
  };

  let idx = 0;
  while (idx < (modules?.length || 0)) {
    let page = pages.length ? pages[pages.length - 1] : null;
    if (!page || page.groups.length >= per) {
      page = newPage();
      pages.push(page);
    }

    const mod = modules[idx];
    const baseGroup = {
      moduleCode: mod.moduleCode,
      moduleLabel: mod.moduleLabel,
      hasCreditsCol: true,
      ecues: [],
    };

    const ecues = Array.isArray(mod.ecues) ? mod.ecues : [];
    if (ecues.length === 0) {
      const gEmpty = { ...baseGroup, ecues: [] };
      if (!canAddGroup(page, gEmpty)) {
        page = newPage();
        pages.push(page);
      }
      page.groups.push(gEmpty);
      idx += 1;
      continue;
    }

    const minGroup = { ...baseGroup, ecues: [ecues[0]] };
    if (!canAddGroup(page, minGroup)) {
      page = newPage();
      pages.push(page);
    }

    let pos = 0;
    while (pos < ecues.length) {
      if (page.groups.length >= per) {
        page = newPage();
        pages.push(page);
      }

      const usedCols = pageTotalCols(page);
      const remaining = maxCols - usedCols;

      const fit = maxEcueFit(remaining, true);
      if (fit <= 0) {
        page = newPage();
        pages.push(page);
        continue;
      }

      const chunk = ecues.slice(pos, pos + fit);
      const g = { ...baseGroup, ecues: chunk };

      if (!canAddGroup(page, g)) {
        page = newPage();
        pages.push(page);
        continue;
      }

      page.groups.push(g);
      pos += chunk.length;
    }

    idx += 1;
  }

  if (pages.length === 0) pages.push(newPage());

  const noE = Array.isArray(noMod?.ecues) ? noMod.ecues : [];
  if (noE.length) {
    let pos = 0;
    while (pos < noE.length) {
      let page = pages[pages.length - 1];

      if (page.groups.length >= per) {
        page = newPage();
        pages.push(page);
      }

      const usedCols = pageTotalCols(page);
      const remaining = maxCols - usedCols;

      const fit = maxEcueFit(remaining, false);
      if (fit <= 0) {
        page = newPage();
        pages.push(page);
        continue;
      }

      const chunk = noE.slice(pos, pos + fit);
      const g = {
        moduleCode: "",
        moduleLabel: "",
        hasCreditsCol: false,
        isNoModule: true,
        ecues: chunk,
      };

      if (!canAddGroup(page, g)) {
        page = newPage();
        pages.push(page);
        continue;
      }

      page.groups.push(g);
      pos += chunk.length;
    }
  }

  return pages;
}

export function splitStudentsIntoRowPages(students, maxRows) {
  const rows = Math.max(1, Number(maxRows) || 22);
  const out = [];
  const st = Array.isArray(students) ? students : [];
  for (let i = 0; i < st.length; i += rows) out.push(st.slice(i, i + rows));
  return out.length ? out : [[]];
}

export function buildPrintSheets({ columnPages, studentRowPages, allowDoubleBlock, stackWhenRowsLTE }) {
  const blocks = [];

  for (let r = 0; r < studentRowPages.length; r++) {
    for (let c = 0; c < columnPages.length; c++) {
      blocks.push({
        groups: columnPages[c].groups,
        students: studentRowPages[r],
        colPageIndex: c,
        colPageCount: columnPages.length,
        rowPageIndex: r,
        rowPageCount: studentRowPages.length,
      });
    }
  }

  const sheets = [];

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    const canStack =
      allowDoubleBlock &&
      current &&
      next &&
      current.rowPageIndex === next.rowPageIndex &&
      current.students.length <= stackWhenRowsLTE &&
      next.students.length <= stackWhenRowsLTE;

    if (canStack) {
      sheets.push({
        blocks: [current, next],
        sheetIndex: sheets.length,
      });
      i += 1;
    } else {
      sheets.push({
        blocks: [current],
        sheetIndex: sheets.length,
      });
    }
  }

  return sheets;
}

export function buildSheetLegend(sheet) {
  const map = new Map();

  for (const block of sheet?.blocks || []) {
    for (const g of block.groups || []) {
      for (const e of g.ecues || []) {
        const code = cleanStr(e.code);
        const label = cleanStr(e.label);
        if (code && label) map.set(code, { label, credits: Number(e.credits ?? 0) || 0 });
      }
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, { label, credits }]) => ({ code, label, credits }));
}

export async function toDataUrlFromPublicPath(path) {
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

/**
 * ─────────────────────────────────────────────────────────────
 * computeStudentSummary
 * Calcule pour un étudiant :
 *   - moyGen  : Σ(NF × crédits_ecue) / Σ(tous_les_crédits_semestre)
 *   - ct      : total crédits attendus du semestre (toutes les ECUE)
 *   - cto     : total crédits obtenus (NF ≥ 10 seulement)
 *   - decision: "Semestre validé" si cto === ct, sinon "Semestre non validé"
 *
 * @param {string}   sid         - ID de l'étudiant
 * @param {Array}    allSubjects - liste complète des ECUE du semestre
 *                                 [{ code, credits, ... }]
 * @param {object}   valuesRaw   - { [studentId]: { [ecueCode]: { cc, sn, nf } } }
 * @param {object}   delib       - paramètres délibération (même objet passé aux composants)
 * @returns {{ moyGen: number|null, ct: number, cto: number, decision: string }}
 * ─────────────────────────────────────────────────────────────
 */
export function computeStudentSummary(sid, allSubjects, valuesRaw, delib) {
  const byStudent = (valuesRaw || {})[sid] || {};

  let sumNFxCr = 0;
  let sumAllCr = 0;
  let cto = 0;

  for (const subj of allSubjects || []) {
    const code = cleanStr(subj.code);
    const cr = Number(subj.credits ?? 0) || 0;

    sumAllCr += cr;

    const cell = byStudent[code] || {};
    const { nfAdj } = applyDeliberation({ cc: cell.cc ?? null, sn: cell.sn ?? null }, delib);

    if (nfAdj !== null) {
      sumNFxCr += nfAdj * cr;
      if (nfAdj >= 10) cto += cr;
    }
  }

  const ct = sumAllCr;
  const moyGen = ct > 0 ? sumNFxCr / ct : null;
  const decision = ct > 0 && cto >= ct ? "Semestre validé" : "Semestre non validé";

  return { moyGen, ct, cto, decision };
}