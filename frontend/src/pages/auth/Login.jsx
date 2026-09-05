import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi, signup as signupApi } from '../../api/auth';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Briefcase, Info, UserCheck, Truck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab state: 'login' or 'signup'
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');

  // Password visibility states
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forms
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors },
    setError: setLoginError,
  } = useForm();

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    watch: watchSignup,
    reset: resetSignup,
    formState: { errors: signupErrors },
    setError: setSignupError,
  } = useForm({
    defaultValues: {
      role: 'admin',
    },
  });

  const signupPwd = watchSignup('password', '');
  const selectedRole = watchSignup('role', 'admin');

  // Auto-retrieve previous login ID from localStorage
  useEffect(() => {
    const previousLoginId = localStorage.getItem('uf_remembered_login_id');
    if (previousLoginId) {
      setLoginValue('login_id', previousLoginId);
    }
  }, [setLoginValue]);

  // Handle Sign In (Used by both internal staff and customers with generated credentials)
  const onLoginSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await loginApi({ login_id: values.login_id, password: values.password });
      const { token, user } = res.data.data;

      // Remember login ID if selected
      if (rememberMe) {
        localStorage.setItem('uf_remembered_login_id', values.login_id);
      } else {
        localStorage.removeItem('uf_remembered_login_id');
      }

      login(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'contact') {
        if (user.contact_type === 'VENDOR') {
          navigate('/vendor-portal');
        } else {
          navigate('/portal');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Invalid Login Id or Password';
      setLoginError('root', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  // Handle Internal Staff Registration (Admin / Accountant only)
  const onSignupSubmit = async (values) => {
    setLoading(true);
    try {
      await signupApi({
        name: values.name,
        login_id: values.login_id,
        email: values.email,
        password: values.password,
        role: values.role,
      });

      // Save the created login_id for immediate convenience
      localStorage.setItem('uf_remembered_login_id', values.login_id);
      setLoginValue('login_id', values.login_id);

      toast.success(`Account created as ${values.role === 'admin' ? 'Administrator' : 'Accountant'}! Please sign in.`);
      resetSignup();
      setTab('login');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Failed to create account.';
      setSignupError('root', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-3">
            <span className="text-white font-bold text-xl">UF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Urban Furniture</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Accounting & Invoicing System</p>
        </div>

        {/* Auth Card */}
        <div className="card p-6 sm:p-8 shadow-xl border border-gray-200/80 dark:border-gray-800">
          {/* Tab Switcher: Sign In vs Staff Registration */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800/80 p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <UserPlus size={15} />
              Staff Register
            </button>
          </div>

          {/* ================= SIGN IN FORM ================= */}
          {tab === 'login' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Sign in to your account</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Internal staff and customer portal access.
                </p>
              </div>

              {/* Quick 1-Click Demo Logins */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    1-Click Demo Login
                  </span>
                  <span className="text-[10px] text-gray-400">Click to autofill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: 'Admin', id: 'admin1', pwd: 'admin123', desc: 'Full ERP Access', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
                    { role: 'Accountant', id: 'acc001', pwd: 'acc123', desc: 'Financial Books', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
                    { role: 'Customer', id: 'cust01', pwd: 'portal123', desc: 'Invoices & Pay', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
                    { role: 'Vendor', id: 'vend01', pwd: 'portal123', desc: 'Orders & Bills', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setLoginValue('login_id', d.id, { shouldValidate: true });
                        setLoginValue('password', d.pwd, { shouldValidate: true });
                      }}
                      className={`p-2 rounded-lg border text-left transition-all ${d.color} flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{d.role}</span>
                        <span className="text-[10px] opacity-75 font-mono">{d.id}</span>
                      </div>
                      <span className="text-[10px] opacity-80 mt-0.5">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice for Portal Contacts */}
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
                <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  <strong>Portal Users (Customer / Vendor):</strong> Sign in with your assigned Login ID (or contact email) and password <code>portal123</code>.
                </p>
              </div>

              {loginErrors.root && (
                <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  {loginErrors.root.message}
                </div>
              )}

              <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4" noValidate>
                {/* Login ID */}
                <div>
                  <label className="label" htmlFor="login_id">
                    Login ID / Customer Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="login_id"
                    className={`input ${loginErrors.login_id ? 'input-error' : ''}`}
                    placeholder="Enter your login ID or registered email"
                    {...registerLogin('login_id', { required: 'Login ID is required' })}
                  />
                  {loginErrors.login_id && <p className="mt-1 text-xs text-red-500">{loginErrors.login_id.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0" htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Link to="/forgot-password" tabIndex={-1} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showLoginPwd ? 'text' : 'password'}
                      className={`input pr-10 ${loginErrors.password ? 'input-error' : ''}`}
                      placeholder="Enter your password"
                      {...registerLogin('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="mt-1 text-xs text-red-500">{loginErrors.password.message}</p>}
                </div>

                {/* Remember Login ID */}
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:ring-primary-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    Remember my Login ID
                  </label>
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading} id="signin-btn">
                  <LogIn size={16} />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {/* ================= STAFF ACCOUNT CREATION ================= */}
          {tab === 'signup' && (
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Staff Account Registration</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  For internal invoicing & accounting personnel only.
                </p>
              </div>

              {/* Notice that Customers do not register here */}
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Notice:</strong> Customer accounts cannot self-register here. Customer login credentials are generated by the accountant upon order placement.
                </p>
              </div>

              {signupErrors.root && (
                <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  {signupErrors.root.message}
                </div>
              )}

              <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-4" noValidate>
                {/* Full Name */}
                <div>
                  <label className="label" htmlFor="signup-name">
                    Staff Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-name"
                    className={`input ${signupErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Priya Shah"
                    {...registerSignup('name', { required: 'Name is required' })}
                  />
                  {signupErrors.name && <p className="mt-1 text-xs text-red-500">{signupErrors.name.message}</p>}
                </div>

                {/* Role Selection (Staff Roles Only) */}
                <div>
                  <label className="label">
                    Select Staff Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-center ${
                        selectedRole === 'admin'
                          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-medium ring-1 ring-primary-500'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        value="admin"
                        className="sr-only"
                        {...registerSignup('role', { required: 'Please select a role' })}
                      />
                      <Shield size={20} className="mb-1 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-semibold">Administrator</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Full ERP & Management</span>
                    </label>

                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-center ${
                        selectedRole === 'accountant'
                          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-medium ring-1 ring-primary-500'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        value="accountant"
                        className="sr-only"
                        {...registerSignup('role', { required: 'Please select a role' })}
                      />
                      <Briefcase size={20} className="mb-1 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold">Accountant</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Accounting & Reports</span>
                    </label>
                  </div>
                </div>

                {/* Login ID */}
                <div>
                  <label className="label" htmlFor="signup-login_id">
                    Staff Login ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-login_id"
                    className={`input ${signupErrors.login_id ? 'input-error' : ''}`}
                    placeholder="6–12 characters"
                    {...registerSignup('login_id', {
                      required: 'Login ID required',
                      minLength: { value: 6, message: 'Minimum 6 characters' },
                      maxLength: { value: 12, message: 'Maximum 12 characters' },
                    })}
                  />
                  {signupErrors.login_id && <p className="mt-1 text-xs text-red-500">{signupErrors.login_id.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="label" htmlFor="signup-email">
                    Official Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className={`input ${signupErrors.email ? 'input-error' : ''}`}
                    placeholder="name@urbanfurniture.com"
                    {...registerSignup('email', {
                      required: 'Email required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                    })}
                  />
                  {signupErrors.email && <p className="mt-1 text-xs text-red-500">{signupErrors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="label" htmlFor="signup-password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPwd ? 'text' : 'password'}
                      className={`input pr-10 ${signupErrors.password ? 'input-error' : ''}`}
                      placeholder="8+ chars, upper, lower, special"
                      {...registerSignup('password', {
                        required: 'Password required',
                        validate: (v) => PWD_RE.test(v) || 'Must have 8+ chars, uppercase, lowercase, special character',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPwd((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Toggle password"
                    >
                      {showSignupPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signupErrors.password && <p className="mt-1 text-xs text-red-500">{signupErrors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="label" htmlFor="signup-confirm_password">
                    Re-Enter Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm_password"
                      type={showConfirmPwd ? 'text' : 'password'}
                      className={`input pr-10 ${signupErrors.confirm_password ? 'input-error' : ''}`}
                      placeholder="Repeat password"
                      {...registerSignup('confirm_password', {
                        required: 'Please confirm your password',
                        validate: (v) => v === signupPwd || 'Passwords do not match',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Toggle password"
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signupErrors.confirm_password && (
                    <p className="mt-1 text-xs text-red-500">{signupErrors.confirm_password.message}</p>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading} id="signup-btn">
                  <UserPlus size={16} />
                  {loading ? 'Creating staff account...' : 'Create Staff Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
