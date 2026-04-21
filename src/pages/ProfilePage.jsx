// src/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from "react";
import useAuthStore from "../store/useAuthStore";
import { colors } from "../styles/theme";
import { Save, Key, User, Shield, Mail, Camera, X, Check, Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const roleConfigMap = {
  super_admin: { gradient: `linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)`, icon: "👑" },
  gestionnaire: { gradient: `linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)`, icon: "📊" },
  cellule_informatique: { gradient: `linear-gradient(135deg, ${colors.teal} 0%, #0A7A5A 100%)`, icon: "💻" },
  secretaire: { gradient: `linear-gradient(135deg, #eab308 0%, #d97706 100%)`, icon: "📝" },
  directeur: { gradient: `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)`, icon: "🎓" },
  promoteur: { gradient: `linear-gradient(135deg, #ec4899 0%, #db2777 100%)`, icon: "🚀" },
  promotrice: { gradient: `linear-gradient(135deg, #ec4899 0%, #db2777 100%)`, icon: "🌟" },
  agents_securite: { gradient: `linear-gradient(135deg, ${colors.danger} 0%, #b91c1c 100%)`, icon: "🛡️" },
  censeur: { gradient: `linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)`, icon: "📚" },
  enseignant: { gradient: `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)`, icon: "📖" },
};

const getRoleConfig = (role) => roleConfigMap[role] || { gradient: colors.teal, icon: "👤" };

// Composant Avatar avec upload
const AvatarUpload = ({ currentAvatar, displayName, onUpload, role }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [preview, setPreview] = useState(currentAvatar);
  const fileInputRef = useRef(null);
  const roleCfg = getRoleConfig(role);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Veuillez sélectionner une image'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('L\'image ne doit pas dépasser 2MB'); return; }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    // Convertir en base64 et sauvegarder via l'API
    onUpload(reader.result);
  };

  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          width: 112, height: 112, borderRadius: 20, overflow: "hidden",
          boxShadow: "var(--shadow-md)", cursor: "pointer", transition: "all 0.3s",
          transform: isHovering ? "scale(1.05)" : "scale(1)",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", background: roleCfg.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 36, color: "#fff", fontWeight: 700 }}>{initials}</span>
          </div>
        )}
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          opacity: isHovering ? 1 : 0, transition: "opacity 0.3s",
        }}>
          <Camera size={28} color="#fff" style={{ marginBottom: 4 }} />
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Changer</span>
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: -8, right: -8,
        width: 40, height: 40, borderRadius: 14, background: colors.white,
        boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${colors.border}`, fontSize: 22,
      }}>
        {roleCfg.icon}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
    </div>
  );
};

// Input mot de passe avec force et visibilité
const PasswordInput = ({ value, onChange, label, placeholder, showStrength = false }) => {
  const [show, setShow] = useState(false);
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = showStrength ? getStrength(value) : 0;
  const strengthColors = [colors.danger, colors.orange, "#eab308", colors.teal, "#059669"];

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          style={{
            width: "100%", padding: "12px 48px 12px 16px", borderRadius: 12,
            border: `1px solid ${colors.border}`, background: colors.white,
            fontSize: 14, fontFamily: "var(--font-family)", outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          style={{
            position: "absolute", right: 12, top: 12, background: "none", border: "none",
            cursor: "pointer", color: colors.gray, display: "flex", alignItems: "center",
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showStrength && value && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} style={{
                height: 4, flex: 1, borderRadius: 4,
                background: level <= strength ? strengthColors[strength - 1] : colors.border,
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: colors.gray }}>
            {strength < 2 ? 'Faible' : strength < 4 ? 'Moyen' : 'Fort'}
          </p>
        </div>
      )}
    </div>
  );
};

export default function ProfilePage() {
  const { user, token, role, updateUserProfile } = useAuthStore();
  const [profile, setProfile] = useState({ displayName: "", email: "", avatarUrl: "" });
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || "",
        email: user.email || "",
        avatarUrl: user.photoURL || "",
      });
      setEditName(user.displayName || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      
      // Mise à jour locale du store
      await updateUserProfile({ displayName: editName.trim() });
      
      setProfile({ ...profile, displayName: editName.trim() });
      setIsEditing(false);
      setMessage({ type: "success", text: "Profil mis à jour avec succès ✨" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpdate = async (avatarUrl) => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      
      // Mise à jour du store global avec la nouvelle photoURL
      await updateUserProfile({ photoURL: avatarUrl });
      
      setProfile({ ...profile, avatarUrl });
      setMessage({ type: "success", text: "Photo de profil mise à jour 📸" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (passwordForm.new.length < 6) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères" });
      return;
    }
    setChangingPassword(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/users/me/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({ type: "success", text: "Mot de passe modifié avec succès 🔒" });
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const roleCfg = getRoleConfig(role);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px", fontFamily: "var(--font-family)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Carte en-tête avec avatar */}
        <div style={{
          background: colors.white, borderRadius: 24, border: `1px solid ${colors.border}`,
          boxShadow: "var(--shadow-md)", padding: "32px 32px 24px", marginBottom: 24,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 100,
            background: roleCfg.gradient, opacity: 0.9,
          }} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16, paddingTop: 60 }}>
            <AvatarUpload currentAvatar={profile.avatarUrl} displayName={profile.displayName} onUpload={handleAvatarUpdate} role={role} />
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--fg)", margin: "0 0 4px" }}>
                {profile.displayName || "Utilisateur"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: colors.gray, marginBottom: 8 }}>
                <Mail size={14} />
                <span style={{ fontSize: 14 }}>{profile.email}</span>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 30, background: roleCfg.gradient, color: "#fff",
                fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-sm)",
              }}>
                <span>{roleCfg.icon}</span>
                <span style={{ textTransform: "capitalize" }}>{role?.replace(/_/g, ' ')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
          {[
            { id: "profile", label: "Profil", icon: User },
            { id: "security", label: "Sécurité", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 14, border: "none", cursor: "pointer",
                background: activeTab === tab.id ? colors.white : "transparent",
                color: activeTab === tab.id ? colors.teal : colors.gray,
                fontWeight: 600, fontSize: 14, boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s", fontFamily: "var(--font-family)",
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: "14px 18px", borderRadius: 14, marginBottom: 24,
            background: message.type === "success" ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${message.type === "success" ? "#86EFAC" : "#FCA5A5"}`,
            color: message.type === "success" ? "#166534" : "#991B1B",
            display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500,
          }}>
            {message.type === "success" ? <Check size={20} /> : <X size={20} />}
            {message.text}
          </div>
        )}

        {/* Contenu */}
        {activeTab === "profile" && (
          <div style={{ background: colors.white, borderRadius: 24, border: `1px solid ${colors.border}`, boxShadow: "var(--shadow-sm)", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${colors.teal}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={20} color={colors.teal} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0 }}>Informations personnelles</h2>
                <p style={{ fontSize: 13, color: colors.gray, margin: "2px 0 0" }}>Gérez vos informations de base</p>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Adresse email</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--bg-muted)", border: `1px solid ${colors.border}` }}>
                <Mail size={16} color={colors.gray} />
                <span style={{ fontSize: 14, color: "var(--fg)" }}>{profile.email}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: colors.gray, background: colors.white, padding: "4px 8px", borderRadius: 8, border: `1px solid ${colors.border}` }}>Non modifiable</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.gray, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nom affiché</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    border: `2px solid ${colors.teal}`, background: colors.white,
                    fontSize: 14, outline: "none", fontFamily: "var(--font-family)",
                  }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--bg-muted)", border: `1px solid ${colors.border}` }}>
                  <User size={16} color={colors.gray} />
                  <span style={{ fontSize: 14, color: "var(--fg)" }}>{profile.displayName || "Non défini"}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {isEditing ? (
                <>
                  <button onClick={handleSaveProfile} disabled={savingProfile} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12,
                    border: "none", background: colors.teal, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    <Save size={16} /> {savingProfile ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditName(profile.displayName); }} style={{
                    padding: "10px 20px", borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.white,
                    color: colors.gray, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>Annuler</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12,
                  border: `1px solid ${colors.border}`, background: colors.white, color: "var(--fg)",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>
                  <User size={16} /> Modifier le profil
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div style={{ background: colors.white, borderRadius: 24, border: `1px solid ${colors.border}`, boxShadow: "var(--shadow-sm)", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${colors.orange}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={20} color={colors.orange} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0 }}>Sécurité</h2>
                <p style={{ fontSize: 13, color: colors.gray, margin: "2px 0 0" }}>Modifiez votre mot de passe</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword}>
              <PasswordInput value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} label="Mot de passe actuel" placeholder="••••••••" />
              <PasswordInput value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} label="Nouveau mot de passe" placeholder="••••••••" showStrength />
              <PasswordInput value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} label="Confirmer le nouveau mot de passe" placeholder="••••••••" />

              <button type="submit" disabled={changingPassword} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12,
                border: "none", background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.danger} 100%)`,
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 12,
                boxShadow: `0 4px 12px ${colors.orange}40`,
              }}>
                <Key size={16} /> {changingPassword ? "Modification..." : "Changer le mot de passe"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}