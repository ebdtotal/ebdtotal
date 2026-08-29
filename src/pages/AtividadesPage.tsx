import { History, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'
import { apiAtividades, type AtividadeLogin, type AtividadeRegistro } from '../lib/api'
import { ROTULO_PAPEL } from '../lib/perfis'
import { useStore } from '../lib/store'
import type { Papel } from '../lib/types'

const ACOES: Record<string, string> = {
  entrou: 'Entrou',
  saiu: 'Saiu',
  cadastrou: 'Cadastrou',
  'editou cadastro': 'Editou cadastro',
  'gerou acesso': 'Gerou acesso',
  'alterou acesso': 'Alterou acesso',
  'lançou relatório': 'Lançou relatório',
  'finalizou relatório': 'Finalizou relatório',
  'lançou financeiro': 'Lançou financeiro',
  'publicou aviso': 'Publicou aviso',
  'respondeu avaliação': 'Respondeu avaliação',
  'alterou senha': 'Alterou senha',
  'pediu senha': 'Pediu senha',
  'criou igreja': 'Criou igreja',
  'alterou igreja': 'Alterou igreja',
}

function rotuloAcao(acao: string) {
  return ACOES[acao] ?? acao
}

function rotuloPapel(papel: string) {
  return ROTULO_PAPEL[papel as Papel] ?? papel
}

function formatarQuando(iso?: string | null) {
  if (!iso) return 'Ainda sem atividade'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return 'agora'
  if (diff < 3_600_000) return `há ${Math.max(1, Math.floor(diff / 60_000))} min`
  if (diff < 86_400_000) return `há ${Math.max(1, Math.floor(diff / 3_600_000))} h`
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatarData(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AtividadesPage() {
  const { usuario } = useStore()
  const pode = usuario?.papel === 'admin' || usuario?.papel === 'sede' || usuario?.papel === 'superintendente'
  const [q, setQ] = useState('')
  const [papel, setPapel] = useState('')
  const [username, setUsername] = useState('')
  const [atividades, setAtividades] = useState<AtividadeRegistro[]>([])
  const [logins, setLogins] = useState<AtividadeLogin[]>([])
  const [master, setMaster] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(() => {
    setCarregando(true)
    setErro(null)
    void apiAtividades({ q: q.trim() || undefined, papel: papel || undefined, username: username || undefined })
      .then((r) => {
        setAtividades(r.atividades)
        setLogins(r.logins)
        setMaster(r.master)
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [q, papel, username])

  useEffect(() => {
    carregar()
    const t = window.setInterval(carregar, 12_000)
    return () => window.clearInterval(t)
  }, [carregar])

  const papeisFiltro = useMemo(() => {
    const set = new Set(logins.map((l) => l.papel).filter(Boolean))
    return [...set].sort()
  }, [logins])

  if (!pode) return <Navigate to="/inicio" replace />

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Registro de atividades</h1>
          <p className="text-sm text-muted">
            Entradas, cadastros, chamadas e demais ações dos logins. Os últimos 90 dias ficam guardados no servidor.
          </p>
        </div>
        <GhostButton onClick={carregar}>
          <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </GhostButton>
      </div>

      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Pesquisar">
            <input
              className={inputClass}
              placeholder="Nome, usuário, ação ou igreja"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
          <Field label="Perfil">
            <select className={inputClass} value={papel} onChange={(e) => setPapel(e.target.value)}>
              <option value="">Todos</option>
              {papeisFiltro.map((p) => (
                <option key={p} value={p}>
                  {rotuloPapel(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Login">
            <select className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)}>
              <option value="">Todos os logins</option>
              {logins.map((l) => (
                <option key={l.id} value={l.username}>
                  {l.nome} (@{l.username})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={carregar}>Filtrar</PrimaryButton>
        </div>
        {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}
      </section>

      <section className="mb-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4">
          <History size={18} className="text-navy" />
          <h2 className="text-lg font-semibold">Logins cadastrados</h2>
        </div>
        <table className="data mt-2 w-full min-w-[720px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Perfil</th>
              {master ? <th className="px-4 py-3">Igreja</th> : null}
              <th className="px-4 py-3">Última atividade</th>
            </tr>
          </thead>
          <tbody>
            {logins.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={master ? 5 : 4}>
                  {carregando ? 'Carregando…' : 'Nenhum login cadastrado neste painel.'}
                </td>
              </tr>
            ) : (
              logins.map((l) => (
                <tr
                  key={l.id}
                  className={`cursor-pointer ${username === l.username ? 'bg-gold/10' : ''}`}
                  onClick={() => setUsername(username === l.username ? '' : l.username)}
                >
                  <td className="px-4 py-3 font-medium">{l.nome}</td>
                  <td className="px-4 py-3">@{l.username}</td>
                  <td className="px-4 py-3">{rotuloPapel(l.papel)}</td>
                  {master ? <td className="px-4 py-3">{l.igreja || '—'}</td> : null}
                  <td className="px-4 py-3 text-sm">
                    <div>{formatarQuando(l.ultima_em)}</div>
                    {l.ultima_acao ? (
                      <div className="text-xs text-muted">
                        {rotuloAcao(l.ultima_acao)}
                        {l.ultima_detalhe ? ` · ${l.ultima_detalhe}` : ''}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <h2 className="px-4 pt-4 text-lg font-semibold">Linha do tempo</h2>
        <table className="data mt-2 w-full min-w-[800px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Perfil</th>
              {master ? <th className="px-4 py-3">Igreja</th> : null}
              <th className="px-4 py-3">Atividade</th>
            </tr>
          </thead>
          <tbody>
            {atividades.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={master ? 5 : 4}>
                  {carregando
                    ? 'Carregando…'
                    : 'Ainda não há atividades. Elas aparecem quando alguém entra, cadastra, faz chamada ou altera dados.'}
                </td>
              </tr>
            ) : (
              atividades.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{formatarData(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.nome || a.username}</div>
                    <div className="text-xs text-muted">@{a.username}</div>
                  </td>
                  <td className="px-4 py-3">{rotuloPapel(a.papel)}</td>
                  {master ? <td className="px-4 py-3">{a.igreja || '—'}</td> : null}
                  <td className="px-4 py-3">
                    <div className="font-medium">{rotuloAcao(a.acao)}</div>
                    {a.detalhe ? <div className="text-xs text-muted">{a.detalhe}</div> : null}
                    {master && a.ip ? <div className="text-[11px] text-muted/80">IP {a.ip}</div> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
