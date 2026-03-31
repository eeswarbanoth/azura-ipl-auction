import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Upload, Download, FileSpreadsheet, User, AlertCircle, CheckCircle2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

const CATEGORIES = ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'];
const VALID_CATEGORIES_LOWER = CATEGORIES.map(c => c.toLowerCase());

// ─── helpers ────────────────────────────────────────────────────────────────
const toRawPrice = (val, unit) => {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  return unit === 'Cr' ? n * 10_000_000 : n * 100_000;
};

const matchCategory = (raw) => {
  if (!raw) return null;
  const lower = String(raw).trim().toLowerCase();
  const idx = VALID_CATEGORIES_LOWER.findIndex(c => c === lower || c.startsWith(lower) || lower.startsWith(c.split(' ')[0]));
  return idx !== -1 ? CATEGORIES[idx] : null;
};

const parseUnit = (raw) => {
  if (!raw) return 'Lakhs';
  const s = String(raw).trim().toLowerCase();
  if (s === 'cr' || s === 'crore' || s === 'crores') return 'Cr';
  return 'Lakhs';
};

// ─── Template download ───────────────────────────────────────────────────────
const downloadTemplate = () => {
  const headers = ['name', 'category', 'basePrice', 'unit', 'rating'];
  const sample = [
    ['Virat Kohli',   'Marquee',       2,  'Cr',    95],
    ['Rohit Sharma',  'Batsmen',       1.5,'Cr',    90],
    ['MS Dhoni',      'Wicket Keepers',2,  'Cr',    92],
    ['Ravindra Jadeja','All Rounders', 1.8,'Cr',    88],
    ['Jasprit Bumrah','Bowlers',       2,  'Cr',    97],
    ['Sample Player', 'Uncapped',      20, 'Lakhs', 65],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  XLSX.writeFile(wb, 'IPL_Players_Template.xlsx');
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PlayersManagement() {
  const [players, setPlayers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'bulk'

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // manual form
  const [formData, setFormData]   = useState({ name: '', category: 'Marquee', basePrice: '', rating: 50 });
  const [unit, setUnit]           = useState('Lakhs');
  const [formLoading, setFormLoading] = useState(false);

  // bulk import
  const fileRef                   = useRef(null);
  const [parsedRows, setParsedRows]   = useState([]);   // { name, category, basePrice(raw), unit, rating, error? }
  const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', message }
  const [importing, setImporting] = useState(false);

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/players');
      setPlayers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setActiveTab('manual');
    setFormData({ name: '', category: 'Marquee', basePrice: '', rating: 50 });
    setUnit('Lakhs');
    setParsedRows([]);
    setImportStatus(null);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  // ── Manual submit ──────────────────────────────────────────────────────────
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const numericPrice = toRawPrice(formData.basePrice, unit);
    if (numericPrice === null) return alert('Enter a valid base price');
    setFormLoading(true);
    try {
      await api.post('/players', { ...formData, basePrice: numericPrice });
      closeModal();
      fetchPlayers();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Error adding player');
    } finally {
      setFormLoading(false);
    }
  };

  // ── File Parse ─────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const rows = raw.map((r, i) => {
          const errors = [];

          // name
          const name = String(r['name'] || r['Name'] || '').trim();
          if (!name) errors.push('Name missing');

          // category
          const category = matchCategory(r['category'] || r['Category']);
          if (!category) errors.push(`Unknown category "${r['category'] || r['Category']}"`);

          // unit
          const rowUnit = parseUnit(r['unit'] || r['Unit'] || 'Lakhs');

          // basePrice
          const rawPrice = r['basePrice'] || r['base_price'] || r['BasePrice'] || r['Base Price'] || '';
          const numericPrice = toRawPrice(rawPrice, rowUnit);
          if (numericPrice === null) errors.push(`Invalid price "${rawPrice}"`);

          // rating
          const rating = parseInt(r['rating'] || r['Rating'] || 50);
          const safeRating = isNaN(rating) ? 50 : Math.min(100, Math.max(1, rating));

          return {
            _rowIndex: i + 2,
            name,
            category: category || '',
            basePrice: numericPrice,
            displayPrice: rawPrice,
            displayUnit: rowUnit,
            rating: safeRating,
            errors,
          };
        });

        setParsedRows(rows);
        if (rows.length === 0) setImportStatus({ type: 'error', message: 'No rows found in the sheet.' });
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Could not read file. Make sure it is a valid .xlsx or .xls file.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows   = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  // ── Bulk submit ────────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const payload = validRows.map(({ name, category, basePrice, rating }) => ({
        name, category, basePrice, rating,
      }));
      const res = await api.post('/players/bulk', { players: payload });
      setImportStatus({ type: 'success', message: `✅ ${res.data.inserted} players imported successfully!` });
      setParsedRows([]);
      if (fileRef.current) fileRef.current.value = '';
      fetchPlayers();
    } catch (err) {
      setImportStatus({ type: 'error', message: err.response?.data?.message || 'Import failed. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await api.delete(`/players/${id}`);
      fetchPlayers();
    } catch {
      alert('Error deleting player');
    }
  };

  // ── Pagination Calculation ──────────────────────────────────────────────────
  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    return players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [players, searchQuery]);

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold font-display text-white">Player Management</h2>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-neonBlue transition-colors"
            />
          </div>
          
          <button
            onClick={openModal}
            className="bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus size={20} /> Add Player
          </button>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-secondary rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-secondary">
            <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Base Price</th>
                <th className="p-4 font-medium">Rating</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {paginatedPlayers.map(player => (
                <tr key={player._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">{player.name}</td>
                  <td className="p-4">
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-sm border border-blue-500/20">
                      {player.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-neonBlue">{formatCurrency(player.basePrice)}</td>
                  <td className="p-4 flex items-center gap-1">
                    <span className="text-gold">★</span>{player.rating}/100
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-sm border ${
                      player.status === 'sold'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {player.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(player._id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {players.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No players found. Add some!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <div className="text-gray-400">
            Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredPlayers.length)}</span> of <span className="text-white font-medium">{filteredPlayers.length}</span> players
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-secondary border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-secondary border border-gray-700 text-gray-300 disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h3 className="text-xl font-bold text-white">Add Player</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'manual'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={16} /> Manual Entry
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'bulk'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileSpreadsheet size={16} /> Bulk Import (Excel)
              </button>
            </div>

            {/* Tab content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ─── MANUAL TAB ─────────────────────────────────────────── */}
              {activeTab === 'manual' && (
                <form id="manual-form" onSubmit={handleAddPlayer} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Player Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent"
                      placeholder="e.g. Virat Kohli"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Base Price</label>
                    <div className="flex gap-2">
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.basePrice}
                        onChange={e => setFormData({ ...formData, basePrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="flex-1 bg-primary/50 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent"
                        placeholder="e.g. 20"
                      />
                      <select
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="bg-primary/50 border border-gray-700 rounded-lg px-3 text-white focus:outline-none focus:border-accent"
                      >
                        <option value="Lakhs">Lakhs</option>
                        <option value="Cr">Cr</option>
                      </select>
                    </div>
                    {formData.basePrice && (
                      <p className="text-xs text-gray-500 mt-1">
                        = {formatCurrency(toRawPrice(formData.basePrice, unit))}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Rating — <span className="text-gold font-semibold">{formData.rating}/100</span>
                    </label>
                    <input
                      type="range" min="1" max="100"
                      value={formData.rating}
                      onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                      className="w-full accent-gold"
                    />
                  </div>
                </form>
              )}

              {/* ─── BULK IMPORT TAB ─────────────────────────────────────── */}
              {activeTab === 'bulk' && (
                <div className="space-y-5">

                  {/* Instructions + template download */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-blue-300 font-medium">📋 Excel Format</p>
                    <p className="text-xs text-gray-400">
                      Your sheet must have these columns: <span className="text-white font-mono">name, category, basePrice, unit, rating</span>
                    </p>
                    <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
                      <li><strong className="text-gray-300">category</strong> — one of: {CATEGORIES.join(', ')}</li>
                      <li><strong className="text-gray-300">unit</strong> — <code>Lakhs</code> or <code>Cr</code></li>
                      <li><strong className="text-gray-300">basePrice</strong> — numeric value (e.g. 2 for 2 Cr)</li>
                      <li><strong className="text-gray-300">rating</strong> — 1 to 100</li>
                    </ul>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 mt-2 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download size={13} /> Download Template (.xlsx)
                    </button>
                  </div>

                  {/* Drop zone */}
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-600 hover:border-accent rounded-xl p-8 cursor-pointer transition-colors group">
                    <Upload size={30} className="text-gray-500 group-hover:text-accent transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                      Click to choose or drag &amp; drop your Excel file
                    </span>
                    <span className="text-xs text-gray-600">.xlsx / .xls supported</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  {/* Status banner */}
                  {importStatus && (
                    <div className={`flex items-center gap-3 rounded-xl p-3 text-sm border ${
                      importStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {importStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {importStatus.message}
                    </div>
                  )}

                  {/* Parse summary */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-400">✅ {validRows.length} valid</span>
                        {invalidRows.length > 0 && <span className="text-red-400">❌ {invalidRows.length} with errors</span>}
                      </div>

                      {/* Preview table */}
                      <div className="rounded-xl border border-gray-700 overflow-hidden text-xs">
                        <div className="overflow-x-auto max-h-56 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-800 text-gray-400 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left">Row</th>
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Category</th>
                                <th className="px-3 py-2 text-left">Base Price</th>
                                <th className="px-3 py-2 text-left">Rating</th>
                                <th className="px-3 py-2 text-left">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                              {parsedRows.slice(0, 50).map(row => (
                                <tr
                                  key={row._rowIndex}
                                  className={row.errors.length > 0 ? 'bg-red-900/20' : 'hover:bg-white/5'}
                                >
                                  <td className="px-3 py-2 text-gray-500">{row._rowIndex}</td>
                                  <td className="px-3 py-2 text-white">{row.name || <span className="text-red-400 italic">missing</span>}</td>
                                  <td className="px-3 py-2 text-blue-300">{row.category || <span className="text-red-400 italic">invalid</span>}</td>
                                  <td className="px-3 py-2 font-mono text-neonBlue">
                                    {row.basePrice ? formatCurrency(row.basePrice) : <span className="text-red-400 italic">invalid</span>}
                                  </td>
                                  <td className="px-3 py-2 text-gray-300">{row.rating}/100</td>
                                  <td className="px-3 py-2">
                                    {row.errors.length === 0
                                      ? <span className="text-green-400">✓ Ready</span>
                                      : <span className="text-red-400" title={row.errors.join(', ')}>⚠ {row.errors[0]}</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                              {parsedRows.length > 50 && (
                                <tr className="bg-primary/20">
                                  <td colSpan="6" className="text-center py-3 text-gray-400 text-sm italic font-medium">
                                    + {parsedRows.length - 50} more rows correctly processed but not shown in this preview
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {invalidRows.length > 0 && (
                        <p className="text-xs text-yellow-500">
                          ⚠ Rows with errors will be skipped. Only {validRows.length} valid rows will be imported.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-700 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>

              {activeTab === 'manual' ? (
                <button
                  type="submit"
                  form="manual-form"
                  disabled={formLoading}
                  className="bg-accent hover:bg-accent/80 disabled:opacity-50 px-5 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  {formLoading ? 'Saving…' : <><Plus size={16} /> Save Player</>}
                </button>
              ) : (
                <button
                  onClick={handleBulkImport}
                  disabled={validRows.length === 0 || importing}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  {importing
                    ? 'Importing…'
                    : <><Upload size={16} /> Import {validRows.length > 0 ? `${validRows.length} Players` : 'Players'}</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
