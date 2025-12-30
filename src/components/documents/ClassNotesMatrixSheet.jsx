// // src/components/documents/ClassNotesMatrixSheet.jsx
// import { useEffect, useMemo, useRef, useState } from "react";
// import NotesHeader from "./NotesHeader.jsx";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
// const DEFAULT_YEAR = "2025-2026";

// const SEMESTERS = ["S1", "S2"];
// const EXAMS = ["CC", "SN", "EXAMEN"];
// const SESSIONS = ["Principale", "Rattrapage"];

// // --- helpers ---
// async function fetchJsonFirstOk(urls) {
//   let lastErr = null;
//   for (const url of urls) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) {
//         lastErr = new Error(`HTTP ${res.status} on ${url}`);
//         continue;
//       }
//       return await res.json();
//     } catch (e) {
//       lastErr = e;
//     }
//   }
//   throw lastErr || new Error("Aucune URL n'a répondu correctement.");
// }

// function cleanStr(x) {
//   return (x ?? "").toString().trim();
// }

// export default function ClassNotesMatrixSheet({ onClose }) {
//   const [classes, setClasses] = useState([]);
//   const [loadingClasses, setLoadingClasses] = useState(false);

//   const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
//   const [selectedClassId, setSelectedClassId] = useState("");

//   const [semester, setSemester] = useState("S1");
//   const [exam, setExam] = useState("CC");
//   const [session, setSession] = useState("Principale");

//   const [subjects, setSubjects] = useState([]);
//   const [loadingSubjects, setLoadingSubjects] = useState(false);

//   // ✅ notes matrix depuis classReports
//   const [matrix, setMatrix] = useState(null);
//   const [loadingMatrix, setLoadingMatrix] = useState(false);

//   const [busy, setBusy] = useState(false);

//   const sheetRef = useRef(null);

//   // ---------- Chargement des classes ----------
//   useEffect(() => {
//     const load = async () => {
//       setLoadingClasses(true);
//       setSelectedClassId("");
//       setClasses([]);
//       setMatrix(null);

//       try {
//         const url1 = `${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`;
//         const url2 = `${API_BASE}/api/classes?year=${encodeURIComponent(academicYear)}`;
//         const data = await fetchJsonFirstOk([url1, url2]);
//         setClasses(Array.isArray(data) ? data : []);
//       } catch (err) {
//         console.error("Erreur chargement classes:", err);
//         setClasses([]);
//       } finally {
//         setLoadingClasses(false);
//       }
//     };
//     load();
//   }, [academicYear]);

//   const selectedClass = useMemo(
//     () => classes.find((c) => c.id === selectedClassId) || null,
//     [classes, selectedClassId]
//   );

//   const studentsFromClass = selectedClass?.students || [];

//   const capitalizeFirst = (text) => {
//     if (!text) return "";
//     return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
//   };

//   const getSpecialiteDisplay = (group) => {
//     if (!group) return "";

//     if (group.displayName && group.displayName.trim() !== "") {
//       const beforeDash = group.displayName.split("-")[0].trim();
//       if (beforeDash) return capitalizeFirst(beforeDash);
//     }

//     if (group.option && group.option.trim() !== "") return capitalizeFirst(group.option);
//     if (group.specialite && group.specialite.trim() !== "") return capitalizeFirst(group.specialite);
//     if (group.specialiteCode && group.specialiteCode.trim() !== "") return group.specialiteCode;
//     if (group.optionCode && group.optionCode.trim() !== "") return group.optionCode;
//     if (group.filiere && group.filiere.trim() !== "") return capitalizeFirst(group.filiere);
//     return "";
//   };

//   const specDisplay = useMemo(() => getSpecialiteDisplay(selectedClass), [selectedClass]);

//   // ✅ IMPORTANT : afficher CODE si dispo
//   const getSubjectLabel = (s) =>
//     String(s?.code || s?.label || s?.ueLabel || s?.name || "").trim();

//   // ---------- Charger matières (fallback seulement) ----------
//   useEffect(() => {
//     const loadSubjects = async () => {
//       if (!selectedClass) {
//         setSubjects([]);
//         return;
//       }

//       setLoadingSubjects(true);
//       try {
//         const classFiliere = selectedClass.filiere || "";
//         const classRefKey = selectedClass.optionCode || selectedClass.specialiteCode || "";
//         const classCycle = selectedClass.cycle || "";
//         const classStudyYear = selectedClass.studyYear != null ? String(selectedClass.studyYear) : "";

//         const params = new URLSearchParams();
//         if (classFiliere) params.set("filiere", classFiliere);
//         if (classRefKey) params.set("specialiteCode", classRefKey);
//         if (classCycle) params.set("cycle", classCycle);
//         if (classStudyYear) params.set("studyYear", classStudyYear);
//         if (semester) params.set("semester", semester);

//         const url1 = `${API_BASE}/subjects?${params.toString()}`;
//         const url2 = `${API_BASE}/api/subjects?${params.toString()}`;

//         const data = await fetchJsonFirstOk([url1, url2]);
//         const all = Array.isArray(data) ? data : [];

//         const filtered = all.filter((s) => {
//           const label = getSubjectLabel(s);
//           if (!label) return false;

//           const sFiliere = s.filiere || "";
//           const sRefKey = s.optionCode || s.specialiteCode || "";
//           const sCycle = s.cycle || "";
//           const sStudyYear = s.studyYear != null ? String(s.studyYear) : "";
//           const sSem = (s.semester || "").toString().trim();

