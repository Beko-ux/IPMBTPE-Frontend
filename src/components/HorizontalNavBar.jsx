// src/components/HorizontalNavBar.jsx (inchangé, déjà complet avec avatarUrl)
import { Menu, LayoutGrid, FileText, Shield, ClipboardList } from "lucide-react";
import { colors } from "../styles/theme";
import AcademicYearSelector from "./AcademicYearSelector";
import useAuthStore from "../store/useAuthStore";

export default function HorizontalNavBar({
  title = "Scolarité",
  subtitle = "—",
  onMenu,
  onNavigate,
  actions = [],
}) {
  const { user, role } = useAuthStore();

  const displayName = user?.displayName || user?.email?.split('@')[0] || "Utilisateur";
  const avatarUrl = user?.photoURL;

  const roleLabels = {
    super_admin: "Super Admin",
    gestionnaire: "Gestionnaire",
    cellule_informatique: "Cellule Info.",
    secretaire: "Secrétaire",
    directeur: "Directeur",
    promoteur: "Promoteur",
    promotrice: "Promotrice",
    agents_securite: "Agent sécurité",
    censeur: "Censeur",
    enseignant: "Enseignant",
  };
  const userRole = roleLabels[role] || role || "Utilisateur";

  const getInitials = () => {
    if (!displayName) return "?";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    if (onNavigate) onNavigate("profile");
  };

  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <button style={styles.iconBtn} onClick={onMenu} title="Menu">
          <Menu size={20} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.pageTitle}>{title}</h1>
          </div>
          <p style={styles.subText}>{subtitle}</p>
        </div>
      </div>

      <div style={styles.center}>
        <AcademicYearSelector />
        {actions.length > 0 && <div style={styles.divider} />}
        {actions.length > 0 && (
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
        <button
          onClick={handleProfileClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <div style={styles.userMeta}>
            <p style={styles.userName}>{displayName}</p>
            <p style={styles.userRole}>{userRole}</p>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{
                width: "2.35rem",
                height: "2.35rem",
                borderRadius: "9999px",
                objectFit: "cover",
                boxShadow: "0 10px 24px rgba(0,184,156,0.25)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={styles.avatar}>{getInitials()}</div>
          )}
        </button>
      </div>
    </header>
  );
}

export const TopbarIcons = {
  Dashboard: LayoutGrid,
  Notes: FileText,
  Evaluations: ClipboardList,
  Anonymats: Shield,
};

const styles = {
  topbar: { height: "4.25rem", background: "var(--bg)", borderBottom: `1px solid ${colors.border}`, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 1.25rem", boxSizing: "border-box", position: "sticky", top: 0, zIndex: 20, gap: "1rem" },
  left: { display: "flex", alignItems: "center", gap: "0.9rem", minWidth: 0 },
  iconBtn: { border: `1px solid ${colors.border}`, background: "#fff", padding: "0.5rem", borderRadius: "0.9rem", cursor: "pointer", color: "var(--fg)", boxShadow: "0 6px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleRow: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  pageTitle: { fontSize: "1rem", margin: 0, fontWeight: 900, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  subText: { fontSize: "0.78rem", color: colors.gray, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", gap: 10 },
  divider: { width: 1, height: 24, background: colors.border, borderRadius: 1 },
  actions: { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 14, border: `1px solid ${colors.border}`, background: "#fff", boxShadow: "0 6px 16px rgba(0,0,0,0.06)" },
  actionBtn: { display: "flex", alignItems: "center", gap: 7, height: 32, padding: "0 11px", borderRadius: 12, border: `1px solid ${colors.border}`, background: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 800, color: "var(--fg)", whiteSpace: "nowrap" },
  actionBtnActive: { border: `1px solid ${colors.teal}`, background: "var(--bg-sidebar-hi)", color: colors.teal },
  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" },
  userMeta: { textAlign: "right" },
  userName: { fontSize: "0.82rem", fontWeight: 800, margin: 0, color: "var(--fg)" },
  userRole: { fontSize: "0.68rem", color: colors.gray, margin: 0 },
  avatar: { width: "2.35rem", height: "2.35rem", background: colors.teal, borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", color: colors.white, fontSize: "0.75rem", fontWeight: 900, boxShadow: "0 10px 24px rgba(0,184,156,0.25)", flexShrink: 0 },
};