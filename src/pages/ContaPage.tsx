import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, GhostButton, PrimaryButton, inputClass } from '../components/ui'
import { useStore } from '../lib/store'
import { WHATSAPP_SUPORTE, whatsappUrl } from '../lib/utils'

export function ContaPage() {
  const { usuario, alterarSenha } = useStore()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Minha conta</h1>
      <p className="mt-1 text-sm text-muted">
        {usuario?.nome} · @{usuario?.username}
      </p>

      <section className="mt-5 max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Alterar senha</h2>
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

      <section className="mt-5 max-w-md rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Excluir conta</h2>
        <p className="text-sm text-muted">
          Para apagar o acesso e os dados da igreja, envie o pedido pelo WhatsApp. Fazemos a exclusão em até 7 dias. Leia a{' '}
          <Link to="/privacidade" className="font-medium text-navy underline">
            política de privacidade
          </Link>
          .
        </p>
        <a
          className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
          href={whatsappUrl(
            WHATSAPP_SUPORTE,
            `Quero excluir minha conta no EDB Total. Usuário: ${usuario?.username ?? ''}. Nome: ${usuario?.nome ?? ''}.`,
          )}
          target="_blank"
          rel="noreferrer"
        >
          Pedir exclusão no WhatsApp
        </a>
      </section>
    </div>
  )
}
