import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function QueueManagement() {
  const [queue, setQueue] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stateRes, playersRes] = await Promise.all([
        api.get('/auction/state'),
        api.get('/players')
      ]);
      setQueue(stateRes.data.queue);
      setAllPlayers(playersRes.data.filter(p => p.status === 'unsold' && stateRes.data.currentPlayerId?._id !== p._id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateQueue = async (newQueue) => {
    try {
      await api.post('/auction/queue', { queue: newQueue.map(p => p._id) });
      setQueue(newQueue);
    } catch(err) {
      alert('Failed to update queue');
    }
  };

  const addToQueue = (player) => {
    if(queue.find(p => p._id === player._id)) return;
    const newQueue = [...queue, player];
    updateQueue(newQueue);
  };

  const removeFromQueue = (playerId) => {
    const newQueue = queue.filter(p => p._id !== playerId);
    updateQueue(newQueue);
  };

  const availablePlayers = allPlayers
    .filter(p => !queue.find(q => q._id === p._id))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold font-display text-white mb-8">Queue Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Current Queue */}
        <div className="bg-secondary border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
            <span>Upcoming Players</span>
            <span className="bg-neonBlue/20 text-neonBlue px-3 py-1 rounded-full text-xs">{queue.length} in queue</span>
          </h3>
          
          <div className="space-y-3">
            {queue.map((player, idx) => (
              <div key={player._id} className="bg-primary border border-gray-800 p-4 rounded-lg flex justify-between items-center group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-neonBlue opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-1">UP NEXT #{idx + 1}</div>
                  <div className="font-bold text-white">{player.name}</div>
                  <div className="text-sm text-gray-400">{player.category} • {formatCurrency(player.basePrice)}</div>
                </div>
                <button 
                  onClick={() => removeFromQueue(player._id)}
                  className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="text-center p-8 border border-dashed border-gray-700 rounded-lg text-gray-500">
                Queue is empty. Add players from the right panel.
              </div>
            )}
          </div>
        </div>

        {/* Right: Available Players */}
        <div className="bg-secondary border border-gray-700 rounded-xl p-6 flex flex-col h-[700px]">
          <h3 className="text-lg font-bold text-white mb-4">Available Players</h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-primary/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-neonBlue transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {availablePlayers.slice(0, 100).map(player => (
              <div key={player._id} className="bg-primary/50 border border-gray-800 p-3 rounded-lg flex justify-between items-center hover:bg-primary transition-colors">
                <div>
                  <div className="font-medium text-gray-200">{player.name}</div>
                  <div className="text-xs text-gray-500">{player.category}</div>
                </div>
                <button 
                  onClick={() => addToQueue(player)}
                  className="text-neonBlue hover:text-white bg-neonBlue/10 hover:bg-neonBlue px-2 py-2 rounded-md transition-colors"
                  title="Add to Queue"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
            {availablePlayers.length > 100 && (
              <div className="text-center p-4 text-xs text-neonBlue italic">
                + {availablePlayers.length - 100} more players available. Type to search further.
              </div>
            )}
            {availablePlayers.length === 0 && (
              <div className="text-center p-8 text-gray-500">No players found matching your search.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
