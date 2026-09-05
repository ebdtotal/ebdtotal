import { Cake, GraduationCap, MessageCircle, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Confirmacao } from '../components/ui'
import { alertasMudancaFaixa } from '../lib/faixa'
import { perfilDe } from '../lib/perfis'
import { useStore } from '../lib/store'
import {
  aniversariantes,
  ausentesRecentes,
  chaveAlertaAniversario,
  chaveAlertaAusente,
  chaveAlertaFaixa,
  nomeEscola,
  semAlertasExcluidos,
} from '../lib/stats'
import { formatDateBR, whatsappUrl } from '../lib/utils'

export function AlertasPage() {
  const { state, escolasVisiveis, pessoasVisiveis, usuario, excluirAlerta } = useStore()
  const perfil = perfilDe(usuario?.papel)
  const podeExcluir = perfil === 'superintendente'
  const [pendente, setPendente] = useState<{ chave: string; nome: string } | null>(null)
  const ids = useMemo(() => new Set(escolasVisiveis.map((e) => e.id)), [escolasVisiveis])
  const excluidos = state.alertasExcluidos
  const ausentes = semAlertasExcluidos(
    ausentesRecentes(state, ids),
    (l) => chaveAlertaAusente(l.pessoa.id),
    excluidos,
  )
  const nivers = semAlertasExcluidos(
    aniversariantes(pessoasVisiveis, 7),
    (n) => chaveAlertaAniversario(n.pessoa.id, n.quando),
    excluidos,
  )
  const faixas =
    perfil === 'professor' || perfil === 'superintendente'
      ? semAlertasExcluidos(
          alertasMudancaFaixa(pessoasVisiveis, state.turmas ?? []),
          (a) => chaveAlertaFaixa(a.pessoa.id, a.faixaNova),
          excluidos,
        )
      : []

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Alertas</h1>
      <p className="mb-5 text-sm text-muted">Ausentes, aniversariantes e mudança de faixa etária</p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {faixas.length > 0 || perfil === 'professor' || perfil === 'superintendente' ? (
          <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <GraduationCap size={18} className="text-navy" /> Mudança de faixa etária
            </h2>
            {faixas.length === 0 ? (
              <p className="text-sm text-muted">Nenhum aluno precisa migrar de faixa no próximo trimestre.</p>
            ) : (
              <ul className="space-y-2">
                {faixas.map((a) => (
                  <li key={a.pessoa.id} className="flex items-start justify-between gap-3 rounded-md border-l-4 border-navy bg-slate-50 px-3 py-2">
                    <div>
                      <div className="font-medium">
                        <Link to={`/alunos/${a.pessoa.id}`} className="hover:underline">
                          {a.pessoa.nome}
                        </Link>
                      </div>
                      <div className="text-sm text-ink">
                        {a.idade} anos · no próximo trimestre deverá migrar de {a.faixaAtual} para {a.faixaNova}.
                      </div>
                      <div className="text-xs text-muted">
                        {a.pessoa.turma} · {nomeEscola(state.escolas, a.pessoa.escolaId)}
                      </div>
                    </div>
                    {podeExcluir ? (
                      <BotaoExcluirAlerta
                        onClick={() =>
                          setPendente({ chave: chaveAlertaFaixa(a.pessoa.id, a.faixaNova), nome: a.pessoa.nome })
                        }
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <UserX size={18} className="text-amber-600" /> Alunos ausentes
          </h2>
          {ausentes.length === 0 ? (
            <p className="text-sm text-muted">Nenhum alerta de falta no momento.</p>
          ) : (
            <ul className="space-y-2">
              {ausentes.map((l) => (
                <li key={l.pessoa.id} className="flex items-center justify-between gap-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                  <div>
                    <div className="font-medium">
                      <Link to={`/alunos/${l.pessoa.id}`} className="hover:underline">
                        {l.pessoa.nome}
                      </Link>
                    </div>
                    <div className="text-xs text-muted">
                      {l.pessoa.turma} · {nomeEscola(state.escolas, l.pessoa.escolaId)} · {l.faltas} faltas
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {l.pessoa.telefone ? (
                      <a
                        className="text-emerald-600"
                        href={whatsappUrl(l.pessoa.telefone, `Olá! Notamos a ausência de ${l.pessoa.nome} na EBD. Podemos ajudar?`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={18} />
                      </a>
                    ) : null}
                    {podeExcluir ? (
                      <BotaoExcluirAlerta
                        onClick={() => setPendente({ chave: chaveAlertaAusente(l.pessoa.id), nome: l.pessoa.nome })}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Cake size={18} className="text-pink-500" /> Aniversariantes (7 dias)
          </h2>
          {nivers.length === 0 ? (
            <p className="text-sm text-muted">Nenhum aniversário nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-2">
              {nivers.map((n) => (
                <li key={n.pessoa.id} className="flex items-center justify-between gap-3 rounded-md border-l-4 border-pink-400 bg-pink-50 px-3 py-2">
                  <div>
                    <div className="font-medium">{n.pessoa.nome}</div>
                    <div className="text-xs text-muted">
                      {n.pessoa.turma} · {n.idade ?? '—'} anos
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-pink-700">
                      {formatDateBR(`2026-${n.quando}`).slice(0, 5)}
                    </span>
                    {podeExcluir ? (
                      <BotaoExcluirAlerta
                        onClick={() =>
                          setPendente({
                            chave: chaveAlertaAniversario(n.pessoa.id, n.quando),
                            nome: n.pessoa.nome,
                          })
                        }
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Confirmacao
        open={!!pendente}
        titulo="Excluir alerta"
        texto={
          pendente
            ? `O alerta de ${pendente.nome} deixa de aparecer para todos. Continuar?`
            : ''
        }
        onCancel={() => setPendente(null)}
        onConfirm={() => {
          if (pendente) excluirAlerta(pendente.chave)
          setPendente(null)
        }}
      />
    </div>
  )
}

function BotaoExcluirAlerta({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 text-xs font-semibold text-red-700 hover:underline"
      onClick={onClick}
    >
      Excluir
    </button>
  )
}
