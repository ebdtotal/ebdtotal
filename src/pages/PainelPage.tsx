import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { painelEbd } from '../lib/painel'
import { nomeEscola } from '../lib/stats'

export function PainelPage() {
  const { state, escolasVisiveis } = useStore()
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const dados = useMemo(() => painelEbd(state, ids), [state, ids])
  const titulo = escolasVisiveis.length === 1 ? escolasVisiveis[0]!.nome : 'Todas as congregações'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Painel da EBD</h1>
      <p className="mb-5 text-sm text-muted">{titulo} · o que merece atenção agora</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Alunos matriculados', String(dados.matriculados)],
          ['Média de presença', `${dados.mediaPresenca}%`],
          ['Professores ativos', String(dados.professores)],
          ['Visitantes', String(dados.visitantes)],
          ['Novos alunos', String(dados.novos)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-navy">{value}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Alertas</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border-l-4 border-red-500 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-red-700">
            🔴 {dados.faltas3.length} aluno{dados.faltas3.length === 1 ? '' : 's'} com 3 faltas consecutivas
          </div>
          <ul className="mt-3 space-y-2">
            {dados.faltas3.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link to={`/alunos/${a.id}`} className="text-sm hover:underline">
                  {a.nome}
                </Link>
                <div className="text-xs text-muted">
                  {a.turma} · {a.faltas} faltas seguidas
                </div>
              </li>
            ))}
            {dados.faltas3.length === 0 ? <li className="text-sm text-muted">Nenhum caso neste recorte.</li> : null}
          </ul>
        </section>

        <section className="rounded-xl border-l-4 border-amber-500 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-amber-700">
            🟠 {dados.turmasAbaixo.length} turma{dados.turmasAbaixo.length === 1 ? '' : 's'} abaixo da meta
          </div>
          <ul className="mt-3 space-y-2">
            {dados.turmasAbaixo.slice(0, 8).map((t) => (
              <li key={t.turma} className="text-sm">
                {t.turma}
                <div className="text-xs text-muted">
                  {t.taxa}% · meta {t.meta}%
                </div>
              </li>
            ))}
            {dados.turmasAbaixo.length === 0 ? <li className="text-sm text-muted">Todas as turmas na meta.</li> : null}
          </ul>
          <Link to="/metas" className="mt-3 inline-block text-xs font-semibold text-navy hover:underline">
            Ver metas →
          </Link>
        </section>

        <section className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-emerald-700">
            🟢 {dados.turmasCrescendo.length} turma{dados.turmasCrescendo.length === 1 ? '' : 's'} com crescimento de frequência
          </div>
          <ul className="mt-3 space-y-2">
            {dados.turmasCrescendo.slice(0, 8).map((t) => (
              <li key={t.turma} className="text-sm">
                {t.turma}
                <div className="text-xs text-muted">{t.taxa}% de frequência</div>
              </li>
            ))}
            {dados.turmasCrescendo.length === 0 ? (
              <li className="text-sm text-muted">Nenhuma turma em alta no momento.</li>
            ) : null}
          </ul>
        </section>
      </div>

      {escolasVisiveis.length > 1 ? (
        <p className="mt-6 text-xs text-muted">
          Recorte: {escolasVisiveis.map((e) => nomeEscola(state.escolas, e.id)).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
