import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  HelpCircle,
  KeyRound,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserCog,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  canReadAllGuides,
  guideRoleOrder,
  installChecklist,
  menuMatrix,
  mobileInstallSteps,
  normalizeGuideRole,
  roleGuideContent,
  troubleshootingItems,
  workflowMap,
  type GuideRole,
} from '../data/userGuide';

const roleVisuals: Record<GuideRole, { icon: LucideIcon; badge: string; active: string; tint: string }> = {
  SUPER_ADMIN: {
    icon: ShieldCheck,
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    active: 'border-violet-500 bg-violet-50 text-violet-800',
    tint: 'text-violet-700 bg-violet-50 border-violet-100',
  },
  ADMIN: {
    icon: UserCog,
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    active: 'border-blue-500 bg-blue-50 text-blue-800',
    tint: 'text-blue-700 bg-blue-50 border-blue-100',
  },
  VENDEUR: {
    icon: ShoppingBag,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    tint: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  },
  CAISSIER: {
    icon: WalletCards,
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    active: 'border-amber-500 bg-amber-50 text-amber-800',
    tint: 'text-amber-700 bg-amber-50 border-amber-100',
  },
  MANAGER: {
    icon: ClipboardCheck,
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'border-slate-500 bg-slate-50 text-slate-800',
    tint: 'text-slate-700 bg-slate-50 border-slate-200',
  },
};

const SectionTitle = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-primary">
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const CheckList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
        <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const UserGuide: React.FC = () => {
  const { admin } = useAdminAuth();
  const currentRole = normalizeGuideRole(admin?.role);
  const canSeeAll = canReadAllGuides(admin?.role);
  const availableRoles = useMemo(
    () => (canSeeAll ? guideRoleOrder : [currentRole]),
    [canSeeAll, currentRole],
  );
  const [selectedRole, setSelectedRole] = useState<GuideRole>(currentRole);

  useEffect(() => {
    if (!availableRoles.includes(selectedRole)) {
      setSelectedRole(currentRole);
    }
  }, [availableRoles, currentRole, selectedRole]);

  const guide = roleGuideContent[selectedRole];
  const visual = roleVisuals[selectedRole];
  const RoleIcon = visual.icon;
  const visibleMatrix = canSeeAll
    ? menuMatrix
    : menuMatrix.filter((item) => item.roles.includes(currentRole));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${visual.tint}`}>
              <RoleIcon size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">Guide utilisateur</h2>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${visual.badge}`}>
                  {guide.label}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {canSeeAll
                  ? 'Consultez le guide de chaque profil avant la mise en boutique.'
                  : 'Votre guide affiche les actions utiles pour votre role connecte.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {availableRoles.map((role) => {
              const item = roleGuideContent[role];
              const itemVisual = roleVisuals[role];
              const Icon = itemVisual.icon;
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? itemVisual.active
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={BookOpen} title={guide.subtitle} subtitle={guide.mission} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <LockKeyhole size={14} /> Connexion
              </p>
              <p className="text-lg font-bold text-slate-900">{guide.accessMode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <KeyRound size={14} /> Acces guide
              </p>
              <p className="text-lg font-bold text-slate-900">
                {canSeeAll ? 'Tous les roles' : 'Role connecte'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-bold text-slate-900">Menus principaux</p>
            <div className="flex flex-wrap gap-2">
              {guide.mainMenus.map((menu) => (
                <span
                  key={menu}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {menu}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={ListChecks} title="Routine du poste" />
          <CheckList items={guide.dailyFocus} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <SectionTitle
          icon={ChevronRight}
          title="Parcours boutique"
          subtitle="Le flux standard separe la preparation de la vente et l encaissement."
        />
        <div className="grid gap-3 md:grid-cols-4">
          {workflowMap.map((step, index) => (
            <div key={step.label} className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                  {index + 1}
                </span>
                {index < workflowMap.length - 1 && (
                  <ChevronRight className="hidden text-slate-300 md:block" size={20} />
                )}
              </div>
              <p className="font-bold text-slate-900">{step.label}</p>
              <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={CheckCircle2} title="Ce role peut faire" />
          <CheckList items={guide.canDo} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={AlertTriangle} title="Limites a respecter" />
          <ul className="space-y-2">
            {guide.limits.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                <AlertTriangle size={16} className="mt-1 shrink-0 text-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <SectionTitle icon={ClipboardCheck} title="Procedures du role" />
        <div className="grid gap-4 lg:grid-cols-2">
          {guide.workflows.map((workflow) => (
            <article key={workflow.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-900">{workflow.title}</h4>
              <ol className="mt-3 space-y-2">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary ring-1 ring-slate-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {workflow.note && (
                <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  {workflow.note}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={CircleDot} title="Menus accessibles" subtitle="Lecture rapide des acces utiles par profil." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4 font-bold">Menu</th>
                  {guideRoleOrder.map((role) => (
                    <th key={role} className="px-2 py-3 text-center font-bold">
                      {roleGuideContent[role].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMatrix.map((row) => (
                  <tr key={row.menu} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">{row.menu}</td>
                    {guideRoleOrder.map((role) => {
                      const allowed = row.roles.includes(role);
                      return (
                        <td key={role} className="px-2 py-3 text-center">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            {allowed ? <CheckCircle2 size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle icon={HelpCircle} title="Problemes courants" />
          <div className="space-y-2">
            {troubleshootingItems.map((item) => (
              <details key={item.problem} className="group rounded-lg border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800">
                  {item.problem}
                  <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-open:rotate-90" />
                </summary>
                <div className="border-t border-slate-200 px-4 py-3 text-sm leading-6 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Cause : </span>
                    {item.cause}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-800">Action : </span>
                    {item.action}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <SectionTitle
          icon={Smartphone}
          title="Installer l'application sur telephone ou tablette"
          subtitle="Une fois installee, l'icone reste sur l'ecran d'accueil comme une application normale."
        />
        <ol className="space-y-2">
          {mobileInstallSteps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {canSeeAll && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionTitle
            icon={ClipboardCheck}
            title="Checklist avant installation boutique"
            subtitle="A valider avec le responsable avant de former l equipe."
          />
          <div className="grid gap-2 md:grid-cols-2">
            {installChecklist.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

