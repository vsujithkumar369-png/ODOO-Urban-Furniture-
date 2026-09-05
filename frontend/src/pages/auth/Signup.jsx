import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup as signupApi } from '../../api/auth';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/;

export default function Signup() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors }, setError } = useForm();
  const pwd = watch('password', '');

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await signupApi({ name: values.name, login_id: values.login_id, email: values.email, password: values.password });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Signup failed.';
      setError('root', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
            <span className="text-white font-bold text-xl">UF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign up as an invoicing user</p>
        </div>

        <div className="card p-8">
          {errors.root && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {errors.root.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label className="label" htmlFor="name">Full Name <span className="text-red-500">*</span></label>
              <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} placeholder="e.g. Priya Shah"
                {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Login ID */}
            <div>
              <label className="label" htmlFor="login_id">Login ID <span className="text-red-500">*</span></label>
              <input id="login_id" className={`input ${errors.login_id ? 'input-error' : ''}`} placeholder="6–12 characters"
                {...register('login_id', {
                  required: 'Login ID required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                  maxLength: { value: 12, message: 'Maximum 12 characters' },
                })} />
              {errors.login_id && <p className="mt-1 text-xs text-red-500">{errors.login_id.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email ID <span className="text-red-500">*</span></label>
              <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="email@example.com"
                {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input id="password" type={showPwd ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="Strong password"
                  {...register('password', {
                    required: 'Password required',
                    validate: v => PWD_RE.test(v) || 'Must have 8+ chars, uppercase, lowercase, special character',
                  })} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Toggle">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="confirm_password">Re-Enter Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input id="confirm_password" type={showConfirm ? 'text' : 'password'}
                  className={`input pr-10 ${errors.confirm_password ? 'input-error' : ''}`} placeholder="Repeat password"
                  {...register('confirm_password', {
                    required: 'Please confirm your password',
                    validate: v => v === pwd || 'Passwords do not match',
                  })} />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Toggle">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading} id="signup-btn">
              <UserPlus size={16} />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
