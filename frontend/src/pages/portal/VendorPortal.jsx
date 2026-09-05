import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { getDocuments, updateDocument } from '../../api/documents';
import {
  Package, CheckCircle2, Clock, DollarSign, Download, Printer,
  Eye, FileText, ArrowUpRight, Filter, ShieldCheck, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function VendorPortal() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';

  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState({ open: false, doc: null });

  const loadData = () => {
    setLoading(true);
    // Fetch POs assigned to this contact
    const poPromise = getDocuments({ doc_type: 'PO', contact_id: user?.contact_id });
    // Fetch Bills for this contact
    const billPromise = getDocuments({ doc_type: 'VENDOR_BILL', contact_id: user?.contact_id });

    Promise.all([poPromise, billPromise])
      .then(([poRes, billRes]) => {
        setOrders(poRes.data.data || []);
        setBills(billRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load vendor orders and bills.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'confirmed' || o.status === 'paid' || o.status === 'completed');
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'draft' || o.status === 'partially_paid');
  }, [orders]);

  const totalEarnings = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  }, [completedOrders]);

  // Mark an order as fulfilled/confirmed
  const handleMarkDone = async (e, order) => {
    e.stopPropagation();
    try {
      await updateDocument(order.id, { status: 'confirmed' });
      toast.success(`Order ${order.number} marked as Successfully Fulfilled!`);
      loadData();
      if (viewModal.open) setViewModal({ open: false, doc: null });
    } catch {
      toast.error('Failed to update order status.');
    }
  };

  // Export to CSV for Final Report
  const exportToCSV = () => {
    if (completedOrders.length === 0) {
      toast.error('No completed orders available to export.');
      return;
    }

    const headers = ['PO Number', 'Order Date', 'Status', 'Total Value (INR)', 'Items Count', 'Payment Status'];
    const rows = completedOrders.map(o => [
      o.number,
      o.doc_date,
      o.status,
      o.total,
      o.lines?.length || 0,
      o.amount_due > 0 ? 'Pending Payment' : 'Paid'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendor_final_report_${user?.name || 'vendor'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Final Report CSV saved successfully!');
  };

  // Export to JSON Data for audit records
  const exportToJSON = () => {
    const reportData = {
      vendor_name: user?.name,
      vendor_contact_id: user?.contact_id,
      generated_at: new Date().toISOString(),
      summary: {
        total_assigned: orders.length,
        successfully_completed: completedOrders.length,
        pending_orders: pendingOrders.length,
        total_value_earned: totalEarnings
      },
      completed_orders: completedOrders
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_final_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a);
    toast.success('Final Report JSON data saved successfully!');
  };

  // Columns for All Orders & Completed Orders
  const orderCols = [
    { key: 'number', label: 'PO Number', render: (v, r) => <span className="font-semibold text-primary-600">{v}</span> },
    { key: 'doc_date', label: 'Order Date' },
    { key: 'lines', label: 'Items', render: lines => lines?.length ? `${lines.length} item(s)` : '—' },
    { key: 'total', label: 'Order Value', render: v => <span className="font-semibold">{fmt(v)}</span> },
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
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            className="btn-ghost btn-sm text-gray-600 dark:text-gray-400"
            onClick={() => setViewModal({ open: true, doc: row })}
            title="View Details"
          >
            <Eye size={14} /> View
          </button>
          {row.status === 'draft' && (
            <button
              className="btn-primary btn-sm"
              onClick={(e) => handleMarkDone(e, row)}
            >
              <Truck size={13} /> Mark Fulfilled
            </button>
          )}
        </div>
      )
    }
  ];

  const billCols = [
    { key: 'number', label: 'Bill Number' },
    { key: 'doc_date', label: 'Bill Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'total', label: 'Total Amount', render: v => fmt(v) },
    { key: 'amount_due', label: 'Amount Due', render: v => <span className={v > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          className="btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); setViewModal({ open: true, doc: row }); }}
        >
          <Eye size={14} /> View
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Order & Fulfillment Portal"
        subtitle={`Welcome, ${user?.name} — Track assigned purchase orders, view completed deliveries, and download final reports`}
      >
        <div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="btn-secondary btn-sm" title="Save CSV report">
            <Download size={14} /> Save CSV Report
          </button>
          <button onClick={() => window.print()} className="btn-secondary btn-sm" title="Print report">
            <Printer size={14} /> Print Report
          </button>
        </div>
      </PageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Assigned Orders</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Successfully Done</p>
            <p className="text-xl font-bold text-emerald-600">{completedOrders.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">In Progress / Pending</p>
            <p className="text-xl font-bold text-amber-600">{pendingOrders.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Completed Order Value</p>
            <p className="text-xl font-bold text-purple-600">{fmt(totalEarnings)}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setSearchParams({ tab: 'orders' })}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-b-2 border-primary-600 text-primary-600 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Package size={16} /> All Assigned Orders ({orders.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'completed' })}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'border-b-2 border-emerald-600 text-emerald-600 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle2 size={16} /> Successfully Done ({completedOrders.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'bills' })}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'bills'
              ? 'border-b-2 border-primary-600 text-primary-600 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FileText size={16} /> Vendor Bills ({bills.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'report' })}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'report'
              ? 'border-b-2 border-purple-600 text-purple-600 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Download size={16} /> Final Fulfillment Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <DataTable
          columns={orderCols}
          data={orders}
          loading={loading}
          onRowClick={r => setViewModal({ open: true, doc: r })}
          emptyMessage="No purchase orders assigned to you yet."
        />
      )}

      {activeTab === 'completed' && (
        <div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs mb-4 flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>These are the purchase orders that have been successfully supplied and confirmed. Their data is archived for final reporting.</span>
          </div>
          <DataTable
            columns={orderCols}
            data={completedOrders}
            loading={loading}
            onRowClick={r => setViewModal({ open: true, doc: r })}
            emptyMessage="No successfully completed orders yet."
          />
        </div>
      )}

      {activeTab === 'bills' && (
        <DataTable
          columns={billCols}
          data={bills}
          loading={loading}
          onRowClick={r => setViewModal({ open: true, doc: r })}
          emptyMessage="No vendor bills recorded yet."
        />
      )}

      {activeTab === 'report' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Final Vendor Fulfillment Report</h3>
              <p className="text-xs text-gray-500">Summary of all successfully delivered orders for auditing and final accounting settlement.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportToCSV} className="btn-primary btn-sm">
                <Download size={14} /> Save CSV Data
              </button>
              <button onClick={exportToJSON} className="btn-secondary btn-sm">
                <Download size={14} /> Save JSON Report
              </button>
              <button onClick={() => window.print()} className="btn-secondary btn-sm">
                <Printer size={14} /> Print Formal Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
            <div>
              <p className="text-xs text-gray-400">Vendor Partner</p>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Fulfilled Orders</p>
              <p className="font-semibold text-sm text-emerald-600">{completedOrders.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Fulfillment Success Rate</p>
              <p className="font-semibold text-sm text-blue-600">
                {orders.length > 0 ? `${Math.round((completedOrders.length / orders.length) * 100)}%` : '0%'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Gross Settlement</p>
              <p className="font-semibold text-sm text-purple-600">{fmt(totalEarnings)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                <tr>
                  <th className="p-2.5">PO Number</th>
                  <th className="p-2.5">Order Date</th>
                  <th className="p-2.5">Items</th>
                  <th className="p-2.5">Total Value</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">No completed orders found.</td>
                  </tr>
                ) : (
                  completedOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-2.5 font-medium text-primary-600">{o.number}</td>
                      <td className="p-2.5">{o.doc_date}</td>
                      <td className="p-2.5">
                        {o.lines?.map(l => `${l.product_name || 'Product'} (x${l.qty})`).join(', ') || 'Standard items'}
                      </td>
                      <td className="p-2.5 font-semibold">{fmt(o.total)}</td>
                      <td className="p-2.5">
                        <span className="badge-green text-xs">Fulfilled & Complete</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewModal.open && viewModal.doc && (
        <Modal
          isOpen={viewModal.open}
          onClose={() => setViewModal({ open: false, doc: null })}
          title={`Order Details — ${viewModal.doc.number}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-xs text-gray-400">Order Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{viewModal.doc.number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{viewModal.doc.doc_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <div className="mt-0.5"><StatusBadge status={viewModal.doc.status} /></div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Order Total</p>
                <p className="font-bold text-primary-600 text-base">{fmt(viewModal.doc.total)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Item Specifications</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Cost</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {(viewModal.doc.lines || []).map((l, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{l.product_name || `Item #${l.product_id}`}</td>
                        <td className="p-2 text-right">{l.qty}</td>
                        <td className="p-2 text-right">{fmt(l.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">{fmt(l.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn-secondary btn-sm"
                onClick={() => setViewModal({ open: false, doc: null })}
              >
                Close
              </button>
              {viewModal.doc.status === 'draft' && (
                <button
                  className="btn-primary btn-sm"
                  onClick={(e) => handleMarkDone(e, viewModal.doc)}
                >
                  <CheckCircle2 size={13} /> Mark Order Successfully Done
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
