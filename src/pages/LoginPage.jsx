// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from "react";
import useAuthStore from "../store/useAuthStore";
import { colors } from "../styles/theme";

const ROLES = [
  { value: "super_admin", label: "Super Administrateur", icon: "👑", color: "#FFD700", desc: "Contrôle total du système" },
  { value: "gestionnaire", label: "Gestionnaire", icon: "📊", color: colors.teal, desc: "Gestion administrative" },
  { value: "cellule_informatique", label: "Cellule Informatique", icon: "💻", color: colors.teal, desc: "Support technique" },
  { value: "secretaire", label: "Secrétaire", icon: "📝", color: colors.orange, desc: "Gestion des dossiers" },
  { value: "directeur", label: "Directeur", icon: "🎓", color: "#8B5CF6", desc: "Direction académique" },
  { value: "promoteur", label: "Promoteur", icon: "🚀", color: "#EC4899", desc: "Promotion & marketing" },
  { value: "promotrice", label: "Promotrice", icon: "🌟", color: "#EC4899", desc: "Promotion & marketing" },
  { value: "agents_securite", label: "Agent de sécurité", icon: "🛡️", color: colors.danger, desc: "Sécurité du campus" },
  { value: "censeur", label: "Censeur", icon: "📚", color: "#06B6D4", desc: "Discipline & éducation" },
  { value: "enseignant", label: "Enseignant", icon: "📖", color: "#8B5CF6", desc: "Corps professoral" },
];

const MorphingBlob = ({ top, left, right, bottom, width, height, color1, color2, duration = 20 }) => (
  <div
    style={{
      position: "absolute",
      top, left, right, bottom,
      width, height,
      filter: "blur(60px)",
      opacity: 0.25,
      animation: `morph ${duration}s ease-in-out infinite`,
    }}
  >
    <div
      style={{
        width: "100%", height: "100%",
        background: `radial-gradient(circle, ${color1}, ${color2})`,
        borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
      }}
    />
  </div>
);

