import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import FormField from '../../../components/FormField';
import ImageUpload from '../../../components/ImageUpload';
import { getProduct, createProduct, updateProduct } from '../../../api/products';
import toast from 'react-hot-toast';

const TYPE_OPTS = [
  { value: 'goods',   label: 'Goods'   },
  { value: 'service', label: 'Service' },
  { value: 'combo',   label: 'Combo'   },
];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  useEffect(() => {
    if (!isEdit) return;
    getProduct(id).then(r => reset(r.data.data)).catch(() => { toast.error('Not found.'); navigate('/products'); });
  }, [id]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) await updateProduct(id, { ...values, sales_price: +values.sales_price, cost: +values.cost });
      else await createProduct({ ...values, sales_price: +values.sales_price, cost: +values.cost });
      toast.success(`Product ${isEdit ? 'updated' : 'created'}!`);
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Product' : 'New Product'}>
        <button className="btn-secondary" onClick={() => navigate('/products')}><ArrowLeft size={15} /> Back</button>
        <button className="btn-primary" form="product-form" type="submit" disabled={loading} id="save-product-btn">
          <Save size={15} /> {loading ? 'Saving...' : 'Save'}
        </button>
      </PageHeader>

      <div className="card p-6 max-w-xl">
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          <div className="sm:col-span-2">
            <FormField label="Product Name" name="name" required register={register} error={errors.name} placeholder="e.g. Office Chair"
              {...register('name', { required: 'Name is required' })}
            />
          </div>
          <FormField label="Category" name="category" register={register} placeholder="e.g. Furniture" {...register('category')} />
          <FormField label="Type" name="type" type="select" register={register} options={TYPE_OPTS} error={errors.type}
            {...register('type', { required: 'Type is required' })}
          />
          <FormField label="Sales Price (₹)" name="sales_price" type="number" register={register} placeholder="0.00"
            {...register('sales_price', { min: 0 })}
          />
          <FormField label="Cost (₹)" name="cost" type="number" register={register} placeholder="0.00"
            {...register('cost', { min: 0 })}
          />
          <div className="sm:col-span-2">
            <ImageUpload
              label="Product Photo"
              value={watch('image_url')}
              onChange={(val) => setValue('image_url', val, { shouldDirty: true })}
              helperText="Click the + to select a furniture photo from your device"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
