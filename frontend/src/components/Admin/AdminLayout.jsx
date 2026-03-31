import { Link, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Users, UserPlus, MonitorPlay, ListOrdered, LogOut, FileText } from 'lucide-react';

export default function AdminLayout() {
  const { logout } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { name: 'Auction Control', path: '/admin', icon: MonitorPlay },
    { name: 'Players', path: '/admin/players', icon: UserPlus },
    { name: 'Teams', path: '/admin/teams', icon: Users },
    { name: 'Queue', path: '/admin/queue', icon: ListOrdered },
    { name: 'Squads', path: '/admin/squads', icon: Users },
    { name: 'Logs & History', path: '/admin/history', icon: FileText },
  ];

  return (
    <div className="flex bg-primary min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-secondary border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold font-display text-white">
            <span className="neon-text-blue">Admin</span> Panel
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-accent/20 text-accent font-semibold border border-accent/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-primary">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
