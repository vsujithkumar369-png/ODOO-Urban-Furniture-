import { useEffect, useState, useMemo } from 'react';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { getDocuments } from '../../api/documents';
import { getContacts } from '../../api/contacts';
import {
  Truck, CheckCircle2, Download, Printer, Filter,
  Building2, DollarSign, Calendar, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function VendorReports() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const docsPromise = getDocuments({ doc_type: 'PO' });
    const vendorsPromise = getContacts({ type: 'vendor' });

    Promise.all([docsPromise, vendorsPromise])
      .then(([docsRes, vendorsRes]) => {
        setOrders(docsRes.data.data || []);
        setVendors(vendorsRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load vendor fulfillment data.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchVendor = selectedVendorId === 'all' || String(o.contact_id) === String(selectedVendorId);
      const matchStatus = statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? (o.status === 'confirmed' || o.status === 'paid' || o.status === 'completed')
        : (o.status === statusFilter);
      return matchVendor && matchStatus;
    });
  }, [orders, selectedVendorId, statusFilter]);

  const completedOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'confirmed' || o.status === 'paid' || o.status === 'completed');
  }, [filteredOrders]);

  const totalValue = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  }, [completedOrders]);

  const exportCSV = () => {
    if (completedOrders.length === 0) {
      toast.error('No completed vendor orders to export.');
      return;
    }

    const headers = ['PO Number', 'Vendor Name', 'Order Date', 'Status', 'Total Value (INR)', 'Lines Count'];
    const rows = completedOrders.map(o => [
      o.number,
      o.contact_name || `Vendor #${o.contact_id}`,
      o.doc_date,
      o.status,
      o.total,
      o.lines?.length || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `vendor_fulfillment_final_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Final Vendor Report CSV exported successfully!');
  };

  const exportJSON = () => {
    const reportData = {
      title: 'Urban Furniture — Vendor Fulfillment & Completed Orders Report',
      generated_at: new Date().toISOString(),
      vendor_filter: selectedVendorId === 'all' ? 'All Vendors' : selectedVendorId,
      total_completed_orders: completedOrders.length,
      total_settlement_value: totalValue,
      orders: completedOrders
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_audit_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a);
    toast.success('Vendor Audit JSON saved successfully!');
  };

  const cols = [
    { key: 'number', label: 'PO Number', render: (v) => <span className="font-semibold text-primary-600">{v}</span> },
    { key: 'contact_name', label: 'Vendor Name', render: (v, r) => v || `Vendor #${r.contact_id}` },
    { key: 'doc_date', label: 'Order Date' },
    { key: 'lines', label: 'Items', render: l => l?.length ? `${l.length} item(s)` : '—' },
    { key: 'total', label: 'Total Value', render: v => <span className="font-semibold">{fmt(v)}</span> },
    {
      key: 'status',
      label: 'Fulfillment Status',
      render: v => (v === 'confirmed' || v === 'paid' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          <CheckCircle2 size={12} /> Successfully Done
        </span>
      ) : (
        <StatusBadge status={v} />
      ))
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Fulfillment & Completed Orders Report"
        subtitle="Review orders successfully done by suppliers, monitor delivery performance, and save the data for final accounting reports"
      >
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-primary btn-sm">
            <FileSpreadsheet size={14} /> Save Final Report (CSV)
          </button>
          <button onClick={exportJSON} className="btn-secondary btn-sm">
            <Download size={14} /> Export JSON
          </button>
          <button onClick={() => window.print()} className="btn-secondary btn-sm">
            <Printer size={14} /> Print Report
          </button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchase Orders</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{filteredOrders.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Successfully Completed</p>
            <p className="text-xl font-bold text-emerald-600">{completedOrders.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Settlement Value</p>
            <p className="text-xl font-bold text-purple-600">{fmt(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Filter by Vendor</label>
            <select
              className="select w-full text-xs"
              value={selectedVendorId}
              onChange={e => setSelectedVendorId(e.target.value)}
            >
              <option value="all">All Vendors ({vendors.length})</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Fulfillment Status</label>
            <select
              className="select w-full text-xs"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Successfully Completed / Done</option>
              <option value="draft">Draft / In Progress</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 self-end sm:self-center">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredOrders.length}</span> orders
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={cols}
        data={filteredOrders}
        loading={loading}
        emptyMessage="No vendor orders match the selected filters."
      />
    </div>
  );
}
