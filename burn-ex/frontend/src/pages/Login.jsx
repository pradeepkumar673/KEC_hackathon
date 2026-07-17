import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0A0A0A] text-on-surface">
      {/* Left Panel: Visual & Tagline */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-12 overflow-hidden bg-black border-r border-outline-variant">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10"></div>
          <div className="absolute inset-0 bg-black/55 z-10"></div>
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1000')` 
            }}
          ></div>
        </div>
        <div className="relative z-20 max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
            <h1 className="font-extrabold text-3xl text-primary tracking-tighter uppercase font-display-lg">Burn-Ex</h1>
          </div>
          <h2 className="font-extrabold text-3xl text-white mb-2 leading-none font-display-md">MASTER YOUR MACHINE.</h2>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            Elite performance tracking powered by biometric intelligence. Join the ranks of the digitally optimized.
          </p>
        </div>
      </section>

      {/* Right Panel: Auth Portal */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="w-full max-w-md">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-8">
            <div className="lg:hidden flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <span className="font-extrabold text-xl text-primary tracking-tighter font-display-md">BURN-EX</span>
            </div>
            <div className="flex bg-surface-container border border-outline-variant p-1 rounded-xl ml-auto">
              <button className="px-5 py-2 text-xs font-bold rounded-lg transition-all bg-primary/10 border border-primary/20 text-primary shadow-sm">Login</button>
              <Link to="/register" className="px-5 py-2 text-xs font-bold rounded-lg transition-all text-on-surface-variant hover:text-on-surface">Register</Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" id="login-form">
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-white font-display-sm">Welcome Back</h3>
              <p className="text-xs text-on-surface-variant font-medium">Access your performance dashboard</p>
            </div>

            {error && (
              <div className="bg-primary/15 border border-primary/25 text-primary text-xs rounded-xl p-3 flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Email Address</label>
                <input 
                  className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                  placeholder="athlete@burn-ex.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Password</label>
                <input 
                  className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input className="w-4 h-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary/20" type="checkbox"/>
                <span className="text-xs text-on-surface-variant font-semibold">Remember Me</span>
              </label>
              <a className="text-xs text-primary hover:underline font-bold" href="#forgot">Forgot Key?</a>
            </div>

            <button 
              disabled={loading}
              className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl shadow-[0_0_20px_rgba(255,85,69,0.2)] active:scale-98 transition-transform font-label-bold" 
              type="submit"
            >
              {loading ? 'INITIALIZING...' : 'INITIALIZE SESSION'}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-outline-variant"></div>
              <span className="text-[10px] font-bold text-on-surface-variant tracking-widest">SECURE PORTAL</span>
              <div className="h-px flex-1 bg-outline-variant"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-variant transition-colors" type="button">
                <span className="text-xs font-bold text-on-surface">Google Auth</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-variant transition-colors" type="button">
                <span className="text-xs font-bold text-on-surface">Apple Auth</span>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-[10px] text-on-surface-variant max-w-xs mx-auto leading-relaxed font-semibold">
            By accessing Burn-Ex, you agree to our <a className="text-primary underline" href="#policy">Encrypted Data Policy</a> and <a className="text-primary underline" href="#terms">Biometric Terms</a>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
