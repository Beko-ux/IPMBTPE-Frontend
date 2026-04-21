// src/components/AuthenticatedLayout.jsx
import VerticalNavBar from "./VerticalNavBar";
import HorizontalNavBar from "./HorizontalNavBar";

export default function AuthenticatedLayout({ 
  children, 
  currentSection, 
  onNavigate, 
  title, 
  subtitle,
  actions 
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "252px 1fr", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <aside style={{ height: "100%", overflowY: "auto", background: "var(--card)", borderRight: "1px solid var(--border)" }}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>
      <main style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <HorizontalNavBar 
          title={title} 
          subtitle={subtitle} 
          onNavigate={onNavigate} 
          actions={actions} 
        />
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {children}
        </div>
      </main>
    </div>
  );
}