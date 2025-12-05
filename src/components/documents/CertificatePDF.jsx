// src/components/documents/CertificatePDF.jsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Création des styles avec StyleSheet de react-pdf
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Times-Roman',
  },
  headerWrapper: {
    marginBottom: 20,
  },
  headerImg: {
    width: 200,
  },
  headerBottomLine: {
    height: 4,
    backgroundColor: '#1CC3A5',
    marginTop: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  titleBox: {
    border: '1px solid #000000',
    backgroundColor: '#f2f2f2',
    padding: 8,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  paragraph: {
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  signRow: {
    marginTop: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    fontSize: 12,
  },
  signatureContainer: {
    textAlign: 'right',
  },
  footerLine: {
    position: 'absolute',
    left: 50,
    right: 50,
    bottom: 40,
    height: 4,
    backgroundColor: '#1CC3A5',
  },
});

// Note: Nous ne pouvons pas utiliser le même CSS que pour le web, donc nous adaptons.

export default function CertificatePDF({ student, enrollment }) {
  if (!student) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Aucun étudiant sélectionné</Text>
        </Page>
      </Document>
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
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.headerWrapper}>
          {/* Logo */}
          <Image
            src="/assets/ipmbtpe-header.png" // Chemin relatif ou URL
            style={styles.headerImg}
          />
          <View style={styles.headerBottomLine} />
        </View>

        {/* Corps du certificat */}
        <View style={styles.body}>
          {/* Titre */}
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>CERTIFICAT DE SCOLARITÉ</Text>
          </View>

          <Text style={styles.paragraph}>
            Nous soussignés……… le Directeur, certifions que :
          </Text>

          <Text style={styles.paragraph}>
            L'étudiant (e) : <Text style={styles.bold}>{nomComplet}</Text>
          </Text>

          <Text style={styles.paragraph}>
            Né(e) le <Text style={styles.bold}>{birthDate}</Text> à{' '}
            <Text style={styles.bold}>{birthPlace}</Text>
          </Text>

          <Text style={styles.paragraph}>
            Est inscrit(e) en <Text style={styles.bold}>{niveauTexte}</Text>
          </Text>

          <Text style={styles.paragraph}>
            Spécialité : <Text style={styles.bold}>{specialite}</Text>
          </Text>

          <Text style={styles.paragraph}>
            Année académique : <Text style={styles.bold}>{academicYear}</Text>
          </Text>

          <Text style={styles.paragraph}>
            Matricule : <Text style={styles.bold}>{matricule}</Text>
          </Text>

          <Text style={[styles.paragraph, { marginTop: 24 }]}>
            En foi de quoi, le présent certificat lui est délivré pour servir
            et valoir ce que de droit.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signRow}>
          <View style={styles.signatureContainer}>
            <Text>Le Directeur des Affaires Académiques</Text>
            <Text style={{ marginTop: 40 }}>LE DIRECTEUR</Text>
          </View>
        </View>

        {/* Ligne verte bas de page */}
        <View style={styles.footerLine} />
      </Page>
    </Document>
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
// Les fonctions formatDateFr et buildNiveauTexte restent les mêmes
