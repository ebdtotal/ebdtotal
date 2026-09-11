import { Capacitor } from '@capacitor/core'
import type { Notificacao } from './notificacoes'

const SHOWN = 'ebd-notif-phone'

function shownKey(id: string) {
  return `${SHOWN}:${id}`
}

function alreadyShown(id: string) {
  try {
    return localStorage.getItem(shownKey(id)) === '1'
  } catch {
    return false
  }
}

function markShown(id: string) {
  try {
    localStorage.setItem(shownKey(id), '1')
  } catch {
    /* quota */
  }
}

function hashId(id: string) {
  let n = 0
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) | 0
  return Math.abs(n) % 2_000_000_000 || 1
}

async function scheduleNative(itens: Notificacao[]) {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') {
    const asked = await LocalNotifications.requestPermissions()
    if (asked.display !== 'granted') return
  }
  try {
    await LocalNotifications.createChannel({
      id: 'ebd-total',
      name: 'EBD Total',
      description: 'Avisos, aniversários e mudança de faixa',
      importance: 5,
      visibility: 1,
    })
  } catch {
    /* canal já existe ou plataforma sem canal */
  }
  const pending = itens.filter((n) => !alreadyShown(n.id))
  if (!pending.length) return
  await LocalNotifications.schedule({
    notifications: pending.map((n, i) => ({
      id: hashId(n.id),
      title: n.titulo || 'EBD Total',
      body: n.texto,
      channelId: 'ebd-total',
      schedule: { at: new Date(Date.now() + 1200 + i * 400) },
      extra: { href: n.to },
    })),
  })
  pending.forEach((n) => markShown(n.id))
}

async function notifyWeb(itens: Notificacao[]) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return
  }
  if (Notification.permission !== 'granted') return
  for (const n of itens) {
    if (alreadyShown(n.id)) continue
    new Notification(n.titulo || 'EBD Total', { body: n.texto })
    markShown(n.id)
  }
}

/** Notificação na barra do celular (app) ou do navegador, se o usuário permitir. */
export async function notificarCelular(itens: Notificacao[]) {
  if (!itens.length) return
  try {
    if (Capacitor.isNativePlatform()) {
      await scheduleNative(itens)
      return
    }
  } catch {
    /* plugin ausente: tenta o aviso do navegador */
  }
  await notifyWeb(itens)
}
