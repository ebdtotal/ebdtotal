import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { Confirmacao, Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'
import {
  apiAfiliados,
  apiCriarAfiliado,
  apiPatchAfiliado,
  type AfiliadoCliente,
  type AfiliadoItem,
  type AssinaturaPendente,
} from '../lib/api'
import { useStore } from '../lib/store'
import { formatDateBR } from '../lib/utils'

export function MasterAfiliadosPage() {
  const { usuario } = useStore()
  const [lista, setLista] = useState<AfiliadoItem[]>([])
  const [resumo, setResumo] = useState({ total: 0, ativos: 0, cliques: 0, conversoes: 0 })
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [detalhe, setDetalhe] = useState<AfiliadoItem | null>(null)
  const [clientes, setClientes] = useState<AfiliadoCliente[]>([])
  const [signups, setSignups] = useState<AssinaturaPendente[]>([])
  const [excluir, setExcluir] = useState<AfiliadoItem | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  function carregar() {
    void apiAfiliados()
      .then((r) => {
        setLista(r.afiliados ?? [])
        setResumo(r.resumo ?? { total: 0, ativos: 0, cliques: 0, conversoes: 0 })
        setErro(null)
      })
      .catch((e: Error) => setErro(e.message))
  }

  useEffect(() => {
    carregar()
  }, [])

  async function abrirDetalhe(a: AfiliadoItem) {
    setDetalhe(a)
    try {
      const r = await apiAfiliados(a.codigo)
      setClientes(r.clientes ?? [])
      setSignups(r.signups ?? [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar clientes')
    }
  }

  async function criar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await apiCriarAfiliado({ nome, codigo: codigo || undefined, notas: notas || undefined })
      setNome('')
      setCodigo('')
      setNotas('')
      carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar')
    } finally {
      setSalvando(false)
    }
  }

  async function copiar(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      setErro('Não foi possível copiar. Selecione o link manualmente.')
    }
  }

  if (usuario?.papel !== 'admin') return <Navigate to="/inicio" replace />

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Afiliados</h1>
      <p className="mt-1 text-sm text-muted">
        Crie links rastreáveis. Cada clique e cada igreja que assinar pelo link entram no relatório.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/master" className="font-semibold text-navy hover:underline">
          ← Painel das igrejas
        </Link>
      </p>
      {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Links', String(resumo.total)],
          ['Ativos', String(resumo.ativos)],
          ['Cliques', String(resumo.cliques)],
          ['Conversões', String(resumo.conversoes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => void criar(e)} className="mt-5 space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Link2 size={16} /> Novo link de afiliado
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome (parceiro / pastor / campanha)">
            <input className={inputClass} required value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Código do link (opcional)">
            <input
              className={inputClass}
              placeholder="ex.: pastor-joao"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notas">
          <input className={inputClass} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar link'}
        </PrimaryButton>
      </form>

      <section className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="data mt-0 w-full min-w-[920px] text-left">
          <thead>
            <tr>
              <th className="px-4 py-3">Afiliado</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Cliques</th>
              <th className="px-4 py-3">Conversões</th>
              <th className="px-4 py-3">Pendentes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-sm text-muted" colSpan={7}>
                  Nenhum afiliado ainda. Crie o primeiro link acima.
                </td>
              </tr>
            ) : (
              lista.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{a.nome}</div>
                    <div className="text-xs text-muted">código: {a.codigo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] truncate text-xs text-navy">{a.link}</div>
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-navy underline"
                      onClick={() => void copiar(a.link, a.id)}
                    >
                      {copiado === a.id ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.cliques}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{a.conversoes}</td>
                  <td className="px-4 py-3">{a.pendentes}</td>
                  <td className="px-4 py-3">{a.ativo ? 'Ativo' : 'Pausado'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <GhostButton type="button" onClick={() => void abrirDetalhe(a)}>
                        Clientes
                      </GhostButton>
                      <GhostButton
                        type="button"
                        onClick={() =>
                          void apiPatchAfiliado(a.id, { ativo: !a.ativo }).then(carregar).catch((e: Error) => setErro(e.message))
                        }
                      >
                        {a.ativo ? 'Pausar' : 'Ativar'}
                      </GhostButton>
                      <GhostButton type="button" onClick={() => setExcluir(a)}>
                        Excluir
                      </GhostButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {detalhe ? (
        <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Clientes de {detalhe.nome}</h2>
              <p className="text-sm text-muted">{detalhe.link}</p>
            </div>
            <GhostButton type="button" onClick={() => setDetalhe(null)}>
              Fechar
            </GhostButton>
          </div>
          <h3 className="mt-4 text-sm font-semibold">Igrejas convertidas ({clientes.length})</h3>
          {clientes.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhuma conversão ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {clientes.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-muted"> · {c.responsavel}</span>
                  </span>
                  <span className="text-muted">
                    {formatDateBR(c.created_at.slice(0, 10))} · {c.status} · {c.plano}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 text-sm font-semibold">Assinaturas pelo link ({signups.length})</h3>
          {signups.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhum checkout iniciado com este código.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {signups.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{s.nome}</span>
                    <span className="text-muted"> · {s.email}</span>
                  </span>
                  <span className="text-muted">
                    {formatDateBR(s.created_at.slice(0, 10))} · {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <Confirmacao
        open={!!excluir}
        titulo="Excluir afiliado?"
        texto={
          excluir
            ? `Remove o link “${excluir.nome}” e o histórico de cliques. As igrejas já convertidas continuam cadastradas.`
            : ''
        }
        confirmar="Excluir"
        onCancel={() => setExcluir(null)}
        onConfirm={() => {
          if (!excluir) return
          void apiPatchAfiliado(excluir.id, { acao: 'excluir' })
            .then(() => {
              if (detalhe?.id === excluir.id) setDetalhe(null)
              setExcluir(null)
              carregar()
            })
            .catch((e: Error) => setErro(e.message))
        }}
      />
    </div>
  )
}
