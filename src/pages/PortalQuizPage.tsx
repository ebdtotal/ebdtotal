import { useMemo, useState } from 'react'
import { LicaoSelect } from '../components/LicaoSelect'
import { Field, PrimaryButton } from '../components/ui'
import { licaoDaData } from '../lib/acompanhamento'
import { useStore } from '../lib/store'
import { pontosAvaliacaoDe } from '../lib/types'
import { lastSunday, toISODate } from '../lib/utils'

export function PortalQuizPage() {
  const { state, usuario, responderAvaliacao } = useStore()
  const pessoaId = usuario?.pessoaId
  const daTurma = state.avaliacoes.filter((a) => a.turma === usuario?.turma)
  const licaoIds = [...new Set(daTurma.map((a) => a.licaoId))]
  const licoesQuiz = state.licoes.filter((l) => licaoIds.includes(l.id))
  const atual = licaoDaData(state.licoes, state.eventos, toISODate(lastSunday()))
  const [licaoId, setLicaoId] = useState(
    atual && licaoIds.includes(atual.id) ? atual.id : (licaoIds[0] ?? ''),
  )
  const quizzes = daTurma.filter((a) => a.licaoId === licaoId)
  const [escolhas, setEscolhas] = useState<Record<string, number>>({})
  const [enviando, setEnviando] = useState(false)

  const pendentes = useMemo(
    () => quizzes.filter((q) => !q.respostas.some((r) => r.pessoaId === pessoaId)),
    [quizzes, pessoaId],
  )
  const prontas = pendentes.filter((q) => escolhas[q.id] !== undefined)
  const pontosLicao = pessoaId ? pontosAvaliacaoDe(state.avaliacoes, pessoaId, licaoId) : 0
  const pontosGeral = pessoaId ? pontosAvaliacaoDe(state.avaliacoes, pessoaId) : 0
  const licao = state.licoes.find((l) => l.id === licaoId)

  function enviar() {
    if (!pessoaId || prontas.length === 0) return
    setEnviando(true)
    for (const q of prontas) {
      const alt = escolhas[q.id]
      if (alt === undefined) continue
      responderAvaliacao(q.id, pessoaId, alt)
    }
    setEscolhas({})
    setEnviando(false)
  }

  if (!pessoaId) return <p className="text-sm text-muted">Cadastro de aluno não vinculado.</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Atividades</h1>
      <p className="mb-5 text-sm text-muted">Escolha a lição. Só as perguntas dessa aula aparecem. Cada acerto vale 1 ponto nela.</p>

      {licoesQuiz.length > 0 ? (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <Field label="Lição">
            <LicaoSelect value={licaoId} onChange={setLicaoId} licoes={licoesQuiz} eventos={state.eventos} />
          </Field>
          {licao ? (
            <p className="mt-2 text-sm text-navy">
              {licao.trimestre}º tri · Lição {licao.numero} — {licao.tema}
            </p>
          ) : null}
        </section>
      ) : null}

      {pontosLicao > 0 || pontosGeral > 0 ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Nesta lição: <b>{pontosLicao}</b> {pontosLicao === 1 ? 'ponto' : 'pontos'}
          {pontosGeral !== pontosLicao ? ` · total geral ${pontosGeral}` : null}
        </p>
      ) : null}

      {quizzes.map((q) => {
        const resp = q.respostas.find((r) => r.pessoaId === pessoaId)
        const marcada = resp ? resp.alternativa : escolhas[q.id]
        const acertou = resp ? resp.alternativa === q.correta : false
        return (
          <section key={q.id} className="mb-4 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{q.pergunta}</h2>
            <ul className="mt-3 space-y-2">
              {q.alternativas.map((alt, i) => (
                <li key={`${q.id}-${i}`}>
                  <button
                    type="button"
                    disabled={!!resp}
                    onClick={() => setEscolhas((prev) => ({ ...prev, [q.id]: i }))}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      marcada === i ? 'border-navy bg-navy/5 font-semibold' : 'border-line hover:bg-page'
                    }`}
                  >
                    ○ {alt}
                  </button>
                </li>
              ))}
            </ul>
            {resp ? (
              <p className={`mt-3 text-sm ${acertou ? 'text-emerald-700' : 'text-muted'}`}>
                {acertou ? 'Resposta enviada · +1 ponto nesta lição' : 'Resposta enviada. O professor vê quem acertou e errou.'}
              </p>
            ) : null}
          </section>
        )
      })}
      {pendentes.length > 0 ? (
        <PrimaryButton className="w-full" disabled={prontas.length === 0 || enviando} onClick={enviar}>
          Enviar avaliação desta lição
        </PrimaryButton>
      ) : null}
      {licoesQuiz.length === 0 ? <p className="text-sm text-muted">Nenhuma avaliação para a sua turma.</p> : null}
      {licaoId && quizzes.length === 0 ? <p className="text-sm text-muted">Nenhuma pergunta nesta lição.</p> : null}
    </div>
  )
}
