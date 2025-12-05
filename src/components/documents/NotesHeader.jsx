// src/components/documents/NotesHeader.jsx
// Entête IPMBTPE (comme sur le certificat de scolarité)

const logoSrc = "/assets/ipmbtpe-header.png"; // adapte le chemin si besoin

export default function NotesHeader() {
  return (
    <header style={sx.wrap}>
      <div style={sx.topRow}>
        {/* Logo à gauche */}
        <div style={sx.logoCol}>
          <img
            src={logoSrc}
            alt="IPMBTPE"
            style={sx.logo}
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        {/* Texte à droite */}
        <div style={sx.textCol}>
          <div style={sx.schoolName}>
            Institut Polytechnique des Métiers du Bâtiment,
            <br />
            des Travaux Publics et de l’Entrepreneuriat
          </div>
          <div style={sx.tagline}>Votre carrière commence ici</div>
          <div style={sx.legalLine}>
            Autorisation d’ouverture N°25-01077/MINESUP/SG/DDES/SD-ESUP/SDA/AOS
            du 26 mars 2025
          </div>
        </div>
      </div>

      {/* Bande verte en bas de l'entête */}
      <div style={sx.bottomBar} />
    </header>
  );
}

const sx = {
  wrap: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #E5E7EB",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "12px 18px 6px",
  },
  logoCol: {
    flexShrink: 0,
  },
  logo: {
    display: "block",
    height: 56, // ajuste si tu veux
    width: "auto",
  },
  textCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  schoolName: {
    fontSize: "0.95rem",
    fontWeight: 700,
    lineHeight: 1.3,
    color: "#111827",
  },
  tagline: {
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#2563EB",
  },
  legalLine: {
    fontSize: "0.7rem",
    color: "#4B5563",
  },
  bottomBar: {
    height: 5,
    backgroundColor: "#00AA9A", // bande verte en bas
  },
};
