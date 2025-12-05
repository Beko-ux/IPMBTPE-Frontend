// import { Menu } from "lucide-react";

// const HorizontalNavBar = () => {
//   return (
//     <header style={styles.topbar}>
//       <div style={styles.left}>
//         <button style={styles.iconBtn}>
//           <Menu size={20} />
//         </button>
//         <p style={styles.topText}>Année académique 2024 - 2025</p>
//       </div>
//       <div style={styles.right}>
//         <div style={styles.userMeta}>
//           <p style={styles.userName}>Gestionnaire</p>
//           <p style={styles.userRole}>Admin système</p>
//         </div>
//         <div style={styles.avatar}>GI</div>
//       </div>
//     </header>
//   );
// };

// const styles = {
//   topbar: {
//     height: "4rem",
//     background: "#fff",
//     borderBottom: "1px solid #e5e7eb",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: "0 1.5rem",
//     border: "1px solid red",        // ← bordure rouge autour de tout le header
//     boxSizing: "border-box",
//   },
//   left: {
//     display: "flex",
//     alignItems: "center",
//     gap: "0.75rem",
//   },
//   iconBtn: {
//     border: "none",
//     background: "none",
//     padding: "0.35rem",
//     borderRadius: "0.4rem",
//     cursor: "pointer",
//   },
//   topText: {
//     fontSize: "0.8rem",
//     color: "#64748b",
//   },
//   right: {
//     display: "flex",
//     alignItems: "center",
//     gap: "0.75rem",
//   },
//   userMeta: {
//     textAlign: "right",
//   },
//   userName: {
//     fontSize: "0.8rem",
//     fontWeight: 500,
//     margin: 0,
//   },
//   userRole: {
//     fontSize: "0.65rem",
//     color: "#94a3b8",
//     margin: 0,
//   },
//   avatar: {
//     width: "2.25rem",
//     height: "2.25rem",
//     background: "#10b981",
//     borderRadius: "9999px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     color: "#fff",
//     fontSize: "0.7rem",
//     fontWeight: 600,
//   },
// };

// export default HorizontalNavBar;







import { Menu } from "lucide-react";
import { colors } from "../styles/theme";

const HorizontalNavBar = () => {
  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <button style={styles.iconBtn}>
          <Menu size={20} />
        </button>
        <p style={styles.topText}>Année académique 2024 - 2025</p>
      </div>
      <div style={styles.right}>
        <div style={styles.userMeta}>
          <p style={styles.userName}>Gestionnaire</p>
          <p style={styles.userRole}>Admin système</p>
        </div>
        <div style={styles.avatar}>GI</div>
      </div>
    </header>
  );
};

const styles = {
  topbar: {
    height: "4rem",
    background: "var(--bg)",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    boxSizing: "border-box",
  },
  left: { display: "flex", alignItems: "center", gap: "0.75rem" },
  iconBtn: { border: "none", background: "none", padding: "0.35rem", borderRadius: "0.4rem", cursor: "pointer", color: "var(--fg)" },
  topText: { fontSize: "0.8rem", color: colors.gray },
  right: { display: "flex", alignItems: "center", gap: "0.75rem" },
  userMeta: { textAlign: "right" },
  userName: { fontSize: "0.8rem", fontWeight: 500, margin: 0, color: "var(--fg)" },
  userRole: { fontSize: "0.65rem", color: colors.gray, margin: 0 },
  avatar: {
    width: "2.25rem",
    height: "2.25rem",
    background: colors.teal,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.white,
    fontSize: "0.7rem",
    fontWeight: 600,
  },
};

export default HorizontalNavBar;
