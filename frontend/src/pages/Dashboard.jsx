import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Truck, TrendingUp, TrendingDown, Wallet,
  DollarSign, BarChart2, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { useTheme } from '../context/ThemeContext';
import { getDocuments } from '../api/documents';
import { getBudgets } from '../api/budgets';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, bills, so, po, budgets] = await Promise.all([
        getDocuments({ doc_type: 'CUSTOMER_INVOICE' }),
        getDocuments({ doc_type: 'VENDOR_BILL' }),
        getDocuments({ doc_type: 'SO' }),
        getDocuments({ doc_type: 'PO' }),
        getBudgets(),
      ]);
      const invoices = inv.data.data;
      const vendorBills = bills.data.data;

      const totalSales     = invoices.reduce((s, d) => s + (d.total ?? 0), 0);
      const totalPurchase  = vendorBills.reduce((s, d) => s + (d.total ?? 0), 0);
      const receivables    = invoices.filter(d => d.status !== 'paid').reduce((s, d) => s + (d.amount_due ?? 0), 0);
      const payables       = vendorBills.filter(d => d.status !== 'paid').reduce((s, d) => s + (d.amount_due ?? 0), 0);
      const totalBudget    = budgets.data.data.reduce((s, b) => s + (b.committed_amount ?? 0), 0);

      setStats({ totalSales, totalPurchase, receivables, payables, totalBudget });

      // Build monthly chart data from invoices & bills (last 6 months)
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const now = new Date();
      const monthMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap[`${d.getFullYear()}-${d.getMonth()}`] = { month: months[d.getMonth()], sales: 0, purchase: 0 };
      }
      invoices.forEach(d => {
        const dt = new Date(d.doc_date);
        const k = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (monthMap[k]) monthMap[k].sales += d.total ?? 0;
      });
      vendorBills.forEach(d => {
        const dt = new Date(d.doc_date);
        const k = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (monthMap[k]) monthMap[k].purchase += d.total ?? 0;
      });
      setChartData(Object.values(monthMap));
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
  const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Urban Furniture Accounting — live overview</p>
        </div>
        <button onClick={load} className="btn-secondary" id="dashboard-refresh-btn">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        <DashboardCard title="Total Sales"     value={loading ? '...' : fmt(stats?.totalSales)}    icon={TrendingUp}  color="green"  sub="Customer Invoices" />
        <DashboardCard title="Total Purchase"  value={loading ? '...' : fmt(stats?.totalPurchase)} icon={Truck}       color="red"    sub="Vendor Bills" />
        <DashboardCard title="Receivables"     value={loading ? '...' : fmt(stats?.receivables)}   icon={DollarSign}  color="blue"   sub="Unpaid invoices" />
        <DashboardCard title="Payables"        value={loading ? '...' : fmt(stats?.payables)}      icon={TrendingDown} color="amber" sub="Unpaid bills" />
        <DashboardCard title="Budget Committed" value={loading ? '...' : fmt(stats?.totalBudget)}  icon={Wallet}      color="purple" sub="Confirmed budgets" />
        <DashboardCard title="Income"          value={loading ? '...' : fmt(stats?.totalSales)}    icon={BarChart2}   color="teal"   sub="Sales accounts" />
        <DashboardCard title="Expenses"        value={loading ? '...' : fmt(stats?.totalPurchase)} icon={ShoppingCart} color="indigo" sub="Purchase accounts" />
      </div>

      {/* Chart */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">Sales vs Purchase (Last 6 Months)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
              contentStyle={{
                background: theme === 'dark' ? '#1f2937' : '#fff',
                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                borderRadius: '10px',
                color: theme === 'dark' ? '#f9fafb' : '#111827',
              }}
            />
            <Legend />
            <Bar dataKey="sales"    fill="#4f46e5" radius={[4, 4, 0, 0]} name="Sales" />
            <Bar dataKey="purchase" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Purchase" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[
          { label: 'New Invoice',   to: '/invoices/new',        color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30' },
          { label: 'New Bill',      to: '/bills/new',           color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30' },
          { label: 'New PO',        to: '/purchase-orders/new', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30' },
          { label: 'New SO',        to: '/sales-orders/new',    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30' },
          { label: 'Contacts',      to: '/contacts',            color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30' },
          { label: 'Journal Entries', to: '/journal-entries',   color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30' },
          { label: 'P&L Report',    to: '/reports/profit-loss', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30' },
          { label: 'Balance Sheet', to: '/reports/balance-sheet', color: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' },
        ].map(q => (
          <button key={q.to} onClick={() => navigate(q.to)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 text-left ${q.color}`}>
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
