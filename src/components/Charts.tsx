type BarItem = { label: string; value: number }

export function BarPercentChart({ items }: { items: BarItem[] }) {
  if (!items.length) {
    return <p className="py-16 text-center text-sm text-muted">Sem turmas nesta igreja.</p>
  }
  const w = Math.max(420, items.length * 52)
  const h = 300
  const pad = { t: 12, r: 8, b: 92, l: 36 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const gap = innerW / items.length
  const barW = Math.min(26, gap * 0.5)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[300px] w-full min-w-[420px]" role="img" aria-label="Presença por turma">
        {[0, 50, 100].map((y) => {
          const yy = pad.t + innerH - (y / 100) * innerH
          return (
            <g key={y}>
              <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#e4e8ee" strokeWidth="1" />
              <text x={pad.l - 8} y={yy + 4} textAnchor="end" className="fill-muted" fontSize="11">
                {y}%
              </text>
            </g>
          )
        })}
        {items.map((item, i) => {
          const x = pad.l + gap * i + (gap - barW) / 2
          const bh = (Math.max(0, Math.min(100, item.value)) / 100) * innerH
          const y = pad.t + innerH - bh
          const labelX = x + barW / 2
          const labelY = pad.t + innerH + 10
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barW} height={Math.max(bh, 1)} rx="3" fill="#152238" />
              <text
                x={labelX}
                y={labelY}
                fontSize="10"
                className="fill-muted"
                transform={`rotate(-42 ${labelX} ${labelY})`}
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

type Slice = { label: string; value: number; color: string }

export function DonutChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const r = 58
  const c = 2 * Math.PI * r
  let offset = 0
  const cx = 90
  const cy = 90

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 180" className="h-52 w-52" role="img" aria-label="Resumo da aula">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f5" strokeWidth="28" />
        {total === 0 ? null : (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {slices.map((s) => {
              if (!s.value) return null
              const len = (s.value / total) * c
              const dash = `${len} ${c - len}`
              const el = (
                <circle
                  key={s.label}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="28"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
          </g>
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-4 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
