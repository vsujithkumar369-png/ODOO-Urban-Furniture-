import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentModal from '../../components/PaymentModal';
import { getDocuments } from '../../api/documents';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Portal() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState({ open: false, doc: null });

  const load = () => {
    setLoading(true);
    getDocuments({ doc_type: 'CUSTOMER_INVOICE', contact_id: user?.contact_id })
      .then(r => setInvoices(r.data.data))
      .catch(() => toast.error('Failed to load invoices.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handlePaySuccess = () => { load(); };

  const cols = [
    { key: 'number',       label: 'Invoice' },
    { key: 'doc_date',     label: 'Invoice Date' },
    { key: 'due_date',     label: 'Due Date' },
    { key: 'total',        label: 'Total',      render: v => fmt(v) },
    { key: 'amount_due',   label: 'Amount Due', render: v => fmt(v) },
    { key: 'status',       label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'id', label: '', render: (_, row) => (
      row.status !== 'paid' && (row.amount_due ?? 0) > 0
        ? <button className="btn-primary btn-sm" onClick={e => { e.stopPropagation(); setPayModal({ open: true, doc: row }); }}>Pay Now</button>
        : <span className="badge-green">Paid</span>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="My Invoices"
        subtitle={`Logged in as ${user?.name} — view and pay your invoices`}
      />

      <DataTable columns={cols} data={invoices} loading={loading} emptyMessage="No invoices found for your account." />

      <PaymentModal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, doc: null })}
        document={payModal.doc}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}
