import { Link } from 'react-router-dom'
import { licaoDaData } from '../lib/acompanhamento'
import { ATALHOS, ROTULO_PERFIL, perfilDe } from '../lib/perfis'
import { useStore } from '../lib/store'
import { lastSunday, toISODate } from '../lib/utils'

export function InicioPage() {
  const { usuario, escolasVisiveis, state } = useStore()
  const perfil = perfilDe(usuario?.papel)
  if (perfil === 'aluno') return null
  const atalhos = ATALHOS[perfil]
  const escola = escolasVisiveis[0]
  const avisos = [...(state.avisos ?? [])]
    .filter((a) => !a.escolaId || a.escolaId === usuario?.escolaId)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        App {ROTULO_PERFIL[perfil]}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Olá, {usuario?.nome.split(' ')[0]}</h1>
      <p className="mb-5 text-sm text-muted">
        {usuario?.turma ? `Turma ${usuario.turma}` : escola?.nome ?? 'EDB Total'}
        {perfil === 'professor' ? ' · chamada da sua turma e preparação da aula' : null}
        {perfil === 'secretario' ? ' · lançamentos da congregação' : null}
        {perfil === 'superintendente' ? ' · chamada das classes, professores e metas da EBD' : null}
      </p>

      {perfil === 'professor' ? <LicaoDaSemana /> : null}

      {avisos.length > 0 ? (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Avisos</h2>
            <Link to="/avisos" className="text-xs font-semibold text-navy">
              Ver todos →
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {avisos.map((a) => (
              <li key={a.id}>
                <b>{a.titulo}.</b> {a.texto}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {atalhos.map((a) => (
          <Link
            key={`${a.to}${a.search ?? ''}`}
            to={{ pathname: a.to, search: a.search }}
            className="rounded-2xl border-2 border-gold bg-white p-4 shadow-md"
          >
            <div className="font-semibold text-navy">{a.label}</div>
            <div className="mt-1 text-sm text-navy/70">{a.texto}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function LicaoDaSemana() {
  const { state, usuario } = useStore()
  const licao = licaoDaData(state.licoes, state.eventos, toISODate(lastSunday()), {
    turma: usuario?.turma,
    escolaId: usuario?.escolaId,
  })
  if (!licao) return null
  return (
    <Link to={`/licao?id=${licao.id}`} className="mb-5 block rounded-xl border-2 border-gold bg-white p-5 shadow-md">
      <div className="text-xs font-semibold uppercase tracking-wide text-navy">Lição desta semana</div>
      <div className="mt-1 text-lg font-semibold text-navy">{licao.tema}</div>
      <div className="mt-1 text-sm text-navy/70">{licao.textoBiblico}</div>
    </Link>
  )
}