//           if (classFiliere && sFiliere !== classFiliere) return false;
//           if (classRefKey && sRefKey !== classRefKey) return false;
//           if (classCycle && sCycle !== classCycle) return false;
//           if (classStudyYear && sStudyYear !== classStudyYear) return false;
//           if (semester && sSem && sSem !== semester) return false;

//           return true;
//         });

//         const seen = new Set();
//         const uniq = [];
//         for (const s of filtered) {
//           const label = getSubjectLabel(s);
//           const key = label.toLowerCase();
//           if (seen.has(key)) continue;
//           seen.add(key);
//           uniq.push({ ...s, label });
//         }

//         uniq.sort((a, b) => String(getSubjectLabel(a)).localeCompare(String(getSubjectLabel(b))));
//         setSubjects(uniq);
//       } catch (err) {
//         console.error("Erreur chargement matières:", err);
//         setSubjects([]);
//       } finally {
//         setLoadingSubjects(false);
//       }
//     };

//     loadSubjects();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedClassId, semester]);

//   // ✅ NOUVEAU: Charger la matrice (students+subjects(codes)+values(notes))
//   useEffect(() => {
//     const loadMatrix = async () => {
//       setMatrix(null);
//       if (!selectedClassId || !academicYear || !semester || !exam || !session) return;

//       setLoadingMatrix(true);
//       try {
//         const params = new URLSearchParams({
//           academicYear: cleanStr(academicYear),
//           classId: cleanStr(selectedClassId),
//           semester: cleanStr(semester),
//           exam: cleanStr(exam),
//           session: cleanStr(session),
//         });

//         const url1 = `${API_BASE}/class-reports/notes-matrix?${params.toString()}`;
//         const url2 = `${API_BASE}/api/class-reports/notes-matrix?${params.toString()}`;

//         const data = await fetchJsonFirstOk([url1, url2]);
//         setMatrix(data || null);

//         // ✅ important: on utilise les subjects de la matrix (déjà en CODE UE)
//         if (Array.isArray(data?.subjects)) setSubjects(data.subjects);
//       } catch (err) {
//         console.error("Erreur chargement notes matrix:", err);
//         setMatrix(null);
//       } finally {
//         setLoadingMatrix(false);
//       }
//     };

//     loadMatrix();
//   }, [selectedClassId, academicYear, semester, exam, session]);

//   // ✅ Colonnes = codes UE depuis matrix si dispo
//   const subjectColumns = useMemo(() => {
//     const fromMatrix =
//       Array.isArray(matrix?.subjects) && matrix.subjects.length
//         ? matrix.subjects.map((s) => cleanStr(s.code || "")).filter(Boolean)
//         : [];

//     if (fromMatrix.length) return fromMatrix;

//     return subjects.map((s) => getSubjectLabel(s)).filter(Boolean);
//   }, [matrix, subjects]);

//   // ✅ Etudiants = ceux renvoyés par la matrix (mêmes ids que values)
//   const sortedStudents = useMemo(() => {
//     const st =
//       Array.isArray(matrix?.students) && matrix.students.length
//         ? matrix.students
//         : studentsFromClass;

//     return [...st].sort((a, b) => {
//       const nameA = (a.fullName || `${a.lastName || ""} ${a.firstName || ""}`).toUpperCase();
//       const nameB = (b.fullName || `${b.lastName || ""} ${b.firstName || ""}`).toUpperCase();
//       if (nameA < nameB) return -1;
//       if (nameA > nameB) return 1;
//       return (a.matricule || "").toUpperCase().localeCompare((b.matricule || "").toUpperCase());
//     });
//   }, [matrix, studentsFromClass]);

//   const valuesMap = matrix?.values || {};

//   const getStudentDisplayName = (stu) => {
//     if (!stu) return "";
//     if (stu.fullName) return String(stu.fullName).toUpperCase();
//     const last = cleanStr(stu.lastName || "").toUpperCase();
//     const first = cleanStr(stu.firstName || "");
//     return cleanStr(`${last} ${first}`).toUpperCase();
//   };

//   const handleGeneratePdf = () => {
//     if (busy) return;

//     if (!selectedClass) {
//       alert("Veuillez d'abord choisir une classe.");
//       return;
//     }

//     setBusy(true);
//     try {
//       const html = generateNotesMatrixPDFHTML({
//         academicYear,
//         classTitle: selectedClass.title || selectedClass.abbrev || selectedClass.id,
//         specialite: specDisplay || "",
//         semester,
//         exam,
//         session,
//         students: sortedStudents,
//         subjectColumns,
//         values: valuesMap,
//       });

//       const w = window.open("", "_blank");
//       if (!w) {
//         alert("Popup bloquée. Autorisez les popups pour générer le PDF.");
//         return;
//       }
//       w.document.open();
//       w.document.write(html);
//       w.document.close();
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div style={styles.overlay}>
//       <div style={styles.modal}>
//         <header style={styles.modalHeader}>
//           <div>
//             <h2 style={styles.modalTitle}>Liste des notes (classe) — A4 paysage</h2>
//             <p style={styles.modalSubtitle}>
//               Sélectionne Année / Classe / Semestre / Examen / Session, puis génère la liste.
//             </p>
//           </div>
//           <button type="button" style={styles.closeBtn} onClick={onClose}>
//             ✕
//           </button>
//         </header>

