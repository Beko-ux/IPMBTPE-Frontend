// src/pages/MatieresPage.jsx
// ✅ Version corrigée – sans barres de navigation internes

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, Plus, Search, ChevronDown, ChevronRight,
  Edit3, RotateCcw, AlertCircle, Check, X, Layers,
  Zap, Package, Sparkles, CheckCircle2, Circle, MoveRight,
  Trash2
} from "lucide-react";
import { getSemesterNumbers } from "../utils/semesters";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const cleanStr = (x) => (x ?? "").toString().trim();

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ─── Tous les semestres d'un cycle (pour le report) ─── */
function getAllSemestersForCycle(cycle) {
  const cycleMaxYear = { BTS: 2, LICENCE: 3, MASTER: 5, INGÉNIEUR: 5 };
  const maxY = cycleMaxYear[cycle] || 5;
  const opts = [];
  for (let y = 1; y <= maxY; y++) {
    const [a, b] = getSemesterNumbers(y);
    const label = (v) => `S${v} — ${cycle} Année ${y}`;
    opts.push({ value: `S${a}`, label: label(a) });
    opts.push({ value: `S${b}`, label: label(b) });
  }
  return opts;
}

/* Semestres "normaux" pour l'année d'étude */
function getYearSemesters(cycle, studyYear) {
  const [a, b] = getSemesterNumbers(studyYear);
  return [`S${a}`, `S${b}`];
}

function semMatchesFilter(subjectSem, filter) {
  if (!filter) return true;
  if (filter === subjectSem) return true;
  if (subjectSem === "S1S2") return true;
  return false;
}