const FloatingIcon = ({ emoji, top, left, right, bottom, delay = 0, duration = 6 }) => (
  <div
    style={{
      position: "absolute",
      top, left, right, bottom,
      fontSize: 32,
      opacity: 0.15,
      pointerEvents: "none",
      animation: `floatIcon ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  >
    {emoji}
  </div>
);

const RoleSelector = ({ selectedRole, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const selectedRoleData = ROLES.find((r) => r.value === selectedRole);
  const filteredRoles = ROLES.filter(r => 
    r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative", marginBottom: 20 }} ref={dropdownRef}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Sélectionnez votre rôle
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderRadius: 14,
          border: `2px solid ${error ? colors.danger : selectedRole ? colors.teal : "rgba(255,255,255,0.2)"}`,
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
          cursor: "pointer", outline: "none", transition: "all 0.2s",
          fontFamily: "var(--font-family)", color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, background: selectedRoleData ? `${selectedRoleData.color}20` : "rgba(255,255,255,0.1)",
            boxShadow: selectedRoleData ? `0 0 20px ${selectedRoleData.color}30` : "none",
          }}>
            {selectedRoleData?.icon || "👤"}
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedRoleData?.label || "Choisir un rôle..."}</div>
            {selectedRoleData && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{selectedRoleData.desc}</div>}
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {error && <p style={{ marginTop: 6, fontSize: 12, color: colors.danger, paddingLeft: 8 }}>{error}</p>}
      
      {isOpen && (
        <div style={{
          position: "absolute", zIndex: 50, width: "100%", marginTop: 4,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)",
          borderRadius: 16, border: "1px solid rgba(255,255,255,0.3)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 12px 0" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: 10, color: colors.gray }}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher un rôle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 40px", borderRadius: 10,
                  border: `1px solid ${colors.border}`, background: colors.white,
                  fontSize: 13, outline: "none", fontFamily: "var(--font-family)",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "8px 4px" }}>
            {filteredRoles.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => { onChange(role.value); setIsOpen(false); setSearchTerm(""); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  border: "none", background: selectedRole === role.value ? `${colors.teal}10` : "transparent",
                  cursor: "pointer", transition: "background 0.15s", textAlign: "left",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.background = selectedRole === role.value ? `${colors.teal}10` : "transparent"}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `${role.color}20` }}>
                  {role.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: selectedRole === role.value ? colors.teal : "var(--fg)" }}>{role.label}</div>
                  <div style={{ fontSize: 11, color: colors.gray }}>{role.desc}</div>
                </div>
                {selectedRole === role.value && (
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: colors.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedRole) { setError("Veuillez sélectionner votre rôle"); triggerShake(); return; }
    const result = await login(email, password);
    if (!result.success) { setError(result.error); triggerShake(); return; }
    if (result.role !== selectedRole) {
      setError("Le rôle sélectionné ne correspond pas à ce compte.");
      await useAuthStore.getState().logout();
      triggerShake();
    }
  };

  return (
    <div style={{
      position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", background: "#0F172A", fontFamily: "var(--font-family)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        backgroundSize: "200% 200%", animation: "gradientShift 20s ease infinite",
      }} />
      
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }} />

      <MorphingBlob top={-100} left={-100} width={400} height={400} color1="#10B981" color2="#059669" duration={25} />
      <MorphingBlob bottom={-50} right={-50} width={350} height={350} color1="#3B82F6" color2="#1D4ED8" duration={30} />
      <MorphingBlob top="30%" right="15%" width={200} height={200} color1="#8B5CF6" color2="#6D28D9" duration={22} />

      <FloatingIcon emoji="🎓" top="15%" left="15%" delay={0} duration={7} />
      <FloatingIcon emoji="📚" top="25%" right="20%" delay={2} duration={8} />
      <FloatingIcon emoji="✨" bottom="20%" left="18%" delay={4} duration={6} />
      <FloatingIcon emoji="🏛️" bottom="15%" right="15%" delay={1} duration={9} />

      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: 460, margin: "0 16px",
        opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
          borderRadius: 28, border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden",
          transform: shake ? "translateX(-5px)" : "none", transition: "transform 0.1s",
        }}>
          <div style={{ padding: "36px 32px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
                background: `linear-gradient(135deg, ${colors.teal} 0%, #0A7A5A 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 10px 25px ${colors.teal}40`,
              }}>
                <span style={{ fontSize: 36 }}>🏛️</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Espace Universitaire</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#94A3B8" }}>Plateforme de gestion scolaire intelligente</p>
            </div>

            {error && !error.includes("rôle") && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: `${colors.danger}20`, border: `1px solid ${colors.danger}40`, color: "#FCA5A5", fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <RoleSelector selectedRole={selectedRole} onChange={setSelectedRole} error={error.includes("rôle") ? error : ""} />

              <div style={{ marginBottom: 20 }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@universite.edu"
                    required
                    style={{
                      width: "100%", padding: "14px 16px 14px 48px", borderRadius: 14,
                      border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)",
                      backdropFilter: "blur(8px)", fontSize: 14, color: "#fff", outline: "none",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                  <span style={{ position: "absolute", left: 16, top: 14, fontSize: 18, color: "rgba(255,255,255,0.5)" }}>✉️</span>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%", padding: "14px 56px 14px 48px", borderRadius: 14,
                      border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)",
                      backdropFilter: "blur(8px)", fontSize: 14, color: "#fff", outline: "none",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                  <span style={{ position: "absolute", left: 16, top: 14, fontSize: 18, color: "rgba(255,255,255,0.5)" }}>🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 18 }}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#94A3B8", fontSize: 13 }}>
                  <input type="checkbox" style={{ width: 16, height: 16, borderRadius: 4, accentColor: colors.teal }} />
                  Se souvenir de moi
                </label>
                <button type="button" style={{ background: "none", border: "none", color: colors.teal, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Mot de passe oublié ?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "16px", borderRadius: 14, border: "none",
                  background: `linear-gradient(135deg, ${colors.teal} 0%, #0A7A5A 100%)`,
                  color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                  boxShadow: `0 8px 20px ${colors.teal}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: loading ? 0.8 : 1, transition: "all 0.2s",
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 28, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>© 2026 IPMBTPE. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes floatIcon { 0%,100% { transform: translateY(0) rotate(0deg); } 33% { transform: translateY(-15px) rotate(5deg); } 66% { transform: translateY(-8px) rotate(-5deg); } }
        @keyframes morph { 0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } 50% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}