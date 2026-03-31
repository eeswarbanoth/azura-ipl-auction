import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
  const [role, setRole] = useState('franchise');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(username, password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/franchise');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-neonBlue rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-neonRed rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glassmorphism p-10 rounded-2xl w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="neon-text-blue">IPL</span> <span className="neon-text-gold">Auction</span>
          </h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        <div className="flex bg-secondary/50 rounded-lg p-1 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'franchise' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            onClick={() => { setRole('franchise'); setUsername(''); setPassword(''); setError(''); }}
          >
            Franchise
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'admin' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            onClick={() => { setRole('admin'); setUsername(''); setPassword(''); setError(''); }}
          >
            Admin
          </button>
        </div>

        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-secondary/80 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neonBlue focus:ring-1 focus:ring-neonBlue transition-colors"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/80 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neonBlue focus:ring-1 focus:ring-neonBlue transition-colors"
              autoComplete="off"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-neonBlue to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transform transition-transform active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.4)]"
          >
            LOGIN
          </button>
        </form>
      </motion.div>
    </div>
  );
}
