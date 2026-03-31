import { useState, useEffect } from 'react';
import { Plus, Trash2, Key, User, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function TeamsManagement() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', totalPurse: '', username: '', password: '' });
  const [unit, setUnit] = useState('Cr');

  useEffect(() => {
    fetchTeams();
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

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (formData.totalPurse === '') return alert('Please enter a total purse');
    const numericPurse = unit === 'Cr' ? formData.totalPurse * 10000000 : formData.totalPurse * 100000;
    if (isNaN(numericPurse)) return alert('Invalid purse value');
    try {
      if (editingTeam) {
        await api.put(`/teams/${editingTeam._id}`, { ...formData, totalPurse: numericPurse });
      } else {
        await api.post('/teams', { ...formData, totalPurse: numericPurse });
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      setFormData({ name: '', totalPurse: '', username: '', password: '' });
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving team');
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    // Convert current purse back to units for the form
    const isCr = team.totalPurse >= 10000000;
    const value = isCr ? team.totalPurse / 10000000 : team.totalPurse / 100000;
    setFormData({
      name: team.name,
      totalPurse: value,
      username: team.username || '',
      password: '' // Keep password empty unless changing
    });
    setUnit(isCr ? 'Cr' : 'Lakhs');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this team?')) return;
    try {
      await api.delete(`/teams/${id}`);
      fetchTeams();
    } catch (err) {
      alert('Error deleting team');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-display text-white">Teams Management</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-neonBlue/20 text-neonBlue border border-neonBlue/50 hover:bg-neonBlue/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Add Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team._id} className="bg-secondary border border-gray-700 rounded-xl p-6 relative overflow-hidden group hover:border-neonBlue/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 flex gap-2">
              <button onClick={() => handleEdit(team)} className="text-gray-500 hover:text-neonBlue transition-colors">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(team._id)} className="text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            
            <h3 className="text-xl text-white font-bold mb-4">{team.name}</h3>
            
            <div className="space-y-3">
              <div className="bg-primary/50 p-3 rounded-lg border border-gray-800">
                <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Total Purse</div>
                <div className="text-lg font-mono text-gray-300">{formatCurrency(team.totalPurse)}</div>
              </div>
              
              <div className="bg-primary/50 p-3 rounded-lg border border-gray-800">
                <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Remaining Budget</div>
                <div className={`text-xl font-mono ${team.remainingBudget < team.totalPurse * 0.2 ? 'text-neonRed font-bold animate-pulse' : 'text-neonGreen'}`}>
                  {formatCurrency(team.remainingBudget)}
                </div>
              </div>

              {team.username && (
                <div className="bg-primary/50 p-3 rounded-lg border border-gray-800 flex items-center gap-2">
                  <User size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-400 font-mono">User: {team.username}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-400 pt-2 border-t border-gray-800 mt-4">
                <span>Players Squad:</span>
                <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md">{team.players.length}</span>
              </div>
            </div>
          </div>
        ))}
        {teams.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-secondary rounded-xl border border-gray-800 border-dashed">
            No teams created yet. Start by adding franchises!
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">
              {editingTeam ? 'Edit Franchise Team' : 'Add Franchise Team'}
            </h3>
            <form onSubmit={handleAddTeam} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Team Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-primary/50 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-lg p-2.5 text-white transition-colors outline-none" placeholder="e.g. Chennai Super Kings" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total Purse Target</label>
                <div className="flex gap-2">
                  <input required type="number" step="0.01" value={formData.totalPurse} onChange={e => {
                    const val = e.target.value;
                    setFormData({...formData, totalPurse: val === '' ? '' : parseFloat(val)});
                  }} className="flex-1 bg-primary/50 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-lg p-2.5 text-white transition-colors outline-none" placeholder="0.00" />
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white outline-none">
                    <option value="Lakhs">Lakhs</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Login Username</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-primary/50 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-lg p-2.5 text-white transition-colors outline-none text-sm" placeholder="franchise_name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Login Password</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-primary/50 border border-gray-700 focus:border-neonBlue focus:ring-1 focus:ring-neonBlue rounded-lg p-2.5 text-white transition-colors outline-none text-sm" placeholder={editingTeam ? '(leave blank to keep)' : '••••••'} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingTeam(null); }} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="bg-neonBlue text-secondary font-bold px-5 py-2 rounded-lg hover:bg-neonBlue/90 transition-colors shadow-[0_0_10px_rgba(0,243,255,0.4)]">
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
