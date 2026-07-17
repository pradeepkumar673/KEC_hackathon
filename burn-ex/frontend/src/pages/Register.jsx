import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    goal: 'general_fitness',
    activityLevel: 'moderate',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all account fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    if (step === 2) {
      if (!formData.weight || !formData.height || !formData.age) {
        setError('Please fill in all body stats');
        return;
      }
    }
    setError('');
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        weight: Number(formData.weight),
        height: Number(formData.height),
        age: Number(formData.age),
        gender: formData.gender,
        goal: formData.goal,
        activityLevel: formData.activityLevel,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
              <Link to="/login" className="px-5 py-2 text-xs font-bold rounded-lg transition-all text-on-surface-variant hover:text-on-surface">Login</Link>
              <button className="px-5 py-2 text-xs font-bold rounded-lg transition-all bg-primary/10 border border-primary/20 text-primary shadow-sm">Register</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" id="register-form">
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white font-display-sm">Join the Elite</h3>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-surface-container'}`}></div>
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-surface-container'}`}></div>
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-surface-container'}`}></div>
              </div>
            </div>

            {error && (
              <div className="bg-primary/15 border border-primary/25 text-primary text-xs rounded-xl p-3 flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Full Name</label>
                  <input 
                    name="name"
                    className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                    placeholder="Alex Mercer" 
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Email Address</label>
                  <input 
                    name="email"
                    className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                    placeholder="athlete@burn-ex.com" 
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Password</label>
                  <input 
                    name="password"
                    className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                    placeholder="••••••••" 
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Confirm Password</label>
                  <input 
                    name="confirmPassword"
                    className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                    placeholder="••••••••" 
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button 
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl shadow-[0_0_20px_rgba(255,85,69,0.2)] font-label-bold"
                >
                  PROCEED TO BODY STATS
                </button>
              </div>
            )}

            {/* Step 2: Body Stats */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Weight (kg)</label>
                    <input 
                      name="weight"
                      className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                      placeholder="75" 
                      type="number"
                      value={formData.weight}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Height (cm)</label>
                    <input 
                      name="height"
                      className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                      placeholder="180" 
                      type="number"
                      value={formData.height}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Age</label>
                    <input 
                      name="age"
                      className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors placeholder-on-surface-variant font-semibold" 
                      placeholder="25" 
                      type="number"
                      value={formData.age}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Gender</label>
                    <select 
                      name="gender"
                      className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors font-semibold"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={prevStep}
                    className="w-1/3 py-3 border border-outline-variant text-on-surface-variant hover:text-on-surface font-bold rounded-xl font-label-bold transition"
                  >
                    BACK
                  </button>
                  <button 
                    type="button" 
                    onClick={nextStep}
                    className="w-2/3 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-[0_0_20px_rgba(255,85,69,0.2)] font-label-bold"
                  >
                    DEFINE GOALS
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Goals & Activity */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Primary Objective</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: 'weight_loss', label: 'SHRED' },
                      { val: 'muscle_gain', label: 'BUILD' },
                      { val: 'endurance', label: 'ENDURE' },
                      { val: 'general_fitness', label: 'MAINTAIN' }
                    ].map(g => (
                      <label key={g.val} className="cursor-pointer">
                        <input 
                          type="radio" 
                          name="goal" 
                          value={g.val}
                          checked={formData.goal === g.val}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="p-3 text-center border border-outline-variant rounded-xl peer-checked:bg-primary/10 peer-checked:border-primary transition-all duration-300">
                          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{g.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-bold">Activity Level</label>
                    <span className="text-primary font-bold text-xs uppercase tracking-wider">{formData.activityLevel}</span>
                  </div>
                  <select 
                    name="activityLevel"
                    className="w-full bg-surface-container border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-3 px-4 text-xs text-on-surface transition-colors font-semibold"
                    value={formData.activityLevel}
                    onChange={handleChange}
                  >
                    <option value="sedentary">Sedentary (desk job)</option>
                    <option value="light">Lightly Active (1-3 days/wk)</option>
                    <option value="moderate">Moderately Active (3-5 days/wk)</option>
                    <option value="active">Very Active (6-7 days/wk)</option>
                    <option value="very_active">Elite Athlete (twice/day)</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={prevStep}
                    className="w-1/3 py-3 border border-outline-variant text-on-surface-variant hover:text-on-surface font-bold rounded-xl font-label-bold transition"
                  >
                    BACK
                  </button>
                  <button 
                    disabled={loading}
                    className="w-2/3 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-[0_0_20px_rgba(255,85,69,0.2)] font-label-bold"
                    type="submit"
                  >
                    {loading ? 'FINALIZING...' : 'FINALIZE SETUP'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-8 text-center text-[10px] text-on-surface-variant max-w-xs mx-auto leading-relaxed font-semibold">
            By accessing Burn-Ex, you agree to our <a className="text-primary underline" href="#policy">Encrypted Data Policy</a> and <a className="text-primary underline" href="#terms">Biometric Terms</a>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Register;
