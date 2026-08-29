import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DateInput, Field, GhostButton, Modal, PrimaryButton, Confirmacao, inputClass } from '../components/ui'
import { catalogoDaData, catalogoDeLicao, copiarLicaoParaTurma, ehLicaoGeral, licaoDaTurma, licoesCatalogo } from '../lib/acompanhamento'
import { nomeAulaPadrao, trimestreDe } from '../lib/pedagogia'
import { useStore } from '../lib/store'
import type { Licao } from '../lib/types'
import { domingoDaAula, formatDateBR, parseISODate, toISODate, uid } from '../lib/utils'

function licaoEmBranco(partial: Pick<Licao, 'id' | 'ano' | 'trimestre' | 'numero' | 'tema'> & Partial<Licao>): Licao {
  return {
    textoBiblico: '',
    versiculo: '',
    objetivos: [],
    resumo: '',
    perguntas: [],
    dinamica: '',
    aplicacao: '',
    atividade: '',
    complementar: '',
    ...partial,
  }
}

export function LicaoPage() {
  const { state, usuario, ehProfessor, ehAluno, podeEditarLicoes, podeEditarConteudoLicao, escolasVisiveis, saveLicao, removeLicao } =
    useStore()
  const [params, setParams] = useSearchParams()
  const hoje = toISODate(domingoDaAula())
  const turmasDaIgreja = useMemo(() => {
    const ids = new Set(escolasVisiveis.map((e) => e.id))
    return (state.turmas ?? []).filter((t) => ids.has(t.escolaId)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [state.turmas, escolasVisiveis])
  const turmaUsuario =
    usuario?.turma ||
    state.pessoas.find((p) => p.id === usuario?.pessoaId)?.turma ||
    ''
  const [escolaSel, setEscolaSel] = useState(usuario?.escolaId ?? escolasVisiveis[0]?.id ?? '')
  const [turmaSel, setTurmaSel] = useState(ehProfessor || ehAluno ? turmaUsuario : '')
  const catalogo = useMemo(() => licoesCatalogo(state.licoes), [state.licoes])
  const daSemana = catalogoDaData(state.licoes, state.eventos, hoje)
  const idParam = params.get('id')
  const licaoCatalogo = useMemo(() => {
    if (idParam) {
      const direta = catalogo.find((l) => l.id === idParam)
      if (direta) return direta
      const apontada = state.licoes.find((l) => l.id === idParam)
      if (apontada) return catalogoDeLicao(state.licoes, apontada)
    }
    return daSemana ?? catalogo[0]
  }, [idParam, catalogo, state.licoes, daSemana])
  const licao = licaoCatalogo
    ? licaoDaTurma(state.licoes, licaoCatalogo, turmaSel || undefined, escolaSel || undefined)
    : undefined
  const evento = state.eventos.find((e) => e.licaoId === licaoCatalogo?.id)
  const [editando, setEditando] = useState<Licao | null>(null)
  const [excluirLicao, setExcluirLicao] = useState(false)
  const [dataAula, setDataAula] = useState(hoje)
  const anos = useMemo(() => [...new Set(catalogo.map((l) => l.ano))].sort((a, b) => b - a), [catalogo])
  const [ano, setAno] = useState(licaoCatalogo?.ano ?? anos[0] ?? 2026)
  const [tri, setTri] = useState(licaoCatalogo?.trimestre ?? trimestreDe(domingoDaAula()))
  const lista = catalogo.filter((l) => l.ano === ano && l.trimestre === tri)
  const turmaCadastro = turmasDaIgreja.find((t) => t.nome === turmaSel && (!escolaSel || t.escolaId === escolaSel))
  const ehVariante = !!licao && !ehLicaoGeral(licao)

  useEffect(() => {
    if (ehProfessor || ehAluno) setTurmaSel(turmaUsuario)
  }, [ehProfessor, ehAluno, turmaUsuario])

  useEffect(() => {
    if (!licaoCatalogo) return
    setAno(licaoCatalogo.ano)
    setTri(licaoCatalogo.trimestre)
  }, [licaoCatalogo?.id, licaoCatalogo?.ano, licaoCatalogo?.trimestre])

  const turmasDaEscolaSel = turmasDaIgreja.filter((t) => !escolaSel || t.escolaId === escolaSel)

  function abrirEdicao(base: Licao) {
    setDataAula(evento?.data ?? hoje)
    if (!turmaSel) {
      setEditando(base)
      return
    }
    if (!ehLicaoGeral(base)) {
      setEditando(base)
      return
    }
    setEditando(copiarLicaoParaTurma(licaoCatalogo ?? base, turmaSel, escolaSel || undefined, turmaCadastro?.faixaEtaria))
  }

  if (!licaoCatalogo || !licao) {
    return (
      <div>
        <p className="text-sm text-muted">Nenhuma aula cadastrada.</p>
        {podeEditarLicoes ? (
          <PrimaryButton
            className="mt-3"
            onClick={() => {
              const d = domingoDaAula()
              setDataAula(toISODate(d))
              setEditando(
                licaoEmBranco({
                  id: uid('lic'),
                  ano: d.getFullYear(),
                  trimestre: trimestreDe(d),
                  numero: 1,
                  tema: nomeAulaPadrao(trimestreDe(d), 1),
                }),
              )
            }}
          >
            Cadastrar aula
          </PrimaryButton>
        ) : null}
        <LicaoModal
          licao={editando}
          data={dataAula}
          onData={setDataAula}
          onClose={() => setEditando(null)}
          onSave={(l, data) => {
            saveLicao(l, data)
            setEditando(null)
            setAno(l.ano)
            setTri(l.trimestre)
            if (ehLicaoGeral(l)) setParams({ id: l.id })
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{licao.tema}</h1>
          <p className="text-sm text-muted">
            {licao.trimestre}º trimestre {licao.ano}
            {evento ? ` · ${formatDateBR(evento.data)}` : ''}
            {turmaSel ? ` · turma ${turmaSel}` : ' · modelo geral'}
            {ehProfessor
              ? ' · você edita o conteúdo da sua turma'
              : podeEditarLicoes
                ? ' · escolha a turma para o conteúdo de cada classe'
                : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeEditarConteudoLicao && (ehProfessor ? !!turmaSel : true) ? (
            <GhostButton onClick={() => abrirEdicao(licao)}>Editar conteúdo</GhostButton>
          ) : null}
          {podeEditarLicoes && ehLicaoGeral(licao) ? (
            <GhostButton onClick={() => setExcluirLicao(true)}>
              Excluir
            </GhostButton>
          ) : null}
          {podeEditarLicoes ? (
            <PrimaryButton
              onClick={() => {
                const d = parseISODate(hoje)
                const trimestre = trimestreDe(d)
                const numero =
                  catalogo
                    .filter((l) => l.ano === d.getFullYear() && l.trimestre === trimestre)
                    .reduce((m, l) => Math.max(m, l.numero), 0) + 1
                setDataAula(hoje)
                setEditando(
                  licaoEmBranco({
                    id: uid('lic'),
                    ano: d.getFullYear(),
                    trimestre,
                    numero,
                    tema: nomeAulaPadrao(trimestre, numero),
                  }),
                )
              }}
            >
              Nova aula
            </PrimaryButton>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {podeEditarLicoes || ehProfessor ? (
          <>
            {escolasVisiveis.length > 1 && !ehProfessor ? (
              <Field label="Congregação">
                <select
                  className={inputClass}
                  value={escolaSel}
                  onChange={(e) => {
                    setEscolaSel(e.target.value)
                    setTurmaSel('')
                  }}
                >
                  {escolasVisiveis.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Turma">
              {ehProfessor ? (
                <input className={inputClass} value={turmaSel || 'Sem turma vinculada'} readOnly />
              ) : (
                <select className={inputClass} value={turmaSel} onChange={(e) => setTurmaSel(e.target.value)}>
                  <option value="">Modelo geral (todas as turmas)</option>
                  {turmasDaEscolaSel.map((t) => (
                    <option key={t.id} value={t.nome}>
                      {t.nome}
                      {t.faixaEtaria ? ` · ${t.faixaEtaria}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </>
        ) : null}
        <Field label="Ano">
          <select
            className={inputClass}
            value={ano}
            onChange={(e) => {
              const y = Number(e.target.value)
              setAno(y)
              const primeira = catalogo.find((l) => l.ano === y && l.trimestre === tri) ?? catalogo.find((l) => l.ano === y)
              if (primeira) {
                setTri(primeira.trimestre)
                setParams({ id: primeira.id })
              }
            }}
          >
            {anos.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trimestre">
          <select
            className={inputClass}
            value={tri}
            onChange={(e) => {
              const t = Number(e.target.value)
              setTri(t)
              const primeira = catalogo.find((l) => l.ano === ano && l.trimestre === t)
              if (primeira) setParams({ id: primeira.id })
            }}
          >
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>
                {t}º tri
              </option>
            ))}
          </select>
        </Field>
        <Field label="Aula">
          <select className={inputClass} value={licaoCatalogo.id} onChange={(e) => setParams({ id: e.target.value })}>
            {lista.map((l) => {
              const ev = state.eventos.find((e) => e.licaoId === l.id)
              return (
                <option key={l.id} value={l.id}>
                  {l.tema}
                  {ev ? ` · ${formatDateBR(ev.data)}` : ''}
                </option>
              )
            })}
          </select>
        </Field>
      </div>

        {ehProfessor && !turmaSel ? (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Seu usuário ainda não tem turma vinculada. Peça ao superintendente para informar a classe no cadastro do professor.
          </p>
        ) : null}
        {turmaSel && !ehVariante ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A turma {turmaSel} ainda usa o modelo geral. Edite o conteúdo para gravar a lição desta faixa etária.
        </p>
      ) : null}
      {ehVariante ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Conteúdo próprio da turma {licao.turma}
          {licao.faixaEtaria ? ` ({licao.faixaEtaria})` : ''}. Os alunos desta classe veem esta versão.
        </p>
      ) : null}

      <section className="mb-5 rounded-xl bg-navy p-5 text-white shadow-sm">
        <div className="text-xs uppercase tracking-wide text-gold">Tema da aula</div>
        <h2 className="mt-1 text-2xl font-semibold">{licao.tema}</h2>
        {licao.textoBiblico || licao.versiculo ? (
          <p className="mt-2 text-sm text-white/80">
            {licao.textoBiblico ? (
              <>
                Texto bíblico: <b>{licao.textoBiblico}</b>
              </>
            ) : null}
            {licao.versiculo ? ` · Versículo: ${licao.versiculo}` : ''}
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/70">Conteúdo ainda não preenchido — o nome da aula já está no calendário.</p>
        )}
        {licao.objetivos.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/90">
            {licao.objetivos.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {licao.resumo ? <Bloco titulo="Resumo" texto={licao.resumo} /> : null}
        {licao.textoBiblico ? <Bloco titulo="Texto bíblico" texto={licao.textoBiblico} /> : null}
        {licao.perguntas.length ? <Bloco titulo="Perguntas" lista={licao.perguntas} /> : null}
        {licao.dinamica ? <Bloco titulo="Dinâmica" texto={licao.dinamica} /> : null}
        {licao.aplicacao ? <Bloco titulo="Aplicação" texto={licao.aplicacao} /> : null}
        {licao.atividade ? <Bloco titulo="Atividade" texto={licao.atividade} /> : null}
        {licao.complementar ? <Bloco titulo="Material complementar" texto={licao.complementar} /> : null}
      </div>

      <LicaoModal
        licao={editando}
        data={dataAula}
        turmaFixa={editando?.turma}
        onData={setDataAula}
        onClose={() => setEditando(null)}
        onSave={(l, data) => {
          saveLicao(
            {
              ...l,
              escolaId: l.turma ? l.escolaId || escolaSel || undefined : undefined,
              faixaEtaria: l.turma ? l.faixaEtaria || turmaCadastro?.faixaEtaria : undefined,
            },
            data,
          )
          setEditando(null)
          setAno(l.ano)
          setTri(l.trimestre)
          if (ehLicaoGeral(l)) setParams({ id: l.id })
        }}
      />
      <Confirmacao
        open={excluirLicao}
        titulo="Excluir aula"
        texto="Excluir esta aula do calendário? Professores e alunos deixam de vê-la."
        onCancel={() => setExcluirLicao(false)}
        onConfirm={() => {
          if (licaoCatalogo) {
            removeLicao(licaoCatalogo.id)
            setParams({})
          }
          setExcluirLicao(false)
        }}
      />
    </div>
  )
}

function LicaoModal({
  licao,
  data,
  turmaFixa,
  onData,
  onClose,
  onSave,
}: {
  licao: Licao | null
  data: string
  turmaFixa?: string
  onData: (iso: string) => void
  onClose: () => void
  onSave: (l: Licao, data: string) => void
}) {
  const [form, setForm] = useState<Licao | null>(licao)
  if (licao && form?.id !== licao.id) setForm(licao)

  return (
    <Modal open={!!licao} title={form?.tema ? `Editar ${form.tema}` : 'Aula'} onClose={onClose} wide>
      {form ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const variante = !!(form.turma || turmaFixa)
            const d = parseISODate(data)
            const trimestre = trimestreDe(d)
            onSave(
              {
                ...form,
                ...(variante
                  ? {}
                  : {
                      ano: d.getFullYear(),
                      trimestre,
                    }),
                tema: form.tema.trim() || nomeAulaPadrao(variante ? form.trimestre : trimestre, form.numero),
                objetivos: form.objetivos.map((o) => o.trim()).filter(Boolean),
                perguntas: form.perguntas.map((p) => p.trim()).filter(Boolean),
                turma: form.turma || turmaFixa || undefined,
              },
              data,
            )
          }}
        >
          {form.turma || turmaFixa ? (
            <p className="rounded-lg bg-page px-3 py-2 text-sm text-muted">
              Conteúdo da turma <b className="text-ink">{form.turma || turmaFixa}</b>. Os alunos desta classe veem esta
              versão.
            </p>
          ) : (
            <p className="rounded-lg bg-page px-3 py-2 text-sm text-muted">
              Modelo geral. Use o seletor de turma na página para criar o conteúdo de cada classe.
            </p>
          )}
          <Field label="Nome da aula">
            <input className={inputClass} required value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} />
          </Field>
          {form.turma || turmaFixa ? null : (
            <Field label="Domingo da aula">
              <DateInput value={data} onChange={onData} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            {form.turma || turmaFixa ? null : (
              <Field label="Número da aula no trimestre">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: Number(e.target.value) || 1 })}
                />
              </Field>
            )}
            <Field label="Texto bíblico">
              <input className={inputClass} value={form.textoBiblico} onChange={(e) => setForm({ ...form, textoBiblico: e.target.value })} />
            </Field>
          </div>
          <Field label="Versículo">
            <input className={inputClass} value={form.versiculo} onChange={(e) => setForm({ ...form, versiculo: e.target.value })} />
          </Field>
          <Field label="Resumo">
            <textarea className={inputClass} rows={3} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
          </Field>
          <Field label="Objetivos (um por linha)">
            <textarea
              className={inputClass}
              rows={3}
              value={form.objetivos.join('\n')}
              onChange={(e) => setForm({ ...form, objetivos: e.target.value.split('\n') })}
            />
          </Field>
          <Field label="Perguntas (uma por linha)">
            <textarea
              className={inputClass}
              rows={3}
              value={form.perguntas.join('\n')}
              onChange={(e) => setForm({ ...form, perguntas: e.target.value.split('\n') })}
            />
          </Field>
          <Field label="Dinâmica">
            <textarea className={inputClass} rows={2} value={form.dinamica} onChange={(e) => setForm({ ...form, dinamica: e.target.value })} />
          </Field>
          <Field label="Aplicação">
            <textarea className={inputClass} rows={2} value={form.aplicacao} onChange={(e) => setForm({ ...form, aplicacao: e.target.value })} />
          </Field>
          <Field label="Atividade">
            <textarea className={inputClass} rows={2} value={form.atividade} onChange={(e) => setForm({ ...form, atividade: e.target.value })} />
          </Field>
          <Field label="Material complementar">
            <textarea className={inputClass} rows={2} value={form.complementar} onChange={(e) => setForm({ ...form, complementar: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar aula</PrimaryButton>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}

function Bloco({ titulo, texto, lista }: { titulo: string; texto?: string; lista?: string[] }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold uppercase text-muted">{titulo}</h3>
      {lista ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {lista.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      ) : (
        <p className="text-sm leading-6">{texto}</p>
      )}
    </section>
  )
}