//         <div style={styles.body}>
//           {/* LEFT */}
//           <div style={styles.leftPanel}>
//             <div style={styles.filtersRow}>
//               <div style={styles.fieldGroup}>
//                 <label style={styles.label}>Année académique</label>
//                 <select
//                   value={academicYear}
//                   onChange={(e) => setAcademicYear(e.target.value)}
//                   style={styles.pillSelect}
//                 >
//                   {ACADEMIC_YEARS.map((y) => (
//                     <option key={y} value={y}>
//                       {y}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div style={styles.fieldGroup}>
//                 <label style={styles.label}>Classe</label>
//                 <select
//                   value={selectedClassId}
//                   onChange={(e) => setSelectedClassId(e.target.value)}
//                   style={styles.pillSelect}
//                 >
//                   <option value="">{loadingClasses ? "Chargement..." : "— Choisir —"}</option>
//                   {classes.map((cls) => (
//                     <option key={cls.id} value={cls.id}>
//                       {cls.title || cls.abbrev || cls.id}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div style={styles.fieldGroup}>
//                 <label style={styles.label}>Semestre</label>
//                 <select
//                   value={semester}
//                   onChange={(e) => setSemester(e.target.value)}
//                   style={styles.pillSelect}
//                 >
//                   {SEMESTERS.map((s) => (
//                     <option key={s} value={s}>
//                       {s}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div style={styles.fieldGroup}>
//                 <label style={styles.label}>Examen</label>
//                 <select
//                   value={exam}
//                   onChange={(e) => setExam(e.target.value)}
//                   style={styles.pillSelect}
//                 >
//                   {EXAMS.map((x) => (
//                     <option key={x} value={x}>
//                       {x}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div style={styles.fieldGroup}>
//                 <label style={styles.label}>Session</label>
//                 <select
//                   value={session}
//                   onChange={(e) => setSession(e.target.value)}
//                   style={styles.pillSelect}
//                 >
//                   {SESSIONS.map((x) => (
//                     <option key={x} value={x}>
//                       {x}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div style={{ marginTop: 10 }}>
//               {!selectedClass ? (
//                 <p style={styles.smallHint}>Choisis une classe pour voir l’aperçu.</p>
//               ) : loadingMatrix ? (
//                 <p style={styles.smallHint}>Chargement des notes…</p>
//               ) : subjectColumns.length === 0 ? (
//                 <p style={styles.smallHint}>Aucune matière trouvée pour cette classe.</p>
//               ) : (
//                 <p style={styles.smallHint}>
//                   Colonnes UE (codes) : <strong>{subjectColumns.length}</strong>
//                 </p>
//               )}

//               {selectedClass && matrix?.debug && (
//                 <p style={styles.smallHint}>
//                   Notes trouvées: <strong>{matrix.debug.notesCount}</strong> — Étudiants:{" "}
//                   <strong>{matrix.debug.studentsCount}</strong>
//                 </p>
//               )}

//               {selectedClass && !loadingMatrix && !matrix && (
//                 <p style={{ ...styles.smallHint, color: "crimson" }}>
//                   Impossible de charger les notes. Vérifie l’endpoint /class-reports/notes-matrix.
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* RIGHT PREVIEW */}
//           <div style={styles.previewPanel}>
//             <div style={styles.previewWrapper}>
//               <div ref={sheetRef} style={sheetStyles.sheetLandscape}>
//                 <NotesHeader />

//                 <div style={sheetStyles.metaRow}>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Année académique :</span>{" "}
//                     <span style={sheetStyles.metaValue}>{academicYear || ""}</span>
//                   </div>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Classe :</span>{" "}
//                     <span style={sheetStyles.metaValue}>
//                       {selectedClass?.title || selectedClass?.abbrev || ""}
//                     </span>
//                   </div>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Semestre :</span>{" "}
//                     <span style={sheetStyles.metaValue}>{semester}</span>
//                   </div>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Examen :</span>{" "}
//                     <span style={sheetStyles.metaValue}>{exam}</span>
//                   </div>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Session :</span>{" "}
//                     <span style={sheetStyles.metaValue}>{session}</span>
//                   </div>
//                 </div>

//                 <div style={sheetStyles.metaRow}>
//                   <div>
//                     <span style={sheetStyles.metaLabel}>Spécialité :</span>{" "}
//                     <span style={sheetStyles.metaValue}>{specDisplay || ""}</span>
//                   </div>
//                 </div>

//                 <div style={sheetStyles.titleRow}>LISTE DES NOTES (CLASSE)</div>

