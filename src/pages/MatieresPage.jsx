// // src/pages/MatieresPage.jsx
// import { useEffect, useMemo, useRef, useState } from "react";
// import VerticalNavBar from "../components/VerticalNavBar.jsx";
// import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
// import { BookOpen, Plus, Edit, Trash2, Hash } from "lucide-react";
// import { colors } from "../styles/theme";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// /* ───────── Dictionnaires ───────── */
// const DICT = {
//   "Filières de gestion": {
//     type: "gestion",
//     specialites: [
//       ["Comptabilité et Gestion des Entreprises", "CGE"],
//       ["Administration des Collectivités Territoriales", "ACT"],
//       ["Gestion des ONG", "ONG"],
//       ["Gestion de Projets", "GPR"],
//       ["Gestion des Ressources Humaines", "GRH"],
//       ["Assistant Manager", "AMA"],
//       ["Banque et Finance", "BAF"],
//       ["Marketing – Commerce – Vente", "MCV"],
//       ["Commerce International", "CIN"],
//       ["Gestion Logistique et Transport", "GLT"],
//       ["Statistiques", "STA"],
//       ["Douane et Transit", "DTR"],
//       ["Comptabilité – Contrôle – Audit", "CCA"],
//       ["Finance – Comptabilité", "FIC"],
//       ["Banque – Finance et Assurance", "BFA"],
//       ["Marketing et Communication Digitale", "MCD"],
//       ["Marketing – Management Opérationnel", "MMO"],
//       ["Management des Organisations", "MOR"],
//       ["Management de la Qualité", "MAQ"],
//       ["Management des Projets", "MPR"],
//     ],
//   },
//   "Filières carrières juridiques": {
//     type: "juridique",
//     specialites: [
//       ["Droit Foncier et Domanial", "DFD"],
//       ["Professions Immobilières", "PRI"],
//       ["Douane et Transit", "DTR"],
//       ["Droit des Affaires et de l’Entreprise", "DAE"],
//     ],
//   },
//   "Filières industrielles": {
//     type: "industriel",
//     specialites: [
//       ["Génie Civil", ""],
//       ["Génie Informatique", ""],
//       ["Télécommunication", ""],
//       ["Génie Mécanique", ""],
//       ["Génie Thermique", ""],
//       ["Génie Électrique", ""],
//     ],
//     optionsBySpecialite: {
//       "Génie Civil": [
//         ["Bâtiment", "BAT"],
//         ["Travaux Publics", "TPU"],
//         ["Géomètre Topographe", "GTP"],
//         ["Installation Sanitaire", "INS"],
//       ],
//       "Génie Informatique": [
//         ["Génie Logiciel", "GLI"],
//         ["E-Commerce et Marketing Numérique", "ECM"],
//         ["Gestion des Systèmes Informatiques", "GSI"],
//         ["Informatique Industrielle et Automatisme", "IIA"],
//       ],
//       Télécommunication: [
//         ["Télécommunication", "TEL"],
//         ["Réseau et Sécurité", "RES"],
//       ],
//       "Génie Mécanique": [
//         ["Chaudronnerie et Soudure", "CHS"],
//         ["Fabrication Mécanique", "FBM"],
//         ["Mécatronique", "MEC"],
//         ["Maintenance Systèmes Industriels", "MSI"],
//         ["Électromécanique", "ELM"],
//       ],
//       "Génie Thermique": [
//         ["Énergies Renouvelables", "ENR"],
//         ["Froid et Climatisation", "FRC"],
//       ],
//       "Génie Électrique": [
//         ["Maintenance Appareils Biomédicaux", "MAB"],
//         ["Électrotechnique", "ELT"],
//       ],
//     },
//   },
// };

// const CYCLE_RULES = {
//   BTS: [1, 2],
//   LICENCE: [3],
//   MASTER: [4, 5],
//   "INGÉNIEUR": [1, 2, 3, 4, 5],
// };

// const getUELabel = (s) => (s?.ueLabel || s?.label || s?.name || "").toString();

// function cleanStr(x) {
//   return (x ?? "").toString().trim();
// }
// function normalizeKey(str) {
//   return cleanStr(str)
//     .toLowerCase()
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "");
// }

// /* ─────────────────────────── Page ─────────────────────────── */
// export default function MatieresPage({ currentSection = "matieres", onNavigate }) {
//   const [subjects, setSubjects] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // ✅ catalogue (codes) mais on ne l'affiche plus en table séparée
//   const [catalog, setCatalog] = useState([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);
//   const [openCatalogModal, setOpenCatalogModal] = useState(false);

//   const [openModal, setOpenModal] = useState(false);
//   const [editing, setEditing] = useState(null);

//   const loadSubjects = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/subjects`);
//       const data = await res.json();
//       setSubjects(Array.isArray(data) ? data : []);
//     } catch (e) {
//       console.error("Erreur chargement matières :", e);
//       setSubjects([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadCatalog = async () => {
//     setLoadingCatalog(true);
//     try {
//       const res = await fetch(`${API_BASE}/subjects/catalog`);
//       const data = await res.json();
//       setCatalog(Array.isArray(data) ? data : []);
//     } catch (e) {
//       console.error("Erreur chargement catalogue :", e);
//       setCatalog([]);
//     } finally {
//       setLoadingCatalog(false);
//     }
//   };

//   useEffect(() => {
//     loadSubjects();
//     loadCatalog();
//   }, []);

//   // Map pour retrouver le code par (label + year + cycle)
//   // Règle:
//   // - si cycle exact trouvé => on affiche
//   // - sinon fallback sur cycle "ANY" (catalog.cycle null) si existant
//   const catalogMap = useMemo(() => {
//     const map = new Map();
//     for (const r of Array.isArray(catalog) ? catalog : []) {
//       const labelK = normalizeKey(r.label);
//       const y = Number(r.studyYear);
//       const cyc = r.cycle ? normalizeKey(r.cycle) : "any";
//       if (!labelK || Number.isNaN(y)) continue;
//       const key = `${labelK}__${y}__${cyc}`;
//       map.set(key, cleanStr(r.code));
//     }
//     return map;
//   }, [catalog]);

//   const getCodeForSubject = (s) => {
//     const label = getUELabel(s);
//     const y = Number(s.studyYear);
//     const cyc = cleanStr(s.cycle);

//     const labelK = normalizeKey(label);
//     if (!labelK || Number.isNaN(y)) return "";

//     if (cyc) {
//       const kExact = `${labelK}__${y}__${normalizeKey(cyc)}`;
//       const exact = catalogMap.get(kExact);
//       if (exact) return exact;
//     }

//     const kAny = `${labelK}__${y}__any`;
//     return catalogMap.get(kAny) || "";
//   };

//   const groupedBySalle = useMemo(() => {
//     const map = new Map();
//     for (const s of subjects) {
//       const filiere = s.filiere || "Filière non définie";
//       const salleCode = s.specialiteCode || "???";
//       const specLabel = s.specialite || "Spécialité ?";
//       const level = s.studyYear || 1;
//       const cycle = s.cycle || "";
//       const key = `${filiere}::${salleCode}::${level}`;

//       if (!map.has(key)) {
//         map.set(key, { key, filiere, salleCode, specialite: specLabel, level, cycle, subjects: [] });
//       }
//       map.get(key).subjects.push(s);
//     }

//     return Array.from(map.values()).sort(
//       (a, b) =>
//         a.filiere.localeCompare(b.filiere) ||
//         a.salleCode.localeCompare(b.salleCode) ||
//         String(a.level).localeCompare(String(b.level))
//     );
//   }, [subjects]);

//   const handleCreate = () => {
//     setEditing(null);
//     setOpenModal(true);
//   };

//   const handleEdit = (subject) => {
//     setEditing(subject);
//     setOpenModal(true);
//   };

//   const handleDelete = async (subject) => {
//     const label = getUELabel(subject) || "sans titre";
//     if (!window.confirm(`Supprimer la matière "${label}" ?`)) return;

//     try {
//       const res = await fetch(`${API_BASE}/subjects/${subject.id}`, { method: "DELETE" });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) throw new Error(data.error || "Échec de la suppression");
//       await loadSubjects();
//     } catch (e) {
//       alert(e.message || "Erreur lors de la suppression");
//     }
//   };

//   const handleSave = async (payload) => {
//     const common = {
//       filiere: payload.filiere,
//       specialite: payload.specialite,
//       specialiteCode: payload.specialiteCode,
//       option: payload.option || null,
//       optionCode: payload.optionCode || null,
//       studyYear: payload.studyYear,
//       cycle: payload.cycle || null,
//       isOptional: payload.isOptional === true,
//     };

//     try {
//       // EDIT
//       if (payload.id) {
//         const ue = (payload.ueTitle || "").trim();

//         const body = {
//           ...common,
//           ueLabel: ue,
//           name: ue,
//           label: ue,

//           ecTitle: payload.ecTitle || null,
//           credits: payload.credits != null ? payload.credits : null,
//           coefficient: payload.coefficient != null ? payload.coefficient : null,
//         };

//         const res = await fetch(`${API_BASE}/subjects/${payload.id}`, {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(body),
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

//         setOpenModal(false);
//         setEditing(null);
//         await loadSubjects();
//         return;
//       }

//       // CREATE BULK UE
//       if (payload.mode === "bulkUE") {
//         const ueTitles = (payload.ueTitles || []).map((t) => (t || "").trim()).filter(Boolean);
//         if (ueTitles.length === 0) throw new Error("Ajoutez au moins une UE.");

//         for (const title of ueTitles) {
//           const body = {
//             ...common,
//             ueLabel: title,
//             name: title,
//             label: title,

//             ecTitle: null,
//             credits: null,
//             coefficient: null,
//           };

//           const res = await fetch(`${API_BASE}/subjects`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(body),
//           });
//           const data = await res.json();
//           if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");
//         }

//         setOpenModal(false);
//         setEditing(null);
//         await loadSubjects();
//         return;
//       }

//       // CREATE SINGLE
//       const ue = (payload.ueTitle || "").trim();
//       const body = {
//         ...common,
//         ueLabel: ue,
//         name: ue,
//         label: ue,

//         ecTitle: payload.ecTitle || null,
//         credits: payload.credits != null ? payload.credits : null,
//         coefficient: payload.coefficient != null ? payload.coefficient : null,
//       };

//       const res = await fetch(`${API_BASE}/subjects`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

//       setOpenModal(false);
//       setEditing(null);
//       await loadSubjects();
//     } catch (e) {
//       alert(e.message || "Erreur lors de l’enregistrement");
//     }
//   };

//   const handleSaveCatalogBulk = async (items) => {
//     try {
//       const res = await fetch(`${API_BASE}/subjects/catalog/bulk`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ items }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement du catalogue");
//       await loadCatalog();
//       setOpenCatalogModal(false);
//     } catch (e) {
//       alert(e.message || "Erreur lors de l’enregistrement du catalogue");
//     }
//   };

//   return (
//     <div style={styles.layout}>
//       <aside style={styles.left}>
//         <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
//       </aside>

//       <main style={styles.right}>
//         <HorizontalNavBar />
//         <div style={styles.pageBody}>
//           <div style={styles.container}>
//             <MatieresHeader loading={loading} total={subjects.length} onAdd={handleCreate} />

//             {/* ✅ On garde juste le bouton Catalogue (plus de tableau séparé) */}
//             <CatalogueMiniBar
//               loading={loadingCatalog}
//               total={catalog.length}
//               onOpen={() => setOpenCatalogModal(true)}
//             />

//             {/* ✅ Tableau matières avec Code (issu du catalogue) */}
//             <MatieresGroupedBySalle
//               groups={groupedBySalle}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//               getCode={getCodeForSubject}
//             />
//           </div>
//         </div>
//       </main>

//       {openModal && (
//         <MatiereModal
//           subject={editing}
//           onClose={() => {
//             setOpenModal(false);
//             setEditing(null);
//           }}
//           onSave={handleSave}
//         />
//       )}

