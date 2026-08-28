type LogoProps = {
  variant?: 'full' | 'mark'
  className?: string
}

export function Logo({ variant = 'full', className = '' }: LogoProps) {
  const mark = variant === 'mark'
  return (
    <img
      src={mark ? '/icon-192.png' : '/logo.png'}
      alt="EDB Total"
      className={`object-contain ${mark ? 'h-8 w-8' : 'h-24 w-auto'} ${className}`}
    />
  )
}