//                 <div style={sheetStyles.tableWrap}>
//                   <table style={sheetStyles.table}>
//                     <thead>
//                       <tr>
//                         <th style={sheetStyles.thNum}></th>
//                         <th style={sheetStyles.thMat}>Matricule</th>
//                         <th style={sheetStyles.thName}>Noms et prénoms</th>
//                         {subjectColumns.map((code) => (
//                           <th key={code} style={sheetStyles.thSubj} title={code}>
//                             {code}
//                           </th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {!selectedClass ? (
//                         <tr>
//                           <td colSpan={3 + Math.max(subjectColumns.length, 1)} style={sheetStyles.tdEmpty}>
//                             Choisis une classe.
//                           </td>
//                         </tr>
//                       ) : sortedStudents.length === 0 ? (
//                         <tr>
//                           <td colSpan={3 + Math.max(subjectColumns.length, 1)} style={sheetStyles.tdEmpty}>
//                             Aucun étudiant dans cette classe.
//                           </td>
//                         </tr>
//                       ) : (
//                         sortedStudents.map((stu, idx) => {
//                           const sid = cleanStr(stu.id || "");
//                           const row = sid ? valuesMap?.[sid] || {} : {};
//                           return (
//                             <tr key={stu.id || idx}>
//                               <td style={sheetStyles.tdCenter}>{idx + 1}</td>
//                               <td style={sheetStyles.tdMono}>{stu.matricule || ""}</td>
//                               <td style={sheetStyles.tdNameCell}>{getStudentDisplayName(stu)}</td>
//                               {subjectColumns.map((code) => {
//                                 const v = row?.[code];
//                                 const show =
//                                   v !== undefined && v !== null && String(v).trim() !== "" ? v : "";
//                                 return (
//                                   <td key={`${stu.id || idx}-${code}`} style={sheetStyles.tdBlank}>
//                                     {show}
//                                   </td>
//                                 );
//                               })}
//                             </tr>
//                           );
//                         })
//                       )}
//                     </tbody>
//                   </table>
//                 </div>

//                 <div style={sheetStyles.footerRow}>Nom, date et signature du responsable :</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <footer style={styles.footer}>
//           <button type="button" style={styles.secondaryBtn} onClick={onClose}>
//             Fermer
//           </button>

//           <button
//             type="button"
//             style={{
//               ...styles.primaryBtn,
//               opacity: busy ? 0.6 : 1,
//               cursor: busy ? "not-allowed" : "pointer",
//             }}
//             onClick={handleGeneratePdf}
//             disabled={busy}
//           >
//             {busy ? "Ouverture..." : "Générer en PDF"}
//           </button>
//         </footer>
//       </div>
//     </div>
//   );
// }

// /* ---------- styles modale ---------- */
// const styles = {
//   overlay: {
//     position: "fixed",
//     inset: 0,
//     background: "rgba(0,0,0,.35)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 2100,
//   },
//   modal: {
//     width: "95vw",
//     maxWidth: "1600px",
//     maxHeight: "95vh",
//     background: "#ffffff",
//     borderRadius: 12,
//     display: "flex",
//     flexDirection: "column",
//     overflow: "hidden",
//   },
//   modalHeader: {
//     padding: "0.75rem 1.25rem",
//     borderBottom: "1px solid #E5E7EB",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     gap: "0.75rem",
//   },
//   modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 800 },
//   modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
//   closeBtn: { border: "none", background: "transparent", fontSize: "1rem", cursor: "pointer" },
//   body: {
//     flex: 1,
//     display: "grid",
//     gridTemplateColumns: "minmax(360px, 420px) 1fr",
//     minHeight: 0,
//   },
//   leftPanel: {
//     padding: "1rem 1.25rem",
//     borderRight: "1px solid #E5E7EB",
//     overflowY: "auto",
//   },
//   previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
//   previewWrapper: { display: "flex", justifyContent: "center" },
//   filtersRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
//   fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
//   label: { fontSize: ".78rem", fontWeight: 700, color: "#374151" },
//   pillSelect: {
//     height: 34,
//     borderRadius: 999,
//     border: "1px solid #D1D5DB",
//     padding: "0 0.8rem",
//     fontSize: ".85rem",
//     background: "#ffffff",
//     outline: "none",
//   },
//   smallHint: { margin: 0, marginTop: 6, fontSize: ".78rem", color: "#6B7280" },
//   footer: {
//     padding: "0.75rem 1.25rem",
//     borderTop: "1px solid #E5E7EB",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     gap: "0.75rem",
//   },
//   secondaryBtn: {
//     borderRadius: 999,
//     border: "1px solid #D1D5DB",
//     background: "#ffffff",
//     padding: "0.45rem 1.1rem",
//     fontSize: ".85rem",
//     cursor: "pointer",
//     fontWeight: 600,
//   },
//   primaryBtn: {
//     borderRadius: 999,
//     border: "none",
//     background: "#2563EB",
//     color: "#ffffff",
//     padding: "0.45rem 1.1rem",
//     fontSize: ".85rem",
//     cursor: "pointer",
//     fontWeight: 800,
//   },
// };

