export type FatiaGrafico = { label: string; valor: number; cor: string }

export const CORES_GRAFICO = ['#152238', '#c9a227', '#059669', '#dc2626', '#0ea5e9', '#8b5cf6', '#f59e0b', '#14b8a6', '#64748b']

export function corGrafico(i: number): string {
  return CORES_GRAFICO[i % CORES_GRAFICO.length]
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function polar(cx: number, cy: number, r: number, ang: number) {
  const rad = ((ang - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const s = polar(cx, cy, r, a1)
  const e = polar(cx, cy, r, a0)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${e.x} ${e.y} A ${r} ${r} 0 ${large} 1 ${s.x} ${s.y} Z`
}

export function Barras({ itens, altura = 180 }: { itens: FatiaGrafico[]; altura?: number }) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  const w = Math.max(280, itens.length * 72)
  const base = altura - 28
  const barW = Math.min(48, (w - 24) / Math.max(1, itens.length) - 12)
  return (
    <svg viewBox={`0 0 ${w} ${altura}`} className="h-44 w-full" role="img">
      {itens.map((item, i) => {
        const h = (item.valor / max) * (base - 8)
        const x = 16 + i * ((w - 24) / itens.length)
        return (
          <g key={item.label}>
            <rect x={x} y={base - h} width={barW} height={h} rx={4} fill={item.cor} />
            <text x={x + barW / 2} y={altura - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {item.label}
            </text>
            <text x={x + barW / 2} y={base - h - 4} textAnchor="middle" fontSize="10" fill="#152238">
              {item.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function Pizza({ itens }: { itens: FatiaGrafico[] }) {
  const total = itens.reduce((a, i) => a + Math.max(0, i.valor), 0)
  let ang = 0
  const fatias = itens.map((item) => {
    const fat = total <= 0 ? 0 : (Math.max(0, item.valor) / total) * 360
    const a0 = ang
    ang += fat
    return { ...item, a0, a1: ang }
  })
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img">
        {total <= 0 ? (
          <circle cx="80" cy="80" r="70" fill="#e2e8f0" />
        ) : (
          fatias.map((f) =>
            f.a1 - f.a0 <= 0 ? null : (
              <path key={f.label} d={arco(80, 80, 70, f.a0, f.a1)} fill={f.cor} />
            ),
          )
        )}
      </svg>
      <ul className="space-y-1 text-sm">
        {itens.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.cor }} />
            <span className="text-ink">{i.label}</span>
            <span className="text-muted">
              {i.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function barrasHtml(itens: FatiaGrafico[], altura = 180): string {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  const w = Math.max(280, itens.length * 72)
  const base = altura - 28
  const barW = Math.min(48, (w - 24) / Math.max(1, itens.length) - 12)
  const bars = itens
    .map((item, i) => {
      const h = (item.valor / max) * (base - 8)
      const x = 16 + i * ((w - 24) / itens.length)
      return `<g>
        <rect x="${x}" y="${base - h}" width="${barW}" height="${h}" rx="4" fill="${item.cor}"/>
        <text x="${x + barW / 2}" y="${altura - 8}" text-anchor="middle" font-size="10" fill="#64748b">${escapeXml(item.label)}</text>
        <text x="${x + barW / 2}" y="${base - h - 4}" text-anchor="middle" font-size="10" fill="#152238">${item.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</text>
      </g>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${altura}" width="100%" height="${altura}">${bars}</svg>`
}

function ticksEixo(topo: number): number[] {
  if (topo <= 6) return Array.from({ length: topo + 1 }, (_, i) => i)
  const passo = Math.ceil(topo / 5)
  const out: number[] = []
  for (let i = 0; i <= topo; i += passo) out.push(i)
  if (out[out.length - 1] !== topo) out.push(topo)
  return out
}

function catmull(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`
  }
  return d
}

export function AreaLinha({
  pontos,
  rotulos,
  cor = '#5c3d8f',
}: {
  pontos: number[]
  rotulos: string[]
  cor?: string
}) {
  const w = 640
  const h = 220
  const pad = { t: 16, r: 36, b: 36, l: 8 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const max = Math.max(1, ...pontos, 1)
  const topo = Math.max(1, Math.ceil(max))
  const xs = pontos.map((_, i) => pad.l + (pontos.length <= 1 ? innerW / 2 : (i / (pontos.length - 1)) * innerW))
  const ys = pontos.map((v) => pad.t + innerH - (v / topo) * innerH)
  const curve = catmull(xs.map((x, i) => ({ x, y: ys[i] ?? pad.t + innerH })))
  const baseY = pad.t + innerH
  const area = pontos.length
    ? `${curve} L ${xs[xs.length - 1]} ${baseY} L ${xs[0]} ${baseY} Z`
    : ''
  const ticks = ticksEixo(topo)
  const passoRotulo = pontos.length > 14 ? Math.ceil(pontos.length / 10) : 1

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img">
      {ticks.map((t) => {
        const y = pad.t + innerH - (t / topo) * innerH
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef1f5" strokeWidth="1" />
            <text x={w - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {t}
            </text>
          </g>
        )
      })}
      {area ? <path d={area} fill={cor} opacity="0.18" /> : null}
      {curve ? <path d={curve} fill="none" stroke={cor} strokeWidth="2.5" /> : null}
      {rotulos.map((r, i) =>
        i % passoRotulo === 0 || i === rotulos.length - 1 ? (
          <text key={`${r}-${i}`} x={xs[i]} y={h - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {r}
          </text>
        ) : null,
      )}
    </svg>
  )
}

export function BarrasMedias({
  itens,
}: {
  itens: { label: string; valor: number; cor: string }[]
}) {
  const w = 220
  const h = 220
  const pad = { t: 20, r: 12, b: 36, l: 28 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const max = Math.max(1, ...itens.map((i) => i.valor))
  const topo = Math.max(1, Math.ceil(max))
  const gap = innerW / Math.max(1, itens.length)
  const barW = Math.min(36, gap * 0.5)
  const ticks = ticksEixo(topo)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-52 w-full max-w-[240px]" role="img">
      {ticks.map((t) => {
        const y = pad.t + innerH - (t / topo) * innerH
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef1f5" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {t}
            </text>
          </g>
        )
      })}
      {itens.map((item, i) => {
        const bh = (item.valor / topo) * innerH
        const x = pad.l + gap * i + (gap - barW) / 2
        const y = pad.t + innerH - bh
        return (
          <g key={item.label}>
            <rect x={x} y={y} width={barW} height={Math.max(bh, 2)} rx="6" fill={item.cor} />
            <text x={x + barW / 2} y={h - 10} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function pizzaHtml(itens: FatiaGrafico[]): string {
  const total = itens.reduce((a, i) => a + Math.max(0, i.valor), 0)
  let ang = 0
  const paths =
    total <= 0
      ? `<circle cx="80" cy="80" r="70" fill="#e2e8f0"/>`
      : itens
          .map((item) => {
            const fat = (Math.max(0, item.valor) / total) * 360
            const a0 = ang
            ang += fat
            if (fat <= 0) return ''
            return `<path d="${arco(80, 80, 70, a0, ang)}" fill="${item.cor}"/>`
          })
          .join('')
  const legend = itens
    .map(
      (i) =>
        `<li><span style="display:inline-block;width:10px;height:10px;background:${i.cor};margin-right:6px"></span>${escapeXml(i.label)} — ${i.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>`,
    )
    .join('')
  return `<div class="pizza"><svg viewBox="0 0 160 160" width="140" height="140">${paths}</svg><ul>${legend}</ul></div>`
}