//       {openCatalogModal && (
//         <CatalogueModal
//           onClose={() => setOpenCatalogModal(false)}
//           onSaveBulk={handleSaveCatalogBulk}
//         />
//       )}
//     </div>
//   );
// }

// /* ───────────────────── Header ───────────────────── */
// function MatieresHeader({ loading, total, onAdd }) {
//   return (
//     <section style={headerStyles.card}>
//       <div style={headerStyles.left}>
//         <h1 style={headerStyles.title}>Gestion des matières</h1>
//         <p style={headerStyles.subtitle}>
//           Définissez les unités d&apos;enseignement (UE) et les éléments constitutifs (EC) par salle.
//         </p>
//         <p style={headerStyles.badge}>{loading ? "Chargement des matières…" : `${total} enregistrement(s)`}</p>
//       </div>
//       <div style={headerStyles.right}>
//         <button type="button" style={headerStyles.addBtn} onClick={onAdd}>
//           <Plus size={16} />
//           <span>Ajouter une matière</span>
//         </button>
//       </div>
//     </section>
//   );
// }

// /* ✅ Petite barre catalogue (sans tableau) */
// function CatalogueMiniBar({ loading, total, onOpen }) {
//   return (
//     <section style={catalogStyles.card}>
//       <div style={catalogStyles.left}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={catalogStyles.iconCircle}>
//             <Hash size={16} />
//           </div>
//           <div>
//             <div style={catalogStyles.title}>Catalogue des codes (par niveau)</div>
//             <div style={catalogStyles.subtitle}>
//               Les codes s’affichent directement dans les matières (colonne “Code”).
//             </div>
//           </div>
//         </div>

//         <p style={catalogStyles.badge}>
//           {loading ? "Chargement du catalogue…" : `${total} code(s) enregistrés`}
//         </p>
//       </div>

//       <div style={catalogStyles.right}>
//         <button type="button" style={catalogStyles.btn} onClick={onOpen}>
//           <Hash size={16} />
//           <span>Ajouter / Modifier des codes</span>
//         </button>
//       </div>
//     </section>
//   );
// }

// /* ───────────────── Tableau regroupé par salle ───────────────── */
// function MatieresGroupedBySalle({ groups, onEdit, onDelete, getCode }) {
//   if (!groups || groups.length === 0) {
//     return (
//       <section>
//         <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
//         <div style={sheetStyles.wrapper}>
//           <p style={{ fontSize: ".8rem", color: "#6B7280" }}>Aucune matière définie pour le moment.</p>
//         </div>
//       </section>
//     );
//   }

//   return (
//     <section>
//       <div style={sheetStyles.sectionHeader}>
//         <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
//         <p style={sheetStyles.sectionSubtitle}>Chaque bloc correspond à une salle (filière + spécialité + niveau).</p>
//       </div>

//       <div style={sheetStyles.wrapper}>
//         <div style={sheetStyles.groupsGrid}>
//           {groups.map((g) => {
//             const visibleSubjects = (g.subjects || []).filter((s) => {
//               const ue = getUELabel(s).trim();
//               const hasUE = ue !== "";
//               const hasEC = s.ecTitle && s.ecTitle.trim() !== "";
//               const hasNum =
//                 (s.credits != null && s.credits !== 0) ||
//                 (s.coefficient != null && s.coefficient !== 0);
//               const hasCycle = s.cycle && s.cycle.trim() !== "";
//               const hasOption = s.isOptional;
//               return hasUE || hasEC || hasNum || hasCycle || hasOption;
//             });

//             return (
//               <article key={g.key} style={sheetStyles.groupCard}>
//                 <header style={sheetStyles.groupHeader}>
//                   <div style={sheetStyles.groupIcon}>
//                     <BookOpen size={16} />
//                   </div>
//                   <div>
//                     <div style={sheetStyles.groupTitle}>
//                       {g.salleCode} – {g.specialite}
//                     </div>
//                     <div style={sheetStyles.groupMeta}>
//                       {g.filiere} · Niveau {g.level}
//                       {g.cycle ? ` · Cycle ${g.cycle}` : ""}
//                     </div>
//                   </div>
//                 </header>

//                 <table style={sheetStyles.table}>
//                   <thead>
//                     <tr>
//                       <th style={sheetStyles.thSmall}>UE (Intitulé)</th>
//                       <th style={sheetStyles.th}>EC</th>

//                       {/* ✅ NOUVELLE COLONNE */}
//                       <th style={sheetStyles.thTiny}>Code</th>

//                       <th style={sheetStyles.thTiny}>Crédits</th>
//                       <th style={sheetStyles.thTiny}>Coef.</th>
//                       <th style={sheetStyles.thTiny}>Cycle</th>
//                       <th style={sheetStyles.thSmall}>Optionnelle</th>
//                       <th style={sheetStyles.thActions}>Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {visibleSubjects.length === 0 ? (
//                       <tr>
//                         <td
//                           colSpan={8}
//                           style={{
//                             padding: "6px 8px",
//                             fontSize: ".8rem",
//                             color: "#9CA3AF",
//                             textAlign: "center",
//                           }}
//                         >
//                           Aucune matière définie pour cette salle.
//                         </td>
//                       </tr>
//                     ) : (
//                       visibleSubjects.map((s) => {
//                         const code = getCode?.(s) || "";
//                         return (
//                           <tr key={s.id}>
//                             <td style={sheetStyles.tdLabel}>{getUELabel(s)}</td>
//                             <td style={sheetStyles.tdLabel}>
//                               {s.ecTitle || <span style={{ color: "#9CA3AF" }}>—</span>}
//                             </td>

//                             {/* ✅ Code ici */}
//                             <td style={sheetStyles.tdCenter}>
//                               {code ? (
//                                 <span style={sheetStyles.codeBadge}>{code}</span>
//                               ) : (
//                                 <span style={{ color: "#9CA3AF" }}>—</span>
//                               )}
//                             </td>

//                             <td style={sheetStyles.tdCenter}>{s.credits != null ? s.credits : "—"}</td>
//                             <td style={sheetStyles.tdCenter}>{s.coefficient != null ? s.coefficient : "—"}</td>
//                             <td style={sheetStyles.tdCenter}>{s.cycle || "—"}</td>
//                             <td style={sheetStyles.tdCenter}>{s.isOptional ? "Oui" : "Non"}</td>
//                             <td style={sheetStyles.tdActions}>
//                               <button type="button" style={sheetStyles.iconBtn} onClick={() => onEdit(s)} title="Modifier">
//                                 <Edit size={14} />
//                               </button>
//                               <button
//                                 type="button"
//                                 style={{ ...sheetStyles.iconBtn, color: "#DC2626" }}
//                                 onClick={() => onDelete(s)}
//                                 title="Supprimer"
//                               >
//                                 <Trash2 size={14} />
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </article>
//             );
//           })}
//         </div>
//       </div>
//     </section>
//   );
// }

// function CatalogueModal({ onClose, onSaveBulk }) {
//   const [cycle, setCycle] = useState("");
//   const [studyYear, setStudyYear] = useState(1);

//   const [labels, setLabels] = useState([]);
//   const [loadingLabels, setLoadingLabels] = useState(false);

//   const [rows, setRows] = useState([]);
//   const [error, setError] = useState("");

//   const inputStyle = {
//     width: "100%",
//     height: 38,
//     borderRadius: 10,
//     border: `1px solid ${colors.border}`,
//     padding: "0 .7rem",
//     fontSize: ".85rem",
//     background: "var(--bg-input, #F9FAFB)",
//     outline: "none",
//     boxSizing: "border-box",
//   };

//   // ✅ charge la table subjects_catalog existante (pour pré-remplir les codes)
//   const fetchCatalogCodes = async (y, c) => {
//     const qs = new URLSearchParams();
//     qs.set("studyYear", String(y));
//     if (c) qs.set("cycle", c);

//     const res = await fetch(`${API_BASE}/subjects/catalog?${qs.toString()}`);
//     const data = await res.json();
//     if (!res.ok) throw new Error(data?.error || "Erreur chargement catalogue");

//     // map label -> code
//     const map = new Map();
//     (Array.isArray(data) ? data : []).forEach((r) => {
//       const lab = (r.label || "").trim();
//       const code = (r.code || "").trim();
//       if (lab) map.set(lab, code);
//     });

//     return map;
//   };

//   // ✅ charge les intitulés et fusionne avec codes existants
//   const loadLabels = async (y, c) => {
//     setLoadingLabels(true);
//     setError("");

//     try {
//       // 1) labels
//       const qsLabels = new URLSearchParams();
//       qsLabels.set("studyYear", String(y));
//       if (c) qsLabels.set("cycle", c);

//       const resLabels = await fetch(`${API_BASE}/subjects/labels?${qsLabels.toString()}`);
//       const dataLabels = await resLabels.json();
//       if (!resLabels.ok) throw new Error(dataLabels?.error || "Erreur chargement intitulés");

//       const list = Array.isArray(dataLabels) ? dataLabels : [];
//       setLabels(list);

//       // 2) catalog codes existants
//       const existingCodesMap = await fetchCatalogCodes(y, c);

//       // 3) fusion : chaque intitulé reçoit son code si déjà existant
//       // ✅ IMPORTANT : si l'utilisateur avait déjà commencé à taper des codes dans rows
//       // on conserve ce qu'il a tapé (priorité au state), puis fallback base.
//       setRows((prevRows) => {
//         const prevMap = new Map();
//         (prevRows || []).forEach((r) => {
//           const lab = (r.label || "").trim();
//           if (!lab) return;
//           prevMap.set(lab, (r.code || "").trim());
//         });

//         return list.map((lab) => {
//           const fromPrev = prevMap.get(lab);
//           if (fromPrev !== undefined && fromPrev !== "") {
//             return { label: lab, code: fromPrev };
//           }
//           const fromDb = existingCodesMap.get(lab) || "";
//           return { label: lab, code: fromDb };
//         });
//       });
//     } catch (e) {
//       setLabels([]);
//       setRows([]);
//       setError(e.message || "Erreur");
//     } finally {
//       setLoadingLabels(false);
//     }
//   };

//   // ✅ au premier affichage : on charge et on pré-remplit
//   useEffect(() => {
//     loadLabels(studyYear, cycle);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const refresh = () => loadLabels(studyYear, cycle);

//   const updateRowCode = (idx, code) => {
//     setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, code } : r)));
//   };

//   const addEmptyRow = () => {
//     setRows((prev) => [...prev, { label: "", code: "" }]);
//   };

//   const updateRowLabel = (idx, label) => {
//     setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, label } : r)));
//   };

//   const removeRow = (idx) => {
//     setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
//   };

//   const submit = () => {
//     setError("");

//     const items = (rows || [])
//       .map((r) => ({
//         label: (r.label || "").trim(),
//         code: (r.code || "").trim(),
//         studyYear: Number(studyYear),
//         cycle: cycle ? cycle : null,
//       }))
//       .filter((x) => x.label && x.code);

//     if (items.length === 0) {
//       setError("Renseigne au moins un code (au moins une ligne).");
//       return;
//     }

//     onSaveBulk?.(items);
//   };

//   return (
//     <div style={modalStyles.overlay} onMouseDown={onClose}>
//       <div
//         style={{ ...modalStyles.modal, width: "min(900px, 100vw)" }}
//         onMouseDown={(e) => e.stopPropagation()}
//       >
//         <header style={modalStyles.header}>
//           <h3 style={modalStyles.title}>Ajouter / Modifier des codes (catalogue)</h3>
//         </header>

//         <div style={modalStyles.body}>
//           <p style={modalStyles.help}>
//             Choisis Niveau et Cycle, puis les intitulés sont chargés avec leurs codes déjà enregistrés (si existants).
//           </p>

//           {error && <p style={modalStyles.error}>{error}</p>}

