import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AulaDateSelect } from '../components/AulaDateSelect'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import { exportToExcel } from '../lib/excel'
import { useStore } from '../lib/store'
import { relatorioPorAula, turmasDaEscola } from '../lib/stats'
import { pontosDe } from '../lib/types'
import { formatDateBR, lastSunday, pct, toISODate } from '../lib/utils'

export function RelatorioAulaPage() {
  const { state, escolasVisiveis, pessoasVisiveis, usuario, ehProfessor, podeVerTudo } = useStore()
  const [data, setData] = useState(toISODate(lastSunday()))
  const [escolaId, setEscolaId] = useState(escolasVisiveis[0]?.id ?? '')
  const turmas = turmasDaEscola(state.pessoas.filter((p) => p.escolaId === escolaId), escolaId)
  const [turma, setTurma] = useState(usuario?.turma || turmas[0] || '')
  const turmaAtual = ehProfessor && usuario?.turma ? usuario.turma : turma
  const aula = useMemo(
    () => relatorioPorAula(state, escolaId, data, turmaAtual, pessoasVisiveis),
    [state, escolaId, data, turmaAtual, pessoasVisiveis],
  )

  function exportar() {
    exportToExcel(`aula-${turmaAtual}-${data}`, aula.rows.map((r) => ({
      Nome: r.pessoa.nome,
      Turma: r.pessoa.turma,
      Presente: r.chamada?.presente ? 'Sim' : 'Não',
      Biblia: r.chamada?.biblia ? 'Sim' : 'Não',
      Revista: r.chamada?.revista ? 'Sim' : 'Não',
      Oferta: r.chamada?.ofertou ? 'Sim' : 'Não',
      Participacao: r.chamada ? String(r.chamada.pontosParticipacao ?? (r.chamada.participacao ? 1 : 0)) : '0',
      Pontos: r.chamada ? pontosDe(r.chamada) : 0,
    })))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Relatório por aula</h1>
      <p className="mb-5 text-sm text-muted">Resultado instantâneo da turma na data escolhida</p>
      <section className="mb-5 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-3">
        <Field label="Data">
          <AulaDateSelect value={data} onChange={setData} eventos={state.eventos} licoes={state.licoes} />
        </Field>
        <Field label="Escola">
          <select className={inputClass} value={escolaId} disabled={!podeVerTudo} onChange={(e) => setEscolaId(e.target.value)}>
            {escolasVisiveis.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Field>
        <Field label="Turma">
          <select className={inputClass} value={turmaAtual} disabled={ehProfessor} onChange={(e) => setTurma(e.target.value)}>
            {turmas.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </section>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Presentes', `${aula.presentes}/${aula.matriculados}`],
          ['Ausentes', String(aula.ausentes)],
          ['Bíblias', String(aula.biblias)],
          ['Ofertaram', String(aula.ofertaram)],
          ['Pontos', String(aula.pontos)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-muted">{l}</div>
            <div className="mt-1 text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{turmaAtual} · {formatDateBR(data)} · {pct(aula.presentes, aula.matriculados)}%</h2>
          <PrimaryButton onClick={exportar}><Download size={16} /> Excel</PrimaryButton>
        </div>
        <div className="table-wrap">
          <table className="data w-full text-left">
            <thead>
              <tr>
                {['Nome', 'Presente', 'Bíblia', 'Revista', 'Oferta', 'Participação', 'Pts'].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aula.rows.map((r) => (
                <tr key={r.pessoa.id}>
                  <td className="px-3 py-3 font-medium">{r.pessoa.nome}</td>
                  <td className="px-3 py-3">{r.chamada?.presente ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-3">{r.chamada?.biblia ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-3">{r.chamada?.revista ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-3">{r.chamada?.ofertou ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-3">{r.chamada ? (r.chamada.pontosParticipacao ?? (r.chamada.participacao ? 1 : 0)) : 0}</td>
                  <td className="px-3 py-3">{r.chamada ? pontosDe(r.chamada) : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
