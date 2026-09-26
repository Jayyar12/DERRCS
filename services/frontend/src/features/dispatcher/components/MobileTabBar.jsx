import { Map, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileTabBar({ activeTab, onTabChange, candidateCount = 0, incidentCount = 0 }) {
  const tabs = [
    { id: 'map', label: 'Map', icon: Map, badge: null },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: candidateCount },
    { id: 'incidents', label: 'Incidents', icon: Activity, badge: incidentCount },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      aria-label="Dispatcher Mobile Navigation"
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Icon className="size-5" />
              {Boolean(badge) && badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-xs">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileTabBar;
