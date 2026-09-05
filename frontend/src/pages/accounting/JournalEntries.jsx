import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { getJournalEntries, getJournalEntry } from '../../api/journalEntries';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// ── List View ────────────────────────────────────────────────────────────────
export function JournalEntriesList() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJournalEntries()
      .then(r => setEntries(r.data.data))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: 'entry_date',    label: 'Date'       },
    { key: 'reference',     label: 'Reference'  },
    { key: 'journal_name',  label: 'Journal'    },
    { key: 'lines',         label: 'Debit',  render: (lines) => fmt(lines?.reduce((s, l) => s + (l.debit || 0), 0)) },
    { key: 'lines',         label: 'Credit', render: (lines) => fmt(lines?.reduce((s, l) => s + (l.credit || 0), 0)) },
    { key: 'status',        label: 'Status', render: v => <StatusBadge status={v} /> },
  ];

  return (
    <div>
      <PageHeader title="Journal Entries" subtitle="All accounting journal entries" />
      <DataTable columns={cols} data={entries} loading={loading}
        onRowClick={r => navigate(`/journal-entries/${r.id}`)}
        emptyMessage="No journal entries. Confirm a Bill or Invoice to auto-generate one." />
    </div>
  );
}

// ── Detail View ───────────────────────────────────────────────────────────────
export function JournalEntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJournalEntry(id)
      .then(r => setEntry(r.data.data))
      .catch(() => { toast.error('Not found.'); navigate('/journal-entries'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;
  if (!entry) return null;

  const totalDebit  = entry.lines?.reduce((s, l) => s + (l.debit  || 0), 0) ?? 0;
  const totalCredit = entry.lines?.reduce((s, l) => s + (l.credit || 0), 0) ?? 0;
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div>
      <PageHeader title={`Journal Entry #${entry.id}`} subtitle={entry.reference}>
        <button className="btn-secondary" onClick={() => navigate('/journal-entries')}><ArrowLeft size={15} /> Back</button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={entry.status} />
        <span className="text-sm text-gray-500">{entry.journal_name} · {entry.entry_date}</span>
        {balanced
          ? <span className="badge-green flex items-center gap-1"><CheckCircle size={12} /> Balanced</span>
          : <span className="badge-red">⚠ Unbalanced</span>
        }
      </div>

      <div className="card p-6 max-w-3xl">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Partner</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines?.map((l, i) => (
                <tr key={i}>
                  <td>{l.account_name}</td>
                  <td>{l.contact_id ?? '—'}</td>
                  <td className="text-right font-mono">{l.debit  > 0 ? fmt(l.debit)  : '—'}</td>
                  <td className="text-right font-mono">{l.credit > 0 ? fmt(l.credit) : '—'}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 dark:bg-gray-800/60 font-semibold">
                <td colSpan={2} className="text-right text-sm">Total</td>
                <td className="text-right font-mono">{fmt(totalDebit)}</td>
                <td className="text-right font-mono">{fmt(totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!balanced && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            ⚠ Journal Entry is not balanced. Debit and Credit totals must match.
          </div>
        )}
      </div>
    </div>
  );
}
