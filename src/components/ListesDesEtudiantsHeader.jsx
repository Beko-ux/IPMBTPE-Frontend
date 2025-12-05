// const ListesDesEtudiantsHeader = () => {
//   return (
//     <thead>
//       <tr>
//         <th style={styles.th}>Matricule</th>
//         <th style={styles.th}>Nom & Prénoms</th>
//         <th style={styles.th}>Filière</th>
//         <th style={styles.th}>Promotion</th>
//         <th style={styles.th}>Statut</th>
//         <th style={styles.th}>Actions</th>
//       </tr>
//     </thead>
//   );
// };

// const styles = {
//   th: {
//     textAlign: "left",
//     padding: "0.65rem 1rem",
//     fontSize: "0.6rem",
//     textTransform: "uppercase",
//     letterSpacing: "0.05em",
//     color: "#94a3b8",
//     borderBottom: "1px solid #f1f5f9",
//   },
// };

// export default ListesDesEtudiantsHeader;





import { colors } from "../styles/theme";

const ListesDesEtudiantsHeader = () => {
  return (
    <thead>
      <tr>
        <th style={styles.th}>Matricule</th>
        <th style={styles.th}>Nom & Prénoms</th>
        <th style={styles.th}>Filière</th>
        <th style={styles.th}>Promotion</th>
        <th style={styles.th}>Statut</th>
        <th style={styles.th}>Actions</th>
      </tr>
    </thead>
  );
};

const styles = {
  th: {
    textAlign: "left",
    padding: "0.65rem 1rem",
    fontSize: "0.6rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: colors.gray,
    borderBottom: `1px solid ${colors.border}`,
    background: "var(--bg)",
  },
};

export default ListesDesEtudiantsHeader;
