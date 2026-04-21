// src/pages/ModulesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Link2, RefreshCw, ChevronDown, ChevronRight, Wrench, Edit3, X } from "lucide-react";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const cleanStr = (x) => (x ?? "").toString().trim();

function displayLabelForSubject(s) {
  const mode = cleanStr(s?.semesterMode || s?.semester || "S1");
  if (mode === "S1S2") {
    const b = cleanStr(s?.baseLabel || s?.label || s?.name || "");
    return b || "—";
  }
  if (mode === "S2") return cleanStr(s?.labelS2 || s?.label || s?.name || "—");
  return cleanStr(s?.labelS1 || s?.label || s?.name || "—");
}

function parseModuleLine(line) {
  const raw = cleanStr(line);
  if (!raw) return { code: "", label: "" };
  const idx = raw.indexOf(":");
  if (idx === -1) return { code: raw, label: raw };
  const code = cleanStr(raw.slice(0, idx));
  const label = cleanStr(raw.slice(idx + 1));
  return { code, label: label || code };
}

export default function ModulesPage({ academicYear = "2025-2026" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [classId, setClassId] = useState("");

  const [newModuleLine, setNewModuleLine] = useState("");
  const [newModuleCredits, setNewModuleCredits] = useState("");

  const [pickedModuleCode, setPickedModuleCode] = useState("");
  const [selected, setSelected] = useState({});
  const [openModules, setOpenModules] = useState({});
  const [editingModule, setEditingModule] = useState(null);
  const [editForm, setEditForm] = useState({ label: "", credit: "" });

  const loadClasses = async () => {
    setLoadingClasses(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || `GET /classes (${res.status})`);
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Erreur chargement classes");
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadSubjectsForClass = async (cls) => {
    if (!cls) {
      setSubjects([]);
      return;
    }
    try {
      const qs = new URLSearchParams({ classId: cls.id, academicYear });
      const res = await fetch(`${API_BASE}/class-subjects?${qs}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || `GET /class-subjects (${res.status})`);
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Erreur chargement ECUE");
      setSubjects([]);
    }
  };

  const loadModulesForClass = async (cls) => {
    if (!cls) {
      setModules([]);
      return;
    }
    const qs = new URLSearchParams({
      filiere: cleanStr(cls.filiere),
      specialiteCode: cleanStr(cls.specialiteCode || cls.optionCode || ""),
      studyYear: String(cls.studyYear),
    });
    if (cls.cycle) qs.set("cycle", cleanStr(cls.cycle));
    try {
      const res = await fetch(`${API_BASE}/modules?${qs}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || `GET /modules (${res.status})`);
      setModules(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Erreur chargement UE");
      setModules([]);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [academicYear]);

  const pickedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);
  const classIdForSubjects = useMemo(() => pickedClass?.id || "", [pickedClass]);

  const subjectsWithoutModule = useMemo(() => {
    return subjects.filter((s) => !cleanStr(s.moduleCode));
  }, [subjects]);

  const ecuesByModule = useMemo(() => {
    const map = new Map();
    for (const s of subjects) {
      const moduleCode = cleanStr(s.moduleCode);
      if (!moduleCode) continue;
      if (!map.has(moduleCode)) map.set(moduleCode, []);
      map.get(moduleCode).push(s);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => displayLabelForSubject(a).localeCompare(displayLabelForSubject(b)));
      map.set(k, arr);
    }
    return map;
  }, [subjects]);

  const pickedModule = useMemo(
    () => modules.find((m) => cleanStr(m.code) === cleanStr(pickedModuleCode)) || null,
    [modules, pickedModuleCode]
  );

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;

  const allSelected = useMemo(() => {
    if (subjects.length === 0) return false;
    return selectedCount === subjects.length;
  }, [subjects.length, selectedCount]);

  useEffect(() => {
    setPickedModuleCode("");
    setSelected({});
    setOpenModules({});
    setEditingModule(null);
    if (!pickedClass) {
      setModules([]);
      setSubjects([]);
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadSubjectsForClass(pickedClass), loadModulesForClass(pickedClass)]);
      } catch (e) {
        setError(e.message || "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [classId]);

  const createModule = async () => {
    if (!pickedClass) return alert("Choisis d’abord une classe.");
    const { code, label } = parseModuleLine(newModuleLine);
    if (!code) return alert("Renseigne le module (ex: IGL232 : Outils Mathématiques IV).");

    const refCode = pickedClass.optionCode || pickedClass.specialiteCode || "";
    if (!refCode) {
      alert("La classe sélectionnée n’a pas de code de spécialité ou option. Vérifiez les données.");
      return;
    }

    const studyYearNum = Number(pickedClass.studyYear);
    if (isNaN(studyYearNum) || studyYearNum < 1 || studyYearNum > 5) {
      alert(`Année d'étude invalide : "${pickedClass.studyYear}". Doit être un nombre entre 1 et 5.`);
      return;
    }

    let credit = null;
    if (cleanStr(newModuleCredits) !== "") {
      const n = Number(String(newModuleCredits).replace(",", "."));
      if (Number.isNaN(n)) return alert("Crédits du module invalide.");
      credit = n;
    }

    setLoading(true);
    setError("");

    try {
      const body = {
        code,
        label,
        credit,
        filiere: pickedClass.filiere,
        specialite: pickedClass.specialite,
        specialiteCode: refCode,
        studyYear: studyYearNum,
        cycle: pickedClass.cycle || "",
      };

      const res = await fetch(`${API_BASE}/modules-admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `POST /modules-admin/create (${res.status})`);

      setNewModuleLine("");
      setNewModuleCredits("");
      await loadModulesForClass(pickedClass);
      setPickedModuleCode(code);
      setOpenModules((prev) => ({ ...prev, [code]: true }));
    } catch (e) {
      setError(e.message || "Erreur création UE");
      alert(e.message || "Erreur création UE");
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (checked) => {
    if (!checked) return setSelected({});
    const next = {};
    subjects.forEach((s) => {
      const id = cleanStr(s.id);
      if (id) next[id] = true;
    });
    setSelected(next);
  };

  const toggleOne = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const assign = async () => {
    if (!pickedClass) return alert("Choisis d’abord une classe.");
    const moduleCode = cleanStr(pickedModuleCode);
    if (!moduleCode) return alert("Choisis une UE.");
    if (selectedCount === 0) return alert("Sélectionne au moins un ECUE.");

    setLoading(true);
    setError("");

    try {
      const subjectIds = selectedIds
        .map((csId) => {
          const cs = subjects.find((s) => s.id === csId);
          return cs?.subjectId || null;
        })
        .filter(Boolean);

      if (subjectIds.length === 0) {
        throw new Error("Aucune ECUE valide sélectionnée (subjectId manquant)");
      }

      const classKey = `${pickedClass.filiere}::${pickedClass.specialiteCode || pickedClass.optionCode || ""}::${pickedClass.studyYear}::${pickedClass.cycle || ""}`;

      const res = await fetch(`${API_BASE}/modules-admin/assign-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleCode,
          moduleLabel: cleanStr(pickedModule?.label) || moduleCode,
          classKey,
          classId: classIdForSubjects,
          academicYear,
          subjectIds,
          filiere: pickedClass.filiere,
          specialiteCode: pickedClass.specialiteCode,
          studyYear: pickedClass.studyYear,
          cycle: pickedClass.cycle || "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `POST /modules-admin/assign-subjects (${res.status})`);

      setSelected({});
      await Promise.all([loadSubjectsForClass(pickedClass), loadModulesForClass(pickedClass)]);
      setOpenModules((prev) => ({ ...prev, [moduleCode]: true }));
    } catch (e) {
      setError(e.message || "Erreur affectation");
      alert(e.message || "Erreur affectation");
    } finally {
      setLoading(false);
    }
  };

  const rebuildUE = async () => {
    if (!pickedClass) return alert("Choisis d’abord une classe.");

    const classKey = `${pickedClass.filiere}::${pickedClass.specialiteCode || pickedClass.optionCode || ""}::${pickedClass.studyYear}::${pickedClass.cycle || ""}`;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/modules-admin/rebuild-from-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classKey }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `POST /modules-admin/rebuild-from-subjects (${res.status})`);
      await loadModulesForClass(pickedClass);
    } catch (e) {
      setError(e.message || "Erreur rebuild");
      alert(e.message || "Erreur rebuild");
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleOpen = (code) => {
    setOpenModules((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const startEditModule = (module) => {
    const classKey = `${pickedClass.filiere}::${pickedClass.specialiteCode || pickedClass.optionCode || ""}::${pickedClass.studyYear}::${pickedClass.cycle || ""}`;
    setEditingModule({ code: module.code, label: module.label, credit: module.credit, classKey });
    setEditForm({ label: module.label || "", credit: module.credit != null ? String(module.credit) : "" });
  };

  const saveEditModule = async () => {
    if (!editingModule) return;

    const newLabel = editForm.label.trim() || editingModule.code;
    const newCredit = editForm.credit !== "" ? Number(editForm.credit.replace(",", ".")) : null;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/modules-admin/${editingModule.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classKey: editingModule.classKey, label: newLabel, credit: newCredit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await Promise.all([loadModulesForClass(pickedClass), loadSubjectsForClass(pickedClass)]);
      setEditingModule(null);
      setEditForm({ label: "", credit: "" });
    } catch (e) {
      alert(e.message || "Erreur lors de la modification du module");
    } finally {
      setLoading(false);
    }
  };

  const cancelEditModule = () => {
    setEditingModule(null);
    setEditForm({ label: "", credit: "" });
  };

  return (
    <div style={{ fontFamily: "var(--font-family)", color: "var(--fg)" }}>
      <div style={containerStyle}>
        {/* Class picker */}
        <section style={card.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
            <div>
              <h1 style={card.title}>UE / Modules (par classe)</h1>
              <p style={card.sub}>
                La classe est construite comme dans <b>MatieresPage</b> (filière + spécialité + niveau + cycle).
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={btnGhost} onClick={loadClasses} disabled={loadingClasses}>
                <RefreshCw size={16} /> {loadingClasses ? "Chargement..." : "Rafraîchir"}
              </button>
              <button style={btnGhost} onClick={rebuildUE} disabled={loading || !pickedClass} title="Reconstruire les UE depuis les ECUE déjà affectées">
                <Wrench size={16} /> Rebuild UE
              </button>
            </div>
          </div>

          {error && (
            <div style={errorBox}>
              <b>Erreur :</b> {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Classe *</label>
              <select style={input} value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingClasses}>
                <option value="">— Choisir une classe —</option>
                {loadingClasses ? (
                  <option value="">Chargement classes…</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.abbrev || c.id}
                    </option>
                  ))
                )}
              </select>
              {classes.length === 0 && !loadingClasses && (
                <div style={{ marginTop: 8, fontSize: ".82rem", color: "#6B7280" }}>
                  Aucune classe trouvée pour l’année {academicYear}.
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "end" }}>
              <div style={pill}>
                {pickedClass ? (
                  <>
                    <b>{pickedClass.specialiteCode}</b> · {pickedClass.specialite} · N{pickedClass.studyYear}
                    {pickedClass.cycle ? ` · ${pickedClass.cycle}` : ""} · {subjects.length} ECUE · {modules.length} UE
                  </>
                ) : (
                  "Choisis une classe"
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Create module */}
        <section style={card.card}>
          <h2 style={card.h2}>Créer une UE (Module)</h2>
          <p style={card.sub}>
            Saisis le module sous la forme <b>CODE : Intitulé</b>. Pas besoin d’un champ “intitulé” séparé.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: 10, marginTop: 12 }}>
            <input
              style={input}
              placeholder="Ex: IGL232 : Outils Mathématiques IV"
              value={newModuleLine}
              onChange={(e) => setNewModuleLine(e.target.value)}
              disabled={!pickedClass || loading}
            />
            <input
              style={input}
              placeholder="Crédits (ex: 4)"
              value={newModuleCredits}
              onChange={(e) => setNewModuleCredits(e.target.value)}
              disabled={!pickedClass || loading}
            />
            <button style={btnPrimary} onClick={createModule} disabled={!pickedClass || loading}>
              <Plus size={16} /> Créer
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: ".78rem", color: "#6B7280" }}>
            Astuce : si tu écris juste <b>IGL232</b> (sans “:”), l’intitulé sera automatiquement “IGL232”.
          </div>
        </section>

        {/* Modules list */}
        <section style={card.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
            <div>
              <h2 style={card.h2}>Modules (UE) et leurs ECUE</h2>
              <p style={card.sub}>Le module est affiché en “bloc”, puis les ECUE en dessous.</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                style={{ ...input, minWidth: 360 }}
                value={pickedModuleCode}
                onChange={(e) => setPickedModuleCode(e.target.value)}
                disabled={!pickedClass || loading}
              >
                <option value="">— Choisir UE pour affectation —</option>
                {modules.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code} — {m.label} ({m.credit || 0} cr)
                  </option>
                ))}
              </select>
              <button
                style={btnPrimary}
                onClick={assign}
                disabled={!pickedClass || loading || !pickedModuleCode}
                title="Affecter les ECUE sélectionnées à l’UE choisie"
              >
                <Link2 size={16} /> Affecter ({selectedCount})
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: ".85rem" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                disabled={!pickedClass || loading || subjects.length === 0}
              />
              <span>Tout sélectionner (ECUE de la classe : {subjects.length})</span>
            </label>
          </div>

          {/* Modules */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {modules.length === 0 ? (
              <div style={{ padding: 12, color: "#6B7280", border: `1px dashed ${colors.border}`, borderRadius: 12 }}>
                {pickedClass ? "Aucune UE pour cette classe. Crée une UE ci-dessus (ou Rebuild UE)." : "Choisis une classe."}
              </div>
            ) : (
              modules.map((m) => {
                const mCode = cleanStr(m.code);
                const mLabel = cleanStr(m.label) || mCode;
                const isOpen = !!openModules[mCode];
                const ecues = ecuesByModule.get(mCode) || [];
                const sumCredits = ecues.reduce((acc, s) => {
                  const c = Number(s?.credits ?? 0);
                  return acc + (Number.isNaN(c) ? 0 : c);
                }, 0);
                const creditShown = m?.credit != null && String(m.credit) !== "" ? Number(m.credit) : sumCredits;

                return (
                  <div key={mCode} style={moduleCard.card}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleModuleOpen(mCode)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleModuleOpen(mCode); }}
                      style={moduleCard.headerRow}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={moduleCard.chev}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={moduleCard.titleRow}>
                            <span style={moduleCard.code}>{mCode}</span>
                            <span style={moduleCard.sep}>:</span>
                            <span style={moduleCard.label}>{mLabel}</span>
                          </div>
                          <div style={moduleCard.meta}>
                            <b>{creditShown || 0} crédits</b>
                            <span style={moduleCard.dot}>•</span>
                            <span>{ecues.length} ECUE</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" style={chipBtn} onClick={(e) => { e.stopPropagation(); startEditModule(m); }} title="Modifier le module">
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          style={{ ...chipBtn, ...(pickedModuleCode === mCode ? chipBtnActive : null) }}
                          onClick={(e) => { e.stopPropagation(); setPickedModuleCode(mCode); setOpenModules((prev) => ({ ...prev, [mCode]: true })); }}
                          title="Sélectionner cette UE pour affectation"
                        >
                          {pickedModuleCode === mCode ? "UE sélectionnée" : "Sélectionner UE"}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={moduleCard.body}>
                        {ecues.length === 0 ? (
                          <div style={moduleCard.empty}>Aucune ECUE affectée pour le moment.</div>
                        ) : (
                          <table style={moduleCard.table}>
                            <thead>
                              <tr>
                                <th style={moduleCard.thSel}>Sel</th>
                                <th style={moduleCard.th}>Code</th>
                                <th style={moduleCard.th}>ECUE</th>
                                <th style={moduleCard.thCenter}>Crédits</th>
                                <th style={moduleCard.thCenter}>Semestre</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ecues.map((s) => {
                                const id = cleanStr(s.id);
                                const label = displayLabelForSubject(s);
                                const credits = s?.credits ?? "—";
                                const sem = cleanStr(s?.semesterMode || s?.semester || "S1");
                                const code = cleanStr(s.codeOverride || s.code || "—");
                                return (
                                  <tr key={id}>
                                    <td style={moduleCard.tdCenter}>
                                      <input type="checkbox" checked={!!selected[id]} onChange={() => toggleOne(id)} />
                                    </td>
                                    <td style={{ ...moduleCard.td, fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: ".78rem", whiteSpace: "nowrap" }}>{code}</td>
                                    <td style={moduleCard.td}>{label}</td>
                                    <td style={moduleCard.tdCenter}>{credits}</td>
                                    <td style={moduleCard.tdCenter}>{sem === "S1S2" ? "S1 & S2" : sem}</td>
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
              })
            )}
          </div>

          {/* SECTION ECUE SANS UE */}
          {pickedClass && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontSize: ".9rem", fontWeight: 900 }}>
                  ECUE non affectées à une UE <span style={{ color: "#64748B" }}>({subjectsWithoutModule.length})</span>
                </div>
                <div style={{ fontSize: ".78rem", color: "#64748B" }}>
                  Sélectionne des ECUE ici puis clique <b>Affecter</b>.
                </div>
              </div>
              <div style={{ marginTop: 8, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      <th style={thCenter}>Sel</th>
                      <th style={th}>Code</th>
                      <th style={th}>ECUE</th>
                      <th style={thCenter}>Crédits</th>
                      <th style={thCenter}>Semestre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectsWithoutModule.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 12, color: "#6B7280" }}>
                          Toutes les ECUE de cette classe sont déjà affectées à une UE.
                        </td>
                      </tr>
                    ) : (
                      subjectsWithoutModule.map((s) => {
                        const id = cleanStr(s.id);
                        const label = displayLabelForSubject(s);
                        const credits = s?.credits ?? "—";
                        const sem = cleanStr(s?.semesterMode || s?.semester || "S1");
                        const code = cleanStr(s.codeOverride || s.code || "—");
                        return (
                          <tr key={id}>
                            <td style={tdCenter}>
                              <input type="checkbox" checked={!!selected[id]} onChange={() => toggleOne(id)} />
                            </td>
                            <td style={{ ...td, fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: ".78rem" }}>{code}</td>
                            <td style={td}><b>{label}</b></td>
                            <td style={tdCenter}>{credits}</td>
                            <td style={tdCenter}>{sem === "S1S2" ? "S1 & S2" : sem}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal d'édition de module */}
      {editingModule && (
        <div style={modalStyles.overlay} onClick={cancelEditModule}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>Modifier le module</h3>
              <button style={modalStyles.closeBtn} onClick={cancelEditModule}><X size={18} /></button>
            </div>
            <div style={modalStyles.body}>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Code (non modifiable)</label>
                <input style={modalStyles.input} value={editingModule.code} disabled />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Intitulé</label>
                <input style={modalStyles.input} value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} placeholder="Intitulé du module" />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Crédits (optionnel)</label>
                <input type="number" step="0.5" style={modalStyles.input} value={editForm.credit} onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })} placeholder="Ex: 4" />
              </div>
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.btnSecondary} onClick={cancelEditModule}>Annuler</button>
              <button style={modalStyles.btnPrimary} onClick={saveEditModule} disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ————————————————————— STYLES (adaptés pour le layout global) ————————————————————— */
const containerStyle = {
  maxWidth: "1600px",
  margin: "0 auto",
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const card = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
  },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800 },
  h2: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  sub: { margin: "6px 0 0", color: "var(--ip-gray)", fontSize: ".85rem" },
};

const labelStyle = { display: "block", fontSize: ".8rem", fontWeight: 700, marginBottom: 6 };

const input = {
  width: "100%",
  height: 38,
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.border,
  padding: "0 .7rem",
  fontSize: ".85rem",
  background: "var(--bg-input, #F9FAFB)",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "none",
  background: "#00b89c",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 38,
  padding: "0 12px",
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.border,
  background: "transparent",
  cursor: "pointer",
  fontWeight: 800,
};

const chipBtn = {
  height: 32,
  padding: "0 12px",
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.border,
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: ".8rem",
};

const chipBtnActive = {
  borderColor: "#00b89c",
  background: "#ECFDF5",
};

const pill = {
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 12px",
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.border,
  background: "#F9FAFB",
  fontSize: ".85rem",
  color: "#374151",
};

const errorBox = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#FCA5A5",
  background: "#FEF2F2",
  color: "#7F1D1D",
  fontSize: ".85rem",
};

const th = { textAlign: "left", padding: "10px 10px", borderBottom: `1px solid ${colors.border}` };
const thCenter = { ...th, textAlign: "center", width: 70 };
const td = { padding: "8px 10px", borderBottom: "1px solid #E5E7EB" };
const tdCenter = { ...td, textAlign: "center" };

const moduleCard = {
  card: { borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: colors.border, background: "#fff", overflow: "hidden" },
  headerRow: { width: "100%", background: "#F8FAFC", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px", textAlign: "left", userSelect: "none" },
  chev: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderStyle: "solid", borderColor: colors.border, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#0F172A", flex: "0 0 auto" },
  titleRow: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", lineHeight: 1.2 },
  code: { fontWeight: 900, fontSize: ".95rem", color: "#0F172A", background: "#ECFEFF", borderWidth: 1, borderStyle: "solid", borderColor: "#A5F3FC", padding: "2px 8px", borderRadius: 999 },
  sep: { fontWeight: 900, color: "#334155" },
  label: { fontWeight: 800, color: "#0F172A" },
  meta: { marginTop: 4, fontSize: ".8rem", color: "#475569", display: "flex", alignItems: "center", gap: 8 },
  dot: { color: "#94A3B8" },
  body: { padding: "10px 12px", background: "#fff" },
  empty: { padding: 10, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, background: "#FAFAFA", color: "#6B7280", fontSize: ".85rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  thSel: { textAlign: "center", padding: "8px 8px", borderBottom: "1px solid #E5E7EB", width: 60 },
  th: { textAlign: "left", padding: "8px 8px", borderBottom: "1px solid #E5E7EB" },
  thCenter: { textAlign: "center", padding: "8px 8px", borderBottom: "1px solid #E5E7EB", width: 110 },
  td: { padding: "8px 8px", borderBottom: "1px solid #F1F5F9" },
  tdCenter: { padding: "8px 8px", borderBottom: "1px solid #F1F5F9", textAlign: "center" },
};

const modalStyles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 },
  modal: { background: "#fff", borderRadius: 12, width: "min(500px, 90vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 35px rgba(0,0,0,0.2)" },
  header: { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 6, color: "#6B7280" },
  body: { padding: "16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".8rem", fontWeight: 700, color: "#374151" },
  input: { width: "100%", height: 38, borderRadius: 8, border: "1px solid #D1D5DB", padding: "0 10px", fontSize: ".85rem", outline: "none", background: "#fff" },
  footer: { padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", gap: 8 },
  btnSecondary: { height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", cursor: "pointer", fontWeight: 700 },
  btnPrimary: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#00b89c", color: "#fff", cursor: "pointer", fontWeight: 700 },
};