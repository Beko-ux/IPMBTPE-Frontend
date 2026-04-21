// src/pages/ScolaritePage.jsx
// Version adaptée pour AuthenticatedLayout

import { useEffect, useMemo, useState, useCallback } from "react";
import { colors } from "../styles/theme";
import {
  LayoutDashboard, SlidersHorizontal, CalendarClock, Users, Banknote,
  History, BarChart3, ChevronDown, ChevronUp, Save, RefreshCcw,
  AlertCircle, CheckCircle, Clock, Download, Search, X, Eye, Edit3,
  GraduationCap, Wallet, TrendingUp, AlertTriangle, DollarSign,
  ArrowUpRight, ArrowDownRight, Minus,
  CreditCard, Activity, Users2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const cleanStr = (x) => (x ?? "").toString().trim();
const upperTrim = (x) => cleanStr(x).toUpperCase();
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
const fmtShort = (n) => {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
};
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date) ? "—" : date.toLocaleDateString("fr-FR");
};

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════
const T = {
  teal:    "#0F9B72",
  tealLt:  "#EAF9F3",
  tealMd:  "#7ECDB0",
  green:   "#22c55e",
  greenLt: "#dcfce7",
  amber:   "#f59e0b",
  amberLt: "#fef3c7",
  red:     "#ef4444",
  redLt:   "#fee2e2",
  gray:    "#6b7280",
  grayLt:  "#f3f4f6",
  slate:   "#1e293b",
  border:  "#e2e8f0",
  bg:      "#f8fafc",
  card:    "#ffffff",
  purple:  "#8b5cf6",
  purpleLt:"#ede9fe",
  blue:    "#3b82f6",
  blueLt:  "#dbeafe",
  font:    "'Plus Jakarta Sans', sans-serif",
  radius:  14,
  shadow:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:"0 4px 12px rgba(0,0,0,0.08)",
};

// ═══════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════
const STATUS = {
  A_JOUR:        { label: "À jour",        color: T.green,  bg: T.greenLt,  border: "#86efac", Icon: CheckCircle },
  PARTIEL:       { label: "Partiel",       color: T.amber,  bg: T.amberLt,  border: "#fcd34d", Icon: Clock },
  EN_RETARD:     { label: "En retard",     color: T.red,    bg: T.redLt,    border: "#fca5a5", Icon: AlertCircle },
  INCONNU:       { label: "Inconnu",       color: T.gray,   bg: T.grayLt,   border: "#d1d5db", Icon: Eye },
  DEMISSIONNAIRE:{ label: "Démissionnaire",color: T.gray,   bg: T.grayLt,   border: "#d1d5db", Icon: X },
};

const NIVEAUX = ["BTS1","BTS2","LICENCE1","LICENCE2","LICENCE3","MASTER1","MASTER2"];
const FILIERES_MAP = {
  industrielles: "Filières industrielles",
  gestion:       "Filières de gestion",
  juridique:     "Filières juridiques",
};

// ═══════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════

function StatusBadge({ status, size = "sm" }) {
  const cfg = STATUS[status] || STATUS.INCONNU;
  const Icon = cfg.Icon;
  const pad = size === "sm" ? "3px 10px" : "5px 14px";
  const fs  = size === "sm" ? 11 : 13;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontFamily: T.font,
    }}>
      <Icon size={size === "sm" ? 12 : 14} />
      {cfg.label}
    </span>
  );
}

function Pill({ children, color = T.teal, bg = T.tealLt }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, color, background: bg, fontFamily: T.font,
    }}>{children}</span>
  );
}

function Card({ children, style = {}, p = "1.25rem" }) {
  return (
    <div style={{
      background: T.card, borderRadius: T.radius,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      padding: p, fontFamily: T.font, ...style,
    }}>{children}</div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: T.slate, fontFamily: T.font }}>{title}</h2>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: T.gray, fontFamily: T.font }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, Icon: Ico, size = "md", style = {} }) {
  const V = {
    primary:   { bg: T.teal,   color: "#fff",    border: "none",               shadow: `0 4px 10px rgba(15,155,114,0.25)` },
    secondary: { bg: T.card,   color: T.slate,   border: `1px solid ${T.border}`, shadow: T.shadow },
    danger:    { bg: T.redLt,  color: T.red,     border: `1px solid #fca5a5`,   shadow: "none" },
    ghost:     { bg: "transparent", color: T.gray, border: "none",              shadow: "none" },
  };
  const v = V[variant] || V.primary;
  const S = { sm: { padding: "5px 12px", fontSize: 12 }, md: { padding: "9px 16px", fontSize: 13 }, lg: { padding: "12px 24px", fontSize: 14 } };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10,
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1, transition: "all 0.15s",
      fontFamily: T.font, ...v, ...S[size], ...style,
    }}>
      {Ico && <Ico size={size === "lg" ? 18 : 15} />}
      {children}
    </button>
  );
}

function Inp({ label, type = "text", value, onChange, placeholder, style = {}, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.slate, fontFamily: T.font }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        style={{
          height: 40, padding: "0 12px", borderRadius: 9,
          border: `1px solid ${T.border}`, fontSize: 13,
          background: disabled ? T.bg : T.card, outline: "none",
          fontFamily: T.font, color: T.slate, ...style,
        }}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.slate, fontFamily: T.font }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        height: 40, padding: "0 12px", borderRadius: 9,
        border: `1px solid ${T.border}`, fontSize: 13,
        background: T.card, cursor: "pointer", outline: "none",
        fontFamily: T.font, color: T.slate, ...style,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = T.teal, height = 7 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height, background: T.border, borderRadius: height }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.gray, minWidth: 34, fontFamily: T.font }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TABS CONFIG
// ═══════════════════════════════════════════════════════════════════
const MAIN_TABS = [
  { id: "dashboard",  label: "Tableau de bord",  Icon: LayoutDashboard },
  { id: "config",     label: "Configuration",    Icon: SlidersHorizontal },
  { id: "tranches",   label: "Échéancier",       Icon: CalendarClock },
  { id: "classes",    label: "Classes & Suivi",  Icon: Users },
  { id: "paiement",   label: "Saisie Paiement",  Icon: Banknote },
  { id: "historique", label: "Historique",       Icon: History },
  { id: "stats",      label: "Statistiques",     Icon: BarChart3 },
];

