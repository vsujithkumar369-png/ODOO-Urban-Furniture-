// Unified document form — handles PO / VENDOR_BILL / SO / CUSTOMER_INVOICE
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, CheckCircle, FileInput, CreditCard, Link as LinkIcon } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import PaymentModal from '../../components/PaymentModal';
import { getDocument, createDocument, updateDocument, confirmDocument, convertDocument } from '../../api/documents';
import { getContacts } from '../../api/contacts';
import { getProducts } from '../../api/products';
import { getAnalytics } from '../../api/analytics';
import { getCoa } from '../../api/coa';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

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

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { lines: [{ product_id: '', analytic_account_id: '', qty: 1, unit_price: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');
  const grandTotal = (lines ?? []).reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0);

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
  }, [id]);

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
      const payload = {
        doc_type: docType,
        contact_id: +values.contact_id,
        doc_date: values.doc_date,
        due_date: values.due_date,
        reference: values.reference,
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
  }, [id]);

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
    } else {
      loadDoc();
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  const isDraft     = !doc?.status || doc.status === 'draft';
  const isConfirmed = doc?.status === 'confirmed';
  const isPaid      = doc?.status === 'paid';
  const canConfirm  = isEdit && isDraft;
  const canConvert  = isEdit && isConfirmed && cfg.convertBtn;
  const canPay      = isEdit && isConfirmed && cfg.showPayment && !isPaid && (doc?.amount_due ?? 0) > 0;

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
            <CreditCard size={15} /> Pay Now
          </button>
        )}
        {isPaid && <span className="badge-green text-sm px-3 py-1.5">✓ Paid</span>}
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

      {/* Payment summary */}
      {doc && (doc.amount_paid > 0 || isPaid) && (
        <div className="flex gap-4 mb-4 text-sm">
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
            <span className="font-semibold text-amber-600">{fmt(doc.amount_due)}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card p-6">
        <form id="doc-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <FormField label={cfg.contactLabel} name="contact_id" type="select" register={register}
              options={contactOpts} error={errors.contact_id}
              {...register('contact_id', { required: `${cfg.contactLabel} is required` })} />
            <FormField label="Date" name="doc_date" type="date" register={register} {...register('doc_date')} />
            <FormField label="Due Date" name="due_date" type="date" register={register} {...register('due_date')} />
            <FormField label="Reference" name="reference" register={register} placeholder="External ref..." {...register('reference')} />
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
                    <th>Total</th>
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
                  {/* Grand total row */}
                  <tr className="bg-gray-50 dark:bg-gray-800/60">
                    <td colSpan={(docType === 'VENDOR_BILL' || docType === 'CUSTOMER_INVOICE') ? 6 : 5}
                      className="text-right text-sm font-semibold text-gray-700 dark:text-gray-300 pr-2">
                      Grand Total
                    </td>
                    <td className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(doc?.total ?? grandTotal)}</td>
                    {isDraft && <td />}
                  </tr>
                </tbody>
              </table>
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
    </div>
  );
}
