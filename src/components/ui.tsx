import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { formatDateBR, maskDateBR, parseDateBR } from '../lib/utils'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button className="absolute inset-0 bg-navy/50" aria-label="Fechar" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-page">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-navy-2 focus:ring-2 focus:ring-navy/10'

export function DateInput({
  value,
  onChange,
  disabled,
  required,
  allowEmpty,
  className,
}: {
  value: string
  onChange: (iso: string) => void
  disabled?: boolean
  required?: boolean
  allowEmpty?: boolean
  className?: string
}) {
  const [text, setText] = useState(() => (value ? formatDateBR(value) : ''))
  const pickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(value ? formatDateBR(value) : '')
  }, [value])

  function aplicar(raw: string) {
    const masked = maskDateBR(raw)
    setText(masked)
    if (!masked) {
      if (allowEmpty) onChange('')
      return
    }
    const iso = parseDateBR(masked)
    if (iso) onChange(iso)
  }

  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-11 ${className ?? ''}`}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        disabled={disabled}
        required={required}
        value={text === '—' ? '' : text}
        onChange={(e) => aplicar(e.target.value)}
        onBlur={() => {
          if (!text && allowEmpty) {
            onChange('')
            setText('')
            return
          }
          setText(value ? formatDateBR(value) : '')
        }}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={value || ''}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
        }}
      />
      <button
        type="button"
        disabled={disabled}
        className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-page disabled:opacity-40"
        aria-label="Abrir calendário"
        onClick={() => {
          try {
            pickerRef.current?.showPicker()
          } catch {
            pickerRef.current?.focus()
            pickerRef.current?.click()
          }
        }}
      >
        <CalendarDays size={18} />
      </button>
    </div>
  )
}

export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-50 ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-page ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}
