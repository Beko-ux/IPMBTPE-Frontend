// src/pages/TableauDeBordPage.jsx
import { useEffect, useState } from "react";
import {
  UserCheck,
  Users,
  TrendingUp,
  FileText,
  UserPlus,
  IdCard,
  ClipboardList,
} from "lucide-react";

import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function TableauDeBordPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    classCount: 0,
    assiduiteRate: 0,
    documentsCount: 0,
    activities: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard/overview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de chargement");
        setStats({
          activeStudents: data.activeStudents || 0,
          classCount: data.classCount || 0,
          assiduiteRate: data.assiduiteRate || 0,
          documentsCount: data.documentsCount || 0,
          activities: Array.isArray(data.activities) ? data.activities : [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const go = (key) => {
    if (onNavigate) onNavigate(key);
  };

  return (
    <div style={sx.layout}>
      {/* Colonne gauche */}
      <aside style={sx.left}>
        <VerticalNavBar currentSection="dashboard" onNavigate={onNavigate} />
      </aside>

      {/* Colonne droite */}
      <main style={sx.right}>
        <HorizontalNavBar />
        <div style={sx.pageBody}>
          <div style={sx.container}>
            {/* Titre + sous-titre */}
            <header style={sx.pageHeader}>
              <div>
                <h1 style={sx.title}>Tableau de bord</h1>
                <p style={sx.subtitle}>
                  Vue d&apos;ensemble de l&apos;activité scolaire
                </p>
              </div>
            </header>

            {/* 4 cartes de synthèse */}
            <section style={sx.summaryGrid}>
              {/* Étudiants actifs */}
              <div style={sx.summaryCard}>
                <div style={sx.summaryHeaderRow}>
                  <p style={sx.summaryLabel}>Étudiants actifs</p>
                  <div style={{ ...sx.summaryIconBox, background: "#E6F7F5" }}>
                    <UserCheck size={18} color={colors.teal} />
                  </div>
                </div>
                <div style={sx.summaryMainRow}>
                  <span style={sx.summaryValue}>{stats.activeStudents}</span>
                </div>
                <p style={sx.summaryHint}>Tous niveaux</p>
              </div>

              {/* Classes */}
              <div style={sx.summaryCard}>
                <div style={sx.summaryHeaderRow}>
                  <p style={sx.summaryLabel}>Classes</p>
                  <div style={{ ...sx.summaryIconBox, background: "#FFF4EA" }}>
                    <Users size={18} color="#F59E0B" />
                  </div>
                </div>
                <div style={sx.summaryMainRow}>
                  <span style={sx.summaryValue}>{stats.classCount}</span>
                </div>
                <p style={sx.summaryHint}>Année 2024-2025</p>
              </div>

              {/* Taux d’assiduité */}
              <div style={sx.summaryCard}>
                <div style={sx.summaryHeaderRow}>
                  <p style={sx.summaryLabel}>Taux d&apos;assiduité</p>
                  <div style={{ ...sx.summaryIconBox, background: "#FDF2FF" }}>
                    <TrendingUp size={18} color="#EC4899" />
                  </div>
                </div>
                <div style={sx.summaryMainRow}>
                  <span style={sx.summaryValue}>
                    {stats.assiduiteRate.toFixed(1)}%
                  </span>
                </div>
                <p style={sx.summaryHint}>Ce mois</p>
              </div>

              {/* Documents générés */}
              <div style={sx.summaryCard}>
                <div style={sx.summaryHeaderRow}>
                  <p style={sx.summaryLabel}>Documents générés</p>
                  <div style={{ ...sx.summaryIconBox, background: "#ECF5FF" }}>
                    <FileText size={18} color="#3B82F6" />
                  </div>
                </div>
                <div style={sx.summaryMainRow}>
                  <span style={sx.summaryValue}>{stats.documentsCount}</span>
                </div>
                <p style={sx.summaryHint}>Ce semestre</p>
              </div>
            </section>

            {/* Deux colonnes : Activités récentes / Actions rapides */}
            <section style={sx.twoCols}>
              {/* Activités récentes */}
              <div style={sx.panel}>
                <header style={sx.panelHeader}>
                  <h2 style={sx.panelTitle}>Activités récentes</h2>
                  <p style={sx.panelSub}>
                    Dernières actions dans le système
                  </p>
                </header>

                <div style={sx.activityList}>
                  {loading && (
                    <p style={sx.activityEmpty}>Chargement des activités…</p>
                  )}

                  {!loading && stats.activities.length === 0 && (
                    <p style={sx.activityEmpty}>
                      Aucune activité récente pour le moment.
                    </p>
                  )}

                  {!loading &&
                    stats.activities.map((a) => (
                      <div key={a.id} style={sx.activityItem}>
                        <div>
                          <p style={sx.activityLabel}>{a.title}</p>
                          {a.description && (
                            <p style={sx.activityDesc}>{a.description}</p>
                          )}
                        </div>
                        <p style={sx.activityTime}>{a.time || ""}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions rapides */}
              <div style={sx.panel}>
                <header style={sx.panelHeader}>
                  <h2 style={sx.panelTitle}>Actions rapides</h2>
                  <p style={sx.panelSub}>
                    Accès directs aux fonctions principales
                  </p>
                </header>

                <div style={sx.quickList}>
                  <button
                    type="button"
                    style={sx.quickItem}
                    onClick={() => go("etudiants")}
                  >
                    <div
                      style={{
                        ...sx.quickIconCircle,
                        background: "#E6F7F5",
                      }}
                    >
                      <UserPlus size={18} color={colors.teal} />
                    </div>
                    <div>
                      <p style={sx.quickLabel}>Nouvel étudiant</p>
                      <p style={sx.quickHint}>Inscrire un nouvel étudiant</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    style={sx.quickItem}
                    onClick={() => go("documents")}
                  >
                    <div
                      style={{
                        ...sx.quickIconCircle,
                        background: "#ECF5FF",
                      }}
                    >
                      <FileText size={18} color="#3B82F6" />
                    </div>
                    <div>
                      <p style={sx.quickLabel}>Générer certificat</p>
                      <p style={sx.quickHint}>Certificat de scolarité</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    style={sx.quickItem}
                    onClick={() => go("documents")}
                  >
                    <div
                      style={{
                        ...sx.quickIconCircle,
                        background: "#FFF4EA",
                      }}
                    >
                      <IdCard size={18} color="#F59E0B" />
                    </div>
                    <div>
                      <p style={sx.quickLabel}>Carte d&apos;étudiant</p>
                      <p style={sx.quickHint}>Imprimer carte étudiant</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    style={sx.quickItem}
                    onClick={() => go("presences")}
                  >
                    <div
                      style={{
                        ...sx.quickIconCircle,
                        background: "#FDF2FF",
                      }}
                    >
                      <ClipboardList size={18} color="#EC4899" />
                    </div>
                    <div>
                      <p style={sx.quickLabel}>Fiche de présence</p>
                      <p style={sx.quickHint}>Saisir les présences</p>
                    </div>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- styles ---------- */

const sx = {
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 10%) 1fr",
    width: "100vw",
    height: "100vh",
    background: "#f5f6f8",
    overflow: "hidden",
  },
  left: {
    height: "100%",
    overflowY: "auto",
    background: "var(--bg)",
    borderRight: "1px solid var(--border)",
  },
  right: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100%",
    overflow: "hidden",
    background: "#f5f6f8",
  },
  pageBody: { flex: 1, overflowY: "auto" },
  container: {
    maxWidth: "1600px",
    margin: "1.5rem auto",
    padding: "0 1.5rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { margin: 0, fontSize: "1.4rem", fontWeight: 600 },
  subtitle: {
    margin: "4px 0 0",
    fontSize: ".9rem",
    color: "var(--ip-gray)",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "1rem",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "1rem 1.1rem",
    border: "1px solid var(--border)",
    boxShadow: "0 4px 10px rgba(0,0,0,.02)",
  },
  summaryHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    margin: 0,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryMainRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginTop: 6,
  },
  summaryValue: {
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  summaryHint: {
    margin: "6px 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },

  twoCols: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
    gap: "1rem",
    alignItems: "flex-start",
  },
  panel: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid var(--border)",
    boxShadow: "0 4px 10px rgba(0,0,0,.02)",
    padding: "1rem 1.1rem 1.2rem",
  },
  panelHeader: { marginBottom: 10 },
  panelTitle: { margin: 0, fontSize: ".95rem", fontWeight: 600 },
  panelSub: {
    margin: "4px 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },

  /* Activités */
  activityList: {
    marginTop: 6,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  activityItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "0.5rem 0.25rem",
    borderBottom: "1px solid rgba(0,0,0,.03)",
  },
  activityLabel: {
    margin: 0,
    fontSize: ".85rem",
    fontWeight: 500,
  },
  activityDesc: {
    margin: "2px 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  activityTime: {
    margin: 0,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
    whiteSpace: "nowrap",
  },
  activityEmpty: {
    margin: "0.25rem 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },

  /* Actions rapides */
  quickList: {
    marginTop: 6,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  quickItem: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0.55rem 0.75rem",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color .15s ease, box-shadow .15s ease",
  },
  quickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    margin: 0,
    fontSize: ".85rem",
    fontWeight: 500,
  },
  quickHint: {
    margin: "2px 0 0",
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
};
