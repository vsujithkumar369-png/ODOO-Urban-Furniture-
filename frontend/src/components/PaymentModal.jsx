import { useForm } from 'react-hook-form';
import { useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import { createPayment } from '../api/payments';
import toast from 'react-hot-toast';

export default function PaymentModal({ isOpen, onClose, document, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      amount: document?.amount_due ?? 0,
      pay_date: new Date().toISOString().slice(0, 10),
      method: 'bank',
      direction: document?.doc_type === 'CUSTOMER_INVOICE' ? 'receive' : 'send',
      note: '',
    },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await createPayment({ document_id: document.id, ...values });
      toast.success('Payment recorded!');
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const docLabel = document?.doc_type === 'CUSTOMER_INVOICE' ? 'Invoice' : 'Bill';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Register Payment — ${document?.number ?? docLabel}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Direction (readonly display) */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Payment Type</label>
            <input readOnly className="input bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed capitalize"
              value={document?.doc_type === 'CUSTOMER_INVOICE' ? 'Receive' : 'Send'} />
          </div>
          <div className="flex-1">
            <label className="label">Partner</label>
            <input readOnly className="input bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
              value={document?.contact_name ?? ''} />
          </div>
        </div>

        <div className="flex gap-3">
          <FormField label="Amount" name="amount" type="number" register={register} error={errors.amount}
            required className="flex-1"
            {...register('amount', { required: 'Amount required', min: { value: 0.01, message: 'Must be > 0' } })}
          />
          <FormField label="Payment Date" name="pay_date" type="date" register={register} error={errors.pay_date}
            required className="flex-1"
            {...register('pay_date', { required: 'Date required' })}
          />
        </div>

        <FormField label="Payment Via" name="method" type="select" register={register} error={errors.method}
          options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }]}
          {...register('method')}
        />

        <FormField label="Note" name="note" type="textarea" register={register} placeholder="Optional note..."
          {...register('note')}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-success" disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
