import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Rocket, 
  Users, 
  Monitor, 
  Mic, 
  Hand,
  GraduationCap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regEmail, regPassword, regName);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Monitor, title: '3D Classroom', desc: 'Immersive learning environment' },
    { icon: Users, title: 'Real-time', desc: 'Live collaboration' },
    { icon: Mic, title: 'Audio Controls', desc: 'Seamless communication' },
    { icon: Hand, title: 'Raise Hand', desc: 'Interactive participation' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020617_70%)]" />
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
            </div>
            <span className="font-heading text-xl text-white tracking-wider">ORBITAL</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              variant="outline"
              onClick={() => setIsAuthOpen(true)}
              className="neon-button-primary rounded-full px-6"
              data-testid="get-started-btn"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
            </Button>
          </motion.div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/30 mb-8">
                <Sparkles className="w-4 h-4 text-sky-400" strokeWidth={1.5} />
                <span className="text-sm text-sky-400 font-medium">Next-Gen Virtual Learning</span>
              </div>

              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                <span className="text-glow-primary">ORBITAL</span>
                <br />
                <span className="text-slate-400">CLASSROOM</span>
              </h1>

              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
                Step into the future of education. A fully immersive 3D virtual classroom 
                with real-time collaboration, smartboard presentations, and spatial interaction.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button 
                  size="lg"
                  onClick={() => setIsAuthOpen(true)}
                  className="neon-button-primary rounded-full px-8 py-6 text-lg"
                  data-testid="launch-classroom-btn"
                >
                  <Rocket className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Launch Classroom
                </Button>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="glass-panel rounded-xl p-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto mb-3">
                      <feature.icon className="w-6 h-6 text-sky-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>

        {/* Auth Modal */}
        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsAuthOpen(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative glass-panel rounded-2xl p-8 w-full max-w-md"
              data-testid="auth-modal"
            >
              <button
                onClick={() => setIsAuthOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                data-testid="close-auth-modal"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-lg bg-sky-500/20 border border-sky-500/50 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-6 h-6 text-sky-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-heading text-2xl text-white">Welcome to Orbital</h2>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 rounded-lg p-1 mb-6">
                  <TabsTrigger 
                    value="login"
                    className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 rounded-md"
                    data-testid="login-tab"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register"
                    className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 rounded-md"
                    data-testid="register-tab"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-slate-400">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                        placeholder="you@example.com"
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-slate-400">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                        placeholder="••••••••"
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full neon-button-primary rounded-lg"
                      disabled={loading}
                      data-testid="login-submit-btn"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="reg-name" className="text-slate-400">Name</Label>
                      <Input
                        id="reg-name"
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                        placeholder="John Doe"
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg-email" className="text-slate-400">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                        placeholder="you@example.com"
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reg-password" className="text-slate-400">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        data-testid="register-password-input"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full neon-button-primary rounded-lg"
                      disabled={loading}
                      data-testid="register-submit-btn"
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
