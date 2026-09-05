// Unified document form — handles PO / VENDOR_BILL / SO / CUSTOMER_INVOICE
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, CheckCircle, FileInput, CreditCard, Link as LinkIcon, Truck, Receipt, Check, Printer } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import PaymentModal from '../../components/PaymentModal';
import AssignVendorModal from '../../components/AssignVendorModal';
import { getDocument, createDocument, updateDocument, confirmDocument, convertDocument } from '../../api/documents';
import { getContacts } from '../../api/contacts';
import { getProducts } from '../../api/products';
import { getAnalytics } from '../../api/analytics';
import { getCoa } from '../../api/coa';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const TAX_RATES = [
  { value: 0,  label: '0% (No Tax)' },
  { value: 5,  label: '5% (GST 5%)' },
  { value: 12, label: '12% (GST 12%)' },
  { value: 18, label: '18% (GST 18% - Standard)' },
  { value: 28, label: '28% (GST 28% - Luxury)' },
];

// Labels / routing config per doc type
const CFG = {
  PO: {
    title: 'Purchase Order', contactLabel: 'Vendor',
    listRoute: '/purchase-orders',
    convertBtn: 'Create Vendor Bill',
    convertNote: 'Creates a Vendor Bill from this PO',
  },
  VENDOR_BILL: {
    title: 'Vendor Bill', contactLabel: 'Vendor',
    listRoute: '/bills',
    showPayment: true,
  },
  SO: {
    title: 'Sales Order', contactLabel: 'Customer',
    listRoute: '/sales-orders',
    convertBtn: 'Create Invoice',
    convertNote: 'Creates a Customer Invoice from this SO',
  },
  CUSTOMER_INVOICE: {
    title: 'Customer Invoice', contactLabel: 'Customer',
    listRoute: '/invoices',
    showPayment: true,
  },
};