// ═══════════════════════════════════════════════════════════════════
// 1. DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════
function DashboardTab({ academicYear }) {
  const [stats, setStats]   = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts]  = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/scolarite/stats/${academicYear}`),
        fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`),
      ]);
      const s = await sRes.json();
      const c = await cRes.json();
      setStats(s);
      setClasses(c);

      const al = [];
      if (s.enRetard > 0)
        al.push({ type: "error",   msg: `${s.enRetard} étudiant(s) en retard de paiement — action requise.` });
      if (s.tauxRecouvrement < 60)
        al.push({ type: "warning", msg: `Taux de recouvrement faible : ${s.tauxRecouvrement}% (objectif ≥ 80%)` });
      const classesRetard = c
        .map(cl => ({ ...cl, nb: cl.students.filter(s => s.scolariteStatus === "EN_RETARD").length }))
        .filter(cl => cl.nb > 0)
        .sort((a,b) => b.nb - a.nb)
        .slice(0, 3);
      if (classesRetard.length)
        al.push({ type: "info", msg: `Classes prioritaires : ${classesRetard.map(cl => `${cl.title} (${cl.nb})`).join(" · ")}` });
      setAlerts(al);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { load(); }, [load]);

  const handleRecalc = async () => {
    if (!confirm("Recalculer tous les statuts ?")) return;
    await fetch(`${API_BASE}/scolarite/recalculate-all/${academicYear}`, { method: "POST" });
    setTimeout(load, 2500);
  };

  if (loading) return <Loading />;
  if (!stats)  return <ErrMsg msg="Erreur de chargement" />;

  // KPIs principaux
  const kpis = [
    {
      label: "Étudiants actifs",
      value: stats.totalEtudiantsActifs ?? 0,
      sub: `+ ${stats.demissionnaire ?? 0} démissionnaire(s)`,
      color: T.teal, bg: T.tealLt, Icon: Users2,
    },
    {
      label: "À jour",
      value: stats.aJour ?? 0,
      sub: stats.totalEtudiantsActifs ? `${Math.round((stats.aJour / stats.totalEtudiantsActifs) * 100)}% des actifs` : "",
      color: T.green, bg: T.greenLt, Icon: CheckCircle,
    },
    {
      label: "Paiement partiel",
      value: stats.partiel ?? 0,
      sub: "Ont commencé à payer la tranche en cours",
      color: T.amber, bg: T.amberLt, Icon: Clock,
    },
    {
      label: "En retard",
      value: stats.enRetard ?? 0,
      sub: "Tranche échue non soldée",
      color: T.red, bg: T.redLt, Icon: AlertCircle,
    },
    {
      label: "Démissionnaires",
      value: stats.demissionnaire ?? 0,
      sub: "Exclus du calcul attendu",
      color: T.gray, bg: T.grayLt, Icon: X,
    },
    {
      label: "Total attendu",
      value: fmtShort(stats.totalAttendu),
      valueFull: fmt(stats.totalAttendu),
      sub: "Scolarité + dossiers + inscription (hors dém.)",
      color: T.blue, bg: T.blueLt, Icon: DollarSign,
      isText: true,
    },
    {
      label: "Total encaissé",
      value: fmtShort(stats.totalPaye),
      valueFull: fmt(stats.totalPaye),
      sub: "Inclut paiements partiels des démissionnaires",
      color: T.teal, bg: T.tealLt, Icon: Wallet,
      isText: true,
    },
    {
      label: "Reste à percevoir",
      value: fmtShort(Math.max(0, stats.totalAttendu - stats.totalPaye)),
      valueFull: fmt(Math.max(0, stats.totalAttendu - stats.totalPaye)),
      sub: "Solde global non encore encaissé",
      color: T.red, bg: T.redLt, Icon: ArrowDownRight,
      isText: true,
    },
    {
      label: "Taux de recouvrement",
      value: `${stats.tauxRecouvrement ?? 0}%`,
      sub: "Montant encaissé / montant attendu × 100",
      color: T.purple, bg: T.purpleLt, Icon: TrendingUp,
      isText: true,
    },
    {
      label: "Montant en retard",
      value: fmtShort(stats.totalRetard ?? 0),
      valueFull: fmt(stats.totalRetard ?? 0),
      sub: "Tranches échues non soldées",
      color: T.red, bg: T.redLt, Icon: AlertTriangle,
      isText: true,
    },
    {
      label: "Taux d'avancement",
      value: `${stats.tauxAvance ?? 0}%`,
      sub: "% d'étudiants ayant au moins commencé à payer",
      color: T.green, bg: T.greenLt, Icon: Activity,
      isText: true,
    },
    {
      label: "Progression moy.",
      value: `${stats.moyenneProgress ?? 0}%`,
      sub: "Moyenne du % payé par étudiant actif",
      color: T.amber, bg: T.amberLt, Icon: ArrowUpRight,
      isText: true,
    },
  ];

  const pieData = [
    { name: "À jour",    value: stats.aJour   || 0, color: T.green },
    { name: "Partiel",   value: stats.partiel  || 0, color: T.amber },
    { name: "En retard", value: stats.enRetard || 0, color: T.red },
    { name: "Inconnu",   value: stats.inconnu  || 0, color: T.gray },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title={`Tableau de bord — ${academicYear}`}
        subtitle="Vue d'ensemble de la scolarité et des finances"
        action={
          <Btn onClick={handleRecalc} variant="secondary" Icon={RefreshCcw} size="sm">
            Recalculer les statuts
          </Btn>
        }
      />

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px", borderRadius: 10,
              background: a.type === "error" ? T.redLt : a.type === "warning" ? T.amberLt : T.blueLt,
              border: `1px solid ${a.type === "error" ? "#fca5a5" : a.type === "warning" ? "#fcd34d" : "#93c5fd"}`,
              fontSize: 13, fontFamily: T.font, color: T.slate,
            }}>
              {a.type === "error"   && <AlertTriangle size={18} color={T.red} />}
              {a.type === "warning" && <AlertCircle   size={18} color={T.amber} />}
              {a.type === "info"    && <GraduationCap size={18} color={T.blue} />}
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        {kpis.map((k, i) => (
          <Card key={i} style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: T.gray, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: k.isText ? "1.4rem" : "2rem", fontWeight: 800, color: k.color, lineHeight: 1 }}
                   title={k.valueFull}>{k.value}</p>
                {k.sub && <p style={{ margin: "5px 0 0", fontSize: 11, color: T.gray, lineHeight: 1.4 }}>{k.sub}</p>}
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <k.Icon size={18} color={k.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Répartition des statuts</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: T.gray, textAlign: "center", padding: 40 }}>Aucune donnée</p>}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Résumé financier</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Total attendu (hors dém.)",  val: fmt(stats.totalAttendu),                                           color: T.slate },
              { label: "Total encaissé",             val: fmt(stats.totalPaye),                                              color: T.teal  },
              { label: "Reste à percevoir",          val: fmt(Math.max(0, stats.totalAttendu - stats.totalPaye)),            color: T.red   },
              { label: "Montant en retard",          val: fmt(stats.totalRetard ?? 0),                                       color: T.red   },
              { label: "Taux de recouvrement",       val: `${stats.tauxRecouvrement ?? 0}%`,                                 color: T.purple},
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: i < 4 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 13, color: T.gray }}>{r.label}</span>
                <strong style={{ fontSize: 13, color: r.color }}>{r.val}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top classes en retard */}
      {classes.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Progression par classe</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {classes.slice(0, 8).map(cl => {
              const total  = cl.students.length;
              const aJour  = cl.students.filter(s => s.scolariteStatus === "A_JOUR").length;
              const retard = cl.students.filter(s => s.scolariteStatus === "EN_RETARD").length;
              const pct = total ? Math.round((aJour / total) * 100) : 0;
              return (
                <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ minWidth: 180, fontSize: 13, fontWeight: 600, color: T.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.title}</span>
                  <div style={{ flex: 1 }}><ProgressBar value={pct} color={retard > 0 ? T.amber : T.teal} /></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Pill color={T.green}  bg={T.greenLt}>{aJour} ✓</Pill>
                    {retard > 0 && <Pill color={T.red} bg={T.redLt}>{retard} !</Pill>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. CONFIGURATION TAB
// ═══════════════════════════════════════════════════════════════════
function ConfigTab({ academicYear }) {
  const [config, setConfig] = useState({
    mode: "filiere", nbTranches: 3,
    filieres: { industrielles: { niveaux: {} }, gestion: { niveaux: {} }, juridique: { niveaux: {} } },
    classesTarifs: {},
  });
  const [classes, setClasses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [activeFiliere, setActiveFiliere] = useState("industrielles");
  const [saving, setSaving]         = useState(false);
  const [original, setOriginal]     = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [cRes, klRes] = await Promise.all([
        fetch(`${API_BASE}/scolarite/config/${academicYear}`),
        fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`),
      ]);
      const cfg = await cRes.json();
      const cls = await klRes.json();
      const filieres = {
        industrielles: { niveaux: {} }, gestion: { niveaux: {} }, juridique: { niveaux: {} },
        ...(cfg.filieres || {}),
      };
      const final = { ...cfg, filieres, classesTarifs: cfg.classesTarifs || {} };
      setConfig(final);
      setOriginal(JSON.parse(JSON.stringify(final)));
      setClasses(cls);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateNiveau = (fil, niv, field, val) => {
    setConfig(prev => ({
      ...prev,
      filieres: {
        ...prev.filieres,
        [fil]: {
          ...prev.filieres[fil],
          niveaux: {
            ...prev.filieres[fil]?.niveaux,
            [niv]: { ...prev.filieres[fil]?.niveaux?.[niv], [field]: Number(val) },
          },
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/scolarite/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, academicYear }),
      });
      setOriginal(JSON.parse(JSON.stringify(config)));
      setEditMode(false);
    } catch (e) { alert("Erreur d'enregistrement"); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (original) setConfig(JSON.parse(JSON.stringify(original)));
    setEditMode(false);
  };

  if (loading) return <Loading />;

  // Compter les niveaux configurés
  const totalNiveauxConfig = Object.values(config.filieres).reduce((acc, f) => {
    return acc + Object.values(f.niveaux || {}).filter(n => (n.scolarite || 0) + (n.inscription || 0) + (n.etudeDossiers || 0) > 0).length;
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title="Configuration des tarifs"
        subtitle={`Mode : ${config.mode === "filiere" ? "Par filière et niveau" : "Par classe"} · ${config.nbTranches} tranches · ${totalNiveauxConfig} niveaux configurés`}
        action={!editMode && <Btn onClick={() => setEditMode(true)} variant="secondary" Icon={Edit3} size="sm">Modifier</Btn>}
      />

      {/* ── VUE ENREGISTRÉE ── */}
      {!editMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(FILIERES_MAP).map(([filKey, filLabel]) => {
            const niveaux = config.filieres[filKey]?.niveaux || {};
            const niveauxActifs = NIVEAUX.filter(n => {
              const v = niveaux[n] || {};
              return (v.etudeDossiers || 0) + (v.inscription || 0) + (v.scolarite || 0) > 0;
            });
            return (
              <Card key={filKey}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                    background: T.tealLt, color: T.teal, textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>{filLabel}</span>
                  <span style={{ fontSize: 12, color: T.gray }}>{niveauxActifs.length} niveau(x) configuré(s)</span>
                </div>
                {niveauxActifs.length === 0 ? (
                  <p style={{ color: T.gray, fontSize: 13, fontStyle: "italic", margin: 0 }}>Aucun tarif configuré pour cette filière.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                    {niveauxActifs.map(niv => {
                      const v = niveaux[niv];
                      const total = (v.etudeDossiers || 0) + (v.inscription || 0) + (v.scolarite || 0);
                      return (
                        <div key={niv} style={{
                          padding: "12px 14px", borderRadius: 10,
                          background: T.bg, border: `1px solid ${T.border}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 13, color: T.slate }}>{niv}</span>
                            <span style={{ fontWeight: 800, fontSize: 13, color: T.teal }}>{fmt(total)}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {[
                              { label: "Étude dossier", val: v.etudeDossiers || 0 },
                              { label: "Inscription",   val: v.inscription   || 0 },
                              { label: "Scolarité",     val: v.scolarite     || 0 },
                            ].map(r => (
                              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.gray }}>
                                <span>{r.label}</span>
                                <span style={{ fontWeight: 600, color: T.slate }}>{fmt(r.val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── MODE ÉDITION ── */}
      {editMode && (
        <Card style={{ border: `2px solid ${T.teal}` }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 800, color: T.teal }}>Modification de la configuration</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Sel
              label="Mode de tarification"
              value={config.mode}
              onChange={e => setConfig({ ...config, mode: e.target.value })}
              options={[
                { value: "filiere", label: "Par filière et niveau" },
                { value: "classe",  label: "Par classe spécifique" },
              ]}
            />
            <Sel
              label="Nombre de tranches"
              value={config.nbTranches}
              onChange={e => setConfig({ ...config, nbTranches: Number(e.target.value) })}
              options={[2,3,4,5].map(n => ({ value: n, label: `${n} tranches` }))}
            />
          </div>

          {/* Sélecteur filière */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {Object.entries(FILIERES_MAP).map(([key, label]) => (
              <button key={key} onClick={() => setActiveFiliere(key)} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: T.font,
                background: activeFiliere === key ? T.teal : T.bg,
                color: activeFiliere === key ? "#fff" : T.gray,
                transition: "all 0.15s",
              }}>{label.replace("Filières ", "")}</button>
            ))}
          </div>

          <p style={{ margin: "0 0 12px", fontSize: 12, color: T.gray }}>
            Filière : <strong>{FILIERES_MAP[activeFiliere]}</strong> — saisissez 0 pour désactiver un niveau.
          </p>

          {/* Table des niveaux */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Niveau", "Étude dossier (FCFA)", "Inscription (FCFA)", "Scolarité (FCFA)", "Total"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: T.slate, borderBottom: `2px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NIVEAUX.map((niv, i) => {
                  const v = config.filieres[activeFiliere]?.niveaux?.[niv] || {};
                  const total = (v.etudeDossiers || 0) + (v.inscription || 0) + (v.scolarite || 0);
                  const isOrig = original?.filieres?.[activeFiliere]?.niveaux?.[niv];
                  const hasChanged = JSON.stringify(v) !== JSON.stringify(isOrig || {});
                  return (
                    <tr key={niv} style={{ background: i % 2 === 0 ? T.card : T.bg, transition: "background 0.1s" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: T.slate }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {niv}
                          {hasChanged && <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.amber, display: "inline-block" }} title="Modifié" />}
                        </span>
                      </td>
                      {["etudeDossiers", "inscription", "scolarite"].map(field => (
                        <td key={field} style={{ padding: "8px 12px" }}>
                          <input
                            type="number" min="0"
                            value={v[field] ?? 0}
                            onChange={e => updateNiveau(activeFiliere, niv, field, e.target.value)}
                            style={{
                              width: 130, height: 36, padding: "0 10px", borderRadius: 8,
                              border: `1px solid ${T.border}`, fontSize: 13,
                              fontFamily: T.font, outline: "none", background: T.card,
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: total > 0 ? T.teal : T.gray }}>
                        {total > 0 ? fmt(total) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Btn onClick={handleSave} disabled={saving} Icon={Save}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            <Btn onClick={handleCancel} variant="secondary">Annuler</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. TRANCHES TAB
// ═══════════════════════════════════════════════════════════════════
function TranchesTab({ academicYear }) {
  const [config, setConfig]       = useState({ mode: "filiere", nbTranches: 3, filieres: {}, classesTarifs: {} });
  const [classes, setClasses]     = useState([]);
  const [mode, setMode]           = useState("filiere"); // "filiere" | "classe"
  const [selFiliere, setSelFiliere] = useState("industrielles");
  const [selClasse, setSelClasse] = useState("");
  const [selNiveau, setSelNiveau] = useState("");
  const [savedTranches, setSaved] = useState([]);
  const [editTranches, setEdit]   = useState([]);
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [cRes, klRes] = await Promise.all([
        fetch(`${API_BASE}/scolarite/config/${academicYear}`),
        fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`),
      ]);
      const cfg = await cRes.json();
      const cls = await klRes.json();
      setConfig(cfg);
      setClasses(cls);
      if (cls.length && !selClasse) setSelClasse(cls[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [academicYear]);

  const loadTranches = useCallback(async () => {
    const params = new URLSearchParams();
    if (mode === "classe" && selClasse) params.set("classKey", selClasse);
    else {
      params.set("filiere", selFiliere);
      if (selNiveau) params.set("niveau", selNiveau);
    }
    try {
      const res = await fetch(`${API_BASE}/scolarite/tranches/${academicYear}?${params}`);
      const data = await res.json();
      setSaved(Array.isArray(data) ? data : []);
    } catch (e) { setSaved([]); }
  }, [academicYear, mode, selFiliere, selClasse, selNiveau]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (!loading) loadTranches(); }, [loading, loadTranches, selFiliere, selClasse, selNiveau, mode]);

  // Calcul du montant de scolarité pour la sélection courante
  const getScolarite = () => {
    if (mode === "filiere") {
      const niveaux = config.filieres?.[selFiliere]?.niveaux || {};
      if (selNiveau) {
        return niveaux[selNiveau]?.scolarite || 0;
      }
      const vals = Object.values(niveaux).map(n => n.scolarite || 0).filter(v => v > 0);
      return vals.length ? Math.max(...vals) : 0;
    }
    return config.classesTarifs?.[selClasse]?.scolarite || 0;
  };

  const totalScolarite = getScolarite();

  const startEdit = () => {
    if (savedTranches.length) {
      setEdit(JSON.parse(JSON.stringify(savedTranches)));
    } else {
      const nb = config.nbTranches || 3;
      const base = Math.floor(totalScolarite / nb);
      const reste = totalScolarite - base * nb;
      setEdit(Array.from({ length: nb }, (_, i) => ({
        numero: i + 1,
        libelle: `Tranche ${i + 1}`,
        montant: i === nb - 1 ? base + reste : base,
        dateLimite: "",
      })));
    }
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { academicYear, tranches: editTranches };
    if (mode === "classe" && selClasse) payload.classKey = selClasse;
    else {
      payload.filiere = selFiliere;
      if (selNiveau) payload.niveau = selNiveau;
    }
    try {
      const res = await fetch(`${API_BASE}/scolarite/tranches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const saved = await res.json();
      setSaved(Array.isArray(saved) ? saved : []);
      setEditMode(false);
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  };

  const updateTranche = (i, field, val) => {
    const t = [...editTranches];
    t[i] = { ...t[i], [field]: field === "montant" ? Number(val) : val };
    setEdit(t);
  };

  if (loading) return <Loading />;

  const totalEdit = editTranches.reduce((a, t) => a + (t.montant || 0), 0);
  const totalSaved = savedTranches.reduce((a, t) => a + (t.montant || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title="Échéancier des paiements"
        subtitle="Définissez les dates et montants des tranches par filière, niveau ou classe"
      />

      {/* Sélecteurs */}
      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>Type d'échéancier</label>
            <div style={{ display: "flex", borderRadius: 9, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              {[["filiere", "Par filière"], ["classe", "Par classe"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setMode(val)} style={{
                  padding: "9px 18px", border: "none", cursor: "pointer",
                  background: mode === val ? T.teal : T.card,
                  color: mode === val ? "#fff" : T.gray,
                  fontSize: 13, fontWeight: 700, fontFamily: T.font,
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          {mode === "filiere" ? (
            <>
              <Sel
                label="Filière"
                value={selFiliere}
                onChange={e => { setSelFiliere(e.target.value); setSelNiveau(""); }}
                options={Object.entries(FILIERES_MAP).map(([k, v]) => ({ value: k, label: v }))}
              />
              <Sel
                label="Niveau"
                value={selNiveau}
                onChange={e => setSelNiveau(e.target.value)}
                options={[
                  { value: "", label: "Tous les niveaux" },
                  ...NIVEAUX.map(n => ({ value: n, label: n }))
                ]}
              />
            </>
          ) : (
            <Sel
              label="Classe"
              value={selClasse}
              onChange={e => setSelClasse(e.target.value)}
              options={classes.map(c => ({ value: c.id, label: c.title }))}
            />
          )}

          <div style={{ fontSize: 13, color: T.gray, alignSelf: "flex-end", paddingBottom: 10 }}>
            Scolarité de référence : <strong style={{ color: T.teal }}>{fmt(totalScolarite)}</strong>
            {mode === "filiere" && !selNiveau && <span style={{ color: T.gray }}> (valeur max du niveau)</span>}
          </div>
        </div>
      </Card>

      {/* Tranches enregistrées groupées par niveau */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.slate }}>
              Échéancier enregistré — {mode === "filiere" ? `${FILIERES_MAP[selFiliere]} ${selNiveau ? `· ${selNiveau}` : ""}` : classes.find(c => c.id === selClasse)?.title || "—"}
            </h3>
            {savedTranches.length > 0 && (
              <p style={{ margin: "3px 0 0", fontSize: 12, color: T.gray }}>
                {savedTranches.length} tranche(s) · Total : {fmt(totalSaved)}
              </p>
            )}
          </div>
          {!editMode && (
            <Btn onClick={startEdit} variant="secondary" Icon={savedTranches.length ? Edit3 : CalendarClock} size="sm">
              {savedTranches.length ? "Modifier" : "Créer un échéancier"}
            </Btn>
          )}
        </div>

        {savedTranches.length === 0 && !editMode ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: T.gray }}>
            <CalendarClock size={36} color={T.border} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 13 }}>Aucun échéancier pour cette sélection.</p>
          </div>
        ) : !editMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Object.entries(
              savedTranches.reduce((acc, t) => {
                const niv = t.niveau || "Sans niveau";
                if (!acc[niv]) acc[niv] = [];
                acc[niv].push(t);
                return acc;
              }, {})
            ).map(([niveau, tranches]) => (
              <div key={niveau}>
                <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: T.slate, display: "flex", alignItems: "center", gap: 8 }}>
                  {niveau}
                  <span style={{ fontSize: 12, fontWeight: 400, color: T.gray }}>
                    {tranches.length} tranche(s) · Total : {fmt(tranches.reduce((a, t) => a + (t.montant || 0), 0))}
                  </span>
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tranches.map((t, i) => (
                    <div key={t.id || i} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "12px 14px", borderRadius: 10, background: T.bg,
                      border: `1px solid ${T.border}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: T.teal,
                        color: "#fff", display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                      }}>{t.numero}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.slate }}>{t.libelle}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.teal }}>{fmt(t.montant)}</span>
                      <span style={{ fontSize: 12, color: T.gray, minWidth: 100 }}>
                        {t.dateLimite ? `≤ ${fmtDate(t.dateLimite)}` : "Pas de date limite"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ textAlign: "right", fontWeight: 800, color: T.slate, fontSize: 13, marginTop: 4, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              Total général : {fmt(totalSaved)}
            </div>
          </div>
        )}
      </Card>

      {/* Éditeur */}
      {editMode && (
        <Card style={{ border: `2px solid ${T.teal}` }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800, color: T.teal }}>
            {savedTranches.length ? "Modifier" : "Créer"} l'échéancier
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {editTranches.map((t, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "40px 1fr 160px 180px",
                gap: 10, alignItems: "end",
                padding: "12px 14px", borderRadius: 10, background: T.bg,
                border: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: T.teal,
                  color: "#fff", display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 800,
                }}>{t.numero}</div>
                <Inp
                  label="Libellé"
                  value={t.libelle}
                  onChange={e => updateTranche(i, "libelle", e.target.value)}
                />
                <Inp
                  label="Montant (FCFA)"
                  type="number"
                  value={t.montant}
                  onChange={e => updateTranche(i, "montant", e.target.value)}
                />
                <Inp
                  label="Date limite"
                  type="date"
                  value={t.dateLimite || ""}
                  onChange={e => updateTranche(i, "dateLimite", e.target.value)}
                />
              </div>
            ))}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 16, padding: "12px 14px", borderRadius: 10,
            background: T.tealLt, border: `1px solid ${T.tealMd}`,
          }}>
            <span style={{ fontSize: 13, color: T.teal }}>
              Total : <strong>{fmt(totalEdit)}</strong>
              {totalScolarite > 0 && totalEdit !== totalScolarite && (
                <span style={{ color: T.amber, marginLeft: 8 }}>
                  (diff. avec scolarité : {fmt(Math.abs(totalEdit - totalScolarite))})
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setEditMode(false)} variant="secondary">Annuler</Btn>
              <Btn onClick={handleSave} disabled={saving} Icon={Save}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. CLASSES & SUIVI TAB
// ═══════════════════════════════════════════════════════════════════
function ClassesTab({ academicYear }) {
  const [classes, setClasses]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [openClass, setOpenClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filters, setFilters]     = useState({ search: "", cycle: "all", status: "all" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`);
      setClasses(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleDem = async (studentId, value) => {
    try {
      await fetch(`${API_BASE}/scolarite/toggle-demissionnaire/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demissionnaire: value }),
      });
      loadData();
    } catch (e) { alert("Erreur"); }
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (filters.cycle !== "all" && upperTrim(c.cycle) !== upperTrim(filters.cycle)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const inTitle = c.title.toLowerCase().includes(q);
        const inStudents = c.students.some(s =>
          s.fullName.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q)
        );
        if (!inTitle && !inStudents) return false;
      }
      if (filters.status !== "all") {
        return c.students.some(s => s.scolariteStatus === filters.status);
      }
      return true;
    });
  }, [classes, filters]);

  // Stats globales
  const globalStats = useMemo(() => {
    let aJour = 0, partiel = 0, retard = 0, dem = 0, total = 0;
    filteredClasses.forEach(c => {
      c.students.forEach(s => {
        total++;
        if (s.demissionnaire) dem++;
        else if (s.scolariteStatus === "A_JOUR")    aJour++;
        else if (s.scolariteStatus === "PARTIEL")   partiel++;
        else if (s.scolariteStatus === "EN_RETARD") retard++;
      });
    });
    return { aJour, partiel, retard, dem, total };
  }, [filteredClasses]);

  const exportCSV = () => {
    const rows = [];
    filteredClasses.forEach(c => c.students.forEach(s => rows.push({
      Classe: c.title, Matricule: s.matricule, Nom: s.fullName,
      Statut: STATUS[s.scolariteStatus]?.label || s.scolariteStatus,
      Démissionnaire: s.demissionnaire ? "Oui" : "Non",
      "Total Attendu": s.totalAttendu, "Total Payé": s.totalPaye,
      Solde: s.solde, "Progression %": s.progress,
    })));
    if (!rows.length) return;
    const csv = [Object.keys(rows[0]).join(";"), ...rows.map(r => Object.values(r).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = `scolarite_${academicYear}.csv`;
    a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader
        title="Classes & Suivi"
        subtitle={`${filteredClasses.length} classe(s) affichée(s)`}
        action={<Btn onClick={exportCSV} variant="secondary" Icon={Download} size="sm">Exporter CSV</Btn>}
      />

      {/* Compteurs globaux */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {[
          { label: "Total", val: globalStats.total, color: T.slate, bg: T.bg },
          { label: "À jour",    val: globalStats.aJour,   color: T.green, bg: T.greenLt },
          { label: "Partiel",   val: globalStats.partiel,  color: T.amber, bg: T.amberLt },
          { label: "En retard", val: globalStats.retard,   color: T.red,   bg: T.redLt   },
          { label: "Dém.",      val: globalStats.dem,      color: T.gray,  bg: T.grayLt  },
        ].map(k => (
          <div key={k.label} style={{
            padding: "12px 14px", borderRadius: 10, background: k.bg,
            textAlign: "center", border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: k.color, opacity: 0.8 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <Card p="14px">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
            border: `1px solid ${T.border}`, borderRadius: 9, background: T.card, flex: 1, minWidth: 200,
          }}>
            <Search size={15} color={T.gray} />
            <input
              placeholder="Rechercher étudiant ou classe..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              style={{ border: "none", outline: "none", fontSize: 13, padding: "9px 0", background: "transparent", flex: 1, fontFamily: T.font }}
            />
            {filters.search && <button onClick={() => setFilters({ ...filters, search: "" })} style={{ border: "none", background: "none", cursor: "pointer", color: T.gray }}><X size={14} /></button>}
          </div>
          <Sel value={filters.cycle} onChange={e => setFilters({ ...filters, cycle: e.target.value })}
            options={[{ value: "all", label: "Tous cycles" }, { value: "BTS", label: "BTS" }, { value: "LICENCE", label: "Licence" }, { value: "MASTER", label: "Master" }]}
          />
          <Sel value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "all",         label: "Tous statuts"   },
              { value: "A_JOUR",      label: "À jour"         },
              { value: "PARTIEL",     label: "Partiel"        },
              { value: "EN_RETARD",   label: "En retard"      },
              { value: "DEMISSIONNAIRE", label: "Démissionnaire" },
            ]}
          />
        </div>
      </Card>

      {loading ? <Loading /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredClasses.map(c => (
            <ClassCard
              key={c.id}
              cls={c}
              isOpen={openClass === c.id}
              onToggle={() => setOpenClass(openClass === c.id ? null : c.id)}
              onSelectStudent={setSelectedStudent}
              onToggleDem={handleToggleDem}
              searchQuery={filters.search}
            />
          ))}
        </div>
      )}

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          academicYear={academicYear}
          onClose={() => setSelectedStudent(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function ClassCard({ cls, isOpen, onToggle, onSelectStudent, onToggleDem, searchQuery }) {
  const stats = useMemo(() => {
    const s = { total: 0, aJour: 0, partiel: 0, retard: 0, dem: 0, totalAttendu: 0, totalPaye: 0 };
    cls.students.forEach(st => {
      s.total++;
      s.totalAttendu += st.totalAttendu || 0;
      s.totalPaye    += st.totalPaye    || 0;
      if (st.demissionnaire)                      s.dem++;
      else if (st.scolariteStatus === "A_JOUR")   s.aJour++;
      else if (st.scolariteStatus === "PARTIEL")  s.partiel++;
      else if (st.scolariteStatus === "EN_RETARD") s.retard++;
    });
    s.pct = s.total > 0 ? Math.round((s.aJour / s.total) * 100) : 0;
    return s;
  }, [cls]);

  const displayStudents = useMemo(() => {
    if (!searchQuery) return cls.students;
    const q = searchQuery.toLowerCase();
    return cls.students.filter(s =>
      s.fullName.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q)
    );
  }, [cls.students, searchQuery]);

  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
      {/* Header */}
      <div onClick={onToggle} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px", cursor: "pointer",
        background: isOpen ? T.tealLt : T.card,
        borderBottom: isOpen ? `1px solid ${T.tealMd}` : "none",
        transition: "background 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.teal, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <GraduationCap size={17} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.slate }}>{cls.title}</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.gray }}>{cls.filiere} · {stats.total} étudiant(s)</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.green,  background: T.greenLt, padding: "3px 10px", borderRadius: 999 }}>{stats.aJour} OK</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.amber,  background: T.amberLt, padding: "3px 10px", borderRadius: 999 }}>{stats.partiel} Partiel</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.red,    background: T.redLt,   padding: "3px 10px", borderRadius: 999 }}>{stats.retard} Retard</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.gray,   background: T.grayLt,  padding: "3px 10px", borderRadius: 999 }}>{stats.dem} Dém.</span>
          <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
          {isOpen ? <ChevronUp size={18} color={T.gray} /> : <ChevronDown size={18} color={T.gray} />}
        </div>
      </div>

      {/* Table */}
      {isOpen && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: T.font }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Matricule","Nom complet","Statut","Attendu","Payé","Solde","Progression","Dém.",""].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.gray, borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((s, i) => (
                <tr key={s.id} style={{ opacity: s.demissionnaire ? 0.55 : 1, background: i % 2 === 0 ? T.card : T.bg }}>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: T.gray }}>{s.matricule}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: T.slate, whiteSpace: "nowrap" }}>{s.fullName}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={s.demissionnaire ? "DEMISSIONNAIRE" : s.scolariteStatus} />
                  </td>
                  <td style={{ padding: "10px 12px", color: T.slate, whiteSpace: "nowrap" }}>{fmt(s.totalAttendu || 0)}</td>
                  <td style={{ padding: "10px 12px", color: T.teal, fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(s.totalPaye || 0)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: s.solde > 0 ? T.red : T.green, whiteSpace: "nowrap" }}>{fmt(s.solde || 0)}</td>
                  <td style={{ padding: "10px 12px", minWidth: 120 }}><ProgressBar value={s.progress || 0} color={s.scolariteStatus === "EN_RETARD" ? T.red : T.teal} /></td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <input type="checkbox" checked={s.demissionnaire || false}
                      onChange={e => onToggleDem(s.id, e.target.checked)}
                      style={{ cursor: "pointer", width: 15, height: 15 }}
                    />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => onSelectStudent(s)} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`,
                      background: T.card, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      color: T.slate, fontFamily: T.font,
                    }}>
                      <Eye size={13} /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. SAISIE PAIEMENT TAB
// ═══════════════════════════════════════════════════════════════════
function PaiementTab({ academicYear }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("matricule");
  const [student, setStudent]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg]     = useState(false);
  const [form, setForm]             = useState({
    montant: "", datePaiement: new Date().toISOString().split("T")[0],
    modePaiement: "ESPÈCES", reference: "", commentaire: "", typeFrais: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`)
      .then(r => r.json())
      .then(cls => {
        const students = cls.flatMap(c => c.students.map(s => ({ ...s, classeTitle: c.title })));
        setAllStudents(students);
      })
      .catch(console.error);
  }, [academicYear]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSuggestions([]); return; }
    const q = searchTerm.toLowerCase();
    const found = allStudents.filter(s =>
      searchType === "matricule"
        ? s.matricule.toLowerCase().includes(q)
        : s.fullName.toLowerCase().includes(q)
    ).slice(0, 6);
    setSuggestions(found);
  }, [searchTerm, searchType, allStudents]);

  const selectStudent = async (s) => {
    setShowSugg(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/scolarite/status/${s.id}/${academicYear}`);
      const detail = await res.json();
      setStudent({ ...s, ...detail });
    } catch (e) { alert("Erreur de chargement"); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    const q = searchTerm.toLowerCase();
    const found = allStudents.find(s =>
      searchType === "matricule"
        ? s.matricule.toLowerCase() === q
        : s.fullName.toLowerCase().includes(q)
    );
    if (found) { await selectStudent(found); }
    else alert("Étudiant non trouvé. Vérifiez le matricule ou le nom.");
  };

  const handleSubmit = async () => {
    if (!student || !form.montant) return;
    if (Number(form.montant) <= 0) { alert("Montant doit être > 0"); return; }
    if (student.demissionnaire) { alert("Étudiant démissionnaire — aucun paiement possible."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/scolarite/paiements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          academicYear,
          montant: Number(form.montant),
          datePaiement: form.datePaiement,
          modePaiement: form.modePaiement,
          reference: form.reference,
          commentaire: form.commentaire,
          typeFrais: form.typeFrais || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erreur serveur"); }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await selectStudent(student);
      setForm(prev => ({ ...prev, montant: "", reference: "", commentaire: "" }));
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSubmitting(false); }
  };

  const solde = student?.resume?.solde ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Saisie d'un paiement" subtitle="Recherchez un étudiant et enregistrez son versement" />

      {/* Recherche */}
      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: T.slate }}>Recherche étudiant</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Sel
            value={searchType}
            onChange={e => { setSearchType(e.target.value); setSearchTerm(""); setStudent(null); }}
            options={[{ value: "matricule", label: "Par matricule" }, { value: "nom", label: "Par nom" }]}
            style={{ width: 160 }}
          />
          <div style={{ flex: 1, position: "relative", minWidth: 240 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
              border: `1px solid ${T.border}`, borderRadius: 9, background: T.card,
            }}>
              <Search size={15} color={T.gray} />
              <input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSugg(true); }}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                onFocus={() => setShowSugg(true)}
                placeholder={searchType === "matricule" ? "Ex: 2024-GES-001" : "Nom de l'étudiant..."}
                style={{ border: "none", outline: "none", fontSize: 13, padding: "10px 0", background: "transparent", flex: 1, fontFamily: T.font }}
              />
              {searchTerm && <button onClick={() => { setSearchTerm(""); setStudent(null); setSuggestions([]); }} style={{ border: "none", background: "none", cursor: "pointer", color: T.gray }}><X size={14} /></button>}
            </div>
            {showSugg && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 9,
                boxShadow: T.shadowMd, marginTop: 4, overflow: "hidden",
              }}>
                {suggestions.map(s => (
                  <button key={s.id} onClick={() => { setSearchTerm(searchType === "matricule" ? s.matricule : s.fullName); selectStudent(s); setShowSugg(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", border: "none", background: T.card,
                    cursor: "pointer", textAlign: "left", fontFamily: T.font,
                    borderBottom: `1px solid ${T.border}`,
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = T.tealLt}
                    onMouseLeave={e => e.currentTarget.style.background = T.card}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.tealLt, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Users size={14} color={T.teal} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.slate }}>{s.fullName}</div>
                      <div style={{ fontSize: 11, color: T.gray }}>{s.matricule} · {s.classeTitle}</div>
                    </div>
                    <StatusBadge status={s.demissionnaire ? "DEMISSIONNAIRE" : s.scolariteStatus} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Btn onClick={handleSearch} disabled={loading} Icon={Search}>{loading ? "Recherche..." : "Rechercher"}</Btn>
        </div>
      </Card>

      {/* Profil étudiant */}
      {student && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ borderTop: `4px solid ${STATUS[student.status || student.scolariteStatus]?.color || T.teal}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.tealLt, display: "grid", placeItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.teal }}>
                  {(student.fullName || "?")[0]}
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.slate }}>{student.fullName}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: T.gray }}>{student.matricule}</p>
              </div>
            </div>
            <StatusBadge status={student.demissionnaire ? "DEMISSIONNAIRE" : (student.status || student.scolariteStatus)} size="md" />
            {!student.demissionnaire && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Total attendu", val: fmt(student.resume?.totalAttendu || 0), color: T.slate },
                  { label: "Total payé",    val: fmt(student.resume?.totalPaye    || 0), color: T.teal  },
                  { label: "Solde restant", val: fmt(solde),                              color: solde > 0 ? T.red : T.green },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.gray }}>{r.label}</span>
                    <strong style={{ fontSize: 12, color: r.color }}>{r.val}</strong>
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>
                  <p style={{ margin: "0 0 5px", fontSize: 12, color: T.gray }}>Progression</p>
                  <ProgressBar value={student.progress || 0} />
                </div>
                {student.tranches?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: T.slate }}>État des tranches</p>
                    {student.tranches.map(t => (
                      <div key={t.numero} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 0", borderBottom: `1px solid ${T.border}`,
                      }}>
                        <span style={{ fontSize: 12, color: T.gray }}>{t.libelle}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: t.paye >= t.montant ? T.green : T.amber }}>
                            {fmt(t.paye)}/{fmt(t.montant)}
                          </span>
                          {t.estEchue && t.paye < t.montant && <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>ÉCHUE</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {!student.demissionnaire ? (
            <Card>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: T.slate }}>Enregistrer un versement</h3>

              {success && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, background: T.greenLt, border: `1px solid #86efac`,
                  marginBottom: 16, fontSize: 13, color: T.green, fontWeight: 600,
                }}>
                  <CheckCircle size={18} /> Paiement enregistré avec succès !
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Inp label="Montant (FCFA) *" type="number" value={form.montant}
                  onChange={e => setForm({ ...form, montant: e.target.value })}
                  placeholder="Ex: 50000"
                />
                <Inp label="Date de paiement" type="date" value={form.datePaiement}
                  onChange={e => setForm({ ...form, datePaiement: e.target.value })}
                />
                <Sel label="Mode de paiement" value={form.modePaiement}
                  onChange={e => setForm({ ...form, modePaiement: e.target.value })}
                  options={["ESPÈCES","VIREMENT","CHEQUE","MOBILE MONEY","CARTE"].map(m => ({ value: m, label: m }))}
                />
                <Inp label="Référence / Reçu" value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                  placeholder="N° de reçu ou référence..."
                />
                <Sel label="Type de frais (optionnel)" value={form.typeFrais}
                  onChange={e => setForm({ ...form, typeFrais: e.target.value })}
                  options={[
                    { value: "",              label: "Non spécifié (réparti auto.)" },
                    { value: "etudeDossiers", label: "Étude de dossier" },
                    { value: "inscription",   label: "Inscription" },
                    { value: "scolarite",     label: "Scolarité (tranche)" },
                  ]}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>Commentaire</label>
                  <textarea value={form.commentaire}
                    onChange={e => setForm({ ...form, commentaire: e.target.value })}
                    placeholder="Observation..."
                    style={{
                      padding: "8px 12px", borderRadius: 9, border: `1px solid ${T.border}`,
                      fontSize: 13, fontFamily: T.font, resize: "vertical", minHeight: 40,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <div style={{ fontSize: 13, color: T.gray }}>
                  {form.montant && (
                    <>Nouveau solde estimé : <strong style={{ color: Math.max(0, solde - Number(form.montant)) > 0 ? T.red : T.green }}>
                      {fmt(Math.max(0, solde - Number(form.montant)))}
                    </strong></>
                  )}
                </div>
                <Btn onClick={handleSubmit} disabled={submitting || !form.montant} Icon={CreditCard} size="lg">
                  {submitting ? "Enregistrement..." : "Enregistrer le paiement"}
                </Btn>
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.gray }}>
                <X size={40} color={T.border} style={{ marginBottom: 12 }} />
                <h3 style={{ margin: "0 0 8px", color: T.slate }}>Étudiant démissionnaire</h3>
                <p style={{ margin: 0, fontSize: 13 }}>Aucun paiement ne peut être enregistré pour cet étudiant.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. HISTORIQUE TAB
// ═══════════════════════════════════════════════════════════════════
function HistoriqueTab({ academicYear }) {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/scolarite/paiements/all/${academicYear}`),
          fetch(`${API_BASE}/scolarite/classes?year=${academicYear}`),
        ]);
        const pData = await pRes.json();
        const cData = await cRes.json();
        const map = new Map();
        cData.forEach(c => c.students.forEach(s => map.set(s.id, { name: s.fullName, mat: s.matricule, dem: s.demissionnaire })));
        const enriched = (Array.isArray(pData) ? pData : []).map(p => ({
          ...p,
          studentName: map.get(p.studentId)?.name || "Inconnu",
          studentMat:  map.get(p.studentId)?.mat  || "—",
          isDem:       map.get(p.studentId)?.dem  || false,
        })).sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement));
        setPaiements(enriched);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [academicYear]);

  const filtered = useMemo(() => {
    if (!search) return paiements;
    const q = search.toLowerCase();
    return paiements.filter(p =>
      p.studentName.toLowerCase().includes(q) ||
      p.studentMat.toLowerCase().includes(q) ||
      (p.reference || "").toLowerCase().includes(q)
    );
  }, [paiements, search]);

  const totalFiltered = filtered.reduce((a, p) => a + (p.montant || 0), 0);
  const typeFraisLabel = (t) => t === "etudeDossiers" ? "Étude dossier" : t === "inscription" ? "Inscription" : t === "scolarite" ? "Scolarité" : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader
        title="Historique des paiements"
        subtitle={`${paiements.length} paiement(s) enregistré(s) · Total : ${fmt(paiements.reduce((a, p) => a + (p.montant || 0), 0))}`}
      />
      <Card p="12px">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${T.border}`, borderRadius: 9, background: T.card }}>
          <Search size={15} color={T.gray} />
          <input
            placeholder="Rechercher par nom, matricule ou référence..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, padding: "10px 0", background: "transparent", flex: 1, fontFamily: T.font }}
          />
        </div>
      </Card>
      {filtered.length > 0 && search && (
        <p style={{ margin: 0, fontSize: 12, color: T.gray }}>{filtered.length} résultat(s) · Sous-total : <strong>{fmt(totalFiltered)}</strong></p>
      )}
      {loading ? <Loading /> : (
        <Card p="0">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: T.font }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Date","Étudiant","Matricule","Montant","Mode","Type","Référence"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: T.gray, fontSize: 11, borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? T.card : T.bg, opacity: p.isDem ? 0.6 : 1 }}>
                    <td style={{ padding: "11px 14px", color: T.gray, whiteSpace: "nowrap" }}>{fmtDate(p.datePaiement)}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: T.slate }}>{p.studentName}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: T.gray }}>{p.studentMat}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: T.teal, whiteSpace: "nowrap" }}>{fmt(p.montant)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <Pill color={T.blue} bg={T.blueLt}>{p.modePaiement}</Pill>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.gray }}>{typeFraisLabel(p.typeFrais)}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: T.gray }}>{p.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.gray }}>
              <History size={36} color={T.border} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0 }}>Aucun paiement trouvé.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 7. STATISTIQUES TAB
// ═══════════════════════════════════════════════════════════════════
function StatsTab({ academicYear }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/scolarite/financial-stats/${academicYear}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [academicYear]);

  if (loading) return <Loading />;
  if (!data) return <ErrMsg msg="Impossible de charger les statistiques" />;

  const { monthlyData = [], remainingByClass = [], recoveryRateByClass = [], forecast = {} } = data;

  const CHART_COLORS = [T.teal, T.blue, T.purple, T.amber, T.green, "#f43f5e", "#06b6d4"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader title="Statistiques financières" subtitle="Évolution des encaissements, taux de recouvrement et prévisions" />

      {/* Prévisions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Prévision 30 jours", val: forecast.next30 || 0, color: T.teal,   Icon: TrendingUp },
          { label: "Prévision 60 jours", val: forecast.next60 || 0, color: T.amber,  Icon: Activity   },
          { label: "Prévision 90 jours", val: forecast.next90 || 0, color: T.purple, Icon: BarChart3  },
        ].map(f => (
          <Card key={f.label} style={{ borderTop: `3px solid ${f.color}`, textAlign: "center" }}>
            <f.Icon size={24} color={f.color} style={{ marginBottom: 8 }} />
            <p style={{ margin: "0 0 4px", fontSize: 12, color: T.gray }}>{f.label}</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: f.color }} title={fmt(f.val)}>{fmtShort(f.val)} FCFA</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: T.gray }}>Basé sur la moy. des 3 derniers mois</p>
          </Card>
        ))}
      </div>

      {/* Évolution mensuelle */}
      {monthlyData.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Évolution des encaissements mensuels</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T.teal} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={T.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: T.gray }} />
              <YAxis tickFormatter={v => `${fmtShort(v)}`} tick={{ fontSize: 12, fill: T.gray }} />
              <Tooltip formatter={v => [fmt(v), "Encaissé"]} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: T.font }} />
              <Area type="monotone" dataKey="total" stroke={T.teal} strokeWidth={2.5} fill="url(#gradTeal)" dot={{ fill: T.teal, r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Reste à payer par classe */}
      {remainingByClass.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Reste à percevoir par classe (top 10)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={remainingByClass.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fontSize: 12, fill: T.gray }} />
              <YAxis type="category" dataKey="className" width={160} tick={{ fontSize: 11, fill: T.gray }} />
              <Tooltip formatter={v => [fmt(v), "Reste à payer"]} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: T.font }} />
              <Bar dataKey="reste" fill={T.red} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Taux de recouvrement */}
      {recoveryRateByClass.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.slate }}>Taux de recouvrement par classe</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recoveryRateByClass} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="className" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 11, fill: T.gray }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: T.gray }} />
              <Tooltip formatter={v => [`${v.toFixed(1)}%`, "Taux"]} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: T.font }} />
              <Bar dataKey="taux" radius={[6, 6, 0, 0]}>
                {recoveryRateByClass.map((e, i) => (
                  <Cell key={i} fill={e.taux >= 80 ? T.green : e.taux >= 50 ? T.amber : T.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
            {[{ color: T.green, label: "≥ 80% — Excellent" }, { color: T.amber, label: "50–79% — Moyen" }, { color: T.red, label: "< 50% — Faible" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.gray }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} /> {l.label}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ÉTUDIANT
// ═══════════════════════════════════════════════════════════════════
function StudentModal({ student, academicYear, onClose, onUpdate }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab]       = useState("overview");

  useEffect(() => {
    fetch(`${API_BASE}/scolarite/status/${student.id}/${academicYear}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(console.error);
  }, [student.id, academicYear]);

  if (!detail) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <Card style={{ padding: 40 }}><Loading /></Card>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: 16, width: "90%", maxWidth: 680,
        maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        fontFamily: T.font,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.slate }}>{student.fullName}</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.gray }}>{student.matricule} · {student.classeTitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusBadge status={detail.status} size="md" />
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.gray, display: "flex" }}><X size={22} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 20px", borderBottom: `1px solid ${T.border}` }}>
          {[["overview","Vue d'ensemble"],["tranches","Tranches"],["historique","Historique"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "12px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: T.font,
              color: tab === id ? T.teal : T.gray,
              borderBottom: tab === id ? `2px solid ${T.teal}` : "2px solid transparent",
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {tab === "overview" && (
            <div>
              {detail.status === "DEMISSIONNAIRE" ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: T.gray }}>
                  <X size={40} color={T.border} style={{ marginBottom: 12 }} />
                  <h3 style={{ margin: 0, color: T.slate }}>Étudiant démissionnaire</h3>
                  <p style={{ margin: "8px 0 0", fontSize: 13 }}>Exclu du calcul de scolarité.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: "Total attendu", val: fmt(detail.resume?.totalAttendu || 0), color: T.slate },
                      { label: "Total payé",    val: fmt(detail.resume?.totalPaye    || 0), color: T.teal  },
                      { label: "Solde restant", val: fmt(detail.resume?.solde        || 0), color: (detail.resume?.solde || 0) > 0 ? T.red : T.green },
                    ].map(r => (
                      <div key={r.label} style={{ padding: 14, borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`, textAlign: "center" }}>
                        <p style={{ margin: "0 0 6px", fontSize: 11, color: T.gray }}>{r.label}</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: r.color }}>{r.val}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: T.slate }}>Progression globale</p>
                    <ProgressBar value={detail.progress || 0} height={10} />
                  </div>
                  <h4 style={{ margin: "16px 0 10px", fontSize: 13, fontWeight: 700, color: T.slate }}>Détail par type de frais</h4>
                  {Object.entries(detail.details || {}).map(([key, val]) => {
                    const labels = { etudeDossiers: "Étude de dossier", inscription: "Inscription", scolarite: "Scolarité" };
                    const pct = val.attendu > 0 ? Math.round((val.paye / val.attendu) * 100) : 0;
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: T.gray }}>{labels[key]}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{fmt(val.paye)} / {fmt(val.attendu)}</span>
                        </div>
                        <ProgressBar value={pct} color={pct >= 100 ? T.green : T.teal} />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab === "tranches" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(detail.tranches || []).length === 0 ? (
                <p style={{ color: T.gray, textAlign: "center" }}>Aucune tranche définie.</p>
              ) : (detail.tranches || []).map(t => (
                <div key={t.numero} style={{
                  padding: "14px 16px", borderRadius: 10,
                  border: `1px solid ${t.statut === "PAYÉ" ? "#86efac" : t.estEchue && t.paye < t.montant ? "#fca5a5" : T.border}`,
                  background: t.statut === "PAYÉ" ? T.greenLt : t.estEchue && t.paye < t.montant ? T.redLt : T.bg,
                  borderLeft: `4px solid ${t.paye >= t.montant ? T.green : t.estEchue ? T.red : T.amber}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 13, color: T.slate }}>{t.libelle}</strong>
                    <div style={{ display: "flex", gap: 8 }}>
                      {t.estEchue && t.paye < t.montant && <Pill color={T.red} bg={T.redLt}>ÉCHUE</Pill>}
                      <Pill
                        color={t.paye >= t.montant ? T.green : t.paye > 0 ? T.amber : T.gray}
                        bg={t.paye >= t.montant ? T.greenLt : t.paye > 0 ? T.amberLt : T.grayLt}
                      >{t.statut || "EN ATTENTE"}</Pill>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.gray }}>
                    <span>Montant : <strong style={{ color: T.slate }}>{fmt(t.montant)}</strong></span>
                    <span>Payé : <strong style={{ color: T.teal }}>{fmt(t.paye)}</strong></span>
                    <span>Reste : <strong style={{ color: t.reste > 0 ? T.red : T.green }}>{fmt(t.reste)}</strong></span>
                    {t.dateLimite && <span>Échéance : <strong style={{ color: T.slate }}>{fmtDate(t.dateLimite)}</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "historique" && (
            <HistoriquePaiementsStudent studentId={student.id} academicYear={academicYear} />
          )}
        </div>
      </div>
    </div>
  );
}

function HistoriquePaiementsStudent({ studentId, academicYear }) {
  const [paiements, setPaiements] = useState([]);
  useEffect(() => {
    fetch(`${API_BASE}/scolarite/paiements/${studentId}/${academicYear}`)
      .then(r => r.json())
      .then(d => setPaiements(Array.isArray(d) ? d : (d?.paiements || [])))
      .catch(() => setPaiements([]));
  }, [studentId, academicYear]);

  if (!paiements.length) return <p style={{ color: T.gray, textAlign: "center" }}>Aucun paiement enregistré.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {paiements.map(p => (
        <div key={p.id} style={{ padding: "12px 14px", borderRadius: 10, background: T.bg, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.teal }}>{fmt(p.montant)}</span>
            <span style={{ fontSize: 12, color: T.gray }}>{fmtDate(p.datePaiement)}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Pill color={T.blue} bg={T.blueLt}>{p.modePaiement}</Pill>
            {p.typeFrais && <Pill color={T.purple} bg={T.purpleLt}>{p.typeFrais === "etudeDossiers" ? "Étude dossier" : p.typeFrais === "inscription" ? "Inscription" : "Scolarité"}</Pill>}
            {p.reference && <span style={{ fontSize: 11, color: T.gray }}>Réf : {p.reference}</span>}
          </div>
          {p.commentaire && <p style={{ margin: "6px 0 0", fontSize: 12, color: T.gray }}>{p.commentaire}</p>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UTILS COMPOSANTS
// ═══════════════════════════════════════════════════════════════════
function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", flexDirection: "column", gap: 12, color: T.gray }}>
      <RefreshCcw size={32} color={T.teal} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, fontFamily: T.font }}>Chargement...</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
function ErrMsg({ msg }) {
  return <div style={{ padding: "40px 0", textAlign: "center", color: T.red, fontSize: 13, fontFamily: T.font }}>{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL (adapté pour AuthenticatedLayout)
// ═══════════════════════════════════════════════════════════════════
export default function ScolaritePage({ academicYear = "2025-2026", onNavigate }) {
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [selectedYear, setSelectedYear] = useState(academicYear);

  const renderTab = () => {
    const props = { academicYear: selectedYear };
    switch (activeTab) {
      case "dashboard":  return <DashboardTab  {...props} />;
      case "config":     return <ConfigTab     {...props} />;
      case "tranches":   return <TranchesTab   {...props} />;
      case "classes":    return <ClassesTab    {...props} />;
      case "paiement":   return <PaiementTab   {...props} />;
      case "historique": return <HistoriqueTab {...props} />;
      case "stats":      return <StatsTab      {...props} />;
      default:           return <DashboardTab  {...props} />;
    }
  };

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", fontFamily: T.font }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: T.slate }}>Gestion de Scolarité</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: T.gray }}>Suivi des paiements et finances académiques</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.gray }}>Année :</label>
          <input
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{
              height: 36, padding: "0 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 13, background: T.card,
              fontWeight: 700, color: T.slate, outline: "none", width: 110,
            }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex", gap: 4, flexWrap: "wrap",
        borderBottom: `2px solid ${T.border}`, marginBottom: "1.5rem",
      }}>
        {MAIN_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 18px", border: "none", cursor: "pointer",
              borderRadius: "10px 10px 0 0",
              fontSize: 13, fontWeight: 700,
              background: active ? T.teal : "transparent",
              color: active ? "#fff" : T.gray,
              transition: "all 0.15s",
              marginBottom: -2,
            }}>
              <tab.Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
}