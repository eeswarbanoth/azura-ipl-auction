import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, Users, Wallet, ListOrdered } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import SquadsOverview from '../Common/SquadsOverview';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function FranchiseDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('myteam');
  const [teams, setTeams]         = useState([]);
  const [queue, setQueue]         = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchData();

    // Replace polling with socket listeners
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('teams_updated',  () => fetchTeams());
    socket.on('players_updated', () => fetchTeams());
    socket.on('auction_state_updated', (newState) => {
      setQueue(newState.queue || []);
    });

    return () => {
      socket.off('teams_updated');
      socket.off('players_updated');
      socket.off('auction_state_updated');
      socket.disconnect();
    };
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      const [teamsRes, stateRes] = await Promise.all([
        api.get('/teams'),
        api.get('/auction/state')
      ]);
      setTeams(teamsRes.data);
      setQueue(stateRes.data.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-neonBlue rounded-full animate-spin mr-3" />
      <span className="text-gray-400">Loading dashboard...</span>
    </div>
  );

  const myTeam = teams.find(t => t._id === user?.teamId) || teams[0];

  const tabs = [
    { id: 'myteam',    label: 'My Squad',         icon: Users },
    { id: 'others',    label: 'All Squads',        icon: Wallet },
    { id: 'queue',     label: 'Upcoming Targets',  icon: ListOrdered },
  ];

  const renderMySquad = () => {
    if (!myTeam) return <div className="text-gray-500 text-center py-12">No team assigned to your account.</div>;
    const categories = ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'];
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Total Purse</h4>
            <div className="text-3xl font-mono text-white">{formatCurrency(myTeam.totalPurse)}</div>
          </div>
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Funds Remaining</h4>
            <div className={`text-3xl font-mono ${myTeam.remainingBudget < myTeam.totalPurse * 0.2 ? 'text-neonRed animate-pulse' : 'text-neonGreen'}`}>
              {formatCurrency(myTeam.remainingBudget)}
            </div>
          </div>
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={64} /></div>
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Squad Size</h4>
            <div className="text-3xl font-mono text-neonBlue">{myTeam.players.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {categories.map(cat => {
            const playersCat = myTeam.players.filter(p => p.category === cat);
            if (playersCat.length === 0) return null;
            return (
              <div key={cat} className="bg-secondary border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold font-display text-white mb-4 pb-2 border-b border-gray-800 flex justify-between">
                  {cat}
                  <span className="text-neonBlue bg-neonBlue/10 px-2 rounded-full text-sm">{playersCat.length}</span>
                </h3>
                <div className="space-y-3">
                  {playersCat.map(p => (
                    <div key={p._id} className="bg-primary p-3 rounded-lg flex justify-between items-center border border-transparent hover:border-gray-700 transition-colors">
                      <div>
                        <div className="font-bold text-gray-200">{p.name}</div>
                        <div className="text-sm text-gold">★ {p.rating}/100</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase">Bought For</div>
                        <div className="font-mono text-neonBlue">{formatCurrency(p.soldPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {myTeam.players.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
              No players bought yet. Check back during the auction!
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQueue = () => (
    <div className="bg-secondary border border-gray-700 rounded-xl p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold font-display text-white">Upcoming Players</h3>
        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
          Live
        </span>
      </div>
      <div className="space-y-4">
        {queue.length > 0 ? queue.map((player, idx) => (
          <div key={player._id} className="bg-primary border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center relative overflow-hidden group hover:border-neonBlue/50 transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-neonBlue opacity-50" />
            <div className="mb-2 sm:mb-0">
              <div className="text-xs text-neonBlue font-mono font-bold tracking-wider mb-1">AUCTION #{idx + 1}</div>
              <div className="text-xl font-bold text-white">{player.name}</div>
              <div className="text-sm text-gray-400">{player.category} • Rating: {player.rating}/100</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Base Price</div>
              <div className="text-2xl font-mono text-white">{formatCurrency(player.basePrice)}</div>
            </div>
          </div>
        )) : (
          <div className="text-center p-12 bg-primary/30 border border-gray-800 rounded-xl text-gray-500">
            No players currently in the auction queue. Check back later!
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-primary">
      <header className="bg-secondary border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold font-display text-white">
            <span className="neon-text-gold">Franchise</span>{' '}
            <span className="text-gray-400 font-light">| {myTeam?.name || 'Dashboard'}</span>
          </h1>

          <div className="flex bg-primary p-1 rounded-xl">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-neonBlue/20 text-neonBlue shadow-lg border border-neonBlue/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'myteam' && renderMySquad()}
        {activeTab === 'others' && <SquadsOverview />}
        {activeTab === 'queue'  && renderQueue()}
      </main>
    </div>
  );
}
