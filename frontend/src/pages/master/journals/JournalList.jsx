import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';
import FormField from '../../../components/FormField';
import { getJournals, createJournal, updateJournal } from '../../../api/journals';
import { getCoa } from '../../../api/coa';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'sales',    label: 'Sales'    },
  { value: 'purchase', label: 'Purchase' },
  { value: 'bank',     label: 'Bank'     },
  { value: 'cash',     label: 'Cash'     },
];

export default function JournalList() {
  const [journals, setJournals] = useState([]);
  const [coa, setCoa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    try {
      const [j, c] = await Promise.all([getJournals(), getCoa()]);
      setJournals(j.data.data);
      setCoa(c.data.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const coaOpts = coa.map(a => ({ value: a.id, label: a.name }));

  const onSubmit = async (values) => {
    try {
      if (modal.data) await updateJournal(modal.data.id, values);
      else await createJournal(values);
      toast.success('Saved!');
      setModal({ open: false, data: null });
      load();
    } catch (err) { toast.error(err.response?.data?.error?.message ?? 'Save failed.'); }
  };

  const cols = [
    { key: 'name',                 label: 'Journal' },
    { key: 'type',                 label: 'Type', render: v => <StatusBadge status={v} /> },
    { key: 'default_account_name', label: 'Default Account' },
    { key: 'id', label: '', render: (_, row) => (
      <button className="btn-ghost btn-sm" onClick={e => { e.stopPropagation(); reset(row); setModal({ open: true, data: row }); }}>
        <Pencil size={13} />
      </button>
    )},
  ];

  return (
    <div>
      <PageHeader title="Journals" subtitle="Journal book configuration">
        <button className="btn-primary" onClick={() => { reset({}); setModal({ open: true, data: null }); }} id="new-journal-btn">
          <Plus size={15} /> New Journal
        </button>
      </PageHeader>
      <DataTable columns={cols} data={journals} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, data: null })} title={modal.data ? 'Edit Journal' : 'New Journal'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Journal Name" name="name" required register={register} error={errors.name}
            {...register('name', { required: 'Name required' })} />
          <FormField label="Type" name="type" type="select" register={register} options={TYPE_OPTS} error={errors.type}
            {...register('type', { required: 'Type required' })} />
          <FormField label="Default Account" name="default_account_id" type="select" register={register} options={coaOpts}
            {...register('default_account_id')} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false, data: null })}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
