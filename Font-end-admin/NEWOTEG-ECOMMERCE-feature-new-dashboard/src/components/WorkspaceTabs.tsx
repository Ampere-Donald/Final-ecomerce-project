import { type KeyboardEvent, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export interface WorkspaceTab {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

interface WorkspaceTabsProps {
  eyebrow: string;
  title: string;
  description: string;
  tabs: WorkspaceTab[];
  actions?: ReactNode;
}

export const WorkspaceTabs = ({ eyebrow, title, description, tabs, actions }: WorkspaceTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === requestedTab));
  const activeTab = tabs[activeIndex] || tabs[0];

  const selectTab = (id: string, focus = false) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
    if (focus) window.requestAnimationFrame(() => document.getElementById(`workspace-tab-${id}`)?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[nextIndex].id, true);
  };

  return (
    <div className="space-y-5 pb-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-[#0B1636] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      <div className="border-b border-slate-200">
        <div className="scrollbar-hidden flex gap-1 overflow-x-auto" role="tablist" aria-label={`Rubriques ${title}`}>
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                id={`workspace-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`workspace-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-sm font-bold transition-colors ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <section
        id={`workspace-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`workspace-tab-${activeTab.id}`}
        tabIndex={0}
        className="focus-visible:ring-offset-background-light"
      >
        {activeTab.content}
      </section>
    </div>
  );
};
