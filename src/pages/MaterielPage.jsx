// src/pages/MaterielPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Monitor, Package, Plus, ChevronDown, ChevronRight,
  Edit3, Trash2, CheckCircle2, Circle, X, Eye, Calendar, User,
  AlertCircle, Check, Layers, Projector, Building2, Clock,
  Printer, ClipboardList, Wrench, Video, Plug, FolderTree, Battery
} from "lucide-react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import useAppStore from "../store/useAppStore.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const LIEU_TYPES = {
  SALLE_INFO: "salle_informatique",
  SALLE_COURS: "salle_cours",
  BUREAU: "bureau",
};

const EQUIPEMENT_TYPES = {
  POSTE_COMPOSANT: "poste_composant",
  PROJECTEUR: "projecteur",
  RALLONGE: "rallonge",
  SUPPORT_PROJECTION: "support_projection",
  REGULATEUR: "regulateur_tension",
  AUTRE: "autre",
};

const equipIconMap = {
  [EQUIPEMENT_TYPES.POSTE_COMPOSANT]: Monitor,
  [EQUIPEMENT_TYPES.PROJECTEUR]: Video,
  [EQUIPEMENT_TYPES.RALLONGE]: Plug,
  [EQUIPEMENT_TYPES.SUPPORT_PROJECTION]: FolderTree,
  [EQUIPEMENT_TYPES.REGULATEUR]: Battery,
  [EQUIPEMENT_TYPES.AUTRE]: Package,
};

const etatStyle = {
  fonctionnel: { bg: "#E8F5E9", color: "#2E7D32", label: "Fonctionnel", icon: CheckCircle2 },
  panne: { bg: "#FFEBEE", color: "#C62828", label: "En panne", icon: AlertCircle },
  maintenance: { bg: "#FFF3E0", color: "#EF6C00", label: "Maintenance", icon: Wrench },
};