//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Niveau *</label>
//               <select
//                 style={inputStyle}
//                 value={studyYear}
//                 onChange={(e) => setStudyYear(Number(e.target.value))}
//               >
//                 {[1, 2, 3, 4, 5].map((y) => (
//                   <option key={y} value={y}>
//                     {y === 1 ? "Niveau 1" : `Niveau ${y}`}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Cycle (optionnel)</label>
//               <select style={inputStyle} value={cycle} onChange={(e) => setCycle(e.target.value)}>
//                 <option value="">—</option>
//                 <option value="BTS">BTS</option>
//                 <option value="LICENCE">LICENCE</option>
//                 <option value="MASTER">MASTER</option>
//                 <option value="INGÉNIEUR">INGÉNIEUR</option>
//               </select>
//             </div>
//           </div>

//           <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
//             <button type="button" style={catalogStyles.smallBtn} onClick={refresh}>
//               {loadingLabels ? "Chargement…" : "Charger les intitulés"}
//             </button>

//             <button type="button" style={catalogStyles.smallBtnGhost} onClick={addEmptyRow}>
//               + Ajouter une ligne manuelle
//             </button>

//             <div style={{ marginLeft: "auto", fontSize: ".78rem", color: "#6B7280" }}>
//               {loadingLabels ? "…" : `${rows.length} ligne(s)`}
//             </div>
//           </div>

//           <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
//               <thead>
//                 <tr style={{ background: "#F9FAFB" }}>
//                   <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: `1px solid ${colors.border}` }}>
//                     Intitulé *
//                   </th>
//                   <th
//                     style={{
//                       textAlign: "left",
//                       padding: "10px 10px",
//                       borderBottom: `1px solid ${colors.border}`,
//                       width: 220,
//                     }}
//                   >
//                     Code *
//                   </th>
//                   <th
//                     style={{
//                       textAlign: "right",
//                       padding: "10px 10px",
//                       borderBottom: `1px solid ${colors.border}`,
//                       width: 80,
//                     }}
//                   >
//                     Action
//                   </th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {rows.length === 0 ? (
//                   <tr>
//                     <td colSpan={3} style={{ padding: 12, color: "#6B7280" }}>
//                       Aucun intitulé trouvé. Tu peux ajouter une ligne manuelle.
//                     </td>
//                   </tr>
//                 ) : (
//                   rows.map((r, idx) => (
//                     <tr key={`${r.label}-${idx}`}>
//                       <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
//                         {labels.includes(r.label) ? (
//                           <div style={{ fontWeight: 600 }}>{r.label}</div>
//                         ) : (
//                           <input
//                             type="text"
//                             value={r.label}
//                             onChange={(e) => updateRowLabel(idx, e.target.value)}
//                             placeholder="Ex : Physique Générale"
//                             style={inputStyle}
//                           />
//                         )}
//                       </td>

//                       <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
//                         <input
//                           type="text"
//                           value={r.code}
//                           onChange={(e) => updateRowCode(idx, e.target.value)}
//                           placeholder="Ex : PHY11"
//                           style={inputStyle}
//                         />
//                       </td>

//                       <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB", textAlign: "right" }}>
//                         <button
//                           type="button"
//                           onClick={() => removeRow(idx)}
//                           style={{ ...sheetStyles.iconBtn, color: "#DC2626" }}
//                           title="Supprimer la ligne"
//                         >
//                           <Trash2 size={14} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <div style={{ marginTop: 10, fontSize: ".78rem", color: "#6B7280" }}>
//             Seules les lignes avec <b>Intitulé + Code</b> seront enregistrées.
//           </div>
//         </div>

//         <footer style={modalStyles.footer}>
//           <button type="button" style={modalStyles.btnGhost} onClick={onClose}>
//             Annuler
//           </button>
//           <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
//             Enregistrer
//           </button>
//         </footer>
//       </div>
//     </div>
//   );
// }

// /* ───────────────────── Modale Ajouter / Modifier Matière ───────────────────── */
// function MatiereModal({ subject, onClose, onSave }) {
//   const isEdit = !!subject;

//   const [bulkUE, setBulkUE] = useState(false);
//   const [ueList, setUeList] = useState(() => (subject ? [getUELabel(subject)] : [""]));

//   const [ueTitle, setUeTitle] = useState(getUELabel(subject));
//   const [ecTitle, setEcTitle] = useState(subject?.ecTitle || "");
//   const [credits, setCredits] = useState(subject?.credits != null ? String(subject.credits) : "");
//   const [coefficient, setCoefficient] = useState(subject?.coefficient != null ? String(subject.coefficient) : "");

//   const [filiere, setFiliere] = useState(subject?.filiere || "");
//   const [specialiteParent, setSpecialiteParent] = useState("");
//   const [specialite, setSpecialite] = useState(subject?.specialite || "");
//   const [specialiteCode, setSpecialiteCode] = useState(subject?.specialiteCode || "");
//   const [option, setOption] = useState(subject?.option || "");
//   const [optionCode, setOptionCode] = useState(subject?.optionCode || "");

//   const [cycle, setCycle] = useState(subject?.cycle || "");
//   const [studyYear, setStudyYear] = useState(subject?.studyYear != null ? Number(subject.studyYear) : null);

//   const [isOptional, setIsOptional] = useState(!!subject?.isOptional);
//   const [error, setError] = useState("");

//   const currentConf = useMemo(() => (filiere ? DICT[filiere] : null), [filiere]);
//   const isIndus = currentConf?.type === "industriel";
//   const specialites = currentConf?.specialites || [];
//   const options = isIndus && specialiteParent ? currentConf.optionsBySpecialite[specialiteParent] || [] : [];

//   // ✅ IMPORTANT: ne pas vider les champs au montage en mode edit
//   const prevFiliereRef = useRef(filiere);
//   useEffect(() => {
//     const prev = prevFiliereRef.current;
//     if (prev === filiere) return;
//     prevFiliereRef.current = filiere;

//     // si l'utilisateur change réellement la filière → reset
//     setSpecialiteParent("");
//     setSpecialite("");
//     setSpecialiteCode("");
//     setOption("");
//     setOptionCode("");
//   }, [filiere]);

//   // ✅ Si filière = industrielles et on édite → retrouver le parent/option correctement
//   useEffect(() => {
//     if (!subject) return;
//     if (subject.filiere !== "Filières industrielles") return;

//     const conf = DICT["Filières industrielles"];
//     if (!conf) return;

//     for (const [parentLabel, opts] of Object.entries(conf.optionsBySpecialite)) {
//       const found = opts.find(([label]) => label === subject.specialite);
//       if (found) {
//         const [optLabel, optCode] = found;

//         setFiliere("Filières industrielles");
//         setSpecialiteParent(parentLabel);

//         // option = spécialité réelle (ex: GLI)
//         setSpecialite(optLabel);
//         setOption(optLabel);

//         setOptionCode(optCode);
//         setSpecialiteCode(optCode);
//         return;
//       }
//     }
//   }, [subject]);

//   const onSelectSpecialite = (value) => {
//     if (!currentConf) return;
//     if (isIndus) {
//       setSpecialiteParent(value);
//       setSpecialite("");
//       setSpecialiteCode("");
//       setOption("");
//       setOptionCode("");
//     } else {
//       const entry = specialites.find(([label]) => label === value);
//       const code = entry ? entry[1] || "" : "";
//       setSpecialite(value);
//       setSpecialiteCode(code);

//       // pas d'option en non-indus
//       setOption("");
//       setOptionCode("");
//     }
//   };

//   const onSelectOption = (value) => {
//     if (!isIndus || !currentConf || !specialiteParent) return;
//     const list = currentConf.optionsBySpecialite[specialiteParent] || [];
//     const entry = list.find(([label]) => label === value);
//     const code = entry ? entry[1] || "" : "";

//     setOption(value);
//     setOptionCode(code);

//     setSpecialite(value);
//     setSpecialiteCode(code);
//   };

//   const allowedYears = cycle ? CYCLE_RULES[cycle] || [] : [];
//   const pickYear = (y) => {
//     if (!allowedYears.includes(y)) return;
//     setStudyYear((prev) => (prev === y ? null : y));
//   };

//   const addUeRow = () => setUeList((prev) => [...prev, ""]);
//   const removeUeRow = (idx) => setUeList((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
//   const updateUeRow = (idx, val) => setUeList((prev) => prev.map((x, i) => (i === idx ? val : x)));

//   const validateCommon = () => {
//     if (!filiere) return (setError("La filière est obligatoire."), false);
//     if (!specialite) return (setError("La spécialité est obligatoire."), false);
//     if (!specialiteCode) return (setError("Le code spécialité (salle) est obligatoire."), false);
//     if (!cycle) return (setError("Le cycle est obligatoire."), false);
//     if (!studyYear) return (setError("L’année d’étude est obligatoire."), false);
//     return true;
//   };

//   const validate = () => {
//     if (!validateCommon()) return false;

//     if (bulkUE) {
//       const cleaned = (ueList || []).map((x) => (x || "").trim()).filter(Boolean);
//       if (cleaned.length === 0) {
//         setError("Intitulé de l'UE (Unité d'enseignement) requis.");
//         return false;
//       }
//       setError("");
//       return { cleaned };
//     }

//     if (!ueTitle.trim()) {
//       setError("Intitulé de l'UE (Unité d'enseignement) requis.");
//       return false;
//     }

//     const coeffNum = coefficient.trim() ? Number(coefficient.replace(",", ".")) : null;
//     if (coefficient.trim() && Number.isNaN(coeffNum)) return (setError("Le coefficient doit être un nombre."), false);

//     const creditsNum = credits.trim() ? Number(credits.replace(",", ".")) : null;
//     if (credits.trim() && Number.isNaN(creditsNum)) return (setError("Le crédit doit être un nombre."), false);

//     setError("");
//     return { coeffNum, creditsNum };
//   };

//   const submit = () => {
//     const v = validate();
//     if (!v) return;

//     if (bulkUE) {
//       onSave?.({
//         mode: "bulkUE",
//         ueTitles: v.cleaned,
//         filiere,
//         specialite,
//         specialiteCode,
//         option,
//         optionCode,
//         cycle,
//         studyYear,
//         isOptional,
//       });
//       return;
//     }

//     onSave?.({
//       id: subject?.id,
//       ueTitle: ueTitle.trim(),
//       ecTitle: ecTitle.trim() || null,
//       coefficient: v.coeffNum,
//       credits: v.creditsNum,
//       filiere,
//       specialite,
//       specialiteCode,
//       option,
//       optionCode,
//       cycle,
//       studyYear,
//       isOptional,
//     });
//   };

//   const inputStyle = {
//     width: "100%",
//     height: 38,
//     borderRadius: 10,
//     border: `1px solid ${colors.border}`,
//     padding: "0 .7rem",
//     fontSize: ".85rem",
//     background: "var(--bg-input, #F9FAFB)",
//     outline: "none",
//     boxSizing: "border-box",
//   };

//   const disabledDetails = bulkUE === true;

//   return (
//     <div style={modalStyles.overlay} onMouseDown={onClose}>
//       <div style={modalStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
//         <header style={modalStyles.header}>
//           <h3 style={modalStyles.title}>{isEdit ? "Modifier la matière" : "Ajouter une matière"}</h3>
//         </header>

//         <div style={modalStyles.body}>
//           <p style={modalStyles.help}>Renseignez l'UE, l'EC et la salle.</p>

//           {!isEdit && (
//             <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
//               <input
//                 type="checkbox"
//                 checked={bulkUE}
//                 onChange={(e) => {
//                   const checked = e.target.checked;
//                   setBulkUE(checked);
//                   setError("");

//                   if (checked) {
//                     const seed = ueTitle?.trim() ? [ueTitle.trim()] : ueList;
//                     const cleaned = (seed || []).map((x) => (x || "").trim()).filter(Boolean);
//                     setUeList(cleaned.length ? cleaned : [""]);
//                   }
//                 }}
//               />
//               <span style={{ fontSize: ".85rem" }}>
//                 Ajouter plusieurs UE (désactive EC/Crédit/Coef pour l’instant)
//               </span>
//             </label>
//           )}

//           {error && <p style={modalStyles.error}>{error}</p>}

