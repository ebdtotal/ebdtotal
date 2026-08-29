import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { GhostButton, PrimaryButton } from './ui'

export function TelaImpressao({ html, onClose }: { html: string; onClose: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null)

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-navy pt-[max(env(safe-area-inset-top),var(--safe-top,0px))]">
      <div className="flex shrink-0 gap-2 px-3 py-3">
        <PrimaryButton
          className="flex-1"
          onClick={() => {
            const w = ref.current?.contentWindow
            if (!w) return
            w.focus()
            w.print()
          }}
        >
          Salvar PDF
        </PrimaryButton>
        <GhostButton className="flex-1" onClick={onClose}>
          Fechar
        </GhostButton>
      </div>
      <iframe ref={ref} title="Pré-visualização" srcDoc={html} className="min-h-0 flex-1 bg-white" />
    </div>,
    document.body,
  )
}
