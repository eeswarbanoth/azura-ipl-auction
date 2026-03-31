import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function HistoryManagement() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/auction/state');
      setHistory([...(res.data?.history || [])].reverse()); // spread to avoid mutating original
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Player', 'Category', 'Team', 'Sold Price (₹)', 'Timestamp'];
    const rows = history.map(h => [
      h.playerId?.name || 'Unknown',
      h.playerId?.category || 'Unknown',
      h.teamId?.name || 'Unknown',
      h.soldPrice || 0,
      new Date(h.timestamp).toLocaleString()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n'
      + rows.map(r => r.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ipl_auction_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center gap-3 text-gray-400 py-12">
      <div className="w-6 h-6 border-4 border-gray-700 border-t-neonBlue rounded-full animate-spin" />
      Loading history...
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-display text-white">Auction Logs & History</h2>
        <button 
          onClick={downloadCSV}
          disabled={history.length === 0}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Download size={20} /> Export to CSV
        </button>
      </div>

      <div className="bg-secondary rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-secondary">
            <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-4 font-medium">Player</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Winning Team</th>
                <th className="p-4 font-medium">Sold Price</th>
                <th className="p-4 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {history.slice(0, 200).map((record, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold">{record.playerId?.name || '-'}</td>
                  <td className="p-4">{record.playerId?.category || '-'}</td>
                  <td className="p-4 text-neonBlue font-bold">{record.teamId?.name || '-'}</td>
                  <td className="p-4 font-mono text-neonGreen font-bold">{formatCurrency(record.soldPrice)}</td>
                  <td className="p-4 text-gray-500 text-sm text-right">{new Date(record.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
              {history.length > 200 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-400 text-sm">
                    Showing latest 200 records. Export to CSV to view full history of {history.length} sales.
                  </td>
                </tr>
              )}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No auction history available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
