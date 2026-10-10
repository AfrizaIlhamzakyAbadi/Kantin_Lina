// Minimal Firestore client for Cloudflare Workers.
//
// `firebase-admin` needs Node APIs that Workers don't have, so this talks to the
// Firestore REST API directly, authenticating as the service account:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// Admin credentials bypass firestore.rules, so only server code may use this.
//
// Files in `functions/_lib` export no `onRequest*` handlers, so Pages does not
// turn them into routes; they are only bundled into the functions that import them.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/datastore'

export class FirestoreError extends Error {
  constructor(message, { httpStatus, code } = {}) {
    super(message)
    this.name = 'FirestoreError'
    this.httpStatus = httpStatus
    this.code = code // e.g. "ABORTED", "NOT_FOUND", "ALREADY_EXISTS"
  }
}

// ---- Auth -------------------------------------------------------------------

const base64url = (input) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem) {
  const body = pem
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n') // .dev.vars / dashboards often keep literal "\n"
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function assertFirebaseConfigured(env) {
  const missing = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].filter(
    (key) => !env[key],
  )
  if (missing.length > 0) {
    throw new Error(`Firebase service account is not configured (missing ${missing.join(', ')})`)
  }
}

let cachedToken = null // { token, expiresAt } - reused while this isolate stays warm

async function getAccessToken(env) {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.token

  const issuedAt = Math.floor(Date.now() / 1000)
  const unsigned = [
    base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64url(
      JSON.stringify({
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + 3600,
      }),
    ),
  ].join('.')

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.FIREBASE_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`Could not get a Google access token: ${data.error_description || data.error || res.status}`)
  }

  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cachedToken.token
}

// ---- Value encoding (JS <-> Firestore REST) ----------------------------------

export function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } }
  return { mapValue: { fields: toFields(value) } }
}

export function toFields(object) {
  const fields = {}
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) fields[key] = toValue(value)
  }
  return fields
}

export function fromValue(value) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(value.timestampValue)
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromValue)
  if ('mapValue' in value) return fromFields(value.mapValue.fields ?? {})
  return null // nullValue and anything we don't use (geo points, references, ...)
}

export function fromFields(fields) {
  const object = {}
  for (const [key, value] of Object.entries(fields)) object[key] = fromValue(value)
  return object
}

// ---- REST plumbing -------------------------------------------------------------

const documentsRoot = (env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`
const documentName = (env, path) => `${documentsRoot(env)}/${path}`
const pathFromName = (name) => name.split('/documents/')[1]

async function call(env, method, body) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${documentsRoot(env)}:${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAccessToken(env)}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = data?.error ?? data?.[0]?.error ?? {}
    throw new FirestoreError(error.message || `Firestore ${method} failed (HTTP ${res.status})`, {
      httpStatus: res.status,
      code: error.status,
    })
  }
  return data
}

function parseDocument(found) {
  return {
    path: pathFromName(found.name),
    updateTime: found.updateTime,
    data: fromFields(found.fields ?? {}),
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ---- Transactions --------------------------------------------------------------

function createTransaction(env, transaction) {
  const writes = []
  return {
    writes,

    // Read documents inside the transaction. Returns Map<path, doc | null>.
    async getAll(paths) {
      const unique = [...new Set(paths)]
      const found = new Map()
      if (unique.length === 0) return found
      const results = await call(env, 'batchGet', {
        documents: unique.map((path) => documentName(env, path)),
        transaction,
      })
      for (const result of results) {
        if (result.found) {
          const doc = parseDocument(result.found)
          found.set(doc.path, doc)
        } else if (result.missing) {
          found.set(pathFromName(result.missing), null)
        }
      }
      return found
    },

    // Create a new document; the commit fails if it already exists.
    create(path, data) {
      writes.push({
        update: { name: documentName(env, path), fields: toFields(data) },
        currentDocument: { exists: false },
      })
    },

    // Overwrite only the given fields of an existing document.
    update(path, data) {
      writes.push({
        update: { name: documentName(env, path), fields: toFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        currentDocument: { exists: true },
      })
    },
  }
}

// Runs `work(tx)` atomically: all reads and writes succeed together or not at
// all. If another request touches the same documents first, Firestore aborts the
// commit and we retry with fresh reads. Errors thrown by `work` roll back and
// propagate untouched (that is how "not enough stock" cancels the transaction).
export async function runTransaction(env, work, { attempts = 5 } = {}) {
  assertFirebaseConfigured(env)
  let lastError

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { transaction } = await call(env, 'beginTransaction', { options: { readWrite: {} } })
    const tx = createTransaction(env, transaction)
    try {
      const result = await work(tx)
      await call(env, 'commit', { transaction, writes: tx.writes })
      return result
    } catch (error) {
      await call(env, 'rollback', { transaction }).catch(() => {}) // best effort
      if (error instanceof FirestoreError && error.code === 'ABORTED') {
        lastError = error
        await sleep(40 * 2 ** attempt + Math.random() * 40) // back off, then retry
        continue
      }
      throw error
    }
  }
  throw lastError
}

// Documents of `collectionId` whose `field` equals `value` (non-transactional).
// Equality on one field needs no composite index.
export async function queryByField(env, collectionId, field, value, limit = 100) {
  assertFirebaseConfigured(env)
  const results = await call(env, 'runQuery', {
    structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toValue(value) } },
      limit,
    },
  })
  return results.filter((r) => r.document).map((r) => parseDocument(r.document))
}

// Single non-transactional update of existing fields (for non-critical metadata).
export async function updateDocument(env, path, data) {
  assertFirebaseConfigured(env)
  await call(env, 'commit', {
    writes: [
      {
        update: { name: documentName(env, path), fields: toFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        currentDocument: { exists: true },
      },
    ],
  })
}
