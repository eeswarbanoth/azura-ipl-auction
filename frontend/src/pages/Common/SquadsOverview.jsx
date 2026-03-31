import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { Users, Edit3, Trash2, Shield, Info } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function SquadsOverview() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For Admin Correction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [correctionData, setCorrectionData] = useState({ newTeamId: '', newPrice: '', unit: 'Cr' });

  useEffect(() => {
    fetchTeams();

    // Replace polling with socket listeners
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('teams_updated',   () => fetchTeams());
    socket.on('players_updated', () => fetchTeams());

    return () => {
      socket.off('teams_updated');
      socket.off('players_updated');
      socket.disconnect();
    };
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (player, teamId) => {
    setSelectedPlayer(player);
    const isCr = player.soldPrice >= 10000000;
    const value = isCr ? player.soldPrice / 10000000 : player.soldPrice / 100000;
    setCorrectionData({
      newTeamId: teamId,
      newPrice: value,
      unit: isCr ? 'Cr' : 'Lakhs'
    });
    setIsModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    const numericPrice = correctionData.unit === 'Cr' ? correctionData.newPrice * 10000000 : correctionData.newPrice * 100000;
    try {
      await api.post('/auction/correct-sale', {
        playerId: selectedPlayer._id,
        newTeamId: correctionData.newTeamId,
        newPrice: numericPrice,
        action: 'update'
      });
      setIsModalOpen(false);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating sale');
    }
  };

  const handleRelease = async (playerId) => {
    if (!window.confirm('Mark this player as UNSOLD and return funds to team?')) return;
    try {
      await api.post('/auction/correct-sale', {
        playerId,
        action: 'release'
      });
      fetchTeams();
    } catch (err) {
      alert('Error releasing player');
    }
  };

  if (loading) return <div className="text-white">Loading Squads...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold font-display text-white">All Franchise Squads</h2>
        {isAdmin && (
          <div className="flex items-center gap-2 text-gold text-sm bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
            <Shield size={16} />
            <span>Admin Correction Mode Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {teams.map(team => (
          <div key={team._id} className="bg-secondary/50 backdrop-blur-md border border-gray-700 rounded-2xl overflow-hidden flex flex-col h-full">
            {/* Team Header */}
            <div className="p-6 bg-gradient-to-r from-gray-800 to-transparent border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{team.name}</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-400">Budget: <b className="text-neonGreen">{formatCurrency(team.remainingBudget)}</b></span>
                  <span className="text-gray-400">Squad: <b className="text-neonBlue">{team.players.length}</b></span>
                </div>
              </div>
              <Users className="text-gray-600" size={40} />
            </div>

            {/* Players Table */}
            <div className="flex-1 overflow-auto p-4 max-h-[500px]">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-gray-500 font-bold border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-2">Player</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Sold Price</th>
                    {isAdmin && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {team.players.map(player => (
                    <tr key={player._id} className="text-sm group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                        <div className="font-bold text-gray-200">{player.name}</div>
                        <div className="text-xs text-gold">★ {player.rating}</div>
                      </td>
                      <td className="py-4 px-2 text-gray-400">{player.category}</td>
                      <td className="py-4 px-2 font-mono text-neonBlue font-bold">{formatCurrency(player.soldPrice)}</td>
                      {isAdmin && (
                        <td className="py-4 px-2 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditClick(player, team._id)} className="p-1.5 bg-neonBlue/10 text-neonBlue rounded hover:bg-neonBlue/20" title="Change Team/Price">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleRelease(player._id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Release to Unsold">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {team.players.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="py-12 text-center text-gray-600 italic">No players bought yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Team Summary Footer */}
            <div className="p-4 bg-primary/20 border-t border-gray-800 grid grid-cols-2 gap-2">
               {['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'].map(cat => {
                 const count = team.players.filter(p => p.category === cat).length;
                 return (
                   <div key={cat} className="flex justify-between items-center text-[10px] text-gray-500 px-2 py-1 bg-black/20 rounded">
                     <span>{cat}</span>
                     <span className={count > 0 ? 'text-white font-bold' : ''}>{count}</span>
                   </div>
                 )
               })}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Correction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-2 flex items-center gap-2">
              <Edit3 size={20} className="text-neonBlue" />
              Correct Auction Sale
            </h3>
            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Player</label>
                <div className="bg-primary/50 p-2.5 rounded-lg text-white font-bold border border-gray-700">{selectedPlayer?.name}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Assigned Team</label>
                <select 
                  value={correctionData.newTeamId} 
                  onChange={e => setCorrectionData({...correctionData, newTeamId: e.target.value})}
                  className="w-full bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-neonBlue"
                >
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Corrected Sold Price</label>
                <div className="flex gap-2">
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={correctionData.newPrice} 
                    onChange={e => setCorrectionData({...correctionData, newPrice: e.target.value})}
                    className="flex-1 bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-neonBlue"
                  />
                  <select 
                    value={correctionData.unit} 
                    onChange={e => setCorrectionData({...correctionData, unit: e.target.value})}
                    className="bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="Lakhs">Lakhs</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg flex gap-2">
                <Info size={16} className="text-neonBlue shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400">Changing the team or price will automatically reverse the budget for the old team and deduct the new amount from the selected team.</p>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:bg-white/5 rounded-lg">Cancel</button>
                <button type="submit" className="bg-neonBlue text-secondary font-bold px-6 py-2 rounded-lg hover:bg-neonBlue/90 transition-all">Update Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
