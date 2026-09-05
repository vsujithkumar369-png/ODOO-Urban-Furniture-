// Unified document list component reused for all 4 doc types
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Printer } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { getDocuments } from '../../api/documents';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

// Config per doc type
const CONFIG = {
  PO:               { title: 'Purchase Orders',    newRoute: '/purchase-orders/new', rowRoute: id => `/purchase-orders/${id}`, numLabel: 'PO Number' },
  VENDOR_BILL:      { title: 'Vendor Bills',        newRoute: '/bills/new',           rowRoute: id => `/bills/${id}`,            numLabel: 'Bill Number' },
  SO:               { title: 'Sales Orders',        newRoute: '/sales-orders/new',    rowRoute: id => `/sales-orders/${id}`,     numLabel: 'SO Number' },
  CUSTOMER_INVOICE: { title: 'Customer Invoices',   newRoute: '/invoices/new',        rowRoute: id => `/invoices/${id}`,         numLabel: 'Invoice Number' },
};

export default function DocumentList({ docType }) {
  const navigate = useNavigate();
  const cfg = CONFIG[docType];
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getDocuments({ doc_type: docType })
      .then(r => setDocs(r.data.data))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, [docType]);

  const filtered = docs.filter(d =>
    (d.number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const cols = [
    { key: 'number',       label: cfg.numLabel },
    { key: 'contact_name', label: docType === 'VENDOR_BILL' || docType === 'PO' ? 'Vendor' : 'Customer' },
    { key: 'doc_date',     label: 'Date'   },
    { key: 'due_date',     label: 'Due Date' },
    { key: 'total',        label: 'Total',      render: v => fmt(v) },
    { key: 'amount_due',   label: 'Amount Due', render: v => fmt(v) },
    { key: 'status',       label: 'Status',     render: v => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'PDF Bill',
      render: (_, row) => (
        <button
          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            generateInvoicePDF(row);
          }}
          title="Download / Print PDF Bill"
        >
          <Printer size={15} />
        </button>
      )
    }
  ];

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={`All ${cfg.title.toLowerCase()}`}>
        <button className="btn-primary" onClick={() => navigate(cfg.newRoute)} id={`new-${docType.toLowerCase()}-btn`}>
          <Plus size={15} /> New
        </button>
      </PageHeader>

      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder={`Search ${cfg.title.toLowerCase()}...`}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        onRowClick={r => navigate(cfg.rowRoute(r.id))}
        emptyMessage={`No ${cfg.title.toLowerCase()} yet.`}
      />
    </div>
  );
}
