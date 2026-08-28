import { apiStats, type StatsPublicos } from '../lib/api'
import { WHATSAPP_SUPORTE, whatsappUrl } from '../lib/utils'

export type { StatsPublicos }
export { apiStats }

export const WHATSAPP_SUPORTE_LINK = whatsappUrl(WHATSAPP_SUPORTE, 'Olá! Quero assinar o EDB Total.')
