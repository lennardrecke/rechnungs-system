import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { FileText, Package, Users, Settings, LogOut } from 'lucide-react';

const AppLayout = () => {
  const { signOut } = useAuth();
  const { t } = useLanguage();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
    }`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-card p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-6 px-3">{t('auth.loginTitle')}</h1>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/bills" className={linkClass}>
            <FileText size={18} /> {t('nav.bills')}
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            <Package size={18} /> {t('nav.products')}
          </NavLink>
          <NavLink to="/customers" className={linkClass}>
            <Users size={18} /> {t('nav.customers')}
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            <Settings size={18} /> {t('nav.settings')}
          </NavLink>
        </nav>
        <Button variant="ghost" onClick={signOut} className="justify-start gap-2 mt-4">
          <LogOut size={18} /> {t('nav.logout')}
        </Button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
