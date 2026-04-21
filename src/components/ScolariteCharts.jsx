// src/components/ScolariteCharts.jsx
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + " FCFA";

export function MonthlyRevenueChart({ data }) {
  if (!data || data.length === 0) return <div style={{ textAlign: "center", padding: 40 }}>Aucune donnée mensuelle</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={value => formatCurrency(value)} />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="#00b89c" name="Encaissements" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PaymentModePieChart({ data }) {
  if (!data || data.length === 0) return <div style={{ textAlign: "center", padding: 40 }}>Aucune donnée</div>;
  const COLORS = ["#00b89c", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444"];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={value => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopClassesBarChart({ data }) {
  if (!data || data.length === 0) return <div style={{ textAlign: "center", padding: 40 }}>Aucune donnée</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="className" width={150} />
        <Tooltip formatter={value => formatCurrency(value)} />
        <Bar dataKey="total" fill="#00b89c" name="Montant payé" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RecouvrementTrendChart({ data }) {
  if (!data || data.length === 0) return <div style={{ textAlign: "center", padding: 40 }}>Aucune donnée</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
        <Tooltip formatter={value => `${value}%`} />
        <Legend />
        <Line type="monotone" dataKey="taux" stroke="#8b5cf6" name="Taux de recouvrement" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}