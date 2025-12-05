// import { Eye, FileText, IdCard } from "lucide-react";

// const ListesDesEtudiantsStudentRow = ({ student }) => {
//   return (
//     <tr>
//       <td style={styles.tdBold}>{student.matricule}</td>
//       <td style={styles.td}>
//         <div style={styles.upper}>{student.lastName}</div>
//         <div style={styles.sub}>{student.firstName}</div>
//       </td>
//       <td style={styles.td}>{student.program}</td>
//       <td style={styles.td}>{student.level}</td>
//       <td style={styles.td}>
//         <span style={styles.status}>{student.status || "Actif"}</span>
//       </td>
//       <td style={styles.td}>
//         <div style={styles.actions}>
//           <button style={styles.iconBtn} title="Voir">
//             <Eye size={16} />
//           </button>
//           <button style={styles.iconBtn} title="Certificat de scolarité">
//             <FileText size={16} />
//           </button>
//           <button style={styles.iconBtn} title="Carte d'étudiant">
//             <IdCard size={16} />
//           </button>
//         </div>
//       </td>
//     </tr>
//   );
// };

// const baseTd = {
//   padding: "0.65rem 1rem",
//   fontSize: "0.75rem",
//   borderBottom: "1px solid #f1f5f9",
// };

// const styles = {
//   td: {
//     ...baseTd,
//   },
//   tdBold: {
//     ...baseTd,
//     fontWeight: 600,
//   },
//   upper: {
//     textTransform: "uppercase",
//     fontWeight: 500,
//     fontSize: "0.75rem",
//   },
//   sub: {
//     fontSize: "0.65rem",
//     color: "#94a3b8",
//   },
//   status: {
//     background: "#ecfdf3",
//     color: "#047857",
//     padding: "0.2rem 0.7rem",
//     borderRadius: "9999px",
//     fontSize: "0.6rem",
//     fontWeight: 500,
//   },
//   actions: {
//     display: "flex",
//     gap: "0.5rem",
//   },
//   iconBtn: {
//     background: "none",
//     border: "none",
//     color: "#94a3b8",
//     cursor: "pointer",
//   },
// };

// export default ListesDesEtudiantsStudentRow;








import { Eye, FileText, IdCard } from "lucide-react";
import { colors } from "../styles/theme";

const ListesDesEtudiantsStudentRow = ({ student }) => {
  return (
    <tr>
      <td style={styles.tdBold}>{student.matricule}</td>
      <td style={styles.td}>
        <div style={styles.upper}>{student.lastName}</div>
        <div style={styles.sub}>{student.firstName}</div>
      </td>
      <td style={styles.td}>{student.program}</td>
      <td style={styles.td}>{student.level}</td>
      <td style={styles.td}>
        <span style={styles.status}>{student.status || "Actif"}</span>
      </td>
      <td style={styles.td}>
        <div style={styles.actions}>
          <button style={styles.iconBtn} title="Voir"><Eye size={16} /></button>
          <button style={styles.iconBtn} title="Certificat de scolarité"><FileText size={16} /></button>
          <button style={styles.iconBtn} title="Carte d'étudiant"><IdCard size={16} /></button>
        </div>
      </td>
    </tr>
  );
};

const baseTd = {
  padding: "0.65rem 1rem",
  fontSize: "0.75rem",
  borderBottom: `1px solid ${colors.border}`,
  color: "var(--fg)",
};

const styles = {
  td: { ...baseTd },
  tdBold: { ...baseTd, fontWeight: 600 },
  upper: { textTransform: "uppercase", fontWeight: 500, fontSize: "0.75rem" },
  sub: { fontSize: "0.65rem", color: colors.gray },
  status: {
    background: "var(--bg-sidebar-hi)",
    color: colors.teal,
    padding: "0.2rem 0.7rem",
    borderRadius: "9999px",
    fontSize: "0.6rem",
    fontWeight: 600,
    border: `1px solid ${colors.teal}`,
  },
  actions: { display: "flex", gap: "0.5rem" },
  iconBtn: { background: "none", border: "none", color: colors.gray, cursor: "pointer" },
};

export default ListesDesEtudiantsStudentRow;
