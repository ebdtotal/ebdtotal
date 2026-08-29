import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LicaoSelect } from '../components/LicaoSelect'
import { Field, GhostButton, Modal, PrimaryButton, inputClass } from '../components/ui'
import { catalogoDeLicao, licaoDaData, licoesCatalogo } from '../lib/acompanhamento'
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
  const licaoAtualRaw = licaoDaData(state.licoes, state.eventos, hoje, {
    turma: turmaAtual,
    escolaId,
  })
  const licaoAtual = licaoAtualRaw ? catalogoDeLicao(state.licoes, licaoAtualRaw) : licoesCatalogo(state.licoes).at(-1)
  const [licaoId, setLicaoId] = useState(licaoAtual?.id ?? '')
  const licao = state.licoes.find((l) => l.id === licaoId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pergunta, setPergunta] = useState(VAZIA.pergunta)
  const [alts, setAlts] = useState(VAZIA.alts)
  const [correta, setCorreta] = useState(VAZIA.correta)
  const [lista, setLista] = useState<{ av: Avaliacao; tipo: 'acertos' | 'erros' } | null>(null)

  const daLicao = useMemo(
    () =>
      state.avaliacoes.filter((a) => {
        if (a.licaoId !== licaoId) return false
        if (a.escolaId !== escolaId) return false
        if (ehProfessor && usuario?.turma) return a.turma === usuario.turma
        return true
      }),
    [state.avaliacoes, licaoId, escolaId, ehProfessor, usuario?.turma],
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
    setLicaoId(av.licaoId)
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
    if (!licaoId || !turmaAtual || !pergunta.trim()) return
    const existente = editingId ? state.avaliacoes.find((a) => a.id === editingId) : undefined
    saveAvaliacao({
      id: existente?.id ?? uid('quiz'),
      licaoId,
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

  const totalAcertos = daLicao.reduce((n, av) => n + av.respostas.filter((r) => r.alternativa === av.correta).length, 0)
  const totalErros = daLicao.reduce((n, av) => n + av.respostas.filter((r) => r.alternativa !== av.correta).length, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Avaliação de aprendizagem</h1>
      <p className="mb-5 text-sm text-muted">
        Publique as perguntas na lição escolhida. Os alunos só veem essa lição, e os acertos entram no ranking dela.
      </p>

      <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <Field label="Lição">
          <LicaoSelect value={licaoId} onChange={setLicaoId} licoes={licoesCatalogo(state.licoes)} eventos={state.eventos} />
        </Field>
        {licao ? (
          <p className="mt-2 text-sm text-navy">
            {licao.trimestre}º tri · Lição {licao.numero} — {licao.tema}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Selecione a lição para publicar e ver as perguntas.</p>
        )}
      </section>

      <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">{editingId ? 'Editar pergunta' : 'Lançar miniavaliação'}</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <p className="mt-2 text-xs text-muted">Marque a alternativa correta à esquerda. A pergunta fica nesta lição.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={lancar} disabled={!licaoId}>
            {editingId ? 'Salvar alterações' : 'Publicar para a turma'}
          </PrimaryButton>
          {editingId ? <GhostButton onClick={limparForm}>Cancelar</GhostButton> : null}
        </div>
      </section>

      {daLicao.length > 0 ? (
        <p className="mb-4 text-sm text-muted">
          Nesta lição: <b className="text-emerald-300">{totalAcertos}</b> acertos · <b className="text-amber-200">{totalErros}</b> erros
        </p>
      ) : null}

      {daLicao.map((av) => {
        const ok = av.respostas.filter((r) => r.alternativa === av.correta)
        const ruim = av.respostas.filter((r) => r.alternativa !== av.correta)
        const n = state.pessoas.filter(
          (p) => p.escolaId === av.escolaId && p.turma === av.turma && p.tipo === 'Aluno' && p.status === 'Ativo',
        ).length
        return (
          <section key={av.id} className="mb-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-xs uppercase text-muted">
                Turma: {av.turma} · {n} alunos · {av.respostas.length} respostas
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy shadow-sm"
                  aria-label="Editar pergunta"
                  onClick={() => editar(av)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm"
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
              <button
                type="button"
                className="rounded-lg bg-emerald-50 p-3 text-left text-sm text-emerald-900 ring-2 ring-transparent hover:ring-emerald-400"
                onClick={() => setLista({ av, tipo: 'acertos' })}
              >
                <b>{ok.length}</b> acertos · toque para ver quem
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-50 p-3 text-left text-sm text-amber-900 ring-2 ring-transparent hover:ring-amber-400"
                onClick={() => setLista({ av, tipo: 'erros' })}
              >
                <b>{ruim.length}</b> erros · toque para ver quem
              </button>
            </div>
          </section>
        )
      })}

      {licaoId && daLicao.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma pergunta publicada nesta lição. Lance acima para a turma responder.</p>
      ) : null}
      {!licaoId ? <p className="text-sm text-muted">Escolha a lição para ver e publicar as perguntas.</p> : null}

      <ListaRespostas
        lista={lista}
        pessoas={state.pessoas}
        onClose={() => setLista(null)}
      />
    </div>
  )
}

function ListaRespostas({
  lista,
  pessoas,
  onClose,
}: {
  lista: { av: Avaliacao; tipo: 'acertos' | 'erros' } | null
  pessoas: { id: string; nome: string }[]
  onClose: () => void
}) {
  if (!lista) return null
  const { av, tipo } = lista
  const filtradas = av.respostas.filter((r) =>
    tipo === 'acertos' ? r.alternativa === av.correta : r.alternativa !== av.correta,
  )
  const titulo = tipo === 'acertos' ? 'Alunos que acertaram' : 'Alunos que erraram'

  return (
    <Modal open title={titulo} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">{av.pergunta}</p>
      {filtradas.length === 0 ? (
        <p className="text-sm text-muted">Ninguém nesta lista ainda.</p>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((r) => {
            const p = pessoas.find((x) => x.id === r.pessoaId)
            const marcada = av.alternativas[r.alternativa] ?? '—'
            return (
              <li key={r.pessoaId} className="rounded-xl border border-line px-3 py-3">
                <div className="font-semibold text-navy">{p?.nome ?? r.pessoaId}</div>
                <div className="mt-1 text-sm text-muted">
                  Respondeu: {marcada}
                  {tipo === 'acertos' ? ' · correta' : ` · correta era ${av.alternativas[av.correta]}`}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
