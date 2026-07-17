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
    <div className="min-h-screen w-full flex bg-[#0A0A0A] text-[#fcdbd6] font-body-md">
      {/* Left Panel: Visual & Tagline */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-12 overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10"></div>
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1000')` 
            }}
          ></div>
        </div>
        <div className="relative z-20 max-w-xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-red-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
            <h1 className="font-extrabold text-4xl text-red-500 tracking-tighter uppercase">Burn-Ex</h1>
          </div>
          <h2 className="font-extrabold text-4xl text-white mb-2 leading-none">MASTER YOUR MACHINE.</h2>
          <p className="text-gray-400 max-w-md">
            Elite performance tracking powered by biometric intelligence. Join the ranks of the digitally optimized.
          </p>
        </div>
      </section>

      {/* Right Panel: Auth Portal */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-[#1f0f0d]/10 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="w-full max-w-md">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-8">
            <div className="lg:hidden flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <span className="font-bold text-xl text-red-500 tracking-tighter">BURN-EX</span>
            </div>
            <div className="flex bg-[#2c1b18] p-1 rounded-lg">
              <button className="px-6 py-2 text-xs font-bold rounded-lg transition-all bg-red-500/20 text-red-400 shadow-lg">Login</button>
              <Link to="/register" className="px-6 py-2 text-xs font-bold rounded-lg transition-all text-gray-400 hover:text-white">Register</Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" id="login-form">
            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-white">Welcome Back</h3>
              <p className="text-sm text-gray-400">Access your performance dashboard</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest absolute -top-2 left-2 bg-[#0A0A0A] px-1">Email Address</label>
                <input 
                  className="w-full bg-[#111] border-0 border-b-2 border-gray-800 focus:border-red-500 focus:ring-0 py-4 px-4 text-white transition-colors" 
                  placeholder="athlete@burn-ex.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest absolute -top-2 left-2 bg-[#0A0A0A] px-1">Password</label>
                <input 
                  className="w-full bg-[#111] border-0 border-b-2 border-gray-800 focus:border-red-500 focus:ring-0 py-4 px-4 text-white transition-colors" 
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
                <input className="w-4 h-4 rounded border-gray-800 bg-[#111] text-red-500 focus:ring-red-500/20" type="checkbox"/>
                <span className="text-xs text-gray-400">Remember Me</span>
              </label>
              <a className="text-xs text-red-400 hover:underline" href="#forgot">Forgot Performance Key?</a>
            </div>

            <button 
              disabled={loading}
              className="w-full py-4 primary-gradient text-white font-bold rounded-lg shadow-[0_0_20px_rgba(255,59,48,0.3)] active:scale-95 transition-transform" 
              type="submit"
            >
              {loading ? 'INITIALIZING...' : 'INITIALIZE SESSION'}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-800"></div>
              <span className="text-[10px] font-bold text-gray-500">SECURE PORTAL</span>
              <div className="h-px flex-1 bg-gray-800"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-800 hover:bg-gray-800/40 transition-colors" type="button">
                <span className="text-xs font-bold">Google Auth</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-800 hover:bg-gray-800/40 transition-colors" type="button">
                <span className="text-xs font-bold">Apple Auth</span>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-[10px] text-gray-500 max-w-xs mx-auto leading-relaxed">
            By accessing Burn-Ex, you agree to our <a className="text-red-400 underline" href="#policy">Encrypted Data Policy</a> and <a className="text-red-400 underline" href="#terms">Biometric Terms</a>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
