import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, LineChart, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import FormField from '../../../components/FormField';
import { getAnalytics, createAnalytic, updateAnalytic, deleteAnalytic } from '../../../api/analytics';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'INCOME',  label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

const fmt = n => (n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—');

export default function AnalyticsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modal, setModal] = useState({ open: false, data: null });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { name: '', type: 'EXPENSE' }
  });

  const loadData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (typeFilter !== 'ALL') params.type = typeFilter;
    if (search.trim()) params.search = search.trim();

    getAnalytics(params)
      .then(r => setList(r.data.data || []))
      .catch(() => toast.error('Failed to load analytic accounts.'))
      .finally(() => setLoading(false));
  }, [typeFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = () => {
    setFormError('');
    reset({ name: '', type: 'EXPENSE' });
    setModal({ open: true, data: null });
  };

  const openEdit = (row) => {
    setFormError('');
    reset({
      name: row.name,
      type: (row.type || 'EXPENSE').toUpperCase()
    });
    setModal({ open: true, data: row });
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type.toUpperCase()
      };

      if (modal.data) {
        await updateAnalytic(modal.data.id, payload);
        toast.success(`Analytic Account "${payload.name}" updated successfully!`);
      } else {
        await createAnalytic(payload);
        toast.success(`Analytic Account "${payload.name}" created successfully!`);
      }

      setModal({ open: false, data: null });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save analytic account';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, row) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete analytic account "${row.name}"?`)) return;

    try {
      await deleteAnalytic(row.id);
      toast.success(`Analytic account "${row.name}" deleted successfully.`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete analytic account';
      toast.error(msg);
    }
  };

  const getTypeBadge = (type) => {
    const isIncome = (type || '').toUpperCase() === 'INCOME';
    return isIncome ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <TrendingUp size={12} /> Income
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
        <TrendingDown size={12} /> Expense
      </span>
    );
  };

  const cols = [
    {
      key: 'name',
      label: 'Name',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-primary-600">
            <LineChart size={14} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{v}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: v => getTypeBadge(v)
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (_, row) => (
        <span className="font-mono text-gray-600 dark:text-gray-300">
          {row.budget != null ? fmt(row.budget) : (row.committed_amount != null ? fmt(row.committed_amount) : '—')}
        </span>
      )
    },
    {
      key: 'achieved',
      label: 'Achieved',
      render: (_, row) => (
        <span className="font-mono text-gray-600 dark:text-gray-300">
          {row.achieved != null ? fmt(row.achieved) : (row.achieved_amount != null ? fmt(row.achieved_amount) : '—')}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => openEdit(row)}
            title="Edit Analytic Account"
          >
            <Pencil size={14} />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={(e) => handleDelete(e, row)}
            title="Delete Analytic Account"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytic Accounts"
        subtitle="Financial markers used to group and monitor income or expenses for projects and departments"
      >
        <button className="btn-primary" onClick={openNew} id="new-analytic-btn">
          <Plus size={15} /> New Analytic Account
        </button>
      </PageHeader>

      {/* Toolbar: Search and Type Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search Analytic Account..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'INCOME', label: 'Income' },
            { id: 'EXPENSE', label: 'Expense' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                typeFilter === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={cols}
        data={list}
        loading={loading}
        onRowClick={openEdit}
        emptyMessage="No analytic accounts found."
      />

      {/* Create / Edit Modal Form */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        title={modal.data ? 'Edit Analytic Account' : 'Create Analytic Account'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
              {formError}
            </div>
          )}

          <FormField
            label="Analytic Account Name"
            name="name"
            required
            register={register}
            error={errors.name}
            placeholder="e.g. Office Furniture, Raw Material, Marketing"
            {...register('name', { required: 'Analytic account name is required' })}
          />

          <FormField
            label="Type"
            name="type"
            type="select"
            register={register}
            options={TYPE_OPTS}
            error={errors.type}
            {...register('type', { required: 'Type is required' })}
          />

          {/* If editing and backend provides budget info, show informative readouts without client calculation */}
          {modal.data && (modal.data.budget != null || modal.data.committed_amount != null) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Committed Budget:</span>
                <span className="font-semibold">{fmt(modal.data.budget || modal.data.committed_amount)}</span>
              </div>
              {modal.data.achieved != null && (
                <div className="flex justify-between">
                  <span>Achieved to Date:</span>
                  <span className="font-semibold text-emerald-600">{fmt(modal.data.achieved)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal({ open: false, data: null })}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
