------formdata-undici-092601410915
Content-Disposition: form-data; name="metadata"

{"main_module":"functionsWorker-0.3524106946517881.js"}
------formdata-undici-092601410915
Content-Disposition: form-data; name="functionsWorker-0.3524106946517881.js"; filename="functionsWorker-0.3524106946517881.js"
Content-Type: application/javascript+module

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/firestore.js
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var SCOPE = "https://www.googleapis.com/auth/datastore";
var FirestoreError = class extends Error {
  static {
    __name(this, "FirestoreError");
  }
  constructor(message, { httpStatus, code } = {}) {
    super(message);
    this.name = "FirestoreError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
};
var base64url = /* @__PURE__ */ __name((input) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}, "base64url");
function pemToDer(pem) {
  const body = pem.replace(/^"|"$/g, "").replace(/\\n/g, "\n").replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
__name(pemToDer, "pemToDer");
function assertFirebaseConfigured(env) {
  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(
    (key) => !env[key]
  );
  if (missing.length > 0) {
    throw new Error(`Firebase service account is not configured (missing ${missing.join(", ")})`);
  }
}
__name(assertFirebaseConfigured, "assertFirebaseConfigured");
var cachedToken = null;
async function getAccessToken(env) {
  if (cachedToken && cachedToken.expiresAt - 6e4 > Date.now()) return cachedToken.token;
  const issuedAt = Math.floor(Date.now() / 1e3);
  const unsigned = [
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64url(
      JSON.stringify({
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + 3600
      })
    )
  ].join(".");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(env.FIREBASE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Could not get a Google access token: ${data.error_description || data.error || res.status}`);
  }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1e3 };
  return cachedToken.token;
}
__name(getAccessToken, "getAccessToken");
function toValue(value) {
  if (value === null || value === void 0) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: toFields(value) } };
}
__name(toValue, "toValue");
function toFields(object) {
  const fields = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== void 0) fields[key] = toValue(value);
  }
  return fields;
}
__name(toFields, "toFields");
function fromValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ("mapValue" in value) return fromFields(value.mapValue.fields ?? {});
  return null;
}
__name(fromValue, "fromValue");
function fromFields(fields) {
  const object = {};
  for (const [key, value] of Object.entries(fields)) object[key] = fromValue(value);
  return object;
}
__name(fromFields, "fromFields");
var documentsRoot = /* @__PURE__ */ __name((env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`, "documentsRoot");
var documentName = /* @__PURE__ */ __name((env, path) => `${documentsRoot(env)}/${path}`, "documentName");
var pathFromName = /* @__PURE__ */ __name((name) => name.split("/documents/")[1], "pathFromName");
async function call(env, method, body) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${documentsRoot(env)}:${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAccessToken(env)}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error ?? data?.[0]?.error ?? {};
    throw new FirestoreError(error.message || `Firestore ${method} failed (HTTP ${res.status})`, {
      httpStatus: res.status,
      code: error.status
    });
  }
  return data;
}
__name(call, "call");
function parseDocument(found) {
  return {
    path: pathFromName(found.name),
    updateTime: found.updateTime,
    data: fromFields(found.fields ?? {})
  };
}
__name(parseDocument, "parseDocument");
var sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
function createTransaction(env, transaction) {
  const writes = [];
  return {
    writes,
    // Read documents inside the transaction. Returns Map<path, doc | null>.
    async getAll(paths) {
      const unique = [...new Set(paths)];
      const found = /* @__PURE__ */ new Map();
      if (unique.length === 0) return found;
      const results = await call(env, "batchGet", {
        documents: unique.map((path) => documentName(env, path)),
        transaction
      });
      for (const result of results) {
        if (result.found) {
          const doc = parseDocument(result.found);
          found.set(doc.path, doc);
        } else if (result.missing) {
          found.set(pathFromName(result.missing), null);
        }
      }
      return found;
    },
    // Create a new document; the commit fails if it already exists.
    create(path, data) {
      writes.push({
        update: { name: documentName(env, path), fields: toFields(data) },
        currentDocument: { exists: false }
      });
    },
    // Overwrite only the given fields of an existing document.
    update(path, data) {
      writes.push({
        update: { name: documentName(env, path), fields: toFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        currentDocument: { exists: true }
      });
    }
  };
}
__name(createTransaction, "createTransaction");
async function runTransaction(env, work, { attempts = 5 } = {}) {
  assertFirebaseConfigured(env);
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { transaction } = await call(env, "beginTransaction", { options: { readWrite: {} } });
    const tx = createTransaction(env, transaction);
    try {
      const result = await work(tx);
      await call(env, "commit", { transaction, writes: tx.writes });
      return result;
    } catch (error) {
      await call(env, "rollback", { transaction }).catch(() => {
      });
      if (error instanceof FirestoreError && error.code === "ABORTED") {
        lastError = error;
        await sleep(40 * 2 ** attempt + Math.random() * 40);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
__name(runTransaction, "runTransaction");
async function queryByField(env, collectionId, field, value, limit = 100) {
  assertFirebaseConfigured(env);
  const results = await call(env, "runQuery", {
    structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: toValue(value) } },
      limit
    }
  });
  return results.filter((r) => r.document).map((r) => parseDocument(r.document));
}
__name(queryByField, "queryByField");
async function updateDocument(env, path, data) {
  assertFirebaseConfigured(env);
  await call(env, "commit", {
    writes: [
      {
        update: { name: documentName(env, path), fields: toFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        currentDocument: { exists: true }
      }
    ]
  });
}
__name(updateDocument, "updateDocument");

// ../src/lib/constants.js
var PAYMENT_WINDOW_MS = 3 * 60 * 1e3;
var EXPIRY_GRACE_MS = 30 * 1e3;
var MAX_QTY_PER_ITEM = 10;

// _lib/orders.js
var ORDER_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  EXPIRED: "Expired",
  COMPLETED: "Completed",
  FAILED: "Failed"
  // checkout could not obtain a QR from Midtrans
};
var orderPath = /* @__PURE__ */ __name((orderId) => `orders/${orderId}`, "orderPath");
async function releaseOrder(env, orderId, newStatus, reason, { onlyIfExpired = false } = {}) {
  return runTransaction(env, async (tx) => {
    const path = orderPath(orderId);
    const order = (await tx.getAll([path])).get(path);
    if (!order) return { released: false, reason: "not-found" };
    if (order.data.status !== ORDER_STATUS.PENDING || order.data.stockDeducted !== true) {
      return { released: false, reason: "not-pending", status: order.data.status };
    }
    if (onlyIfExpired) {
      const expiresAt = order.data.expiresAt;
      if (!(expiresAt instanceof Date) || Date.now() <= expiresAt.getTime() + EXPIRY_GRACE_MS) {
        return { released: false, reason: "not-expired-yet" };
      }
    }
    const items = order.data.items ?? [];
    const menu = await tx.getAll(items.map((item) => `menu/${item.id}`));
    for (const item of items) {
      const doc = menu.get(`menu/${item.id}`);
      if (!doc) continue;
      tx.update(doc.path, { stock: (Number(doc.data.stock) || 0) + item.qty });
    }
    tx.update(path, {
      status: newStatus,
      stockDeducted: false,
      closedAt: /* @__PURE__ */ new Date(),
      closeReason: reason
    });
    return { released: true };
  });
}
__name(releaseOrder, "releaseOrder");
var lastSweepAt = 0;
async function expireStaleOrders(env, { minIntervalMs = 5e3, maxPerSweep = 50 } = {}) {
  const startedAt = Date.now();
  if (startedAt - lastSweepAt < minIntervalMs) return { skipped: true, expired: 0 };
  lastSweepAt = startedAt;
  const pending = await queryByField(env, "orders", "status", ORDER_STATUS.PENDING, 200);
  const stale = pending.filter(({ data }) => data.expiresAt instanceof Date && Date.now() > data.expiresAt.getTime() + EXPIRY_GRACE_MS).slice(0, maxPerSweep);
  let expired = 0;
  for (const order of stale) {
    const orderId = order.path.split("/")[1];
    try {
      const result = await releaseOrder(env, orderId, ORDER_STATUS.EXPIRED, "payment-window-elapsed", {
        onlyIfExpired: true
      });
      if (result.released) expired++;
    } catch (error) {
      console.error("[expire] could not expire order", orderId, error);
    }
  }
  return { skipped: false, expired };
}
__name(expireStaleOrders, "expireStaleOrders");
async function recordPayment(env, { orderId, grossAmount, transactionId }) {
  return runTransaction(env, async (tx) => {
    const path = orderPath(orderId);
    const order = (await tx.getAll([path])).get(path);
    if (!order) return { result: "unknown-order" };
    const { status, total, expiresAt } = order.data;
    if (status === ORDER_STATUS.PAID || status === ORDER_STATUS.COMPLETED) {
      return { result: "already-paid" };
    }
    if (grossAmount !== total) {
      return { result: "amount-mismatch", status, expected: total, received: grossAmount };
    }
    if (status === ORDER_STATUS.PENDING) {
      tx.update(path, { status: ORDER_STATUS.PAID, paidAt: /* @__PURE__ */ new Date(), transactionId: transactionId ?? null });
      return {
        result: "paid",
        afterDeadline: expiresAt instanceof Date && Date.now() > expiresAt.getTime()
      };
    }
    tx.update(path, {
      latePayment: true,
      latePaymentAt: /* @__PURE__ */ new Date(),
      latePaymentAmount: grossAmount,
      transactionId: transactionId ?? null
    });
    return { result: "late-payment", status };
  });
}
__name(recordPayment, "recordPayment");

// api/checkout.js
var JSON_HEADERS = { "Content-Type": "application/json" };
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }), "json");
var midtransBaseUrl = /* @__PURE__ */ __name((env) => env.MIDTRANS_IS_PRODUCTION === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com", "midtransBaseUrl");
var MAX_DISTINCT_ITEMS = 20;
var MAX_BOOKING_AHEAD_MS = 8 * 24 * 60 * 60 * 1e3;
var PICKUP_NAME_PATTERN = /^[^\r\n]{2,20}-\d{3}$/;
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
};
function parseRequest(payload) {
  const { customerName, pickupAt, items } = payload ?? {};
  if (typeof customerName !== "string" || !PICKUP_NAME_PATTERN.test(customerName.trim())) {
    throw new HttpError(400, 'customerName must look like "Name-123"');
  }
  const pickupDate = new Date(pickupAt);
  const now = Date.now();
  if (typeof pickupAt !== "string" || Number.isNaN(pickupDate.getTime()) || pickupDate.getTime() <= now || pickupDate.getTime() > now + MAX_BOOKING_AHEAD_MS) {
    throw new HttpError(400, "pickupAt must be a valid time in the next few days");
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    throw new HttpError(400, "items must be a non-empty array");
  }
  const quantities = /* @__PURE__ */ new Map();
  for (const item of items) {
    const id = typeof item?.id === "string" ? item.id : "";
    const validId = /^[^/]{1,100}$/.test(id) && id !== "." && id !== "..";
    if (!validId || !Number.isInteger(item.qty) || item.qty < 1) {
      throw new HttpError(400, "Each item needs a valid id and a whole-number qty of at least 1");
    }
    const qty = (quantities.get(id) ?? 0) + item.qty;
    if (qty > MAX_QTY_PER_ITEM) {
      throw new HttpError(400, `You can order at most ${MAX_QTY_PER_ITEM} of the same item`);
    }
    quantities.set(id, qty);
  }
  return {
    pickupName: customerName.trim(),
    pickupDate,
    items: [...quantities].map(([id, qty]) => ({ id, qty }))
  };
}
__name(parseRequest, "parseRequest");
async function reserveStock(env, { orderId, pickupName, pickupDate, items }) {
  return runTransaction(env, async (tx) => {
    const docs = await tx.getAll(items.map((item) => `menu/${item.id}`));
    const lines = [];
    const unavailable = [];
    for (const item of items) {
      const doc = docs.get(`menu/${item.id}`);
      const stock = Number(doc?.data.stock);
      if (!doc || doc.data.available === false || !(stock >= item.qty)) {
        unavailable.push({ id: item.id, name: doc?.data.name ?? item.id });
        continue;
      }
      const price = doc.data.price;
      if (!Number.isInteger(price) || price <= 0) {
        console.error(`[checkout] menu/${item.id} has an invalid price:`, price);
        throw new HttpError(500, "This item cannot be ordered right now");
      }
      lines.push({
        id: item.id,
        name: String(doc.data.name ?? item.id),
        price,
        qty: item.qty,
        remaining: stock - item.qty
      });
    }
    if (unavailable.length > 0) {
      const names = unavailable.map((u) => u.name).join(", ");
      throw new HttpError(
        409,
        `Sorry, ${names} just sold out or does not have enough left. Please update your cart.`,
        { unavailable: unavailable.map((u) => u.id) }
      );
    }
    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const createdAt = /* @__PURE__ */ new Date();
    const expiresAt = new Date(createdAt.getTime() + PAYMENT_WINDOW_MS);
    for (const line of lines) tx.update(`menu/${line.id}`, { stock: line.remaining });
    tx.create(`orders/${orderId}`, {
      status: ORDER_STATUS.PENDING,
      pickupName,
      pickupAt: pickupDate,
      items: lines.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total,
      stockDeducted: true,
      // lets releaseOrder() return the stock exactly once
      createdAt,
      expiresAt
    });
    return { lines, total, expiresAt };
  });
}
__name(reserveStock, "reserveStock");
async function requestQris(env, { orderId, pickupName, lines, total }) {
  const res = await fetch(`${midtransBaseUrl(env)}/v2/charge`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Accept: "application/json",
      Authorization: "Basic " + btoa(`${env.MIDTRANS_SERVER_KEY}:`)
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: total },
      item_details: lines.map((l) => ({
        id: l.id.slice(0, 50),
        price: l.price,
        quantity: l.qty,
        name: l.name.slice(0, 50)
      })),
      customer_details: { first_name: pickupName },
      qris: { acquirer: "gopay" },
      custom_expiry: { expiry_duration: PAYMENT_WINDOW_MS / 6e4, unit: "minute" }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !["200", "201"].includes(String(data.status_code))) {
    throw new Error(`Midtrans rejected the charge: ${data.status_message ?? res.status}`);
  }
  return data;
}
__name(requestQris, "requestQris");
async function onRequestPost({ request, env }) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return json({ error: "MIDTRANS_SERVER_KEY is not configured" }, 500);
  }
  let orderId = null;
  let stockReserved = false;
  try {
    assertFirebaseConfigured(env);
    let payload;
    try {
      payload = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }
    const { pickupName, pickupDate, items } = parseRequest(payload);
    orderId = `KL-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const reservation = await reserveStock(env, { orderId, pickupName, pickupDate, items });
    stockReserved = true;
    const charge = await requestQris(env, { orderId, pickupName, ...reservation });
    const qrAction = charge.actions?.find((a) => a.name === "generate-qr-code");
    await updateDocument(env, `orders/${orderId}`, { transactionId: charge.transaction_id ?? null }).catch(
      (err) => console.error("[checkout] could not store transactionId", orderId, err)
    );
    return json({
      orderId,
      status: ORDER_STATUS.PENDING,
      total: reservation.total,
      expiresAt: reservation.expiresAt.toISOString(),
      transactionStatus: charge.transaction_status,
      qrString: charge.qr_string,
      qrUrl: qrAction?.url ?? null
    });
  } catch (error) {
    if (orderId && (stockReserved || !(error instanceof HttpError))) {
      await releaseOrder(env, orderId, ORDER_STATUS.FAILED, "qris-request-failed").catch(
        (err) => console.error("[checkout] CRITICAL: could not restore stock for", orderId, err)
      );
    }
    if (error instanceof HttpError) {
      return json({ error: error.message, ...error.extra }, error.status);
    }
    console.error("[checkout] failed", orderId, error);
    return json({ error: "We could not create your payment right now. Please try again." }, stockReserved ? 502 : 500);
  }
}
__name(onRequestPost, "onRequestPost");

// api/sweep.js
async function onRequestGet({ env, waitUntil }) {
  try {
    assertFirebaseConfigured(env);
    if (waitUntil) {
      waitUntil(expireStaleOrders(env).catch((err) => console.error("[sweep] error:", err)));
    } else {
      expireStaleOrders(env).catch((err) => console.error("[sweep] error:", err));
    }
  } catch (error) {
    console.error("[sweep] configuration error:", error);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(onRequestGet, "onRequestGet");

// api/webhook.js
var json2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" }
}), "json");
async function computeSignature({ order_id, status_code, gross_amount }, serverKey) {
  const data = new TextEncoder().encode(`${order_id}${status_code}${gross_amount}${serverKey}`);
  const digest = await crypto.subtle.digest("SHA-512", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(computeSignature, "computeSignature");
async function onRequestPost2({ request, env }) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return json2({ error: "MIDTRANS_SERVER_KEY is not configured" }, 500);
  }
  let notification;
  try {
    notification = await request.json();
  } catch {
    return json2({ error: "Invalid JSON body" }, 400);
  }
  const expected = await computeSignature(notification, env.MIDTRANS_SERVER_KEY);
  if (expected !== notification.signature_key) {
    return json2({ error: "Invalid signature" }, 403);
  }
  const { order_id, transaction_status, fraud_status } = notification;
  const isPaid = (transaction_status === "settlement" || transaction_status === "capture") && (!fraud_status || fraud_status === "accept");
  const isFailed = ["deny", "cancel", "expire", "failure"].includes(transaction_status);
  console.log(`[webhook] order=${order_id} status=${transaction_status} paid=${isPaid} failed=${isFailed}`);
  try {
    if (isPaid) {
      await recordPayment(env, {
        orderId: order_id,
        grossAmount: Number(notification.gross_amount),
        transactionId: notification.transaction_id
      });
    } else if (isFailed) {
      await releaseOrder(env, order_id, ORDER_STATUS.FAILED, `midtrans-${transaction_status}`);
    }
  } catch (error) {
    console.error(`[webhook] error processing order ${order_id}:`, error);
    return json2({ error: "Internal Server Error" }, 500);
  }
  return json2({ received: true });
}
__name(onRequestPost2, "onRequestPost");

// ../.wrangler/tmp/pages-wnnID5/functionsRoutes-0.3201177957941487.mjs
var routes = [
  {
    routePath: "/api/checkout",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/sweep",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/webhook",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

------formdata-undici-092601410915--