//           <div style={modalStyles.grid}>
//             <div style={modalStyles.fieldFull}>
//               <label style={modalStyles.label}>Intitulé de l&apos;UE (Unité d&apos;enseignement) *</label>

//               {bulkUE ? (
//                 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//                   {ueList.map((val, idx) => (
//                     <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: 8 }}>
//                       <input
//                         type="text"
//                         value={val}
//                         onChange={(e) => updateUeRow(idx, e.target.value)}
//                         placeholder="Ex : Mathématique Générale"
//                         style={inputStyle}
//                       />
//                       <button
//                         type="button"
//                         onClick={() => removeUeRow(idx)}
//                         style={{
//                           borderRadius: 10,
//                           border: `1px solid ${colors.border}`,
//                           background: "transparent",
//                           cursor: "pointer",
//                         }}
//                         title="Supprimer"
//                       >
//                         –
//                       </button>
//                     </div>
//                   ))}

//                   <button
//                     type="button"
//                     onClick={addUeRow}
//                     style={{
//                       background: "transparent",
//                       border: "none",
//                       color: "var(--ip-teal)",
//                       cursor: "pointer",
//                       textAlign: "left",
//                       padding: 0,
//                       fontWeight: 600,
//                       fontSize: ".85rem",
//                     }}
//                   >
//                     + Ajouter une UE
//                   </button>
//                 </div>
//               ) : (
//                 <input
//                   type="text"
//                   value={ueTitle}
//                   onChange={(e) => setUeTitle(e.target.value)}
//                   placeholder="Ex : Résistance des matériaux I"
//                   style={inputStyle}
//                 />
//               )}
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Intitulé de l&apos;EC (Élément constitutif)</label>
//               <input
//                 type="text"
//                 value={ecTitle}
//                 onChange={(e) => setEcTitle(e.target.value)}
//                 placeholder="Ex : Cours magistral"
//                 style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
//                 disabled={disabledDetails}
//               />
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Crédit</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.5"
//                 value={credits}
//                 onChange={(e) => setCredits(e.target.value)}
//                 placeholder="Ex : 3"
//                 style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
//                 disabled={disabledDetails}
//               />
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Coefficient</label>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.5"
//                 value={coefficient}
//                 onChange={(e) => setCoefficient(e.target.value)}
//                 placeholder="Ex : 2"
//                 style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
//                 disabled={disabledDetails}
//               />
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Filière *</label>
//               <select style={inputStyle} value={filiere} onChange={(e) => setFiliere(e.target.value)}>
//                 <option value="">Sélectionner une filière</option>
//                 <option>Filières de gestion</option>
//                 <option>Filières industrielles</option>
//                 <option>Filières carrières juridiques</option>
//               </select>
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Spécialité *</label>
//               <select
//                 style={inputStyle}
//                 value={isIndus ? specialiteParent : specialite}
//                 onChange={(e) => onSelectSpecialite(e.target.value)}
//                 disabled={!currentConf}
//               >
//                 <option value="">Sélectionner une spécialité</option>
//                 {specialites.map(([label]) => (
//                   <option key={label} value={label}>
//                     {label}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {isIndus && (
//               <div style={modalStyles.field}>
//                 <label style={modalStyles.label}>Option (salle)</label>
//                 <select
//                   style={inputStyle}
//                   value={option}
//                   onChange={(e) => onSelectOption(e.target.value)}
//                   disabled={!specialiteParent}
//                 >
//                   <option value="">Sélectionner une option</option>
//                   {options.map(([label]) => (
//                     <option key={label} value={label}>
//                       {label}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             )}

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Code spécialité (salle) *</label>
//               <input
//                 type="text"
//                 value={specialiteCode}
//                 readOnly
//                 placeholder="BAF, BAT, GLI…"
//                 style={{ ...inputStyle, background: "#f3f4f6" }}
//               />
//             </div>

//             <div style={modalStyles.field}>
//               <label style={modalStyles.label}>Cycle *</label>
//               <select
//                 style={inputStyle}
//                 value={cycle}
//                 onChange={(e) => {
//                   setCycle(e.target.value);
//                   setStudyYear(null);
//                 }}
//               >
//                 <option value="">Sélectionner un cycle</option>
//                 <option value="BTS">BTS</option>
//                 <option value="LICENCE">LICENCE</option>
//                 <option value="MASTER">MASTER</option>
//                 <option value="INGÉNIEUR">INGÉNIEUR</option>
//               </select>
//             </div>

//             <div style={modalStyles.fieldFull}>
//               <label style={modalStyles.label}>Année d’étude *</label>
//               <div style={modalStyles.yearRow}>
//                 {[1, 2, 3, 4, 5].map((y) => {
//                   const enabled = allowedYears.includes(y);
//                   const active = studyYear === y;
//                   return (
//                     <button
//                       key={y}
//                       type="button"
//                       onClick={() => pickYear(y)}
//                       disabled={!enabled}
//                       style={{
//                         ...modalStyles.yearChip,
//                         ...(enabled ? {} : modalStyles.yearChipDisabled),
//                         ...(active ? modalStyles.yearChipActive : {}),
//                       }}
//                     >
//                       {y === 1 ? "1re" : `${y}e`} Année
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             <div style={modalStyles.fieldFull}>
//               <label style={modalStyles.checkboxRow}>
//                 <input
//                   type="checkbox"
//                   checked={isOptional}
//                   onChange={(e) => setIsOptional(e.target.checked)}
//                   style={{ marginRight: 8 }}
//                 />
//                 <span>Matière optionnelle pour cette salle</span>
//               </label>
//             </div>
//           </div>
//         </div>

//         <footer style={modalStyles.footer}>
//           <button type="button" style={modalStyles.btnGhost} onClick={onClose}>
//             Annuler
//           </button>
//           <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
//             {isEdit ? "Enregistrer les modifications" : "Enregistrer"}
//           </button>
//         </footer>
//       </div>
//     </div>
//   );
// }

// /* ───────────────────── Styles ───────────────────── */
// const styles = {
//   layout: {
//     display: "grid",
//     gridTemplateColumns: "minmax(220px, 10%) 1fr",
//     width: "100vw",
//     height: "100vh",
//     background: "#f5f6f8",
//     overflow: "hidden",
//   },
//   left: {
//     height: "100%",
//     overflowY: "auto",
//     background: "var(--bg)",
//     borderRight: `1px solid ${colors.border}`,
//   },
//   right: {
//     display: "flex",
//     flexDirection: "column",
//     minWidth: 0,
//     height: "100%",
//     overflow: "hidden",
//     background: "#f5f6f8",
//   },
//   pageBody: { flex: 1, overflowY: "auto" },
//   container: {
//     maxWidth: "1600px",
//     margin: "1.5rem auto",
//     padding: "0 1.5rem 1.5rem",
//     display: "flex",
//     flexDirection: "column",
//     gap: "1.5rem",
//   },
// };

// const headerStyles = {
//   card: {
//     background: "var(--bg)",
//     borderRadius: 12,
//     border: `1px solid ${colors.border}`,
//     padding: "1rem 1.25rem",
//     display: "flex",
//     gap: "1rem",
//     alignItems: "flex-start",
//   },
//   left: { flex: 1, minWidth: 0 },
//   right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
//   title: { margin: 0, fontSize: "1.05rem", fontWeight: 700 },
//   subtitle: { margin: "4px 0 0", fontSize: ".85rem", color: "var(--ip-gray)" },
//   badge: {
//     marginTop: 8,
//     display: "inline-block",
//     padding: "3px 10px",
//     borderRadius: 999,
//     fontSize: ".75rem",
//     background: "#ECFEFF",
//     color: "#0369A1",
//     border: "1px solid #7DD3FC",
//   },
//   addBtn: {
//     display: "inline-flex",
//     alignItems: "center",
//     gap: 6,
//     padding: "8px 14px",
//     borderRadius: 999,
//     border: "none",
//     background: "#00b89c",
//     color: "white",
//     fontSize: ".85rem",
//     fontWeight: 600,
//     cursor: "pointer",
//   },
// };

// const catalogStyles = {
//   card: {
//     background: "var(--bg)",
//     borderRadius: 12,
//     border: `1px solid ${colors.border}`,
//     padding: "1rem 1.25rem",
//     display: "flex",
//     gap: "1rem",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   left: { display: "flex", flexDirection: "column", gap: 8, minWidth: 0 },
//   right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
//   title: { margin: 0, fontSize: ".95rem", fontWeight: 800 },
//   subtitle: { margin: 0, fontSize: ".82rem", color: "var(--ip-gray)" },
//   badge: {
//     display: "inline-block",
//     padding: "3px 10px",
//     borderRadius: 999,
//     fontSize: ".75rem",
//     background: "#F0FDF4",
//     color: "#166534",
//     border: "1px solid #86EFAC",
//     width: "fit-content",
//   },
//   iconCircle: {
//     width: 28,
//     height: 28,
//     borderRadius: 999,
//     background: "#F0F9FF",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     color: "#0369A1",
//     border: "1px solid #BAE6FD",
//     flex: "0 0 auto",
//   },
//   btn: {
//     display: "inline-flex",
//     alignItems: "center",
//     gap: 6,
//     padding: "8px 14px",
//     borderRadius: 999,
//     border: "none",
//     background: "#0EA5E9",
//     color: "white",
//     fontSize: ".85rem",
//     fontWeight: 700,
//     cursor: "pointer",
//   },
//   smallBtn: {
//     borderRadius: 999,
//     border: "none",
//     background: "#00b89c",
//     color: "white",
//     padding: "8px 12px",
//     fontWeight: 700,
//     cursor: "pointer",
//     fontSize: ".82rem",
//   },
//   smallBtnGhost: {
//     borderRadius: 999,
//     border: `1px solid ${colors.border}`,
//     background: "transparent",
//     padding: "8px 12px",
//     fontWeight: 700,
//     cursor: "pointer",
//     fontSize: ".82rem",
//   },
// };

// const sheetStyles = {
//   sectionHeader: { marginBottom: "0.5rem" },
//   sectionTitle: { margin: 0, fontSize: ".9rem", fontWeight: 600, color: "var(--ip-gray)" },
//   sectionSubtitle: { margin: "4px 0 0", fontSize: ".8rem", color: "#6B7280" },
//   wrapper: {
//     marginTop: "0.5rem",
//     padding: "0.75rem",
//     background: "#E5E7EB",
//     borderRadius: 12,
//     overflowX: "auto",
//   },
//   groupsGrid: { display: "flex", flexDirection: "column", gap: 16 },
//   groupCard: {
//     background: "#fff",
//     borderRadius: 12,
//     border: "1px solid #D1D5DB",
//     padding: "0.75rem 0.75rem 0.9rem",
//   },
//   groupHeader: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
//   groupIcon: {
//     width: 28,
//     height: 28,
//     borderRadius: 999,
//     background: "#ECFEFF",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     color: "#0F766E",
//   },
//   groupTitle: { fontSize: ".9rem", fontWeight: 600 },
//   groupMeta: { fontSize: ".75rem", color: "#6B7280" },
//   table: { width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: ".8rem" },
//   th: { borderBottom: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "left" },
//   thSmall: { borderBottom: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" },
//   thTiny: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "center", width: 70 },
//   thActions: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "right", width: 80 },
//   tdLabel: { borderBottom: "1px solid #E5E7EB", padding: "4px 6px" },
//   tdCenter: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "center" },
//   tdActions: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" },
//   iconBtn: { border: "none", background: "transparent", cursor: "pointer", padding: 2, marginLeft: 4, color: "#4B5563" },
//   codeBadge: {
//     display: "inline-block",
//     padding: "2px 8px",
//     borderRadius: 999,
//     fontSize: ".75rem",
//     fontWeight: 800,
//     background: "#EFF6FF",
//     border: "1px solid #BFDBFE",
//     color: "#1D4ED8",
//   },
// };

