// src/pages/MaterielPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Monitor, Package, Plus, ChevronDown, ChevronRight,
  Edit3, Trash2, CheckCircle2, Circle, X, Eye, Calendar, User,
  AlertCircle, Check, Layers, Building2, Clock,
  Printer, ClipboardList, Wrench, Video, Plug, FolderTree, Battery,
  Box, TrendingUp, AlertTriangle, Archive, ArrowRightLeft,
  Search, BarChart3, RefreshCw, MapPin, History, ShieldAlert,
  BookMarked, Boxes, BadgeAlert, CircleCheck, ArrowDownToLine,
  ArrowUpFromLine, Hammer, FileText, ChevronLeft
} from "lucide-react";
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

// ══════════════════════════════════════════════════════════
// CONSTANTES UI
// ══════════════════════════════════════════════════════════
const EQUIPEMENT_TYPES = [
  "ecran", "souris", "clavier", "uc", "onduleur", "nappe",
  "cable_hdmi", "cable_usb", "projecteur", "rallonge",
  "regulateur", "support_projection", "autre",
];

const TYPES_PROBLEMES = [
  "ecran_casse", "ecran_flou", "ecran_noir", "pixels_morts",
  "clavier_touche_hs", "clavier_liquide", "souris_clic_hs",
  "souris_capteur_hs", "usb_hs", "alim_hs", "ventilateur_bruyant",
  "surchauffe", "disque_bruyant", "pas_image", "fils_coupes",
  "connecteur_loose", "autre",
];

const ETAT_STYLE = {
  fonctionnel: { bg: "#E8F5E9", color: "#2E7D32", label: "Fonctionnel", icon: CheckCircle2 },
  panne:       { bg: "#FFEBEE", color: "#C62828", label: "En panne",     icon: AlertCircle },
  maintenance: { bg: "#FFF3E0", color: "#EF6C00", label: "Maintenance",  icon: Wrench },
  obsolete:    { bg: "#F3E5F5", color: "#7B1FA2", label: "Obsolète",     icon: Archive },
  reforme:     { bg: "#ECEFF1", color: "#546E7A", label: "Réformé",      icon: Trash2 },
  donne:       { bg: "#E3F2FD", color: "#1565C0", label: "Donné",        icon: ArrowUpFromLine },
};

const GRAVITE_STYLE = {
  legere:   { bg: "#FFF9C4", color: "#F9A825", label: "Légère" },
  moyenne:  { bg: "#FFE0B2", color: "#E65100", label: "Moyenne" },
  grave:    { bg: "#FFEBEE", color: "#B71C1C", label: "Grave" },
  critique: { bg: "#EDE7F6", color: "#4A148C", label: "Critique" },
};

const LOCALISATION_LABELS = {
  stock:      "📦 En stock",
  lieu:       "📍 Dans un lieu",
  poste:      "🖥️ Dans un poste",
  pret:       "📤 En prêt",
  reparation: "🔧 En réparation",
  reforme:    "🗑️ Réformé",
  donne:      "🎁 Donné",
};

const LIEU_TYPE_LABELS = {
  salle_informatique: { emoji: "🖥️", label: "Salles informatiques" },
  salle_cours:        { emoji: "📚", label: "Salles de cours" },
  bureau:             { emoji: "💼", label: "Bureaux" },
  magasin:            { emoji: "📦", label: "Magasins" },
  reparateur:         { emoji: "🔧", label: "Réparateurs" },
};

