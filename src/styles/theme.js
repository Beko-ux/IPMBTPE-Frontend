// src/styles/theme.js
export const colors = {
  teal: '#30b2a5',
  orange: '#ff8200',
  gray: '#848689',
  white: '#ffffff',
  bg: 'var(--bg)',
  fg: 'var(--fg)',
  border: 'var(--border)',
  danger: '#d4183d',
  input: 'var(--bg-input)',
  sidebarHi: 'var(--bg-sidebar-hi)',
  charts: ['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)'],
};

// ✅ simple helper pour switcher de thème où tu veux
export const setTheme = (mode) => {
  document.documentElement.dataset.theme = mode === 'dark' ? 'dark' : '';
};