export default function DocumentForm({ docType }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const cfg = CFG[docType];

  const [doc, setDoc] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [coa, setCoa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [assignVendorModal, setAssignVendorModal] = useState(false);
  const [taxRate, setTaxRate] = useState(18); // Default 18% GST

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { lines: [{ product_id: '', analytic_account_id: '', qty: 1, unit_price: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');
  
  // Calculate subtotal, tax, and total
  const subTotal = (lines ?? []).reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0);
  const taxAmount = (subTotal * taxRate) / 100;
  const calculatedGrandTotal = subTotal + taxAmount;

  // Load master data + document
  useEffect(() => {
    const loads = [getContacts(), getProducts(), getAnalytics(), getCoa()];
    if (isEdit) loads.push(getDocument(id));
    Promise.all(loads).then(([c, p, a, coaR, d]) => {
      setContacts(c.data.data);
      setProducts(p.data.data);
      setAnalytics(a.data.data);
      setCoa(coaR.data.data);
      if (d) {
        setDoc(d.data.data);
        reset({
          ...d.data.data,
          contact_id: d.data.data.contact_id,
          lines: d.data.data.lines ?? [],
        });
      }
    }).catch(() => toast.error('Failed to load.'))
    .finally(() => setFetching(false));
  }, [id, isEdit, reset]);

  // Auto-fill unit price when product is selected
  const handleProductChange = (lineIdx, productId) => {
    const prod = products.find(p => String(p.id) === String(productId));
    if (prod) {
      const price = docType === 'CUSTOMER_INVOICE' || docType === 'SO' ? prod.sales_price : prod.cost;
      setValue(`lines.${lineIdx}.unit_price`, price ?? 0);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const refString = values.reference 
        ? `${values.reference} | Tax: ${taxRate}% (${fmt(taxAmount)})`
        : `Tax: ${taxRate}% (${fmt(taxAmount)})`;

      const payload = {
        doc_type: docType,
        contact_id: +values.contact_id,
        doc_date: values.doc_date,
        due_date: values.due_date,
        reference: refString,
        lines: values.lines.map(l => ({
          product_id: +l.product_id,
          analytic_account_id: l.analytic_account_id ? +l.analytic_account_id : undefined,
          qty: +l.qty,
          unit_price: +l.unit_price,
        })),
      };
      if (isEdit) {
        await updateDocument(id, payload);
        toast.success('Saved!');
        loadDoc();
      } else {
        const r = await createDocument(payload);
        toast.success('Created!');
        navigate(`${cfg.listRoute}/${r.data.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadDoc = useCallback(async () => {
    if (!id) return;
    const d = await getDocument(id);
    setDoc(d.data.data);
    reset({ ...d.data.data, lines: d.data.data.lines ?? [] });
  }, [id, reset]);

  const handleConfirm = async () => {
    try {
      const r = await confirmDocument(id);
      toast.success('Confirmed! Journal entry created automatically.');
      setDoc(prev => ({ ...prev, status: 'confirmed', journal_entry_id: r.data.data.journal_entry_id }));
      loadDoc();
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Confirm failed.'); }
  };

  const handleConvert = async () => {
    try {
      const r = await convertDocument(id);
      toast.success('Converted!');
      const newId = r.data.data.id;
      const route = docType === 'PO' ? `/bills/${newId}` : `/invoices/${newId}`;
      navigate(route);
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Convert failed.'); }
  };

  const handlePaySuccess = (res) => {
    if (res?.document_status) {
      setDoc(prev => ({ ...prev, status: res.document_status, amount_due: 0, amount_paid: prev?.total }));
      toast.success('Payment approved and recorded!');
    } else {
      loadDoc();
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  const isDraft        = !doc?.status || doc.status === 'draft';
  const isConfirmed    = doc?.status === 'confirmed';
  const isPaid         = doc?.status === 'paid';
  const canConfirm     = isEdit && isDraft;
  const canConvert     = isEdit && isConfirmed && cfg.convertBtn;
  const canPay         = isEdit && isConfirmed && cfg.showPayment && !isPaid && (doc?.amount_due ?? 0) > 0;
  
  // Accountant can assign vendor to fulfill customer orders once placed/confirmed/paid
  const canAssignVendor = isEdit && (docType === 'CUSTOMER_INVOICE' || docType === 'SO') && (isConfirmed || isPaid);

  const contactOpts  = contacts.map(c => ({ value: c.id, label: c.name }));
  const productOpts  = products.map(p => ({ value: p.id, label: p.name }));
  const analyticOpts = analytics.map(a => ({ value: a.id, label: a.name }));
  const coaOpts      = coa.map(a => ({ value: a.id, label: a.name }));

  return (
    <div>
      <PageHeader
        title={isEdit ? `${cfg.title}: ${doc?.number ?? '...'}` : `New ${cfg.title}`}
        subtitle={cfg.contactLabel + ' transaction'}
      >
        <button className="btn-secondary" onClick={() => navigate(cfg.listRoute)}><ArrowLeft size={15} /> Back</button>
        {isDraft && (
          <button className="btn-primary" form="doc-form" type="submit" disabled={loading} id="save-doc-btn">
            {loading ? 'Saving...' : 'Save'}
          </button>
        )}
        {canConfirm && (
          <button className="btn-success" onClick={handleConfirm} id="confirm-doc-btn">
            <CheckCircle size={15} /> Confirm
          </button>
        )}
        {canConvert && (
          <button className="btn-warning" onClick={handleConvert} id="convert-doc-btn" title={cfg.convertNote}>
            <FileInput size={15} /> {cfg.convertBtn}
          </button>
        )}
        {canPay && (
          <button className="btn-primary" onClick={() => setPayModal(true)} id="pay-doc-btn">
            <CreditCard size={15} /> Approve & Record Payment
          </button>
        )}
        {canAssignVendor && (
          <button
            type="button"
            className="btn-secondary text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            onClick={() => setAssignVendorModal(true)}
            id="assign-vendor-btn"
            title="Assign a vendor to procure and fulfill these items"
          >
            <Truck size={15} /> Assign to Vendor (Create PO)
          </button>
        )}
        {isEdit && doc && (
          <button
            type="button"
            className="btn-secondary text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            onClick={() => {
              const contact = contacts.find(c => String(c.id) === String(doc?.contact_id));
              generateInvoicePDF(doc, contact);
            }}
            id="print-invoice-pdf-btn"
            title="Generate & Download Professional PDF Bill"
          >
            <Printer size={15} /> Generate PDF Bill
          </button>
        )}
        {isPaid && <span className="badge-green text-sm px-3 py-1.5">✓ Payment Approved & Paid</span>}
      </PageHeader>

      {/* Status + journal link */}
      {doc && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <StatusBadge status={doc.status} />
          {doc.source_document_number && (
            <span className="text-xs text-gray-500">
              <LinkIcon size={11} className="inline mr-1" />
              From: {doc.source_document_number}
            </span>
          )}
          {doc.journal_entry_id && (
            <button
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              onClick={() => navigate(`/journal-entries/${doc.journal_entry_id}`)}
            >
              View Journal Entry #{doc.journal_entry_id}
            </button>
          )}
        </div>
      )}

      {/* Payment & Invoice summary */}
      {doc && (
        <div className="flex gap-4 mb-4 text-sm flex-wrap">
          <div className="card px-4 py-2 flex gap-2 items-center">
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold">{fmt(doc.total)}</span>
          </div>
          <div className="card px-4 py-2 flex gap-2 items-center">
            <span className="text-gray-500">Paid:</span>
            <span className="font-semibold text-green-600">{fmt(doc.amount_paid)}</span>
          </div>
          <div className="card px-4 py-2 flex gap-2 items-center">
            <span className="text-gray-500">Due:</span>
            <span className={`font-semibold ${doc.amount_due > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
              {fmt(doc.amount_due)}
            </span>
          </div>
          {isPaid && (
            <div className="card px-4 py-2 flex gap-2 items-center border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
              <Check size={14} className="text-green-600" />
              <span className="text-xs font-medium">Accountant Approved</span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="card p-6">
        <form id="doc-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <FormField label={cfg.contactLabel} name="contact_id" type="select" register={register}
              options={contactOpts} error={errors.contact_id}
              {...register('contact_id', { required: `${cfg.contactLabel} is required` })} />
            <FormField label="Date" name="doc_date" type="date" register={register} {...register('doc_date')} />
            <FormField label="Due Date" name="due_date" type="date" register={register} {...register('due_date')} />
            <FormField label="Reference / Notes" name="reference" register={register} placeholder="External ref or order ID..." {...register('reference')} />
          </div>

          {/* Line items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Line Items</h3>
              {isDraft && (
                <button type="button" className="btn-ghost btn-sm text-primary-600 dark:text-primary-400"
                  onClick={() => append({ product_id: '', analytic_account_id: '', qty: 1, unit_price: 0 })}>
                  <Plus size={13} /> Add Line
                </button>
              )}
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    {(docType === 'VENDOR_BILL' || docType === 'CUSTOMER_INVOICE') && <th>Account</th>}
                    <th>Analytic</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    {isDraft && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, i) => {
                    const lineTotal = Number(lines?.[i]?.qty || 0) * Number(lines?.[i]?.unit_price || 0);
                    return (
                      <tr key={field.id}>
                        <td className="text-gray-400">{i + 1}</td>
                        <td>
                          {isDraft ? (
                            <select className="input text-xs py-1"
                              {...register(`lines.${i}.product_id`)}
                              onChange={e => handleProductChange(i, e.target.value)}>
                              <option value="">Select...</option>
                              {productOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : <span className="text-sm">{lines[i]?.product_name ?? '—'}</span>}
                        </td>
                        {(docType === 'VENDOR_BILL' || docType === 'CUSTOMER_INVOICE') && (
                          <td>
                            {isDraft ? (
                              <select className="input text-xs py-1" {...register(`lines.${i}.account_id`)}>
                                <option value="">Select...</option>
                                {coaOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            ) : <span className="text-sm">{lines[i]?.account_name ?? '—'}</span>}
                          </td>
                        )}
                        <td>
                          {isDraft ? (
                            <select className="input text-xs py-1" {...register(`lines.${i}.analytic_account_id`)}>
                              <option value="">None</option>
                              {analyticOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : <span className="text-sm">{lines[i]?.analytic_account_name ?? '—'}</span>}
                        </td>
                        <td>
                          {isDraft
                            ? <input type="number" min="1" className="input text-xs py-1 w-16" {...register(`lines.${i}.qty`)} />
                            : <span className="text-sm">{lines[i]?.qty}</span>}
                        </td>
                        <td>
                          {isDraft
                            ? <input type="number" min="0" step="0.01" className="input text-xs py-1 w-24" {...register(`lines.${i}.unit_price`)} />
                            : <span className="text-sm">{fmt(lines[i]?.unit_price)}</span>}
                        </td>
                        <td className="font-medium text-sm">{fmt(lineTotal)}</td>
                        {isDraft && (
                          <td>
                            <button type="button" className="btn-icon btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => remove(i)}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tax & Grand Total Summary Box */}
            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Items Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(subTotal)}</span>
              </div>

              {/* Tax selection (editable in draft) */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Receipt size={14} className="text-primary-500" />
                  <span>Tax / GST:</span>
                </div>
                {isDraft ? (
                  <select
                    className="input text-xs py-0.5 px-2 w-36"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                  >
                    {TAX_RATES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {taxRate}% ({fmt(taxAmount)})
                  </span>
                )}
              </div>

              {taxRate > 0 && isDraft && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Calculated Tax:</span>
                  <span>+{fmt(taxAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-base font-bold text-gray-900 dark:text-gray-100">
                <span>Total Amount:</span>
                <span className="text-primary-600 dark:text-primary-400">
                  {fmt(doc?.total ?? calculatedGrandTotal)}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Payment modal */}
      <PaymentModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        document={doc}
        onSuccess={handlePaySuccess}
      />

      {/* Assign Vendor Modal (Accountant selects which vendor fulfills the product) */}
      <AssignVendorModal
        isOpen={assignVendorModal}
        onClose={() => setAssignVendorModal(false)}
        sourceDocument={doc}
        onAssigned={() => {
          loadDoc();
        }}
      />
    </div>
  );
}
