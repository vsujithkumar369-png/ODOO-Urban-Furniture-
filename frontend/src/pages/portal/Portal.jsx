import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentModal from '../../components/PaymentModal';
import Modal from '../../components/Modal';
import { getDocuments } from '../../api/documents';
import { Eye, CreditCard, Receipt, CheckCircle, Printer } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Portal() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState({ open: false, doc: null });
  const [viewModal, setViewModal] = useState({ open: false, doc: null });

  const load = () => {
    setLoading(true);
    getDocuments({ doc_type: 'CUSTOMER_INVOICE', contact_id: user?.contact_id })
      .then(r => setInvoices(r.data.data))
      .catch(() => toast.error('Failed to load invoices.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePaySuccess = () => {
    load();
    if (viewModal.open) setViewModal({ open: false, doc: null });
  };

  const cols = [
    { key: 'number',       label: 'Invoice Number' },
    { key: 'doc_date',     label: 'Invoice Date' },
    { key: 'due_date',     label: 'Due Date' },
    { key: 'total',        label: 'Total (Incl. Tax)', render: v => <span className="font-semibold">{fmt(v)}</span> },
    { key: 'amount_due',   label: 'Amount Due', render: (v, row) => (
      <span className={row.amount_due > 0 ? 'font-medium text-amber-600' : 'text-gray-400'}>
        {fmt(v)}
      </span>
    )},
    { key: 'status',       label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'actions',      label: 'Actions', render: (_, row) => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          className="btn-ghost btn-sm text-gray-600 dark:text-gray-400"
          onClick={() => setViewModal({ open: true, doc: row })}
          title="View Invoice Details"
        >
          <Eye size={14} /> View
        </button>

        <button
          className="btn-ghost btn-sm text-blue-600 dark:text-blue-400"
          onClick={() => generateInvoicePDF(row, user)}
          title="Print / Save PDF Bill"
        >
          <Printer size={13} /> PDF
        </button>

        {row.status !== 'paid' && (row.amount_due ?? 0) > 0 ? (
          <button
            className="btn-primary btn-sm"
            onClick={() => setPayModal({ open: true, doc: row })}
          >
            <CreditCard size={13} /> Pay Now
          </button>
        ) : (
          <span className="badge-green text-xs">
            <CheckCircle size={11} className="inline mr-1" />
            Approved
          </span>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Customer Order & Invoicing Portal"
        subtitle={`Welcome, ${user?.name} — Review your invoices, tax breakdowns, and pay online`}
      />

      <DataTable
        columns={cols}
        data={invoices}
        loading={loading}
        emptyMessage="No invoices found for your customer account."
        onRowClick={(row) => setViewModal({ open: true, doc: row })}
      />

      {/* Invoice Detail View Modal */}
      {viewModal.doc && (
        <Modal
          isOpen={viewModal.open}
          onClose={() => setViewModal({ open: false, doc: null })}
          title={`Invoice ${viewModal.doc.number}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs">
              <div>
                <span className="text-gray-500">Invoice Date:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{viewModal.doc.doc_date}</p>
              </div>
              <div>
                <span className="text-gray-500">Due Date:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{viewModal.doc.due_date}</p>
              </div>
              <div>
                <span className="text-gray-500">Payment Status:</span>
                <div className="mt-0.5"><StatusBadge status={viewModal.doc.status} /></div>
              </div>
              <div>
                <span className="text-gray-500">Reference:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{viewModal.doc.reference || '—'}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewModal.doc.lines ?? []).map((l, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-sm text-gray-800 dark:text-gray-200">{l.product_name}</td>
                      <td className="text-right text-sm">{l.qty}</td>
                      <td className="text-right text-sm font-mono">{fmt(l.unit_price)}</td>
                      <td className="text-right text-sm font-semibold">{fmt(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals & Tax Box */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 max-w-xs ml-auto space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Amount:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(viewModal.doc.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Amount Paid:</span>
                <span className="font-semibold text-green-600">{fmt(viewModal.doc.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                <span>Balance Due:</span>
                <span className={viewModal.doc.amount_due > 0 ? 'text-amber-600' : 'text-green-600'}>
                  {fmt(viewModal.doc.amount_due)}
                </span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                className="btn-secondary text-blue-600 dark:text-blue-400"
                onClick={() => generateInvoicePDF(viewModal.doc, user)}
              >
                <Printer size={14} /> Download / Print PDF Bill
              </button>
              <button
                className="btn-secondary"
                onClick={() => setViewModal({ open: false, doc: null })}
              >
                Close
              </button>
              {viewModal.doc.status !== 'paid' && (viewModal.doc.amount_due ?? 0) > 0 && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const d = viewModal.doc;
                    setViewModal({ open: false, doc: null });
                    setPayModal({ open: true, doc: d });
                  }}
                >
                  <CreditCard size={15} /> Pay {fmt(viewModal.doc.amount_due)}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Online Payment Modal */}
      <PaymentModal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, doc: null })}
        document={payModal.doc}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}
