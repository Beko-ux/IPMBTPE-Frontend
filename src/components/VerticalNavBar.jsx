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
} from "lucide-react";
import { colors } from "../styles/theme";

const VerticalNavBar = ({ currentSection = "etudiants", onNavigate }) => {
  const isActive = (key) =>
    currentSection === key
      ? { ...styles.link, ...styles.activeLink }
      : styles.link;

  const go = (key) => {
    if (onNavigate) onNavigate(key);
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logoBox} />
        <div>
          <p style={styles.subtitle}>Système de</p>
          <p style={styles.title}>Scolarité</p>
        </div>
      </div>

      <nav style={styles.nav}>
        <button
          style={isActive("etudiants")}
          onClick={() => go("etudiants")}
        >
          <Users size={18} />
          <span>Étudiants</span>
        </button>

        <button
          style={isActive("classes")}
          onClick={() => go("classes")}
        >
          <GraduationCap size={18} />
          <span>Classes</span>
        </button>

        <button
          style={isActive("presences")}
          onClick={() => go("presences")}
        >
          <Calendar size={18} />
          <span>Présences</span>
        </button>

        <button
          style={isActive("notes")}
          onClick={() => go("notes")}
        >
          <FileText size={18} />
          <span>Notes</span>
        </button>

        <button
          style={isActive("documents")}
          onClick={() => go("documents")}
        >
          <FileText size={18} />
          <span>Documents</span>
        </button>

        <button
          style={isActive("rapports")}
          onClick={() => go("rapports")}
        >
          <BarChart3 size={18} />
          <span>Rapports</span>
        </button>

        <button
          style={isActive("scolarite")}
          onClick={() => go("scolarite")}
        >
          <Trophy size={18} />
          <span>Scolarité</span>
        </button>

        <button
          style={isActive("dashboard")}
          onClick={() => go("dashboard")}
        >
          <LayoutGrid size={18} />
          <span>Tableau de bord</span>
        </button>
      </nav>

      <div style={styles.footer}>
        <button
          style={isActive("settings")}
          onClick={() => go("settings")}
        >
          <Settings size={18} />
          <span>Paramètres</span>
        </button>
        <button style={styles.link} onClick={() => go("logout")}>
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: "240px",
    minWidth: "240px",
    background: "var(--bg)",
    borderRight: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  header: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    padding: "1.25rem 1.25rem 1rem",
    borderBottom: `1px solid ${colors.border}`,
  },
  logoBox: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "var(--bg-sidebar-hi)",
  },
  subtitle: { fontSize: "0.65rem", color: colors.gray, margin: 0 },
  title: {
    fontSize: "0.8rem",
    fontWeight: 600,
    margin: 0,
    color: "var(--fg)",
  },
  nav: {
    padding: "1rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flex: 1,
  },
  link: {
    background: "none",
    border: "none",
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    padding: "0.6rem 1.25rem",
    fontSize: "0.8rem",
    color: "var(--fg)",
    cursor: "pointer",
    textAlign: "left",
  },
  activeLink: {
    background: "var(--bg-sidebar-hi)",
    color: colors.teal,
    borderRadius: "0.75rem",
    border: `1px solid ${colors.teal}`,
  },
  footer: {
    borderTop: `1px solid ${colors.border}`,
    padding: "0.75rem 0 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
};

export default VerticalNavBar;
