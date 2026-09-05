import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import PaymentModal from '../../components/PaymentModal';
import Modal from '../../components/Modal';
import { getDocuments } from '../../api/documents';
import {
  Eye, CreditCard, Receipt, CheckCircle, Printer,
  Package, ShoppingBag, Clock, CheckCircle2, FileText
} from 'lucide-react';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Portal() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';

  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState({ open: false, doc: null });
  const [viewModal, setViewModal] = useState({ open: false, doc: null });

  const loadData = () => {
    setLoading(true);
    // Fetch customer's Sales Orders (SO)
    const soPromise = getDocuments({ doc_type: 'SO', contact_id: user?.contact_id });
    // Fetch customer's Invoices
    const invPromise = getDocuments({ doc_type: 'CUSTOMER_INVOICE', contact_id: user?.contact_id });

    Promise.all([soPromise, invPromise])
      .then(([soRes, invRes]) => {
        setOrders(soRes.data.data || []);
        setInvoices(invRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load orders and invoices.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaySuccess = () => {
    loadData();
    if (viewModal.open) setViewModal({ open: false, doc: null });
  };

  // Metrics
  const totalOrdersCount = orders.length;
  const totalInvoicedAmount = useMemo(
    () => invoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0),
    [invoices]
  );
  const totalDueAmount = useMemo(
    () => invoices.reduce((sum, i) => sum + (parseFloat(i.amount_due) || 0), 0),
    [invoices]
  );
  const totalPaidAmount = useMemo(
    () => invoices.reduce((sum, i) => sum + (parseFloat(i.amount_paid) || 0), 0),
    [invoices]
  );

  // Orders Columns (What was ordered & status)
  const orderCols = [
    { key: 'number', label: 'Order Number' },
    { key: 'doc_date', label: 'Order Date' },
    {
      key: 'lines',
      label: 'Items Ordered',
      render: (lines = []) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {lines.length > 0
            ? lines.map(l => `${l.product_name} (×${l.qty})`).join(', ')
            : 'Standard Order Items'}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Order Total',
      render: v => <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(v)}</span>,
    },
    {
      key: 'status',
      label: 'Delivery & Status',
      render: (v) => (
        <span className={v === 'confirmed' ? 'badge-green' : 'badge-yellow'}>
          <CheckCircle2 size={12} className="inline mr-1" />
          {v === 'confirmed' ? 'Confirmed & Processed' : 'Order Placed'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            className="btn-ghost btn-sm text-gray-600 dark:text-gray-400"
            onClick={() => setViewModal({ open: true, doc: row })}
            title="View Order Details"
          >
            <Eye size={14} /> View
          </button>
          <button
            className="btn-ghost btn-sm text-blue-600 dark:text-blue-400"
            onClick={() => generateInvoicePDF(row, user)}
            title="Print Order Receipt"
          >
            <Printer size={13} /> PDF
          </button>
        </div>
      ),
    },
  ];

  // Invoice Columns
  const invoiceCols = [
    { key: 'number', label: 'Invoice Number' },
    { key: 'doc_date', label: 'Invoice Date' },
    { key: 'due_date', label: 'Due Date' },
    {
      key: 'total',
      label: 'Total (Incl. Tax)',
      render: v => <span className="font-semibold">{fmt(v)}</span>,
    },
    {
      key: 'amount_due',
      label: 'Amount Due',
      render: (v, row) => (
        <span className={row.amount_due > 0 ? 'font-medium text-amber-600' : 'text-gray-400'}>
          {fmt(v)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
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
              Paid
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Order & Billing Portal"
        subtitle={`Welcome, ${user?.name} — Track your ordered furniture items, received invoices, and payments`}
      />

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Orders Placed</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalOrdersCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Invoiced</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalInvoicedAmount)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Paid</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalPaidAmount)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Amount Due</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalDueAmount)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setSearchParams({ tab: 'orders' })}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Package size={16} />
          My Orders ({orders.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'invoices' })}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Receipt size={16} />
          Invoices & Payments ({invoices.length})
        </button>
      </div>

      {/* Tab 1: Orders (Items Ordered & Status) */}
      {activeTab === 'orders' && (
        <DataTable
          columns={orderCols}
          data={orders}
          loading={loading}
          emptyMessage="You have not placed any orders yet."
          onRowClick={(row) => setViewModal({ open: true, doc: row })}
        />
      )}

      {/* Tab 2: Invoices */}
      {activeTab === 'invoices' && (
        <DataTable
          columns={invoiceCols}
          data={invoices}
          loading={loading}
          emptyMessage="No invoices found for your customer account."
          onRowClick={(row) => setViewModal({ open: true, doc: row })}
        />
      )}

      {/* Document Detail Modal */}
      {viewModal.doc && (
        <Modal
          isOpen={viewModal.open}
          onClose={() => setViewModal({ open: false, doc: null })}
          title={`${viewModal.doc.doc_type === 'SO' ? 'Sales Order' : 'Invoice'} ${viewModal.doc.number}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs">
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{viewModal.doc.doc_date}</p>
              </div>
              <div>
                <span className="text-gray-500">Due / Expected Date:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{viewModal.doc.due_date || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
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
                    <th>Product / Ordered Item</th>
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

            {/* Totals summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span>{fmt(viewModal.doc.total)}</span>
                </div>
                {viewModal.doc.doc_type === 'CUSTOMER_INVOICE' && (
                  <>
                    <div className="flex justify-between text-emerald-600">
                      <span>Amount Paid:</span>
                      <span>{fmt(viewModal.doc.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t pt-1.5">
                      <span>Amount Due:</span>
                      <span className={viewModal.doc.amount_due > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {fmt(viewModal.doc.amount_due)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => generateInvoicePDF(viewModal.doc, user)}
              >
                <Printer size={13} /> Download PDF
              </button>

              {viewModal.doc.doc_type === 'CUSTOMER_INVOICE' && viewModal.doc.status !== 'paid' && (viewModal.doc.amount_due ?? 0) > 0 && (
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => setPayModal({ open: true, doc: viewModal.doc })}
                >
                  <CreditCard size={13} /> Pay Outstanding Balance
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {payModal.open && (
        <PaymentModal
          isOpen={payModal.open}
          onClose={() => setPayModal({ open: false, doc: null })}
          document={payModal.doc}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
}
