// src/pages/ModulesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { Plus, Link2, RefreshCw, ChevronDown, ChevronRight, Wrench } from "lucide-react";
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

// ✅ clé "classe/salle" comme MatieresPage
function classKeyFromSubject(s) {
  const filiere = cleanStr(s?.filiere);
  const specialiteCode = cleanStr(s?.specialiteCode);
  const studyYear = String(s?.studyYear ?? "");
  const cycle = cleanStr(s?.cycle);
  return `${filiere}::${specialiteCode}::${studyYear}::${cycle}`;
}

// ✅ parse "IGL232 : Outils Mathématiques IV"
function parseModuleLine(line) {
  const raw = cleanStr(line);
  if (!raw) return { code: "", label: "" };

  const idx = raw.indexOf(":");
  if (idx === -1) return { code: raw, label: raw };

  const code = cleanStr(raw.slice(0, idx));
  const label = cleanStr(raw.slice(idx + 1));
  return { code, label: label || code };
}

export default function ModulesPage({ currentSection = "modules", onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ subjects pour construire les classes et afficher ECUE
  const [subjects, setSubjects] = useState([]);

  // ✅ modules (UE) pour la classe sélectionnée
  const [modules, setModules] = useState([]);

  // ✅ sélection classe
  const [classId, setClassId] = useState("");

  // ✅ création module
  const [newModuleLine, setNewModuleLine] = useState("");
  const [newModuleCredits, setNewModuleCredits] = useState("");

  // ✅ affectation
  const [pickedModuleCode, setPickedModuleCode] = useState("");
  const [selected, setSelected] = useState({}); // { subjectId: true }

  // ✅ UI: modules expand/collapse
  const [openModules, setOpenModules] = useState({}); // { moduleCode: true }

  /* ───────────────────────── DERIVED ───────────────────────── */

  // classes fabriquées comme MatieresPage
  const classes = useMemo(() => {
    const map = new Map();

    for (const s of subjects) {
      const filiere = cleanStr(s?.filiere) || "Filière ?";
      const specialite = cleanStr(s?.specialite) || "Spécialité ?";
      const specialiteCode = cleanStr(s?.specialiteCode) || "???";
      const studyYear = Number(s?.studyYear ?? 1);
      const cycle = cleanStr(s?.cycle) || "";

      const key = `${filiere}::${specialiteCode}::${studyYear}::${cycle}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          filiere,
          specialite,
          specialiteCode,
          studyYear,
          cycle,
          label: `${specialiteCode} — ${specialite} (N${studyYear}${cycle ? ` · ${cycle}` : ""})`,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.filiere.localeCompare(b.filiere) ||
        a.specialiteCode.localeCompare(b.specialiteCode) ||
        String(a.studyYear).localeCompare(String(b.studyYear)) ||
        a.cycle.localeCompare(b.cycle)
    );
  }, [subjects]);

  const pickedClass = useMemo(
    () => classes.find((c) => c.id === classId) || null,
    [classes, classId]
  );

  // subjects de la classe
  const subjectsForClass = useMemo(() => {
    if (!classId) return [];
    return subjects
      .filter((s) => classKeyFromSubject(s) === classId)
      .slice()
      .sort((a, b) => displayLabelForSubject(a).localeCompare(displayLabelForSubject(b)));
  }, [subjects, classId]);

  // ✅ ECUE non affectées (on veut TOUJOURS les voir)
  const subjectsWithoutModule = useMemo(() => {
    return subjectsForClass.filter((s) => !cleanStr(s?.moduleCode));
  }, [subjectsForClass]);

  // map moduleCode -> ecues (subjects)
  const ecuesByModule = useMemo(() => {
    const map = new Map();
    for (const s of subjectsForClass) {
      const moduleCode = cleanStr(s?.moduleCode);
      if (!moduleCode) continue;
      if (!map.has(moduleCode)) map.set(moduleCode, []);
      map.get(moduleCode).push(s);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => displayLabelForSubject(a).localeCompare(displayLabelForSubject(b)));
      map.set(k, arr);
    }
    return map;
  }, [subjectsForClass]);

  const pickedModule = useMemo(
    () => modules.find((m) => cleanStr(m.code) === cleanStr(pickedModuleCode)) || null,
    [modules, pickedModuleCode]
  );

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;

  const allSelected = useMemo(() => {
    if (subjectsForClass.length === 0) return false;
    return selectedCount === subjectsForClass.length;
  }, [subjectsForClass.length, selectedCount]);

  /* ───────────────────────── LOADERS ───────────────────────── */

  const loadSubjects = async () => {
    const res = await fetch(`${API_BASE}/subjects`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.error || `GET /subjects (${res.status})`);
    setSubjects(Array.isArray(data) ? data : []);
  };

  const loadModulesForClass = async (cls) => {
    if (!cls) {
      setModules([]);
      return;
    }

    const qs = new URLSearchParams();
    qs.set("filiere", cleanStr(cls.filiere));
    qs.set("specialiteCode", cleanStr(cls.specialiteCode));
    qs.set("studyYear", String(cls.studyYear));
    if (cls.cycle) qs.set("cycle", cleanStr(cls.cycle));

    const res = await fetch(`${API_BASE}/modules?${qs.toString()}`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.error || `GET /modules (${res.status})`);
    setModules(Array.isArray(data) ? data : []);
  };

  const reloadAll = async () => {
    setLoading(true);
    setError("");
    try {
      await loadSubjects();
    } catch (e) {
      setError(e.message || "Erreur chargement matières");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // reset UI selections when class changes
    setPickedModuleCode("");
    setSelected({});
    setOpenModules({});

    if (!pickedClass) {
      setModules([]);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadModulesForClass(pickedClass);
      } catch (e) {
        setError(e.message || "Erreur chargement UE");
        setModules([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  /* ───────────────────────── ACTIONS ───────────────────────── */

  const createModule = async () => {
    if (!pickedClass) return alert("Choisis d’abord une classe.");

    const { code, label } = parseModuleLine(newModuleLine);
    if (!code) return alert("Renseigne le module (ex: IGL232 : Outils Mathématiques IV).");

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
        specialiteCode: pickedClass.specialiteCode,
        studyYear: pickedClass.studyYear,
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
    subjectsForClass.forEach((s) => {
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
      const res = await fetch(`${API_BASE}/modules-admin/assign-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleCode,
          moduleLabel: cleanStr(pickedModule?.label) || moduleCode,
          classKey: classId,
          subjectIds: selectedIds,

          filiere: pickedClass.filiere,
          specialiteCode: pickedClass.specialiteCode,
          studyYear: pickedClass.studyYear,
          cycle: pickedClass.cycle || "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `POST /modules-admin/assign-subjects (${res.status})`);

      setSelected({});

      await loadModulesForClass(pickedClass);
      await loadSubjects();
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

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/modules-admin/rebuild-from-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classKey: classId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `POST /modules-admin/rebuild-from-subjects (${res.status})`);

      // refresh after rebuild
      await loadModulesForClass(pickedClass);
      await loadSubjects();
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

  /* ───────────────────────── UI ───────────────────────── */

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />

        <div style={styles.pageBody}>
          <div style={styles.container}>
            {/* ───────── Class picker ───────── */}
            <section style={card.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
                <div>
                  <h1 style={card.title}>UE / Modules (par classe)</h1>
                  <p style={card.sub}>
                    La classe est construite comme dans <b>MatieresPage</b> (filière + spécialité + niveau + cycle).
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button style={btnGhost} onClick={reloadAll} disabled={loading}>
                    <RefreshCw size={16} /> {loading ? "Chargement..." : "Rafraîchir"}
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
                  <select style={input} value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loading}>
                    <option value="">— Choisir une classe —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {classes.length === 0 && !loading && (
                    <div style={{ marginTop: 8, fontSize: ".82rem", color: "#6B7280" }}>
                      Aucune classe trouvée car aucune matière n’a (filière + spécialité + niveau).
                      <br />
                      👉 Va d’abord dans <b>Matières</b> et ajoute au moins 1 ECUE avec filiere/specialiteCode/studyYear.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "end" }}>
                  <div style={pill}>
                    {pickedClass ? (
                      <>
                        <b>{pickedClass.specialiteCode}</b> · {pickedClass.specialite} · N{pickedClass.studyYear}
                        {pickedClass.cycle ? ` · ${pickedClass.cycle}` : ""} · {subjectsForClass.length} ECUE · {modules.length} UE
                      </>
                    ) : (
                      "Choisis une classe"
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ───────── Create module ───────── */}
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

            {/* ───────── Modules list ───────── */}
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
                    disabled={!pickedClass || loading || subjectsForClass.length === 0}
                  />
                  <span>Tout sélectionner (ECUE de la classe : {subjectsForClass.length})</span>
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

                    const creditShown =
                      m?.credit != null && String(m.credit) !== ""
                        ? Number(m.credit)
                        : sumCredits;

                    return (
                      <div key={mCode} style={moduleCard.card}>
                        {/* ✅ PLUS DE <button> qui contient un <button> */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleModuleOpen(mCode)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") toggleModuleOpen(mCode);
                          }}
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

                          <button
                            type="button"
                            style={{
                              ...chipBtn,
                              ...(pickedModuleCode === mCode ? chipBtnActive : null),
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPickedModuleCode(mCode);
                              setOpenModules((prev) => ({ ...prev, [mCode]: true }));
                            }}
                            title="Sélectionner cette UE pour affectation"
                          >
                            {pickedModuleCode === mCode ? "UE sélectionnée" : "Sélectionner UE"}
                          </button>
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

                                    return (
                                      <tr key={id}>
                                        <td style={moduleCard.tdCenter}>
                                          <input
                                            type="checkbox"
                                            checked={!!selected[id]}
                                            onChange={() => toggleOne(id)}
                                          />
                                        </td>
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

              {/* ✅ SECTION ECUE SANS UE — TOUJOURS AFFICHÉE */}
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
                          <th style={th}>ECUE</th>
                          <th style={thCenter}>Crédits</th>
                          <th style={thCenter}>Semestre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectsWithoutModule.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: 12, color: "#6B7280" }}>
                              Toutes les ECUE de cette classe sont déjà affectées à une UE.
                            </td>
                          </tr>
                        ) : (
                          subjectsWithoutModule.map((s) => {
                            const id = cleanStr(s.id);
                            const label = displayLabelForSubject(s);
                            const credits = s?.credits ?? "—";
                            const sem = cleanStr(s?.semesterMode || s?.semester || "S1");

                            return (
                              <tr key={id}>
                                <td style={tdCenter}>
                                  <input type="checkbox" checked={!!selected[id]} onChange={() => toggleOne(id)} />
                                </td>
                                <td style={td}>
                                  <b>{label}</b>
                                </td>
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
        </div>
      </main>
    </div>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const styles = {
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
    gap: "1.5rem",
  },
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

/* ✅ Module card style */
const moduleCard = {
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    background: "#fff",
    overflow: "hidden",
  },
  headerRow: {
    width: "100%",
    background: "#F8FAFC",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 12px",
    textAlign: "left",
    userSelect: "none",
  },
  chev: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    color: "#0F172A",
    flex: "0 0 auto",
  },
  titleRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
    lineHeight: 1.2,
  },
  code: {
    fontWeight: 900,
    fontSize: ".95rem",
    color: "#0F172A",
    background: "#ECFEFF",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#A5F3FC",
    padding: "2px 8px",
    borderRadius: 999,
  },
  sep: { fontWeight: 900, color: "#334155" },
  label: { fontWeight: 800, color: "#0F172A" },
  meta: {
    marginTop: 4,
    fontSize: ".8rem",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: { color: "#94A3B8" },
  body: { padding: "10px 12px", background: "#fff" },
  empty: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    background: "#FAFAFA",
    color: "#6B7280",
    fontSize: ".85rem",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".85rem" },
  thSel: { textAlign: "center", padding: "8px 8px", borderBottom: "1px solid #E5E7EB", width: 60 },
  th: { textAlign: "left", padding: "8px 8px", borderBottom: "1px solid #E5E7EB" },
  thCenter: { textAlign: "center", padding: "8px 8px", borderBottom: "1px solid #E5E7EB", width: 110 },
  td: { padding: "8px 8px", borderBottom: "1px solid #F1F5F9" },
  tdCenter: { padding: "8px 8px", borderBottom: "1px solid #F1F5F9", textAlign: "center" },
};