import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'
import { licaoDaData } from '../lib/acompanhamento'
import { useStore } from '../lib/store'
import { turmasDaEscola } from '../lib/stats'
import type { Avaliacao } from '../lib/types'
import { lastSunday, toISODate, uid } from '../lib/utils'

const VAZIA = {
  pergunta: 'Qual foi o principal ensinamento da lição?',
  alts: ['A', 'B', 'C', 'D'],
  correta: 0,
}

export function AvaliacaoPage() {
  const { state, escolasVisiveis, usuario, ehProfessor, saveAvaliacao, removeAvaliacao, podeVerTudo } = useStore()
  const preferida = escolasVisiveis.find((e) => e.id === usuario?.escolaId) ?? escolasVisiveis.find((e) => e.nome.includes('Oliveiras')) ?? escolasVisiveis[0]
  const [escolaId, setEscolaId] = useState(preferida?.id ?? '')
  const turmas = turmasDaEscola(state.pessoas, escolaId)
  const [turma, setTurma] = useState(usuario?.turma || turmas.find((t) => t === 'Primários A') || turmas[0] || '')
  const turmaAtual = ehProfessor && usuario?.turma ? usuario.turma : turma
  const hoje = toISODate(lastSunday())
  const licao = licaoDaData(state.licoes, state.eventos, hoje) ?? state.licoes.at(-1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pergunta, setPergunta] = useState(VAZIA.pergunta)
  const [alts, setAlts] = useState(VAZIA.alts)
  const [correta, setCorreta] = useState(VAZIA.correta)

  const daEscola = useMemo(
    () =>
      state.avaliacoes.filter((a) => {
        if (a.escolaId !== escolaId) return false
        if (ehProfessor && usuario?.turma) return a.turma === usuario.turma
        return true
      }),
    [state.avaliacoes, escolaId, ehProfessor, usuario?.turma],
  )

  function limparForm() {
    setEditingId(null)
    setPergunta(VAZIA.pergunta)
    setAlts([...VAZIA.alts])
    setCorreta(VAZIA.correta)
  }

  function editar(av: Avaliacao) {
    setEditingId(av.id)
    setPergunta(av.pergunta)
    setAlts(av.alternativas.length ? [...av.alternativas] : [...VAZIA.alts])
    setCorreta(av.correta)
    setEscolaId(av.escolaId)
    if (!ehProfessor) setTurma(av.turma)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function excluir(av: Avaliacao) {
    if (!window.confirm(`Excluir a pergunta “${av.pergunta}”? As respostas dos alunos desta miniavaliação também saem.`)) {
      return
    }
    if (editingId === av.id) limparForm()
    removeAvaliacao(av.id)
  }

  function lancar() {
    if (!licao || !turmaAtual || !pergunta.trim()) return
    const existente = editingId ? state.avaliacoes.find((a) => a.id === editingId) : undefined
    saveAvaliacao({
      id: existente?.id ?? uid('quiz'),
      licaoId: existente?.licaoId ?? licao.id,
      escolaId,
      turma: turmaAtual,
      data: existente?.data ?? hoje,
      pergunta: pergunta.trim(),
      alternativas: alts.map((a) => a.trim() || '—'),
      correta,
      respostas: existente?.respostas ?? [],
    })
    limparForm()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Avaliação de aprendizagem</h1>
      <p className="mb-5 text-sm text-muted">
        Miniavaliação depois da aula. Cada acerto do aluno vale 1 ponto no ranking.
      </p>

      <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">{editingId ? 'Editar pergunta' : 'Lançar miniavaliação'}</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Congregação">
            <select
              className={inputClass}
              value={escolaId}
              disabled={!podeVerTudo || !!editingId}
              onChange={(e) => {
                setEscolaId(e.target.value)
                setTurma('')
              }}
            >
              {escolasVisiveis.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Turma">
            <select className={inputClass} value={turmaAtual} disabled={ehProfessor || !!editingId} onChange={(e) => setTurma(e.target.value)}>
              {turmaAtual && !turmas.includes(turmaAtual) ? <option value={turmaAtual}>{turmaAtual}</option> : null}
              {turmas.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Lição">
            <div className="rounded-md border border-line px-3 py-2 text-sm">
              {licao ? `${licao.trimestre}º tri · Lição ${licao.numero} — ${licao.tema}` : '—'}
            </div>
          </Field>
        </div>
        <Field label="Pergunta">
          <input className={inputClass} value={pergunta} onChange={(e) => setPergunta(e.target.value)} />
        </Field>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {alts.map((a, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={correta === i} onChange={() => setCorreta(i)} />
              <input
                className={inputClass}
                value={a}
                onChange={(e) => setAlts(alts.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Marque a alternativa correta à esquerda.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={lancar}>
            {editingId ? 'Salvar alterações' : 'Publicar para a turma'}
          </PrimaryButton>
          {editingId ? <GhostButton onClick={limparForm}>Cancelar</GhostButton> : null}
        </div>
      </section>

      {daEscola.map((av) => {
        const l = state.licoes.find((x) => x.id === av.licaoId)
        const ok = av.respostas.filter((r) => r.alternativa === av.correta).length
        const ruim = av.respostas.filter((r) => r.alternativa !== av.correta).length
        const n = state.pessoas.filter(
          (p) => p.escolaId === av.escolaId && p.turma === av.turma && p.tipo === 'Aluno' && p.status === 'Ativo',
        ).length
        return (
          <section key={av.id} className="mb-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-xs uppercase text-muted">
                Turma: {av.turma} · {n} alunos · {l?.tema}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:bg-page hover:text-navy"
                  aria-label="Editar pergunta"
                  onClick={() => editar(av)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                  aria-label="Excluir pergunta"
                  onClick={() => excluir(av)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="mt-1 font-semibold">{av.pergunta}</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {av.alternativas.map((alt, i) => (
                <li key={`${av.id}-${i}`} className={i === av.correta ? 'font-semibold text-emerald-700' : ''}>
                  ○ {alt}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <p className="rounded-lg bg-emerald-50 p-3 text-sm">
                <b>{ok}</b> acertos · {ok} {ok === 1 ? 'ponto' : 'pontos'}
              </p>
              <p className="rounded-lg bg-amber-50 p-3 text-sm">
                <b>{ruim}</b> apresentaram dificuldade
              </p>
            </div>
          </section>
        )
      })}

      {daEscola.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma avaliação lançada nesta congregação.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">Os alunos respondem no Portal do Aluno.</p>
      )}
    </div>
  )
}
