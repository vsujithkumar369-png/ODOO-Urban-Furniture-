import { useEffect, useState } from 'react';
import { List, LayoutGrid } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { getBudgetReport } from '../../api/reports';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const COLORS = ['#4f46e5', '#22c55e', '#f59e0b'];

export default function BudgetReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    getBudgetReport()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: 'name',             label: 'Budget'     },
    { key: 'start_date',       label: 'Start'      },
    { key: 'end_date',         label: 'End'        },
    { key: 'status',           label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'committed_amount', label: 'Committed', render: v => fmt(v) },
    { key: 'achieved_amount',  label: 'Achieved',  render: v => fmt(v) },
    { key: 'achieved_percent', label: 'Achieved %', render: v => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
          <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(v ?? 0, 100)}%` }} />
        </div>
        <span>{Number(v ?? 0).toFixed(1)}%</span>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Budget Report" subtitle="Overview of all budgets">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button onClick={() => setView('list')} className={`btn-icon btn-sm ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List size={15} /></button>
          <button onClick={() => setView('kanban')} className={`btn-icon btn-sm ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><LayoutGrid size={15} /></button>
        </div>
      </PageHeader>

      {view === 'list' ? (
        <DataTable columns={cols} data={data} loading={loading} emptyMessage="No budgets." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(b => {
            const achieved = b.achieved_amount ?? 0;
            const remaining = Math.max((b.committed_amount ?? 0) - achieved, 0);
            const pieData = [
              { name: 'Achieved',  value: achieved },
              { name: 'Remaining', value: remaining },
            ];
            return (
              <div key={b.id} className="card p-5">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.start_date} – {b.end_date}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-gray-500 mt-1">
                  Achieved: <span className="font-semibold text-green-600">{Number(b.achieved_percent ?? 0).toFixed(1)}%</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
