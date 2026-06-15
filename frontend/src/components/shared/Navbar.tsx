import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, Settings, LayoutDashboard, Zap, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-900/40 group-hover:shadow-primary-900/60 transition-all duration-200">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">LegacyLens</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                location.pathname === '/'
                  ? 'bg-primary-600/15 text-primary-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4" />
              Analyze
            </Link>
            <Link
              to="/projects"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive('/projects')
                  ? 'bg-primary-600/15 text-primary-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Projects
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive('/settings')
                  ? 'bg-primary-600/15 text-primary-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          {/* User section */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-300 max-w-[140px] truncate">{user.email}</span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
