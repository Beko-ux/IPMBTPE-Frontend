import { useState, useRef, useEffect } from "react";
import { ChevronDown, CalendarDays, Check } from "lucide-react";
import useAppStore from "../store/useAppStore";

export default function AcademicYearSelector() {
  const academicYear = useAppStore((s) => s.academicYear);
  const academicYearList = useAppStore((s) => s.academicYearList || []);
  const setAcademicYear = useAppStore((s) => s.setAcademicYear);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (year) => {
    setAcademicYear(year);
    setOpen(false);
  };

  return (
    <div ref={ref} style={sx.wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={sx.trigger}
        title="Changer l'année académique"
      >
        <CalendarDays size={15} style={{ flexShrink: 0, color: "var(--ip-teal)" }} />
        <span style={sx.yearText}>{academicYear}</span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: "var(--ip-gray)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && (
        <div style={sx.dropdown}>
          <div style={sx.dropdownHeader}>Année académique</div>
          {academicYearList.map((year) => {
            const isActive = year === academicYear;
            return (
              <button
                key={year}
                type="button"
                onClick={() => handleSelect(year)}
                style={{
                  ...sx.option,
                  ...(isActive ? sx.optionActive : {}),
                }}
              >
                <span style={sx.optionLabel}>{year}</span>
                {isActive && (
                  <Check size={14} style={{ color: "var(--ip-teal)", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const sx = {
  wrap: {
    position: "relative",
    display: "inline-flex",
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1.5px solid var(--ip-teal)",
    background: "var(--bg-sidebar-hi)",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 800,
    color: "var(--fg)",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 6px rgba(48,178,165,0.12)",
    transition: "box-shadow 0.15s",
  },
  yearText: {
    fontWeight: 900,
    color: "var(--ip-teal)",
    letterSpacing: "0.02em",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    minWidth: 160,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 200,
    overflow: "hidden",
    padding: "4px 0",
  },
  dropdownHeader: {
    padding: "8px 14px 6px",
    fontSize: "0.68rem",
    fontWeight: 900,
    color: "var(--ip-gray)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid var(--border)",
    marginBottom: 4,
  },
  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "9px 14px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--fg)",
    textAlign: "left",
    transition: "background 0.1s",
  },
  optionActive: {
    background: "var(--bg-sidebar-hi)",
    color: "var(--ip-teal)",
    fontWeight: 900,
  },
  optionLabel: {
    flex: 1,
  },
};