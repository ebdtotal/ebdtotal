import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ehAppNativo } from '../lib/native'

export function ehIframeSimulacao() {
  return typeof window !== 'undefined' && window.self !== window.top
}

export function deveEnquadrarIphone() {
  if (typeof window === 'undefined') return false
  if (ehAppNativo()) return false
  if (window.matchMedia('(display-mode: standalone)').matches) return false
  if (window.self !== window.top) return false
  const path = window.location.pathname
  if (path === '/' || path === '/assine' || path === '/privacidade' || path === '/termos') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function aplicarSafeArea() {
  const root = document.documentElement
  root.classList.add('iphone-sim')
  root.style.setProperty('--safe-top', '54px')
  root.style.setProperty('--safe-bottom', '34px')
  root.style.setProperty('--app-min-h', '100%')
}

function Overlays() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex h-[54px] items-end justify-between px-8 pb-1 text-[12px] font-semibold text-white mix-blend-difference">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="flex gap-px">
            <span className="h-[8px] w-[3px] rounded-sm bg-current" />
            <span className="h-[8px] w-[3px] rounded-sm bg-current" />
            <span className="h-[8px] w-[3px] rounded-sm bg-current" />
            <span className="h-[8px] w-[3px] rounded-sm bg-current opacity-40" />
          </span>
          <span className="ml-1 inline-block h-[11px] w-[22px] rounded-[3px] border border-current">
            <span className="m-[1px] block h-[7px] w-[16px] rounded-[1px] bg-current" />
          </span>
        </span>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[11px] z-[80] h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[70] flex justify-center">
        <div className="h-[5px] w-[134px] rounded-full bg-black/80" />
      </div>
    </>
  )
}

export function IphoneViewport({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (ehIframeSimulacao()) aplicarSafeArea()
  }, [])

  if (!ehIframeSimulacao()) return <>{children}</>

  return (
    <div className="relative isolate h-full min-h-0 overflow-hidden bg-[#eef1f5]">
      <Overlays />
      <div className="h-full min-h-0">{children}</div>
    </div>
  )
}

export function IphoneShell() {
  const [scale, setScale] = useState(1)
  const src = useMemo(() => window.location.href, [])

  useEffect(() => {
    document.documentElement.classList.add('iphone-frame')
    function medir() {
      const w = window.innerWidth
      const h = window.innerHeight
      const s = Math.min(1, (w - 24) / 430, (h - 40) / 920)
      setScale(Number.isFinite(s) && s > 0 ? s : 1)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('resize', medir)
      document.documentElement.classList.remove('iphone-frame')
    }
  }, [])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#111318] p-4">
      <div style={{ transform: `scale(${scale})` }} className="origin-center">
        <div className="relative rounded-[54px] bg-black p-[11px] shadow-[0_30px_80px_rgba(0,0,0,.55)]">
          <div className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-[#2a2a2e]" />
          <div className="absolute -left-[3px] top-[168px] h-14 w-[3px] rounded-l bg-[#2a2a2e]" />
          <div className="absolute -left-[3px] top-[232px] h-14 w-[3px] rounded-l bg-[#2a2a2e]" />
          <div className="absolute -right-[3px] top-[190px] h-20 w-[3px] rounded-r bg-[#2a2a2e]" />
          <iframe
            title="iPhone 16"
            src={src}
            width={393}
            height={852}
            className="block rounded-[44px] border-0 bg-[#eef1f5]"
          />
        </div>
        <p className="mt-3 text-center text-[11px] tracking-wide text-white/45">iPhone 16 · EDB Total</p>
      </div>
    </div>
  )
}