export default function MatieresPage({ academicYear = "2025-2026" }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [semFilter, setSemFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [viewTab, setViewTab] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [expandedFilieres, setExpandedFilieres] = useState(new Set());
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [activatingMultiple, setActivatingMultiple] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const allCycleSemesters = useMemo(
    () => selectedClass ? getAllSemestersForCycle(selectedClass.cycle) : [],
    [selectedClass]
  );

  const yearSemesters = useMemo(
    () => selectedClass ? getYearSemesters(selectedClass.cycle, selectedClass.studyYear) : [],
    [selectedClass]
  );

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Chargement classes ── */
  useEffect(() => {
    setLoadingClasses(true);
    setSelectedClassId("");
    setClassSubjects([]);
    setCatalogSubjects([]);
    apiFetch(`/classes?year=${encodeURIComponent(academicYear)}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        const filieres = new Set(list.map((c) => c.filiere || "Autre"));
        setExpandedFilieres(filieres);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [academicYear]);

  /* ── Chargement initial des matières ── */
  const loadInitialSubjects = useCallback(async () => {
    if (!selectedClassId || !selectedClass) return;
    setLoadingSubjects(true);
    try {
      const { filiere, specialiteCode, optionCode, cycle, studyYear } = selectedClass;

      const refCode = optionCode || specialiteCode || "";
      const isIndustriel = filiere === "Filières industrielles";

      const p = new URLSearchParams();
      if (filiere) p.set("filiere", filiere);
      if (refCode) p.set("specialiteCode", refCode);
      if (!isIndustriel && optionCode && optionCode !== specialiteCode) {
        p.set("optionCode", optionCode);
      }
      if (cycle) p.set("cycle", cycle);
      if (studyYear) p.set("studyYear", String(studyYear));

      let catalog = await apiFetch(`/subjects?${p}`).catch(() => []);

      // Fallback si aucune spécialité
      const hasSpeciality = !!(specialiteCode || optionCode);
      if (!hasSpeciality && Array.isArray(catalog) && catalog.filter(s => !s.isArchived).length === 0) {
        const p2 = new URLSearchParams();
        if (filiere) p2.set("filiere", filiere);
        if (cycle) p2.set("cycle", cycle);
        if (studyYear) p2.set("studyYear", String(studyYear));
        const catalog2 = await apiFetch(`/subjects?${p2}`).catch(() => []);
        if (Array.isArray(catalog2) && catalog2.length > 0) catalog = catalog2;
      }

      const cs = await apiFetch(
        `/class-subjects?classId=${encodeURIComponent(selectedClassId)}&academicYear=${encodeURIComponent(academicYear)}`
      ).catch(() => []);

      setCatalogSubjects(Array.isArray(catalog) ? catalog.filter((s) => !s.isArchived) : []);
      setClassSubjects(Array.isArray(cs) ? cs : []);
    } finally {
      setLoadingSubjects(false);
    }
  }, [selectedClassId, selectedClass, academicYear]);

  useEffect(() => {
    loadInitialSubjects();
    setSemFilter("");
    setSearchQ("");
    setEditingId(null);
    setCollapsedGroups(new Set());
    setViewTab("all");
  }, [loadInitialSubjects]);

  // Map classSubjects par code
  const csMap = useMemo(() => {
    const m = new Map();
    for (const cs of classSubjects) {
      const code = cleanStr(cs.code);
      if (!code) continue;
      if (!m.has(code) || cs.active) m.set(code, cs);
    }
    return m;
  }, [classSubjects]);

  // Fusion catalogue + class_subjects
  const merged = useMemo(() => {
    const result = [];
    const seenCodes = new Set();

    for (const s of catalogSubjects) {
      const code = cleanStr(s.code || s.subjectCode || "");
      const sem = cleanStr(s.semesterMode || "S1");
      if (!code) continue;
      seenCodes.add(code);
      const cs = csMap.get(code);
      const effectiveSem = cs?.semesterOverride || cs?.semesterMode || sem;
      result.push({
        _type: "catalog", id: s.id, code,
        label: cs?.labelOverride || cleanStr(s.label || ""),
        originalLabel: cleanStr(s.label || ""),
        semesterMode: effectiveSem,
        originalSemester: sem,
        isReported: !!(cs?.semesterOverride && cs.semesterOverride !== sem),
        moduleCode: cleanStr(cs?.moduleCode || s.moduleCode || ""),
        moduleLabel: cleanStr(cs?.moduleLabel || s.moduleLabel || ""),
        credits: cs?.creditsOverride ?? s.credits ?? null,
        classSubject: cs || null,
        active: cs?.active ?? false,
        hasOverrides: cs?.hasOverrides ?? false,
      });
    }

    for (const cs of classSubjects) {
      const code = cleanStr(cs.code);
      if (!code || seenCodes.has(code)) continue;
      seenCodes.add(code);
      result.push({
        _type: "manual", id: cs.id, code,
        label: cs.labelOverride || cleanStr(cs.label || ""),
        originalLabel: cleanStr(cs.label || ""),
        semesterMode: cs.semesterOverride || cleanStr(cs.semesterMode || "S1"),
        originalSemester: cleanStr(cs.semesterMode || "S1"),
        isReported: !!(cs.semesterOverride && cs.semesterOverride !== cs.semesterMode),
        moduleCode: cleanStr(cs.moduleCode || ""),
        moduleLabel: cleanStr(cs.moduleLabel || ""),
        credits: cs.creditsOverride ?? cs.credits ?? null,
        classSubject: cs, active: cs.active ?? false,
        hasOverrides: cs.hasOverrides ?? false,
      });
    }

    result.sort(
      (a, b) => cleanStr(a.moduleCode).localeCompare(cleanStr(b.moduleCode)) ||
        cleanStr(a.code).localeCompare(cleanStr(b.code))
    );
    return result;
  }, [catalogSubjects, csMap]);

  const filtered = useMemo(() => {
    let list = merged;
    if (viewTab === "active") list = list.filter((s) => s.active);
    if (viewTab === "inactive") list = list.filter((s) => !s.active);
    if (semFilter) list = list.filter((s) => semMatchesFilter(s.semesterMode, semFilter));
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(
        (s) => s.label.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.moduleCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [merged, viewTab, semFilter, searchQ]);

  const stats = useMemo(() => ({
    total: merged.length,
    active: merged.filter((s) => s.active).length,
    inactive: merged.filter((s) => !s.active).length,
    modified: merged.filter((s) => s.hasOverrides).length,
  }), [merged]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      const k = s.moduleCode || "__none__";
      if (!map.has(k)) map.set(k, { moduleCode: s.moduleCode, moduleLabel: s.moduleLabel, items: [] });
      map.get(k).items.push(s);
    }
    return Array.from(map.values());
  }, [filtered]);

  const classesByFiliere = useMemo(() => {
    const map = new Map();
    for (const c of classes) {
      const f = c.filiere || "Autre";
      if (!map.has(f)) map.set(f, []);
      map.get(f).push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [classes]);

  // Mise à jour locale après activation/désactivation
  const updateLocalToggle = (subjectCode, newActive) => {
    setClassSubjects(prev => prev.map(cs => {
      if (cs.code === subjectCode) {
        return { ...cs, active: newActive };
      }
      return cs;
    }));
  };

  const addLocalClassSubject = (subject) => {
    const newCs = {
      id: `temp_${Date.now()}_${subject.code}`,
      classId: selectedClassId,
      academicYear,
      subjectId: subject.id,
      label: subject.originalLabel,
      code: subject.code,
      semesterMode: subject.originalSemester,
      moduleCode: subject.moduleCode,
      moduleLabel: subject.moduleLabel,
      credits: subject.credits,
      active: true,
      hasOverrides: false,
    };
    setClassSubjects(prev => [...prev, newCs]);
  };

  /* ── Activer / désactiver ── */
  const handleToggle = async (subject) => {
    if (saving) return;
    setSaving(true);
    try {
      if (!subject.classSubject) {
        await apiFetch("/class-subjects/activate", {
          method: "POST",
          body: JSON.stringify({
            classId: selectedClassId, academicYear,
            subjectId: subject.id, label: subject.originalLabel,
            code: subject.code, semesterMode: subject.originalSemester,
            moduleCode: subject.moduleCode, moduleLabel: subject.moduleLabel,
            credits: subject.credits,
          }),
        });
        addLocalClassSubject(subject);
        showToast("ok", `« ${subject.label} » activée ✓`);
      } else {
        await apiFetch(`/class-subjects/${subject.classSubject.id}/toggle`, {
          method: "PATCH",
          body: JSON.stringify({ active: !subject.active }),
        });
        updateLocalToggle(subject.code, !subject.active);
        showToast("ok", subject.active ? `« ${subject.label} » désactivée` : `« ${subject.label} » activée ✓`);
      }
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (subject) => {
    const cs = subject.classSubject;
    if (!cs) return;
    setEditingId(cs.id);
    setEditForm({
      labelOverride: cs.labelOverride || "",
      codeOverride: cs.codeOverride || "",
      creditsOverride: cs.creditsOverride != null ? String(cs.creditsOverride) : "",
      semesterOverride: cs.semesterOverride || subject.originalSemester,
      moduleCode: cs.moduleCode || subject.moduleCode || "",
      moduleLabel: cs.moduleLabel || subject.moduleLabel || "",
    });
  };

  const handleSaveOverride = async () => {
    if (!editingId || saving) return;
    setSaving(true);
    try {
      const body = {
        labelOverride: editForm.labelOverride?.trim() || null,
        codeOverride: editForm.codeOverride?.trim() || null,
        creditsOverride: editForm.creditsOverride !== "" ? Number(editForm.creditsOverride) : null,
        semesterOverride: editForm.semesterOverride || null,
        moduleCode: editForm.moduleCode?.trim() || undefined,
        moduleLabel: editForm.moduleLabel?.trim() || undefined,
      };
      await apiFetch(`/class-subjects/${editingId}/override`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await loadInitialSubjects();
      setEditingId(null);
      showToast("ok", "Modifications enregistrées ✓");
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (cs) => {
    if (!cs || !window.confirm("Réinitialiser aux valeurs originales du catalogue ?")) return;
    setSaving(true);
    try {
      await apiFetch(`/class-subjects/${cs.id}/override`, {
        method: "PATCH",
        body: JSON.stringify({
          labelOverride: null, codeOverride: null,
          creditsOverride: null,
          semesterOverride: null,
        }),
      });
      await loadInitialSubjects();
      showToast("ok", "Valeurs originales restaurées");
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject) => {
    const subjectId = subject.classSubject?.subjectId || subject.id;
    if (!subjectId) {
      showToast("err", "Identifiant introuvable pour cette matière.");
      return;
    }
    if (!window.confirm(`Supprimer définitivement la matière "${subject.label}" ?\n\nCette action est irréversible.`)) return;
    setSaving(true);
    try {
      await apiFetch(`/subjects/${subjectId}`, { method: "DELETE" });
      await loadInitialSubjects();
      showToast("ok", `« ${subject.label} » a été archivée.`);
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Activation multiple ── */
  const toggleSelectCode = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const handleActivateMultiple = async () => {
    const toActivate = merged.filter((s) => selectedCodes.has(s.code) && !s.active);
    if (!toActivate.length) return;
    setActivatingMultiple(true);
    let ok = 0, err = 0;
    for (const subject of toActivate) {
      try {
        if (!subject.classSubject) {
          await apiFetch("/class-subjects/activate", {
            method: "POST",
            body: JSON.stringify({
              classId: selectedClassId, academicYear,
              subjectId: subject.id, label: subject.originalLabel,
              code: subject.code, semesterMode: subject.originalSemester,
              moduleCode: subject.moduleCode, moduleLabel: subject.moduleLabel,
              credits: subject.credits,
            }),
          });
          addLocalClassSubject(subject);
        } else {
          await apiFetch(`/class-subjects/${subject.classSubject.id}/toggle`, {
            method: "PATCH",
            body: JSON.stringify({ active: true }),
          });
          updateLocalToggle(subject.code, true);
        }
        ok++;
      } catch (_) { err++; }
    }
    setSelectedCodes(new Set());
    setActivatingMultiple(false);
    showToast("ok", `${ok} matière${ok > 1 ? "s" : ""} activée${ok > 1 ? "s" : ""}${err > 0 ? ` (${err} erreur${err > 1 ? "s" : ""})` : ""} ✓`);
  };

  // Activer/désactiver tout un groupe UE
  const handleActivateGroup = async (groupItems, activate) => {
    if (saving) return;
    setSaving(true);
    let ok = 0;
    for (const subject of groupItems) {
      if (subject.active === activate) continue;
      try {
        if (!subject.classSubject) {
          await apiFetch("/class-subjects/activate", {
            method: "POST",
            body: JSON.stringify({
              classId: selectedClassId, academicYear,
              subjectId: subject.id, label: subject.originalLabel,
              code: subject.code, semesterMode: subject.originalSemester,
              moduleCode: subject.moduleCode, moduleLabel: subject.moduleLabel,
              credits: subject.credits,
            }),
          });
          addLocalClassSubject(subject);
        } else {
          await apiFetch(`/class-subjects/${subject.classSubject.id}/toggle`, {
            method: "PATCH",
            body: JSON.stringify({ active: activate }),
          });
          updateLocalToggle(subject.code, activate);
        }
        ok++;
      } catch (_) {}
    }
    setSaving(false);
    if (ok) showToast("ok", `${ok} matière${ok > 1 ? "s" : ""} ${activate ? "activée" : "désactivée"}${ok > 1 ? "s" : ""} ✓`);
  };

  const toggleGroup = (key) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const toggleFiliere = (f) => setExpandedFilieres((prev) => {
    const next = new Set(prev);
    next.has(f) ? next.delete(f) : next.add(f);
    return next;
  });

  /* ════ RENDU ════ */
  return (
    <div style={{ fontFamily: "var(--font-family)", color: "var(--fg)", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "256px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Sidebar des classes */}
        <aside style={sx.sidebar}>
          <div style={sx.sideHeader}>
            <Layers size={13} style={{ color: "var(--ip-teal)", flexShrink: 0 }} />
            <span>Classes · {academicYear}</span>
          </div>
          {loadingClasses ? (
            <div style={sx.hint}>Chargement...</div>
          ) : classesByFiliere.length === 0 ? (
            <div style={sx.hint}>Aucune classe trouvée</div>
          ) : classesByFiliere.map(([filiere, cls]) => {
            const shortFiliere = filiere
              .replace("Filières de ", "").replace("Filières ", "").replace("filières ", "");
            const expanded = expandedFilieres.has(filiere);
            const activeCount = cls.filter((c) => c.active).length;
            return (
              <div key={filiere} style={sx.filiereBlock}>
                <button style={sx.filiereToggle} onClick={() => toggleFiliere(filiere)}>
                  <div style={sx.filiereLeft}>
                    {expanded ? <ChevronDown size={12} style={{ color: "var(--ip-gray)" }} /> : <ChevronRight size={12} style={{ color: "var(--ip-gray)" }} />}
                    <span style={sx.filiereLabel}>{shortFiliere}</span>
                  </div>
                  <span style={sx.filiereCount}>{activeCount}/{cls.length}</span>
                </button>
                {expanded && cls.map((c) => {
                  const isSel = selectedClassId === c.id;
                  return (
                    <button key={c.id} onClick={() => setSelectedClassId(c.id)}
                      style={{ ...sx.classBtn, ...(isSel ? sx.classBtnSel : {}) }}>
                      <div style={{ ...sx.classActiveDot, background: c.active ? "var(--ip-teal)" : "var(--border)" }} />
                      <div style={sx.classBtnContent}>
                        <div style={sx.classBtnName}>{c.displayName || c.title}</div>
                        <div style={sx.classBtnMeta}>
                          {c.cycle}{c.studyYear ? ` · An ${c.studyYear}` : ""}
                          {c.studentCount ? ` · ${c.studentCount} ét.` : ""}
                        </div>
                      </div>
                      {isSel && <div style={sx.selIndicator} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Contenu principal */}
        <main style={sx.main}>
          {toast && (
            <div style={{ ...sx.toast, ...(toast.type === "ok" ? sx.toastOk : sx.toastErr) }}>
              {toast.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
              {toast.msg}
            </div>
          )}

          {!selectedClass ? (
            <div style={sx.emptyState}>
              <div style={sx.emptyIcon}><BookOpen size={32} style={{ color: "var(--ip-teal)" }} /></div>
              <div style={sx.emptyTitle}>Sélectionnez une classe</div>
              <div style={sx.emptySub}>
                Choisissez une classe dans le panneau gauche<br />
                pour gérer ses matières pour {academicYear}.
              </div>
            </div>
          ) : (
            <div style={sx.mainContent}>
              {/* En-tête classe */}
              <div style={sx.classCard}>
                <div style={sx.classCardLeft}>
                  <div style={sx.classCardTitle}>{selectedClass.title}</div>
                  <div style={sx.classCardMeta}>
                    <span>{selectedClass.filiere}</span>
                    <span style={sx.metaDot} />
                    <span>{selectedClass.cycle}</span>
                    {selectedClass.studyYear && (
                      <><span style={sx.metaDot} /><span>Année {selectedClass.studyYear}</span></>
                    )}
                    {!selectedClass.active && <span style={sx.inactivePill}>Inactive</span>}
                  </div>
                </div>
                <div style={sx.statsRow}>
                  <StatBox n={stats.total} label="Total" active={viewTab === "all"} onClick={() => setViewTab("all")} />
                  <StatBox n={stats.active} label="Activées" color="var(--ip-teal)" active={viewTab === "active"} onClick={() => setViewTab("active")} />
                  <StatBox n={stats.inactive} label="Non activées" color="var(--ip-gray)" active={viewTab === "inactive"} onClick={() => setViewTab("inactive")} />
                </div>
                <div style={sx.classCardActions}>
                  <button style={sx.btnSecondary} onClick={() => setShowBulk(true)}>
                    <Zap size={13} /> Gestion rapide
                  </button>
                  <button style={sx.btnPrimary} onClick={() => setShowAddModal(true)}>
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
              </div>

              {/* Onglets vue */}
              <div style={sx.tabsRow}>
                <ViewTab active={viewTab === "all"} onClick={() => setViewTab("all")}>
                  Catalogue complet ({stats.total})
                </ViewTab>
                <ViewTab active={viewTab === "active"} color="var(--ip-teal)" onClick={() => setViewTab("active")}>
                  <CheckCircle2 size={13} /> Activées ({stats.active})
                </ViewTab>
                <ViewTab active={viewTab === "inactive"} color="var(--ip-gray)" onClick={() => setViewTab("inactive")}>
                  <Circle size={13} /> Non activées ({stats.inactive})
                </ViewTab>
              </div>

              {/* Barre de filtres */}
              <div style={sx.filtersBar}>
                <div style={sx.searchBox}>
                  <Search size={13} style={sx.searchIco} />
                  <input style={sx.searchInput} placeholder="Rechercher matière, code, UE…"
                    value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                  {searchQ && (
                    <button style={sx.clearBtn} onClick={() => setSearchQ("")}><X size={11} /></button>
                  )}
                </div>
                <div style={sx.semRow}>
                  <PillBtn active={!semFilter} onClick={() => setSemFilter("")}>Tous</PillBtn>
                  {yearSemesters.map((sem) => (
                    <PillBtn key={sem} active={semFilter === sem} onClick={() => setSemFilter(sem)}>
                      {sem}
                      <span style={sx.pillDot} />
                    </PillBtn>
                  ))}
                </div>
                <span style={sx.resultCount}>{filtered.length} matière{filtered.length > 1 ? "s" : ""}</span>
              </div>

              <div style={sx.semLegend}>
                <span style={sx.semLegendDot} /> semestres de cette année ({yearSemesters.join(", ")})
                {" · "}autres = années différentes du même cycle
              </div>

              {selectedCodes.size > 0 && (
                <div style={sx.activationBar}>
                  <span style={sx.activationBarCount}>
                    {selectedCodes.size} matière{selectedCodes.size > 1 ? "s" : ""} sélectionnée{selectedCodes.size > 1 ? "s" : ""}
                  </span>
                  <button style={sx.btnGhost} onClick={() => setSelectedCodes(new Set())}>
                    <X size={13} /> Désélectionner tout
                  </button>
                  <button
                    style={{ ...sx.btnPrimary, background: "var(--ip-teal)" }}
                    onClick={handleActivateMultiple}
                    disabled={activatingMultiple}
                  >
                    {activatingMultiple ? "Activation…" : `✓ Activer les ${selectedCodes.size} sélectionnées`}
                  </button>
                </div>
              )}

              {loadingSubjects ? (
                <div style={sx.hint}>Chargement des matières…</div>
              ) : filtered.length === 0 ? (
                <div style={sx.emptyState}>
                  <div style={sx.emptyTitle}>
                    {viewTab === "active" ? "Aucune matière activée" :
                      viewTab === "inactive" ? "Toutes les matières sont activées ✓" :
                        "Aucune matière"}
                  </div>
                  <div style={sx.emptySub}>
                    {viewTab === "inactive"
                      ? "Toutes les matières du catalogue sont déjà actives pour cette classe."
                      : "Ajustez les filtres ou ajoutez des matières depuis le catalogue."}
                  </div>
                </div>
              ) : (
                groups.map((group) => {
                  const key = group.moduleCode || "__none__";
                  const collapsed = collapsedGroups.has(key);
                  const activeItems = group.items.filter((s) => s.active).length;
                  return (
                    <div key={key} style={sx.group}>
                      <div style={sx.groupHeader}>
                        <button style={sx.groupHeaderBtn} onClick={() => toggleGroup(key)}>
                          <span style={sx.groupChevron}>
                            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          </span>
                          {group.moduleCode ? (
                            <>
                              <span style={sx.ueCode}>{group.moduleCode}</span>
                              {group.moduleLabel && <span style={sx.ueLabel}>{group.moduleLabel}</span>}
                            </>
                          ) : <span style={sx.ueCode}>Sans UE</span>}
                        </button>
                        <div style={sx.groupActions}>
                          <span style={sx.groupStats}>
                            <span style={sx.groupStatActive}>{activeItems} activée{activeItems > 1 ? "s" : ""}</span>
                            <span style={sx.groupStatTotal}>/ {group.items.length}</span>
                          </span>
                          {activeItems < group.items.length ? (
                            <button style={sx.groupActionBtn} onClick={() => handleActivateGroup(group.items, true)}>
                              <CheckCircle2 size={12} /> Tout activer
                            </button>
                          ) : (
                            <button style={{ ...sx.groupActionBtn, ...sx.groupActionBtnOff }} onClick={() => handleActivateGroup(group.items, false)}>
                              <Circle size={12} /> Tout désactiver
                            </button>
                          )}
                        </div>
                      </div>

                      {!collapsed && group.items.map((subject) => {
                        const subKey = `${subject.code}__${subject.semesterMode}`;
                        const isEditing = editingId === subject.classSubject?.id;
                        const effLabel = subject.classSubject?.labelOverride || subject.label;
                        const effCode = subject.classSubject?.codeOverride || subject.code;
                        const effCredits = subject.classSubject?.creditsOverride ?? subject.credits;

                        if (isEditing) {
                          return (
                            <div key={subKey} style={sx.editRow}>
                              <div style={sx.editBanner}>
                                <Sparkles size={13} />
                                <span>Modification pour <strong>{selectedClass.title}</strong> · {academicYear} uniquement</span>
                                <span style={sx.editBannerNote}>(catalogue original non modifié)</span>
                              </div>
                              <div style={sx.editGrid}>
                                <InlineField label="Intitulé" span={2}>
                                  <input style={sx.input} value={editForm.labelOverride || ""}
                                    placeholder={subject.originalLabel}
                                    onChange={(e) => setEditForm((f) => ({ ...f, labelOverride: e.target.value }))} />
                                </InlineField>
                                <InlineField label="Code ECUE">
                                  <input style={sx.input} value={editForm.codeOverride || ""}
                                    placeholder={subject.code}
                                    onChange={(e) => setEditForm((f) => ({ ...f, codeOverride: e.target.value }))} />
                                </InlineField>
                                <InlineField label="Crédits">
                                  <input type="number" min="0" step="0.5" style={sx.input}
                                    value={editForm.creditsOverride || ""}
                                    placeholder={subject.credits !== null ? String(subject.credits) : "—"}
                                    onChange={(e) => setEditForm((f) => ({ ...f, creditsOverride: e.target.value }))} />
                                </InlineField>
                                <InlineField label="Semestre (report possible)" span={2}>
                                  <div style={sx.semReportWrap}>
                                    <select style={{ ...sx.input, flex: 1 }} value={editForm.semesterOverride || ""}
                                      onChange={(e) => setEditForm((f) => ({ ...f, semesterOverride: e.target.value }))}>
                                      {allCycleSemesters.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                      ))}
                                    </select>
                                    {editForm.semesterOverride !== subject.originalSemester && (
                                      <div style={sx.reportBadge}>
                                        <MoveRight size={12} />
                                        Reporté depuis {subject.originalSemester}
                                      </div>
                                    )}
                                  </div>
                                  <div style={sx.semHint}>
                                    Semestre prévu dans le catalogue : <strong>{subject.originalSemester}</strong>.
                                    Vous pouvez le déplacer vers n'importe quel semestre du cycle {selectedClass.cycle}.
                                  </div>
                                </InlineField>
                                <InlineField label="Code UE">
                                  <input style={sx.input} value={editForm.moduleCode || ""} placeholder="Ex: UE1"
                                    onChange={(e) => setEditForm((f) => ({ ...f, moduleCode: e.target.value }))} />
                                </InlineField>
                                <InlineField label="Libellé UE">
                                  <input style={sx.input} value={editForm.moduleLabel || ""} placeholder="Ex: Comptabilité"
                                    onChange={(e) => setEditForm((f) => ({ ...f, moduleLabel: e.target.value }))} />
                                </InlineField>
                              </div>
                              <div style={sx.editFooter}>
                                <button style={sx.btnGhost} onClick={() => setEditingId(null)}>Annuler</button>
                                <button style={sx.btnPrimary} onClick={handleSaveOverride} disabled={saving}>
                                  {saving ? "Enregistrement…" : "Enregistrer"}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={subKey}
                            style={{ ...sx.subjectRow, ...(subject.active ? {} : sx.subjectRowOff), ...(selectedCodes.has(subject.code) ? sx.subjectRowSelected : {}) }}>
                            {!subject.active && (
                              <input
                                type="checkbox"
                                checked={selectedCodes.has(subject.code)}
                                onChange={() => toggleSelectCode(subject.code)}
                                style={{ cursor: "pointer", flexShrink: 0 }}
                                title="Sélectionner pour activation groupée"
                              />
                            )}
                            <button
                              style={{ ...sx.activateBtn, ...(subject.active ? sx.activateBtnOn : sx.activateBtnOff) }}
                              onClick={() => handleToggle(subject)}
                              disabled={saving}
                              title={subject.active ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                            >
                              {subject.active ? (
                                <><CheckCircle2 size={14} /> Activée</>
                              ) : (
                                <><Circle size={14} /> Activer</>
                              )}
                            </button>
                            <div style={{
                              ...sx.codeBadge,
                              ...(subject.hasOverrides ? sx.codeBadgeEdited : {}),
                            }}>
                              {effCode || "—"}
                            </div>
                            <div style={sx.subjectInfo}>
                              <span style={sx.subjectName}>
                                {effLabel}
                                {subject.hasOverrides && <span style={sx.editedDot} title="Modifié pour cette classe" />}
                              </span>
                              <div style={sx.chips}>
                                <Chip highlighted={yearSemesters.includes(subject.semesterMode)}>
                                  {subject.semesterMode}
                                  {subject.isReported && (
                                    <span style={sx.reportedTag}> ↗ depuis {subject.originalSemester}</span>
                                  )}
                                </Chip>
                                {effCredits != null && <Chip>{effCredits} cr.</Chip>}
                                {subject._type === "manual" && <Chip accent>Manuel</Chip>}
                              </div>
                            </div>
                            {subject.active && subject.classSubject && (
                              <div style={sx.rowBtns}>
                                <IconBtn title="Modifier (intitulé, code, crédits, report de semestre)" onClick={() => startEdit(subject)}>
                                  <Edit3 size={13} />
                                </IconBtn>
                                {subject.hasOverrides && (
                                  <IconBtn title="Réinitialiser aux valeurs du catalogue" warn onClick={() => handleReset(subject.classSubject)}>
                                    <RotateCcw size={13} />
                                  </IconBtn>
                                )}
                                <IconBtn title="Supprimer cette matière (archivage)" warn onClick={() => handleDelete(subject)}>
                                  <Trash2 size={13} />
                                </IconBtn>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <AddModal
          classId={selectedClassId} academicYear={academicYear}
          selectedClass={selectedClass} allCycleSemesters={allCycleSemesters}
          existingCodes={new Set(merged.map((s) => s.code))}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => {
            setShowAddModal(false);
            await loadInitialSubjects();
            showToast("ok", "Matière ajoutée ✓");
          }}
          showToast={showToast}
        />
      )}

      {showBulk && (
        <BulkModal
          subjects={merged} classId={selectedClassId} academicYear={academicYear}
          selectedClass={selectedClass}
          onClose={() => setShowBulk(false)}
          onSaved={async () => {
            await loadInitialSubjects();
            showToast("ok", "Modifications enregistrées ✓");
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// Les composants AddModal, BulkModal, Overlay, etc. restent strictement identiques.
// Ils sont inclus ci-dessous pour que le fichier soit complet.

/* ════════════════════════════════════════════════════════
   MODAL AJOUTER (avec auto-incrément + choix UE)
════════════════════════════════════════════════════════ */
function AddModal({ classId, academicYear, selectedClass, allCycleSemesters, existingCodes, onClose, onSaved, showToast }) {
  const [tab, setTab] = useState("catalog");
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: "", code: "",
    semesterMode: allCycleSemesters[0]?.value || "S1",
    moduleCode: "", moduleLabel: "", credits: "",
  });

  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState("");
  const [autoCode, setAutoCode] = useState("");

  useEffect(() => {
    if (!selectedClass) return;
    const qs = new URLSearchParams({
      filiere: selectedClass.filiere,
      specialiteCode: selectedClass.specialiteCode || selectedClass.optionCode,
      studyYear: selectedClass.studyYear,
      cycle: selectedClass.cycle,
    });
    fetch(`${API}/modules?${qs}`)
      .then(res => res.json())
      .then(data => setModules(Array.isArray(data) ? data : []))
      .catch(() => setModules([]));
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedModule) {
      setAutoCode("");
      return;
    }
    const existingCodesArray = Array.from(existingCodes);
    const prefix = selectedModule;
    let num = 1;
    while (existingCodesArray.includes(`${prefix}${num}`)) num++;
    const newCode = `${prefix}${num}`;
    setAutoCode(newCode);
    setForm(f => ({ ...f, code: newCode }));
  }, [selectedModule, existingCodes]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    const p = new URLSearchParams();
    if (selectedClass.filiere) p.set("filiere", selectedClass.filiere);
    if (selectedClass.specialiteCode) p.set("specialiteCode", selectedClass.specialiteCode);
    if (selectedClass.optionCode) p.set("optionCode", selectedClass.optionCode);
    if (selectedClass.cycle) p.set("cycle", selectedClass.cycle);
    if (selectedClass.studyYear) p.set("studyYear", String(selectedClass.studyYear));
    apiFetch(`/subjects?${p}`)
      .then((d) => setCatalog(Array.isArray(d) ? d.filter((s) => !s.isArchived) : []))
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((s) => {
      const code = cleanStr(s.code || s.subjectCode || "");
      if (existingCodes.has(code)) return false;
      if (!q) return true;
      return cleanStr(s.label).toLowerCase().includes(q) || code.toLowerCase().includes(q);
    });
  }, [catalog, search, existingCodes]);

  const handleActivate = async (s) => {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch("/class-subjects/activate", {
        method: "POST",
        body: JSON.stringify({
          classId, academicYear, subjectId: s.id,
          label: cleanStr(s.label), code: cleanStr(s.code || s.subjectCode || ""),
          semesterMode: cleanStr(s.semesterMode || "S1"),
          moduleCode: cleanStr(s.moduleCode || ""), moduleLabel: cleanStr(s.moduleLabel || ""),
          credits: s.credits ?? null,
        }),
      });
      onSaved();
    } catch (e) { showToast("err", e.message); }
    finally { setSaving(false); }
  };

  const handleManual = async () => {
    if (!form.label.trim()) {
      showToast("err", "Intitulé obligatoire");
      return;
    }

    let finalCode = form.code.trim().toUpperCase();
    if (!selectedModule && !finalCode) {
      showToast("err", "Code ECUE obligatoire (soit via UE soit manuellement)");
      return;
    }

    if (selectedModule) {
      finalCode = autoCode;
    } else {
      if (existingCodes.has(finalCode)) {
        const match = finalCode.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
          const base = match[1];
          let num = parseInt(match[2], 10) + 1;
          while (existingCodes.has(`${base}${num}`)) num++;
          finalCode = `${base}${num}`;
          showToast("ok", `Code auto-ajusté en ${finalCode} (doublon évité)`);
        } else {
          let candidate = finalCode + "2";
          let n = 2;
          while (existingCodes.has(candidate)) { n++; candidate = finalCode + n; }
          finalCode = candidate;
          showToast("ok", `Code auto-ajusté en ${finalCode} (doublon évité)`);
        }
      }
    }

    setSaving(true);
    try {
      const newS = await apiFetch("/subjects", {
        method: "POST",
        body: JSON.stringify({
          label: form.label.trim(),
          code: finalCode,
          subjectCode: finalCode,
          semesterMode: form.semesterMode,
          moduleCode: selectedModule || null,
          moduleLabel: modules.find(m => m.code === selectedModule)?.label || null,
          credits: form.credits !== "" ? Number(form.credits) : null,
          filiere: selectedClass?.filiere || null,
          specialiteCode: selectedClass?.specialiteCode || null,
          optionCode: selectedClass?.optionCode || null,
          cycle: selectedClass?.cycle || null,
          studyYear: selectedClass?.studyYear || null,
        }),
      });
      await apiFetch("/class-subjects/activate", {
        method: "POST",
        body: JSON.stringify({
          classId, academicYear,
          subjectId: newS.id || null,
          label: form.label.trim(),
          code: finalCode,
          semesterMode: form.semesterMode,
          moduleCode: selectedModule || null,
          moduleLabel: modules.find(m => m.code === selectedModule)?.label || null,
          credits: form.credits !== "" ? Number(form.credits) : null,
        }),
      });
      onSaved();
    } catch (e) {
      showToast("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={mx.box}>
        <div style={mx.header}>
          <div>
            <div style={mx.title}>Ajouter une matière</div>
            <div style={mx.sub}>{selectedClass?.title} · {academicYear}</div>
          </div>
          <button style={mx.close} onClick={onClose}><X size={15} /></button>
        </div>
        <div style={mx.tabs}>
          <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")}><Package size={13} /> Depuis le catalogue</TabBtn>
          <TabBtn active={tab === "manual"} onClick={() => setTab("manual")}><Plus size={13} /> Créer manuellement</TabBtn>
        </div>
        <div style={mx.body}>
          {tab === "catalog" ? (
            <>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ip-gray)" }} />
                <input style={{ ...sx.input, paddingLeft: 32 }} placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div style={mx.catalogList}>
                {loading ? <div style={sx.hint}>Chargement…</div> :
                  filtered.length === 0 ? <div style={sx.hint}>{catalog.length === 0 ? "Aucune matière dans le catalogue pour cette classe." : "Toutes les matières sont déjà ajoutées."}</div> :
                    filtered.map((s) => (
                      <div key={s.id} style={mx.catalogRow}>
                        <span style={sx.codeBadge}>{cleanStr(s.code || s.subjectCode || "—")}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.84rem", fontWeight: 700 }}>{cleanStr(s.label)}</div>
                          <div style={{ fontSize: "0.71rem", color: "var(--ip-gray)", marginTop: 2 }}>
                            {cleanStr(s.semesterMode || "S1")}
                            {s.credits != null ? ` · ${s.credits} cr.` : ""}
                            {s.moduleCode ? ` · UE: ${s.moduleCode}` : ""}
                          </div>
                        </div>
                        <button style={sx.btnPrimary} onClick={() => handleActivate(s)} disabled={saving}>
                          {saving ? "…" : "Activer"}
                        </button>
                      </div>
                    ))}
              </div>
            </>
          ) : (
            <div>
              <div style={mx.formGrid}>
                <InlineField label="Intitulé *" span={2}>
                  <input style={sx.input} value={form.label} placeholder="Ex: Comptabilité Générale I"
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
                </InlineField>

                <InlineField label="UE (Module)">
                  <select style={sx.input} value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
                    <option value="">-- Aucune UE (code libre) --</option>
                    {modules.map(m => (
                      <option key={m.code} value={m.code}>{m.code} — {m.label}</option>
                    ))}
                  </select>
                  <small style={sx.hint}>Si vous choisissez une UE, le code ECUE sera généré automatiquement.</small>
                </InlineField>

                <InlineField label="Code ECUE *">
                  <input
                    style={sx.input}
                    value={form.code}
                    placeholder={selectedModule ? "Généré automatiquement" : "Ex: CGE11"}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    disabled={!!selectedModule}
                  />
                  {selectedModule && <small style={sx.hint}>Code généré : {autoCode}</small>}
                </InlineField>

                <InlineField label="Semestre">
                  <select style={sx.input} value={form.semesterMode}
                    onChange={(e) => setForm((f) => ({ ...f, semesterMode: e.target.value }))}>
                    {allCycleSemesters.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </InlineField>

                <InlineField label="Crédits">
                  <input type="number" min="0" step="0.5" style={sx.input} value={form.credits} placeholder="Ex: 3"
                    onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))} />
                </InlineField>
              </div>
              <button style={{ ...sx.btnPrimary, width: "100%", justifyContent: "center", marginTop: 16, height: 40 }}
                onClick={handleManual} disabled={saving}>
                {saving ? "Création…" : "Créer et activer pour cette classe"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/* ════════════════════════════════════════════════════════
   MODAL GESTION RAPIDE
════════════════════════════════════════════════════════ */
function BulkModal({ subjects, classId, academicYear, selectedClass, onClose, onSaved, showToast }) {
  const [rows, setRows] = useState(() =>
    subjects.filter((s) => s.active).map((s) => ({
      id: s.classSubject?.id,
      code: s.classSubject?.codeOverride || s.code,
      label: s.classSubject?.labelOverride || s.label,
      credits: (s.classSubject?.creditsOverride ?? s.credits) != null ? String(s.classSubject?.creditsOverride ?? s.credits) : "",
      semesterMode: s.semesterMode,
      selected: false, origCode: s.code,
    }))
  );
  const [bulkCredit, setBulkCredit] = useState("");
  const [saving, setSaving] = useState(false);

  const selCount = rows.filter((r) => r.selected).length;
  const allSel = rows.length > 0 && selCount === rows.length;

  const applyBulk = () => {
    const n = Number(bulkCredit.replace(",", "."));
    if (Number.isNaN(n)) { showToast("err", "Valeur invalide"); return; }
    setRows((p) => p.map((r) => r.selected ? { ...r, credits: String(n) } : r));
  };

  const save = async () => {
    const toSave = rows.filter((r) => r.selected && r.id);
    if (!toSave.length) { showToast("err", "Sélectionnez au moins une matière"); return; }
    setSaving(true);
    try {
      for (const r of toSave) {
        await apiFetch(`/class-subjects/${r.id}/override`, {
          method: "PATCH",
          body: JSON.stringify({
            codeOverride: r.code?.trim() !== r.origCode ? (r.code?.trim() || null) : null,
            creditsOverride: r.credits !== "" ? Number(r.credits) : null,
          }),
        });
      }
      onSaved(); onClose();
    } catch (e) { showToast("err", e.message); }
    finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...mx.box, width: "min(860px, 96vw)" }}>
        <div style={mx.header}>
          <div>
            <div style={mx.title}>Gestion rapide — Codes &amp; Crédits</div>
            <div style={mx.sub}>{selectedClass?.title} · {academicYear}</div>
          </div>
          <button style={mx.close} onClick={onClose}><X size={15} /></button>
        </div>
        <div style={mx.body}>
          <div style={bk.toolbar}>
            <label style={bk.checkAll}>
              <input type="checkbox" checked={allSel} onChange={(e) => setRows((p) => p.map((r) => ({ ...r, selected: e.target.checked })))} />
              Tout sélectionner ({rows.length})
            </label>
            <div style={bk.applyRow}>
              <span style={{ fontSize: "0.79rem", color: "var(--ip-gray)", fontWeight: 700 }}>Appliquer crédit ({selCount} sél.) :</span>
              <input type="number" min="0" step="0.5" style={{ ...sx.input, width: 88 }} value={bulkCredit} onChange={(e) => setBulkCredit(e.target.value)} placeholder="ex: 3" />
              <button style={sx.btnSecondary} onClick={applyBulk}>Appliquer</button>
            </div>
          </div>
          <div style={bk.tableWrap}>
            <table style={bk.table}>
              <thead>
                <tr>
                  <th style={bk.th}>✔</th>
                  <th style={bk.th}>Matière</th>
                  <th style={bk.th}>Code</th>
                  <th style={bk.th}>Crédits</th>
                  <th style={bk.th}>Sem.</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} style={bk.empty}>Aucune matière activée.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id || i} style={r.selected ? bk.rowSel : {}}>
                    <td style={bk.td}><input type="checkbox" checked={r.selected} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))} /></td>
                    <td style={{ ...bk.td, fontWeight: 600, fontSize: "0.83rem" }}>{r.label}</td>
                    <td style={bk.td}><input style={{ ...sx.input, width: 110 }} value={r.code} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} /></td>
                    <td style={bk.td}><input type="number" min="0" step="0.5" style={{ ...sx.input, width: 80 }} value={r.credits} onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, credits: e.target.value } : x))} /></td>
                    <td style={{ ...bk.td, fontSize: "0.79rem", color: "var(--ip-gray)", fontWeight: 700 }}>{r.semesterMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={mx.footer}>
          <button style={sx.btnGhost} onClick={onClose}>Fermer</button>
          <button style={sx.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : `Enregistrer (${selCount} sél.)`}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ══ Micro-composants ══ */
function Overlay({ onClose, children }) {
  return (
    <div style={sx.overlay} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
function PillBtn({ children, active, onClick }) {
  return <button type="button" onClick={onClick} style={{ ...sx.pill, ...(active ? sx.pillOn : {}) }}>{children}</button>;
}
function ViewTab({ children, active, color, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ ...sx.viewTab, ...(active ? { ...sx.viewTabOn, ...(color ? { color, borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: color } : {}) } : {}) }}>
      {children}
    </button>
  );
}
function TabBtn({ children, active, onClick }) {
  return <button type="button" onClick={onClick} style={{ ...mx.tabBtn, ...(active ? mx.tabBtnOn : {}) }}>{children}</button>;
}
function StatBox({ n, label, color, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ ...sx.statBox, ...(active ? sx.statBoxActive : {}) }}>
      <div style={{ ...sx.statN, ...(color ? { color } : {}) }}>{n}</div>
      <div style={sx.statLabel}>{label}</div>
    </button>
  );
}
function Chip({ children, accent, highlighted }) {
  return (
    <span style={{
      ...sx.chip,
      ...(accent ? { color: "var(--ip-orange)", borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,130,0,.4)" } : {}),
      ...(highlighted ? { borderWidth: "1px", borderStyle: "solid", borderColor: "var(--ip-teal)", color: "var(--ip-teal)", background: "var(--bg-sidebar-hi)" } : {}),
    }}>{children}</span>
  );
}
function IconBtn({ children, title, warn, onClick }) {
  return (
    <button type="button" onClick={onClick} title={title}
      style={{ ...sx.iconBtn, ...(warn ? sx.iconBtnWarn : {}) }}>{children}</button>
  );
}
function InlineField({ label, children, span }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...(span ? { gridColumn: `span ${span}` } : {}) }}>
      <label style={{ fontSize: "0.71rem", fontWeight: 800, color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════ */
const sx = {
  sidebar: { borderRight: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto", display: "flex", flexDirection: "column" },
  sideHeader: { display: "flex", alignItems: "center", gap: 7, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ip-gray)", padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" },
  filiereBlock: { borderBottom: "1px solid var(--border)" },
  filiereToggle: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", gap: 6 },
  filiereLeft: { display: "flex", alignItems: "center", gap: 6 },
  filiereLabel: { fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ip-gray)" },
  filiereCount: { fontSize: "0.65rem", fontWeight: 800, color: "var(--ip-gray)", background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border)" },
  classBtn: { width: "100%", display: "flex", alignItems: "center", padding: "8px 12px 8px 18px", background: "none", border: "none", cursor: "pointer", gap: 8, textAlign: "left", position: "relative" },
  classBtnSel: { background: "var(--bg-sidebar-hi)" },
  classActiveDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  classBtnContent: { flex: 1, minWidth: 0 },
  classBtnName: { fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  classBtnMeta: { fontSize: "0.68rem", color: "var(--ip-gray)", marginTop: 1 },
  selIndicator: { position: "absolute", left: 0, top: "10%", bottom: "10%", width: 3, borderRadius: 999, background: "var(--ip-teal)" },

  main: { overflowY: "auto", padding: "1.25rem 1.5rem", background: "var(--bg-muted)" },
  mainContent: { display: "flex", flexDirection: "column", gap: 12 },
  hint: { fontSize: "0.8rem", color: "var(--ip-gray)", fontStyle: "italic", padding: "10px 0" },

  classCard: { display: "flex", alignItems: "center", gap: 16, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px", flexWrap: "wrap" },
  classCardLeft: { flex: 1, minWidth: 0 },
  classCardTitle: { fontSize: "1rem", fontWeight: 900, color: "var(--fg)" },
  classCardMeta: { display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--ip-gray)", marginTop: 3, flexWrap: "wrap" },
  metaDot: { width: 3, height: 3, borderRadius: "50%", background: "var(--ip-gray)", flexShrink: 0 },
  inactivePill: { background: "rgba(255,130,0,.1)", color: "var(--ip-orange)", border: "1px solid rgba(255,130,0,.4)", borderRadius: 999, padding: "1px 8px", fontSize: "0.68rem", fontWeight: 800 },
  classCardActions: { display: "flex", gap: 8 },

  statsRow: { display: "flex", gap: 6 },
  statBox: { display: "flex", flexDirection: "column", alignItems: "center", background: "var(--bg-muted)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", borderRadius: 10, padding: "8px 14px", minWidth: 70, cursor: "pointer" },
  statBoxActive: { background: "var(--bg-sidebar-hi)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--ip-teal)" },
  statN: { fontSize: "1.3rem", fontWeight: 900, lineHeight: 1, color: "var(--fg)" },
  statLabel: { fontSize: "0.6rem", fontWeight: 800, color: "var(--ip-gray)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" },

  tabsRow: { display: "flex", borderBottom: "2px solid var(--border)", gap: 0 },
  viewTab: { display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderWidth: 0, borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", background: "transparent", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "var(--ip-gray)", marginBottom: -2 },
  viewTabOn: { borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "var(--ip-teal)", color: "var(--ip-teal)", fontWeight: 900 },

  filtersBar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  searchBox: { position: "relative", flex: "1 1 200px" },
  searchIco: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ip-gray)", pointerEvents: "none" },
  searchInput: { width: "100%", height: 34, borderRadius: 999, border: "1px solid var(--border)", padding: "0 30px 0 32px", fontSize: "0.82rem", background: "var(--bg)", color: "var(--fg)", outline: "none", boxSizing: "border-box" },
  clearBtn: { position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--ip-gray)", display: "flex", padding: 2 },
  semRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  pill: { height: 28, padding: "0 10px", borderRadius: 999, borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
  pillOn: { background: "var(--bg-sidebar-hi)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--ip-teal)", color: "var(--ip-teal)" },
  pillDot: { width: 5, height: 5, borderRadius: "50%", background: "var(--ip-teal)", flexShrink: 0 },
  resultCount: { fontSize: "0.76rem", color: "var(--ip-gray)", fontWeight: 700, whiteSpace: "nowrap" },
  semLegend: { fontSize: "0.72rem", color: "var(--ip-gray)", display: "flex", alignItems: "center", gap: 5 },
  semLegendDot: { width: 5, height: 5, borderRadius: "50%", background: "var(--ip-teal)", flexShrink: 0 },

  group: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" },
  groupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" },
  groupHeaderBtn: { display: "flex", alignItems: "center", gap: 8, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 0" },
  groupChevron: { color: "var(--ip-gray)", display: "flex" },
  ueCode: { fontSize: "0.8rem", fontWeight: 900, color: "var(--ip-teal)", fontFamily: '"Courier New", monospace' },
  ueLabel: { fontSize: "0.79rem", color: "var(--ip-gray)", fontWeight: 500 },
  groupActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  groupStats: { display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem" },
  groupStatActive: { fontWeight: 800, color: "var(--ip-teal)" },
  groupStatTotal: { color: "var(--ip-gray)" },
  groupActionBtn: { display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px", borderRadius: 999, border: "1px solid var(--ip-teal)", background: "rgba(48,178,165,.08)", color: "var(--ip-teal)", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  groupActionBtnOff: { borderColor: "var(--border)", background: "transparent", color: "var(--ip-gray)" },

  subjectRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderTop: "1px solid var(--border)" },
  subjectRowOff: { background: "var(--bg-muted)" },
  subjectRowSelected: { background: "rgba(48,178,165,.07)", borderColor: "rgba(48,178,165,.2)" },
  activationBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: "2px solid var(--ip-teal)", background: "rgba(48,178,165,.06)", flexWrap: "wrap" },
  activationBarCount: { fontSize: "0.84rem", fontWeight: 900, color: "var(--ip-teal)", flex: 1 },

  activateBtn: { display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: "0.74rem", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0, minWidth: 88 },
  activateBtnOn: { background: "rgba(48,178,165,.12)", color: "var(--ip-teal)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--ip-teal)" },
  activateBtnOff: { background: "var(--bg-muted)", color: "var(--ip-gray)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)" },

  codeBadge: { fontSize: "0.69rem", fontWeight: 900, padding: "3px 8px", borderRadius: 6, background: "var(--bg-muted)", color: "var(--fg)", fontFamily: '"Courier New", monospace', borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", flexShrink: 0, minWidth: 52, textAlign: "center" },
  codeBadgeEdited: { borderWidth: "1px", borderStyle: "solid", borderColor: "var(--ip-orange)", color: "var(--ip-orange)", background: "rgba(255,130,0,.06)" },
  subjectInfo: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: "0.84rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  editedDot: { width: 5, height: 5, borderRadius: "50%", background: "var(--ip-orange)", flexShrink: 0 },
  chips: { display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" },
  chip: { fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "var(--bg-muted)", color: "var(--ip-gray)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)" },
  reportedTag: { color: "var(--ip-orange)", fontStyle: "italic" },
  rowBtns: { display: "flex", gap: 5, flexShrink: 0 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ip-gray)" },
  iconBtnWarn: { borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,130,0,.5)", color: "var(--ip-orange)", background: "rgba(255,130,0,.05)" },

  editRow: { borderTop: "2px solid var(--ip-teal)", background: "rgba(48,178,165,.04)", padding: "14px 16px" },
  editBanner: { display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 700, marginBottom: 12, color: "var(--ip-teal)", flexWrap: "wrap" },
  editBannerNote: { fontSize: "0.73rem", color: "var(--ip-orange)", fontWeight: 600 },
  editGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 },
  editFooter: { display: "flex", justifyContent: "flex-end", gap: 8 },
  semReportWrap: { display: "flex", alignItems: "center", gap: 8 },
  reportBadge: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.73rem", fontWeight: 800, color: "var(--ip-orange)", background: "rgba(255,130,0,.1)", border: "1px solid rgba(255,130,0,.3)", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" },
  semHint: { fontSize: "0.72rem", color: "var(--ip-gray)", marginTop: 5 },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "4rem 2rem", textAlign: "center", flex: 1 },
  emptyIcon: { width: 60, height: 60, borderRadius: "50%", background: "var(--bg-sidebar-hi)", display: "flex", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: "0.96rem", fontWeight: 800 },
  emptySub: { fontSize: "0.82rem", color: "var(--ip-gray)", maxWidth: 340, lineHeight: 1.6 },

  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 5, height: 34, padding: "0 14px", borderRadius: 999, border: "none", background: "var(--ip-teal)", color: "#fff", fontSize: "0.81rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: 5, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.81rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid var(--border)", background: "transparent", color: "var(--fg)", fontSize: "0.81rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  input: { width: "100%", height: 34, borderRadius: 8, border: "1px solid var(--border)", padding: "0 10px", fontSize: "0.83rem", background: "var(--bg)", color: "var(--fg)", outline: "none", boxSizing: "border-box" },

  toast: { display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", borderRadius: 9, fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 },
  toastOk: { background: "rgba(48,178,165,.1)", border: "1px solid var(--ip-teal)", color: "var(--ip-teal)" },
  toastErr: { background: "rgba(212,24,61,.08)", border: "1px solid var(--danger)", color: "var(--danger)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
};

const mx = {
  box: { width: "min(700px, 96vw)", maxHeight: "88vh", background: "var(--bg)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" },
  title: { fontSize: "0.94rem", fontWeight: 900 },
  sub: { fontSize: "0.76rem", color: "var(--ip-gray)", marginTop: 2 },
  close: { border: "1px solid var(--border)", background: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ip-gray)", flexShrink: 0 },
  tabs: { display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" },
  tabBtn: { display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 14px", borderWidth: 0, borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", background: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "var(--ip-gray)", marginBottom: -1 },
  tabBtnOn: { borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "var(--ip-teal)", color: "var(--ip-teal)" },
  body: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  footer: { padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 },
  catalogList: { display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto" },
  catalogRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
};

const bk = {
  toolbar: { display: "flex", alignItems: "center", gap: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12, flexWrap: "wrap" },
  checkAll: { display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", userSelect: "none" },
  applyRow: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" },
  tableWrap: { border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th: { background: "var(--bg-muted)", padding: "9px 11px", textAlign: "left", fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ip-gray)", borderBottom: "1px solid var(--border)" },
  td: { padding: "7px 11px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" },
  rowSel: { background: "rgba(48,178,165,.05)" },
  empty: { padding: "14px", color: "var(--ip-gray)", fontStyle: "italic", textAlign: "center" },
};