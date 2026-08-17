import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, FolderOpen, CheckSquare, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  icon: React.FC<any>;
  label: string;
  path: string;
  isAction?: boolean;
  onClick?: () => void;
}


export function MobileNav({ className, onMenuClick }: { className?: string; onMenuClick?: () => void }) {
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: FolderOpen, label: 'Drive', path: '/drive' },
    { icon: CheckSquare, label: 'Actions', path: '/actions' },
    { icon: Menu, label: 'More', path: '#', onClick: onMenuClick }
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-border pb-safe flex items-center justify-around px-2",
      className
    )}
    style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}>
      {navItems.map((item, i) => {
        if (item.isAction) {
          return (
            <NavLink 
              key={i} 
              to={item.path}
              className={({ isActive }) => cn(
                "relative -top-5 flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95",
                isActive 
                  ? "bg-brand text-white shadow-brand/40" 
                  : "bg-brand text-white shadow-brand/30 hover:bg-brand-hover"
              )}
            >
              <item.icon size={24} className="text-white" />
            </NavLink>
          );
        }

        if (item.onClick) {
          return (
            <button 
              key={i}
              onClick={(e) => { e.preventDefault(); item.onClick?.(); }}
              className="flex flex-col items-center justify-center gap-1 w-16 h-full text-muted hover:text-primary transition-colors"
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink 
            key={i} 
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative",
              isActive ? "text-brand" : "text-muted hover:text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-1 w-1 h-1 rounded-full bg-brand" />
                )}
                <item.icon size={20} className={cn("mt-2", isActive && "text-brand")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