// /* ---------- styles fiche (preview) ---------- */
// const sheetStyles = {
//   sheetLandscape: {
//     width: "1123px",
//     minHeight: "794px",
//     background: "#ffffff",
//     boxShadow: "0 0 0 1px #000000",
//     fontFamily: 'Arial, "Helvetica Neue", sans-serif',
//     display: "flex",
//     flexDirection: "column",
//     fontSize: "11px",
//     paddingBottom: 10,
//   },
//   metaRow: {
//     display: "flex",
//     flexWrap: "wrap",
//     gap: "14px",
//     padding: "6px 10px 0 10px",
//     justifyContent: "space-between",
//   },
//   metaLabel: { fontWeight: 800 },
//   metaValue: { fontWeight: 500 },
//   titleRow: {
//     textAlign: "center",
//     fontWeight: "900",
//     fontSize: "14px",
//     marginTop: 10,
//     marginBottom: 6,
//     textDecoration: "underline",
//   },
//   tableWrap: { flex: 1, padding: "0 10px 10px 10px", overflow: "hidden" },
//   table: { width: "100%", borderCollapse: "collapse" },
//   thNum: { border: "1px solid #000000", padding: "3px 4px", width: 30, textAlign: "center", background: "#fff" },
//   thMat: { border: "1px solid #000000", padding: "3px 4px", width: 110, textAlign: "center" },
//   thName: { border: "1px solid #000000", padding: "3px 6px", width: 240, textAlign: "left" },
//   thSubj: { border: "1px solid #000000", padding: "3px 4px", minWidth: 70, textAlign: "center", fontSize: "10px", whiteSpace: "nowrap" },
//   tdCenter: { border: "1px solid #000000", padding: "3px 4px", textAlign: "center" },
//   tdMono: { border: "1px solid #000000", padding: "3px 4px", fontFamily: '"Courier New", monospace', fontSize: "10px", textAlign: "center" },
//   tdNameCell: { border: "1px solid #000000", padding: "3px 6px" },
//   tdBlank: { border: "1px solid #000000", padding: "3px 4px", height: 18 },
//   tdEmpty: { border: "1px solid #000000", padding: "10px", textAlign: "center", fontStyle: "italic", color: "#6B7280" },
//   footerRow: { marginTop: 4, padding: "0 10px", fontSize: "0.85rem", textAlign: "left" },
// };

// /* ---------- Génération HTML printable (A4 paysage) ---------- */
// function generateNotesMatrixPDFHTML({
//   academicYear,
//   classTitle,
//   specialite,
//   semester,
//   exam,
//   session,
//   students,
//   subjectColumns,
//   values,
// }) {
//   const safeYear = academicYear || "—";
//   const safeClass = classTitle || "—";
//   const safeSpec = specialite || "—";
//   const safeSemester = semester || "—";
//   const safeExam = exam || "—";
//   const safeSession = session || "—";

//   const cols = subjectColumns && subjectColumns.length ? subjectColumns : [];
//   const vals = values || {};

//   const headColsHTML = cols.map((c) => `<th class="th-subj">${escapeHtml(c)}</th>`).join("");

//   const bodyRowsHTML =
//     students && students.length
//       ? students
//           .map((s, idx) => {
//             const sid = cleanStr(s?.id || "");
//             const last = cleanStr(s?.lastName || "").toUpperCase();
//             const first = cleanStr(s?.firstName || "");
//             const full = (s.fullName ? cleanStr(s.fullName) : cleanStr(`${last} ${first}`)).toUpperCase();
//             const matricule = s.matricule || "";

//             const row = sid ? vals[sid] || {} : {};
//             const cells = cols
//               .map((code) => {
//                 const v = row?.[code];
//                 const txt = v === undefined || v === null || String(v).trim() === "" ? "" : String(v);
//                 return `<td>${escapeHtml(txt)}</td>`;
//               })
//               .join("");

//             return `
//               <tr>
//                 <td class="td-center">${idx + 1}</td>
//                 <td class="td-mono">${escapeHtml(matricule)}</td>
//                 <td class="td-left">${escapeHtml(full)}</td>
//                 ${cells}
//               </tr>
//             `;
//           })
//           .join("")
//       : `
//         <tr>
//           <td colspan="${3 + Math.max(cols.length, 1)}" class="td-empty">Aucun étudiant.</td>
//         </tr>
//       `;

//   return `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8" />
//   <title>Liste des notes</title>
//   <style>
//     @page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
//     body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 11px; }
//     .page { width: 297mm; min-height: 210mm; page-break-after: always; }

//     .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 8px; }
//     .meta span b { font-weight: 800; }
//     .title { text-align: center; font-weight: 900; font-size: 14px; margin: 10px 0 6px; text-decoration: underline; }

//     table { width: 100%; border-collapse: collapse; margin-top: 6px; }
//     th, td { border: 1px solid #000; padding: 4px; height: 22px; text-align: center; }
//     .th-num { width: 30px; }
//     .th-mat { width: 95px; }
//     .th-name { width: 80mm; text-align: left; padding-left: 6px; }
//     .th-subj { min-width: 18mm; font-size: 10px; white-space: nowrap; }

//     .td-center { text-align: center; }
//     .td-mono { font-family: "Courier New", monospace; font-size: 10px; }
//     .td-left { text-align: left; padding-left: 6px; }
//     .td-empty { text-align: center; font-style: italic; color: #666; padding: 12px; }

//     .footer { margin-top: 8px; font-size: 12px; text-align: right; }
//   </style>
// </head>
// <body>
//   <div class="page">
//     <div class="meta">
//       <span><b>Année :</b> ${escapeHtml(safeYear)}</span>
//       <span><b>Classe :</b> ${escapeHtml(safeClass)}</span>
//       <span><b>Semestre :</b> ${escapeHtml(safeSemester)}</span>
//       <span><b>Examen :</b> ${escapeHtml(safeExam)}</span>
//       <span><b>Session :</b> ${escapeHtml(safeSession)}</span>
//     </div>
//     <div class="meta" style="margin-top:6px;">
//       <span><b>Spécialité :</b> ${escapeHtml(safeSpec)}</span>
//     </div>

//     <div class="title">LISTE DES NOTES (CLASSE)</div>

//     <table>
//       <thead>
//         <tr>
//           <th class="th-num"></th>
//           <th class="th-mat">Matricule</th>
//           <th class="th-name">Noms et prénoms</th>
//           ${headColsHTML}
//         </tr>
//       </thead>
//       <tbody>
//         ${bodyRowsHTML}
//       </tbody>
//     </table>

