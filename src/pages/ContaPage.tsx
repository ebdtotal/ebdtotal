import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'
import { apiExcluirConta, apiMigrarPlano, apiSalvarIgreja } from '../lib/api'
import {
  checkoutDo,
  formatarBRL,
  PLANOS,
  planoVencido,
  PRODUTOS,
  rotuloProduto,
  valorParcela,
} from '../lib/planos'
import { useStore } from '../lib/store'
import { formatDateBR, WHATSAPP_SUPORTE, whatsappUrl } from '../lib/utils'

export function ContaPage() {
  const { usuario, alterarSenha, igreja, setIgreja, logout } = useStore()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [excluirConfirma, setExcluirConfirma] = useState('')
  const [excluirErro, setExcluirErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const podeIgreja =
    usuario?.papel === 'sede' || (usuario?.papel === 'superintendente' && !usuario.escolaId)
  const podeExcluir = usuario?.papel !== 'admin'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Minha conta</h1>
      <p className="mt-1 text-sm text-muted">
        {usuario?.nome} · @{usuario?.username}
      </p>

      {igreja && usuario?.papel !== 'admin' ? (
        <DadosIgreja podeEditar={!!podeIgreja} igreja={igreja} onSalvo={setIgreja} />
      ) : null}

      {usuario?.papel === 'admin' ? (
        <section className="mt-5 max-w-xl rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Acesso master</h2>
          <p className="text-sm text-muted">
            Igrejas, contatos, vencimento e planos ficam no{' '}
            <Link to="/master" className="font-semibold text-navy hover:underline">
              painel administrativo
            </Link>
            . A senha abaixo é a do login itano.
          </p>
        </section>
      ) : null}

      <section className="mt-5 max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">
          {usuario?.papel === 'sede' || usuario?.papel === 'admin' ? 'Senha do acesso principal' : 'Alterar senha'}
        </h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setErro(null)
            setOk(false)
            if (nova !== confirma) {
              setErro('A confirmação não confere com a nova senha.')
              return
            }
            setEnviando(true)
            void alterarSenha(atual, nova).then((msg) => {
              setEnviando(false)
              if (msg) setErro(msg)
              else {
                setOk(true)
                setAtual('')
                setNova('')
                setConfirma('')
              }
            })
          }}
        >
          <Field label="Senha atual">
            <input className={inputClass} type="password" required value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="Nova senha">
            <input className={inputClass} type="password" required minLength={6} value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirmar nova senha">
            <input className={inputClass} type="password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
          </Field>
          {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
          {ok ? <p className="text-sm text-emerald-700">Senha atualizada.</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <GhostButton type="button" onClick={() => { setAtual(''); setNova(''); setConfirma(''); setErro(null); setOk(false) }}>
              Limpar
            </GhostButton>
            <PrimaryButton type="submit" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar senha'}
            </PrimaryButton>
          </div>
        </form>
      </section>

      {podeExcluir ? (
        <section className="mt-5 max-w-md rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-red-700">Excluir conta</h2>
          <p className="text-sm text-muted">
            A exclusão é feita neste aplicativo. Se você for o acesso principal da igreja, removemos o login e os dados
            da igreja. Digite <span className="font-semibold text-ink">EXCLUIR</span> para confirmar. Leia a{' '}
            <Link to="/privacidade" className="font-medium text-navy underline">
              política de privacidade
            </Link>
            .
          </p>
          <Field label="Confirmação">
            <input
              className={inputClass}
              value={excluirConfirma}
              onChange={(e) => setExcluirConfirma(e.target.value)}
              placeholder="Digite EXCLUIR"
              autoComplete="off"
            />
          </Field>
          {excluirErro ? <p className="mt-2 text-sm text-red-600">{excluirErro}</p> : null}
          <button
            type="button"
            disabled={excluindo || excluirConfirma.trim().toUpperCase() !== 'EXCLUIR'}
            className="mt-3 inline-flex rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => {
              setExcluirErro(null)
              setExcluindo(true)
              void apiExcluirConta(excluirConfirma)
                .then(() => {
                  logout()
                })
                .catch((err: Error) => {
                  setExcluindo(false)
                  setExcluirErro(err.message || 'Não foi possível excluir a conta.')
                })
            }}
          >
            {excluindo ? 'Excluindo…' : 'Excluir minha conta agora'}
          </button>
        </section>
      ) : null}
    </div>
  )
}

