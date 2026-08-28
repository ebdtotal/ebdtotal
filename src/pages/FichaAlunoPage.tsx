import { Link, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { contatoAluno, dataBR, fichaAluno, rotuloTendencia } from '../lib/acompanhamento'
import { useStore } from '../lib/store'
import { nomeEscola } from '../lib/stats'

const LABELS: Record<string, string> = {
  frequencia: 'Frequência',
  participacao: 'Participação',
  atividades: 'Atividades',
  evolucao: 'Evolução',
  aprendizado: 'Aprendizado',
  leitura: 'Leitura bíblica',
  projetos: 'Projetos',
}

export function FichaAlunoPage() {
  const { id } = useParams()
  const { state } = useStore()
  const ficha = id ? fichaAluno(state, id) : null
  if (!ficha) {
    return (
      <div>
        <p className="text-sm text-muted">Aluno não encontrado.</p>
        <Link to="/cadastros" className="text-sm text-navy hover:underline">
          Voltar aos cadastros
        </Link>
      </div>
    )
  }
  const { pessoa, indicadores } = ficha
  const wa = contatoAluno(pessoa, state.whatsapp, pessoa.nome)

  return (
    <div>
      <Link to="/cadastros" className="text-sm text-navy hover:underline">
        ← Cadastros
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{pessoa.nome}</h1>
      <p className="mb-5 text-sm text-muted">
        {pessoa.turma} · {nomeEscola(state.escolas, pessoa.escolaId)} · {pessoa.faixaEtaria}
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Frequência" value={`${ficha.frequencia}%`} />
        <Card label="Última presença" value={dataBR(ficha.ultimaPresenca)} />
        <Card label="Tendência" value={rotuloTendencia(ficha.tendencia)} />
        <Card label="Ação recomendada" value={ficha.acao} accent={ficha.acao === 'Entrar em contato'} />
      </div>

      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Últimas 8 aulas</h2>
        <div className="flex flex-wrap gap-2">
          {ficha.ultimas8.map((a) => (
            <span
              key={a.data}
              title={dataBR(a.data)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                a.presente ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {a.presente ? '✓' : '✗'}
            </span>
          ))}
          {ficha.ultimas8.length === 0 ? <p className="text-sm text-muted">Sem histórico de chamada.</p> : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          {ficha.presentes}/{ficha.aulas} presenças no histórico · {ficha.faltasSeguidas === 1 ? '1 falta consecutiva' : `${ficha.faltasSeguidas} faltas consecutivas`}
        </p>
      </section>

      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase text-muted">Indicadores (sem ranking)</h2>
        <ul className="space-y-3">
          {Object.entries(indicadores).map(([k, v]) => (
            <li key={k}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{LABELS[k] ?? k}</span>
                <span className="font-semibold">{v}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-page">
                <div className="h-full rounded-full bg-navy" style={{ width: `${v}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {ficha.acao === 'Entrar em contato' ? (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <MessageCircle size={16} /> Entrar em contato
        </a>
      ) : null}
    </div>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${accent ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  )
}
