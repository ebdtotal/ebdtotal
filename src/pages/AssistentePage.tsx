import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Field, PrimaryButton, inputClass } from '../components/ui'
import { LicaoSelect } from '../components/LicaoSelect'
import { assistentePedagogico } from '../lib/assistente'
import { useStore } from '../lib/store'
import { licaoDaData } from '../lib/acompanhamento'
import { domingoDaAula, toISODate } from '../lib/utils'

const SUGESTOES = [
  'Prepare uma dinâmica para adolescentes baseada na lição desta semana.',
  'Crie 10 perguntas para revisão.',
  'Explique esse conceito para crianças de 8 anos.',
  'Crie uma atividade de 15 minutos para minha turma.',
  'Monte um plano de aula completo.',
]

export function AssistentePage() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const hoje = toISODate(domingoDaAula())
  const inicial = params.get('licao') || licaoDaData(state.licoes, state.eventos, hoje)?.id || state.licoes[0]?.id
  const [licaoId, setLicaoId] = useState(inicial ?? '')
  const [faixa, setFaixa] = useState('Adolescentes')
  const [pedido, setPedido] = useState(SUGESTOES[0]!)
  const [saida, setSaida] = useState('')
  const licao = state.licoes.find((l) => l.id === licaoId)

  function gerar() {
    if (!licao) return
    setSaida(assistentePedagogico(pedido, licao, faixa))
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
        <Sparkles className="text-gold" size={22} /> Assistente pedagógico
      </h1>
      <p className="mb-5 text-sm text-muted">
        Ajuda o professor voluntário a preparar a aula a partir da lição — sem precisar de internet
      </p>

      <section className="mb-5 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
        <Field label="Lição">
          <LicaoSelect value={licaoId} onChange={setLicaoId} licoes={state.licoes} eventos={state.eventos} />
        </Field>
        <Field label="Faixa da turma">
          <input className={inputClass} value={faixa} onChange={(e) => setFaixa(e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Pedido">
            <textarea className={inputClass} rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPedido(s)}
              className="rounded-full bg-page px-3 py-1 text-xs font-medium text-navy hover:bg-navy hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={gerar}>Gerar material</PrimaryButton>
      </section>

      {saida ? (
        <pre className="whitespace-pre-wrap rounded-xl bg-white p-5 text-sm leading-6 shadow-sm">{saida}</pre>
      ) : (
        <p className="text-sm text-muted">Escolha um pedido e gere o material da aula.</p>
      )}
    </div>
  )
}