function DadosIgreja({
  podeEditar,
  igreja,
  onSalvo,
}: {
  podeEditar: boolean
  igreja: NonNullable<ReturnType<typeof useStore>['igreja']>
  onSalvo: (i: NonNullable<ReturnType<typeof useStore>['igreja']>) => void
}) {
  const produto = PRODUTOS[igreja.plano] ?? PRODUTOS.igreja
  const [form, setForm] = useState({
    nome: igreja.nome,
    cidade: igreja.cidade,
    responsavel: igreja.responsavel,
    email: igreja.email,
    telefone: igreja.telefone,
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pagamento, setPagamento] = useState<'avista' | 'parcelado'>('avista')
  const [migrando, setMigrando] = useState(false)
  const vencido = planoVencido(igreja.validoAte)
  const contratacao = formatDateBR((igreja.contratadoEm || '').slice(0, 10))
  const validade = formatDateBR((igreja.validoAte || '').slice(0, 10))
  const upgrade = checkoutDo('igreja', pagamento)

  return (
    <>
      <section className="mt-5 max-w-xl rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Plano</h2>
        <p className="text-sm text-muted">
          {rotuloProduto(igreja.plano)} · contratado em {contratacao} · válido até{' '}
          <span className={vencido ? 'font-semibold text-red-700' : ''}>{validade}</span>
        </p>
        <p className="mt-2 text-sm text-ink">
          Até {produto.pessoas} cadastros
          {produto.escolas >= 9999 ? ' · congregações ilimitadas' : ` · ${produto.escolas} congregação`}
        </p>
        <CadastrosDoPlano limite={produto.pessoas} />
        {vencido ? (
          <a
            className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
            href={whatsappUrl(
              WHATSAPP_SUPORTE,
              `Quero renovar o plano ${rotuloProduto(igreja.plano)} da igreja ${igreja.nome}. Venceu em ${validade}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Pedir renovação no WhatsApp
          </a>
        ) : null}
        {igreja.plano === 'essencial' && podeEditar ? (
          <div className="mt-4 rounded-lg border border-line p-4">
            <p className="text-sm font-semibold text-ink">Migrar para o plano Igreja</p>
            <p className="mt-1 text-xs text-muted">
              Libera filiais, financeiro, certificados, painel e formação. Após o pagamento, o vencimento passa a
              contar 12 meses a partir de hoje.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border p-3 text-left text-sm ${pagamento === 'avista' ? 'border-navy bg-navy text-white' : 'border-line'}`}
                onClick={() => setPagamento('avista')}
              >
                À vista {formatarBRL(PLANOS.igreja.preco)}
              </button>
              <button
                type="button"
                className={`rounded-xl border p-3 text-left text-sm ${pagamento === 'parcelado' ? 'border-navy bg-navy text-white' : 'border-line'}`}
                onClick={() => setPagamento('parcelado')}
              >
                12x {formatarBRL(valorParcela(upgrade))}
              </button>
            </div>
            <PrimaryButton
              className="mt-3"
              disabled={migrando}
              onClick={() => {
                setMigrando(true)
                void apiMigrarPlano(pagamento)
                  .then((r) => {
                    window.location.href = r.checkoutUrl
                  })
                  .catch((e: Error) => {
                    setErro(e.message)
                    setMigrando(false)
                  })
              }}
            >
              {migrando ? 'Abrindo pagamento…' : 'Pagar e migrar'}
            </PrimaryButton>
          </div>
        ) : null}
      </section>

      <section className="mt-5 max-w-xl rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Dados da igreja</h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!podeEditar) return
            setErro(null)
            setOk(false)
            setEnviando(true)
            void apiSalvarIgreja(form)
              .then((r) => {
                onSalvo(r.igreja)
                setOk(true)
              })
              .catch((e: Error) => setErro(e.message))
              .finally(() => setEnviando(false))
          }}
        >
          <Field label="Igreja">
            <input className={inputClass} required disabled={!podeEditar} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} disabled={!podeEditar} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Field>
          <Field label="Responsável">
            <input className={inputClass} required disabled={!podeEditar} value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} type="email" disabled={!podeEditar} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="WhatsApp">
              <input className={inputClass} disabled={!podeEditar} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Field>
          </div>
          {erro ? <p className="sm:col-span-2 text-sm text-red-600">{erro}</p> : null}
          {ok ? <p className="sm:col-span-2 text-sm text-emerald-700">Cadastro atualizado.</p> : null}
          {podeEditar ? (
            <div className="sm:col-span-2">
              <PrimaryButton type="submit" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Salvar dados'}
              </PrimaryButton>
            </div>
          ) : (
            <p className="sm:col-span-2 text-xs text-muted">Somente o superintendente da igreja altera estes dados.</p>
          )}
        </form>
      </section>
    </>
  )
}

function CadastrosDoPlano({ limite }: { limite: number }) {
  const { state } = useStore()
  const usados = state.pessoas.length
  const vagas = Math.max(0, limite - usados)
  const pct = limite > 0 ? Math.min(100, Math.round((usados / limite) * 100)) : 0
  return (
    <div className="mt-3 rounded-lg border border-line p-3">
      <p className="text-sm font-semibold text-ink">Cadastros do plano</p>
      <p className="mt-1 text-sm text-muted">
        {usados} de {limite} usados · {vagas} {vagas === 1 ? 'vaga restante' : 'vagas restantes'}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
        <div className={`h-full ${vagas === 0 ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : 'bg-navy'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
