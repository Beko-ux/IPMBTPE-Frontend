// src/components/documents/TranscriptPreview.jsx

/**
 * Aperçu HTML d'un relevé de notes.
 *
 * Props:
 *  - student
 *  - academicYear?
 *  - items?: [
 *      { code, intitule, coef, note, credit, mention }
 *    ]
 */
export default function TranscriptPreview({ student, academicYear, items }) {
  if (!student) {
    return (
      <div style={styles.empty}>
        Sélectionnez un étudiant pour prévisualiser le relevé.
      </div>
    );
  }

  const nomComplet = `${(student.lastName || "").toUpperCase()} ${
    student.firstName || ""
  }`.trim();

  const year = academicYear || student.academicYear || "2025-2026";
  const matricule = student.matricule || "—";
  const cycle = student.cycle || "BTS";
  const filiere = student.filiere || "";

  const rows = Array.isArray(items) && items.length > 0 ? items : demoRows;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <h2 style={styles.title}>RELEVÉ DE NOTES</h2>

        <div style={styles.infoBlock}>
          <InfoRow label="Nom & Prénoms" value={nomComplet} />
          <InfoRow label="Matricule" value={matricule} />
          <InfoRow label="Cycle" value={cycle} />
          <InfoRow label="Filière" value={filiere} />
          <InfoRow label="Année académique" value={year} />
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Code UE</th>
              <th>Intitulé</th>
              <th>Coef.</th>
              <th>Note /20</th>
              <th>Crédits</th>
              <th>Mention</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>{r.code}</td>
                <td>{r.intitule}</td>
                <td>{r.coef}</td>
                <td>{r.note}</td>
                <td>{r.credit}</td>
                <td>{r.mention}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.footer}>
          <span>Moyenne générale : …… / 20</span>
          <span>Crédits capitalisés : …… / ……</span>
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

const demoRows = [
  {
    code: "UE-101",
    intitule: "Mathématiques appliquées",
    coef: 3,
    note: "—",
    credit: "—",
    mention: "",
  },
  {
    code: "UE-102",
    intitule: "Informatique générale",
    coef: 2,
    note: "—",
    credit: "—",
    mention: "",
  },
];

const styles = {
  page: {
    width: "100%",
    height: "100%",
    background: "#f3f4f6",
    padding: 16,
    boxSizing: "border-box",
    overflow: "auto",
  },
  inner: {
    margin: "0 auto",
    maxWidth: "800px",
    minHeight: "1000px",
    background: "#ffffff",
    border: "1px solid #d4d4d8",
    boxShadow: "0 4px 10px rgba(0,0,0,.05)",
    padding: 24,
    boxSizing: "border-box",
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
  },
  infoBlock: {
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    fontSize: 12,
  },
  infoRow: {
    display: "flex",
    gap: 4,
  },
  infoLabel: {
    fontWeight: 600,
    minWidth: 120,
  },
  infoValue: {
    flex: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
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
