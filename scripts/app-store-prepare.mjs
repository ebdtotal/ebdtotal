/**
 * Preenche ficha e capturas na App Store Connect (roda no Codemagic).
 * Não envia o IPA — o publishing do yaml faz o upload e o submit_to_app_store.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE_ID = process.env.BUNDLE_ID || 'com.portalebd.app'
const KEY_ID = process.env.APP_STORE_CONNECT_KEY_IDENTIFIER
const ISSUER = process.env.APP_STORE_CONNECT_ISSUER_ID
const P8 = process.env.APP_STORE_CONNECT_PRIVATE_KEY
if (!KEY_ID || !ISSUER || !P8) {
  console.log('Sem chave da App Store Connect — pulando ficha.')
  process.exit(0)
}

function token() {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' }),
  ).toString('base64url')
  const sign = crypto.createSign('SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign({ key: P8.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return `${header}.${payload}.${sig}`
}

const jwt = token()
const API = 'https://api.appstoreconnect.apple.com/v1'

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${pathname} → ${res.status} ${JSON.stringify(data)}`)
  }
  return data
}

const desc =
  'EDB Total é o sistema da Escola Bíblica Dominical da sua igreja: chamada, cadastros, lição, avaliação, avisos, certificados, financeiro e portal do aluno.\n\nNa secretaria e na superintendência: presença, Bíblia, revista, oferta, turmas, congregações e relatório do domingo.\n\nNo celular do aluno: frequência, lição da semana, ranking da turma, atividades e certificados.\n\nCada igreja tem os dados separados. Funciona no site e no aplicativo.'

const apps = await api(`/apps?filter[bundleId]=${BUNDLE_ID}`)
const app = apps.data?.[0]
if (!app) {
  console.log('App com bundle', BUNDLE_ID, 'não encontrado na App Store Connect.')
  process.exit(0)
}
const appId = app.id
console.log('App', appId)

const versions = await api(
  `/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=5`,
)
let version = (versions.data || []).find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'WAITING_FOR_REVIEW', 'REJECTED', 'DEVELOPER_REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes?.appStoreState,
  ),
)
if (!version) {
  version = (versions.data || []).find((v) => v.attributes?.versionString === '1.0')
}
if (!version) {
  const created = await api('/appStoreVersions', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersions',
        attributes: { platform: 'IOS', versionString: '1.0', releaseType: 'AFTER_APPROVAL', copyright: '2026 EDB Total' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    }),
  })
  version = created.data
}
const versionId = version.id
console.log('Versão', versionId, version.attributes?.appStoreState)

const locs = await api(`/appStoreVersions/${versionId}/appStoreVersionLocalizations`)
let loc = (locs.data || []).find((l) => l.attributes?.locale?.startsWith('pt')) || locs.data?.[0]
if (!loc) {
  const created = await api('/appStoreVersionLocalizations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'pt-BR', description: desc, keywords: 'ebd,escola biblica,igreja,chamada,escola dominical', supportUrl: 'https://ebdtotal.com' },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
      },
    }),
  })
  loc = created.data
} else {
  await api(`/appStoreVersionLocalizations/${loc.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        id: loc.id,
        attributes: {
          description: desc,
          keywords: 'ebd,escola biblica,igreja,chamada,escola dominical,licao',
          supportUrl: 'https://ebdtotal.com',
          marketingUrl: 'https://ebdtotal.com',
          whatsNew: 'Primeira versão pública: chamada, lição por turma, portal do aluno e ranking da classe.',
        },
      },
    }),
  })
}
const locId = loc.id

const infos = await api(`/apps/${appId}/appInfos`)
const info = infos.data?.[0]
if (info) {
  const infoLocs = await api(`/appInfos/${info.id}/appInfoLocalizations`)
  const infoLoc =
    (infoLocs.data || []).find((l) => l.attributes?.locale?.startsWith('pt')) || infoLocs.data?.[0]
  if (infoLoc) {
    await api(`/appInfoLocalizations/${infoLoc.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'appInfoLocalizations',
          id: infoLoc.id,
          attributes: {
            name: 'EDB Total',
            subtitle: 'Escola Bíblica Dominical',
            privacyPolicyUrl: 'https://ebdtotal.com/privacidade',
          },
        },
      }),
    })
  }
}

try {
  const details = await api(`/appStoreVersions/${versionId}/appStoreReviewDetail`)
  const detailId = details.data?.id
  const attrs = {
    contactFirstName: 'Itano',
    contactLastName: 'Sampaio',
    contactPhone: '+5598981258852',
    contactEmail: 'itanosampaio@bol.com.br',
    demoAccountName: 'apple.review',
    demoAccountPassword: 'ReviewEbd2026!',
    demoAccountRequired: true,
    notes:
      'App da Escola Bíblica Dominical. Entre com apple.review / ReviewEbd2026!. A API vive em https://ebdtotal.com. Criptografia apenas HTTPS. Sem compras no app.',
  }
  if (detailId) {
    await api(`/appStoreReviewDetails/${detailId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: { type: 'appStoreReviewDetails', id: detailId, attributes: attrs } }),
    })
  } else {
    await api('/appStoreReviewDetails', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appStoreReviewDetails',
          attributes: attrs,
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
        },
      }),
    })
  }
} catch (err) {
  console.log('Review detail:', err.message)
}

const shotDir = path.join(root, 'store', 'screenshots', 'pt-BR')
const files = fs.existsSync(shotDir)
  ? fs.readdirSync(shotDir).filter((f) => f.endsWith('.png')).sort()
  : []

async function uploadShot(setId, filePath) {
  const buf = fs.readFileSync(filePath)
  const created = await api('/appScreenshots', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        attributes: { fileName: path.basename(filePath), fileSize: buf.length },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
      },
    }),
  })
  const shot = created.data
  const ops = shot.attributes?.uploadOperations || []
  for (const op of ops) {
    const start = Number(op.offset || 0)
    const len = Number(op.length || buf.length)
    const chunk = buf.subarray(start, start + len)
    const put = await fetch(op.url, {
      method: op.method || 'PUT',
      headers: Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value])),
      body: chunk,
    })
    if (!put.ok) throw new Error(`upload ${path.basename(filePath)} ${put.status}`)
  }
  await api(`/appScreenshots/${shot.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true } },
    }),
  })
}

if (files.length) {
  try {
    const sets = await api(`/appStoreVersionLocalizations/${locId}/appScreenshotSets`)
    let set = (sets.data || []).find((s) =>
      ['APP_IPHONE_67', 'APP_IPHONE_69'].includes(s.attributes?.screenshotDisplayType),
    )
    if (!set) {
      const created = await api('/appScreenshotSets', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appScreenshotSets',
            attributes: { screenshotDisplayType: 'APP_IPHONE_67' },
            relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: locId } } },
          },
        }),
      })
      set = created.data
    }
    const existing = await api(`/appScreenshotSets/${set.id}/appScreenshots`)
    for (const old of existing.data || []) {
      try {
        await api(`/appScreenshots/${old.id}`, { method: 'DELETE' })
      } catch {
        /* já processada */
      }
    }
    for (const f of files) {
      await uploadShot(set.id, path.join(shotDir, f))
      console.log('captura', f)
    }
  } catch (err) {
    console.log('Capturas:', err.message)
  }
}

console.log('Ficha da App Store atualizada.')
