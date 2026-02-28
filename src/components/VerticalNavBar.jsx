// // src/components/VerticalNavBar.jsx
// import {
//   GraduationCap,
//   Users,
//   Calendar,
//   FileText,
//   BarChart3,
//   Trophy,
//   LayoutGrid,
//   Settings,
//   LogOut,
//   BookOpen,
//   Send,
// } from "lucide-react";
// import { colors } from "../styles/theme";

// const VerticalNavBar = ({ currentSection = "etudiants", onNavigate }) => {
//   const isActive = (key) =>
//     currentSection === key
//       ? { ...styles.link, ...styles.activeLink }
//       : styles.link;

//   const go = (key) => {
//     if (onNavigate) onNavigate(key);
//   };

//   return (
//     <aside style={styles.sidebar}>
//       <div style={styles.header}>
//         <div style={styles.logoBox} />
//         <div>
//           <p style={styles.subtitle}>Système de</p>
//           <p style={styles.title}>Scolarité</p>
//         </div>
//       </div>

//       <nav style={styles.nav}>
//         <button style={isActive("etudiants")} onClick={() => go("etudiants")}>
//           <Users size={18} />
//           <span>Étudiants</span>
//         </button>

//         <button style={isActive("classes")} onClick={() => go("classes")}>
//           <GraduationCap size={18} />
//           <span>Classes</span>
//         </button>

//         <button style={isActive("presences")} onClick={() => go("presences")}>
//           <Calendar size={18} />
//           <span>Présences</span>
//         </button>

//         <button style={isActive("notes")} onClick={() => go("notes")}>
//           <FileText size={18} />
//           <span>Notes</span>
//         </button>

//         <button style={isActive("matieres")} onClick={() => go("matieres")}>
//           <BookOpen size={18} />
//           <span>Matières</span>
//         </button>

//         <button style={isActive("documents")} onClick={() => go("documents")}>
//           <FileText size={18} />
//           <span>Documents</span>
//         </button>

//         <button style={isActive("envoyer")} onClick={() => go("envoyer")}>
//           <Send size={18} />
//           <span>Envoyer</span>
//         </button>

//         <button style={isActive("rapports")} onClick={() => go("rapports")}>
//           <BarChart3 size={18} />
//           <span>Rapports</span>
//         </button>

//         {/* ✅ page Scolarité */}
//         <button style={isActive("scolarite")} onClick={() => go("scolarite")}>
//           <Trophy size={18} />
//           <span>Scolarité</span>
//         </button>

//         <button style={isActive("dashboard")} onClick={() => go("dashboard")}>
//           <LayoutGrid size={18} />
//           <span>Tableau de bord</span>
//         </button>

//         {/* ✅ page UE / Modules */}
//         <button style={isActive("modules")} onClick={() => go("modules")}>
//           <LayoutGrid size={18} />
//           <span>UE / Modules</span>
//         </button>
//       </nav>

//       <div style={styles.footer}>
//         <button style={isActive("settings")} onClick={() => go("settings")}>
//           <Settings size={18} />
//           <span>Paramètres</span>
//         </button>
//         <button style={styles.link} onClick={() => go("logout")}>
//           <LogOut size={18} />
//           <span>Déconnexion</span>
//         </button>
//       </div>
//     </aside>
//   );
// };

// const styles = {
//   sidebar: {
//     width: "240px",
//     minWidth: "240px",
//     background: "var(--bg)",
//     borderRight: `1px solid ${colors.border}`,
//     display: "flex",
//     flexDirection: "column",
//     height: "100vh",
//   },
//   header: {
//     display: "flex",
//     gap: "0.5rem",
//     alignItems: "center",
//     padding: "1.25rem 1.25rem 1rem",
//     borderBottom: `1px solid ${colors.border}`,
//   },
//   logoBox: {
//     width: "40px",
//     height: "40px",
//     borderRadius: "999px",
//     background: "var(--bg-sidebar-hi)",
//   },
//   subtitle: { fontSize: "0.65rem", color: colors.gray, margin: 0 },
//   title: {
//     fontSize: "0.8rem",
//     fontWeight: 600,
//     margin: 0,
//     color: "var(--fg)",
//   },
//   nav: {
//     padding: "1rem 0",
//     display: "flex",
//     flexDirection: "column",
//     gap: "0.25rem",
//     flex: 1,
//   },
//   link: {
//     background: "none",
//     border: "none",
//     display: "flex",
//     gap: "0.75rem",
//     alignItems: "center",
//     padding: "0.6rem 1.25rem",
//     fontSize: "0.8rem",
//     color: "var(--fg)",
//     cursor: "pointer",
//     textAlign: "left",
//   },
//   activeLink: {
//     background: "var(--bg-sidebar-hi)",
//     color: colors.teal,
//     borderRadius: "0.75rem",
//     border: `1px solid ${colors.teal}`,
//   },
//   footer: {
//     borderTop: `1px solid ${colors.border}`,
//     padding: "0.75rem 0 1rem",
//     display: "flex",
//     flexDirection: "column",
//     gap: "0.25rem",
//   },
// };

