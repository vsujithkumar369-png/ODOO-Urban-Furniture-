import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import FormField from '../../../components/FormField';
import StatusBadge from '../../../components/StatusBadge';
import { getBudget, createBudget, updateBudget, confirmBudget, reviseBudget } from '../../../api/budgets';
import { getAnalytics } from '../../../api/analytics';
import { getContacts } from '../../../api/contacts';
import toast from 'react-hot-toast';

const TYPE_OPTS = [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }];
const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function BudgetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [budget, setBudget] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    try {
      const [a, c] = await Promise.all([getAnalytics(), getContacts()]);
      setAnalytics(a.data.data);
      setContacts(c.data.data);
      if (isEdit) {
        const b = await getBudget(id);
        setBudget(b.data.data);
        reset(b.data.data);
      }
    } catch { toast.error('Failed to load.'); navigate('/budgets'); }
    finally { setFetching(false); }
  };
  useEffect(() => { load(); }, [id]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) await updateBudget(id, values);
      else { const r = await createBudget(values); navigate(`/budgets/${r.data.data.id}`); return; }
      toast.success('Budget saved!');
      load();
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Save failed.'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    try { await confirmBudget(id); toast.success('Budget confirmed!'); load(); }
    catch (err) { toast.error(err.response?.data?.error?.message ?? 'Confirm failed.'); }
  };

  const handleRevise = async () => {
    try {
      const r = await reviseBudget(id);
      toast.success('Budget revised! New budget created.');
      navigate(`/budgets/${r.data.data.id}`);
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Revise failed.'); }
  };

  if (fetching) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  const isDraft = !budget?.status || budget.status === 'draft';
  const isConfirmed = budget?.status === 'confirmed';

  return (
    <div>
      <PageHeader title={isEdit ? `Budget: ${budget?.name}` : 'New Budget'} subtitle="Plan and monitor financial budgets">
        <button className="btn-secondary" onClick={() => navigate('/budgets')}><ArrowLeft size={15} /> Back</button>
        {isDraft && (
          <button className="btn-primary" form="budget-form" type="submit" disabled={loading} id="save-budget-btn">
            <Save size={15} /> {loading ? 'Saving...' : 'Save'}
          </button>
        )}
        {isDraft && isEdit && (
          <button className="btn-success" onClick={handleConfirm} id="confirm-budget-btn">
            <CheckCircle size={15} /> Confirm
          </button>
        )}
        {isConfirmed && (
          <button className="btn-warning" onClick={handleRevise} id="revise-budget-btn">
            <RotateCcw size={15} /> Revise
          </button>
        )}
      </PageHeader>

      {/* Status bar */}
      {budget && (
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={budget.status} />
          {budget.revision_of_id && (
            <span className="text-xs text-gray-500">Revision of Budget #{budget.revision_of_id}</span>
          )}
        </div>
      )}

      {/* Achieved summary (only when confirmed) */}
      {isConfirmed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Committed',      val: fmt(budget.committed_amount), color: 'text-gray-900 dark:text-gray-100' },
            { label: 'Achieved',       val: fmt(budget.achieved_amount),  color: 'text-green-600 dark:text-green-400' },
            { label: 'Amount To Achieve', val: fmt(budget.amount_to_achieve), color: 'text-amber-600 dark:text-amber-400' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.val}</p>
              {s.label === 'Achieved' && budget.achieved_percent != null && (
                <p className="text-xs text-gray-400 mt-0.5">{Number(budget.achieved_percent).toFixed(1)}% of committed</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card p-6 max-w-2xl">
        <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          <div className="sm:col-span-2">
            <FormField label="Budget Name" name="name" required register={register} error={errors.name}
              {...register('name', { required: 'Name required' })} placeholder="e.g. Furniture Expense Jan"
            />
          </div>
          <FormField label="Start Date" name="start_date" type="date" register={register} {...register('start_date')} />
          <FormField label="End Date"   name="end_date"   type="date" register={register} {...register('end_date')} />
          <FormField label="Analytic Account" name="analytic_account_id" type="select" register={register}
            options={analytics.map(a => ({ value: a.id, label: a.name }))}
            {...register('analytic_account_id')} />
          <FormField label="Type" name="type" type="select" register={register} options={TYPE_OPTS} error={errors.type}
            {...register('type', { required: 'Type required' })} />
          <FormField label="Committed Amount (₹)" name="committed_amount" type="number" register={register}
            {...register('committed_amount', { min: 0 })} />
          <FormField label="Responsible" name="responsible" register={register} placeholder="Name of responsible person" {...register('responsible')} />
        </form>
      </div>
    </div>
  );
}