// const modalStyles = {
//   overlay: {
//     position: "fixed",
//     inset: 0,
//     background: "rgba(0,0,0,.35)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: "1rem",
//     zIndex: 80,
//   },
//   modal: {
//     width: "min(780px, 100vw)",
//     maxHeight: "92vh",
//     background: "var(--bg)",
//     color: "var(--fg)",
//     borderRadius: 12,
//     border: `1px solid ${colors.border}`,
//     boxShadow: "0 18px 35px rgba(0,0,0,.18)",
//     display: "flex",
//     flexDirection: "column",
//   },
//   header: { padding: "14px 18px", borderBottom: `1px solid ${colors.border}` },
//   title: { margin: 0, fontSize: "1.05rem", fontWeight: 600 },
//   body: { padding: "10px 18px 14px", overflowY: "auto" },
//   help: { margin: "0 0 10px", fontSize: ".85rem", color: "var(--ip-gray)" },
//   error: { margin: "0 0 10px", fontSize: ".8rem", color: "#DC2626" },
//   grid: { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, rowGap: 10 },
//   field: { display: "flex", flexDirection: "column", gap: 4 },
//   fieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 },
//   label: { fontSize: ".8rem", fontWeight: 600 },
//   footer: {
//     padding: "10px 18px 14px",
//     borderTop: `1px solid ${colors.border}`,
//     display: "flex",
//     justifyContent: "flex-end",
//     gap: 8,
//   },
//   btnGhost: {
//     background: "transparent",
//     border: `1px solid ${colors.border}`,
//     color: "inherit",
//     borderRadius: 999,
//     padding: ".45rem .9rem",
//     cursor: "pointer",
//     fontSize: ".85rem",
//   },
//   btnPrimary: {
//     background: "#00b89c",
//     border: "none",
//     color: "#fff",
//     borderRadius: 999,
//     padding: ".45rem 1.1rem",
//     cursor: "pointer",
//     fontSize: ".85rem",
//     fontWeight: 600,
//   },
//   yearRow: { display: "flex", gap: 8, flexWrap: "wrap" },
//   yearChip: {
//     height: 32,
//     padding: "0 12px",
//     borderRadius: 9999,
//     background: "var(--bg-input)",
//     border: "1px solid var(--border)",
//     color: "inherit",
//     cursor: "pointer",
//     fontSize: ".8rem",
//   },
//   yearChipActive: { background: "var(--ip-teal)", color: "var(--on-color)", borderColor: "var(--ip-teal)" },
//   yearChipDisabled: { opacity: 0.45, cursor: "not-allowed" },
//   checkboxRow: { display: "flex", alignItems: "center", fontSize: ".85rem" },
// };










// src/pages/MatieresPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { BookOpen, Plus, Edit, Trash2, Hash } from "lucide-react";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ───────── Dictionnaires ───────── */
const DICT = {
  "Filières de gestion": {
    type: "gestion",
    specialites: [
      ["Comptabilité et Gestion des Entreprises", "CGE"],
      ["Administration des Collectivités Territoriales", "ACT"],
      ["Gestion des ONG", "ONG"],
      ["Gestion de Projets", "GPR"],
      ["Gestion des Ressources Humaines", "GRH"],
      ["Assistant Manager", "AMA"],
      ["Banque et Finance", "BAF"],
      ["Marketing – Commerce – Vente", "MCV"],
      ["Commerce International", "CIN"],
      ["Gestion Logistique et Transport", "GLT"],
      ["Statistiques", "STA"],
      ["Douane et Transit", "DTR"],
      ["Comptabilité – Contrôle – Audit", "CCA"],
      ["Finance – Comptabilité", "FIC"],
      ["Banque – Finance et Assurance", "BFA"],
      ["Marketing et Communication Digitale", "MCD"],
      ["Marketing – Management Opérationnel", "MMO"],
      ["Management des Organisations", "MOR"],
      ["Management de la Qualité", "MAQ"],
      ["Management des Projets", "MPR"],
    ],
  },
  "Filières carrières juridiques": {
    type: "juridique",
    specialites: [
      ["Droit Foncier et Domanial", "DFD"],
      ["Professions Immobilières", "PRI"],
      ["Douane et Transit", "DTR"],
      ["Droit des Affaires et de l’Entreprise", "DAE"],
    ],
  },
  "Filières industrielles": {
    type: "industriel",
    specialites: [
      ["Génie Civil", ""],
      ["Génie Informatique", ""],
      ["Télécommunication", ""],
      ["Génie Mécanique", ""],
      ["Génie Thermique", ""],
      ["Génie Électrique", ""],
    ],
    optionsBySpecialite: {
      "Génie Civil": [
        ["Bâtiment", "BAT"],
        ["Travaux Publics", "TPU"],
        ["Géomètre Topographe", "GTP"],
        ["Installation Sanitaire", "INS"],
      ],
      "Génie Informatique": [
        ["Génie Logiciel", "GLI"],
        ["E-Commerce et Marketing Numérique", "ECM"],
        ["Gestion des Systèmes Informatiques", "GSI"],
        ["Informatique Industrielle et Automatisme", "IIA"],
      ],
      Télécommunication: [
        ["Télécommunication", "TEL"],
        ["Réseau et Sécurité", "RES"],
      ],
      "Génie Mécanique": [
        ["Chaudronnerie et Soudure", "CHS"],
        ["Fabrication Mécanique", "FBM"],
        ["Mécatronique", "MEC"],
        ["Maintenance Systèmes Industriels", "MSI"],
        ["Électromécanique", "ELM"],
      ],
      "Génie Thermique": [
        ["Énergies Renouvelables", "ENR"],
        ["Froid et Climatisation", "FRC"],
      ],
      "Génie Électrique": [
        ["Maintenance Appareils Biomédicaux", "MAB"],
        ["Électrotechnique", "ELT"],
      ],
    },
  },
};

const CYCLE_RULES = {
  BTS: [1, 2],
  LICENCE: [3],
  MASTER: [4, 5],
  "INGÉNIEUR": [1, 2, 3, 4, 5],
};

/* ───────── Helpers ───────── */
function cleanStr(x) {
  return (x ?? "").toString().trim();
}

