import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';
import FormField from '../../../components/FormField';
import { getAnalytics, createAnalytic, updateAnalytic } from '../../../api/analytics';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'income',  label: 'Income'  },
  { value: 'expense', label: 'Expense' },
];

export default function AnalyticsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = () => getAnalytics().then(r => setList(r.data.data)).catch(() => toast.error('Failed.')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const onSubmit = async (values) => {
    try {
      if (modal.data) await updateAnalytic(modal.data.id, values);
      else await createAnalytic(values);
      toast.success('Saved!');
      setModal({ open: false, data: null });
      load();
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Save failed.'); }
  };

  const cols = [
    { key: 'name', label: 'Analytic Account' },
    { key: 'type', label: 'Type', render: v => <StatusBadge status={v} /> },
    { key: 'id', label: '', render: (_, row) => (
      <button className="btn-ghost btn-sm" onClick={e => { e.stopPropagation(); reset(row); setModal({ open: true, data: row }); }}>
        <Pencil size={13} />
      </button>
    )},
  ];

  return (
    <div>
      <PageHeader title="Analytic Accounts" subtitle="Track income and expense analytics">
        <button className="btn-primary" onClick={() => { reset({}); setModal({ open: true, data: null }); }} id="new-analytic-btn">
          <Plus size={15} /> New Analytic Account
        </button>
      </PageHeader>
      <DataTable columns={cols} data={list} loading={loading} emptyMessage="No analytic accounts yet." />

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: null })} title={modal.data ? 'Edit Analytic' : 'New Analytic Account'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Analytic Account Name" name="name" required register={register} error={errors.name}
            {...register('name', { required: 'Name required' })} />
          <FormField label="Type" name="type" type="select" register={register} options={TYPE_OPTS} error={errors.type}
            {...register('type', { required: 'Type required' })} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false, data: null })}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