export default function MaterielPage({ currentSection, onNavigate }) {
  const { academicYear } = useAppStore();

  const [lieux, setLieux] = useState([]);
  const [selectedLieuId, setSelectedLieuId] = useState("");
  const [equipements, setEquipements] = useState([]);
  const [postesTravail, setPostesTravail] = useState([]);
  const [projecteurs, setProjecteurs] = useState([]);
  const [utilisationsProjecteur, setUtilisationsProjecteur] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("equipements");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedLieux, setExpandedLieux] = useState(new Set([LIEU_TYPES.SALLE_INFO, LIEU_TYPES.SALLE_COURS, LIEU_TYPES.BUREAU]));
  const [showEntreeSortieModal, setShowEntreeSortieModal] = useState(false);
  const [entreeSortieForm, setEntreeSortieForm] = useState({
    type: "entree",
    responsable: "",
    responsableType: "enseignant",
    date: new Date().toISOString().slice(0, 16),
    observationsAvant: "",
    observationsApres: "",
  });
  const [historiqueEntrees, setHistoriqueEntrees] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lieuxData, equipData, postesData, projData, utilData] = await Promise.all([
        apiFetch("/materiel/lieux"),
        apiFetch("/materiel/equipements"),
        apiFetch("/materiel/postes-travail"),
        apiFetch("/materiel/projecteurs"),
        apiFetch("/materiel/utilisations-projecteur"),
      ]);
      setLieux(Array.isArray(lieuxData) ? lieuxData : []);
      setEquipements(Array.isArray(equipData) ? equipData : []);
      setPostesTravail(Array.isArray(postesData) ? postesData : []);
      setProjecteurs(Array.isArray(projData) ? projData : []);
      setUtilisationsProjecteur(Array.isArray(utilData) ? utilData : []);
    } catch (err) {
      showToast("err", err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedLieu = lieux.find((l) => l.id === selectedLieuId) || null;
  const equipementsByLieu = equipements.filter((e) => e.lieu_id === selectedLieuId);
  const postesByLieu = postesTravail.filter((p) => p.salle_informatique_id === selectedLieuId);
  const projecteursByLieu = projecteurs.filter((p) => p.lieu_id === selectedLieuId);

  const lieuxByType = useMemo(() => {
    const groups = {
      [LIEU_TYPES.SALLE_INFO]: [],
      [LIEU_TYPES.SALLE_COURS]: [],
      [LIEU_TYPES.BUREAU]: [],
    };
    lieux.forEach((l) => {
      if (groups[l.type]) groups[l.type].push(l);
    });
    return groups;
  }, [lieux]);

  const toggleExpandType = (type) => {
    setExpandedLieux((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    setSaving(true);
    try {
      await apiFetch(`/materiel/${type}/${id}`, { method: "DELETE" });
      await loadData();
      showToast("ok", "Supprimé");
    } catch (err) {
      showToast("err", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEntreeSortie = async () => {
    if (!selectedLieu) return;
    try {
      await apiFetch("/materiel/entree-sortie", {
        method: "POST",
        body: JSON.stringify({
          lieu_id: selectedLieu.id,
          type: entreeSortieForm.type,
          responsable: entreeSortieForm.responsable,
          responsableType: entreeSortieForm.responsableType,
          date: entreeSortieForm.date,
          observationsAvant: entreeSortieForm.observationsAvant,
          observationsApres: entreeSortieForm.observationsApres,
        }),
      });
      showToast("ok", `${entreeSortieForm.type === "entree" ? "Entrée" : "Sortie"} enregistrée`);
      setShowEntreeSortieModal(false);
      setEntreeSortieForm({
        type: "entree",
        responsable: "",
        responsableType: "enseignant",
        date: new Date().toISOString().slice(0, 16),
        observationsAvant: "",
        observationsApres: "",
      });
    } catch (err) {
      showToast("err", err.message);
    }
  };

  const loadHistorique = async () => {
    if (!selectedLieu) return;
    try {
      const data = await apiFetch(`/materiel/entrees-sorties/${selectedLieu.id}`);
      setHistoriqueEntrees(data);
      setShowHistorique(true);
    } catch (err) {
      showToast("err", err.message);
    }
  };

  const imprimerFiche = () => {
    if (!historiqueEntrees.length) return;
    const html = `
      <html>
      <head><title>Fiche de suivi - ${selectedLieu.nom}</title></head>
      <body>
        <h1>${selectedLieu.nom}</h1>
        <table border="1" cellpadding="5">
          <thead><tr><th>Date</th><th>Type</th><th>Responsable</th><th>Observations avant</th><th>Observations après</th></tr></thead>
          <tbody>
            ${historiqueEntrees.map(e => `
              <tr>
                <td>${new Date(e.date).toLocaleString()}</td>
                <td>${e.type === "entree" ? "Entrée" : "Sortie"}</td>
                <td>${e.responsable} (${e.responsableType})</td>
                <td>${e.observationsAvant || "—"}</td>
                <td>${e.observationsApres || "—"}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open();
    w.document.write(html);
    w.print();
  };

  return (
    <div style={sx.root}>
      <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      <div style={sx.contentArea}>
        <HorizontalNavBar title="Gestion du matériel" subtitle={`Année ${academicYear}`} />
        <div style={sx.body}>
          <aside style={sx.sidebar}>
            <div style={sx.sideHeader}>
              <Layers size={13} style={{ color: "var(--ip-teal)" }} />
              <span>Lieux</span>
              <button style={sx.addSmallBtn} onClick={() => { setModalType("lieu"); setEditItem(null); setFormData({}); setShowModal(true); }}>
                <Plus size={12} />
              </button>
            </div>
            {loading && <div style={sx.hint}>Chargement...</div>}
            {Object.entries(lieuxByType).map(([type, items]) => {
              const label = {
                [LIEU_TYPES.SALLE_INFO]: "🏫 Salles informatiques",
                [LIEU_TYPES.SALLE_COURS]: "📖 Salles de cours",
                [LIEU_TYPES.BUREAU]: "💼 Bureaux",
              }[type] || type;
              const expanded = expandedLieux.has(type);
              return (
                <div key={type} style={sx.typeBlock}>
                  <button style={sx.typeToggle} onClick={() => toggleExpandType(type)}>
                    <div style={sx.typeLeft}>
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span style={sx.typeLabel}>{label}</span>
                    </div>
                    <span style={sx.typeCount}>{items.length}</span>
                  </button>
                  {expanded &&
                    items.map((lieu) => (
                      <button
                        key={lieu.id}
                        onClick={() => setSelectedLieuId(lieu.id)}
                        style={{ ...sx.lieuBtn, ...(selectedLieuId === lieu.id ? sx.lieuBtnSel : {}) }}
                      >
                        <div style={sx.lieuName}>{lieu.nom}</div>
                        <div style={sx.lieuMeta}>
                          {lieu.capacite && `${lieu.capacite} places`}
                          {lieu.occupant && ` · ${lieu.occupant}`}
                        </div>
                      </button>
                    ))}
                </div>
              );
            })}
          </aside>

          <main style={sx.main}>
            {toast && (
              <div style={{ ...sx.toast, ...(toast.type === "ok" ? sx.toastOk : sx.toastErr) }}>
                {toast.type === "ok" ? <Check size={13} /> : <AlertCircle size={13} />}
                {toast.msg}
              </div>
            )}
            {!selectedLieu ? (
              <div style={sx.emptyState}>
                <div style={sx.emptyIcon}>
                  <Building2 size={48} strokeWidth={1.2} color="var(--ip-teal)" />
                </div>
                <div style={sx.emptyTitle}>Sélectionnez un lieu</div>
                <div style={sx.emptySub}>Choisissez une salle ou un bureau dans la colonne de gauche.</div>
              </div>
            ) : (
              <>
                <div style={sx.classCard}>
                  <div style={sx.classCardLeft}>
                    <div style={sx.classCardTitle}>{selectedLieu.nom}</div>
                    <div style={sx.classCardMeta}>
                      {selectedLieu.type === LIEU_TYPES.SALLE_INFO && "🖥️ Salle informatique"}
                      {selectedLieu.type === LIEU_TYPES.SALLE_COURS && "📚 Salle de cours"}
                      {selectedLieu.type === LIEU_TYPES.BUREAU && "📁 Bureau"}
                      {selectedLieu.capacite && ` · ${selectedLieu.capacite} places`}
                      {selectedLieu.occupant && ` · Occupant: ${selectedLieu.occupant}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {selectedLieu.type === LIEU_TYPES.SALLE_INFO && (
                      <>
                        <button style={sx.btnSecondary} onClick={() => setShowEntreeSortieModal(true)}>
                          <Clock size={13} /> Entrée / Sortie
                        </button>
                        <button style={sx.btnSecondary} onClick={loadHistorique}>
                          <ClipboardList size={13} /> Historique
                        </button>
                      </>
                    )}
                    <button
                      style={sx.btnSecondary}
                      onClick={() => {
                        setModalType("lieu");
                        setEditItem(selectedLieu);
                        setFormData(selectedLieu);
                        setShowModal(true);
                      }}
                    >
                      <Edit3 size={13} /> Modifier
                    </button>
                  </div>
                </div>

                <div style={sx.tabsRow}>
                  <TabBtn active={activeTab === "equipements"} onClick={() => setActiveTab("equipements")}>
                    <Package size={13} /> Équipements ({equipementsByLieu.length})
                  </TabBtn>
                  {selectedLieu.type === LIEU_TYPES.SALLE_INFO && (
                    <TabBtn active={activeTab === "postes"} onClick={() => setActiveTab("postes")}>
                      <Monitor size={13} /> Postes ({postesByLieu.length})
                    </TabBtn>
                  )}
                  <TabBtn active={activeTab === "projecteurs"} onClick={() => setActiveTab("projecteurs")}>
                    <Projector size={13} /> Projecteurs ({projecteursByLieu.length})
                  </TabBtn>
                </div>

                {activeTab === "equipements" && (
                  <EquipementsTab
                    equipements={equipementsByLieu}
                    onAdd={() => {
                      setModalType("equipement");
                      setEditItem(null);
                      setFormData({ lieu_id: selectedLieu.id });
                      setShowModal(true);
                    }}
                    onEdit={(eq) => {
                      setModalType("equipement");
                      setEditItem(eq);
                      setFormData(eq);
                      setShowModal(true);
                    }}
                    onDelete={(id) => handleDelete("equipement", id)}
                  />
                )}
                {activeTab === "postes" && selectedLieu.type === LIEU_TYPES.SALLE_INFO && (
                  <PostesTab
                    postes={postesByLieu}
                    onAdd={() => {
                      setModalType("poste");
                      setEditItem(null);
                      setFormData({ salle_informatique_id: selectedLieu.id });
                      setShowModal(true);
                    }}
                    onEdit={(poste) => {
                      setModalType("poste");
                      setEditItem(poste);
                      setFormData(poste);
                      setShowModal(true);
                    }}
                    onDelete={(id) => handleDelete("poste", id)}
                  />
                )}
                {activeTab === "projecteurs" && (
                  <ProjecteursTab
                    projecteurs={projecteursByLieu}
                    utilisations={utilisationsProjecteur}
                    onAdd={() => {
                      setModalType("projecteur");
                      setEditItem(null);
                      setFormData({ lieu_id: selectedLieu.id });
                      setShowModal(true);
                    }}
                    onEdit={(proj) => {
                      setModalType("projecteur");
                      setEditItem(proj);
                      setFormData(proj);
                      setShowModal(true);
                    }}
                    onDelete={(id) => handleDelete("projecteur", id)}
                    onAddUtilisation={(projId) => {
                      setModalType("utilisation");
                      setEditItem(null);
                      setFormData({ projecteur_id: projId, lieu_id: selectedLieu.id });
                      setShowModal(true);
                    }}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <Modal
          type={modalType}
          data={formData}
          editItem={editItem}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            await loadData();
            setShowModal(false);
            showToast("ok", "Enregistré");
          }}
          showToast={showToast}
        />
      )}

      {showEntreeSortieModal && (
        <div style={sx.overlay} onMouseDown={() => setShowEntreeSortieModal(false)}>
          <div style={mx.box} onMouseDown={(e) => e.stopPropagation()}>
            <div style={mx.header}>
              <div style={mx.title}>Enregistrer une entrée / sortie</div>
              <button style={mx.close} onClick={() => setShowEntreeSortieModal(false)}>
                <X size={15} />
              </button>
            </div>
            <div style={mx.body}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="type"
                    value="entree"
                    checked={entreeSortieForm.type === "entree"}
                    onChange={() => setEntreeSortieForm({ ...entreeSortieForm, type: "entree" })}
                  />{" "}
                  Entrée
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="type"
                    value="sortie"
                    checked={entreeSortieForm.type === "sortie"}
                    onChange={() => setEntreeSortieForm({ ...entreeSortieForm, type: "sortie" })}
                  />{" "}
                  Sortie
                </label>
              </div>
              <Input
                label="Responsable"
                value={entreeSortieForm.responsable}
                onChange={(v) => setEntreeSortieForm({ ...entreeSortieForm, responsable: v })}
                required
              />
              <Select
                label="Type de responsable"
                value={entreeSortieForm.responsableType}
                onChange={(v) => setEntreeSortieForm({ ...entreeSortieForm, responsableType: v })}
                options={[
                  { value: "enseignant", label: "Enseignant" },
                  { value: "etudiant", label: "Étudiant" },
                  { value: "personnel", label: "Personnel administratif" },
                ]}
              />
              <Input
                label="Date et heure"
                type="datetime-local"
                value={entreeSortieForm.date}
                onChange={(v) => setEntreeSortieForm({ ...entreeSortieForm, date: v })}
                required
              />
              <Textarea
                label="Observations avant (état du matériel)"
                value={entreeSortieForm.observationsAvant}
                onChange={(v) => setEntreeSortieForm({ ...entreeSortieForm, observationsAvant: v })}
              />
              {entreeSortieForm.type === "sortie" && (
                <Textarea
                  label="Observations après (problèmes constatés)"
                  value={entreeSortieForm.observationsApres}
                  onChange={(v) => setEntreeSortieForm({ ...entreeSortieForm, observationsApres: v })}
                />
              )}
            </div>
            <div style={mx.footer}>
              <button style={sx.btnGhost} onClick={() => setShowEntreeSortieModal(false)}>
                Annuler
              </button>
              <button style={sx.btnPrimary} onClick={handleEntreeSortie}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistorique && (
        <div style={sx.overlay} onMouseDown={() => setShowHistorique(false)}>
          <div style={{ ...mx.box, width: "min(900px, 96vw)" }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={mx.header}>
              <div style={mx.title}>Historique des entrées/sorties - {selectedLieu?.nom}</div>
              <button style={mx.close} onClick={() => setShowHistorique(false)}>
                <X size={15} />
              </button>
            </div>
            <div style={mx.body}>
              {historiqueEntrees.length === 0 ? (
                <div style={sx.hint}>Aucun enregistrement.</div>
              ) : (
                <>
                  <button style={{ ...sx.btnSecondary, marginBottom: 16 }} onClick={imprimerFiche}>
                    <Printer size={13} /> Imprimer la fiche
                  </button>
                  <table style={tabStyles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Responsable</th>
                        <th>Observations avant</th>
                        <th>Observations après</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historiqueEntrees.map((e) => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleString()}</td>
                          <td>{e.type === "entree" ? "Entrée" : "Sortie"}</td>
                          <td>
                            {e.responsable} ({e.responsableType})
                          </td>
                          <td>{e.observationsAvant || "—"}</td>
                          <td>{e.observationsApres || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div style={mx.footer}>
              <button style={sx.btnGhost} onClick={() => setShowHistorique(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ONGLET ÉQUIPEMENTS ==========
function EquipementsTab({ equipements, onAdd, onEdit, onDelete }) {
  return (
    <div style={tabStyles.container}>
      <div style={tabStyles.header}>
        <span style={tabStyles.count}>{equipements.length} équipement(s)</span>
        <button style={sx.btnPrimary} onClick={onAdd}>
          <Plus size={13} /> Ajouter
        </button>
      </div>
      {equipements.length === 0 ? (
        <div style={sx.emptyMini}>
          <Package size={32} strokeWidth={1} color="var(--ip-gray)" />
          <div>Aucun équipement dans ce lieu.</div>
          <button style={sx.btnSecondary} onClick={onAdd}>
            Ajouter un équipement
          </button>
        </div>
      ) : (
        <div style={tabStyles.grid}>
          {equipements.map((eq) => {
            const IconComp = equipIconMap[eq.type] || Package;
            const etatInfo = etatStyle[eq.etat] || etatStyle.fonctionnel;
            const EtatIcon = etatInfo.icon;
            return (
              <div key={eq.id} style={tabStyles.card}>
                <div style={tabStyles.cardIcon}>
                  <IconComp size={24} strokeWidth={1.5} />
                </div>
                <div style={tabStyles.cardContent}>
                  <div style={tabStyles.cardTitle}>{eq.reference || "Sans réf"}</div>
                  <div style={tabStyles.cardMeta}>
                    <span style={tabStyles.typeBadge}>{eq.type}</span>
                    <span style={{ ...tabStyles.etatBadge, background: etatInfo.bg, color: etatInfo.color }}>
                      <EtatIcon size={10} /> {etatInfo.label}
                    </span>
                  </div>
                  {eq.date_achat && (
                    <div style={tabStyles.cardDate}>Achat: {new Date(eq.date_achat).toLocaleDateString()}</div>
                  )}
                </div>
                <div style={tabStyles.cardActions}>
                  <IconBtn onClick={() => onEdit(eq)}>
                    <Edit3 size={13} />
                  </IconBtn>
                  <IconBtn warn onClick={() => onDelete(eq.id)}>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== ONGLET POSTES AVEC VUE DÉTAILLÉE ==========
function PostesTab({ postes, onAdd, onEdit, onDelete }) {
  const [selectedPoste, setSelectedPoste] = useState(null);
  const [posteDetails, setPosteDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [editForm, setEditForm] = useState({ etatQualitatif: "", remarque: "" });
  const [retirerForm, setRetirerForm] = useState({ localisation: "magasin", raisonRetrait: "" });
  const [addingComp, setAddingComp] = useState(false);
  const [newCompForm, setNewCompForm] = useState({ equipement_id: "", etatQualitatif: "bon", remarque: "" });
  const [equipementsDisponibles, setEquipementsDisponibles] = useState([]);

  // Charger les équipements disponibles pour ajout (non affectés à un poste)
  useEffect(() => {
    apiFetch("/materiel/equipements").then(data => {
      // Filtrer ceux qui ne sont pas déjà dans un poste actif (ou selon besoin)
      setEquipementsDisponibles(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, []);

  const loadPosteDetails = async (posteId) => {
    setLoading(true);
    try {
      const [composition, etatComplet] = await Promise.all([
        apiFetch(`/materiel/poste/${posteId}/composition`),
        apiFetch(`/materiel/poste/${posteId}/etat-complet`)
      ]);
      setPosteDetails({ composition, ...etatComplet });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (poste) => {
    setSelectedPoste(poste);
    await loadPosteDetails(poste.id);
    setShowDetailModal(true);
  };

  const handleUpdateComposition = async (compId) => {
    if (!editForm.etatQualitatif) return;
    try {
      await apiFetch(`/materiel/poste/${selectedPoste.id}/composition/${compId}`, {
        method: "PUT",
        body: JSON.stringify({ etatQualitatif: editForm.etatQualitatif, remarque: editForm.remarque })
      });
      await loadPosteDetails(selectedPoste.id);
      setEditingComp(null);
      setEditForm({ etatQualitatif: "", remarque: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRetirerComposant = async (compId) => {
    if (!retirerForm.localisation) return;
    try {
      await apiFetch(`/materiel/poste/${selectedPoste.id}/composition/${compId}/retirer`, {
        method: "POST",
        body: JSON.stringify({ localisation: retirerForm.localisation, raisonRetrait: retirerForm.raisonRetrait })
      });
      await loadPosteDetails(selectedPoste.id);
      setRetirerForm({ localisation: "magasin", raisonRetrait: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAjouterComposant = async () => {
    if (!newCompForm.equipement_id) return;
    try {
      await apiFetch(`/materiel/poste/${selectedPoste.id}/composition`, {
        method: "POST",
        body: JSON.stringify({
          equipement_id: newCompForm.equipement_id,
          etatQualitatif: newCompForm.etatQualitatif,
          remarque: newCompForm.remarque
        })
      });
      await loadPosteDetails(selectedPoste.id);
      setAddingComp(false);
      setNewCompForm({ equipement_id: "", etatQualitatif: "bon", remarque: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={tabStyles.container}>
      <div style={tabStyles.header}>
        <span style={tabStyles.count}>{postes.length} poste(s)</span>
        <button style={sx.btnPrimary} onClick={onAdd}><Plus size={13} /> Ajouter un poste</button>
      </div>
      {postes.length === 0 ? (
        <div style={sx.emptyMini}>
          <Monitor size={32} strokeWidth={1} color="var(--ip-gray)" />
          <div>Aucun poste dans cette salle.</div>
          <button style={sx.btnSecondary} onClick={onAdd}>Créer un poste</button>
        </div>
      ) : (
        <div style={tabStyles.list}>
          {postes.map(poste => (
            <div key={poste.id} style={tabStyles.listItem}>
              <div style={tabStyles.itemMain}>
                <div style={tabStyles.itemIcon}><Monitor size={18} /></div>
                <div style={tabStyles.itemInfo}>
                  <div style={tabStyles.itemTitle}>Poste {poste.nom}</div>
                  <div style={tabStyles.itemMeta}>ID: {poste.id.slice(0, 8)}</div>
                </div>
                <div style={tabStyles.itemActions}>
                  <button style={sx.btnSecondary} onClick={() => handleOpenDetail(poste)}>
                    <Eye size={13} /> Détail & état
                  </button>
                  <IconBtn onClick={() => onEdit(poste)}><Edit3 size={13} /></IconBtn>
                  <IconBtn warn onClick={() => onDelete(poste.id)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détaillée */}
      {showDetailModal && selectedPoste && posteDetails && (
        <div style={sx.overlay} onMouseDown={() => setShowDetailModal(false)}>
          <div style={{ ...mx.box, width: "min(900px, 96vw)" }} onMouseDown={e => e.stopPropagation()}>
            <div style={mx.header}>
              <div style={mx.title}>Poste {selectedPoste.nom}</div>
              <button style={mx.close} onClick={() => setShowDetailModal(false)}><X size={15} /></button>
            </div>
            <div style={mx.body}>
              {loading ? (
                <div>Chargement...</div>
              ) : (
                <>
                  {/* Statut global */}
                  <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: posteDetails.complet ? "#E8F5E9" : "#FFEBEE", color: posteDetails.complet ? "#2E7D32" : "#C62828" }}>
                    <strong>{posteDetails.complet ? "✅ Poste complet" : "❌ Poste incomplet"}</strong>
                    {!posteDetails.complet && <div style={{ marginTop: 4, fontSize: "0.8rem" }}>Raisons : {posteDetails.raisons?.join(", ")}</div>}
                  </div>

                  {/* Liste des composants */}
                  <h4>Composants actuellement dans le poste</h4>
                  <table style={tabStyles.table}>
                    <thead><tr><th>Type</th><th>Référence</th><th>État qualitatif</th><th>Remarque</th><th>Actions</th></tr></thead>
                    <tbody>
                      {posteDetails.composants?.map(comp => (
                        <tr key={comp.id}>
                          <td>{comp.equipement?.type || "?"}</td>
                          <td>{comp.equipement?.reference || comp.equipement_id}</td>
                          <td>
                            {editingComp === comp.id ? (
                              <select value={editForm.etatQualitatif} onChange={e => setEditForm({...editForm, etatQualitatif: e.target.value})}>
                                <option value="bon">Bon état</option>
                                <option value="usé">Usé</option>
                                <option value="sale">Sale</option>
                                <option value="défectueux">Défectueux</option>
                                <option value="à remplacer">À remplacer</option>
                              </select>
                            ) : (
                              <span style={{ fontWeight: 700, color: comp.etatQualitatif === "bon" ? "green" : comp.etatQualitatif === "sale" ? "orange" : "red" }}>
                                {comp.etatQualitatif}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingComp === comp.id ? (
                              <input type="text" value={editForm.remarque} onChange={e => setEditForm({...editForm, remarque: e.target.value})} style={sx.input} />
                            ) : (comp.remarque || "—")}
                          </td>
                          <td>
                            {editingComp === comp.id ? (
                              <>
                                <button style={sx.btnGhost} onClick={() => handleUpdateComposition(comp.id)}>Enregistrer</button>
                                <button style={sx.btnGhost} onClick={() => setEditingComp(null)}>Annuler</button>
                              </>
                            ) : (
                              <>
                                <button style={sx.iconBtn} onClick={() => { setEditingComp(comp.id); setEditForm({ etatQualitatif: comp.etatQualitatif, remarque: comp.remarque || "" }); }}>
                                  <Edit3 size={13} />
                                </button>
                                <button style={{...sx.iconBtn, color: "var(--ip-orange)"}} onClick={() => {
                                  if (window.confirm("Retirer ce composant du poste ?")) handleRetirerComposant(comp.id);
                                }}>
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Formulaire pour ajouter un composant */}
                  <div style={{ marginTop: 20 }}>
                    <button style={sx.btnSecondary} onClick={() => setAddingComp(!addingComp)}>
                      <Plus size={13} /> Ajouter un composant
                    </button>
                    {addingComp && (
                      <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
                        <select value={newCompForm.equipement_id} onChange={e => setNewCompForm({...newCompForm, equipement_id: e.target.value})} style={sx.input}>
                          <option value="">-- Choisir un équipement --</option>
                          {equipementsDisponibles.filter(eq => eq.currentLocation !== "lieu" || !eq.currentLocationId).map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.reference} ({eq.type})</option>
                          ))}
                        </select>
                        <select value={newCompForm.etatQualitatif} onChange={e => setNewCompForm({...newCompForm, etatQualitatif: e.target.value})} style={sx.input}>
                          <option value="bon">Bon état</option>
                          <option value="usé">Usé</option>
                          <option value="sale">Sale</option>
                          <option value="défectueux">Défectueux</option>
                          <option value="à remplacer">À remplacer</option>
                        </select>
                        <input type="text" placeholder="Remarque" value={newCompForm.remarque} onChange={e => setNewCompForm({...newCompForm, remarque: e.target.value})} style={sx.input} />
                        <button style={sx.btnPrimary} onClick={handleAjouterComposant}>Ajouter</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={mx.footer}>
              <button style={sx.btnGhost} onClick={() => setShowDetailModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ONGLET PROJECTEURS ==========
function ProjecteursTab({ projecteurs, utilisations, onAdd, onEdit, onDelete, onAddUtilisation }) {
  const [expandedProj, setExpandedProj] = useState(null);
  return (
    <div style={tabStyles.container}>
      <div style={tabStyles.header}>
        <span style={tabStyles.count}>{projecteurs.length} projecteur(s)</span>
        <button style={sx.btnPrimary} onClick={onAdd}>
          <Plus size={13} /> Ajouter
        </button>
      </div>
      {projecteurs.length === 0 ? (
        <div style={sx.emptyMini}>
          <Projector size={32} strokeWidth={1} color="var(--ip-gray)" />
          <div>Aucun projecteur dans ce lieu.</div>
          <button style={sx.btnSecondary} onClick={onAdd}>
            Ajouter un projecteur
          </button>
        </div>
      ) : (
        <div style={tabStyles.list}>
          {projecteurs.map((proj) => {
            const utilisationsProj = utilisations.filter((u) => u.projecteur_id === proj.id);
            const etatInfo = etatStyle[proj.etat] || etatStyle.fonctionnel;
            const EtatIcon = etatInfo.icon;
            return (
              <div key={proj.id} style={tabStyles.listItem}>
                <div style={tabStyles.itemMain}>
                  <div style={tabStyles.itemIcon}>
                    <Projector size={18} />
                  </div>
                  <div style={tabStyles.itemInfo}>
                    <div style={tabStyles.itemTitle}>
                      {proj.marque} {proj.modele}
                    </div>
                    <div style={tabStyles.itemMeta}>
                      S/N: {proj.numero_serie || "N/A"} ·
                      <span
                        style={{
                          ...tabStyles.etatBadge,
                          background: etatInfo.bg,
                          color: etatInfo.color,
                          marginLeft: 6,
                        }}
                      >
                        <EtatIcon size={10} /> {etatInfo.label}
                      </span>
                    </div>
                    {proj.derniere_maintenance && (
                      <div style={tabStyles.cardDate}>
                        Dernière maintenance: {new Date(proj.derniere_maintenance).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={tabStyles.itemActions}>
                    <button
                      style={sx.btnGhost}
                      onClick={() => setExpandedProj(expandedProj === proj.id ? null : proj.id)}
                    >
                      <Calendar size={13} /> Utilisations ({utilisationsProj.length})
                    </button>
                    <button style={sx.btnSecondary} onClick={() => onAddUtilisation(proj.id)}>
                      <Plus size={13} /> Enreg. utilisation
                    </button>
                    <IconBtn onClick={() => onEdit(proj)}>
                      <Edit3 size={13} />
                    </IconBtn>
                    <IconBtn warn onClick={() => onDelete(proj.id)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>
                {expandedProj === proj.id && (
                  <div style={tabStyles.subPanel}>
                    {utilisationsProj.length === 0 ? (
                      <div style={sx.hint}>Aucune utilisation enregistrée pour ce projecteur.</div>
                    ) : (
                      <table style={tabStyles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Salle</th>
                            <th>Utilisateur</th>
                            <th>Durée</th>
                            <th>Remarques</th>
                          </tr>
                        </thead>
                        <tbody>
                          {utilisationsProj.map((u) => (
                            <tr key={u.id}>
                              <td>{new Date(u.date_utilisation).toLocaleString()}</td>
                              <td>{u.lieu_nom || u.lieu_id}</td>
                              <td>{u.utilisateur_nom || u.utilisateur_id || "—"}</td>
                              <td>{u.duree_minutes} min</td>
                              <td>{u.remarques || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== MODAL GÉNÉRIQUE ==========
function Modal({ type, data, editItem, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editItem ? "PUT" : "POST";
      const url = `/materiel/${type}${editItem ? `/${editItem.id}` : ""}`;
      await apiFetch(url, { method, body: JSON.stringify(form) });
      onSaved();
    } catch (err) {
      showToast("err", err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    const prefix = editItem ? "Modifier" : "Ajouter";
    if (type === "lieu") return `${prefix} un lieu`;
    if (type === "equipement") return `${prefix} un équipement`;
    if (type === "poste") return `${prefix} un poste de travail`;
    if (type === "projecteur") return `${prefix} un projecteur`;
    if (type === "utilisation") return "Enregistrer une utilisation";
    return "Formulaire";
  };

  return (
    <div style={sx.overlay} onMouseDown={onClose}>
      <div style={mx.box} onMouseDown={(e) => e.stopPropagation()}>
        <div style={mx.header}>
          <div style={mx.title}>{getTitle()}</div>
          <button style={mx.close} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={mx.body}>
          {type === "lieu" && (
            <>
              <Input label="Nom *" value={form.nom || ""} onChange={(v) => setForm({ ...form, nom: v })} required />
              <Select
                label="Type *"
                value={form.type || ""}
                onChange={(v) => setForm({ ...form, type: v })}
                options={[
                  { value: LIEU_TYPES.SALLE_INFO, label: "🏫 Salle informatique" },
                  { value: LIEU_TYPES.SALLE_COURS, label: "📖 Salle de cours" },
                  { value: LIEU_TYPES.BUREAU, label: "💼 Bureau" },
                ]}
                required
              />
              <Input
                label="Capacité (places)"
                type="number"
                value={form.capacite || ""}
                onChange={(v) => setForm({ ...form, capacite: v })}
              />
              <Input
                label="Occupant (pour bureau)"
                value={form.occupant || ""}
                onChange={(v) => setForm({ ...form, occupant: v })}
              />
            </>
          )}
          {type === "equipement" && (
            <>
              <Select
                label="Type *"
                value={form.type || ""}
                onChange={(v) => setForm({ ...form, type: v })}
                options={[
                  { value: EQUIPEMENT_TYPES.POSTE_COMPOSANT, label: "🖥️ Composant de poste" },
                  { value: EQUIPEMENT_TYPES.PROJECTEUR, label: "📽️ Projecteur" },
                  { value: EQUIPEMENT_TYPES.RALLONGE, label: "🔌 Rallonge" },
                  { value: EQUIPEMENT_TYPES.SUPPORT_PROJECTION, label: "📎 Support de projection" },
                  { value: EQUIPEMENT_TYPES.REGULATEUR, label: "⚡ Régulateur de tension" },
                  { value: EQUIPEMENT_TYPES.AUTRE, label: "📦 Autre" },
                ]}
                required
              />
              <Input
                label="Référence / modèle *"
                value={form.reference || ""}
                onChange={(v) => setForm({ ...form, reference: v })}
                required
              />
              <Select
                label="État"
                value={form.etat || "fonctionnel"}
                onChange={(v) => setForm({ ...form, etat: v })}
                options={[
                  { value: "fonctionnel", label: "✅ Fonctionnel" },
                  { value: "panne", label: "⚠️ En panne" },
                  { value: "maintenance", label: "🔧 En maintenance" },
                ]}
              />
              <Input
                label="Date d'achat"
                type="date"
                value={form.date_achat || ""}
                onChange={(v) => setForm({ ...form, date_achat: v })}
              />
              <Input
                label="Garantie (fin)"
                type="date"
                value={form.garantie_fin || ""}
                onChange={(v) => setForm({ ...form, garantie_fin: v })}
              />
            </>
          )}
          {type === "poste" && (
            <>
              <Input
                label="Nom du poste *"
                value={form.nom || ""}
                onChange={(v) => setForm({ ...form, nom: v })}
                required
              />
            </>
          )}
          {type === "projecteur" && (
            <>
              <Input
                label="Marque *"
                value={form.marque || ""}
                onChange={(v) => setForm({ ...form, marque: v })}
                required
              />
              <Input
                label="Modèle *"
                value={form.modele || ""}
                onChange={(v) => setForm({ ...form, modele: v })}
                required
              />
              <Input
                label="Numéro de série"
                value={form.numero_serie || ""}
                onChange={(v) => setForm({ ...form, numero_serie: v })}
              />
              <Select
                label="État"
                value={form.etat || "fonctionnel"}
                onChange={(v) => setForm({ ...form, etat: v })}
                options={[
                  { value: "fonctionnel", label: "✅ Fonctionnel" },
                  { value: "panne", label: "⚠️ En panne" },
                  { value: "maintenance", label: "🔧 En maintenance" },
                ]}
              />
              <Input
                label="Date d'installation"
                type="date"
                value={form.date_installation || ""}
                onChange={(v) => setForm({ ...form, date_installation: v })}
              />
              <Input
                label="Dernière maintenance"
                type="date"
                value={form.derniere_maintenance || ""}
                onChange={(v) => setForm({ ...form, derniere_maintenance: v })}
              />
            </>
          )}
          {type === "utilisation" && (
            <>
              <Input
                label="Date et heure *"
                type="datetime-local"
                value={form.date_utilisation || ""}
                onChange={(v) => setForm({ ...form, date_utilisation: v })}
                required
              />
              <Input
                label="Durée (minutes)"
                type="number"
                value={form.duree_minutes || ""}
                onChange={(v) => setForm({ ...form, duree_minutes: v })}
              />
              <Input
                label="Enseignant / utilisateur"
                value={form.utilisateur_nom || ""}
                onChange={(v) => setForm({ ...form, utilisateur_nom: v })}
              />
              <Textarea
                label="Remarques"
                value={form.remarques || ""}
                onChange={(v) => setForm({ ...form, remarques: v })}
              />
            </>
          )}
          <div style={mx.footer}>
            <button type="button" style={sx.btnGhost} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" style={sx.btnPrimary} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== COMPOSANTS UTILITAIRES ==========
function Input({ label, type = "text", value, onChange, required, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <label style={{ fontSize: "0.71rem", fontWeight: 800, color: "var(--ip-gray)" }}>
        {label}
        {required && " *"}
      </label>
      <input
        type={type}
        style={sx.input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <label style={{ fontSize: "0.71rem", fontWeight: 800, color: "var(--ip-gray)" }}>
        {label}
        {required && " *"}
      </label>
      <select style={sx.input} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">-- Sélectionner --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <label style={{ fontSize: "0.71rem", fontWeight: 800, color: "var(--ip-gray)" }}>{label}</label>
      <textarea
        style={{ ...sx.input, minHeight: 70 }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TabBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...sx.viewTab, ...(active ? sx.viewTabOn : {}) }}>
      {children}
    </button>
  );
}

function IconBtn({ children, warn, onClick }) {
  return (
    <button onClick={onClick} style={{ ...sx.iconBtn, ...(warn ? sx.iconBtnWarn : {}) }}>
      {children}
    </button>
  );
}

// ========== STYLES ==========
const sx = {
  root: { display: "grid", gridTemplateColumns: "minmax(220px,10%) 1fr", height: "100vh", background: "var(--bg-muted)", overflow: "hidden" },
  contentArea: { display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  body: { display: "grid", gridTemplateColumns: "256px 1fr", flex: 1, minHeight: 0, overflow: "hidden" },
  sidebar: { borderRight: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto", display: "flex", flexDirection: "column" },
  sideHeader: { display: "flex", alignItems: "center", gap: 7, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ip-gray)", padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" },
  addSmallBtn: { marginLeft: "auto", background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ip-gray)" },
  typeBlock: { borderBottom: "1px solid var(--border)" },
  typeToggle: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", gap: 6 },
  typeLeft: { display: "flex", alignItems: "center", gap: 6 },
  typeLabel: { fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ip-gray)" },
  typeCount: { fontSize: "0.65rem", fontWeight: 800, color: "var(--ip-gray)", background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border)" },
  lieuBtn: { width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 12px 8px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 2, transition: "background 0.15s" },
  lieuBtnSel: { background: "var(--bg-sidebar-hi)" },
  lieuName: { fontSize: "0.82rem", fontWeight: 700 },
  lieuMeta: { fontSize: "0.68rem", color: "var(--ip-gray)" },
  main: { overflowY: "auto", padding: "1.25rem 1.5rem", background: "var(--bg-muted)" },
  hint: { fontSize: "0.8rem", color: "var(--ip-gray)", fontStyle: "italic", padding: "10px 0" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "3rem 2rem", textAlign: "center", background: "var(--bg)", borderRadius: 20, border: "1px solid var(--border)" },
  emptyIcon: { width: 80, height: 80, borderRadius: "50%", background: "rgba(15,155,114,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: "1.1rem", fontWeight: 800 },
  emptySub: { fontSize: "0.85rem", color: "var(--ip-gray)", maxWidth: 400, lineHeight: 1.6 },
  emptyMini: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "2rem", background: "var(--bg)", borderRadius: 16, border: "1px dashed var(--border)", color: "var(--ip-gray)" },
  classCard: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, var(--bg) 0%, rgba(15,155,114,0.03) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "16px 24px", flexWrap: "wrap", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  classCardLeft: { flex: 1 },
  classCardTitle: { fontSize: "1.2rem", fontWeight: 900, color: "var(--fg)" },
  classCardMeta: { fontSize: "0.8rem", color: "var(--ip-gray)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" },
  tabsRow: { display: "flex", borderBottom: "2px solid var(--border)", gap: 4, marginBottom: 20 },
  viewTab: { display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 20px", borderWidth: 0, borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", background: "transparent", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "var(--ip-gray)", marginBottom: -2, transition: "all 0.2s" },
  viewTabOn: { borderBottomColor: "var(--ip-teal)", color: "var(--ip-teal)", fontWeight: 800 },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 18px", borderRadius: 40, border: "none", background: "var(--ip-teal)", color: "#fff", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 18px", borderRadius: 40, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 40, border: "1px solid var(--border)", background: "transparent", color: "var(--fg)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" },
  input: { width: "100%", height: 36, borderRadius: 10, border: "1px solid var(--border)", padding: "0 12px", fontSize: "0.85rem", background: "var(--bg)", color: "var(--fg)", outline: "none", transition: "border 0.2s" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ip-gray)", transition: "all 0.15s" },
  iconBtnWarn: { borderColor: "rgba(255,130,0,.4)", color: "var(--ip-orange)" },
  toast: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 700, marginBottom: 12, position: "fixed", bottom: 20, right: 20, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  toastOk: { background: "rgba(48,178,165,0.9)", border: "1px solid var(--ip-teal)", color: "#fff" },
  toastErr: { background: "rgba(212,24,61,0.9)", border: "1px solid var(--danger)", color: "#fff" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
};

const mx = {
  box: { width: "min(700px, 96vw)", maxHeight: "88vh", background: "var(--bg)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 24px 12px", borderBottom: "1px solid var(--border)" },
  title: { fontSize: "1rem", fontWeight: 900 },
  close: { border: "1px solid var(--border)", background: "none", width: 32, height: 32, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ip-gray)" },
  body: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  footer: { padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 },
};

const tabStyles = {
  container: { marginTop: 4 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  count: { fontSize: "0.8rem", color: "var(--ip-gray)", fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  card: { display: "flex", alignItems: "flex-start", gap: 14, padding: "16px", border: "1px solid var(--border)", borderRadius: 20, background: "var(--bg)", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  cardIcon: { width: 44, height: 44, borderRadius: 14, background: "rgba(15,155,114,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ip-teal)" },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: 800, fontSize: "0.9rem" },
  cardMeta: { display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" },
  cardDate: { fontSize: "0.7rem", color: "var(--ip-gray)", marginTop: 4 },
  typeBadge: { background: "var(--bg-muted)", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600 },
  etatBadge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600 },
  cardActions: { display: "flex", gap: 6 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  listItem: { border: "1px solid var(--border)", borderRadius: 16, background: "var(--bg)", overflow: "hidden" },
  itemMain: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", flexWrap: "wrap" },
  itemIcon: { width: 36, height: 36, borderRadius: 10, background: "rgba(15,155,114,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ip-teal)" },
  itemInfo: { flex: 1, minWidth: 150 },
  itemTitle: { fontWeight: 800, fontSize: "0.9rem" },
  itemMeta: { fontSize: "0.7rem", color: "var(--ip-gray)", marginTop: 2 },
  itemActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  subPanel: { borderTop: "1px solid var(--border)", padding: "14px 18px", background: "var(--bg-muted)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", th: { textAlign: "left", padding: "8px", borderBottom: "1px solid var(--border)" }, td: { padding: "8px", borderBottom: "1px solid var(--border)" } },
};