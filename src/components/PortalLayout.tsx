import { Award, BookOpen, CalendarRange, ClipboardCheck, Home, KeyRound, LogOut, Megaphone, Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Logo } from './Logo'

const NAV = [
  { to: '/portal', label: 'Início', icon: Home, end: true },
  { to: '/calendario', label: 'Calendário', icon: CalendarRange, end: false },
  { to: '/licao', label: 'Lição', icon: BookOpen, end: false },
  { to: '/avisos', label: 'Avisos', icon: Megaphone, end: false },
  { to: '/certificados', label: 'Certificados', icon: Award, end: false },
  { to: '/portal/avaliacao', label: 'Atividades', icon: ClipboardCheck, end: false },
  { to: '/conta', label: 'Minha conta', icon: KeyRound, end: false },
]

const MOBILE = ['/portal', '/licao', '/avisos', '/portal/avaliacao']

export function PortalLayout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="app-navy flex h-full min-h-[var(--app-min-h,100dvh)] flex-col pt-[max(env(safe-area-inset-top),var(--safe-top,0px))]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy pt-[env(safe-area-inset-top)] text-white lg:flex">
        <div className="px-4 py-5">
          <div className="rounded-xl bg-white px-3 py-3">
            <Logo variant="full" className="mx-auto h-16 w-auto" />
          </div>
          <div className="mt-2 px-1 text-[11px] text-white/60">Portal do Aluno</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-white/12' : 'text-white/70'}`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70">
          <LogOut size={18} /> Sair
        </button>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-navy/50" aria-label="Fechar" onClick={() => setOpen(false)} />
          <aside className="relative z-10 flex h-full w-[78%] max-w-64 flex-col bg-navy pt-[max(env(safe-area-inset-top),var(--safe-top,0px))] text-white">
            <div className="px-4 py-5">
              <div className="rounded-xl bg-white px-3 py-3">
                <Logo variant="full" className="mx-auto h-14 w-auto" />
              </div>
            </div>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className="px-5 py-2 text-sm">
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="mx-3 mt-auto mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70"
            >
              <LogOut size={18} /> Sair
            </button>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <Logo variant="mark" className="h-8 w-8" />
            <div className="text-sm font-semibold text-navy">EDB Total</div>
          </div>
          <NavLink to="/conta" className="max-w-[110px] truncate text-xs font-medium text-navy">
            {usuario?.nome}
          </NavLink>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white/95 pb-[max(env(safe-area-inset-bottom),var(--safe-bottom,0px))] backdrop-blur-md lg:hidden">
        {NAV.filter((item) => MOBILE.includes(item.to)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-0.5 pt-1.5 text-[9px] ${isActive ? 'font-semibold text-navy' : 'text-muted'}`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
