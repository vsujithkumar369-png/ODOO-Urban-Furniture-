import { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';
import FormField from '../../../components/FormField';
import { getCoa, createCoa, updateCoa } from '../../../api/coa';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'asset',    label: 'Asset'    },
  { value: 'liability',label: 'Liability'},
  { value: 'capital',  label: 'Capital'  },
  { value: 'income',   label: 'Income'   },
  { value: 'expense',  label: 'Expense'  },
  { value: 'bank',     label: 'Bank'     },
  { value: 'cash',     label: 'Cash'     },
];

export default function CoaList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = () => getCoa().then(r => setAccounts(r.data.data)).catch(() => toast.error('Failed to load.')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew  = () => { reset({}); setModal({ open: true, data: null }); };
  const openEdit = (row) => { reset(row); setModal({ open: true, data: row }); };

  const onSubmit = async (values) => {
    try {
      if (modal.data) await updateCoa(modal.data.id, values);
      else await createCoa(values);
      toast.success('Saved!');
      setModal({ open: false, data: null });
      load();
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Save failed.'); }
  };

  const cols = [
    { key: 'name', label: 'Account Name' },
    { key: 'type', label: 'Type', render: v => <StatusBadge status={v} /> },
    { key: 'id', label: '', render: (_, row) => (
      <button className="btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(row); }}><Pencil size={13} /></button>
    )},
  ];

  return (
    <div>
      <PageHeader title="Chart of Accounts" subtitle="Accounting ledger accounts">
        <button className="btn-primary" onClick={openNew} id="new-coa-btn"><Plus size={15} /> New Account</button>
      </PageHeader>
      <DataTable columns={cols} data={accounts} loading={loading} emptyMessage="No accounts. Pre-seeded accounts will appear after backend is connected." />

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: null })} title={modal.data ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Account Name" name="name" required register={register} error={errors.name}
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
