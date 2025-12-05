// src/components/documents/CertificatePreview.jsx
import headerImg from "../../../public/assets/ipmbtpe-header.png";

/**
 * Aperçu HTML du certificat de scolarité IPMBTPE.
 * On reproduit au maximum le modèle (bandeau, lignes, mise en forme).
 *
 * Props:
 *  - student: document Firestore de l'étudiant
 *  - enrollment?: inscription pour l'année académique (facultatif)
 */
export default function CertificatePreview({ student, enrollment }) {
  if (!student) {
    return (
      <div style={styles.empty}>
        Sélectionnez d&apos;abord un étudiant pour prévisualiser le certificat.
      </div>
    );
  }

  const nomComplet = `${(student.lastName || "").toUpperCase()} ${
    student.firstName || ""
  }`.trim();

  const birthDate = formatDateFr(student.birthDate);
  const birthPlace = student.birthPlace || "……….";

  const academicYear = student.academicYear || "2025-2026";

  const cycle =
    student.cycle || (enrollment && enrollment.cycle) || "BTS";

  const niveauTexte = buildNiveauTexte(cycle, student.studyYear);

  const specialite =
    (enrollment && enrollment.specialite) ||
    student.specialite ||
    "Banques et Finances";

  const matricule = student.matricule || "25IPCGE001";

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        {/* EN-TÊTE COMPLET IPMBTPE */}
        <div style={styles.headerWrapper}>
          {/* Logo aligné à gauche */}
          <div style={styles.logoContainer}>
            <img
              src={headerImg}
              alt="En-tête IPMBTPE"
              style={styles.headerImg}
            />
          </div>
          
          {/* Texte d'en-tête */}
          <div style={styles.headerText}>
            <div style={styles.reference}>
              <strong>ARRETE. /ORDERN 25-01077/ MINESUP/ SG/ DDES/</strong>
            </div>
            <div style={styles.reference}>
              <strong>SDESUP / SDA / AOS du 26 Mars 2025</strong>
            </div>
            <div style={styles.contact}>
              <em>BP : 16398 Mfou / Tel : (+237) 696 79 58 05 - 672 83 80 94 Site Web: www.ipmbpte.cm / E-mail : ipmbtpe@gmail.com</em>
            </div>
          </div>
        </div>

        {/* Ligne de séparation verte */}
        <div style={styles.headerBottomLine} />

        {/* Corps du certificat */}
        <div style={styles.body}>
          {/* Titre */}
          <div style={styles.titleBox}>
            <span style={styles.titleText}>CERTIFICAT DE SCOLARITÉ</span>
          </div>

          <p style={styles.paragraph}>
            Nous soussignés……… le Directeur, certifions que :
          </p>

          <p style={styles.paragraph}>
            L&apos;étudiant (e) :{" "}
            <span style={styles.bold}>{nomComplet || "NGOUMEKA PRISCILE Divine"}</span>
          </p>

          <p style={styles.paragraph}>
            Né(e) le <span style={styles.bold}>{birthDate || "21 avril 2005"}</span> à{" "}
            <span style={styles.bold}>{birthPlace}</span>
          </p>

          <p style={styles.paragraph}>
            Est inscrit(e) en <span style={styles.bold}>{niveauTexte || "Première année Cycle BTS"}</span>
          </p>

          <p style={styles.paragraph}>
            Spécialité : <span style={styles.bold}>{specialite}</span>
          </p>

          <p style={styles.paragraph}>
            Année académique : <span style={styles.bold}>{academicYear}</span>
          </p>

          <p style={styles.paragraph}>
            Matricule : <span style={styles.bold}>{matricule}</span>
          </p>

          <p style={{ ...styles.paragraph, marginTop: 24 }}>
            En foi de quoi, le présent certificat lui est délivré pour servir
            et valoir ce que de droit.
          </p>
        </div>

        {/* Signatures - alignées à droite */}
        <div style={styles.signRow}>
          <div style={styles.signatureContainer}>
            <div>Le Directeur des Affaires Académiques</div>
            <div style={{ marginTop: 40 }}>LE DIRECTEUR</div>
          </div>
        </div>

        {/* Ligne verte bas de page */}
        <div style={styles.footerLine} />
      </div>
    </div>
  );
}

function formatDateFr(iso) {
  if (!iso) return "21 avril 2005";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildNiveauTexte(cycle, studyYear) {
  const y = Number(studyYear) || 1;
  let annee = "";
  if (y === 1) annee = "Première année";
  else if (y === 2) annee = "Deuxième année";
  else if (y === 3) annee = "Troisième année";
  else annee = `${y}ᵉ année`;
  return `${annee} Cycle ${cycle}`.trim();
}

const styles = {
  page: {
    width: "100%",
    height: "100%",
    background: "#ffffff",
    padding: "20px",
    boxSizing: "border-box",
    overflow: "auto",
    fontFamily: '"Times New Roman", Times, serif',
    // Bordures pour voir les limites de la page
    border: "2px dashed #ccc",
  },
  inner: {
    margin: "0 auto",
    maxWidth: "750px",
    minHeight: "1000px",
    background: "#ffffff",
    padding: "40px 50px",
    boxSizing: "border-box",
    position: "relative",
    border: "none",
  },
  headerWrapper: {
    marginBottom: 20,
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
  },
  logoContainer: {
    flex: "0 0 auto",
  },
  headerImg: {
    width: "200px",
    display: "block",
  },
  headerText: {
    fontSize: "12px",
    lineHeight: "1.4",
    flex: 1,
    paddingTop: "5px",
  },
  reference: {
    marginBottom: "4px",
    textAlign: "center",
  },
  contact: {
    textAlign: "center",
    marginTop: "8px",
  },
  headerBottomLine: {
    height: 4,
    background: "#1CC3A5",
    marginBottom: 30,
    width: "100%",
  },
  body: {
    fontSize: 14,
    lineHeight: 1.8,
  },
  titleBox: {
    border: "1px solid #000000",
    background: "#f2f2f2",
    padding: "8px 16px",
    textAlign: "center",
    margin: "0 auto 30px",
    maxWidth: 400,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  paragraph: {
    margin: "8px 0",
    fontSize: 14,
    lineHeight: 1.6,
  },
  bold: {
    fontWeight: "bold",
    textDecoration: "underline",
  },
  signRow: {
    display: "flex",
    justifyContent: "flex-end",
    fontSize: 12,
    marginTop: 100,
    paddingRight: 50,
  },
  signatureContainer: {
    textAlign: "right",
  },
  footerLine: {
    position: "absolute",
    left: 50,
    right: 50,
    bottom: 40,
    height: 4,
    background: "#1CC3A5",
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