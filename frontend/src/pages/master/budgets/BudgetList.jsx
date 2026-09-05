import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { getBudgets } from '../../../api/budgets';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export default function BudgetList() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    getBudgets().then(r => setBudgets(r.data.data)).catch(() => toast.error('Failed.')).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: 'name',             label: 'Budget Name'    },
    { key: 'analytic_account_name', label: 'Analytic'  },
    { key: 'type',             label: 'Type',       render: v => <StatusBadge status={v} /> },
    { key: 'start_date',       label: 'Start'           },
    { key: 'end_date',         label: 'End'             },
    { key: 'committed_amount', label: 'Committed',  render: v => fmt(v) },
    { key: 'achieved_amount',  label: 'Achieved',   render: v => fmt(v) },
    { key: 'achieved_percent', label: '%',          render: v => v != null ? `${Number(v).toFixed(1)}%` : '—' },
    { key: 'status',           label: 'Status',     render: v => <StatusBadge status={v} /> },
  ];

  return (
    <div>
      <PageHeader title="Budgets" subtitle="Plan and track your budgets">
        <button className="btn-primary" onClick={() => navigate('/budgets/new')} id="new-budget-btn"><Plus size={15} /> New Budget</button>
      </PageHeader>
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit mb-4">
        <button onClick={() => setView('list')} className={`btn-icon btn-sm ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List size={15} /></button>
        <button onClick={() => setView('kanban')} className={`btn-icon btn-sm ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><LayoutGrid size={15} /></button>
      </div>
      {view === 'list' ? (
        <DataTable columns={cols} data={budgets} loading={loading} onRowClick={r => navigate(`/budgets/${r.id}`)} emptyMessage="No budgets yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const pct = b.achieved_percent ?? 0;
            return (
              <div key={b.id} className="card p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/budgets/${b.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{b.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.analytic_account_name}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex justify-between"><span>Committed</span><span className="font-medium text-gray-800 dark:text-gray-200">{fmt(b.committed_amount)}</span></div>
                  <div className="flex justify-between"><span>Achieved</span><span className="font-medium text-green-600 dark:text-green-400">{fmt(b.achieved_amount)}</span></div>
                  <div className="flex justify-between"><span>Remaining</span><span className="font-medium">{fmt(b.amount_to_achieve)}</span></div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-right text-xs mt-1 text-gray-400">{pct.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
