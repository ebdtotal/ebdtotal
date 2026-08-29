import { MoreVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { Field, GhostButton, Modal, PrimaryButton, Confirmacao, inputClass } from '../components/ui'
import { ROTULO_PAPEL } from '../lib/perfis'
import { useStore } from '../lib/store'
import { PAPEIS, type Papel, type Usuario } from '../lib/types'
import { uid, senhaGerada } from '../lib/utils'

export function ConfiguracoesPage() {
  const {
    state,
    addSetor,
    renameSetor,
    removeSetor,
    addUsuarioAoSetor,
    removeUsuarioDoSetor,
    saveUsuario,
    resetDemo,
    escolasVisiveis,
    podeVerTudo,
    setWhatsapp,
  } = useStore()
  const [menuSetor, setMenuSetor] = useState<string | null>(null)
  const [menuUser, setMenuUser] = useState<string | null>(null)
  const [novoSetor, setNovoSetor] = useState(false)
  const [excluirSetorId, setExcluirSetorId] = useState<string | null>(null)
  const [nomeSetor, setNomeSetor] = useState('')
  const [addUserSetor, setAddUserSetor] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<Usuario | null>(null)

  if (!podeVerTudo) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted">Somente usuários da sede gerenciam setores e acessos.</p>
        <a
          className="mt-4 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
          href={`https://wa.me/${state.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
        >
          Falar no WhatsApp
        </a>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-semibold text-ink">Configurações</h1>
      <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Suporte via WhatsApp</h2>
        <Field label="Número com DDI (ex.: 5598981258852)">
          <input className={inputClass} value={state.whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </Field>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Setores e acessos</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy shadow-md"
            onClick={() => {
              setNomeSetor('')
              setNovoSetor(true)
            }}
            aria-label="Novo setor"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="space-y-4">
          {state.setores.map((setor) => (
            <div key={setor.id} className="rounded-lg border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">{setor.nome}</h3>
                <div className="relative">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-navy shadow-sm" onClick={() => setMenuSetor(menuSetor === setor.id ? null : setor.id)}>
                    <MoreVertical size={18} />
                  </button>
                  {menuSetor === setor.id ? (
                    <div className="absolute right-0 z-10 w-44 rounded-md border border-line bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-page"
                        onClick={() => {
                          setAddUserSetor(setor.id)
                          setMenuSetor(null)
                        }}
                      >
                        Adicionar usuário
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-page"
                        onClick={() => {
                          const nome = window.prompt('Nome do setor', setor.nome)
                          if (nome) renameSetor(setor.id, nome)
                          setMenuSetor(null)
                        }}
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-page"
                        onClick={() => {
                          setExcluirSetorId(setor.id)
                          setMenuSetor(null)
                        }}
                      >
                        Excluir setor
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                {setor.usuarioIds.map((id) => {
                  const u = state.usuarios.find((x) => x.id === id)
                  if (!u) return null
                  const key = `${setor.id}-${u.id}`
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded-md border-l-4 border-navy bg-slate-50 px-4 py-3">
                      <span className="font-medium text-ink">{u.nome}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted">@{u.username}</span>
                        <div className="relative">
                          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-navy shadow-sm" onClick={() => setMenuUser(menuUser === key ? null : key)}>
                            <MoreVertical size={16} />
                          </button>
                          {menuUser === key ? (
                            <div className="absolute right-0 z-10 w-40 rounded-md border border-line bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-page"
                                onClick={() => {
                                  setUserForm(u)
                                  setMenuUser(null)
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-page"
                                onClick={() => {
                                  removeUsuarioDoSetor(setor.id, u.id)
                                  setMenuUser(null)
                                }}
                              >
                                Remover do setor
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <GhostButton onClick={resetDemo}>Restaurar dados de demonstração</GhostButton>
      </div>
      <p className="mt-8 text-right text-xs text-muted">Copyright © EDB Total {new Date().getFullYear()}</p>

      <Modal open={novoSetor} title="Novo setor" onClose={() => setNovoSetor(false)}>
        <Field label="Nome">
          <input className={inputClass} value={nomeSetor} onChange={(e) => setNomeSetor(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <GhostButton onClick={() => setNovoSetor(false)}>Cancelar</GhostButton>
          <PrimaryButton
            onClick={() => {
              if (nomeSetor.trim()) addSetor(nomeSetor.trim())
              setNovoSetor(false)
            }}
          >
            Criar
          </PrimaryButton>
        </div>
      </Modal>

      <Modal open={!!addUserSetor} title="Adicionar usuário ao setor" onClose={() => setAddUserSetor(null)}>
        <div className="space-y-2">
          {state.usuarios.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left hover:bg-page"
              onClick={() => {
                if (addUserSetor) addUsuarioAoSetor(addUserSetor, u.id)
                setAddUserSetor(null)
              }}
            >
              <span>{u.nome}</span>
              <span className="text-sm text-muted">@{u.username}</span>
            </button>
          ))}
          <GhostButton
            className="w-full"
            onClick={() => {
              setUserForm({
                id: uid('u'),
                nome: '',
                username: '',
                senha: senhaGerada(),
                papel: 'secretario',
                escolaId: escolasVisiveis[0]?.id,
              })
            }}
          >
            + Criar novo usuário
          </GhostButton>
        </div>
      </Modal>

      <Modal open={!!userForm} title="Usuário" onClose={() => setUserForm(null)}>
        {userForm ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              saveUsuario(userForm)
              if (addUserSetor) addUsuarioAoSetor(addUserSetor, userForm.id)
              setUserForm(null)
              setAddUserSetor(null)
            }}
          >
            <Field label="Nome">
              <input className={inputClass} required value={userForm.nome} onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })} />
            </Field>
            <Field label="Username">
              <input className={inputClass} required value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            </Field>
            <Field label="Senha">
              <input className={inputClass} value={userForm.senha} onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })} />
            </Field>
            <Field label="Papel">
              <select className={inputClass} value={userForm.papel} onChange={(e) => setUserForm({ ...userForm, papel: e.target.value as Papel })}>
                {PAPEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
              </select>
            </Field>
            {['escola', 'secretario', 'professor', 'aluno', 'superintendente'].includes(userForm.papel) ? (
              <Field label="Escola">
                <select
                  className={inputClass}
                  value={userForm.escolaId ?? ''}
                  onChange={(e) => setUserForm({ ...userForm, escolaId: e.target.value })}
                >
                  {escolasVisiveis.map((esc) => (
                    <option key={esc.id} value={esc.id}>{esc.nome}</option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setUserForm(null)}>Cancelar</GhostButton>
              <PrimaryButton type="submit">Salvar</PrimaryButton>
            </div>
          </form>
        ) : null}
      </Modal>
      <Confirmacao
        open={!!excluirSetorId}
        titulo="Excluir setor"
        texto="Excluir este setor? Os usuários não são apagados, só saem do agrupamento."
        onCancel={() => setExcluirSetorId(null)}
        onConfirm={() => {
          if (excluirSetorId) removeSetor(excluirSetorId)
          setExcluirSetorId(null)
        }}
      />
    </div>
  )
}
