import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getBalanceSheet } from '../../api/reports';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const yr = new Date().getFullYear();

export default function BalanceSheet() {
  const [year, setYear] = useState(yr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBalanceSheet(year)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load Balance Sheet.'))
      .finally(() => setLoading(false));
  }, [year]);

  const Row = ({ label, value, bold, indent }) => (
    <div className={`flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <div>
      <PageHeader title="Balance Sheet" subtitle="Assets, liabilities, and capital">
        <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
          {[yr, yr-1, yr-2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHeader>

      {loading ? (
        <div className="card p-10 text-center text-gray-400">Loading report...</div>
      ) : !data ? null : (
        <div className="space-y-4 max-w-2xl">
          {/* Balance warning */}
          {!data.balanced && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              ⚠ <strong>Balance Sheet is unbalanced!</strong> Assets ≠ Liabilities + Capital. This indicates a backend calculation error.
            </div>
          )}

          {/* Assets */}
          <div className="card p-6">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Assets</p>
            <Row label="Bank"        value={data.assets?.bank}    indent />
            <Row label="Cash"        value={data.assets?.cash}    indent />
            <Row label="Debtors"     value={data.assets?.debtors} indent />
            <Row label="Other"       value={data.assets?.other}   indent />
            <Row label="Total Assets" value={data.assets?.total}  bold />
          </div>

          {/* Liabilities */}
          <div className="card p-6">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Liabilities</p>
            <Row label="Creditors"         value={data.liabilities?.creditors} indent />
            <Row label="Other Liabilities" value={data.liabilities?.other}     indent />
            <Row label="Total Liabilities" value={data.liabilities?.total}     bold />
          </div>

          {/* Capital */}
          <div className="card p-6">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">Capital</p>
            <Row label="Capital Account" value={data.capital?.capital_account} indent />
            <Row label="Net Income"      value={data.capital?.net_income}      indent />
            <Row label="Total Capital"   value={data.capital?.total}           bold />
          </div>

          {/* Balance check */}
          <div className={`card p-4 flex justify-between items-center ${data.balanced ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2">
              <Scale size={16} className={data.balanced ? 'text-green-600' : 'text-red-600'} />
              <span className="text-sm font-semibold">Total Assets = Liabilities + Capital</span>
            </div>
            <span className={`text-sm font-bold ${data.balanced ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {data.balanced ? '✓ Balanced' : '✗ Unbalanced'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
