import { useState, useEffect } from 'react';
import { Truck, Check, X, ArrowRight, Package } from 'lucide-react';
import { getContacts } from '../api/contacts';
import { createDocument } from '../api/documents';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function AssignVendorModal({ isOpen, onClose, sourceDocument, onAssigned }) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [vendorLines, setVendorLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isOpen || !sourceDocument) return;

    setFetching(true);
    getContacts({ type: 'vendor' })
      .then(res => {
        // Filter contacts that are vendor or both
        const list = (res.data.data ?? []).filter(c => c.type === 'vendor' || c.type === 'both');
        setVendors(list);
        if (list.length > 0) {
          setSelectedVendorId(String(list[0].id));
        }
      })
      .catch(() => toast.error('Failed to load vendors list.'))
      .finally(() => setFetching(false));

    // Initialize vendor lines from source customer order lines
    const lines = (sourceDocument.lines ?? []).map(l => ({
      product_id: l.product_id,
      product_name: l.product_name,
      qty: l.qty,
      unit_price: l.unit_price, // accountant can adjust purchase cost
      analytic_account_id: l.analytic_account_id,
      analytic_account_name: l.analytic_account_name,
    }));
    setVendorLines(lines);
  }, [isOpen, sourceDocument]);

  if (!isOpen || !sourceDocument) return null;

  const handlePriceChange = (index, newPrice) => {
    setVendorLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], unit_price: parseFloat(newPrice) || 0 };
      return copy;
    });
  };

  const handleQtyChange = (index, newQty) => {
    setVendorLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], qty: parseFloat(newQty) || 0 };
      return copy;
    });
  };

  const totalPurchaseCost = vendorLines.reduce(
    (sum, l) => sum + (Number(l.qty || 0) * Number(l.unit_price || 0)),
    0
  );

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error('Please select a vendor to assign this order.');
      return;
    }

    setLoading(true);
    try {
      const selectedVendor = vendors.find(v => String(v.id) === String(selectedVendorId));
      const vendorName = selectedVendor ? selectedVendor.name : 'Vendor';

      const poPayload = {
        doc_type: 'PO',
        contact_id: parseInt(selectedVendorId),
        doc_date: new Date().toISOString().split('T')[0],
        due_date: expectedDate,
        reference: `Fulfillment for ${sourceDocument.contact_name ?? 'Customer'} (${sourceDocument.number})`,
        lines: vendorLines.map(l => ({
          product_id: l.product_id,
          analytic_account_id: l.analytic_account_id,
          qty: l.qty,
          unit_price: l.unit_price,
        })),
      };

      const res = await createDocument(poPayload);
      const newPo = res.data.data;

      toast.success(`Assigned to ${vendorName}! Purchase Order ${newPo.number} created.`);
      onClose();

      if (onAssigned) onAssigned(newPo, vendorName);

      // Offer to navigate directly to the new PO
      navigate(`/purchase-orders/${newPo.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create vendor purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="card w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Assign Vendor & Generate Purchase Order
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Customer Order: <span className="font-medium text-gray-700 dark:text-gray-300">{sourceDocument.number}</span> ({sourceDocument.contact_name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading vendors...</div>
        ) : (
          <form onSubmit={handleAssign} className="p-6 space-y-5">
            {/* Vendor Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Select Supplier / Vendor <span className="text-red-500">*</span>
                </label>
                {vendors.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    No vendors found. Please add a vendor in <strong>Master Data &gt; Contacts</strong> first.
                  </div>
                ) : (
                  <select
                    className="input"
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    required
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.city ? `(${v.city})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  The accountant selects which vendor will manufacture or deliver this order.
                </p>
              </div>

              <div>
                <label className="label">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="input"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Products to Procure from Vendor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0 flex items-center gap-1.5">
                  <Package size={14} className="text-gray-500" />
                  Products to Procure from Selected Vendor
                </label>
                <span className="text-xs text-gray-500">
                  Total PO Cost: <strong className="text-gray-900 dark:text-gray-100">{fmt(totalPurchaseCost)}</strong>
                </span>
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="w-24">Qty</th>
                      <th className="w-32">Vendor Cost</th>
                      <th className="text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="font-medium text-sm text-gray-800 dark:text-gray-200">
                          {line.product_name || `Product #${line.product_id}`}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="input text-xs py-1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            className="input text-xs py-1 font-mono"
                          />
                        </td>
                        <td className="text-right font-medium text-sm text-gray-900 dark:text-gray-100">
                          {fmt((line.qty || 0) * (line.unit_price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || vendors.length === 0}
                className="btn-primary"
              >
                <Check size={16} />
                {loading ? 'Creating PO...' : 'Assign Vendor & Create Purchase Order'}
                <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
