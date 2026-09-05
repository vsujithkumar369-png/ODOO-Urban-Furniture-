import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import FormField from '../../../components/FormField';
import { getContact, createContact, updateContact } from '../../../api/contacts';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor',   label: 'Vendor'   },
  { value: 'both',     label: 'Both'     },
];

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!isEdit) return;
    getContact(id)
      .then(r => { reset(r.data.data); setFetching(false); })
      .catch(() => { toast.error('Contact not found.'); navigate('/contacts'); });
  }, [id]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateContact(id, values);
        toast.success('Contact updated!');
      } else {
        await createContact(values);
        toast.success('Contact created! Portal access also created.');
      }
      navigate('/contacts');
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Contact' : 'New Contact'} subtitle="Customers and vendors">
        <button className="btn-secondary" onClick={() => navigate('/contacts')}><ArrowLeft size={15} /> Back</button>
        <button className="btn-primary" form="contact-form" type="submit" disabled={loading} id="save-contact-btn">
          <Save size={15} /> {loading ? 'Saving...' : 'Save'}
        </button>
      </PageHeader>

      <div className="card p-6 max-w-2xl">
        <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          <div className="sm:col-span-2">
            <FormField label="Contact Name" name="name" required register={register} error={errors.name}
              placeholder="e.g. Rahul Sharma"
              {...register('name', { required: 'Name is required' })}
            />
          </div>
          <FormField label="Type" name="type" type="select" register={register} options={TYPE_OPTS} error={errors.type}
            {...register('type', { required: 'Type is required' })}
          />
          <FormField label="Email" name="email" type="email" register={register} error={errors.email} placeholder="email@example.com"
            {...register('email')}
          />
          <FormField label="Mobile" name="mobile" register={register} placeholder="+91 9XXXXXXXXX" {...register('mobile')} />
          <FormField label="City" name="city" register={register} {...register('city')} />
          <FormField label="State" name="state" register={register} {...register('state')} />
          <FormField label="Pincode" name="pincode" register={register} {...register('pincode')} />
          <div className="sm:col-span-2">
            <FormField label="Street / Address" name="street" type="textarea" register={register} {...register('street')} />
          </div>
          <div className="sm:col-span-2">
            <FormField label="Image URL" name="image_url" register={register} placeholder="https://..." {...register('image_url')} />
          </div>
        </form>
      </div>
    </div>
  );
}