//     <div class="footer">
//       Nom, date et signature du responsable :
//     </div>
//   </div>

//   <script>
//     window.onload = function () {
//       window.print();
//       setTimeout(function () { window.close(); }, 700);
//     };
//   </script>
// </body>
// </html>`;
// }

// function escapeHtml(str) {
//   return String(str || "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");
// }

















// src/components/documents/ClassNotesMatrixSheet.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import NotesHeader from "./NotesHeader.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const DEFAULT_YEAR = "2025-2026";

const SEMESTERS = ["S1", "S2"];
const EXAMS = ["CC", "SN", "EXAMEN"];
const SESSIONS = ["Principale", "Rattrapage"];

// --- helpers ---
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

function cleanStr(x) {
  return (x ?? "").toString().trim();
}

export default function ClassNotesMatrixSheet({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [semester, setSemester] = useState("S1");
  const [exam, setExam] = useState("CC");
  const [session, setSession] = useState("Principale");

  // ✅ La matrix vient du backend (fusion notes + note_sheets)
  const [matrix, setMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);

  // ---------- Chargement des classes ----------
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

  const capitalizeFirst = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const getSpecialiteDisplay = (group) => {
    if (!group) return "";
    if (group.displayName && group.displayName.trim() !== "") {
      const beforeDash = group.displayName.split("-")[0].trim();
      if (beforeDash) return capitalizeFirst(beforeDash);
    }
    if (group.option && group.option.trim() !== "") return capitalizeFirst(group.option);
    if (group.specialite && group.specialite.trim() !== "")
      return capitalizeFirst(group.specialite);
    if (group.specialiteCode && group.specialiteCode.trim() !== "")
      return group.specialiteCode;
    if (group.optionCode && group.optionCode.trim() !== "") return group.optionCode;
    if (group.filiere && group.filiere.trim() !== "") return capitalizeFirst(group.filiere);
    return "";
  };

  const specDisplay = useMemo(() => getSpecialiteDisplay(selectedClass), [selectedClass]);

  // ✅ Charger la matrix (students + subjects(codes) + values(notes) + stats)
  useEffect(() => {
    const loadMatrix = async () => {
      setMatrix(null);
      if (!selectedClassId || !academicYear || !semester || !exam || !session) return;

      setLoadingMatrix(true);
      try {
        const params = new URLSearchParams({
          academicYear: cleanStr(academicYear),
          classId: cleanStr(selectedClassId),
          semester: cleanStr(semester),
          exam: cleanStr(exam),
          session: cleanStr(session),
        });

        const url1 = `${API_BASE}/class-reports/notes-matrix?${params.toString()}`;
        const url2 = `${API_BASE}/api/class-reports/notes-matrix?${params.toString()}`;

        const data = await fetchJsonFirstOk([url1, url2]);
        setMatrix(data || null);
      } catch (err) {
        console.error("Erreur chargement notes matrix:", err);
        setMatrix(null);
      } finally {
        setLoadingMatrix(false);
      }
    };

    loadMatrix();
  }, [selectedClassId, academicYear, semester, exam, session]);

  // ✅ Colonnes UE = codes renvoyés par le backend (source de vérité)
  const subjectColumns = useMemo(() => {
    const cols =
      Array.isArray(matrix?.subjects) && matrix.subjects.length
        ? matrix.subjects.map((s) => cleanStr(s.code || "")).filter(Boolean)
        : [];
    return cols;
  }, [matrix]);

  // ✅ Étudiants = ceux renvoyés par le backend (source de vérité)
  const sortedStudents = useMemo(() => {
    const st =
      Array.isArray(matrix?.students) && matrix.students.length ? matrix.students : [];
    return [...st].sort((a, b) => {
      const nameA = `${cleanStr(a.lastName).toUpperCase()} ${cleanStr(a.firstName)}`.trim();
      const nameB = `${cleanStr(b.lastName).toUpperCase()} ${cleanStr(b.firstName)}`.trim();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return cleanStr(a.matricule).localeCompare(cleanStr(b.matricule));
    });
  }, [matrix]);

  const valuesMap = matrix?.values || {};

  const getStudentDisplayName = (stu) => {
    const last = cleanStr(stu?.lastName || "").toUpperCase();
    const first = cleanStr(stu?.firstName || "");
    return cleanStr(`${last} ${first}`).toUpperCase();
  };

  // ✅ Compteur notes
  const notesCount = matrix?.stats?.notes ?? 0;

  const handleGeneratePdf = () => {
    if (busy) return;
    if (!selectedClass) {
      alert("Veuillez d'abord choisir une classe.");
      return;
    }

    setBusy(true);
    try {
      const html = generateNotesMatrixPDFHTML({
        academicYear,
        classTitle: selectedClass.title || selectedClass.abbrev || selectedClass.id,
        specialite: specDisplay || "",
        semester,
        exam,
        session,
        students: sortedStudents,
        subjectColumns,
        values: valuesMap,
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
            <h2 style={styles.modalTitle}>Liste des notes (classe) — A4 paysage</h2>
            <p style={styles.modalSubtitle}>
              Sélectionne Année / Classe / Semestre / Examen / Session, puis génère la liste.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          {/* LEFT */}
          <div style={styles.leftPanel}>
            <div style={styles.filtersRow}>
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
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Examen</label>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  style={styles.pillSelect}
                >
                  {EXAMS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
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
            </div>

            <div style={{ marginTop: 10 }}>
              {!selectedClass ? (
                <p style={styles.smallHint}>Choisis une classe pour voir l’aperçu.</p>
              ) : loadingMatrix ? (
                <p style={styles.smallHint}>Chargement des notes…</p>
              ) : subjectColumns.length === 0 ? (
                <p style={styles.smallHint}>Aucune UE trouvée pour cette classe.</p>
              ) : (
                <>
                  <p style={styles.smallHint}>
                    Colonnes UE (codes) : <strong>{subjectColumns.length}</strong>
                  </p>
                  <p style={styles.smallHint}>
                    Notes trouvées : <strong>{notesCount}</strong> — Étudiants :{" "}
                    <strong>{sortedStudents.length}</strong>
                  </p>
                </>
              )}

              {selectedClass && !loadingMatrix && !matrix && (
                <p style={{ ...styles.smallHint, color: "crimson" }}>
                  Impossible de charger les notes. Vérifie l’endpoint /class-reports/notes-matrix.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <div style={styles.previewPanel}>
            <div style={styles.previewWrapper}>
              <div ref={sheetRef} style={sheetStyles.sheetLandscape}>
                <NotesHeader />

                <div style={sheetStyles.metaRow}>
                  <div>
                    <span style={sheetStyles.metaLabel}>Année académique :</span>{" "}
                    <span style={sheetStyles.metaValue}>{academicYear || ""}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Classe :</span>{" "}
                    <span style={sheetStyles.metaValue}>
                      {selectedClass?.title || selectedClass?.abbrev || ""}
                    </span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Semestre :</span>{" "}
                    <span style={sheetStyles.metaValue}>{semester}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Examen :</span>{" "}
                    <span style={sheetStyles.metaValue}>{exam}</span>
                  </div>
                  <div>
                    <span style={sheetStyles.metaLabel}>Session :</span>{" "}
                    <span style={sheetStyles.metaValue}>{session}</span>
                  </div>
                </div>

                <div style={sheetStyles.metaRow}>
                  <div>
                    <span style={sheetStyles.metaLabel}>Spécialité :</span>{" "}
                    <span style={sheetStyles.metaValue}>{specDisplay || ""}</span>
                  </div>
                </div>

                <div style={sheetStyles.titleRow}>LISTE DES NOTES (CLASSE)</div>

                <div style={sheetStyles.tableWrap}>
                  <table style={sheetStyles.table}>
                    <thead>
                      <tr>
                        <th style={sheetStyles.thNum}></th>
                        <th style={sheetStyles.thMat}>Matricule</th>
                        <th style={sheetStyles.thName}>Noms et prénoms</th>
                        {subjectColumns.map((code) => (
                          <th key={code} style={sheetStyles.thSubj} title={code}>
                            {code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedClass ? (
                        <tr>
                          <td
                            colSpan={3 + Math.max(subjectColumns.length, 1)}
                            style={sheetStyles.tdEmpty}
                          >
                            Choisis une classe.
                          </td>
                        </tr>
                      ) : sortedStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3 + Math.max(subjectColumns.length, 1)}
                            style={sheetStyles.tdEmpty}
                          >
                            Aucun étudiant dans cette classe.
                          </td>
                        </tr>
                      ) : (
                        sortedStudents.map((stu, idx) => {
                          const sid = cleanStr(stu.id || "");
                          const row = sid ? valuesMap?.[sid] || {} : {};
                          return (
                            <tr key={sid || idx}>
                              <td style={sheetStyles.tdCenter}>{idx + 1}</td>
                              <td style={sheetStyles.tdMono}>{stu.matricule || ""}</td>
                              <td style={sheetStyles.tdNameCell}>
                                {getStudentDisplayName(stu)}
                              </td>
                              {subjectColumns.map((code) => {
                                const v = row?.[code];
                                const show =
                                  v !== undefined && v !== null && String(v).trim() !== ""
                                    ? String(v)
                                    : "";
                                return (
                                  <td key={`${sid}-${code}`} style={sheetStyles.tdBlank}>
                                    {show}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={sheetStyles.footerRow}>Nom, date et signature du responsable :</div>
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
    maxWidth: "1600px",
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
  modalTitle: { margin: 0, fontSize: "1rem", fontWeight: 800 },
  modalSubtitle: { margin: 0, marginTop: 2, fontSize: ".8rem", color: "#6B7280" },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: "1rem",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(360px, 420px) 1fr",
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem 1.25rem",
    borderRight: "1px solid #E5E7EB",
    overflowY: "auto",
  },
  previewPanel: { padding: "1rem", background: "#F3F4F6", overflow: "auto" },
  previewWrapper: { display: "flex", justifyContent: "center" },

  filtersRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".78rem", fontWeight: 700, color: "#374151" },
  pillSelect: {
    height: 34,
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    padding: "0 0.8rem",
    fontSize: ".85rem",
    background: "#ffffff",
    outline: "none",
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
    fontWeight: 600,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#2563EB",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 800,
  },
};

/* ---------- styles fiche (preview) ---------- */
const sheetStyles = {
  sheetLandscape: {
    width: "1123px",
    minHeight: "794px",
    background: "#ffffff",
    boxShadow: "0 0 0 1px #000000",
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    display: "flex",
    flexDirection: "column",
    fontSize: "11px",
    paddingBottom: 10,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    padding: "6px 10px 0 10px",
    justifyContent: "space-between",
  },
  metaLabel: { fontWeight: 800 },
  metaValue: { fontWeight: 500 },
  titleRow: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: "14px",
    marginTop: 10,
    marginBottom: 6,
    textDecoration: "underline",
  },
  tableWrap: { flex: 1, padding: "0 10px 10px 10px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thNum: { border: "1px solid #000", padding: "3px 4px", width: 30, textAlign: "center" },
  thMat: { border: "1px solid #000", padding: "3px 4px", width: 110, textAlign: "center" },
  thName: { border: "1px solid #000", padding: "3px 6px", width: 240, textAlign: "left" },
  thSubj: {
    border: "1px solid #000",
    padding: "3px 4px",
    minWidth: 70,
    textAlign: "center",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },
  tdCenter: { border: "1px solid #000", padding: "3px 4px", textAlign: "center" },
  tdMono: {
    border: "1px solid #000",
    padding: "3px 4px",
    fontFamily: '"Courier New", monospace',
    fontSize: "10px",
    textAlign: "center",
  },
  tdNameCell: { border: "1px solid #000", padding: "3px 6px" },
  tdBlank: { border: "1px solid #000", padding: "3px 4px", height: 18 },
  tdEmpty: {
    border: "1px solid #000",
    padding: "10px",
    textAlign: "center",
    fontStyle: "italic",
    color: "#6B7280",
  },
  footerRow: { marginTop: 4, padding: "0 10px", fontSize: "0.85rem", textAlign: "left" },
};

/* ---------- PDF HTML ---------- */
function generateNotesMatrixPDFHTML({
  academicYear,
  classTitle,
  specialite,
  semester,
  exam,
  session,
  students,
  subjectColumns,
  values,
}) {
  const safeYear = academicYear || "—";
  const safeClass = classTitle || "—";
  const safeSpec = specialite || "—";
  const safeSemester = semester || "—";
  const safeExam = exam || "—";
  const safeSession = session || "—";

  const cols = subjectColumns && subjectColumns.length ? subjectColumns : [];
  const vals = values || {};

  const headColsHTML = cols.map((c) => `<th class="th-subj">${escapeHtml(c)}</th>`).join("");

  const bodyRowsHTML =
    students && students.length
      ? students
          .map((s, idx) => {
            const sid = cleanStr(s?.id || "");
            const last = cleanStr(s?.lastName || "").toUpperCase();
            const first = cleanStr(s?.firstName || "");
            const full = cleanStr(`${last} ${first}`).toUpperCase();
            const matricule = cleanStr(s?.matricule || "");
            const row = sid ? vals[sid] || {} : {};

            const cells = cols
              .map((code) => {
                const v = row?.[code];
                const txt = v === undefined || v === null || String(v).trim() === "" ? "" : String(v);
                return `<td>${escapeHtml(txt)}</td>`;
              })
              .join("");

            return `
              <tr>
                <td class="td-center">${idx + 1}</td>
                <td class="td-mono">${escapeHtml(matricule)}</td>
                <td class="td-left">${escapeHtml(full)}</td>
                ${cells}
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="${3 + Math.max(cols.length, 1)}" class="td-empty">Aucun étudiant.</td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Liste des notes</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #000; font-size: 11px; }
    .page { width: 297mm; min-height: 210mm; page-break-after: always; }
    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 8px; }
    .meta span b { font-weight: 800; }
    .title { text-align: center; font-weight: 900; font-size: 14px; margin: 10px 0 6px; text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000; padding: 4px; height: 22px; text-align: center; }
    .th-num { width: 30px; }
    .th-mat { width: 95px; }
    .th-name { width: 80mm; text-align: left; padding-left: 6px; }
    .th-subj { min-width: 18mm; font-size: 10px; white-space: nowrap; }
    .td-center { text-align: center; }
    .td-mono { font-family: "Courier New", monospace; font-size: 10px; }
    .td-left { text-align: left; padding-left: 6px; }
    .td-empty { text-align: center; font-style: italic; color: #666; padding: 12px; }
    .footer { margin-top: 8px; font-size: 12px; text-align: right; }
  </style>
</head>
<body>
  <div class="page">
    <div class="meta">
      <span><b>Année :</b> ${escapeHtml(safeYear)}</span>
      <span><b>Classe :</b> ${escapeHtml(safeClass)}</span>
      <span><b>Semestre :</b> ${escapeHtml(safeSemester)}</span>
      <span><b>Examen :</b> ${escapeHtml(safeExam)}</span>
      <span><b>Session :</b> ${escapeHtml(safeSession)}</span>
    </div>
    <div class="meta" style="margin-top:6px;">
      <span><b>Spécialité :</b> ${escapeHtml(safeSpec)}</span>
    </div>

    <div class="title">LISTE DES NOTES (CLASSE)</div>

    <table>
      <thead>
        <tr>
          <th class="th-num"></th>
          <th class="th-mat">Matricule</th>
          <th class="th-name">Noms et prénoms</th>
          ${headColsHTML}
        </tr>
      </thead>
      <tbody>
        ${bodyRowsHTML}
      </tbody>
    </table>

    <div class="footer">Nom, date et signature du responsable :</div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 700);
    };
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
