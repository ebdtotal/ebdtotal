import {
  Award,
  Bell,
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  History,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  NotebookText,
  Settings,
  Target,
  Trophy,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { mobileDoPerfil, navDoPerfil, perfilDe, ROTULO_PERFIL } from '../lib/perfis'
import { useStore } from '../lib/store'
import { aniversariantes, ausentesRecentes } from '../lib/stats'
import { alertasMudancaFaixa } from '../lib/faixa'
import { whatsappUrl } from '../lib/utils'
import { Logo } from './Logo'
import { TemaToggle } from './TemaToggle'

const ICONS: Record<string, LucideIcon> = {
  '/inicio': Home,
  '/painel': LayoutDashboard,
  '/metas': Target,
  '/alertas': Bell,
  '/chamada': BookOpen,
  '/licao': NotebookText,
  '/avisos': Megaphone,
  '/certificados': Award,
  '/calendario': CalendarRange,
  '/avaliacao': ClipboardList,
  '/formacao': GraduationCap,
  '/relatorio': ClipboardList,
  '/aula': GraduationCap,
  '/resumos': CalendarRange,
  '/cadastros': Users,
  '/atividades': History,
  '/turmas': Layers,
  '/setores': LayoutGrid,
  '/escolas': Building2,
  '/rankings': Trophy,
  '/financeiro': Wallet,
  '/configuracoes': Settings,
  '/conta': KeyRound,
  '/master': Building2,
  '/portal': Home,
  '/portal/avaliacao': ClipboardList,
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { usuario, logout, state, pessoasVisiveis, escolasVisiveis, podeVerTudo } = useStore()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const perfil = perfilDe(usuario?.papel)
  const base = navDoPerfil(perfil).filter((i) => i.to !== '/configuracoes' || podeVerTudo)
  const nav = usuario?.papel === 'admin' ? [{ to: '/master', label: 'Igrejas' }, ...base] : base
  const mobile = mobileDoPerfil(perfil)
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const nFaixa =
    perfil === 'professor' || perfil === 'superintendente'
      ? alertasMudancaFaixa(pessoasVisiveis, state.turmas ?? []).length
      : 0
  const nAlertas =
    ausentesRecentes(state, ids).length + aniversariantes(pessoasVisiveis, 7).length + nFaixa

  return (
    <div className="app-navy flex h-full min-h-[var(--app-min-h,100dvh)] flex-col pt-[max(env(safe-area-inset-top),var(--safe-top,0px))]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy pt-[env(safe-area-inset-top)] text-white lg:flex">
        <div className="px-4 py-5">
          <div className="rounded-xl bg-white px-3 py-3">
            <Logo variant="full" className="mx-auto h-16 w-auto" />
          </div>
          <div className="mt-2 px-1 text-[11px] text-white/60">App {ROTULO_PERFIL[perfil]}</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const Icon = ICONS[item.to] ?? BookOpen
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
                {item.to === '/alertas' && nAlertas > 0 ? (
                  <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">{nAlertas}</span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>
        <a
          href={whatsappUrl(state.whatsapp, 'Olá, preciso de suporte no EDB Total.')}
          target="_blank"
          rel="noreferrer"
          className="mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-emerald-300 hover:bg-white/8"
        >
          <MessageCircle size={18} />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={logout}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/8"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-navy/50" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <aside className="relative z-10 flex h-full w-[78%] max-w-64 flex-col bg-navy pt-[max(env(safe-area-inset-top),var(--safe-top,0px))] text-white">
            <div className="px-4 py-5">
              <div className="rounded-xl bg-white px-3 py-3">
                <Logo variant="full" className="mx-auto h-14 w-auto" />
              </div>
              <div className="mt-2 text-[11px] text-white/60">App {ROTULO_PERFIL[perfil]}</div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
              {nav.map((item) => {
                const Icon = ICONS[item.to] ?? BookOpen
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-white/12' : 'text-white/70'}`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>
            <a
              href={whatsappUrl(state.whatsapp, 'Olá, preciso de suporte no EDB Total.')}
              target="_blank"
              rel="noreferrer"
              className="mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-emerald-300"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
            <button
              type="button"
              onClick={logout}
              className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <LogOut size={18} />
              Sair
            </button>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-navy shadow-md lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={26} strokeWidth={2.75} />
            </button>
            <Logo variant="mark" className="h-8 w-8" />
            <div className="truncate text-sm font-semibold text-navy">
              {location.pathname.startsWith('/relatorio/') ? 'Relatório da filial' : 'EDB Total'}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <TemaToggle compact />
            <NavLink to="/conta" className="flex min-w-0 items-center gap-1.5 text-xs text-ink hover:text-navy">
              <UserRound size={16} className="shrink-0 text-muted" />
              <span className="max-w-[96px] truncate sm:max-w-[140px]">{usuario?.nome}</span>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <a
        href={whatsappUrl(state.whatsapp, 'Olá, preciso de suporte no EDB Total.')}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-4 z-30 hidden h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg lg:flex"
        aria-label="Suporte via WhatsApp"
      >
        <MessageCircle size={22} />
      </a>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 pb-[max(env(safe-area-inset-bottom),var(--safe-bottom,0px))] backdrop-blur-md lg:hidden"
        style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}
      >
        {mobile.map((item) => {
          const Icon = ICONS[item.to] ?? BookOpen
          const active = item.to === '/inicio'
            ? location.pathname === '/inicio'
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 px-0.5 pt-1.5 text-[9px] leading-tight ${
                active ? 'font-bold text-navy' : 'font-semibold text-navy/70'
              }`}
            >
              <Icon size={22} />
              {item.label}
              {item.to === '/alertas' && nAlertas > 0 ? (
                <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-gold" />
              ) : null}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
