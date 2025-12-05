// src/components/EtudiantDetailModal.jsx
import { X, FileText, IdCard, ListChecks, Pencil } from "lucide-react";

/**
 * Modal de détails d'un étudiant.
 *
 * Props :
 * - open: boolean
 * - student: objet étudiant (même structure que pour la liste)
 * - onClose: () => void
 * - onEdit?: (student) => void
 * - onPrintCertificat?: (student) => void
 * - onPrintCarte?: (student) => void
 * - onPrintReleve?: (student) => void
 */
export default function EtudiantDetailModal({
  open,
  student,
  onClose,
  onEdit,
  onPrintCertificat,
  onPrintCarte,
  onPrintReleve,
}) {
  if (!open || !student) return null;

  const filiere = getFiliereDisplay(student);
  const promo = getPromoLabel(student.cycle, student.studyYear);
  const isInscrit = !!student.registrationFeePaid;
  const fullName = `${(student.lastName || "").toUpperCase()} ${
    student.firstName || ""
  }`.trim();

  const inscriptionYear = student.academicYear
    ? String(student.academicYear).split("-")[0]
    : "";

  return (
    <div style={sx.overlay} onMouseDown={onClose}>
      <div
        style={sx.modal}
        onMouseDown={(e) => e.stopPropagation()} // empêche la fermeture si on clique dans la modale
      >
        {/* Header */}
        <div style={sx.header}>
          <h3 style={sx.title}>Détails de l&apos;étudiant</h3>

          <div style={sx.headerActions}>
            {/* bouton modifier */}
            <button
              type="button"
              style={sx.headerIconBtn}
              title="Modifier l'étudiant"
              onClick={() => onEdit && onEdit(student)}
            >
              <Pencil size={16} />
            </button>

            {/* bouton fermer */}
            <button
              type="button"
              style={sx.headerIconBtn}
              title="Fermer"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div style={sx.body}>
          <div style={sx.columns}>
            {/* Colonne gauche */}
            <div style={sx.col}>
              <DetailLine label="Matricule">
                {student.matricule ? (
                  <span style={sx.valueStrong}>{student.matricule}</span>
                ) : (
                  <span style={sx.matriculePending}>
                    <em>Non</em> généré
                  </span>
                )}
              </DetailLine>

              <DetailLine label="Nom complet">
                <div style={sx.valueStrong}>{fullName || "—"}</div>
              </DetailLine>

              <DetailLine label="Date de naissance">
                {formatDate(student.birthDate) || "—"}
              </DetailLine>

              <DetailLine label="Filière">
                <div style={sx.valueStrong}>{filiere.short || "—"}</div>
                {filiere.long && <div style={sx.valueSub}>{filiere.long}</div>}
              </DetailLine>
            </div>

            {/* Colonne droite */}
            <div style={sx.col}>
              <DetailLine label="Statut d'inscription">
                <span
                  style={{
                    ...sx.badge,
                    ...(isInscrit ? sx.badgeOk : sx.badgeDanger),
                  }}
                >
                  {isInscrit ? "Inscrit" : "Non inscrit"}
                </span>
              </DetailLine>

              <DetailLine label="Promotion">
                {promo || "—"}
              </DetailLine>

              <DetailLine label="Année d'inscription">
                {inscriptionYear || "—"}
              </DetailLine>

              <DetailLine label="Contact">
                {student.contact || "—"}
              </DetailLine>

              <DetailLine label="Email">
                {student.email || "—"}
              </DetailLine>
            </div>
          </div>
        </div>

        {/* Footer : actions */}
        <div style={sx.footer}>
          <button
            type="button"
            style={sx.btnPrimary}
            onClick={() => onPrintCertificat && onPrintCertificat(student)}
          >
            <FileText size={16} style={{ marginRight: 6 }} />
            Certificat de scolarité
          </button>

          <button
            type="button"
            style={sx.btnSecondary}
            onClick={() => onPrintCarte && onPrintCarte(student)}
          >
            <IdCard size={16} style={{ marginRight: 6 }} />
            Carte d&apos;étudiant
          </button>

          <button
            type="button"
            style={sx.btnSecondary}
            onClick={() => onPrintReleve && onPrintReleve(student)}
          >
            <ListChecks size={16} style={{ marginRight: 6 }} />
            Relevé de notes
          </button>

          {/* bouton crayon (modifier) en bas aussi si tu veux un accès direct */}
          <button
            type="button"
            style={sx.btnIconOrange}
            title="Modifier l'étudiant"
            onClick={() => onEdit && onEdit(student)}
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Sous-composant pour une ligne label + valeur --- */

function DetailLine({ label, children }) {
  return (
    <div style={sx.detailLine}>
      <div style={sx.detailLabel}>{label}</div>
      <div style={sx.detailValue}>{children}</div>
    </div>
  );
}

/* --- Helpers pour l'affichage --- */

function formatDate(iso) {
  if (!iso) return "";
  // iso attendu "YYYY-MM-DD"
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Retourne { short, long } pour la colonne "Filière"
 * - gère les anciens enregistrements (filiereShort / filiereLong)
 * - gère les nouveaux (specialiteCode / specialite / optionCode / option)
 * - pour "Filières industrielles" on privilégie les options (BAT, TRP, …)
 */
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

/**
 * Transforme (cycle, studyYear) en BTS1, L3, M1, ING4, etc.
 */
function getPromoLabel(cycle, studyYear) {
  if (!cycle || !studyYear) return "";

  const y = Number(studyYear);

  switch (cycle) {
    case "BTS":
      return `BTS${y}`; // BTS1, BTS2
    case "LICENCE":
      return "L3"; // LICENCE = 3e année
    case "MASTER":
      return y === 4 ? "M1" : "M2"; // 4e → M1, 5e → M2
    case "INGÉNIEUR":
      return `ING${y}`; // ING1…ING5
    default:
      return "";
  }
}

/* --- Styles inline --- */

const sx = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 60,
  },
  modal: {
    width: "min(780px, 96vw)",
    maxHeight: "92vh",
    background: "var(--bg)",
    color: "var(--fg)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    boxShadow: "0 18px 35px rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    padding: "14px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 600,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    border: "1px solid var(--border)",
    background: "#fff",
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#444",
  },

  body: {
    padding: "16px 18px 8px",
    overflowY: "auto",
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  detailLine: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  detailLabel: {
    fontSize: ".8rem",
    color: "var(--ip-gray)",
    textTransform: "uppercase",
    letterSpacing: ".03em",
  },
  detailValue: {
    fontSize: ".9rem",
  },

  valueStrong: {
    fontWeight: 600,
    fontSize: ".92rem",
  },
  valueSub: {
    marginTop: 2,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },

  matriculePending: {
    fontSize: ".85rem",
    fontStyle: "italic",
    color: "var(--ip-gray)",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    fontWeight: 600,
  },
  badgeOk: {
    background: "rgba(0, 160, 130, .12)",
    color: "var(--ip-teal)",
  },
  badgeDanger: {
    background: "rgba(220, 53, 69, .12)",
    color: "#d0162c",
  },

  footer: {
    padding: "10px 18px 14px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.45rem 0.9rem",
    borderRadius: 999,
    border: "none",
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.45rem 0.9rem",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "#333",
    fontSize: ".85rem",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnIconOrange: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "none",
    background: "#FF8200",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};