// ══════════════════════════════════════════════════════════
// ONGLETS PRINCIPAUX
// ══════════════════════════════════════════════════════════
const MAIN_TABS = [
  { id: "dashboard",   label: "Tableau de bord",  icon: BarChart3 },
  { id: "catalogue",   label: "Catalogue",         icon: BookMarked },
  { id: "stock",       label: "Stock",             icon: Box },
  { id: "lieux",       label: "Lieux & Postes",    icon: Building2 },
  { id: "mouvements",  label: "Mouvements",        icon: ArrowRightLeft },
  { id: "problemes",   label: "Problèmes",         icon: AlertTriangle },
  { id: "prets",       label: "Prêts",             icon: ArrowUpFromLine },
  { id: "reparations", label: "Réparations",       icon: Hammer },
];

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL (sans barres de navigation)
// ══════════════════════════════════════════════════════════
export default function MaterielPage({ academicYear }) {
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [lieux, setLieux]             = useState([]);
  const [catalogue, setCatalogue]     = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [postes, setPostes]           = useState([]);
  const [prets, setPrets]             = useState([]);
  const [reparations, setReparations] = useState([]);
  const [stats, setStats]             = useState(null);
  const [alertes, setAlertes]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState(null);
  const [modal, setModal]             = useState(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lieuxD, catD, equipD, postesD, pretsD, repsD, statsD, alertesD] = await Promise.all([
        apiFetch("/materiel/lieux"),
        apiFetch("/materiel/catalogue"),
        apiFetch("/materiel/equipements"),
        apiFetch("/materiel/postes"),
        apiFetch("/materiel/prets"),
        apiFetch("/materiel/reparations"),
        apiFetch("/materiel/stats/globales"),
        apiFetch("/materiel/stats/alertes-stock"),
      ]);
      setLieux(Array.isArray(lieuxD) ? lieuxD : []);
      setCatalogue(Array.isArray(catD) ? catD : []);
      setEquipements(Array.isArray(equipD) ? equipD : []);
      setPostes(Array.isArray(postesD) ? postesD : []);
      setPrets(Array.isArray(pretsD) ? pretsD : []);
      setReparations(Array.isArray(repsD) ? repsD : []);
      setStats(statsD);
      setAlertes(Array.isArray(alertesD) ? alertesD : []);
    } catch (err) {
      showToast("err", err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (type, editItem = null, extra = {}) =>
    setModal({ type, editItem, data: editItem ? { ...editItem } : { ...extra } });
  const closeModal = () => setModal(null);

  const handleDelete = async (collection, id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      await apiFetch(`/materiel/${collection}/${id}`, { method: "DELETE" });
      await loadData();
      showToast("ok", "Supprimé");
    } catch (err) { showToast("err", err.message); }
  };

  const nbProblemes   = equipements.reduce((a, e) => a + (e.nb_problemes_actifs || 0), 0);
  const nbPretsActifs = prets.filter((p) => !p.date_retour_effectif).length;
  const nbRepsActives = reparations.filter((r) => !r.retour_effectif).length;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion du Matériel</h1>
          <p style={styles.subtitle}>Année académique {academicYear}</p>
        </div>
        <button style={styles.refreshBtn} onClick={loadData} title="Actualiser">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ONGLETS */}
      <div style={styles.tabsBar}>
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const badge =
            tab.id === "problemes"   && nbProblemes   > 0 ? nbProblemes   :
            tab.id === "prets"       && nbPretsActifs > 0 ? nbPretsActifs :
            tab.id === "reparations" && nbRepsActives > 0 ? nbRepsActives :
            tab.id === "stock"       && alertes.length > 0 ? alertes.length : null;
          return (
            <button key={tab.id}
              style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} /> {tab.label}
              {badge && <span style={styles.badge}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {loading && <div style={styles.loadingBar}><div style={styles.loadingFill} /></div>}

      {/* CONTENU */}
      <div style={styles.content}>
        {activeTab === "dashboard" && (
          <DashboardTab stats={stats} alertes={alertes} prets={prets}
            reparations={reparations} onNavigate={setActiveTab} />
        )}
        {activeTab === "catalogue" && (
          <CatalogueTab catalogue={catalogue} equipements={equipements}
            onAdd={() => openModal("catalogue")} onEdit={(i) => openModal("catalogue", i)} />
        )}
        {activeTab === "stock" && (
          <StockTab equipements={equipements} catalogue={catalogue} alertes={alertes}
            onAdd={() => openModal("equipement")} showToast={showToast} onRefresh={loadData} />
        )}
        {activeTab === "lieux" && (
          <LieuxTab lieux={lieux} postes={postes} equipements={equipements}
            onAddLieu={() => openModal("lieu")} onEditLieu={(l) => openModal("lieu", l)}
            onDeleteLieu={(id) => handleDelete("lieu", id)} showToast={showToast} onRefresh={loadData} />
        )}
        {activeTab === "mouvements" && (
          <MouvementsTab equipements={equipements} lieux={lieux}
            showToast={showToast} onRefresh={loadData} />
        )}
        {activeTab === "problemes" && (
          <ProblemesTab equipements={equipements} showToast={showToast} onRefresh={loadData} />
        )}
        {activeTab === "prets" && (
          <PretsTab prets={prets} equipements={equipements} showToast={showToast} onRefresh={loadData} />
        )}
        {activeTab === "reparations" && (
          <ReparationsTab reparations={reparations} equipements={equipements}
            showToast={showToast} onRefresh={loadData} />
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === "ok" ? styles.toastOk : styles.toastErr) }}>
          {toast.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <ModalManager {...modal} catalogue={catalogue} lieux={lieux} equipements={equipements}
          onClose={closeModal}
          onSaved={async () => { await loadData(); closeModal(); showToast("ok", "Enregistré"); }}
          showToast={showToast} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function DashboardTab({ stats, alertes, prets, reparations, onNavigate }) {
  if (!stats) return <Placeholder>Chargement…</Placeholder>;

  const totalPannes = (stats.par_etat?.panne || 0) + (stats.par_etat?.maintenance || 0);
  const tauxDispo   = stats.total_equipements > 0
    ? Math.round(((stats.par_etat?.fonctionnel || 0) / stats.total_equipements) * 100) : 0;
  const pretsActifs = prets.filter((p) => !p.date_retour_effectif).length;
  const repsActives = reparations.filter((r) => !r.retour_effectif).length;

  return (
    <div style={styles.dashboard}>
      <div style={styles.kpiGrid}>
        <KpiCard title="Total équipements"    value={stats.total_equipements} icon={Package}         color="var(--ip-teal)" />
        <KpiCard title="Taux disponibilité"   value={`${tauxDispo}%`}         icon={CheckCircle2}    color="#2E7D32" />
        <KpiCard title="Pannes / Maintenance" value={totalPannes}              icon={AlertTriangle}   color="#C62828" />
        <KpiCard title="Problèmes actifs"     value={stats.problemes_actifs || 0} icon={ShieldAlert} color="#E65100" />
        <KpiCard title="Prêts en cours"       value={pretsActifs}              icon={ArrowUpFromLine} color="#1565C0" />
        <KpiCard title="Réparations en cours" value={repsActives}              icon={Hammer}          color="#7B1FA2" />
      </div>

      {alertes.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}><AlertTriangle size={16} /> Alertes stock ({alertes.length})</h3>
            <button style={styles.linkBtn} onClick={() => onNavigate("stock")}>Voir le stock →</button>
          </div>
          <div style={styles.alertesList}>
            {alertes.map((a) => (
              <div key={a.catalogue_id}
                style={{ ...styles.alerteCard, borderLeftColor: a.gravite === "critique" ? "#C62828" : "#FF9800" }}>
                <div style={styles.alerteTitle}>{a.designation} <span style={styles.alerteRef}>({a.reference})</span></div>
                <div style={styles.alerteMeta}>
                  Disponible : <strong>{a.stock_disponible}</strong> / Minimum : {a.stock_minimum}
                  {a.manque > 0 && <span style={{ color: "#C62828", fontWeight: 700 }}> — Manque : {a.manque}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h4 style={styles.statCardTitle}>Répartition par état</h4>
          <div style={styles.statBars}>
            {Object.entries(stats.par_etat || {}).map(([etat, count]) => {
              const info = ETAT_STYLE[etat];
              return (
                <div key={etat} style={styles.statBar}>
                  <span style={styles.statBarLabel}>{info?.label || etat}</span>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${stats.total_equipements ? (count / stats.total_equipements * 100) : 0}%`, background: info?.color || "#999" }} />
                  </div>
                  <span style={styles.statBarVal}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.statCard}>
          <h4 style={styles.statCardTitle}>Répartition par localisation</h4>
          <div style={styles.statBars}>
            {Object.entries(stats.par_localisation || {}).map(([loc, count]) => (
              <div key={loc} style={styles.statBar}>
                <span style={styles.statBarLabel}>{LOCALISATION_LABELS[loc]?.replace(/^.{2}/, "").trim() || loc}</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${stats.total_equipements ? (count / stats.total_equipements * 100) : 0}%`, background: "var(--ip-teal)" }} />
                </div>
                <span style={styles.statBarVal}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CATALOGUE
// ══════════════════════════════════════════════════════════
function CatalogueTab({ catalogue, equipements, onAdd, onEdit }) {
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("tous");

  const filtered = catalogue.filter((c) => {
    const m = !search ||
      c.reference?.toLowerCase().includes(search.toLowerCase()) ||
      c.designation?.toLowerCase().includes(search.toLowerCase()) ||
      c.type?.toLowerCase().includes(search.toLowerCase());
    return m && (filterType === "tous" || c.type === filterType);
  });

  return (
    <div>
      <div style={styles.tabHeader}>
        <div style={styles.filters}>
          <SearchBox value={search} onChange={setSearch} placeholder="Référence, désignation, type…" />
          <select style={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="tous">Tous les types</option>
            {EQUIPEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={styles.countPill}>{filtered.length} article(s)</span>
        </div>
        <Btn primary onClick={onAdd}><Plus size={14} /> Nouvelle référence</Btn>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={<BookMarked size={40} />} title="Catalogue vide" sub="Ajoutez des modèles d'équipements." />
        : (
          <div style={styles.catGrid}>
            {filtered.map((item) => {
              const stockDispo = item.stock?.disponible || 0;
              const alerte     = stockDispo < (item.quantite_minimale || 0);
              return (
                <div key={item.id} style={{ ...styles.catCard, ...(alerte ? styles.catCardAlerte : {}) }}>
                  <div style={styles.catCardTop}>
                    <span style={styles.catType}>{item.type}</span>
                    <button style={styles.iconBtn} onClick={() => onEdit(item)}><Edit3 size={13} /></button>
                  </div>
                  {item.fabricant && <div style={styles.catBrand}>{item.fabricant}</div>}
                  <div style={styles.catName}>{item.designation}</div>
                  <div style={styles.catRef}>Réf : {item.reference}</div>
                  {item.modele    && <div style={styles.catMeta}>Modèle : {item.modele}</div>}
                  {item.prix_achat && <div style={styles.catPrix}>{Number(item.prix_achat).toLocaleString()} FCFA</div>}
                  <div style={styles.catStockRow}>
                    <StockCell label="Stock"  val={stockDispo}            alert={alerte} />
                    <StockCell label="Utilisé" val={item.stock?.utilise || 0} />
                    <StockCell label="Total"   val={item.stock?.total || 0} />
                  </div>
                  {alerte && <div style={styles.catAlertBanner}>⚠️ Stock bas — min : {item.quantite_minimale}</div>}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function StockCell({ label, val, alert }) {
  return (
    <div style={styles.catStockCell}>
      <span style={styles.catStockLabel}>{label}</span>
      <span style={{ ...styles.catStockVal, ...(alert ? { color: "#C62828" } : {}) }}>{val}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STOCK
// ══════════════════════════════════════════════════════════
function StockTab({ equipements, alertes, onAdd, showToast, onRefresh }) {
  const [filterLoc,  setFilterLoc]  = useState("all");
  const [filterEtat, setFilterEtat] = useState("all");
  const [search, setSearch]         = useState("");
  const [detail, setDetail]         = useState(null);

  const filtered = equipements.filter((eq) => {
    if (filterLoc  !== "all" && eq.localisation?.type !== filterLoc)  return false;
    if (filterEtat !== "all" && eq.etat              !== filterEtat)  return false;
    if (search && !eq.designation?.toLowerCase().includes(search.toLowerCase()) &&
        !eq.reference_catalogue?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {alertes.length > 0 && (
        <div style={styles.alerteBandeau}>
          <AlertTriangle size={13} />
          {alertes.length} référence(s) en dessous du stock minimum
        </div>
      )}
      <div style={styles.tabHeader}>
        <div style={styles.filters}>
          <SearchBox value={search} onChange={setSearch} placeholder="Désignation, référence…" />
          <select style={styles.select} value={filterLoc} onChange={(e) => setFilterLoc(e.target.value)}>
            <option value="all">Toutes localisations</option>
            {Object.entries(LOCALISATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select style={styles.select} value={filterEtat} onChange={(e) => setFilterEtat(e.target.value)}>
            <option value="all">Tous états</option>
            {Object.entries(ETAT_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span style={styles.countPill}>{filtered.length} ligne(s)</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn secondary onClick={onRefresh}><RefreshCw size={13} /></Btn>
          <Btn primary onClick={onAdd}><Plus size={14} /> Entrée stock</Btn>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Référence","Désignation","Type","Qté","État","Localisation","Problèmes",""].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--ip-gray)" }}>Aucun résultat</td></tr>
              : filtered.map((eq) => {
                const etatInfo = ETAT_STYLE[eq.etat] || ETAT_STYLE.fonctionnel;
                const EtatIcon = etatInfo.icon;
                return (
                  <tr key={eq.id} style={styles.tr}>
                    <td style={styles.td}><span style={styles.refTag}>{eq.reference_catalogue}</span></td>
                    <td style={styles.td}>{eq.designation}</td>
                    <td style={styles.td}><span style={styles.typePill}>{eq.type}</span></td>
                    <td style={{ ...styles.td, fontWeight: 700, textAlign: "center" }}>{eq.quantite || 1}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.etatBadge, background: etatInfo.bg, color: etatInfo.color }}>
                        <EtatIcon size={11} /> {etatInfo.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {LOCALISATION_LABELS[eq.localisation?.type] || eq.localisation?.type || "—"}
                      {eq.localisation?.nom_lieu && <span style={styles.locDetail}> · {eq.localisation.nom_lieu}</span>}
                    </td>
                    <td style={styles.td}>
                      {eq.nb_problemes_actifs > 0
                        ? <span style={styles.problemeBadge}><AlertTriangle size={10} /> {eq.nb_problemes_actifs}</span>
                        : <span style={{ color: "#2E7D32", fontSize: "0.75rem" }}>✓</span>}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.iconBtn} onClick={() => setDetail(eq)} title="Détails"><Eye size={14} /></button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {detail && (
        <EquipementDetail equip={detail} onClose={() => setDetail(null)} showToast={showToast} onRefresh={onRefresh} />
      )}
    </div>
  );
}

// Détail équipement avec historique des problèmes
function EquipementDetail({ equip, onClose, showToast, onRefresh }) {
  const [problemes, setProblemes] = useState([]);
  const [loadingP, setLoadingP]   = useState(true);

  useEffect(() => {
    apiFetch(`/materiel/problemes/${equip.id}`)
      .then((d) => setProblemes(Array.isArray(d) ? d : []))
      .catch(() => setProblemes([]))
      .finally(() => setLoadingP(false));
  }, [equip.id]);

  const handleResoudre = async (pbId) => {
    const resolution = window.prompt("Notes de résolution ?", "Réparé");
    if (resolution === null) return;
    try {
      await apiFetch(`/materiel/probleme/${pbId}/resoudre`, {
        method: "PUT",
        body: JSON.stringify({ resolution, resolu_par: "Technicien", nouvel_etat: "fonctionnel" }),
      });
      showToast("ok", "Problème résolu");
      const updated = await apiFetch(`/materiel/problemes/${equip.id}`);
      setProblemes(Array.isArray(updated) ? updated : []);
      onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const etatInfo = ETAT_STYLE[equip.etat] || ETAT_STYLE.fonctionnel;

  return (
    <Overlay onClose={onClose}>
      <ModalBox title={`Détail — ${equip.designation}`} onClose={onClose} wide>
        <div style={styles.detailGrid}>
          <DetailRow label="Référence"   val={equip.reference_catalogue} />
          <DetailRow label="Type"        val={equip.type} />
          <DetailRow label="Quantité"    val={equip.quantite || 1} />
          <DetailRow label="Date achat"  val={equip.date_achat ? new Date(equip.date_achat).toLocaleDateString() : "—"} />
          <DetailRow label="Fournisseur" val={equip.fournisseur || "—"} />
          <DetailRow label="Prix achat"  val={equip.prix_achat ? `${Number(equip.prix_achat).toLocaleString()} FCFA` : "—"} />
          <DetailRow label="État" val={
            <span style={{ ...styles.etatBadge, background: etatInfo.bg, color: etatInfo.color }}>{etatInfo.label}</span>
          } />
          <DetailRow label="Localisation" val={LOCALISATION_LABELS[equip.localisation?.type] || "—"} />
          {equip.localisation?.nom_lieu && <DetailRow label="Lieu" val={equip.localisation.nom_lieu} />}
          {equip.observations && <DetailRow label="Observations" val={equip.observations} />}
        </div>

        <h4 style={styles.detailSection}>Historique des problèmes</h4>
        {loadingP ? <p style={styles.hint}>Chargement…</p> : problemes.length === 0
          ? <p style={{ ...styles.hint, color: "#2E7D32" }}>✓ Aucun problème enregistré</p>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {problemes.map((pb) => {
                const grav = GRAVITE_STYLE[pb.gravite] || GRAVITE_STYLE.moyenne;
                return (
                  <div key={pb.id} style={{ ...styles.pbItem, ...(pb.resolu ? styles.pbResolu : {}) }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>{pb.type_probleme?.replace(/_/g, " ")}</span>
                      <span style={{ ...styles.etatBadge, background: grav.bg, color: grav.color }}>{grav.label}</span>
                      {pb.resolu
                        ? <span style={{ ...styles.etatBadge, background: "#E8F5E9", color: "#2E7D32" }}>✓ Résolu</span>
                        : <span style={{ ...styles.etatBadge, background: "#FFEBEE", color: "#C62828" }}>Actif</span>}
                    </div>
                    {pb.description && <div style={styles.pbDesc}>{pb.description}</div>}
                    <div style={styles.pbMeta}>
                      Signalé par {pb.signale_par} le {new Date(pb.date_signalement).toLocaleDateString()}
                      {pb.resolu && pb.date_resolution && ` · Résolu le ${new Date(pb.date_resolution).toLocaleDateString()}`}
                    </div>
                    {pb.resolution && <div style={{ fontSize: "0.75rem", color: "#2E7D32" }}>→ {pb.resolution}</div>}
                    {!pb.resolu && (
                      <Btn secondary onClick={() => handleResoudre(pb.id)} style={{ marginTop: 4 }}>
                        <Check size={13} /> Marquer résolu
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        <div style={styles.modalFooter}><Btn ghost onClick={onClose}>Fermer</Btn></div>
      </ModalBox>
    </Overlay>
  );
}

// ══════════════════════════════════════════════════════════
// LIEUX & POSTES
// ══════════════════════════════════════════════════════════
function LieuxTab({ lieux, postes, equipements, onAddLieu, onEditLieu, onDeleteLieu, showToast, onRefresh }) {
  const [selectedLieu, setSelectedLieu] = useState(null);
  const [subTab, setSubTab]             = useState("equipements");
  const [showES, setShowES]             = useState(false);
  const [showHist, setShowHist]         = useState(false);
  const [historique, setHistorique]     = useState([]);
  const [esFrm, setEsFrm]              = useState({
    type: "entree", responsable: "", responsable_type: "enseignant",
    date: new Date().toISOString().slice(0, 16),
    observations_avant: "", observations_apres: "",
  });

  const lieuxByType = useMemo(() => {
    const g = {};
    lieux.forEach((l) => { if (!g[l.type]) g[l.type] = []; g[l.type].push(l); });
    return g;
  }, [lieux]);

  const equipsLieu = selectedLieu ? equipements.filter((e) => e.localisation?.lieu_id === selectedLieu.id) : [];
  const postesLieu = selectedLieu ? postes.filter((p) => p.salle_informatique_id === selectedLieu.id) : [];

  const handleES = async () => {
    try {
      await apiFetch("/materiel/entree-sortie", {
        method: "POST", body: JSON.stringify({ lieu_id: selectedLieu.id, ...esFrm }),
      });
      showToast("ok", `${esFrm.type === "entree" ? "Entrée" : "Sortie"} enregistrée`);
      setShowES(false);
    } catch (err) { showToast("err", err.message); }
  };

  const loadHist = async () => {
    try {
      const data = await apiFetch(`/materiel/entrees-sorties/${selectedLieu.id}`);
      setHistorique(Array.isArray(data) ? data : []);
      setShowHist(true);
    } catch (err) { showToast("err", err.message); }
  };

  return (
    <div style={styles.lieuxLayout}>
      {/* Sidebar */}
      <aside style={styles.lieuxSidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>Lieux</span>
          <button style={styles.addSmallBtn} onClick={onAddLieu}><Plus size={14} /></button>
        </div>
        {Object.entries(lieuxByType).map(([type, items]) => {
          const meta = LIEU_TYPE_LABELS[type] || { emoji: "📌", label: type };
          return (
            <div key={type} style={styles.lieuGroup}>
              <div style={styles.lieuGroupTitle}>
                {meta.emoji} {meta.label}
                <span style={styles.lieuCount}>{items.length}</span>
              </div>
              {items.map((lieu) => (
                <button key={lieu.id}
                  style={{ ...styles.lieuBtn, ...(selectedLieu?.id === lieu.id ? styles.lieuBtnActive : {}) }}
                  onClick={() => { setSelectedLieu(lieu); setSubTab("equipements"); }}>
                  <div style={styles.lieuBtnName}>{lieu.nom}</div>
                  <div style={styles.lieuBtnMeta}>
                    {lieu.stats?.total_equipements || 0} équip.
                    {lieu.type === "salle_informatique" && ` · ${lieu.stats?.postes || 0} postes`}
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Contenu */}
      <div style={styles.lieuxContent}>
        {!selectedLieu
          ? <EmptyState icon={<Building2 size={44} />} title="Sélectionnez un lieu" sub="Cliquez sur un lieu dans la liste à gauche." />
          : (
            <>
              <div style={styles.lieuHeader}>
                <div>
                  <h2 style={styles.lieuTitle}>{selectedLieu.nom}</h2>
                  <p style={styles.lieuSubtitle}>
                    {LIEU_TYPE_LABELS[selectedLieu.type]?.emoji} {LIEU_TYPE_LABELS[selectedLieu.type]?.label}
                    {selectedLieu.capacite && ` · ${selectedLieu.capacite} places`}
                    {selectedLieu.occupant && ` · ${selectedLieu.occupant}`}
                  </p>
                </div>
                <div style={styles.lieuStats}>
                  <LieuStat label="Équipements"  val={selectedLieu.stats?.total_equipements || 0} color="var(--ip-teal)" />
                  <LieuStat label="Fonctionnels" val={selectedLieu.stats?.fonctionnels || 0}       color="#2E7D32" />
                  <LieuStat label="En panne"     val={selectedLieu.stats?.en_panne || 0}           color="#C62828" />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedLieu.type === "salle_informatique" && (
                    <>
                      <Btn secondary onClick={() => setShowES(true)}><Clock size={13} /> Entrée/Sortie</Btn>
                      <Btn secondary onClick={loadHist}><ClipboardList size={13} /> Historique</Btn>
                    </>
                  )}
                  <Btn secondary onClick={() => onEditLieu(selectedLieu)}><Edit3 size={13} /> Modifier</Btn>
                  <Btn ghost onClick={() => onDeleteLieu(selectedLieu.id)}><Trash2 size={13} /></Btn>
                </div>
              </div>

              <div style={styles.subTabs}>
                <SubTab active={subTab === "equipements"} onClick={() => setSubTab("equipements")}>
                  <Package size={13} /> Équipements ({equipsLieu.length})
                </SubTab>
                {selectedLieu.type === "salle_informatique" && (
                  <SubTab active={subTab === "postes"} onClick={() => setSubTab("postes")}>
                    <Monitor size={13} /> Postes ({postesLieu.length})
                  </SubTab>
                )}
              </div>

              {subTab === "equipements" && (
                equipsLieu.length === 0
                  ? <EmptyState icon={<Package size={36} />} title="Aucun équipement" sub="Ce lieu ne contient pas encore d'équipements." mini />
                  : (
                    <div style={styles.equipsGrid}>
                      {equipsLieu.map((eq) => {
                        const etatInfo = ETAT_STYLE[eq.etat] || ETAT_STYLE.fonctionnel;
                        return (
                          <div key={eq.id} style={{ ...styles.equipCard, ...(eq.nb_problemes_actifs > 0 ? styles.equipCardPb : {}) }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={styles.refTag}>{eq.reference_catalogue}</span>
                              <span style={{ ...styles.etatBadge, background: etatInfo.bg, color: etatInfo.color, fontSize: "0.65rem" }}>
                                {etatInfo.label}
                              </span>
                            </div>
                            <div style={styles.equipDesignation}>{eq.designation}</div>
                            <div style={styles.equipMeta}>Qté : {eq.quantite || 1}</div>
                            {eq.nb_problemes_actifs > 0 && (
                              <div style={{ color: "#C62828", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}>
                                <AlertTriangle size={11} /> {eq.nb_problemes_actifs} problème(s)
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
              )}

              {subTab === "postes" && selectedLieu.type === "salle_informatique" && (
                postesLieu.length === 0
                  ? <EmptyState icon={<Monitor size={36} />} title="Aucun poste" sub="Aucun poste configuré." mini />
                  : (
                    <div style={styles.postesGrid}>
                      {postesLieu.map((poste) => (
                        <div key={poste.id} style={{ ...styles.posteCard, ...(poste.complet ? {} : styles.posteIncomplet) }}>
                          <div style={styles.posteHeader}>
                            <Monitor size={16} />
                            <span style={styles.posteName}>{poste.nom}</span>
                            {poste.complet ? <CircleCheck size={15} color="#2E7D32" /> : <AlertCircle size={15} color="#C62828" />}
                          </div>
                          <div style={styles.posteCompo}>
                            {(poste.composition || []).map((comp) => (
                              <div key={comp.id} style={styles.compRow}>
                                <span style={styles.compType}>{comp.equipement?.type || "?"}</span>
                                <span style={{ ...styles.compEtat, color: ["bon","neuf"].includes(comp.etat_qualitatif) ? "#2E7D32" : "#E65100" }}>
                                  {comp.etat_qualitatif}
                                </span>
                              </div>
                            ))}
                          </div>
                          {!poste.complet && poste.manquants?.length > 0 && (
                            <div style={styles.posteManquants}>Manquant : {poste.manquants.join(", ")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
              )}
            </>
          )}
      </div>

      {/* Modal entrée/sortie */}
      {showES && (
        <Overlay onClose={() => setShowES(false)}>
          <ModalBox title="Entrée / Sortie de salle" onClose={() => setShowES(false)}>
            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              {["entree","sortie"].map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="es_t" value={t} checked={esFrm.type === t}
                    onChange={() => setEsFrm({ ...esFrm, type: t })} />
                  {t === "entree" ? "🟢 Entrée" : "🔴 Sortie"}
                </label>
              ))}
            </div>
            <FInput label="Responsable *" value={esFrm.responsable} onChange={(v) => setEsFrm({ ...esFrm, responsable: v })} required />
            <FSelect label="Type de responsable" value={esFrm.responsable_type}
              onChange={(v) => setEsFrm({ ...esFrm, responsable_type: v })}
              options={[{value:"enseignant",label:"Enseignant"},{value:"etudiant",label:"Étudiant"},{value:"personnel",label:"Personnel"}]} />
            <FInput label="Date et heure *" type="datetime-local" value={esFrm.date} onChange={(v) => setEsFrm({ ...esFrm, date: v })} />
            <FTextarea label="Observations avant" value={esFrm.observations_avant} onChange={(v) => setEsFrm({ ...esFrm, observations_avant: v })} />
            {esFrm.type === "sortie" && (
              <FTextarea label="Observations après" value={esFrm.observations_apres} onChange={(v) => setEsFrm({ ...esFrm, observations_apres: v })} />
            )}
            <div style={styles.modalFooter}>
              <Btn ghost onClick={() => setShowES(false)}>Annuler</Btn>
              <Btn primary onClick={handleES}>Enregistrer</Btn>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* Historique */}
      {showHist && (
        <Overlay onClose={() => setShowHist(false)}>
          <ModalBox title={`Historique — ${selectedLieu?.nom}`} onClose={() => setShowHist(false)} wide>
            {historique.length === 0 ? <p style={styles.hint}>Aucun enregistrement.</p> : (
              <>
                <Btn secondary onClick={() => {
                  const w = window.open();
                  w.document.write(`<html><body><h1>${selectedLieu?.nom}</h1>
                    <table border="1" cellpadding="6">${historique.map((e) =>
                      `<tr><td>${new Date(e.date).toLocaleString()}</td><td>${e.type}</td><td>${e.responsable}</td><td>${e.observations_avant||"—"}</td><td>${e.observations_apres||"—"}</td></tr>`
                    ).join("")}</table></body></html>`);
                  w.print();
                }} style={{ marginBottom: 14 }}><Printer size={13} /> Imprimer</Btn>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead><tr>{["Date","Type","Responsable","Obs. avant","Obs. après"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {historique.map((e) => (
                        <tr key={e.id} style={styles.tr}>
                          <td style={styles.td}>{new Date(e.date).toLocaleString()}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.etatBadge, background: e.type==="entree"?"#E8F5E9":"#FFEBEE", color: e.type==="entree"?"#2E7D32":"#C62828" }}>
                              {e.type}
                            </span>
                          </td>
                          <td style={styles.td}>{e.responsable} <span style={{ color:"var(--ip-gray)",fontSize:"0.71rem" }}>({e.responsable_type})</span></td>
                          <td style={styles.td}>{e.observations_avant||"—"}</td>
                          <td style={styles.td}>{e.observations_apres||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div style={styles.modalFooter}><Btn ghost onClick={() => setShowHist(false)}>Fermer</Btn></div>
          </ModalBox>
        </Overlay>
      )}
    </div>
  );
}

function LieuStat({ label, val, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color }}>{val}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--ip-gray)", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MOUVEMENTS
// ══════════════════════════════════════════════════════════
function MouvementsTab({ equipements, lieux, showToast, onRefresh }) {
  const [typeMvt, setTypeMvt] = useState("transfert");
  const [form, setForm]       = useState({ quantite: 1 });
  const [saving, setSaving]   = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const equipsDispo = equipements.filter((e) =>
    typeMvt === "transfert"
      ? e.localisation?.type === "stock"
      : e.localisation?.type === "lieu" || e.localisation?.type === "poste"
  );

  const handleSubmit = async () => {
    if (!form.equipement_id) { showToast("err", "Sélectionnez un équipement"); return; }
    if (typeMvt === "transfert" && !form.lieu_id) { showToast("err", "Sélectionnez un lieu"); return; }
    setSaving(true);
    try {
      const url = typeMvt === "transfert"
        ? "/materiel/mouvement/transfert-lieu"
        : "/materiel/mouvement/retour-stock";
      await apiFetch(url, { method: "POST", body: JSON.stringify(form) });
      showToast("ok", "Mouvement enregistré");
      setForm({ quantite: 1 });
      onRefresh();
    } catch (err) { showToast("err", err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.mvtPage}>
      <div style={styles.mvtTypes}>
        {[
          { id: "transfert", label: "Stock → Lieu",  icon: ArrowRightLeft, desc: "Affecter du matériel du stock vers une salle" },
          { id: "retour",    label: "Lieu → Stock",   icon: Archive,        desc: "Récupérer du matériel depuis un lieu" },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              style={{ ...styles.mvtTypeCard, ...(typeMvt === t.id ? styles.mvtTypeCardActive : {}) }}
              onClick={() => { setTypeMvt(t.id); setForm({ quantite: 1 }); }}>
              <Icon size={22} />
              <div style={{ fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ip-gray)" }}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={styles.mvtForm}>
        <FSelect label="Équipement *" value={form.equipement_id || ""} onChange={(v) => set("equipement_id", v)}
          options={equipsDispo.map((e) => ({ value: e.id, label: `${e.reference_catalogue} — ${e.designation} (Qté: ${e.quantite || 1})` }))} />
        {typeMvt === "transfert" && (
          <FSelect label="Lieu de destination *" value={form.lieu_id || ""} onChange={(v) => set("lieu_id", v)}
            options={lieux.filter((l) => l.type !== "reparateur").map((l) => ({ value: l.id, label: l.nom }))} />
        )}
        <FInput label="Quantité" type="number" value={form.quantite} onChange={(v) => set("quantite", parseInt(v))} />
        <FInput label="Responsable" value={form.responsable || ""} onChange={(v) => set("responsable", v)} />
        <FInput label="Motif" value={form.motif || ""} onChange={(v) => set("motif", v)} />
        <Btn primary onClick={handleSubmit} disabled={saving} style={{ marginTop: 8 }}>
          <Check size={14} /> {saving ? "Enregistrement…" : "Enregistrer le mouvement"}
        </Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PROBLÈMES
// ══════════════════════════════════════════════════════════
function ProblemesTab({ equipements, showToast, onRefresh }) {
  const [selId, setSelId]         = useState("");
  const [problemes, setProblemes] = useState([]);
  const [loadingP, setLoadingP]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ gravite: "moyenne" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadProblemes = async (id) => {
    if (!id) return;
    setLoadingP(true);
    try {
      const data = await apiFetch(`/materiel/problemes/${id}`);
      setProblemes(Array.isArray(data) ? data : []);
    } catch (err) { showToast("err", err.message); }
    finally { setLoadingP(false); }
  };

  const handleSignaler = async () => {
    if (!selId || !form.type_probleme) { showToast("err", "Type de problème requis"); return; }
    try {
      await apiFetch("/materiel/probleme", { method: "POST", body: JSON.stringify({ ...form, equipement_id: selId }) });
      showToast("ok", "Problème signalé");
      loadProblemes(selId);
      onRefresh();
      setForm({ gravite: "moyenne" });
      setShowForm(false);
    } catch (err) { showToast("err", err.message); }
  };

  const handleResoudre = async (pbId) => {
    const resolution = window.prompt("Notes de résolution ?", "Réparé");
    if (resolution === null) return;
    try {
      await apiFetch(`/materiel/probleme/${pbId}/resoudre`, {
        method: "PUT", body: JSON.stringify({ resolution, resolu_par: "Technicien", nouvel_etat: "fonctionnel" }),
      });
      showToast("ok", "Problème résolu");
      loadProblemes(selId);
      onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const selEquip = equipements.find((e) => e.id === selId);

  return (
    <div>
      <div style={styles.tabHeader}>
        <div style={styles.filters}>
          <FSelect label="" value={selId}
            onChange={(v) => { setSelId(v); loadProblemes(v); setShowForm(false); }}
            options={equipements.map((e) => ({ value: e.id, label: `${e.reference_catalogue} — ${e.designation}` }))} />
          {selId && <Btn primary onClick={() => setShowForm(!showForm)}><Plus size={14} /> Signaler un problème</Btn>}
        </div>
      </div>

      {showForm && (
        <div style={styles.pbForm}>
          <div style={styles.pbFormRow}>
            <FSelect label="Type *" value={form.type_probleme || ""} onChange={(v) => set("type_probleme", v)}
              options={TYPES_PROBLEMES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} />
            <FSelect label="Gravité" value={form.gravite} onChange={(v) => set("gravite", v)}
              options={Object.entries(GRAVITE_STYLE).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          <FTextarea label="Description" value={form.description || ""} onChange={(v) => set("description", v)} />
          <FInput label="Signalé par" value={form.signale_par || ""} onChange={(v) => set("signale_par", v)} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn ghost onClick={() => setShowForm(false)}>Annuler</Btn>
            <Btn primary onClick={handleSignaler}><AlertTriangle size={13} /> Signaler</Btn>
          </div>
        </div>
      )}

      {selId && (
        <div style={{ marginTop: 20 }}>
          <h4 style={styles.detailSection}>
            Problèmes — {selEquip?.designation}
            {loadingP && <span style={styles.hint}> Chargement…</span>}
          </h4>
          {!loadingP && problemes.length === 0 && (
            <p style={{ ...styles.hint, color: "#2E7D32" }}>✓ Aucun problème pour cet équipement</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {problemes.map((pb) => {
              const grav = GRAVITE_STYLE[pb.gravite] || GRAVITE_STYLE.moyenne;
              return (
                <div key={pb.id} style={{ ...styles.pbItem, ...(pb.resolu ? styles.pbResolu : {}) }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{pb.type_probleme?.replace(/_/g, " ")}</span>
                    <span style={{ ...styles.etatBadge, background: grav.bg, color: grav.color }}>{grav.label}</span>
                    {pb.resolu
                      ? <span style={{ ...styles.etatBadge, background: "#E8F5E9", color: "#2E7D32" }}>✓ Résolu</span>
                      : <span style={{ ...styles.etatBadge, background: "#FFEBEE", color: "#C62828" }}>Actif</span>}
                  </div>
                  {pb.description && <div style={styles.pbDesc}>{pb.description}</div>}
                  <div style={styles.pbMeta}>
                    Signalé par {pb.signale_par} le {new Date(pb.date_signalement).toLocaleDateString()}
                    {pb.resolu && ` · Résolu le ${new Date(pb.date_resolution).toLocaleDateString()}`}
                  </div>
                  {pb.resolution && <div style={{ fontSize: "0.75rem", color: "#2E7D32" }}>→ {pb.resolution}</div>}
                  {!pb.resolu && (
                    <Btn secondary onClick={() => handleResoudre(pb.id)} style={{ marginTop: 4 }}>
                      <Check size={13} /> Marquer résolu
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PRÊTS
// ══════════════════════════════════════════════════════════
function PretsTab({ prets, equipements, showToast, onRefresh }) {
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ emprunteur_type: "etudiant" });
  const [filterActif, setFilterActif] = useState("actif");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = prets.filter((p) => {
    if (filterActif === "actif")   return !p.date_retour_effectif;
    if (filterActif === "retourne") return !!p.date_retour_effectif;
    return true;
  });

  const handleCreer = async () => {
    if (!form.equipement_id || !form.emprunteur || !form.date_pret) {
      showToast("err", "Équipement, emprunteur et date requis"); return;
    }
    try {
      await apiFetch("/materiel/pret", { method: "POST", body: JSON.stringify(form) });
      showToast("ok", "Prêt enregistré");
      setShowForm(false); setForm({ emprunteur_type: "etudiant" }); onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const handleRetour = async (pretId) => {
    const etatRetour = window.prompt("État de retour ? (bon / endommagé)", "bon");
    if (etatRetour === null) return;
    try {
      await apiFetch(`/materiel/pret/${pretId}/retour`, {
        method: "PUT", body: JSON.stringify({ etat_retour: etatRetour }),
      });
      showToast("ok", "Retour enregistré"); onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const equipsDisponibles = equipements.filter((e) =>
    e.localisation?.type === "stock" || e.localisation?.type === "lieu"
  );

  return (
    <div>
      <div style={styles.tabHeader}>
        <div style={styles.filters}>
          <select style={styles.select} value={filterActif} onChange={(e) => setFilterActif(e.target.value)}>
            <option value="actif">Prêts en cours</option>
            <option value="retourne">Retournés</option>
            <option value="tous">Tous</option>
          </select>
          <span style={styles.countPill}>{filtered.length} prêt(s)</span>
        </div>
        <Btn primary onClick={() => setShowForm(!showForm)}><Plus size={14} /> Nouveau prêt</Btn>
      </div>

      {showForm && (
        <div style={styles.pbForm}>
          <FSelect label="Équipement *" value={form.equipement_id || ""} onChange={(v) => set("equipement_id", v)}
            options={equipsDisponibles.map((e) => ({ value: e.id, label: `${e.reference_catalogue} — ${e.designation}` }))} />
          <FInput label="Emprunteur *" value={form.emprunteur || ""} onChange={(v) => set("emprunteur", v)} />
          <FSelect label="Type d'emprunteur" value={form.emprunteur_type} onChange={(v) => set("emprunteur_type", v)}
            options={[{value:"etudiant",label:"Étudiant"},{value:"enseignant",label:"Enseignant"},{value:"personnel",label:"Personnel"}]} />
          <FInput label="Date du prêt *" type="date" value={form.date_pret || ""} onChange={(v) => set("date_pret", v)} />
          <FInput label="Retour prévu" type="date" value={form.date_retour_prevu || ""} onChange={(v) => set("date_retour_prevu", v)} />
          <FTextarea label="Remarques" value={form.remarques || ""} onChange={(v) => set("remarques", v)} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn ghost onClick={() => setShowForm(false)}>Annuler</Btn>
            <Btn primary onClick={handleCreer}><Check size={13} /> Enregistrer</Btn>
          </div>
        </div>
      )}

      {filtered.length === 0
        ? <EmptyState icon={<ArrowUpFromLine size={40} />} title="Aucun prêt" sub="Aucun prêt dans cette catégorie." mini />
        : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>{["Équipement","Emprunteur","Type","Date prêt","Retour prévu","Retour effectif",""].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const retardé = !p.date_retour_effectif && p.date_retour_prevu && new Date(p.date_retour_prevu) < new Date();
                  return (
                    <tr key={p.id} style={{ ...styles.tr, ...(retardé ? { background: "#FFF8E1" } : {}) }}>
                      <td style={styles.td}><span style={styles.refTag}>{p.equipement?.reference_catalogue || p.equipement_id?.slice(0,8)}</span></td>
                      <td style={styles.td}>{p.emprunteur}</td>
                      <td style={styles.td}><span style={styles.typePill}>{p.emprunteur_type}</span></td>
                      <td style={styles.td}>{p.date_pret ? new Date(p.date_pret).toLocaleDateString() : "—"}</td>
                      <td style={styles.td}>
                        {p.date_retour_prevu ? new Date(p.date_retour_prevu).toLocaleDateString() : "—"}
                        {retardé && <span style={{ color:"#C62828",fontWeight:700,marginLeft:4 }}> RETARD</span>}
                      </td>
                      <td style={styles.td}>
                        {p.date_retour_effectif
                          ? <span style={{ color:"#2E7D32",fontWeight:600 }}>✓ {new Date(p.date_retour_effectif).toLocaleDateString()}</span>
                          : <span style={{ color:"var(--ip-gray)" }}>En cours</span>}
                      </td>
                      <td style={styles.td}>
                        {!p.date_retour_effectif && (
                          <Btn secondary onClick={() => handleRetour(p.id)} style={{ fontSize:"0.74rem",height:30 }}>
                            <ArrowDownToLine size={12} /> Retour
                          </Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// RÉPARATIONS
// ══════════════════════════════════════════════════════════
function ReparationsTab({ reparations, equipements, showToast, onRefresh }) {
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({});
  const [filterActif, setFilterActif] = useState("actif");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = reparations.filter((r) => {
    if (filterActif === "actif")   return !r.retour_effectif;
    if (filterActif === "terminee") return !!r.retour_effectif;
    return true;
  });

  const handleCreer = async () => {
    if (!form.equipement_id || !form.technicien || !form.date_envoi) {
      showToast("err", "Équipement, technicien et date d'envoi requis"); return;
    }
    try {
      await apiFetch("/materiel/reparation", { method: "POST", body: JSON.stringify(form) });
      showToast("ok", "Réparation enregistrée");
      setShowForm(false); setForm({}); onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const handleRetour = async (repId) => {
    const cout = window.prompt("Coût réel (FCFA) ?", "0");
    if (cout === null) return;
    const etat = window.prompt("État après réparation ? (fonctionnel / panne / reforme)", "fonctionnel");
    if (etat === null) return;
    try {
      await apiFetch(`/materiel/reparation/${repId}/retour`, {
        method: "PUT", body: JSON.stringify({ cout_reel: parseFloat(cout) || 0, etat_apres: etat }),
      });
      showToast("ok", "Retour enregistré"); onRefresh();
    } catch (err) { showToast("err", err.message); }
  };

  const equipsEnPanne = equipements.filter((e) => e.etat === "panne" || e.etat === "maintenance");

  return (
    <div>
      <div style={styles.tabHeader}>
        <div style={styles.filters}>
          <select style={styles.select} value={filterActif} onChange={(e) => setFilterActif(e.target.value)}>
            <option value="actif">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="tous">Toutes</option>
          </select>
          <span style={styles.countPill}>{filtered.length} réparation(s)</span>
        </div>
        <Btn primary onClick={() => setShowForm(!showForm)}><Plus size={14} /> Envoyer en réparation</Btn>
      </div>

      {showForm && (
        <div style={styles.pbForm}>
          <FSelect label="Équipement (en panne/maintenance) *" value={form.equipement_id || ""}
            onChange={(v) => set("equipement_id", v)}
            options={equipsEnPanne.map((e) => ({ value: e.id, label: `${e.reference_catalogue} — ${e.designation} (${e.etat})` }))} />
          <FInput label="Technicien / Atelier *" value={form.technicien || ""} onChange={(v) => set("technicien", v)} />
          <FInput label="Date d'envoi *" type="date" value={form.date_envoi || ""} onChange={(v) => set("date_envoi", v)} />
          <FInput label="Retour prévu" type="date" value={form.retour_prevu || ""} onChange={(v) => set("retour_prevu", v)} />
          <FInput label="Coût estimé (FCFA)" type="number" value={form.cout_estime || ""} onChange={(v) => set("cout_estime", parseFloat(v))} />
          <FTextarea label="Remarques" value={form.remarques || ""} onChange={(v) => set("remarques", v)} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn ghost onClick={() => setShowForm(false)}>Annuler</Btn>
            <Btn primary onClick={handleCreer}><Check size={13} /> Enregistrer</Btn>
          </div>
        </div>
      )}

      {filtered.length === 0
        ? <EmptyState icon={<Hammer size={40} />} title="Aucune réparation" sub="Aucune réparation dans cette catégorie." mini />
        : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>{["Équipement","Technicien","Envoyé le","Retour prévu","Coût estimé","Statut",""].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const retardé = !r.retour_effectif && r.retour_prevu && new Date(r.retour_prevu) < new Date();
                  return (
                    <tr key={r.id} style={{ ...styles.tr, ...(retardé ? { background: "#FFF8E1" } : {}) }}>
                      <td style={styles.td}><span style={styles.refTag}>{r.equipement?.reference_catalogue || r.equipement_id?.slice(0,8)}</span></td>
                      <td style={styles.td}>{r.technicien}</td>
                      <td style={styles.td}>{r.date_envoi ? new Date(r.date_envoi).toLocaleDateString() : "—"}</td>
                      <td style={styles.td}>
                        {r.retour_prevu ? new Date(r.retour_prevu).toLocaleDateString() : "—"}
                        {retardé && <span style={{ color:"#C62828",fontWeight:700,marginLeft:4 }}> RETARD</span>}
                      </td>
                      <td style={styles.td}>{r.cout_estime ? `${Number(r.cout_estime).toLocaleString()} FCFA` : "—"}</td>
                      <td style={styles.td}>
                        {r.retour_effectif
                          ? <span style={{ ...styles.etatBadge, background:"#E8F5E9", color:"#2E7D32" }}>✓ Terminée</span>
                          : <span style={{ ...styles.etatBadge, background:"#FFF3E0", color:"#E65100" }}>En cours</span>}
                      </td>
                      <td style={styles.td}>
                        {!r.retour_effectif && (
                          <Btn secondary onClick={() => handleRetour(r.id)} style={{ fontSize:"0.74rem",height:30 }}>
                            <ArrowDownToLine size={12} /> Retour
                          </Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MODAL MANAGER
// ══════════════════════════════════════════════════════════
function ModalManager({ type, data, editItem, catalogue, lieux, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const urlMap = {
        catalogue: `catalogue${editItem ? `/${editItem.id}` : ""}`,
        equipement: `equipement${editItem ? `/${editItem.id}` : ""}`,
        lieu: `lieu${editItem ? `/${editItem.id}` : ""}`,
      };
      await apiFetch(`/materiel/${urlMap[type]}`, {
        method: editItem ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      onSaved();
    } catch (err) { showToast("err", err.message); }
    finally { setSaving(false); }
  };

  const titles = {
    catalogue:  editItem ? "Modifier la référence"   : "Nouvelle référence catalogue",
    equipement: editItem ? "Modifier l'équipement"   : "Entrée en stock",
    lieu:       editItem ? "Modifier le lieu"         : "Nouveau lieu",
  };

  return (
    <Overlay onClose={onClose}>
      <ModalBox title={titles[type] || "Formulaire"} onClose={onClose}>

        {type === "catalogue" && (
          <>
            <FInput label="Référence *"   value={form.reference || ""}   onChange={(v) => set("reference", v)} required />
            <FInput label="Désignation *" value={form.designation || ""} onChange={(v) => set("designation", v)} required />
            <FSelect label="Type *" value={form.type || ""} onChange={(v) => set("type", v)} required
              options={EQUIPEMENT_TYPES.map((t) => ({ value: t, label: t }))} />
            <FSelect label="Catégorie" value={form.categorie || "autre"} onChange={(v) => set("categorie", v)}
              options={[
                {value:"peripherique",label:"Périphérique"},
                {value:"composant",label:"Composant"},
                {value:"reseau",label:"Réseau"},
                {value:"accessoire",label:"Accessoire"},
                {value:"autre",label:"Autre"},
              ]} />
            <FInput label="Fabricant"          value={form.fabricant || ""}    onChange={(v) => set("fabricant", v)} />
            <FInput label="Modèle"             value={form.modele || ""}       onChange={(v) => set("modele", v)} />
            <FInput label="Prix d'achat (FCFA)" type="number" value={form.prix_achat || ""}        onChange={(v) => set("prix_achat", parseFloat(v))} />
            <FInput label="Stock minimum"       type="number" value={form.quantite_minimale ?? 5}  onChange={(v) => set("quantite_minimale", parseInt(v))} />
          </>
        )}

        {type === "equipement" && (
          <>
            <FSelect label="Référence catalogue *" value={form.catalogue_id || ""} onChange={(v) => set("catalogue_id", v)} required
              options={catalogue.map((c) => ({ value: c.id, label: `${c.reference} — ${c.designation}` }))} />
            <FInput label="Numéro de série" value={form.numero_serie || ""} onChange={(v) => set("numero_serie", v)} placeholder="Vide si gestion par quantité" />
            <FInput label="Quantité" type="number" value={form.quantite ?? 1} onChange={(v) => set("quantite", parseInt(v))} />
            <FInput label="Date d'achat" type="date" value={form.date_achat || new Date().toISOString().split("T")[0]} onChange={(v) => set("date_achat", v)} />
            <FInput label="Fournisseur"        value={form.fournisseur || ""}  onChange={(v) => set("fournisseur", v)} />
            <FInput label="Prix d'achat (FCFA)" type="number" value={form.prix_achat || ""} onChange={(v) => set("prix_achat", parseFloat(v))} />
            <FTextarea label="Observations" value={form.observations || ""} onChange={(v) => set("observations", v)} />
          </>
        )}

        {type === "lieu" && (
          <>
            <FInput label="Nom *" value={form.nom || ""} onChange={(v) => set("nom", v)} required />
            <FSelect label="Type *" value={form.type || ""} onChange={(v) => set("type", v)} required
              options={Object.entries(LIEU_TYPE_LABELS).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))} />
            <FInput label="Capacité (places)" type="number" value={form.capacite || ""} onChange={(v) => set("capacite", parseInt(v))} />
            <FInput label="Occupant" value={form.occupant || ""} onChange={(v) => set("occupant", v)} />
          </>
        )}

        <div style={styles.modalFooter}>
          <Btn ghost onClick={onClose}>Annuler</Btn>
          <Btn primary onClick={handleSave} disabled={saving}>
            <Check size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
          </Btn>
        </div>
      </ModalBox>
    </Overlay>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANTS UI RÉUTILISABLES
// ══════════════════════════════════════════════════════════
function Overlay({ children, onClose }) {
  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
function ModalBox({ title, onClose, children, wide }) {
  return (
    <div style={{ ...styles.modal, ...(wide ? { maxWidth: 820 } : {}) }}>
      <div style={styles.modalHeader}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{title}</h3>
        <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
      </div>
      <div style={styles.modalBody}>{children}</div>
    </div>
  );
}
function Btn({ primary, secondary, ghost, children, onClick, disabled, style }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      ...(primary ? styles.btnPrimary : secondary ? styles.btnSecondary : styles.btnGhost),
      ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}),
      ...style,
    }}>{children}</button>
  );
}
function SubTab({ children, active, onClick }) {
  return <button onClick={onClick} style={{ ...styles.subTabBtn, ...(active ? styles.subTabBtnActive : {}) }}>{children}</button>;
}
function KpiCard({ title, value, icon: Icon, color }) {
  return (
    <div style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: `${color}20`, color }}><Icon size={22} /></div>
      <div>
        <div style={{ fontSize: "1.65rem", fontWeight: 900, color }}>{value}</div>
        <div style={{ fontSize: "0.76rem", color: "var(--ip-gray)", marginTop: 2 }}>{title}</div>
      </div>
    </div>
  );
}
function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={styles.searchBox}>
      <Search size={13} color="var(--ip-gray)" />
      <input style={styles.searchInput} placeholder={placeholder || "Rechercher…"} value={value}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function FInput({ label, type = "text", value, onChange, required, placeholder }) {
  return (
    <div style={styles.fRow}>
      {label && <label style={styles.fLabel}>{label}{required && " *"}</label>}
      <input type={type} style={styles.fInput} value={value ?? ""}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
function FSelect({ label, value, onChange, options, required }) {
  return (
    <div style={styles.fRow}>
      {label && <label style={styles.fLabel}>{label}{required && " *"}</label>}
      <select style={styles.fInput} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">— Sélectionner —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function FTextarea({ label, value, onChange }) {
  return (
    <div style={styles.fRow}>
      {label && <label style={styles.fLabel}>{label}</label>}
      <textarea style={{ ...styles.fInput, minHeight: 72, resize: "vertical" }}
        value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function EmptyState({ icon, title, sub, mini }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, padding: mini ? "30px 20px" : "56px 20px", color: "var(--ip-gray)", textAlign: "center" }}>
      {icon}
      <div style={{ fontWeight: 700, fontSize: mini ? "0.85rem" : "1rem" }}>{title}</div>
      {sub && <div style={{ fontSize: "0.78rem" }}>{sub}</div>}
    </div>
  );
}
function Placeholder({ children }) {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--ip-gray)" }}>{children}</div>;
}
function DetailRow({ label, val }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailVal}>{val}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES (inchangés, mais sans layout général)
// ══════════════════════════════════════════════════════════
const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  title: { fontSize: "1.5rem", fontWeight: 800, margin: 0 },
  subtitle: { fontSize: "0.8rem", color: "var(--ip-gray)", marginTop: 4 },
  refreshBtn: { width: 36, height: 36, border: "1px solid var(--border)", background: "var(--bg)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ip-gray)" },

  tabsBar:      { display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "2px solid var(--border)", paddingBottom: 2, marginBottom: 24 },
  tabBtn:       { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: "8px 8px 0 0", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--ip-gray)", transition: "all 0.15s" },
  tabBtnActive: { background: "var(--ip-teal)", color: "#fff" },
  badge:        { background: "#C62828", color: "#fff", borderRadius: 999, fontSize: "0.6rem", fontWeight: 900, padding: "1px 5px", marginLeft: 2 },

  loadingBar:  { height: 3, background: "var(--border)", marginBottom: 8 },
  loadingFill: { height: "100%", width: "40%", background: "var(--ip-teal)", borderRadius: 999 },
  content:     { },

  tabHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 },
  filters:   { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  searchBox:   { display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, minWidth: 200 },
  searchInput: { border: "none", outline: "none", background: "transparent", fontSize: "0.81rem", flex: 1, color: "var(--fg)" },
  select:      { height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.81rem", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" },
  countPill:   { background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", fontSize: "0.73rem", fontWeight: 700, color: "var(--ip-gray)" },

  btnPrimary:   { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 18px", borderRadius: 8, border: "none", background: "var(--ip-teal)", color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" },
  btnGhost:     { display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--ip-gray)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" },
  iconBtn:      { width: 32, height: 32, border: "1px solid var(--border)", background: "var(--bg)", borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ip-gray)" },
  linkBtn:      { background: "none", border: "none", color: "var(--ip-teal)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" },
  addSmallBtn:  { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ip-teal)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },

  etatBadge:    { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600 },
  typePill:     { background: "var(--bg-muted)", padding: "2px 7px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600 },
  refTag:       { background: "rgba(15,155,114,0.12)", color: "var(--ip-teal)", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 },
  locDetail:    { fontSize: "0.72rem", color: "var(--ip-gray)" },
  problemeBadge:{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", background: "#FFEBEE", color: "#C62828", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 },

  dashboard:     { display: "flex", flexDirection: "column", gap: 24 },
  kpiGrid:       { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px,1fr))", gap: 14 },
  kpiCard:       { display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", background: "var(--bg)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  kpiIcon:       { width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" },
  section:       { background: "var(--bg)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--border)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle:  { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.92rem", margin: 0 },
  alerteBandeau: { display: "flex", alignItems: "center", gap: 8, background: "#FFF3E0", border: "1px solid #FFB74D", borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem", fontWeight: 700, color: "#E65100", marginBottom: 14 },
  alertesList:   { display: "flex", flexDirection: "column", gap: 10 },
  alerteCard:    { padding: "11px 15px", background: "#FFF8E1", borderRadius: 8, borderLeft: "4px solid #FF9800" },
  alerteTitle:   { fontWeight: 700, fontSize: "0.84rem" },
  alerteRef:     { fontSize: "0.74rem", color: "var(--ip-gray)", fontWeight: 400 },
  alerteMeta:    { fontSize: "0.77rem", color: "var(--ip-gray)", marginTop: 3 },
  statsGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 },
  statCard:      { background: "var(--bg)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--border)" },
  statCardTitle: { fontSize: "0.76rem", fontWeight: 800, color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14, marginTop: 0 },
  statBars:      { display: "flex", flexDirection: "column", gap: 12 },
  statBar:       { display: "flex", alignItems: "center", gap: 12 },
  statBarLabel:  { width: 110, fontSize: "0.77rem", color: "var(--ip-gray)" },
  barTrack:      { flex: 1, height: 8, background: "var(--bg-muted)", borderRadius: 999, overflow: "hidden" },
  barFill:       { height: "100%", borderRadius: 999, transition: "width 0.4s" },
  statBarVal:    { width: 34, textAlign: "right", fontSize: "0.77rem", fontWeight: 700 },

  catGrid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 },
  catCard:       { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column", gap: 6 },
  catCardAlerte: { borderColor: "#FFB74D", background: "#FFFDE7" },
  catCardTop:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  catType:       { background: "rgba(15,155,114,0.12)", color: "var(--ip-teal)", padding: "2px 9px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase" },
  catBrand:      { fontSize: "0.7rem", color: "var(--ip-gray)", fontWeight: 700, textTransform: "uppercase" },
  catName:       { fontSize: "0.98rem", fontWeight: 800 },
  catRef:        { fontSize: "0.71rem", color: "var(--ip-gray)" },
  catMeta:       { fontSize: "0.71rem", color: "var(--ip-gray)" },
  catPrix:       { fontSize: "0.84rem", fontWeight: 700, color: "var(--ip-teal)" },
  catStockRow:   { display: "flex", gap: 4, background: "var(--bg-muted)", borderRadius: 8, padding: "10px", marginTop: 4 },
  catStockCell:  { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  catStockLabel: { fontSize: "0.64rem", color: "var(--ip-gray)", fontWeight: 600, textTransform: "uppercase" },
  catStockVal:   { fontSize: "1.1rem", fontWeight: 900 },
  catAlertBanner:{ background: "#FFF3E0", color: "#E65100", fontSize: "0.71rem", fontWeight: 700, padding: "5px 10px", borderRadius: 6 },

  tableWrapper: { background: "var(--bg)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" },
  table:  { width: "100%", borderCollapse: "collapse", fontSize: "0.81rem" },
  th:     { textAlign: "left", padding: "11px 14px", borderBottom: "2px solid var(--border)", fontWeight: 800, fontSize: "0.72rem", color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", background: "var(--bg-muted)" },
  tr:     { transition: "background 0.12s" },
  td:     { padding: "10px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" },

  lieuxLayout:    { display: "grid", gridTemplateColumns: "265px 1fr", gap: 20, minHeight: 500 },
  lieuxSidebar:   { background: "var(--bg)", borderRadius: 14, padding: 16, border: "1px solid var(--border)", overflowY: "auto", maxHeight: 680 },
  sidebarHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" },
  sidebarTitle:   { fontWeight: 800, fontSize: "0.84rem" },
  lieuGroup:      { marginBottom: 16 },
  lieuGroupTitle: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.69rem", fontWeight: 800, color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, padding: "0 4px" },
  lieuCount:      { background: "var(--bg-muted)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 10, fontSize: "0.64rem" },
  lieuBtn:        { width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", marginBottom: 3, transition: "background 0.12s" },
  lieuBtnActive:  { background: "rgba(15,155,114,0.1)", borderLeft: "3px solid var(--ip-teal)", paddingLeft: 9 },
  lieuBtnName:    { fontSize: "0.83rem", fontWeight: 700 },
  lieuBtnMeta:    { fontSize: "0.68rem", color: "var(--ip-gray)", marginTop: 2 },
  lieuxContent:   { background: "var(--bg)", borderRadius: 14, padding: 20, border: "1px solid var(--border)" },
  lieuHeader:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--border)" },
  lieuTitle:      { fontSize: "1.2rem", fontWeight: 900, margin: 0 },
  lieuSubtitle:   { fontSize: "0.77rem", color: "var(--ip-gray)", marginTop: 4 },
  lieuStats:      { display: "flex", gap: 24 },
  subTabs:        { display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 6 },
  subTabBtn:      { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", fontSize: "0.79rem", color: "var(--ip-gray)", fontWeight: 600 },
  subTabBtnActive:{ background: "rgba(15,155,114,0.1)", color: "var(--ip-teal)" },
  equipsGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 12 },
  equipCard:      { padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 5 },
  equipCardPb:    { borderColor: "rgba(198,40,40,0.5)", background: "rgba(255,235,238,0.15)" },
  equipDesignation:{ fontSize: "0.81rem", fontWeight: 700 },
  equipMeta:      { fontSize: "0.69rem", color: "var(--ip-gray)" },
  postesGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(225px,1fr))", gap: 14 },
  posteCard:      { padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 },
  posteIncomplet: { borderColor: "#C62828", background: "#FFEBEE" },
  posteHeader:    { display: "flex", alignItems: "center", gap: 8 },
  posteName:      { fontWeight: 700, flex: 1, fontSize: "0.87rem" },
  posteCompo:     { display: "flex", flexDirection: "column", gap: 4 },
  compRow:        { display: "flex", justifyContent: "space-between", fontSize: "0.73rem" },
  compType:       { color: "var(--ip-gray)" },
  compEtat:       { fontWeight: 600 },
  posteManquants: { fontSize: "0.7rem", color: "#C62828", fontWeight: 600 },

  mvtPage:           { maxWidth: 620 },
  mvtTypes:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 },
  mvtTypeCard:       { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 16px", border: "2px solid var(--border)", borderRadius: 14, background: "var(--bg)", cursor: "pointer", textAlign: "center" },
  mvtTypeCardActive: { borderColor: "var(--ip-teal)", background: "rgba(15,155,114,0.06)" },
  mvtForm:           { background: "var(--bg)", padding: 22, borderRadius: 14, border: "1px solid var(--border)" },

  pbForm:    { background: "var(--bg)", padding: "16px 20px", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 },
  pbFormRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  pbItem:    { padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, borderLeft: "4px solid #E65100", display: "flex", flexDirection: "column", gap: 6 },
  pbResolu:  { borderLeftColor: "#4CAF50", opacity: 0.72 },
  pbDesc:    { fontSize: "0.8rem" },
  pbMeta:    { fontSize: "0.7rem", color: "var(--ip-gray)" },

  detailGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 },
  detailRow:     { display: "flex", flexDirection: "column", padding: "8px 12px", background: "var(--bg-muted)", borderRadius: 8 },
  detailLabel:   { fontSize: "0.67rem", fontWeight: 800, color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.04em" },
  detailVal:     { fontSize: "0.84rem", fontWeight: 600, marginTop: 2 },
  detailSection: { fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ip-gray)", borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 14 },

  fRow:   { display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 },
  fLabel: { fontSize: "0.71rem", fontWeight: 800, color: "var(--ip-gray)", textTransform: "uppercase", letterSpacing: "0.04em" },
  fInput: { height: 36, border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", fontSize: "0.83rem", background: "var(--bg)", color: "var(--fg)", outline: "none", width: "100%", boxSizing: "border-box" },

  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 },
  modal:       { background: "var(--bg)", borderRadius: 18, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", border: "1px solid var(--border)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  modalBody:   { padding: "18px 20px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },

  toast:   { position: "fixed", bottom: 22, right: 22, display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 500 },
  toastOk: { background: "#2E7D32" },
  toastErr:{ background: "#C62828" },

  hint: { fontSize: "0.79rem", color: "var(--ip-gray)", fontStyle: "italic" },
};