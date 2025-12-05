// src/components/documents/StudentCardPreview.jsx
import logoLarge from "../../../public/assets/ipmbtpe-header.png";

/**
 * Carte d’étudiant format ID-1 (aperçu HTML).
 *
 * Props:
 *  - student
 *  - academicYear? (string)
 */
export default function StudentCardPreview({ student, academicYear }) {
  if (!student) {
    return (
      <div style={styles.empty}>
        Sélectionnez un étudiant pour prévisualiser la carte.
      </div>
    );
  }

  const nomComplet = `${(student.lastName || "").toUpperCase()} ${
    student.firstName || ""
  }`.trim();

  const matricule = student.matricule || "—";
  const cycle = student.cycle || "BTS";
  const filiere = student.filiere || "";
  const year = academicYear || student.academicYear || "2025-2026";

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Bandeau haut */}
        <div style={styles.header}>
          <img src={logoLarge} alt="IPMBTPE" style={styles.logo} />
          <div style={styles.headerText}>
            <div style={styles.schoolName}>
              Institut Polytechnique des Métiers du Bâtiment, des Travaux
              Publics et de l&apos;Entrepreneuriat
            </div>
            <div style={styles.subtitle}>Carte d&apos;étudiant</div>
          </div>
        </div>

        <div style={styles.content}>
          {/* Photo */}
          <div style={styles.photoBox}>
            <div style={styles.photoPlaceholder}>PHOTO</div>
          </div>

          {/* Infos */}
          <div style={styles.infoCol}>
            <InfoRow label="Nom & Prénoms" value={nomComplet} />
            <InfoRow label="Matricule" value={matricule} />
            <InfoRow label="Cycle" value={cycle} />
            <InfoRow label="Filière" value={filiere} />
            <InfoRow label="Année académique" value={year} />
          </div>

          {/* QR placeholder */}
          <div style={styles.qrCol}>
            <div style={styles.qrBox}>QR</div>
            <div style={styles.qrLabel}>Vérification</div>
          </div>
        </div>

        <div style={styles.bottomBar}>
          <span>IPMBTPE</span>
          <span>Votre carrière commence ici</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label} :</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    background: "#f3f4f6",
    padding: 16,
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    width: 430, // approx ID-1 à l’écran
    height: 270,
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #d4d4d8",
    boxShadow: "0 4px 10px rgba(0,0,0,.05)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "2px solid #10b981",
    gap: 8,
  },
  logo: {
    height: 40,
    objectFit: "contain",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  schoolName: {
    fontSize: 10,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    color: "#059669",
    fontWeight: 500,
  },
  content: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "120px 1fr 80px",
    padding: "10px 12px 8px",
    gap: 10,
  },
  photoBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholder: {
    width: 90,
    height: 110,
    borderRadius: 6,
    border: "1px dashed #9ca3af",
    fontSize: 10,
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    fontSize: 11,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    justifyContent: "center",
  },
  infoRow: {
    display: "flex",
    gap: 4,
  },
  infoLabel: {
    fontWeight: 600,
    minWidth: 100,
  },
  infoValue: {
    flex: 1,
  },
  qrCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  qrBox: {
    width: 60,
    height: 60,
    borderRadius: 4,
    border: "1px dashed #9ca3af",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },
  qrLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  bottomBar: {
    height: 24,
    background: "#ecfdf5",
    borderTop: "1px solid #d1fae5",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
    fontSize: 10,
    color: "#047857",
  },
  empty: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: ".9rem",
    color: "#6b7280",
  },
};
