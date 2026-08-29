import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

export const EVENTO_SYNC = 'ebd-sync'

export async function iniciarAppNativo() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setOverlaysWebView({ overlay: false })
    } else {
      await StatusBar.setBackgroundColor({ color: '#152238' })
    }
  } catch {
    /* web */
  }
  await CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) window.history.back()
    else void CapApp.exitApp()
  })
  await CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event(EVENTO_SYNC))
  })
}

export function ehAppNativo() {
  return Capacitor.isNativePlatform()
}
