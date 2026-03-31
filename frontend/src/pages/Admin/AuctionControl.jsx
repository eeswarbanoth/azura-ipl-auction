import { useState, useEffect, useRef } from 'react';
import { Gavel, RefreshCw, XCircle, ArrowRightCircle, MonitorPlay } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function AuctionControl() {
  const [state, setState]           = useState(null);
  const [teams, setTeams]           = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [soldPrice, setSoldPrice]   = useState('');
  const [unit, setUnit]             = useState('Lakhs');
  const [loading, setLoading]       = useState(true);
  const socketRef                   = useRef(null);

  useEffect(() => {
    fetchData();

    // Real-time socket updates for Admin panel
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('auction_state_updated', (newState) => {
      setState(newState);
      // Pre-fill sold price with new player's base price
      if (newState.currentPlayerId?.basePrice) {
        setSoldPrice(newState.currentPlayerId.basePrice / 100000); // convert to Lakhs for display
        setUnit('Lakhs');
        setSelectedTeam('');
      }
    });

    socket.on('teams_updated', () => {
      api.get('/teams').then(res => setTeams(res.data)).catch(() => {});
    });

    socket.on('players_updated', () => {
      // Re-sync state so queue reflects new players
      api.get('/auction/state').then(res => setState(res.data)).catch(() => {});
    });

    return () => {
      socket.off('auction_state_updated');
      socket.off('teams_updated');
      socket.off('players_updated');
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [stateRes, teamsRes] = await Promise.all([
        api.get('/auction/state'),
        api.get('/teams')
      ]);
      setState(stateRes.data);
      setTeams(teamsRes.data);
      // Pre-fill sold price if a player is already on the block
      if (stateRes.data.currentPlayerId?.basePrice) {
        setSoldPrice(stateRes.data.currentPlayerId.basePrice / 100000);
        setUnit('Lakhs');
      }
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPlayer = async () => {
    if (!state?.queue?.length) return alert('Queue is empty!');
    const nextPlayerId = state.queue[0]._id;
    try {
      await api.post('/auction/set-current', { playerId: nextPlayerId });
      setSelectedTeam('');
      setSoldPrice('');
    } catch {
      alert('Error fetching next player');
    }
  };

  const handleSell = async () => {
    if (!selectedTeam || soldPrice === '') return alert('Select team and enter price');
    const numericPrice = unit === 'Cr' ? soldPrice * 10_000_000 : soldPrice * 100_000;
    if (isNaN(numericPrice) || numericPrice <= 0) return alert('Invalid price value');
    const team = teams.find(t => t._id === selectedTeam);
    if (team && team.remainingBudget < numericPrice) return alert('Insufficient budget!');
    if (!window.confirm(`Sell ${cp?.name} to ${team?.name} for ${formatCurrency(numericPrice)}?`)) return;
    try {
      await api.post('/auction/sell', { teamId: selectedTeam, soldPrice: numericPrice });
      setSelectedTeam('');
      setSoldPrice('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error selling player');
    }
  };

  const handleUnsold = async () => {
    if (!window.confirm('Mark this player as UNSOLD?')) return;
    try {
      await api.post('/auction/unsold');
      setSelectedTeam('');
      setSoldPrice('');
    } catch {
      alert('Error marking unsold');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] text-gray-400">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-neonBlue rounded-full animate-spin mr-3" />
      Loading auction data...
    </div>
  );

  const cp = state?.currentPlayerId;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold font-display text-white">Auction Control Panel</h2>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
          Live — Real-time
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Current Player Details */}
        <div className="bg-secondary border border-gray-700 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neonBlue/10 rounded-full mix-blend-screen filter blur-[64px]" />

          {cp ? (
            <div className="text-center z-10 w-full relative">
              <span className="inline-block px-3 py-1 bg-neonBlue/10 text-neonBlue border border-neonBlue/30 rounded-full text-sm font-bold tracking-wider mb-4 uppercase shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                {cp.category}
              </span>
              <h3 className="text-4xl text-white font-bold mb-4">{cp.name}</h3>
              <div className="flex justify-center items-center gap-2 mb-6 text-2xl text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                ★ <span className="text-sm text-gray-400 font-mono tracking-widest ml-2">({cp.rating}/100)</span>
              </div>
              <div className="bg-primary/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                <div className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-2">Base Price</div>
                <div className="text-4xl font-mono text-white font-bold tracking-tight">
                  {formatCurrency(cp.basePrice)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 z-10">
              <MonitorPlay size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl">No player currently selected</p>
              <button
                onClick={handleNextPlayer}
                className="mt-6 bg-neonBlue/20 text-neonBlue border border-neonBlue/50 hover:bg-neonBlue/30 px-6 py-3 rounded-xl flex items-center gap-2 transition-all mx-auto shadow-[0_0_15px_rgba(0,243,255,0.2)] font-bold tracking-wider"
              >
                Start Auction <ArrowRightCircle size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Auction Controls */}
        <div className="bg-secondary border border-gray-700 rounded-2xl p-8 flex flex-col justify-center">
          <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-gray-800 pb-4">Bidding Controls</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Winning Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                disabled={!cp}
                className="w-full bg-primary/80 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-xl p-4 text-white text-lg transition-all outline-none disabled:opacity-50"
              >
                <option value="">-- Select Team --</option>
                {teams.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name} (Budget: {formatCurrency(t.remainingBudget)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Final Sold Price</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  disabled={!cp}
                  className="flex-1 bg-primary/80 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-xl p-4 text-white text-2xl font-mono transition-all outline-none placeholder-gray-600 disabled:opacity-50"
                  placeholder="0.00"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={!cp}
                  className="bg-primary/80 border border-gray-700 rounded-xl p-4 text-white outline-none disabled:opacity-50"
                >
                  <option value="Lakhs">Lakhs</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
              {soldPrice !== '' && (
                <p className="text-xs text-gray-500 mt-1 pl-1">
                  = {formatCurrency(unit === 'Cr' ? soldPrice * 10_000_000 : soldPrice * 100_000)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              <button
                onClick={handleUnsold}
                disabled={!cp}
                className="bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                <XCircle size={20} /> UNSOLD
              </button>
              <button
                onClick={handleSell}
                disabled={!cp}
                className="bg-gradient-to-r from-neonBlue to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(0,243,255,0.4)] py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold text-lg"
              >
                <Gavel size={24} /> MARK SOLD
              </button>
            </div>
          </div>

          {cp && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={handleNextPlayer}
                className="w-full bg-transparent hover:bg-white/5 border border-dashed border-gray-600 text-gray-300 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={18} /> Skip to Next Player
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue preview */}
      {state?.queue?.length > 0 && (
        <div className="mt-8 bg-secondary border border-gray-800 rounded-xl p-5">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            Up Next — {state.queue.length} in queue
          </h4>
          <div className="flex gap-3 flex-wrap">
            {state.queue.slice(0, 6).map((p, i) => (
              <div key={p._id} className="bg-primary px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 flex items-center gap-2">
                <span className="text-gray-600">#{i + 1}</span>
                <span className="font-medium">{p.name}</span>
                <span className="text-neonBlue">{formatCurrency(p.basePrice)}</span>
              </div>
            ))}
            {state.queue.length > 6 && (
              <div className="px-3 py-1.5 text-xs text-gray-600">+{state.queue.length - 6} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
