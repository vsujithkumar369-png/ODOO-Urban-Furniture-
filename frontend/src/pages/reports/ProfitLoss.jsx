import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getProfitLoss } from '../../api/reports';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const yr = new Date().getFullYear();

export default function ProfitLoss() {
  const [year, setYear] = useState(yr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getProfitLoss(year)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load P&L.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [year]);

  const Row = ({ label, value, bold, indent, color }) => (
    <div className={`flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-semibold' : ''} ${color ?? 'text-gray-900 dark:text-gray-100'}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <div>
      <PageHeader title="Profit & Loss" subtitle="Income statement by year">
        <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
          {[yr, yr-1, yr-2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHeader>

      {loading ? (
        <div className="card p-10 text-center text-gray-400">Loading report...</div>
      ) : !data ? null : (
        <div className="card p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Profit & Loss — {year}</h2>
          </div>

          {/* Income section */}
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">Income</p>
            <Row label="Sales Income" value={data.income?.sales} indent />
            <Row label="Total Income" value={data.income?.total} bold color="text-green-600 dark:text-green-400" />
          </div>

          {/* Expenses section */}
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <TrendingDown size={12} /> Expenses
            </p>
            <Row label="Purchase Expense" value={data.expenses?.purchase} indent />
            <Row label="Other Expenses"   value={data.expenses?.other}    indent />
            <Row label="Total Expenses"   value={data.expenses?.total}    bold color="text-red-600 dark:text-red-400" />
          </div>

          {/* Net income */}
          <div className={`rounded-xl p-4 ${data.net_income >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex justify-between">
              <span className="font-bold text-gray-900 dark:text-gray-100">Net Income</span>
              <span className={`font-bold text-lg font-mono ${data.net_income >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {fmt(data.net_income)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
