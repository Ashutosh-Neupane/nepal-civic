import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "@/components/common/Icon";
import { PageTransition } from "@/components/common/PageTransition";

interface MobileLayoutProps {
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
  bottomNav?: { icon: string; label: string; active?: boolean; href: string }[];
  greeting?: string;
  avatarUrl?: string;
}

export function MobileLayout({ title, children, headerRight, bottomNav, greeting, avatarUrl }: MobileLayoutProps) {
  const location = useLocation();

  return (
    <div className="w-full max-w-md mx-auto bg-surface flex flex-col relative shadow-xl min-h-screen min-h-[100dvh]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md shadow-header px-4 pt-safe flex-shrink-0 border-b border-outline-variant/40">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover transition-transform hover:scale-105" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform hover:scale-105">
                <Icon name="person" className="text-on-primary text-base" />
              </div>
            )}
            <div>
              {greeting && <p className="text-xs text-on-surface-variant font-medium leading-none mb-1">{greeting}</p>}
              <h1 className="text-lg sm:text-xl font-bold text-on-surface leading-tight">{title}</h1>
            </div>
          </div>
          {headerRight}
        </div>
      </header>

      {/* Content — natural height body with clean flow and full touch scrolling */}
      <main className="w-full flex-1">
        <PageTransition key={location.pathname}>
          {children}
        </PageTransition>
      </main>

      {/* Bottom Navigation — sits directly below content without artificial gaps */}
      {bottomNav && (
        <nav className="sticky bottom-0 z-30 bg-surface-container-lowest border-t border-outline-variant pb-safe shadow-lg">
          <div className="flex">
            {bottomNav.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px] transition-all duration-200 ${
                  item.active
                    ? "text-primary font-bold scale-105"
                    : "text-on-surface-variant hover:text-on-surface hover:scale-102"
                }`}
              >
                <span className={`material-symbols-outlined text-2xl transition-transform duration-200 ${item.active ? "icon-filled text-primary scale-110" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-xs font-medium leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