// export default VerticalNavBar;




// src/components/VerticalNavBar.jsx
import {
  GraduationCap,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Trophy,
  LayoutGrid,
  Settings,
  LogOut,
  BookOpen,
  Send,
  Shield,
  ClipboardList,
} from "lucide-react";
import { colors } from "../styles/theme";

export default function VerticalNavBar({ currentSection = "dashboard", onNavigate }) {
  const go = (key) => onNavigate?.(key);

  const Item = ({ k, icon: Icon, label }) => {
    const active = currentSection === k;
    return (
      <button
        onClick={() => go(k)}
        style={{
          ...styles.item,
          ...(active ? styles.itemActive : null),
        }}
      >
        <span style={{ ...styles.iconWrap, ...(active ? styles.iconWrapActive : null) }}>
          <Icon size={18} />
        </span>
        <span style={styles.itemLabel}>{label}</span>
        {active && <span style={styles.activeDot} />}
      </button>
    );
  };

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <GraduationCap size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={styles.subtitle}>Système de</div>
          <div style={styles.title}>Scolarité</div>
        </div>
      </div>

      {/* Nav */}
      <div style={styles.scroll}>
        <div style={styles.sectionTitle}>Gestion</div>
        <nav style={styles.nav}>
          <Item k="dashboard" icon={LayoutGrid} label="Tableau de bord" />
          <Item k="etudiants" icon={Users} label="Étudiants" />
          <Item k="classes" icon={GraduationCap} label="Classes" />
          <Item k="presences" icon={Calendar} label="Présences" />
          <Item k="notes" icon={FileText} label="Notes" />
          <Item k="matieres" icon={BookOpen} label="Matières" />
          <Item k="modules" icon={LayoutGrid} label="UE / Modules" />
          <Item k="documents" icon={FileText} label="Documents" />
          <Item k="envoyer" icon={Send} label="Envoyer" />
        </nav>

        <div style={{ height: 14 }} />

        <div style={styles.sectionTitle}>Évaluations</div>
        <nav style={styles.nav}>
          <Item k="evaluations" icon={ClipboardList} label="Évaluations (anonymat)" />
          <Item k="anonymats" icon={Shield} label="Anonymats" />
        </nav>

        <div style={{ height: 14 }} />

        <div style={styles.sectionTitle}>Suivi</div>
        <nav style={styles.nav}>
          <Item k="rapports" icon={BarChart3} label="Rapports" />
          <Item k="scolarite" icon={Trophy} label="Scolarité" />
        </nav>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.footerBtn} onClick={() => go("settings")}>
          <Settings size={18} />
          <span>Paramètres</span>
        </button>
        <button style={styles.footerBtn} onClick={() => go("logout")}>
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    minWidth: 260,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    borderRight: `1px solid ${colors.border}`,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "18px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "var(--bg-sidebar-hi)",
    border: `1px solid ${colors.border}`,
    color: colors.teal,
    flexShrink: 0,
  },
  subtitle: { fontSize: 12, color: colors.gray, lineHeight: "14px" },
  title: { fontSize: 14, fontWeight: 800, color: "var(--fg)", lineHeight: "18px" },

  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 10px 10px",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gray,
    padding: "10px 10px 6px",
  },

  nav: { display: "flex", flexDirection: "column", gap: 6 },

  item: {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    borderRadius: 14,
    padding: "10px 10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    textAlign: "left",
    color: "var(--fg)",
    position: "relative",
    transition: "all 120ms ease",
  },
  itemActive: {
    background: "var(--bg-sidebar-hi)",
    border: `1px solid ${colors.teal}`,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${colors.border}`,
    background: "#fff",
    color: "var(--fg)",
    flexShrink: 0,
  },
  iconWrapActive: {
    border: `1px solid ${colors.teal}`,
    color: colors.teal,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: colors.teal,
    position: "absolute",
    right: 12,
  },

  footer: {
    padding: 12,
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  footerBtn: {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
};