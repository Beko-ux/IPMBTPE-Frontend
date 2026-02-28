// src/components/HorizontalNavBar.jsx
import { Menu, LayoutGrid, FileText, Shield, ClipboardList } from "lucide-react";
import { colors } from "../styles/theme";

export default function HorizontalNavBar({
  title = "Scolarité",
  subtitle = "—",
  academicYear = "",
  userName = "Gestionnaire",
  userRole = "Admin système",
  avatarText = "GI",
  onMenu,
  actions = [], // [{ key, label, icon, onClick, active }]
}) {
  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <button style={styles.iconBtn} onClick={onMenu} title="Menu">
          <Menu size={20} />
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.pageTitle}>{title}</h1>
            {!!academicYear && <span style={styles.pill}>{academicYear}</span>}
          </div>
          <p style={styles.subText}>{subtitle}</p>
        </div>
      </div>

      <div style={styles.center}>
        {!!actions?.length && (
          <div style={styles.actions}>
            {actions.map((a) => (
              <button
                key={a.key}
                style={{ ...styles.actionBtn, ...(a.active ? styles.actionBtnActive : null) }}
                onClick={a.onClick}
                title={a.label}
              >
                {a.icon ? <a.icon size={16} /> : null}
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.right}>
        <div style={styles.userMeta}>
          <p style={styles.userName}>{userName}</p>
          <p style={styles.userRole}>{userRole}</p>
        </div>
        <div style={styles.avatar}>{avatarText}</div>
      </div>
    </header>
  );
}

/** Petite aide si tu veux des icônes standards */
export const TopbarIcons = {
  Dashboard: LayoutGrid,
  Notes: FileText,
  Evaluations: ClipboardList,
  Anonymats: Shield,
};

const styles = {
  topbar: {
    height: "4.25rem",
    background: "var(--bg)",
    borderBottom: `1px solid ${colors.border}`,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "0 1.25rem",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    minWidth: 0,
  },

  iconBtn: {
    border: `1px solid ${colors.border}`,
    background: "#fff",
    padding: "0.5rem",
    borderRadius: "0.9rem",
    cursor: "pointer",
    color: "var(--fg)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },

  titleRow: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  pageTitle: {
    fontSize: "1rem",
    margin: 0,
    fontWeight: 900,
    color: "var(--fg)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  pill: {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: colors.teal,
    border: `1px solid ${colors.teal}`,
    background: "var(--bg-sidebar-hi)",
    padding: "0.2rem 0.55rem",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  },

  subText: {
    fontSize: "0.78rem",
    color: colors.gray,
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  center: { display: "flex", justifyContent: "center" },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 34,
    padding: "0 12px",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 800,
    color: "var(--fg)",
  },
  actionBtnActive: {
    border: `1px solid ${colors.teal}`,
    background: "var(--bg-sidebar-hi)",
    color: colors.teal,
  },

  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" },
  userMeta: { textAlign: "right" },
  userName: { fontSize: "0.82rem", fontWeight: 800, margin: 0, color: "var(--fg)" },
  userRole: { fontSize: "0.68rem", color: colors.gray, margin: 0 },
  avatar: {
    width: "2.35rem",
    height: "2.35rem",
    background: colors.teal,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.white,
    fontSize: "0.75rem",
    fontWeight: 900,
    boxShadow: "0 10px 24px rgba(0,184,156,0.25)",
  },
};