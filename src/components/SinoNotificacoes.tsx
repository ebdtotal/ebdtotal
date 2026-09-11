import { MessageCircle, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lidasDe, marcarNotificacoesLidas, notificacoesDe, onNotificacoesChange, type Notificacao } from '../lib/notificacoes'
import { notificarCelular } from '../lib/notify'
import { useStore } from '../lib/store'

export function SinoNotificacoes() {
  const { state, usuario } = useStore()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [ocultas, setOcultas] = useState<string[]>([])
  const [tick, setTick] = useState(0)
  useEffect(() => onNotificacoesChange(() => setTick((n) => n + 1)), [])

  const itens = useMemo(() => notificacoesDe(state, usuario), [state, usuario])
  const novas = useMemo(() => {
    if (!usuario) return []
    const lidas = lidasDe(usuario.id)
    return itens.filter((n) => !lidas.has(n.id))
  }, [itens, usuario, tick])

  const primeira = novas.find((n) => !ocultas.includes(n.id))

  useEffect(() => {
    if (!novas.length) return
    void notificarCelular(novas)
  }, [novas])

  if (!usuario || usuario.papel === 'admin') return null

  function abrirMensagem(n: Notificacao) {
    marcarNotificacoesLidas(usuario!.id, [n.id])
    if (n.to) {
      setAberto(false)
      navigate(n.to)
    }
  }

  return (
    <>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-navy hover:bg-navy/5"
        aria-label={novas.length ? `${novas.length} mensagens novas` : 'Mensagens'}
        onClick={() => setAberto(true)}
      >
        <MessageCircle size={20} />
        {novas.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-4 text-navy">
            {novas.length > 9 ? '9+' : novas.length}
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-navy/40" aria-label="Fechar mensagens" onClick={() => setAberto(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-[#e7edf3] shadow-xl">
            <header className="flex items-center justify-between bg-navy px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">Mensagens</p>
                <p className="text-[11px] text-white/60">EBD Total</p>
              </div>
              <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar" onClick={() => setAberto(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {itens.length === 0 ? (
                <p className="px-2 text-sm text-muted">Nenhuma mensagem no momento.</p>
              ) : (
                itens.map((n) => {
                  const nova = novas.some((x) => x.id === n.id)
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => abrirMensagem(n)}
                      className="block w-full text-left"
                    >
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">EBD Total</span>
                      <span
                        className={`block rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm leading-6 shadow-sm ${
                          nova ? 'bg-white text-ink' : 'bg-white/70 text-ink/80'
                        }`}
                      >
                        {n.texto}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            {novas.length > 0 ? (
              <div className="border-t border-line bg-white px-3 py-3">
                <button
                  type="button"
                  className="w-full rounded-xl bg-navy py-2.5 text-sm font-semibold text-white"
                  onClick={() => marcarNotificacoesLidas(usuario.id, novas.map((n) => n.id))}
                >
                  Marcar como lidas
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {primeira && !aberto ? (
        <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">EBD Total</p>
            <p className="mt-1 text-sm leading-6 text-ink">{primeira.texto}</p>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="text-xs font-semibold text-muted" onClick={() => setOcultas((lista) => [...lista, primeira.id])}>
                Depois
              </button>
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => abrirMensagem(primeira)}>
                Ok
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
