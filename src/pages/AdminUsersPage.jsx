// src/pages/AdminUsersPage.jsx
import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { colors } from "../styles/theme";
import { Search, Plus, Trash2, Power, PowerOff, Users, Filter, X, Check, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ROLES = [
  { value: "super_admin", label: "Super Admin", color: colors.orange, bg: "#FFF7ED", border: "#FED7AA", icon: "👑" },
  { value: "gestionnaire", label: "Gestionnaire", color: colors.teal, bg: "#F0FDFA", border: "#99F6E4", icon: "📊" },
  { value: "cellule_informatique", label: "Cellule Info.", color: colors.teal, bg: "#F0FDFA", border: "#99F6E4", icon: "💻" },
  { value: "secretaire", label: "Secrétaire", color: colors.orange, bg: "#FFF7ED", border: "#FED7AA", icon: "📝" },
  { value: "directeur", label: "Directeur", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", icon: "🎓" },
  { value: "promoteur", label: "Promoteur", color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8", icon: "🚀" },
  { value: "promotrice", label: "Promotrice", color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8", icon: "🌟" },
  { value: "agents_securite", label: "Sécurité", color: colors.danger, bg: "#FEF2F2", border: "#FECACA", icon: "🛡️" },
  { value: "censeur", label: "Censeur", color: "#06B6D4", bg: "#ECFEFF", border: "#A5F3FC", icon: "📚" },
  { value: "enseignant", label: "Enseignant", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", icon: "📖" },
];

const getRoleConfig = (roleValue) => ROLES.find(r => r.value === roleValue) || ROLES[0];

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "gestionnaire",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ email: "", password: "", displayName: "", role: "gestionnaire" });
        setShowCreateModal(false);
        fetchUsers();
      } else {
        alert("Erreur lors de la création");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await fetch(`${API_BASE}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeleteModal(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await fetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !currentActive }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    inactive: users.filter(u => !u.active).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px", fontFamily: "var(--font-family)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: `linear-gradient(135deg, ${colors.teal} 0%, #0A7A5A 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 20px ${colors.teal}40`,
            }}>
              <Users size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--fg)", margin: 0 }}>Gestion des utilisateurs</h1>
              <p style={{ fontSize: 14, color: colors.gray, margin: "4px 0 0" }}>Administrez les comptes de la plateforme</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total utilisateurs", value: stats.total, color: "#3B82F6", icon: Users },
            { label: "Actifs", value: stats.active, color: colors.teal, icon: Check },
            { label: "Inactifs", value: stats.inactive, color: colors.danger, icon: X },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: colors.white, borderRadius: 16, padding: 20,
              border: `1px solid ${colors.border}`, boxShadow: "var(--shadow-sm)",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 12px ${stat.color}40`,
              }}>
                <stat.icon size={24} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--fg)", margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: colors.gray, margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          background: colors.white, borderRadius: 16, padding: "16px 20px",
          border: `1px solid ${colors.border}`, boxShadow: "var(--shadow-sm)", marginBottom: 24,
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12, flex: 1, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search size={18} style={{ position: "absolute", left: 14, top: 12, color: colors.gray }} />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px 10px 44px", borderRadius: 12,
                    border: `1px solid ${colors.border}`, background: "var(--bg-input)",
                    fontSize: 14, fontFamily: "var(--font-family)", outline: "none",
                    color: "var(--fg)",
                  }}
                />
              </div>
              
              <div style={{ position: "relative", minWidth: 160 }}>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{
                    appearance: "none", width: "100%", padding: "10px 40px 10px 16px",
                    borderRadius: 12, border: `1px solid ${colors.border}`,
                    background: "var(--bg-input)", fontSize: 14,
                    fontFamily: "var(--font-family)", outline: "none",
                    color: "var(--fg)", cursor: "pointer",
                  }}
                >
                  <option value="all">Tous les rôles</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <Filter size={16} style={{ position: "absolute", right: 14, top: 12, color: colors.gray, pointerEvents: "none" }} />
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 12, border: "none", background: colors.teal, color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                boxShadow: `0 4px 12px ${colors.teal}40`,
                transition: "all 0.2s", fontFamily: "var(--font-family)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(0.96)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "brightness(1)"}
            >
              <Plus size={18} />
              Nouvel utilisateur
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: colors.white, borderRadius: 16, border: `1px solid ${colors.border}`,
          boxShadow: "var(--shadow-sm)", overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${colors.border}`,
                borderTopColor: colors.teal, borderRadius: "50%", margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ color: colors.gray, fontSize: 14 }}>Chargement...</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-family)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-muted)", borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: colors.gray, textTransform: "uppercase", letterSpacing: "0.5px" }}>Utilisateur</th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: colors.gray, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rôle</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", fontSize: 12, fontWeight: 700, color: colors.gray, textTransform: "uppercase", letterSpacing: "0.5px" }}>Statut</th>
                    <th style={{ padding: "16px 20px", textAlign: "right", fontSize: 12, fontWeight: 700, color: colors.gray, textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const roleConfig = getRoleConfig(u.role);
                    return (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: 12,
                              background: u.active ? `linear-gradient(135deg, ${colors.teal} 0%, #0A7A5A 100%)` : colors.border,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontWeight: 700, fontSize: 14,
                            }}>
                              {u.displayName ? u.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, color: "var(--fg)", margin: 0, fontSize: 14 }}>{u.displayName || "Sans nom"}</p>
                              <p style={{ fontSize: 12, color: colors.gray, margin: "2px 0 0" }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: roleConfig.bg, color: roleConfig.color,
                            border: `1px solid ${roleConfig.border}`,
                          }}>
                            <span>{roleConfig.icon}</span>
                            {roleConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: u.active ? "#F0FDF4" : "#FEF2F2",
                            color: u.active ? "#166534" : "#991B1B",
                            border: `1px solid ${u.active ? "#86EFAC" : "#FCA5A5"}`,
                          }}>
                            {u.active ? <Check size={12} /> : <X size={12} />}
                            {u.active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              onClick={() => handleToggleActive(u.id, u.active)}
                              style={{
                                padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`,
                                background: "transparent", color: colors.gray, cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = u.active ? "#FEF2F2" : "#F0FDF4";
                                e.currentTarget.style.color = u.active ? colors.danger : colors.teal;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = colors.gray;
                              }}
                              title={u.active ? "Désactiver" : "Activer"}
                            >
                              {u.active ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(u)}
                              style={{
                                padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`,
                                background: "transparent", color: colors.gray, cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#FEF2F2";
                                e.currentTarget.style.color = colors.danger;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = colors.gray;
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <Users size={48} style={{ color: colors.border, marginBottom: 16 }} />
                  <p style={{ color: colors.gray, fontSize: 14 }}>Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Création */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: colors.white, borderRadius: 24, width: "100%", maxWidth: 520,
            boxShadow: "var(--shadow-md)", overflow: "hidden",
            animation: "scaleIn 0.2s ease",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 0", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.teal}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color={colors.teal} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>Nouvel utilisateur</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: colors.gray }}>Créez un nouveau compte</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: 8, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: colors.gray }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
                <input
                  type="email"
                  placeholder="utilisateur@universite.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`,
                    fontSize: 14, fontFamily: "var(--font-family)", background: "var(--bg-input)", outline: "none",
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`,
                    fontSize: 14, fontFamily: "var(--font-family)", background: "var(--bg-input)", outline: "none",
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nom affiché</label>
                <input
                  type="text"
                  placeholder="Prénom Nom"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`,
                    fontSize: 14, fontFamily: "var(--font-family)", background: "var(--bg-input)", outline: "none",
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: colors.gray, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rôle</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                        borderRadius: 10, border: `2px solid ${form.role === r.value ? colors.teal : colors.border}`,
                        background: form.role === r.value ? `${colors.teal}10` : colors.white,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        color: form.role === r.value ? colors.teal : "var(--fg)",
                        transition: "all 0.15s", fontFamily: "var(--font-family)",
                      }}
                    >
                      <span>{r.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${colors.border}`,
                    background: colors.white, color: colors.gray, fontWeight: 700, fontSize: 14, cursor: "pointer",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "none",
                    background: colors.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    boxShadow: `0 4px 12px ${colors.teal}40`, fontFamily: "var(--font-family)",
                  }}
                >
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }} onClick={() => setShowDeleteModal(null)}>
          <div style={{
            background: colors.white, borderRadius: 24, width: "100%", maxWidth: 440,
            boxShadow: "var(--shadow-md)", overflow: "hidden", padding: 32, textAlign: "center",
            animation: "scaleIn 0.2s ease",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <AlertTriangle size={32} color={colors.danger} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>Confirmer la suppression</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: colors.gray }}>
              Êtes-vous sûr de vouloir supprimer <strong>{showDeleteModal.displayName || showDeleteModal.email}</strong> ? Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowDeleteModal(null)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${colors.border}`,
                  background: colors.white, color: colors.gray, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  fontFamily: "var(--font-family)",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal.id)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "none",
                  background: colors.danger, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  boxShadow: `0 4px 12px ${colors.danger}40`, fontFamily: "var(--font-family)",
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}