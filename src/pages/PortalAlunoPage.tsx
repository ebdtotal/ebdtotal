import { Link } from 'react-router-dom'
import { catalogoDeLicao, fichaAluno, licaoDaData } from '../lib/acompanhamento'
import { ROTULO_EVENTO } from '../lib/pedagogia'
import { metaDaEscola, progressoMeta, frequenciaAtual } from '../lib/painel'
import { useStore } from '../lib/store'
import { aniversariantes, rankingDe } from '../lib/stats'
import { domingoDaAula, formatDateBR, toISODate } from '../lib/utils'

export function PortalAlunoPage() {
  const { state, usuario } = useStore()
  const pessoa = state.pessoas.find((p) => p.id === usuario?.pessoaId)
  const ficha = pessoa ? fichaAluno(state, pessoa.id) : null
  const hoje = toISODate(domingoDaAula())
  const licao = licaoDaData(state.licoes, state.eventos, hoje, {
    turma: pessoa?.turma ?? usuario?.turma,
    escolaId: pessoa?.escolaId ?? usuario?.escolaId,
  })
  const catalogoLicao = licao ? catalogoDeLicao(state.licoes, licao) : null
  const turmaRank = pessoa?.turma ?? usuario?.turma
  const rankingTurma = turmaRank
    ? rankingDe(state, new Set([pessoa?.escolaId ?? usuario?.escolaId ?? ''].filter(Boolean)), turmaRank)
    : []
  const posicao = pessoa ? rankingTurma.findIndex((l) => l.pessoa.id === pessoa.id) + 1 : 0
  const meusPontos = pessoa ? rankingTurma.find((l) => l.pessoa.id === pessoa.id)?.pontos ?? 0 : 0
  const nivers = aniversariantes(state.pessoas.filter((p) => p.escolaId === usuario?.escolaId), 14)
  const avisos = (state.avisos ?? []).filter((a) => !a.escolaId || a.escolaId === usuario?.escolaId)
  const certs = state.certificados.filter((c) => c.pessoaId === pessoa?.id)
  const quizzes = state.avaliacoes.filter((a) => a.turma === pessoa?.turma)
  const meta = usuario?.escolaId ? metaDaEscola(state, usuario.escolaId) : null
  const freqEscola = usuario?.escolaId ? frequenciaAtual(state, usuario.escolaId) : 0
  const setembro = state.eventos.filter((e) => e.data.startsWith('2026-09')).sort((a, b) => a.data.localeCompare(b.data))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Olá, {pessoa?.nome.split(' ')[0] ?? usuario?.nome}</h1>
      <p className="mb-5 text-sm text-muted">{pessoa?.turma} · sua semana na EBD</p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Frequência" value={`${ficha?.frequencia ?? 0}%`} />
        <Card label="Pontos" value={`${meusPontos}`} />
        <Card label="Posição na turma" value={posicao ? `${posicao}º de ${rankingTurma.length}` : '—'} />
        <Card
          label="Meta da turma"
          value={meta ? `${progressoMeta(ficha?.frequencia ?? 0, meta.frequencia)}%` : '—'}
        />
      </div>

      {rankingTurma.length > 0 ? (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Ranking da turma</h2>
          <p className="mb-3 text-sm text-muted">
            {pessoa?.turma ? `Pontuação de ${pessoa.turma}` : 'Pontuação da classe'}
            {posicao ? ` · você está em ${posicao}º com ${meusPontos} ${meusPontos === 1 ? 'ponto' : 'pontos'}` : ''}
          </p>
          <ol>
            {rankingTurma.map((l, i) => {
              const eu = l.pessoa.id === pessoa?.id
              return (
                <li
                  key={l.pessoa.id}
                  className={`flex items-center justify-between border-b border-line px-1 py-2.5 last:border-0 ${eu ? 'rounded-lg bg-gold/20 px-3' : ''}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-gold/30 text-navy' : 'bg-page text-muted'}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {l.pessoa.nome}
                        {eu ? ' · você' : ''}
                      </div>
                      <div className="text-xs text-muted">
                        {l.presentes}/{l.aulas} presenças
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">{l.pontos} pts</div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {ficha ? (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Últimas aulas</h2>
          <div className="flex flex-wrap gap-2">
            {ficha.ultimas8.map((a) => (
              <span
                key={a.data}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  a.presente ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {a.presente ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {licao ? (
        <section className="mb-5 rounded-xl bg-navy p-5 text-white shadow-sm">
          <div className="text-xs uppercase text-gold">Lição da semana</div>
          <h2 className="mt-1 text-xl font-semibold">{licao.tema}</h2>
          <p className="mt-2 text-sm text-white/80">Versículo: {licao.versiculo}</p>
          <p className="mt-3 text-sm leading-6 text-white/90">{licao.resumo}</p>
          <Link to={`/licao?id=${catalogoLicao?.id ?? licao.id}`} className="mt-4 inline-block text-sm font-semibold text-gold">
            Ver lição completa →
          </Link>
        </section>
      ) : null}

      {meta ? (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Meta de frequência</h2>
          <p className="text-sm">
            Congregação: {freqEscola}% · Meta: {meta.frequencia}% · Progresso:{' '}
            <b>{progressoMeta(freqEscola, meta.frequencia)}%</b>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-page">
            <div className="h-full bg-teal" style={{ width: `${progressoMeta(freqEscola, meta.frequencia)}%` }} />
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Calendário — setembro</h2>
          <ul className="space-y-2 text-sm">
            {setembro.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <span className="w-[4.5rem] font-bold text-navy">{formatDateBR(ev.data)}</span>
                <span>
                  {ev.titulo} <span className="text-xs text-muted">({ROTULO_EVENTO[ev.tipo]})</span>
                </span>
              </li>
            ))}
          </ul>
          <Link to="/calendario" className="mt-3 inline-block text-xs font-semibold text-navy">
            Calendário completo →
          </Link>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Avisos</h2>
            <Link to="/avisos" className="text-xs font-semibold text-navy">
              Ver todos →
            </Link>
          </div>
          {avisos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum aviso no momento.</p>
          ) : (
            <ul className="space-y-3">
              {avisos.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <div className="font-medium">{a.titulo}</div>
                  <div className="text-sm text-muted">{a.texto}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Desafios</h2>
          <ul className="space-y-2 text-sm">
            {state.desafios.filter((d) => d.ativo).map((d) => (
              <li key={d.id}>
                <b>{d.titulo}.</b> {d.descricao}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Aniversários</h2>
          {nivers.length === 0 ? (
            <p className="text-sm text-muted">Nenhum aniversário próximo.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {nivers.map((n) => (
                <li key={n.pessoa.id}>
                  {n.pessoa.nome} · {n.quando.slice(3)}/{n.quando.slice(0, 2)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Atividades</h2>
          {quizzes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma miniavaliação aberta.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {quizzes.map((q) => {
                const resp = q.respostas.find((r) => r.pessoaId === pessoa?.id)
                const aula = state.licoes.find((l) => l.id === q.licaoId)
                return (
                  <li key={q.id}>
                    {aula ? <div className="text-xs font-semibold text-navy">{aula.tema}</div> : null}
                    {q.pergunta}
                    <div className="text-xs text-muted">{resp ? 'Respondida' : 'Pendente — abra Miniavaliação'}</div>
                  </li>
                )
              })}
            </ul>
          )}
          <Link to="/portal/avaliacao" className="mt-2 inline-block text-xs font-semibold text-navy">
            Responder miniavaliação →
          </Link>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Certificados</h2>
            <Link to="/certificados" className="text-xs font-semibold text-navy">
              Abrir →
            </Link>
          </div>
          {certs.length === 0 ? (
            <p className="text-sm text-muted">Nenhum certificado ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {certs.map((c) => (
                <li key={c.id}>
                  {c.titulo} · {formatDateBR(c.data)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}
