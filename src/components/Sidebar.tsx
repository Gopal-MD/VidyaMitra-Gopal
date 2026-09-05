import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard, FileText, Route, Briefcase,
    GraduationCap, Code, MessageSquare, Brain, Target,
    ShieldCheck, LogOut, Moon, Sun, Menu, X, ChevronRight,
    User, BookOpen, BarChart3, TrendingUp, Building2, CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    // Conditional dashboard based on user type
    const dashboardPath = user?.userType === 'institution' ? '/institution/dashboard' : '/dashboard';
    const dashboardLabel = user?.userType === 'institution' ? 'Institution Dashboard' : 'Dashboard';

    const navItems = [
        { label: dashboardLabel, icon: LayoutDashboard, path: dashboardPath, show: true },
        { label: 'Subscription', icon: CreditCard, path: '/institution/subscription', show: user?.userType === 'institution' },
        { label: 'My Profile', icon: User, path: '/profile', show: user?.userType !== 'institution' },
        { label: 'Smart Resume', icon: FileText, path: '/resume', show: user?.userType !== 'institution' },
        { label: 'Profile Analyzer', icon: BarChart3, path: '/profile-analyzer', show: user?.userType !== 'institution' },
        { label: 'Skill Trends', icon: TrendingUp, path: '/skill-trends', show: user?.userType !== 'institution' },
        { label: 'Career Roadmap', icon: Route, path: '/career-planner', show: user?.userType !== 'institution' },
        { label: 'Gap Analysis', icon: Brain, path: '/gap-analysis', show: user?.userType !== 'institution' },
        { label: 'Job Board', icon: Briefcase, path: '/jobs', show: user?.userType !== 'institution' },
    ];

    const practiceItems = [
        { label: 'Practice Hub', icon: GraduationCap, path: '/practice', show: user?.userType !== 'institution' },
        { label: 'AI Interview', icon: MessageSquare, path: '/bot-interview', show: user?.userType !== 'institution' },
        { label: 'Mock Interview', icon: Target, path: '/mock-interview', show: user?.userType !== 'institution' },
        { label: 'Company Interview', icon: Building2, path: '/company-interview', show: user?.userType !== 'institution' },
    ];

    const adminItems = [
        { label: 'Admin Panel', icon: ShieldCheck, path: '/admin', show: isAdmin },
    ];

    const NavLink = ({ item }: { item: typeof navItems[0] }) => {
        if (!item.show) return null;
        const active = isActive(item.path);
        return (
            <button
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                        ? 'bg-primary/15 text-primary border-l-3 border-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
            >
                <item.icon className={cn('h-4.5 w-4.5 flex-shrink-0', active ? 'text-primary' : '')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && <ChevronRight className="h-3 w-3 ml-auto text-primary" />}
            </button>
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <GraduationCap className="h-5 w-5 text-white" />
                </div>
                {!collapsed && (
                    <div>
                        <h1 className="text-lg font-bold gradient-text">VidyaMitra</h1>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">AI Career Companion</p>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto hidden lg:block text-muted-foreground hover:text-foreground"
                >
                    <Menu className="h-4 w-4" />
                </button>
            </div>

            {/* User info */}
            {user && !collapsed && (
                <div className="px-4 py-3 border-b border-border/30 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => { navigate('/profile'); setMobileOpen(false); }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{user.name || user.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <div className="space-y-0.5">
                    {!collapsed && <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Main</p>}
                    {navItems.map(item => <NavLink key={item.path} item={item} />)}
                </div>

                <div className="my-3 border-t border-border/30" />

                <div className="space-y-0.5">
                    {!collapsed && <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Practice & Assessment</p>}
                    {practiceItems.map(item => <NavLink key={item.path} item={item} />)}
                </div>

                {isAdmin && (
                    <>
                        <div className="my-3 border-t border-border/30" />
                        <div className="space-y-0.5">
                            {!collapsed && <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Admin</p>}
                            {adminItems.map(item => <NavLink key={item.path} item={item} />)}
                        </div>
                    </>
                )}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 py-3 border-t border-border/30 space-y-1">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );

    if (!isAuthenticated) return null;

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center shadow-lg"
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 h-full z-40 bg-card/95 backdrop-blur-xl border-r border-border/50 transition-all duration-300',
                    collapsed ? 'w-16' : 'w-64',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
