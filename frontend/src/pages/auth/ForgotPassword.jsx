import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { KeyRound, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async () => {
    setLoading(true);
    // NOTE: No specific API endpoint defined in contract for password reset.
    // Show a placeholder success message.
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
    toast.success('If your details match, a reset link will be sent.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
            <KeyRound size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Forgot Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your details to reset access</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                If your Login ID and Email are registered, you will receive a reset link shortly.
              </p>
              <Link to="/login" className="btn-primary justify-center w-full">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="fp_login_id">Login ID <span className="text-red-500">*</span></label>
                <input id="fp_login_id" className={`input ${errors.login_id ? 'input-error' : ''}`} placeholder="Your login ID"
                  {...register('login_id', { required: 'Login ID required' })} />
                {errors.login_id && <p className="mt-1 text-xs text-red-500">{errors.login_id.message}</p>}
              </div>

              <div>
                <label className="label" htmlFor="fp_email">Email ID <span className="text-red-500">*</span></label>
                <input id="fp_email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="Registered email"
                  {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                {loading ? 'Sending...' : 'Reset Password'}
              </button>
            </form>
          )}

          <Link to="/login" className="flex items-center gap-1 justify-center mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
