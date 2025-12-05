// src/pages/ClassesPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { colors } from "../styles/theme";
import { Users, Crown, Download } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* -------- Helpers côté front -------- */

function normalizeRole(r = "") {
  return r
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isClassRepresentativeRole(role) {
  const nr = normalizeRole(role);
  if (!nr) return false;
  return nr.startsWith("delegue") || nr.startsWith("adjoint");
}

function sanitizeFileName(name = "export") {
  return (
    name
      .toString()
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "export"
  );
}

/* ===== CSV (on garde pour l’instant) ===== */

function rowsToCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = (v ?? "").toString();
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(";")),
  ];
  // BOM UTF-8 pour Excel
  return "\uFEFF" + lines.join("\n");
}

function downloadCSV(filename, rows) {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===== PDF via print HTML ===== */

function roleBadgeHTML(label, bg) {
  if (!label || label === "Aucune") return "";
  return `
    <span class="badge" style="background:${bg}">
      ${label}
    </span>
  `;
}

function exportClassToPDF(cls) {
  const reps = (cls.students || []).filter((s) =>
    isClassRepresentativeRole(s.classRole)
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${cls.title || "Classe"}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body {
      font-family: Arial, sans-serif;
      color: #111;
      font-size: 12.5px;
      margin: 0;
      padding: 0;
    }
    .card {
      border: 1px solid #e6e8ee;
      border-radius: 12px;
      padding: 16px 18px;
    }
    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e6e8ee;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
    }
    .subtitle {
      margin-top: 4px;
      color: #6b7280;
      font-size: 13px;
    }
    .pill {
      border: 1px solid #e6e8ee;
      border-radius: 999px;
      padding: 6px 10px;
      font-weight: 700;
      font-size: 12.5px;
    }
    .section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #f1f2f5;
    }
    .section-title {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .row {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding: 6px 0;
      border-bottom: 1px dashed #e6e8ee;
      gap: 10px;
    }
    .left {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: 700;
      font-size: 13px;
      margin: 0;
    }
    .mat {
      margin: 2px 0 0 0;
      color: #6b7280;
      font-size: 12px;
    }
    .right {
      display:flex;
      align-items:center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content:flex-end;
      max-width: 260px;
      text-align:right;
    }
    .badge {
      display:inline-flex;
      align-items:center;
      padding: 3px 10px;
      border-radius: 999px;
      color: #fff;
      font-weight: 700;
      font-size: 11.5px;
      white-space: nowrap;
    }
    .phone {
      color:#6b7280;
      font-size: 12px;
      margin-left: 4px;
      white-space: nowrap;
    }
    .empty {
      color:#6b7280;
      font-style: italic;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1 class="title">${cls.title || "Classe"}</h1>
        <div class="subtitle">Effectif : ${cls.effectif || 0} étudiant(s)</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="pill">${cls.abbrev || "—"}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Représentants de la classe</div>
      ${
        reps.length === 0
          ? `<div class="empty">Aucun représentant renseigné.</div>`
          : reps
              .map(
                (s) => `
        <div class="row">
          <div class="left">
            <p class="name">${s.fullName || ""}</p>
            <p class="mat">${s.matricule || ""}</p>
          </div>
          <div class="right">
            ${roleBadgeHTML(s.classRole, "#FF8200")}
            ${roleBadgeHTML(s.schoolRole, "#00A082")}
            ${s.contact ? `<span class="phone">${s.contact}</span>` : ""}
          </div>
        </div>
      `
              )
              .join("")
      }
    </div>

    <div class="section">
      <div class="section-title">Liste complète de la classe</div>
      ${
        (cls.students || [])
          .map(
            (s) => `
        <div class="row">
          <div class="left">
            <p class="name">${s.fullName || ""} ${
              isClassRepresentativeRole(s.classRole) ? "👑" : ""
            }</p>
            <p class="mat">${s.matricule || ""}</p>
          </div>
          <div class="right">
            ${roleBadgeHTML(s.classRole, "#FF8200")}
            ${roleBadgeHTML(s.schoolRole, "#F50057")}
            ${s.contact ? `<span class="phone">${s.contact}</span>` : ""}
          </div>
        </div>
      `
          )
          .join("") || `<div class="empty">Aucun étudiant.</div>`
      }
    </div>
  </div>

  <script>
    // Lancer l'impression dès que la page est prête
    window.onload = () => {
      window.print();
      // optionnel : fermer après impression
      setTimeout(() => window.close(), 300);
    };
  </script>
</body>
</html>
`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup bloquée. Autorise les popups pour exporter en PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function exportBulkToPDF(classesList, cycleFilter, bulkLevel) {
  const pages = classesList.map((cls) => {
    const reps = (cls.students || []).filter((s) =>
      isClassRepresentativeRole(s.classRole)
    );

    return `
      <div class="card">
        <div class="header">
          <div>
            <h1 class="title">${cls.title || "Classe"}</h1>
            <div class="subtitle">Effectif : ${cls.effectif || 0} étudiant(s)</div>
          </div>
          <div class="pill">${cls.abbrev || "—"}</div>
        </div>

        <div class="section">
          <div class="section-title">Représentants de la classe</div>
          ${
            reps.length === 0
              ? `<div class="empty">Aucun représentant renseigné.</div>`
              : reps
                  .map(
                    (s) => `
            <div class="row">
              <div class="left">
                <p class="name">${s.fullName || ""}</p>
                <p class="mat">${s.matricule || ""}</p>
              </div>
              <div class="right">
                ${roleBadgeHTML(s.classRole, "#FF8200")}
                ${roleBadgeHTML(s.schoolRole, "#00A082")}
                ${s.contact ? `<span class="phone">${s.contact}</span>` : ""}
              </div>
            </div>
            `
                  )
                  .join("")
          }
        </div>

        <div class="section">
          <div class="section-title">Liste complète de la classe</div>
          ${
            (cls.students || [])
              .map(
                (s) => `
            <div class="row">
              <div class="left">
                <p class="name">${s.fullName || ""} ${
                  isClassRepresentativeRole(s.classRole) ? "👑" : ""
                }</p>
                <p class="mat">${s.matricule || ""}</p>
              </div>
              <div class="right">
                ${roleBadgeHTML(s.classRole, "#FF8200")}
                ${roleBadgeHTML(s.schoolRole, "#F50057")}
                ${s.contact ? `<span class="phone">${s.contact}</span>` : ""}
              </div>
            </div>
            `
              )
              .join("") || `<div class="empty">Aucun étudiant.</div>`
          }
        </div>
      </div>
      <div class="page-break"></div>
    `;
  });

  const title = sanitizeFileName(
    `classes_${cycleFilter}_${bulkLevel}_${new Date().toISOString().slice(0, 10)}`
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body {
      font-family: Arial, sans-serif;
      color: #111;
      font-size: 12.5px;
      margin: 0;
      padding: 0;
    }
    .card {
      border: 1px solid #e6e8ee;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 12px;
    }
    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e6e8ee;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
    }
    .subtitle {
      margin-top: 4px;
      color: #6b7280;
      font-size: 13px;
    }
    .pill {
      border: 1px solid #e6e8ee;
      border-radius: 999px;
      padding: 6px 10px;
      font-weight: 700;
      font-size: 12.5px;
      align-self: flex-start;
    }
    .section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #f1f2f5;
    }
    .section-title {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .row {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding: 6px 0;
      border-bottom: 1px dashed #e6e8ee;
      gap: 10px;
    }
    .left { flex:1; min-width:0; }
    .name { font-weight:700; font-size:13px; margin:0; }
    .mat { margin:2px 0 0 0; color:#6b7280; font-size:12px; }
    .right {
      display:flex;
      align-items:center;
      gap:6px;
      flex-wrap:wrap;
      justify-content:flex-end;
      max-width:260px;
      text-align:right;
    }
    .badge {
      display:inline-flex;
      align-items:center;
      padding: 3px 10px;
      border-radius: 999px;
      color: #fff;
      font-weight: 700;
      font-size: 11.5px;
      white-space: nowrap;
    }
    .phone {
      color:#6b7280;
      font-size:12px;
      margin-left:4px;
      white-space:nowrap;
    }
    .empty {
      color:#6b7280;
      font-style: italic;
      font-size: 12px;
    }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  ${pages.join("")}
  <script>
    window.onload = () => {
      window.print();
      setTimeout(() => window.close(), 300);
    };
  </script>
</body>
</html>
`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup bloquée. Autorise les popups pour exporter en PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}


export default function ClassesPage({
  currentSection = "classes",
  onNavigate,
}) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]); // pour stats
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");

  // niveau utilisé uniquement pour export multi
  const [bulkLevel, setBulkLevel] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const resClasses = await fetch(`${API_BASE}/classes`);
      const dataClasses = await resClasses.json();
      setClasses(Array.isArray(dataClasses) ? dataClasses : []);

      const resStudents = await fetch(`${API_BASE}/students`);
      const dataStudents = await resStudents.json();
      setStudents(Array.isArray(dataStudents) ? dataStudents : []);
    } catch (e) {
      console.error(e);
      setClasses([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClasses = useMemo(() => {
    const normSearch = search.trim().toLowerCase();

    return classes.filter((cls) => {
      if (filiereFilter !== "all") {
        const t =
          cls.filiere === "Filières industrielles"
            ? "industriel"
            : cls.filiere === "Filières de gestion"
            ? "gestion"
            : cls.filiere === "Filières carrières juridiques"
            ? "juridique"
            : null;
        if (t !== filiereFilter) return false;
      }

      if (cycleFilter !== "all" && cls.cycle !== cycleFilter) return false;

      if (normSearch) {
        const inTitle =
          (cls.title || "").toLowerCase().includes(normSearch) ||
          (cls.abbrev || "").toLowerCase().includes(normSearch);
        if (inTitle) return true;

        const inStudents = (cls.students || []).some((s) => {
          const name = (s.fullName || "").toLowerCase();
          const mat = (s.matricule || "").toLowerCase();
          return name.includes(normSearch) || mat.includes(normSearch);
        });
        if (!inStudents) return false;
      }

      return true;
    });
  }, [classes, filiereFilter, cycleFilter, search]);

  const stats = useMemo(() => {
    const classesActives = classes.length;
    const delegates = students.filter((s) =>
      isClassRepresentativeRole(s.classRole)
    ).length;
    const bureau = students.filter(
      (s) => s.schoolRole && s.schoolRole !== "Aucune"
    ).length;
    const actifs = students.length;

    return { classesActives, delegates, bureau, actifs };
  }, [classes, students]);

  const levelOptions = useMemo(() => {
    const base =
      cycleFilter === "all"
        ? classes
        : classes.filter((c) => c.cycle === cycleFilter);

    const uniq = new Set(base.map((c) => c.level).filter(Boolean));
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [classes, cycleFilter]);

  const handleBulkExportCSV = () => {
    const bulkClasses =
      bulkLevel === "all"
        ? filteredClasses
        : filteredClasses.filter((c) => c.level === bulkLevel);

    const rows = bulkClasses.flatMap((cls) =>
      (cls.students || []).map((s) => ({
        Classe: cls.title || "",
        Abbreviation: cls.abbrev || "",
        Cycle: cls.cycle || "",
        Niveau: cls.level || "",
        Matricule: s.matricule || "",
        Nom: s.fullName || "",
        Contact: s.contact || "",
        "Responsabilité de classe": s.classRole || "Aucune",
        "Responsabilité établissement": s.schoolRole || "Aucune",
      }))
    );

    if (!rows.length) {
      alert("Aucun étudiant à exporter avec ces critères.");
      return;
    }

    const file = sanitizeFileName(
      `classes_${cycleFilter}_${bulkLevel}_${new Date().toISOString().slice(0,10)}`
    );

    downloadCSV(`${file}.csv`, rows);
  };

  const handleBulkExportPDF = () => {
    const bulkClasses =
      bulkLevel === "all"
        ? filteredClasses
        : filteredClasses.filter((c) => c.level === bulkLevel);

    if (!bulkClasses.length) {
      alert("Aucune classe à exporter avec ces critères.");
      return;
    }

    exportBulkToPDF(bulkClasses, cycleFilter, bulkLevel);
  };

  return (
    <div style={sx.layout}>
      {/* Colonne gauche */}
      <aside style={sx.left}>
        <VerticalNavBar
          currentSection={currentSection}
          onNavigate={onNavigate}
        />
      </aside>

      {/* Colonne droite */}
      <main style={sx.right}>
        <HorizontalNavBar />
        <div style={sx.pageBody}>
          <div style={sx.container}>
            {/* HEADER */}
            <header style={sx.pageHeader}>
              <div>
                <h1 style={sx.pageTitle}>Gestion des Classes</h1>
                <p style={sx.pageSubtitle}>
                  Organisation des classes, délégués et bureau des élèves
                </p>
              </div>
            </header>

            {/* STAT CARDS */}
            <section style={sx.statsRow}>
              <StatCard
                label="Classes actives"
                value={stats.classesActives}
                helper="Année en cours"
              />
              <StatCard
                label="Délégués de classe"
                value={stats.delegates}
                helper="Représentants élus"
              />
              <StatCard
                label="Bureau des élèves"
                value={stats.bureau}
                helper="Membres actifs"
              />
              <StatCard
                label="Étudiants actifs"
                value={stats.actifs}
                helper="Tous niveaux"
              />
            </section>

            {/* FILTRES */}
            <section style={sx.filtersCard}>
              <p style={sx.filtersTitle}>Filtres</p>
              <p style={sx.filtersSub}>
                Affiner la recherche de classes et d&apos;étudiants
              </p>

              <div style={sx.filtersRow}>
                <div style={sx.filterCol}>
                  <input
                    style={sx.searchInput}
                    placeholder="Rechercher un étudiant ou une classe…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div style={sx.filterCol}>
                  <select
                    style={sx.select}
                    value={filiereFilter}
                    onChange={(e) => setFiliereFilter(e.target.value)}
                  >
                    <option value="all">Toutes les filières</option>
                    <option value="industriel">Filières industrielles</option>
                    <option value="gestion">Filières de gestion</option>
                    <option value="juridique">
                      Filières carrières juridiques
                    </option>
                  </select>
                </div>

                <div style={sx.filterCol}>
                  <select
                    style={sx.select}
                    value={cycleFilter}
                    onChange={(e) => {
                      setCycleFilter(e.target.value);
                      setBulkLevel("all");
                    }}
                  >
                    <option value="all">Toutes les promotions</option>
                    <option value="BTS">BTS</option>
                    <option value="LICENCE">Licence</option>
                    <option value="MASTER">Master</option>
                    <option value="INGÉNIEUR">Ingénieur</option>
                  </select>
                </div>

                <button
                  type="button"
                  style={sx.resetBtn}
                  onClick={() => {
                    setSearch("");
                    setFiliereFilter("all");
                    setCycleFilter("all");
                    setBulkLevel("all");
                  }}
                >
                  Réinitialiser
                </button>
              </div>

              {/* EXPORT MULTI */}
              <div style={sx.bulkExportRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={sx.bulkLabel}>Exporter plusieurs classes :</span>
                  <select
                    style={sx.selectSmall}
                    value={bulkLevel}
                    onChange={(e) => setBulkLevel(e.target.value)}
                    disabled={levelOptions.length === 0}
                  >
                    <option value="all">Tous les niveaux</option>
                    {levelOptions.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={sx.bulkExportBtn}
                    onClick={handleBulkExportPDF}
                  >
                    <Download size={16} />
                    <span>PDF classes filtrées</span>
                  </button>

                  <button
                    type="button"
                    style={sx.bulkExportBtnGhost}
                    onClick={handleBulkExportCSV}
                  >
                    <Download size={16} />
                    <span>CSV classes filtrées</span>
                  </button>
                </div>
              </div>
            </section>

            {/* LISTE DES CLASSES */}
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {loading && (
                <p style={{ fontSize: ".9rem", color: "var(--ip-gray)" }}>
                  Chargement des classes…
                </p>
              )}

              {!loading && filteredClasses.length === 0 && (
                <p style={{ fontSize: ".9rem", color: "var(--ip-gray)" }}>
                  Aucune classe trouvée avec ces filtres.
                </p>
              )}

              {!loading &&
                filteredClasses.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} />
                ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* --- composants secondaires & styles --- */

function StatCard({ label, value, helper }) {
  return (
    <div style={sx.statCard}>
      <p style={sx.statLabel}>{label}</p>
      <p style={sx.statValue}>{value}</p>
      <p style={sx.statHelper}>{helper}</p>
    </div>
  );
}

function RoleBadge({ label, color }) {
  const style = {
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    fontWeight: 600,
    background: color,
    color: "#fff",
    whiteSpace: "nowrap",
  };
  return <span style={style}>{label}</span>;
}

function ClassCard({ cls }) {
  const reps = (cls.students || []).filter((s) =>
    isClassRepresentativeRole(s.classRole)
  );

  const handleExportPDF = () => {
    exportClassToPDF(cls);
  };

  return (
    <article style={sx.classCard}>
      <header style={sx.classHeader}>
        <div>
          <p style={sx.classTitle}>{cls.title}</p>
          <p style={sx.classSubtitle}>
            Effectif : {cls.effectif} étudiant(s)
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={sx.classCodeBox}>{cls.abbrev || "—"}</div>
          <button type="button" style={sx.exportBtn} onClick={handleExportPDF}>
            <Download size={16} />
            <span>Exporter PDF</span>
          </button>
        </div>
      </header>

      <section style={sx.repSection}>
        <div style={sx.repHeader}>
          <Users size={16} />
          <span>Représentants de la classe</span>
        </div>

        {reps.length === 0 && (
          <p style={sx.repEmpty}>Aucun représentant renseigné.</p>
        )}

        {reps.map((s) => (
          <div key={s.id} style={sx.repRow}>
            <div style={{ flex: 1 }}>
              <p style={sx.repName}>{s.fullName}</p>
              <p style={sx.repMatricule}>{s.matricule}</p>
            </div>
            <div style={sx.repRoles}>
              {s.classRole !== "Aucune" && (
                <RoleBadge label={s.classRole} color={colors.orange} />
              )}
              {s.schoolRole !== "Aucune" && (
                <RoleBadge label={s.schoolRole} color={colors.teal} />
              )}
              {s.contact && (
                <span style={sx.repPhone}>{s.contact}</span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section style={sx.studentsSection}>
        <p style={sx.studentsTitle}>Liste complète de la classe</p>
        {(cls.students || []).map((s) => (
          <div key={s.id} style={sx.stRow}>
            <div style={{ flex: 1 }}>
              <p style={sx.stName}>
                {s.fullName}{" "}
                {isClassRepresentativeRole(s.classRole) && (
                  <Crown
                    size={13}
                    style={{ marginLeft: 4, color: colors.orange }}
                  />
                )}
              </p>
              <p style={sx.stMatricule}>{s.matricule}</p>
            </div>
            <div style={sx.stRight}>
              {s.classRole !== "Aucune" && (
                <RoleBadge label={s.classRole} color={colors.orange} />
              )}
              {s.schoolRole !== "Aucune" && (
                <RoleBadge label={s.schoolRole} color={colors.pink || "#f50057"} />
              )}
              {s.contact && <span style={sx.stPhone}>{s.contact}</span>}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}

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

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: { margin: 0, fontSize: "1.2rem", fontWeight: 700 },
  pageSubtitle: {
    margin: 0,
    marginTop: 4,
    fontSize: ".9rem",
    color: "var(--ip-gray)",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "0.9rem 1rem",
  },
  statLabel: {
    margin: 0,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  statValue: {
    margin: "4px 0",
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  statHelper: {
    margin: 0,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
  },

  filtersCard: {
    background: "#fff",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
  },
  filtersTitle: {
    margin: 0,
    fontWeight: 600,
    fontSize: ".9rem",
  },
  filtersSub: {
    margin: 0,
    marginTop: 2,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  filtersRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "2fr 1.2fr 1.2fr auto",
    gap: 10,
  },
  filterCol: { display: "flex", alignItems: "center" },
  searchInput: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 1rem",
    fontSize: ".9rem",
    background: "var(--bg-input)",
  },
  select: {
    width: "100%",
    height: 40,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 0.9rem",
    fontSize: ".85rem",
    background: "var(--bg-input)",
  },
  resetBtn: {
    alignSelf: "stretch",
    padding: "0 1.2rem",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    fontSize: ".8rem",
    cursor: "pointer",
  },

  bulkExportRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px dashed ${colors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  bulkLabel: {
    fontSize: ".82rem",
    fontWeight: 600,
    color: "#333",
  },
  selectSmall: {
    height: 36,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    padding: "0 0.8rem",
    fontSize: ".82rem",
    background: "var(--bg-input)",
  },
  bulkExportBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: colors.teal,
    color: "#fff",
    fontSize: ".82rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  bulkExportBtnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    background: "#fff",
    color: "#333",
    fontSize: ".82rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  classCard: {
    background: "#fff",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.2rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  classHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: 8,
  },
  classTitle: {
    margin: 0,
    fontWeight: 600,
    fontSize: ".95rem",
  },
  classSubtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  classCodeBox: {
    minWidth: 44,
    minHeight: 34,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: ".9rem",
  },
  exportBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: colors.teal,
    color: "#fff",
    fontSize: ".8rem",
    fontWeight: 600,
  },

  repSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: `1px solid ${colors.border}`,
  },
  repHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: ".82rem",
    fontWeight: 600,
    marginBottom: 6,
  },
  repEmpty: {
    margin: 0,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  repRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: `1px dashed ${colors.border}`,
    gap: 8,
  },
  repName: { margin: 0, fontSize: ".85rem", fontWeight: 600 },
  repMatricule: {
    margin: 0,
    marginTop: 2,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
  },
  repRoles: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: 260,
  },
  repPhone: { fontSize: ".78rem", color: "var(--ip-gray)" },

  studentsSection: { marginTop: 10 },
  studentsTitle: {
    margin: 0,
    fontSize: ".82rem",
    fontWeight: 600,
    marginBottom: 4,
  },
  stRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
    borderBottom: `1px solid #f1f2f5`,
    gap: 8,
  },
  stName: {
    margin: 0,
    fontSize: ".85rem",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
  },
  stMatricule: {
    margin: 0,
    marginTop: 2,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
  },
  stRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: 260,
  },
  stPhone: { fontSize: ".78rem", color: "var(--ip-gray)" },
};
