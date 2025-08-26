import { writeFileSync } from 'fs'

const AUTH_URL = (process.env.AUTH_URL || '').replace(/\/$/, '')
const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '')
const EMAIL = process.env.EMAIL || ''
const PASSWORD = process.env.PASSWORD || ''
const CODE = process.env.CODE || ''
const DO_SIGNUP = process.env.DO_SIGNUP === '1'
const DO_CONFIRM = process.env.DO_CONFIRM === '1'
const PK = process.env.PK || 'group#books'
const TITLE = process.env.TITLE || 'Showcase Title'
const DESC = process.env.DESC || 'A long description for showcase'
const RATING = Number(process.env.RATING || 5)
const UPDATE_TITLE = process.env.UPDATE_TITLE || 'Updated Title'
const UPDATE_DESC = process.env.UPDATE_DESC || 'Updated description text'
const FILTER_CONTAINS = process.env.FILTER_CONTAINS || 'long'
const FILTER_GTE = process.env.FILTER_GTE || '4'
const TRANSLATE_LANG = process.env.TRANSLATE_LANG || 'fr'
const TRANSLATE_SK_ENV = process.env.TRANSLATE_SK || ''

async function post(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`POST ${url} ${res.status} ${text}`)
  try { return JSON.parse(text) } catch { return text }
}
async function put(url: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`PUT ${url} ${res.status} ${text}`)
  try { return JSON.parse(text) } catch { return text }
}
async function get(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`GET ${url} ${res.status} ${text}`)
  try { return JSON.parse(text) } catch { return text }
}
function enc(s: string) { return encodeURIComponent(s) }
function logStep(t: string) { console.log(`\n=== ${t} ===`) }

async function main() {
  if (!AUTH_URL || !APP_URL) throw new Error('Set AUTH_URL and APP_URL')
  if (!EMAIL || !PASSWORD) throw new Error('Set EMAIL and PASSWORD')

  if (DO_SIGNUP) {
    logStep('signup')
    console.log(await post(`${AUTH_URL}/signup`, { email: EMAIL, password: PASSWORD }))
  }
  if (DO_CONFIRM && CODE) {
    logStep('confirm')
    console.log(await post(`${AUTH_URL}/confirm`, { email: EMAIL, code: CODE }))
  }

  logStep('login')
  const login = await post(`${AUTH_URL}/login`, { email: EMAIL, password: PASSWORD })
  const idToken = login.IdToken || login.idToken || ''
  const accessToken = login.AccessToken || login.accessToken || ''
  if (!idToken) throw new Error('No IdToken from login')
  console.log('ok')

  const pkPath = enc(PK)

  logStep('public GET by pk')
  const coll = await get(`${APP_URL}/things/${pkPath}`)
  console.log(`all items for ${PK}:`)
  console.dir(coll, { depth: null })

  logStep('public GET with ratingGte')
  const gte = await get(`${APP_URL}/things/${pkPath}?ratingGte=${FILTER_GTE}`)
  console.log(`items with rating >= ${FILTER_GTE}:`)
  console.dir(gte, { depth: null })

  logStep('public GET with contains')
  const cnt = await get(`${APP_URL}/things/${pkPath}?contains=${enc(FILTER_CONTAINS)}`)
  console.log(`items containing "${FILTER_CONTAINS}" in text fields:`)
  console.dir(cnt, { depth: null })

  logStep('public GET combined')
  const cmb = await get(`${APP_URL}/things/${pkPath}?ratingGte=${FILTER_GTE}&contains=${enc(FILTER_CONTAINS)}`)
  console.log(`items with rating >= ${FILTER_GTE} AND containing "${FILTER_CONTAINS}":`)
  console.dir(cmb, { depth: null })

  logStep('protected POST create')
  const created = await post(`${APP_URL}/things`, { pk: PK, title: TITLE, description: DESC, rating: RATING }, { Authorization: idToken })
  console.log('created item:')
  console.dir(created, { depth: null })
  const createdSk: string = created.sk
  const createdSkPath = enc(createdSk)

  logStep('protected PUT update (ownership)')
  const updated = await put(`${APP_URL}/things/${pkPath}/${createdSkPath}`, { title: UPDATE_TITLE, description: UPDATE_DESC, rating: RATING }, { Authorization: idToken })
  console.log('updated response:')
  console.dir(updated, { depth: null })

  const translateSk = TRANSLATE_SK_ENV || createdSk
  const translateSkPath = enc(translateSk)

  logStep('translate first (persist cache)')
  const t1 = await get(`${APP_URL}/things/${pkPath}/${translateSkPath}/translation?language=${enc(TRANSLATE_LANG)}`)
  console.dir(t1, { depth: null })

  logStep('translate again (cache hit)')
  const t2 = await get(`${APP_URL}/things/${pkPath}/${translateSkPath}/translation?language=${enc(TRANSLATE_LANG)}`)
  console.dir(t2, { depth: null })

  logStep('invalidate by updating description')
  const inv = await put(`${APP_URL}/things/${pkPath}/${translateSkPath}`, { description: 'A new long description to test invalidation' }, { Authorization: idToken })
  console.log('invalidate response:')
  console.dir(inv, { depth: null })

  logStep('translate after invalidation (fresh)')
  const t3 = await get(`${APP_URL}/things/${pkPath}/${translateSkPath}/translation?language=${enc(TRANSLATE_LANG)}`)
  console.dir(t3, { depth: null })

  logStep('logout')
  try { console.dir(await post(`${AUTH_URL}/logout`, { accessToken }), { depth: null }) } catch { console.log('logout attempted') }

  const out = [
    `AUTH_URL=${AUTH_URL}`,
    `APP_URL=${APP_URL}`,
    `EMAIL=${EMAIL}`,
    `IdToken=${idToken}`,
    `AccessToken=${accessToken}`,
    `OWNED_SK=${createdSk}`,
    `TRANSLATE_SK=${translateSk}`,
    `TRANSLATE_LANG=${TRANSLATE_LANG}`
  ].join('\n')
  writeFileSync('outputs.md', out)
  console.log('\nwrote outputs.md')
}

main().catch(e => { console.error(e.message || e); process.exit(1) })
