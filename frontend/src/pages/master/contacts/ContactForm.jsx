import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import FormField from '../../../components/FormField';
import ImageUpload from '../../../components/ImageUpload';
import { getContact, createContact, updateContact, deleteContact } from '../../../api/contacts';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'VENDOR',   label: 'Vendor'   },
  { value: 'BOTH',     label: 'Both (Customer & Vendor)' },
];

export default function ContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [copied, setCopied] = useState(false);
  const [portalInfo, setPortalInfo] = useState(null);

  const { register, handleSubmit, watch, reset, setValue, setError, formState: { errors } } = useForm({
    defaultValues: {
      type: 'CUSTOMER',
      country: 'India',
    },
  });

  const emailVal = watch('email', '');
  const typeVal  = watch('type', 'CUSTOMER');

  useEffect(() => {
    if (!isEdit) return;
    getContact(id)
      .then(r => {
        const d = r.data.data;
        reset({
          ...d,
          type: d.type ? d.type.toUpperCase() : 'CUSTOMER',
          country: d.country || 'India',
        });
        if (d.portal_user) {
          setPortalInfo(d.portal_user);
        }
        setFetching(false);
      })
      .catch(() => {
        toast.error('Contact not found.');
        navigate('/contacts');
      });
  }, [id, reset, navigate, isEdit]);

  const copyCredentials = () => {
    const loginId = portalInfo?.login_id || emailVal;
    const pwd = portalInfo?.temporary_password || '(Use assigned portal password)';
    const text = `Urban Furniture Customer Portal:\nLogin URL: ${window.location.origin}/login\nLogin ID: ${loginId}\nPassword: ${pwd}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Customer portal credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type.toUpperCase(),
        email: values.email ? values.email.trim() : null,
        mobile: values.mobile || '',
        street: values.street || '',
        city: values.city || '',
        state: values.state || '',
        country: values.country || 'India',
        pincode: values.pincode || '',
        image_url: values.image_url || null,
      };

      if (isEdit) {
        await updateContact(id, payload);
        toast.success('Contact updated successfully!');
      } else {
        const res = await createContact(payload);
        const created = res.data.data;
        if (created.portal_user) {
          setPortalInfo(created.portal_user);
          toast.success(
            `Contact created! Temp Password: ${created.portal_user.temporary_password}`,
            { duration: 8000 }
          );
        } else {
          toast.success('Contact created successfully!');
          navigate('/contacts');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Save failed.';
      if (msg.toLowerCase().includes('email already exists') || msg.toLowerCase().includes('duplicate')) {
        setError('email', { message: msg });
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact? This will be verified against existing documents.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteContact(id);
      toast.success('Contact deleted successfully.');
      navigate('/contacts');
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to delete contact.');
    } finally {
      setDeleting(false);
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Contact' : 'New Contact'} subtitle="Customers, vendors, and portal users">
        <button className="btn-secondary" onClick={() => navigate('/contacts')}>
          <ArrowLeft size={15} /> Back
        </button>
        {isEdit && (
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting || loading}
          >
            <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
        <button className="btn-primary" form="contact-form" type="submit" disabled={loading} id="save-contact-btn">
          <Save size={15} /> {loading ? 'Saving...' : 'Save Contact'}
        </button>
      </PageHeader>

      <div className="card p-6 max-w-2xl">
        {/* Customer Portal Credentials Info Box */}
        {emailVal && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium text-sm">
                <KeyRound size={16} className="text-indigo-600 dark:text-indigo-400" />
                Customer Portal Login Credentials
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-900/60 rounded-md border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </button>
            </div>
            <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Login ID:</span>{' '}
                <code className="font-mono bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded">
                  {portalInfo?.login_id || emailVal}
                </code>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Password:</span>{' '}
                <code className="font-mono bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded">
                  {portalInfo?.temporary_password || (isEdit ? '(Unchanged / Existing)' : 'Auto-generated on Save')}
                </code>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
              {portalInfo?.temporary_password
                ? 'Copy and share these temporary credentials with the contact for portal access.'
                : 'Customer login credentials will be generated and shown here after saving.'}
            </p>
          </div>
        )}

        <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          <div className="sm:col-span-2">
            <FormField
              label="Contact Name"
              name="name"
              required
              register={register}
              error={errors.name}
              placeholder="e.g. Nimesh Pathak"
              {...register('name', { required: 'Name is required' })}
            />
          </div>

          <FormField
            label="Type"
            name="type"
            type="select"
            register={register}
            options={TYPE_OPTS}
            error={errors.type}
            {...register('type', { required: 'Type is required' })}
          />

          <FormField
            label="Email (Unique & Portal Login)"
            name="email"
            type="email"
            register={register}
            error={errors.email}
            placeholder="nimesh@gmail.com"
            {...register('email', {
              pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email format' },
            })}
          />

          <FormField
            label="Mobile / Phone"
            name="mobile"
            register={register}
            placeholder="9876543210"
            error={errors.mobile}
            {...register('mobile')}
          />

          <FormField
            label="City"
            name="city"
            register={register}
            placeholder="Coimbatore"
            error={errors.city}
            {...register('city')}
          />

          <FormField
            label="State"
            name="state"
            register={register}
            placeholder="Tamil Nadu"
            error={errors.state}
            {...register('state')}
          />

          <FormField
            label="Country"
            name="country"
            register={register}
            placeholder="India"
            error={errors.country}
            {...register('country')}
          />

          <FormField
            label="Pincode"
            name="pincode"
            register={register}
            placeholder="641001"
            error={errors.pincode}
            {...register('pincode')}
          />

          <div className="sm:col-span-2">
            <FormField
              label="Street / Address"
              name="street"
              type="textarea"
              register={register}
              placeholder="Main Road"
              error={errors.street}
              {...register('street')}
            />
          </div>

          <div className="sm:col-span-2">
            <ImageUpload
              label="Contact Profile Photo"
              shape="rounded-full"
              value={watch('image_url')}
              onChange={(val) => setValue('image_url', val, { shouldDirty: true })}
              helperText="Click the + to select an avatar photo from your device"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
