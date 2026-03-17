// src/components/ListesDesEtudiantsSection.jsx
import { useState } from "react";
import { Eye, FileText, Image as ImageIcon } from "lucide-react";

export default function ListesDesEtudiantsSection({
  students,
  onShowDetail,
  onPrintCertificat,
  onPrintCarte,
  onEdit, // prêt si tu veux ajouter un crayon plus tard

  // ✅ nouveaux props
  loading = false,
  error = "",
}) {
  const count = Array.isArray(students) ? students.length : 0;

  // ✅ message dans l’entête : si loading, on évite d’afficher "0 résultat" comme si c’était fini
  const headerSubtitle = loading
    ? "Chargement..."
    : `${count} résultat${count > 1 ? "s" : ""}`;

  return (
    <section style={sx.section}>
      <header style={sx.header}>
        <div>
          <h2 style={sx.title}>Liste des étudiants</h2>
          <p style={sx.subtitle}>{headerSubtitle}</p>
        </div>
      </header>

      <div style={sx.tableWrap}>
        <table style={sx.table}>
          <thead>
            <tr>
              <th style={sx.th}>Matricule</th>
              <th style={sx.th}>Nom &amp; Prénoms</th>
              <th style={sx.th}>Filière</th>
              <th style={sx.th}>Promotion</th>
              <th style={sx.th}>Statut d&apos;inscription</th>
              <th style={{ ...sx.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {/* ✅ 1) Loading */}
            {loading && (
              <tr>
                <td style={sx.infoRow} colSpan={6}>
                  Chargement des étudiants...
                </td>
              </tr>
            )}

            {/* ✅ 2) Error */}
            {!loading && !!error && (
              <tr>
                <td style={sx.errorRow} colSpan={6}>
                  {error}
                </td>
              </tr>
            )}

            {/* ✅ 3) Data rows */}
            {!loading &&
              !error &&
              (students || []).map((s) => {
                const filiere = getFiliereDisplay(s);
                const promo = getPromoLabel(s.cycle, s.studyYear);
                const isInscrit = !!s.registrationFeePaid;

                return (
                  <tr key={s.id || s.matricule}>
                    {/* Matricule */}
                    <td style={sx.td}>
                      {s.matricule ? (
                        <span style={sx.cellMain}>{s.matricule}</span>
                      ) : (
                        <span style={sx.matriculePending}>
                          <em>Non</em> généré
                        </span>
                      )}
                    </td>

                    {/* Nom & prénoms */}
                    <td style={sx.td}>
                      <div style={sx.cellMain}>
                        {(s.lastName || "").toUpperCase()}
                      </div>
                      <div style={sx.cellSub}>{s.firstName || ""}</div>
                    </td>

                    {/* Filière */}
                    <td style={sx.td}>
                      <div style={sx.cellMain}>{filiere.short || "—"}</div>
                      {filiere.long && (
                        <div style={sx.cellSub}>{filiere.long}</div>
                      )}
                    </td>

                    {/* Promotion */}
                    <td style={sx.td}>
                      <div style={sx.cellMain}>{promo || "—"}</div>
                    </td>

                    {/* Statut */}
                    <td style={sx.td}>
                      <span
                        style={{
                          ...sx.badge,
                          ...(isInscrit ? sx.badgeOk : sx.badgeDanger),
                        }}
                      >
                        {isInscrit ? "Inscrit" : "Non inscrit"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...sx.td, textAlign: "right" }}>
                      <ActionIconButton
                        title="Détail de l'étudiant"
                        onClick={() => onShowDetail && onShowDetail(s)}
                      >
                        <Eye size={16} />
                      </ActionIconButton>

                      <ActionIconButton
                        title="Certificat de scolarité"
                        onClick={() =>
                          onPrintCertificat && onPrintCertificat(s)
                        }
                      >
                        <FileText size={16} />
                      </ActionIconButton>

                      <ActionIconButton
                        title="Carte d'étudiant"
                        onClick={() => onPrintCarte && onPrintCarte(s)}
                      >
                        <ImageIcon size={16} />
                      </ActionIconButton>
                    </td>
                  </tr>
                );
              })}

            {/* ✅ 4) Empty state (uniquement quand fini) */}
            {!loading && !error && count === 0 && (
              <tr>
                <td style={sx.emptyRow} colSpan={6}>
                  Aucun étudiant trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* --------- Bouton d'action --------- */

function ActionIconButton({ title, children, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ ...sx.iconBtn, ...(hover ? sx.iconBtnHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

/* -------- Helpers -------- */

function getFiliereDisplay(s) {
  const filiere = s.filiere || "";

  const isIndus = filiere === "Filières industrielles";

  const shortNew = isIndus
    ? s.optionCode || s.specialiteCode || null
    : s.specialiteCode || s.optionCode || null;

  const longNew = isIndus
    ? s.option || s.specialite || null
    : s.specialite || s.option || null;

  if (shortNew || longNew) {
    return {
      short: shortNew || "—",
      long: longNew || filiere,
    };
  }

  if (s.filiereShort || s.filiereLong) {
    return {
      short: s.filiereShort || "—",
      long: s.filiereLong || "",
    };
  }

  return {
    short: "—",
    long: filiere,
  };
}

function getPromoLabel(cycle, studyYear) {
  if (!cycle || !studyYear) return "";
  const y = Number(studyYear);

  switch (cycle) {
    case "BTS":
      return `BTS${y}`;
    case "LICENCE":
      return "L3";
    case "MASTER":
      return y === 4 ? "M1" : "M2";
    case "INGÉNIEUR":
      return `ING${y}`;
    default:
      return "";
  }
}

/* -------- Styles -------- */

const sx = {
  section: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem 1.25rem",
    boxShadow: "0 4px 10px rgba(0,0,0,.02)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  title: { margin: 0, fontSize: "1rem", fontWeight: 600 },
  subtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: ".85rem",
    color: "var(--ip-gray)",
  },
  tableWrap: { marginTop: 8, overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".9rem" },
  th: {
    textAlign: "left",
    padding: "0.55rem 0.75rem",
    fontSize: ".8rem",
    fontWeight: 600,
    color: "var(--ip-gray)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #eef0f3",
    verticalAlign: "top",
    fontSize: ".9rem",
  },
  cellMain: { fontWeight: 600, fontSize: ".9rem" },
  cellSub: { marginTop: 2, fontSize: ".8rem", color: "var(--ip-gray)" },
  matriculePending: { fontSize: ".8rem", fontStyle: "italic", color: "var(--ip-gray)" },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    fontWeight: 600,
  },
  badgeOk: { background: "rgba(0, 160, 130, .12)", color: "var(--ip-teal)" },
  badgeDanger: { background: "rgba(220, 53, 69, .12)", color: "#d0162c" },

  iconBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    padding: 4,
    marginLeft: 6,
    cursor: "pointer",
    color: "#444",
    borderRadius: 10,
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  iconBtnHover: {
    backgroundColor: "#FF8200",
    borderColor: "#FF8200",
    color: "#ffffff",
  },

  emptyRow: {
    padding: "1rem",
    textAlign: "center",
    color: "var(--ip-gray)",
    fontSize: ".9rem",
  },

  // ✅ Nouveaux styles "info" / "error" (même look que emptyRow)
  infoRow: {
    padding: "1rem",
    textAlign: "center",
    color: "var(--ip-gray)",
    fontSize: ".9rem",
  },
  errorRow: {
    padding: "1rem",
    textAlign: "center",
    color: "#b00020",
    fontSize: ".9rem",
  },
};