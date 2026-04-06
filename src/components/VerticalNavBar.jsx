// src/components/VerticalNavBar.jsx
//
// Prérequis — ajouter dans index.html <head> :
// <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
//
// Usage :
// <VerticalNavBar currentSection="dashboard" onNavigate={(key) => setSection(key)} />

import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutGrid, Users, GraduationCap, BookOpen, Layers,
  FileText, PenLine, ListChecks, ClipboardCheck, ShieldCheck,
  BarChart3, Trophy, Settings, LogOut, ChevronDown,
  Monitor,  // ← icône pour la section Matériel
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   PALETTE & TOKENS
───────────────────────────────────────────────────────────── */
const C = {
  teal:       "#0F9B72",
  tealBg:     "#EAF9F3",
  tealBd:     "#7ECDB0",
  tealText:   "#0A7A5A",
  tealGlow:   "rgba(15,155,114,0.18)",
  tealShadow: "rgba(15,155,114,0.30)",
  fg:         "#1A1D23",
  fg2:        "#8A92A0",
  bg:         "#F4F6F9",
  card:       "#ffffff",
  bd:         "rgba(0,0,0,0.07)",
};

/* ─────────────────────────────────────────────────────────────
   STRUCTURE DE NAVIGATION
───────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    id: "gestion",
    label: "Gestion",
    Icon: LayoutGrid,
    items: [
      { key: "dashboard", Icon: LayoutGrid,    label: "Tableau de bord" },
      { key: "etudiants", Icon: Users,         label: "Étudiants" },
      { key: "classes",   Icon: GraduationCap, label: "Classes" },
      { key: "matieres",  Icon: BookOpen,      label: "Matières" },
      { key: "modules",   Icon: Layers,        label: "UE / Modules" },
      { key: "documents", Icon: FileText,      label: "Documents" },
    ],
  },
  {
    id: "evaluations",
    label: "Évaluations",
    Icon: PenLine,
    items: [
      { key: "notes",          Icon: PenLine,        label: "Notes",             hint: "Saisie & PV" },
      { key: "liste_presence", Icon: ListChecks,     label: "Liste de présence", hint: "Feuilles & exports" },
      { key: "evaluations",    Icon: ClipboardCheck, label: "Évaluations",       hint: "Anonymat" },
      { key: "anonymats",      Icon: ShieldCheck,    label: "Anonymats" },
    ],
  },
  {
    id: "suivi",
    label: "Suivi",
    Icon: BarChart3,
    items: [
      { key: "rapports",  Icon: BarChart3, label: "Rapports" },
      { key: "scolarite", Icon: Trophy,    label: "Scolarité" },
    ],
  },
  // ✅ NOUVELLE SECTION : MATÉRIEL
  {
    id: "materiel",
    label: "Matériel",
    Icon: Monitor,
    items: [
      { key: "materiel", Icon: Monitor, label: "Gestion du matériel", hint: "Salles, postes, projecteurs" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   NavItem — un élément du menu
───────────────────────────────────────────────────────────── */
function NavItem({ navKey, Icon, label, hint, active, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onClick(navKey)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={active ? "page" : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 9px",
        border: "none",
        background: active ? C.tealBg : hovered ? "rgba(0,0,0,0.04)" : "transparent",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: "left",
        outline: "none",
        position: "relative",
        transition: "background 140ms ease",
      }}
    >
      {/* Pill latérale active */}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 20,
            borderRadius: "0 3px 3px 0",
            background: C.teal,
          }}
        />
      )}

      {/* Icône */}
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: active ? C.tealBg : hovered ? C.card : C.bg,
          border: `1px solid ${active ? C.tealBd : C.bd}`,
          boxShadow: active ? `0 2px 8px ${C.tealGlow}` : "none",
          color: active ? C.teal : C.fg2,
          transition: "all 140ms ease",
        }}
      >
        <Icon size={13} strokeWidth={2.2} />
      </span>

      {/* Texte */}
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 1 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: active ? C.tealText : C.fg,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "15px",
          }}
        >
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: 10, fontWeight: 600, color: C.fg2, lineHeight: "13px" }}>
            {hint}
          </span>
        )}
      </span>

      {/* Dot actif */}
      {active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: C.teal,
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   AccordionSection — section accordéon animée
───────────────────────────────────────────────────────────── */
function AccordionSection({ section, isOpen, currentSection, onToggle, onNavigate }) {
  const bodyRef  = useRef(null);
  const [height, setHeight] = useState(0);
  const hasActive = section.items.some((i) => i.key === currentSection);
  const highlighted = isOpen || hasActive;

  useEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.scrollHeight);
  }, [section.items.length]);

  return (
    <div
      style={{
        border: `1px solid ${highlighted ? C.tealBd : C.bd}`,
        borderRadius: 14,
        overflow: "hidden",
        background: C.card,
        transition: "border-color 200ms ease",
      }}
    >
      {/* En-tête accordéon */}
      <button
        onClick={() => onToggle(section.id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 11px",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: "left",
          outline: "none",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: highlighted ? C.tealBg : C.bg,
            border: `1px solid ${highlighted ? C.tealBd : C.bd}`,
            flexShrink: 0,
            color: highlighted ? C.teal : C.fg2,
            transition: "all 180ms ease",
          }}
        >
          <section.Icon size={13} strokeWidth={2.2} />
        </span>

        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.7px",
            textTransform: "uppercase",
            color: highlighted ? C.tealText : C.fg2,
            transition: "color 180ms ease",
          }}
        >
          {section.label}
        </span>

        <ChevronDown
          size={14}
          strokeWidth={2.2}
          color={C.fg2}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 220ms cubic-bezier(.4,0,.2,1)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Panneau animé */}
      <div
        style={{
          maxHeight: isOpen ? height + 8 : 0,
          overflow: "hidden",
          opacity: isOpen ? 1 : 0,
          transition:
            "max-height 260ms cubic-bezier(.4,0,.2,1), opacity 200ms ease",
        }}
      >
        <div ref={bodyRef} style={{ padding: "0 6px 6px" }}>
          {section.items.map((item) => (
            <NavItem
              key={item.key}
              navKey={item.key}
              Icon={item.Icon}
              label={item.label}
              hint={item.hint}
              active={currentSection === item.key}
              onClick={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FooterButton
───────────────────────────────────────────────────────────── */
function FooterButton({ Icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 11px",
        border: `1px solid ${hovered ? C.tealBd : C.bd}`,
        background: hovered ? C.card : C.bg,
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        fontWeight: 700,
        color: hovered ? C.fg : C.fg2,
        outline: "none",
        transition: "background 140ms ease, color 140ms ease, border-color 140ms ease",
      }}
    >
      <Icon size={14} strokeWidth={2.2} />
      <span>{label}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────────────────────────── */
export default function VerticalNavBar({
  currentSection = "dashboard",
  onNavigate,
}) {
  // Trouve la section parente de la page active
  const findParent = useCallback((key) => {
    for (const sec of NAV_SECTIONS) {
      if (sec.items.some((i) => i.key === key)) return sec.id;
    }
    return null;
  }, []);

  const [openSection, setOpenSection] = useState(
    () => findParent(currentSection) ?? NAV_SECTIONS[0].id
  );

  // Synchronise si currentSection change de l'extérieur
  useEffect(() => {
    const parent = findParent(currentSection);
    if (parent) setOpenSection(parent);
  }, [currentSection, findParent]);

  const handleToggle = (id) =>
    setOpenSection((prev) => (prev === id ? null : id));

  const handleNavigate = useCallback(
    (key) => onNavigate?.(key),
    [onNavigate]
  );

  return (
    <aside
      style={{
        width: 252,
        minWidth: 252,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: C.card,
        borderRight: `1px solid ${C.bd}`,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── En-tête ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "16px 14px",
          borderBottom: `1px solid ${C.bd}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: C.teal,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: `0 4px 14px ${C.tealShadow}`,
          }}
        >
          <GraduationCap size={17} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.fg2, fontWeight: 500, lineHeight: "14px" }}>
            Système de
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.fg, lineHeight: "18px" }}>
            Scolarité
          </div>
        </div>
      </div>

      {/* ── Accordéon ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          scrollbarWidth: "none",
        }}
      >
        {NAV_SECTIONS.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            currentSection={currentSection}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      {/* ── Pied de page ── */}
      <div
        style={{
          padding: 8,
          borderTop: `1px solid ${C.bd}`,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flexShrink: 0,
          background: "rgba(0,0,0,0.01)",
        }}
      >
        <FooterButton
          Icon={Settings}
          label="Paramètres"
          onClick={() => handleNavigate("settings")}
        />
        <FooterButton
          Icon={LogOut}
          label="Déconnexion"
          onClick={() => handleNavigate("logout")}
        />
      </div>
    </aside>
  );
}