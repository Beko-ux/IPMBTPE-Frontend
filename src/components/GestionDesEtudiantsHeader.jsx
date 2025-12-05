// // src/components/GestionDesEtudiantsHeader.jsx
// import { Search, Plus } from "lucide-react";

// export default function GestionDesEtudiantsHeader({
//   totalEnregistres,
//   query,
//   onQueryChange,
//   onSearch,
//   onAddNew,
// }) {
//   const handleKeyDown = (e) => {
//     if (e.key === "Enter") {
//       onSearch?.();
//     }
//   };

//   return (
//     <section style={sx.wrapper}>
//       <div style={sx.topRow}>
//         <div>
//           <h1 style={sx.title}>Gestion des étudiants</h1>
//           <p style={sx.subtitle}>{totalEnregistres} étudiants enregistrés</p>
//         </div>

//         <button type="button" style={sx.addBtn} onClick={onAddNew}>
//           <Plus size={16} style={{ marginRight: 8 }} />
//           Nouvel étudiant
//         </button>
//       </div>

//       <div style={sx.searchBlock}>
//         <label style={sx.searchLabel}>Rechercher un étudiant</label>
//         <div style={sx.searchRow}>
//           <div style={sx.searchInputWrap}>
//             <Search size={16} style={sx.searchIcon} />
//             <input
//               style={sx.searchInput}
//               placeholder="Rechercher par nom, prénoms ou matricule..."
//               value={query}
//               onChange={(e) => onQueryChange?.(e.target.value)}
//               onKeyDown={handleKeyDown}
//             />
//           </div>
//           <button type="button" style={sx.searchBtn} onClick={onSearch}>
//             Rechercher
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// }

// const sx = {
//   wrapper: {
//     background: "var(--bg)",
//     borderRadius: 12,
//     padding: "1.25rem 1.5rem",
//     boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
//     display: "flex",
//     flexDirection: "column",
//     gap: "1.5rem",
//   },
//   topRow: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     gap: 12,
//   },
//   title: { margin: 0, fontSize: "1.4rem", fontWeight: 700 },
//   subtitle: {
//     margin: "4px 0 0",
//     fontSize: ".9rem",
//     color: "var(--ip-gray)",
//   },
//   addBtn: {
//     display: "inline-flex",
//     alignItems: "center",
//     padding: ".55rem 1.1rem",
//     borderRadius: 9999,
//     border: "none",
//     background: "var(--ip-teal)",
//     color: "var(--on-color)",
//     fontWeight: 600,
//     cursor: "pointer",
//     fontSize: ".9rem",
//   },

//   searchBlock: { display: "flex", flexDirection: "column", gap: 8 },
//   searchLabel: { fontSize: ".9rem", fontWeight: 600 },
//   searchRow: { display: "flex", gap: 8 },
//   searchInputWrap: {
//     position: "relative",
//     flex: 1,
//     background: "var(--bg-input)",
//     borderRadius: 9999,
//     border: "1px solid var(--border)",
//   },
//   searchIcon: {
//     position: "absolute",
//     left: 14,
//     top: "50%",
//     transform: "translateY(-50%)",
//     color: "var(--ip-gray)",
//     pointerEvents: "none",
//   },
//   searchInput: {
//     width: "100%",
//     border: "none",
//     outline: "none",
//     background: "transparent",
//     padding: "0.65rem 1rem 0.65rem 2.4rem",
//     fontSize: ".9rem",
//   },
//   searchBtn: {
//     padding: ".6rem 1.2rem",
//     borderRadius: 10,
//     border: "none",
//     background: "#111827",
//     color: "#fff",
//     fontSize: ".9rem",
//     cursor: "pointer",
//     whiteSpace: "nowrap",
//   },
// };





// src/components/GestionDesEtudiantsHeader.jsx
import { Search } from "lucide-react";

export default function GestionDesEtudiantsHeader({
  total = 0,
  query = "",
  onQueryChange,
  onSearch,
  onAddNew,
  filter = "all", // "all" | "inscrits" | "non"
  counts = {},
  onFilterChange = () => {},
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSearch?.();
  };

  const allCount = counts.all ?? total;
  const insCount = counts.inscrits ?? 0;
  const nonCount = counts.non ?? 0;

  return (
    <section style={sx.wrap}>
      {/* Titre + bouton nouvel étudiant */}
      <div style={sx.topRow}>
        <div>
          <h1 style={sx.title}>Gestion des étudiants</h1>
          <p style={sx.subtitle}>
            {allCount} étudiant{allCount > 1 ? "s" : ""} enregistrés
          </p>
        </div>
        <button type="button" style={sx.btnPrimary} onClick={onAddNew}>
          <span style={{ fontSize: 18, marginRight: 8 }}>+</span>
          Nouvel étudiant
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={sx.searchRow}>
        <div style={sx.searchBox}>
          <Search size={16} style={sx.searchIcon} />
          <input
            style={sx.searchInput}
            placeholder="Rechercher par nom, prénoms ou matricule..."
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button type="button" style={sx.btnSearch} onClick={onSearch}>
          Rechercher
        </button>
      </div>

      {/* Filtres Inscrits / Non inscrits */}
      <div style={sx.filterRow}>
        <FilterChip
          active={filter === "all"}
          label={`Tous (${allCount})`}
          onClick={() => onFilterChange("all")}
        />
        <FilterChip
          active={filter === "inscrits"}
          label={`Inscrits (${insCount})`}
          onClick={() => onFilterChange("inscrits")}
        />
        <FilterChip
          active={filter === "non"}
          label={`Non inscrits (${nonCount})`}
          onClick={() => onFilterChange("non")}
        />
      </div>
    </section>
  );
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sx.chip,
        ...(active ? sx.chipActive : {}),
      }}
    >
      {label}
    </button>
  );
}

const sx = {
  wrap: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1.2rem 1.4rem 1rem",
    boxShadow: "0 4px 10px rgba(0,0,0,.02)",
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  title: {
    margin: 0,
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginTop: 4,
    fontSize: ".9rem",
    color: "var(--ip-gray)",
  },

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 9999,
    padding: "0.55rem 1.3rem",
    border: "none",
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: ".9rem",
  },

  searchRow: {
    display: "flex",
    gap: 10,
    marginTop: 4,
  },
  searchBox: {
    flex: 1,
    position: "relative",
    background: "#f5f6f8",
    borderRadius: 9999,
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    paddingLeft: 34,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    color: "var(--ip-gray)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    padding: "0.55rem 0.9rem 0.55rem 0",
    fontSize: ".9rem",
    color: "inherit",
  },
  btnSearch: {
    borderRadius: 8,
    border: "none",
    padding: "0.55rem 1.2rem",
    background: "#111827",
    color: "#fff",
    fontWeight: 600,
    fontSize: ".9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  filterRow: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 9999,
    padding: "0.3rem 0.9rem",
    border: "1px solid var(--border)",
    background: "#fff",
    cursor: "pointer",
    fontSize: ".8rem",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    background: "var(--ip-teal)",
    borderColor: "var(--ip-teal)",
    color: "var(--on-color)",
  },
};
