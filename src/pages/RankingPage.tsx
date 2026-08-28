import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PrimaryButton } from '../components/ui'
import { fichaAluno } from '../lib/acompanhamento'
import { exportToExcel } from '../lib/excel'
import { useStore } from '../lib/store'
import { rankingDe } from '../lib/stats'

const LABELS = [
  ['frequencia', 'Frequência'],
  ['participacao', 'Participação'],
  ['atividades', 'Atividades'],
  ['evolucao', 'Evolução'],
  ['aprendizado', 'Aprendizado'],
  ['leitura', 'Leitura'],
  ['projetos', 'Projetos'],
] as const

export function RankingPage() {
  const { state, escolasVisiveis, usuario, setRankingCompetitivo } = useStore()
  const [aba, setAba] = useState<'indicadores' | 'presenca' | 'pontos'>('indicadores')
  const visivel = state.rankingCompetitivo ? aba : 'indicadores'
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const linhas = rankingDe(state, ids, usuario?.turma)
  const fichas = useMemo(
    () =>
      linhas
        .map((l) => fichaAluno(state, l.pessoa.id))
        .filter(Boolean)
        .sort((a, b) => b!.indicadores.aprendizado - a!.indicadores.aprendizado || b!.frequencia - a!.frequencia),
    [linhas, state],
  )

  const ordenado = [...linhas].sort((a, b) =>
    visivel === 'pontos' ? b.pontos - a.pontos : b.taxa - a.taxa || b.presentes - a.presentes,
  )

  function exportar() {
    exportToExcel(
      `indicadores-${visivel}`,
      visivel === 'indicadores'
        ? fichas.map((f) => ({
            Nome: f!.pessoa.nome,
            Turma: f!.pessoa.turma,
            Frequencia: `${f!.frequencia}%`,
            Participacao: `${f!.indicadores.participacao}%`,
            Aprendizado: `${f!.indicadores.aprendizado}%`,
            Leitura: `${f!.indicadores.leitura}%`,
            Evolucao: `${f!.indicadores.evolucao}%`,
          }))
        : ordenado.map((l, i) => ({
            Posicao: i + 1,
            Nome: l.pessoa.nome,
            Turma: l.pessoa.turma,
            Presentes: l.presentes,
            Aulas: l.aulas,
            Taxa: `${l.taxa}%`,
            Pontos: l.pontos,
          })),
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Indicadores</h1>
          <p className="text-sm text-muted">
            Frequência, participação e aprendizado — classificação competitiva é opcional
          </p>
        </div>
        <PrimaryButton onClick={exportar}>
          <Download size={16} /> Excel
        </PrimaryButton>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.rankingCompetitivo}
          onChange={(e) => setRankingCompetitivo(e.target.checked)}
        />
        Ativar ranking competitivo (presença e pontos)
      </label>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAba('indicadores')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${aba === 'indicadores' ? 'bg-navy text-white' : 'bg-white'}`}
        >
          Indicadores
        </button>
        {state.rankingCompetitivo ? (
          <>
            <button
              type="button"
              onClick={() => setAba('presenca')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${aba === 'presenca' ? 'bg-navy text-white' : 'bg-white'}`}
            >
              Ranking de presença
            </button>
            <button
              type="button"
              onClick={() => setAba('pontos')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${aba === 'pontos' ? 'bg-navy text-white' : 'bg-white'}`}
            >
              Ranking de pontuação
            </button>
          </>
        ) : null}
      </div>

      {visivel === 'indicadores' ? (
        <section className="rounded-xl bg-white shadow-sm">
          <div className="table-wrap">
            <table className="data w-full min-w-[720px] text-left">
              <thead>
                <tr>
                  {['Aluno', 'Turma', ...LABELS.map(([, l]) => l)].map((h) => (
                    <th key={h} className="px-3 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f!.pessoa.id}>
                    <td className="px-3 py-3 font-medium">
                      <Link to={`/alunos/${f!.pessoa.id}`} className="hover:underline">
                        {f!.pessoa.nome}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{f!.pessoa.turma}</td>
                    {LABELS.map(([k]) => (
                      <td key={k} className="px-3 py-3">
                        {f!.indicadores[k]}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-xl bg-white shadow-sm">
          <ol>
            {ordenado.map((l, i) => (
              <li key={l.pessoa.id} className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-gold/30 text-navy' : 'bg-page text-muted'}`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <Link to={`/alunos/${l.pessoa.id}`} className="font-medium hover:underline">
                      {l.pessoa.nome}
                    </Link>
                    <div className="text-xs text-muted">{l.pessoa.turma}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {visivel === 'pontos' ? (
                    <div className="font-semibold">{l.pontos} pts</div>
                  ) : (
                    <div className="font-semibold">{l.taxa}%</div>
                  )}
                  <div className="text-xs text-muted">
                    {l.presentes}/{l.aulas} aulas
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
