import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi } from '../../api/auth';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setError } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await loginApi(values);
      const { token, user } = res.data.data;
      login(token, user);
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'contact' ? '/portal' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Invalid Login Id or Password';
      setError('root', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
            <span className="text-white font-bold text-xl">UF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Urban Furniture</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accounting & Invoicing Portal</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Sign In</h2>

          {errors.root && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {errors.root.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="login_id">Login ID <span className="text-red-500">*</span></label>
              <input
                id="login_id"
                className={`input ${errors.login_id ? 'input-error' : ''}`}
                placeholder="Enter your login ID"
                {...register('login_id', { required: 'Login ID is required' })}
              />
              {errors.login_id && <p className="mt-1 text-xs text-red-500">{errors.login_id.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading} id="signin-btn">
              <LogIn size={16} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-primary-600 dark:text-primary-400 hover:underline">
              Forgot Password?
            </Link>
            <Link to="/signup" className="text-primary-600 dark:text-primary-400 hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
