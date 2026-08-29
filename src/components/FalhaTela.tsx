import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { erro: boolean }

export class FalhaTela extends Component<Props, State> {
  state: State = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error(erro, info)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-6 text-center text-white">
        <p className="text-lg font-semibold">Não foi possível abrir esta tela</p>
        <p className="mt-2 text-sm text-white/70">Feche e abra o app de novo. Se continuar, fale com o suporte.</p>
        <button
          type="button"
          className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy"
          onClick={() => window.location.reload()}
        >
          Tentar de novo
        </button>
      </div>
    )
  }
}