function normalizeKey(str) {
  return cleanStr(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * ✅ IMPORTANT:
 * Reconstruit TOUJOURS label/name à partir des "parts" (baseLabel + semestre).
 * => empêche la disparition du nom ECUE lors d'un update crédits/codes.
 */
function computeLabelFromParts({ semesterMode, baseLabel, labelS1, labelS2 }) {
  const mode = cleanStr(semesterMode || "S1");
  const base = cleanStr(baseLabel);

  // fallback ultime : si base vide, on tente labelS1/labelS2
  if (!base) {
    if (mode === "S1S2") {
      const a = cleanStr(labelS1);
      const b = cleanStr(labelS2);
      return a || b || "";
    }
    const a = cleanStr(labelS1);
    const b = cleanStr(labelS2);
    return a || b || "";
  }

  // En mode S1S2, on affiche la base (ou tu peux décider d'afficher "base (S1/S2)")
  if (mode === "S1S2") return base;

  // mode S2 -> si labelS2 existe, priorité
  if (mode === "S2") return cleanStr(labelS2) || base;

  // mode S1 (par défaut)
  return cleanStr(labelS1) || base;
}

function displayLabelFor(s) {
  // on reconstruit à partir de nos champs normalisés
  const semesterMode = cleanStr(s?.semesterMode || s?.semester || "S1");
  const baseLabel = cleanStr(s?.baseLabel || s?.label || s?.name || "");
  const labelS1 = cleanStr(s?.labelS1 || "");
  const labelS2 = cleanStr(s?.labelS2 || "");
  const result = computeLabelFromParts({ semesterMode, baseLabel, labelS1, labelS2 });
  return result || "—";
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function MatieresPage({ currentSection = "matieres", onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Catalogue legacy (subjects_catalog)
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [openCatalogModal, setOpenCatalogModal] = useState(false);

  // ✅ CRUD matière
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // ✅ Gestion rapide codes & crédits
  const [openBulkEdit, setOpenBulkEdit] = useState(false);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      const data = await res.json().catch(() => []);
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement matières :", e);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`${API_BASE}/subjects/catalog`);
      const data = await res.json().catch(() => []);
      setCatalog(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement catalogue :", e);
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadSubjects();
    loadCatalog();
  }, []);

  // Map catalogue (label + year + cycle) -> code
  const catalogMap = useMemo(() => {
    const map = new Map();
    for (const r of Array.isArray(catalog) ? catalog : []) {
      const labelK = normalizeKey(r.label);
      const y = Number(r.studyYear);
      const cyc = r.cycle ? normalizeKey(r.cycle) : "any";
      if (!labelK || Number.isNaN(y)) continue;
      const key = `${labelK}__${y}__${cyc}`;
      map.set(key, cleanStr(r.code));
    }
    return map;
  }, [catalog]);

  // ✅ priorité:
  // 1) s.code
  // 2) fallback catalogue (legacy)
  const getCodeForSubject = (s) => {
    const direct = cleanStr(s?.code);
    if (direct) return direct;

    const label = displayLabelFor(s);
    const y = Number(s.studyYear);
    const cyc = cleanStr(s.cycle);

    const labelK = normalizeKey(label);
    if (!labelK || Number.isNaN(y)) return "";

    if (cyc) {
      const kExact = `${labelK}__${y}__${normalizeKey(cyc)}`;
      const exact = catalogMap.get(kExact);
      if (exact) return exact;
    }

    const kAny = `${labelK}__${y}__any`;
    return catalogMap.get(kAny) || "";
  };

  const groupedBySalle = useMemo(() => {
    const map = new Map();
    for (const s of subjects) {
      const filiere = s.filiere || "Filière non définie";
      const salleCode = s.specialiteCode || "???";
      const specLabel = s.specialite || "Spécialité ?";
      const level = s.studyYear || 1;
      const cycle = s.cycle || "";
      const key = `${filiere}::${salleCode}::${level}::${cycle}`;

      if (!map.has(key)) {
        map.set(key, { key, filiere, salleCode, specialite: specLabel, level, cycle, subjects: [] });
      }
      map.get(key).subjects.push(s);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.filiere.localeCompare(b.filiere) ||
        a.salleCode.localeCompare(b.salleCode) ||
        String(a.level).localeCompare(String(b.level)) ||
        String(a.cycle).localeCompare(String(b.cycle))
    );
  }, [subjects]);

  const handleCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const handleEdit = (subject) => {
    setEditing(subject);
    setOpenModal(true);
  };

  const handleDelete = async (subject) => {
    const label = displayLabelFor(subject) || "sans titre";
    if (!window.confirm(`Supprimer la matière "${label}" ?`)) return;

    try {
      const res = await fetch(`${API_BASE}/subjects/${subject.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la suppression");
      await loadSubjects();
    } catch (e) {
      alert(e.message || "Erreur lors de la suppression");
    }
  };

  /**
   * ✅ SAVE (Modal)
   * On calcule label/name depuis baseLabel + semesterMode.
   */
  const handleSave = async (payload) => {
    const common = {
      filiere: payload.filiere,
      specialite: payload.specialite,
      specialiteCode: payload.specialiteCode,
      option: payload.option || null,
      optionCode: payload.optionCode || null,
      studyYear: payload.studyYear,
      cycle: payload.cycle || null,
      isOptional: payload.isOptional === true,

      semesterMode: payload.semesterMode || "S1",
      baseLabel: payload.baseLabel || null,
      labelS1: payload.labelS1 || null,
      labelS2: payload.labelS2 || null,

      code: payload.code || null,
      credits: payload.credits != null ? payload.credits : null,
    };

    const computedLabel = computeLabelFromParts({
      semesterMode: common.semesterMode,
      baseLabel: common.baseLabel,
      labelS1: common.labelS1,
      labelS2: common.labelS2,
    });

    try {
      // EDIT
      if (payload.id) {
        const body = { ...common, label: computedLabel, name: computedLabel };

        const res = await fetch(`${API_BASE}/subjects/${payload.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

        setOpenModal(false);
        setEditing(null);
        await loadSubjects();
        return;
      }

      // CREATE
      const body = { ...common, label: computedLabel, name: computedLabel };

      const res = await fetch(`${API_BASE}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

      setOpenModal(false);
      setEditing(null);
      await loadSubjects();
    } catch (e) {
      alert(e.message || "Erreur lors de l’enregistrement");
    }
  };

  const handleSaveCatalogBulk = async (items) => {
    try {
      const res = await fetch(`${API_BASE}/subjects/catalog/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement du catalogue");
      await loadCatalog();
      setOpenCatalogModal(false);
    } catch (e) {
      alert(e.message || "Erreur lors de l’enregistrement du catalogue");
    }
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />
        <div style={styles.pageBody}>
          <div style={styles.container}>
            <MatieresHeader loading={loading} total={subjects.length} onAdd={handleCreate} />

            <BulkEditMiniBar onOpen={() => setOpenBulkEdit(true)} />

            <CatalogueMiniBar loading={loadingCatalog} total={catalog.length} onOpen={() => setOpenCatalogModal(true)} />

            <MatieresGroupedBySalle
              groups={groupedBySalle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getCode={getCodeForSubject}
            />
          </div>
        </div>
      </main>

      {openModal && (
        <MatiereModal
          subject={editing}
          onClose={() => {
            setOpenModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {openCatalogModal && <CatalogueModal onClose={() => setOpenCatalogModal(false)} onSaveBulk={handleSaveCatalogBulk} />}

      {openBulkEdit && (
        <BulkEditCodesCreditsModal
          subjects={subjects}
          getCodeForSubject={getCodeForSubject}
          onClose={() => setOpenBulkEdit(false)}
          onSaved={loadSubjects}
        />
      )}
    </div>
  );
}

/* ───────────────────── Header ───────────────────── */
function MatieresHeader({ loading, total, onAdd }) {
  return (
    <section style={headerStyles.card}>
      <div style={headerStyles.left}>
        <h1 style={headerStyles.title}>Gestion des matières</h1>
        <p style={headerStyles.subtitle}>Définissez les ECUE, crédits, codes et semestre (S1 / S2 / S1 & S2) par salle.</p>
        <p style={headerStyles.badge}>{loading ? "Chargement des matières…" : `${total} enregistrement(s)`}</p>
      </div>
      <div style={headerStyles.right}>
        <button type="button" style={headerStyles.addBtn} onClick={onAdd}>
          <Plus size={16} />
          <span>Ajouter une matière</span>
        </button>
      </div>
    </section>
  );
}

/* ✅ Barre gestion rapide */
function BulkEditMiniBar({ onOpen }) {
  return (
    <section style={bulkStyles.card}>
      <div style={bulkStyles.left}>
        <div style={bulkStyles.title}>Gestion rapide : Codes & Crédits</div>
        <div style={bulkStyles.subtitle}>Filtre, coche les matières, puis applique un crédit et enregistre.</div>
      </div>
      <div style={bulkStyles.right}>
        <button type="button" style={bulkStyles.btn} onClick={onOpen}>
          Gérer
        </button>
      </div>
    </section>
  );
}

/**
 * ✅ MODAL: sélection + appliquer crédit sur sélection
 * ✅ FIX IMPORTANT: saveSelected ne doit JAMAIS "vider" baseLabel/label/name.
 * => On relit les champs existants et on recalcule label/name correctement.
 */
function BulkEditCodesCreditsModal({ subjects, getCodeForSubject, onClose, onSaved }) {
  const [cycle, setCycle] = useState("BTS");
  const [studyYear, setStudyYear] = useState(""); // optionnel
  const [semesterMode, setSemesterMode] = useState(""); // optionnel

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [applyCreditValue, setApplyCreditValue] = useState("");

  useEffect(() => {
    let list = Array.isArray(subjects) ? subjects : [];

    if (cycle) list = list.filter((s) => (s.cycle || "") === cycle);
    if (studyYear !== "") {
      const y = Number(studyYear);
      list = list.filter((s) => Number(s.studyYear) === y);
    }
    if (semesterMode) {
      const sm = (s) => cleanStr(s.semesterMode || s.semester || "S1");
      list = list.filter((s) => sm(s) === semesterMode);
    }

    setRows(
      list
        .slice()
        .sort((a, b) => String(displayLabelFor(a)).localeCompare(String(displayLabelFor(b))))
        .map((s) => {
          const codeInitial = cleanStr(s.code || (getCodeForSubject ? getCodeForSubject(s) : "") || "");
          return {
            id: s.id,
            label: displayLabelFor(s),
            specialite: cleanStr(s.specialite) || "—",
            specialiteCode: cleanStr(s.specialiteCode) || "—",
            code: codeInitial,
            credits: s.credits != null ? String(s.credits) : "",
            selected: false,
            _raw: s,
          };
        })
    );
  }, [subjects, cycle, studyYear, semesterMode, getCodeForSubject]);

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleAll = (checked) => setRows((prev) => prev.map((r) => ({ ...r, selected: !!checked })));
  const toggleOne = (id, checked) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !!checked } : r)));
  const update = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const applyCreditsToSelected = () => {
    setMsg("");
    const v = String(applyCreditValue || "").trim();
    if (v === "") return setMsg("❌ Renseigne une valeur de crédit à appliquer.");
    const num = Number(v.replace(",", "."));
    if (Number.isNaN(num)) return setMsg("❌ Le crédit doit être un nombre.");
    if (selectedCount === 0) return setMsg("❌ Sélectionne d’abord les matières à modifier.");

    setRows((prev) => prev.map((r) => (r.selected ? { ...r, credits: String(num) } : r)));
    setMsg(`✅ Crédit appliqué à ${selectedCount} matière(s).`);
  };

  const saveSelected = async () => {
    setMsg("");
    if (selectedCount === 0) return setMsg("❌ Aucune matière sélectionnée.");

    setSaving(true);
    try {
      const targets = rows.filter((r) => r.selected);

      for (const r of targets) {
        const creditsStr = String(r.credits || "").trim();
        const creditsNum = creditsStr === "" ? null : Number(creditsStr.replace(",", "."));
        if (creditsStr !== "" && Number.isNaN(creditsNum)) throw new Error(`Crédit invalide pour "${r.label}"`);

        const s = r._raw || {};

        // ✅ On relit les champs "parts" existants
        const preservedSemesterMode = cleanStr(s.semesterMode || s.semester || "S1");
        const preservedBaseLabel = cleanStr(s.baseLabel || s.label || s.name || "");
        const preservedLabelS1 = cleanStr(s.labelS1 || "");
        const preservedLabelS2 = cleanStr(s.labelS2 || "");

        // ✅ On recalcule label/name de manière sûre
        const computedLabel = computeLabelFromParts({
          semesterMode: preservedSemesterMode,
          baseLabel: preservedBaseLabel,
          labelS1: preservedLabelS1,
          labelS2: preservedLabelS2,
        });

        if (!computedLabel) {
          // Si ton enregistrement est déjà cassé (baseLabel vide), on refuse d'écraser encore
          throw new Error(`ECUE introuvable pour l’ID ${r.id}. Ouvre "Modifier" et renseigne le nom ECUE.`);
        }

        const body = {
          // salles
          filiere: s.filiere || null,
          specialite: s.specialite || null,
          specialiteCode: s.specialiteCode || null,
          option: s.option || null,
          optionCode: s.optionCode || null,
          cycle: s.cycle || null,
          studyYear: s.studyYear ?? null,
          isOptional: !!s.isOptional,

          // ✅ parts ECUE (préservées)
          semesterMode: preservedSemesterMode,
          baseLabel: preservedBaseLabel,
          labelS1: preservedLabelS1 || null,
          labelS2: preservedLabelS2 || null,

          // ✅ valeurs modifiées
          code: cleanStr(r.code) || null,
          credits: creditsNum,

          // ✅ label/name TOUJOURS coherents
          label: computedLabel,
          name: computedLabel,
        };

        const res = await fetch(`${API_BASE}/subjects/${r.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Erreur sur "${computedLabel}"`);
      }

      setMsg(`✅ Enregistré (${selectedCount} matière(s)).`);
      await onSaved?.();
    } catch (e) {
      setMsg(`❌ ${e.message || "Erreur"}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    height: 34,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    padding: "0 .6rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #F9FAFB)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div style={{ ...modalStyles.modal, width: "min(1120px, 100vw)" }} onMouseDown={(e) => e.stopPropagation()}>
        <header style={modalStyles.header}>
          <h3 style={modalStyles.title}>Gestion rapide : Codes & Crédits</h3>
        </header>

        <div style={modalStyles.body}>
          <p style={modalStyles.help}>Filtre par cycle/niveau/semestre, coche, modifie code/crédit, puis enregistre.</p>

          {msg && (
            <p style={{ margin: "0 0 10px", fontSize: ".85rem", color: msg.startsWith("✅") ? "#166534" : "#DC2626" }}>
              {msg}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={modalStyles.label}>Cycle *</label>
              <select style={inputStyle} value={cycle} onChange={(e) => setCycle(e.target.value)}>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
            </div>

            <div>
              <label style={modalStyles.label}>Niveau (optionnel)</label>
              <select style={inputStyle} value={studyYear} onChange={(e) => setStudyYear(e.target.value)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={String(y)}>
                    Niveau {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={modalStyles.label}>Semestre (optionnel)</label>
              <select style={inputStyle} value={semesterMode} onChange={(e) => setSemesterMode(e.target.value)}>
                <option value="">—</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S1S2">S1 & S2</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem" }}>
              <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} disabled={rows.length === 0} />
              <span>Sélectionner tout</span>
            </label>

            <div style={{ fontSize: ".8rem", color: "#6B7280" }}>
              {rows.length} matière(s) · <b>{selectedCount}</b> sélectionnée(s)
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: ".8rem", color: "#6B7280" }}>Appliquer crédit aux sélectionnées :</span>
              <input
                type="number"
                min="0"
                step="0.5"
                style={{ ...inputStyle, width: 120 }}
                value={applyCreditValue}
                onChange={(e) => setApplyCreditValue(e.target.value)}
                placeholder="ex: 3"
              />
              <button
                type="button"
                onClick={applyCreditsToSelected}
                style={{
                  borderRadius: 999,
                  border: "none",
                  background: "#00b89c",
                  color: "white",
                  padding: "8px 12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: ".82rem",
                }}
              >
                Appliquer
              </button>
            </div>
          </div>

          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  <th style={{ textAlign: "center", padding: "10px", borderBottom: `1px solid ${colors.border}`, width: 60 }}>✔</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: `1px solid ${colors.border}`, width: 260 }}>Spécialité</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: `1px solid ${colors.border}` }}>ECUE</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: `1px solid ${colors.border}`, width: 220 }}>Code</th>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: `1px solid ${colors.border}`, width: 160 }}>Crédits</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, color: "#6B7280" }}>
                      Aucune matière pour ce filtre.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} style={r.selected ? { background: "#F0FDFA" } : undefined}>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB", textAlign: "center" }}>
                        <input type="checkbox" checked={r.selected} onChange={(e) => toggleOne(r.id, e.target.checked)} />
                      </td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        <div style={{ fontWeight: 700 }}>{r.specialite}</div>
                        <div style={{ fontSize: ".78rem", color: "#6B7280" }}>{r.specialiteCode}</div>
                      </td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB", fontWeight: 650 }}>{r.label}</td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        <input type="text" value={r.code} onChange={(e) => update(r.id, { code: e.target.value })} placeholder="Ex: MAT101" style={inputStyle} />
                      </td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        <input type="number" min="0" step="0.5" value={r.credits} onChange={(e) => update(r.id, { credits: e.target.value })} placeholder="Ex: 3" style={inputStyle} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer style={modalStyles.footer}>
          <button type="button" style={modalStyles.btnGhost} onClick={onClose} disabled={saving}>
            Fermer
          </button>
          <button type="button" style={modalStyles.btnPrimary} onClick={saveSelected} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer sélection"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────────── CatalogueMiniBar (legacy) ───────────────────────── */
function CatalogueMiniBar({ loading, total, onOpen }) {
  return (
    <section style={catalogStyles.card}>
      <div style={catalogStyles.left}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={catalogStyles.iconCircle}>
            <Hash size={16} />
          </div>
          <div>
            <div style={catalogStyles.title}>Catalogue des codes (legacy)</div>
            <div style={catalogStyles.subtitle}>Optionnel — utile si tu as déjà des codes stockés dans subjects_catalog.</div>
          </div>
        </div>

        <p style={catalogStyles.badge}>{loading ? "Chargement du catalogue…" : `${total} code(s)`}</p>
      </div>

      <div style={catalogStyles.right}>
        <button type="button" style={catalogStyles.btn} onClick={onOpen}>
          <Hash size={16} />
          <span>Ouvrir</span>
        </button>
      </div>
    </section>
  );
}

/* ───────────────── Tableau regroupé par salle ───────────────── */
function MatieresGroupedBySalle({ groups, onEdit, onDelete, getCode }) {
  if (!groups || groups.length === 0) {
    return (
      <section>
        <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
        <div style={sheetStyles.wrapper}>
          <p style={{ fontSize: ".8rem", color: "#6B7280" }}>Aucune matière définie pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div style={sheetStyles.sectionHeader}>
        <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
        <p style={sheetStyles.sectionSubtitle}>Chaque bloc correspond à une salle (filière + spécialité + niveau + cycle).</p>
      </div>

      <div style={sheetStyles.wrapper}>
        <div style={sheetStyles.groupsGrid}>
          {groups.map((g) => {
            const visibleSubjects = (g.subjects || []).filter((s) => {
              // ✅ on ne cache plus rien "par erreur"
              // si l'enregistrement existe, on l'affiche
              return true;
            });

            return (
              <article key={g.key} style={sheetStyles.groupCard}>
                <header style={sheetStyles.groupHeader}>
                  <div style={sheetStyles.groupIcon}>
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <div style={sheetStyles.groupTitle}>
                      {g.salleCode} – {g.specialite}
                    </div>
                    <div style={sheetStyles.groupMeta}>
                      {g.filiere} · Niveau {g.level}
                      {g.cycle ? ` · Cycle ${g.cycle}` : ""}
                    </div>
                  </div>
                </header>

                <table style={sheetStyles.table}>
                  <thead>
                    <tr>
                      <th style={sheetStyles.thSmall}>ECUE</th>
                      <th style={sheetStyles.thTiny}>Code</th>
                      <th style={sheetStyles.thTiny}>Crédits</th>
                      <th style={sheetStyles.thTiny}>Semestre</th>
                      <th style={sheetStyles.thSmall}>Optionnelle</th>
                      <th style={sheetStyles.thActions}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "6px 8px", fontSize: ".8rem", color: "#9CA3AF", textAlign: "center" }}>
                          Aucune matière définie pour cette salle.
                        </td>
                      </tr>
                    ) : (
                      visibleSubjects.map((s) => {
                        const code = cleanStr(s.code) || cleanStr(getCode?.(s)) || "";
                        const sem = cleanStr(s.semesterMode || s.semester || "S1");
                        return (
                          <tr key={s.id}>
                            <td style={sheetStyles.tdLabel}>{displayLabelFor(s)}</td>

                            <td style={sheetStyles.tdCenter}>
                              {code ? <span style={sheetStyles.codeBadge}>{code}</span> : <span style={{ color: "#9CA3AF" }}>—</span>}
                            </td>

                            <td style={sheetStyles.tdCenter}>{s.credits != null ? s.credits : "—"}</td>
                            <td style={sheetStyles.tdCenter}>{sem === "S1S2" ? "S1 & S2" : sem || "—"}</td>
                            <td style={sheetStyles.tdCenter}>{s.isOptional ? "Oui" : "Non"}</td>

                            <td style={sheetStyles.tdActions}>
                              <button type="button" style={sheetStyles.iconBtn} onClick={() => onEdit(s)} title="Modifier">
                                <Edit size={14} />
                              </button>
                              <button type="button" style={{ ...sheetStyles.iconBtn, color: "#DC2626" }} onClick={() => onDelete(s)} title="Supprimer">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Modale Ajouter / Modifier ECUE ───────────────────── */
function MatiereModal({ subject, onClose, onSave }) {
  const isEdit = !!subject;

  const [semesterMode, setSemesterMode] = useState(cleanStr(subject?.semesterMode || subject?.semester || "S1"));

  const initialBase = cleanStr(subject?.baseLabel) || cleanStr(subject?.label) || cleanStr(subject?.name) || "";
  const [baseLabel, setBaseLabel] = useState(initialBase);

  const [labelS1, setLabelS1] = useState(cleanStr(subject?.labelS1));
  const [labelS2, setLabelS2] = useState(cleanStr(subject?.labelS2));

  const [code, setCode] = useState(cleanStr(subject?.code));
  const [credits, setCredits] = useState(subject?.credits != null ? String(subject.credits) : "");

  const [filiere, setFiliere] = useState(cleanStr(subject?.filiere));
  const [specialiteParent, setSpecialiteParent] = useState("");
  const [specialite, setSpecialite] = useState(cleanStr(subject?.specialite));
  const [specialiteCode, setSpecialiteCode] = useState(cleanStr(subject?.specialiteCode));
  const [option, setOption] = useState(cleanStr(subject?.option));
  const [optionCode, setOptionCode] = useState(cleanStr(subject?.optionCode));

  const [cycle, setCycle] = useState(cleanStr(subject?.cycle));
  const [studyYear, setStudyYear] = useState(subject?.studyYear != null ? Number(subject.studyYear) : null);
  const [isOptional, setIsOptional] = useState(!!subject?.isOptional);
  const [error, setError] = useState("");

  const currentConf = useMemo(() => (filiere ? DICT[filiere] : null), [filiere]);
  const isIndus = currentConf?.type === "industriel";
  const specialites = currentConf?.specialites || [];
  const options = isIndus && specialiteParent ? currentConf.optionsBySpecialite[specialiteParent] || [] : [];

  const prevFiliereRef = useRef(filiere);
  useEffect(() => {
    const prev = prevFiliereRef.current;
    if (prev === filiere) return;
    prevFiliereRef.current = filiere;

    setSpecialiteParent("");
    setSpecialite("");
    setSpecialiteCode("");
    setOption("");
    setOptionCode("");
  }, [filiere]);

  useEffect(() => {
    if (!subject) return;
    if (subject.filiere !== "Filières industrielles") return;

    const conf = DICT["Filières industrielles"];
    if (!conf) return;

    for (const [parentLabel, opts] of Object.entries(conf.optionsBySpecialite)) {
      const found = opts.find(([label]) => label === subject.specialite);
      if (found) {
        const [optLabel, optCode] = found;

        setFiliere("Filières industrielles");
        setSpecialiteParent(parentLabel);
        setSpecialite(optLabel);
        setOption(optLabel);

        setOptionCode(optCode);
        setSpecialiteCode(optCode);
        return;
      }
    }
  }, [subject]);

  const onSelectSpecialite = (value) => {
    if (!currentConf) return;

    if (isIndus) {
      setSpecialiteParent(value);
      setSpecialite("");
      setSpecialiteCode("");
      setOption("");
      setOptionCode("");
      return;
    }

    const entry = specialites.find(([label]) => label === value);
    const codeS = entry ? entry[1] || "" : "";
    setSpecialite(value);
    setSpecialiteCode(codeS);
    setOption("");
    setOptionCode("");
  };

  const onSelectOption = (value) => {
    if (!isIndus || !currentConf || !specialiteParent) return;
    const list = currentConf.optionsBySpecialite[specialiteParent] || [];
    const entry = list.find(([label]) => label === value);
    const codeOpt = entry ? entry[1] || "" : "";

    setOption(value);
    setOptionCode(codeOpt);
    setSpecialite(value);
    setSpecialiteCode(codeOpt);
  };

  const allowedYears = cycle ? CYCLE_RULES[cycle] || [] : [];
  const pickYear = (y) => {
    if (!allowedYears.includes(y)) return;
    setStudyYear((prev) => (prev === y ? null : y));
  };

  useEffect(() => {
    const base = cleanStr(baseLabel);
    if (semesterMode !== "S1S2") return;
    setLabelS1((prev) => (cleanStr(prev) ? prev : base ? `${base} I` : ""));
    setLabelS2((prev) => (cleanStr(prev) ? prev : base ? `${base} II` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterMode]);

  const validate = () => {
    const base = cleanStr(baseLabel);
    if (!base) return (setError("Le nom de l’ECUE est obligatoire."), false);

    if (!filiere) return (setError("La filière est obligatoire."), false);
    if (!specialite) return (setError("La spécialité est obligatoire."), false);
    if (!specialiteCode) return (setError("Le code spécialité (salle) est obligatoire."), false);
    if (!cycle) return (setError("Le cycle est obligatoire."), false);
    if (!studyYear) return (setError("L’année d’étude est obligatoire."), false);

    const creditsNum = cleanStr(credits) ? Number(String(credits).replace(",", ".")) : null;
    if (cleanStr(credits) && Number.isNaN(creditsNum)) return (setError("Le crédit doit être un nombre."), false);

    if (semesterMode === "S1S2") {
      if (!cleanStr(labelS1) || !cleanStr(labelS2)) return (setError("En S1 & S2, renseigne les intitulés S1 et S2."), false);
    }

    setError("");
    return { creditsNum };
  };

  const submit = () => {
    const v = validate();
    if (!v) return;

    const payload = {
      id: subject?.id,

      filiere,
      specialite,
      specialiteCode,
      option: option || null,
      optionCode: optionCode || null,
      cycle,
      studyYear,
      isOptional,

      semesterMode,
      baseLabel: cleanStr(baseLabel),
      labelS1: semesterMode === "S1S2" ? cleanStr(labelS1) : null,
      labelS2: semesterMode === "S1S2" ? cleanStr(labelS2) : null,

      code: cleanStr(code) || null,
      credits: v.creditsNum,
    };

    onSave?.(payload);
  };

  const inputStyle = {
    width: "100%",
    height: 38,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    padding: "0 .7rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #F9FAFB)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div style={modalStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header style={modalStyles.header}>
          <h3 style={modalStyles.title}>{isEdit ? "Modifier l’ECUE" : "Ajouter une ECUE"}</h3>
        </header>

        <div style={modalStyles.body}>
          <p style={modalStyles.help}>Renseigne l’ECUE, semestre, code/crédit, et la salle.</p>
          {error && <p style={modalStyles.error}>{error}</p>}

          <div style={modalStyles.grid}>
            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.label}>Nom de l’ECUE *</label>
              <input
                type="text"
                value={baseLabel}
                onChange={(e) => setBaseLabel(e.target.value)}
                placeholder="Ex : Probabilité statistique inférencielle"
                style={inputStyle}
              />
            </div>

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Semestre *</label>
              <select style={inputStyle} value={semesterMode} onChange={(e) => setSemesterMode(e.target.value)}>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S1S2">S1 & S2</option>
              </select>
            </div>

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Crédits</label>
              <input type="number" min="0" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="Ex : 2" style={inputStyle} />
            </div>

            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.label}>Code (optionnel)</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex : IGL232-1" style={inputStyle} />
            </div>

            {semesterMode === "S1S2" && (
              <>
                <div style={modalStyles.field}>
                  <label style={modalStyles.label}>Intitulé S1 *</label>
                  <input type="text" value={labelS1} onChange={(e) => setLabelS1(e.target.value)} placeholder="Ex : ... I" style={inputStyle} />
                </div>
                <div style={modalStyles.field}>
                  <label style={modalStyles.label}>Intitulé S2 *</label>
                  <input type="text" value={labelS2} onChange={(e) => setLabelS2(e.target.value)} placeholder="Ex : ... II" style={inputStyle} />
                </div>
              </>
            )}

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Filière *</label>
              <select style={inputStyle} value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                <option value="">Sélectionner une filière</option>
                <option>Filières de gestion</option>
                <option>Filières industrielles</option>
                <option>Filières carrières juridiques</option>
              </select>
            </div>

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Spécialité *</label>
              <select
                style={inputStyle}
                value={isIndus ? specialiteParent : specialite}
                onChange={(e) => onSelectSpecialite(e.target.value)}
                disabled={!currentConf}
              >
                <option value="">Sélectionner une spécialité</option>
                {specialites.map(([label]) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {isIndus && (
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Option (salle)</label>
                <select style={inputStyle} value={option} onChange={(e) => onSelectOption(e.target.value)} disabled={!specialiteParent}>
                  <option value="">Sélectionner une option</option>
                  {options.map(([label]) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Code spécialité (salle) *</label>
              <input type="text" value={specialiteCode} readOnly style={{ ...inputStyle, background: "#f3f4f6" }} />
            </div>

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Cycle *</label>
              <select
                style={inputStyle}
                value={cycle}
                onChange={(e) => {
                  setCycle(e.target.value);
                  setStudyYear(null);
                }}
              >
                <option value="">Sélectionner un cycle</option>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
            </div>

            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.label}>Année d’étude *</label>
              <div style={modalStyles.yearRow}>
                {[1, 2, 3, 4, 5].map((y) => {
                  const enabled = allowedYears.includes(y);
                  const active = studyYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      disabled={!enabled}
                      style={{
                        ...modalStyles.yearChip,
                        ...(enabled ? {} : modalStyles.yearChipDisabled),
                        ...(active ? modalStyles.yearChipActive : {}),
                      }}
                    >
                      {y === 1 ? "1re" : `${y}e`} Année
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.checkboxRow}>
                <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} style={{ marginRight: 8 }} />
                <span>Matière optionnelle pour cette salle</span>
              </label>
            </div>
          </div>
        </div>

        <footer style={modalStyles.footer}>
          <button type="button" style={modalStyles.btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────── CatalogueModal (legacy) ───────────────────── */
function CatalogueModal({ onClose, onSaveBulk }) {
  const [cycle, setCycle] = useState("");
  const [studyYear, setStudyYear] = useState(1);

  const [labels, setLabels] = useState([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%",
    height: 38,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    padding: "0 .7rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #F9FAFB)",
    outline: "none",
    boxSizing: "border-box",
  };

  const fetchCatalogCodes = async (y, c) => {
    const qs = new URLSearchParams();
    qs.set("studyYear", String(y));
    if (c) qs.set("cycle", c);

    const res = await fetch(`${API_BASE}/subjects/catalog?${qs.toString()}`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.error || "Erreur chargement catalogue");

    const map = new Map();
    (Array.isArray(data) ? data : []).forEach((r) => {
      const lab = (r.label || "").trim();
      const code = (r.code || "").trim();
      if (lab) map.set(lab, code);
    });

    return map;
  };

  const loadLabels = async (y, c) => {
    setLoadingLabels(true);
    setError("");

    try {
      const qsLabels = new URLSearchParams();
      qsLabels.set("studyYear", String(y));
      if (c) qsLabels.set("cycle", c);

      const resLabels = await fetch(`${API_BASE}/subjects/labels?${qsLabels.toString()}`);
      const dataLabels = await resLabels.json().catch(() => []);
      if (!resLabels.ok) throw new Error(dataLabels?.error || "Erreur chargement intitulés");

      const list = Array.isArray(dataLabels) ? dataLabels : [];
      setLabels(list);

      const existingCodesMap = await fetchCatalogCodes(y, c);

      setRows((prevRows) => {
        const prevMap = new Map();
        (prevRows || []).forEach((r) => {
          const lab = (r.label || "").trim();
          if (!lab) return;
          prevMap.set(lab, (r.code || "").trim());
        });

        return list.map((lab) => {
          const fromPrev = prevMap.get(lab);
          if (fromPrev !== undefined && fromPrev !== "") return { label: lab, code: fromPrev };
          const fromDb = existingCodesMap.get(lab) || "";
          return { label: lab, code: fromDb };
        });
      });
    } catch (e) {
      setLabels([]);
      setRows([]);
      setError(e.message || "Erreur");
    } finally {
      setLoadingLabels(false);
    }
  };

  useEffect(() => {
    loadLabels(studyYear, cycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => loadLabels(studyYear, cycle);

  const updateRowCode = (idx, code) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, code } : r)));
  const addEmptyRow = () => setRows((prev) => [...prev, { label: "", code: "" }]);
  const updateRowLabel = (idx, label) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, label } : r)));
  const removeRow = (idx) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const submit = () => {
    setError("");

    const items = (rows || [])
      .map((r) => ({
        label: (r.label || "").trim(),
        code: (r.code || "").trim(),
        studyYear: Number(studyYear),
        cycle: cycle ? cycle : null,
      }))
      .filter((x) => x.label && x.code);

    if (items.length === 0) {
      setError("Renseigne au moins un code (au moins une ligne).");
      return;
    }

    onSaveBulk?.(items);
  };

  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div style={{ ...modalStyles.modal, width: "min(900px, 100vw)" }} onMouseDown={(e) => e.stopPropagation()}>
        <header style={modalStyles.header}>
          <h3 style={modalStyles.title}>Ajouter / Modifier des codes (catalogue legacy)</h3>
        </header>

        <div style={modalStyles.body}>
          <p style={modalStyles.help}>Choisis Niveau et Cycle, puis charge les intitulés avec leurs codes existants.</p>
          {error && <p style={modalStyles.error}>{error}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Niveau *</label>
              <select style={inputStyle} value={studyYear} onChange={(e) => setStudyYear(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y === 1 ? "Niveau 1" : `Niveau ${y}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Cycle (optionnel)</label>
              <select style={inputStyle} value={cycle} onChange={(e) => setCycle(e.target.value)}>
                <option value="">—</option>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <button type="button" style={catalogStyles.smallBtn} onClick={refresh}>
              {loadingLabels ? "Chargement…" : "Charger les intitulés"}
            </button>

            <button type="button" style={catalogStyles.smallBtnGhost} onClick={addEmptyRow}>
              + Ajouter une ligne manuelle
            </button>

            <div style={{ marginLeft: "auto", fontSize: ".78rem", color: "#6B7280" }}>
              {loadingLabels ? "…" : `${rows.length} ligne(s)`}
            </div>
          </div>

          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: `1px solid ${colors.border}` }}>Intitulé *</th>
                  <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: `1px solid ${colors.border}`, width: 220 }}>Code *</th>
                  <th style={{ textAlign: "right", padding: "10px 10px", borderBottom: `1px solid ${colors.border}`, width: 80 }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 12, color: "#6B7280" }}>
                      Aucun intitulé trouvé. Tu peux ajouter une ligne manuelle.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.label}-${idx}`}>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        {labels.includes(r.label) ? (
                          <div style={{ fontWeight: 600 }}>{r.label}</div>
                        ) : (
                          <input
                            type="text"
                            value={r.label}
                            onChange={(e) => updateRowLabel(idx, e.target.value)}
                            placeholder="Ex : Physique Générale"
                            style={inputStyle}
                          />
                        )}
                      </td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        <input
                          type="text"
                          value={r.code}
                          onChange={(e) => updateRowCode(idx, e.target.value)}
                          placeholder="Ex : PHY11"
                          style={inputStyle}
                        />
                      </td>

                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB", textAlign: "right" }}>
                        <button type="button" onClick={() => removeRow(idx)} style={{ ...sheetStyles.iconBtn, color: "#DC2626" }} title="Supprimer la ligne">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, fontSize: ".78rem", color: "#6B7280" }}>
            Seules les lignes avec <b>Intitulé + Code</b> seront enregistrées.
          </div>
        </div>

        <footer style={modalStyles.footer}>
          <button type="button" style={modalStyles.btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────── Styles ───────────────────── */
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

const headerStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
  },
  left: { flex: 1, minWidth: 0 },
  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
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
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "white",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

const bulkStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  title: { margin: 0, fontSize: ".95rem", fontWeight: 800 },
  subtitle: { margin: 0, fontSize: ".82rem", color: "var(--ip-gray)" },
  btn: {
    borderRadius: 999,
    border: "none",
    background: "#0EA5E9",
    color: "white",
    padding: "8px 14px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: ".85rem",
  },
};

const catalogStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { display: "flex", flexDirection: "column", gap: 8, minWidth: 0 },
  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  title: { margin: 0, fontSize: ".95rem", fontWeight: 800 },
  subtitle: { margin: 0, fontSize: ".82rem", color: "var(--ip-gray)" },
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    background: "#F0FDF4",
    color: "#166534",
    border: "1px solid #86EFAC",
    width: "fit-content",
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#F0F9FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0369A1",
    border: "1px solid #BAE6FD",
    flex: "0 0 auto",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#0EA5E9",
    color: "white",
    fontSize: ".85rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  smallBtn: {
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "white",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: ".82rem",
  },
  smallBtnGhost: {
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "transparent",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: ".82rem",
  },
};

const sheetStyles = {
  sectionHeader: { marginBottom: "0.5rem" },
  sectionTitle: { margin: 0, fontSize: ".9rem", fontWeight: 600, color: "var(--ip-gray)" },
  sectionSubtitle: { margin: "4px 0 0", fontSize: ".8rem", color: "#6B7280" },
  wrapper: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    background: "#E5E7EB",
    borderRadius: 12,
    overflowX: "auto",
  },
  groupsGrid: { display: "flex", flexDirection: "column", gap: 16 },
  groupCard: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #D1D5DB",
    padding: "0.75rem 0.75rem 0.9rem",
  },
  groupHeader: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#ECFEFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0F766E",
  },
  groupTitle: { fontSize: ".9rem", fontWeight: 600 },
  groupMeta: { fontSize: ".75rem", color: "#6B7280" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: ".8rem" },
  thSmall: { borderBottom: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" },
  thTiny: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "center", width: 90 },
  thActions: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "right", width: 80 },
  tdLabel: { borderBottom: "1px solid #E5E7EB", padding: "4px 6px" },
  tdCenter: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "center" },
  tdActions: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" },
  iconBtn: { border: "none", background: "transparent", cursor: "pointer", padding: 2, marginLeft: 4, color: "#4B5563" },
  codeBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: ".75rem",
    fontWeight: 800,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1D4ED8",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 80,
  },
  modal: {
    width: "min(780px, 100vw)",
    maxHeight: "92vh",
    background: "var(--bg)",
    color: "var(--fg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 18px 35px rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "14px 18px", borderBottom: `1px solid ${colors.border}` },
  title: { margin: 0, fontSize: "1.05rem", fontWeight: 600 },
  body: { padding: "10px 18px 14px", overflowY: "auto" },
  help: { margin: "0 0 10px", fontSize: ".85rem", color: "var(--ip-gray)" },
  error: { margin: "0 0 10px", fontSize: ".8rem", color: "#DC2626" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, rowGap: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".8rem", fontWeight: 600 },
  footer: {
    padding: "10px 18px 14px",
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btnGhost: {
    background: "transparent",
    border: `1px solid ${colors.border}`,
    color: "inherit",
    borderRadius: 999,
    padding: ".45rem .9rem",
    cursor: "pointer",
    fontSize: ".85rem",
  },
  btnPrimary: {
    background: "#00b89c",
    border: "none",
    color: "#fff",
    borderRadius: 999,
    padding: ".45rem 1.1rem",
    cursor: "pointer",
    fontSize: ".85rem",
    fontWeight: 600,
  },
  yearRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  yearChip: {
    height: 32,
    padding: "0 12px",
    borderRadius: 9999,
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "inherit",
    cursor: "pointer",
    fontSize: ".8rem",
  },
  yearChipActive: { background: "var(--ip-teal)", color: "var(--on-color)", borderColor: "var(--ip-teal)" },
  yearChipDisabled: { opacity: 0.45, cursor: "not-allowed" },
  checkboxRow: { display: "flex", alignItems: "center", fontSize: ".85rem" },
};