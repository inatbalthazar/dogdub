
!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="c1ff5b5c-5bfd-5601-a09c-e248af9b8a92")}catch(e){}}();
const h = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, m = globalThis, H = "10.70.0";
function Nt() {
  return At(m), m;
}
function At(t) {
  const e = t.__SENTRY__ = t.__SENTRY__ || {};
  return e.version = e.version || H, e[H] = e[H] || {};
}
function J(t, e, n = m) {
  const r = n.__SENTRY__ = n.__SENTRY__ || {}, s = r[H] = r[H] || {};
  return s[t] || (s[t] = e());
}
const Cn = [
  "debug",
  "info",
  "warn",
  "error",
  "log",
  "assert",
  "trace"
], Fr = "Sentry Logger ", Tt = {};
function Q(t) {
  if (!("console" in m))
    return t();
  const e = m.console, n = {}, r = Object.keys(Tt);
  r.forEach((s) => {
    const o = Tt[s];
    n[s] = e[s], e[s] = o;
  });
  try {
    return t();
  } finally {
    r.forEach((s) => {
      e[s] = n[s];
    });
  }
}
function jr() {
  pe().enabled = !0;
}
function Ur() {
  pe().enabled = !1;
}
function Dn() {
  return pe().enabled;
}
function Br(...t) {
  le("log", ...t);
}
function Hr(...t) {
  le("warn", ...t);
}
function Wr(...t) {
  le("error", ...t);
}
function le(t, ...e) {
  h && Dn() && Q(() => {
    m.console[t](`${Fr}[${t}]:`, ...e);
  });
}
function pe() {
  return h ? J("loggerSettings", () => ({ enabled: !1 })) : { enabled: !1 };
}
const d = {
  /** Enable logging. */
  enable: jr,
  /** Disable logging. */
  disable: Ur,
  /** Check if logging is enabled. */
  isEnabled: Dn,
  /** Log a message. */
  log: Br,
  /** Log a warning. */
  warn: Hr,
  /** Log an error. */
  error: Wr
}, Ln = 50, W = "?", Oe = /\(error: (.*)\)/, we = /captureMessage|captureException/;
function Pn(...t) {
  const e = t.sort((n, r) => n[0] - r[0]).map((n) => n[1]);
  return (n, r = 0, s = 0) => {
    const o = [], i = n.split(`
`);
    for (let a = r; a < i.length; a++) {
      let c = i[a];
      c.length > 1024 && (c = c.slice(0, 1024));
      const u = Oe.test(c) ? c.replace(Oe, "$1") : c;
      if (!u.includes("Error: ")) {
        for (const f of e) {
          const l = f(u);
          if (l) {
            o.push(l);
            break;
          }
        }
        if (o.length >= Ln + s)
          break;
      }
    }
    return Gr(o.slice(s));
  };
}
function qr(t) {
  return Array.isArray(t) ? Pn(...t) : t;
}
function Gr(t) {
  if (!t.length)
    return [];
  const e = Array.from(t);
  return /sentryWrapped/.test(_t(e).function || "") && e.pop(), e.reverse(), we.test(_t(e).function || "") && (e.pop(), we.test(_t(e).function || "") && e.pop()), e.slice(0, Ln).map((n) => ({
    ...n,
    filename: n.filename || _t(e).filename,
    function: n.function || W
  }));
}
function _t(t) {
  return t[t.length - 1] || {};
}
const $t = "<anonymous>";
function M(t) {
  try {
    return !t || typeof t != "function" ? $t : t.name || $t;
  } catch {
    return $t;
  }
}
function Ne(t) {
  const e = t.exception;
  if (e) {
    const n = [];
    try {
      return e.values.forEach((r) => {
        r.stacktrace.frames && n.push(...r.stacktrace.frames);
      }), n;
    } catch {
      return;
    }
  }
}
const rt = {}, Ae = {};
function q(t, e) {
  return rt[t] = rt[t] || [], rt[t].push(e), () => {
    const n = rt[t];
    if (n) {
      const r = n.indexOf(e);
      r !== -1 && n.splice(r, 1);
    }
  };
}
function G(t, e) {
  if (!Ae[t]) {
    Ae[t] = !0;
    try {
      e();
    } catch (n) {
      h && d.error(`Error while instrumenting ${t}`, n);
    }
  }
}
function k(t, e) {
  const n = t && rt[t];
  if (n)
    for (const r of n)
      try {
        r(e);
      } catch (s) {
        h && d.error(
          `Error while triggering instrumentation handler.
Type: ${t}
Name: ${M(r)}
Error:`,
          s
        );
      }
}
let Ft = null;
function zr(t) {
  const e = "error";
  q(e, t), G(e, Yr);
}
function Yr() {
  Ft = m.onerror, m.onerror = function(t, e, n, r, s) {
    return k("error", {
      column: r,
      error: s,
      line: n,
      msg: t,
      url: e
    }), Ft ? Ft.apply(this, arguments) : !1;
  }, m.onerror.__SENTRY_INSTRUMENTED__ = !0;
}
let jt = null;
function Vr(t) {
  const e = "unhandledrejection";
  q(e, t), G(e, Kr);
}
function Kr() {
  jt = m.onunhandledrejection, m.onunhandledrejection = function(t) {
    return k("unhandledrejection", t), jt ? jt.apply(this, arguments) : !0;
  }, m.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0;
}
const Mn = Object.prototype.toString;
function x(t) {
  switch (Mn.call(t)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
    case "[object WebAssembly.Exception]":
      return !0;
    default:
      return ge(t, Error);
  }
}
function Z(t, e) {
  return Mn.call(t) === `[object ${e}]`;
}
function $n(t) {
  return Z(t, "ErrorEvent");
}
function xe(t) {
  return Z(t, "DOMError");
}
function Xr(t) {
  return Z(t, "DOMException");
}
function N(t) {
  return Z(t, "String");
}
function de(t) {
  return typeof t == "object" && t !== null && "__sentry_template_string__" in t && "__sentry_template_values__" in t;
}
function ft(t) {
  return t === null || de(t) || typeof t != "object" && typeof t != "function";
}
function Rt(t) {
  return Z(t, "Object");
}
function xt(t) {
  return typeof t == "object" && t !== null;
}
function Ct(t) {
  return typeof Event < "u" && ge(t, Event);
}
function Jr(t) {
  return Z(t, "RegExp");
}
function lt(t) {
  return !!(t?.then && typeof t.then == "function");
}
function ge(t, e) {
  try {
    return t instanceof e;
  } catch {
    return !1;
  }
}
function Fn(t) {
  return typeof Request < "u" && ge(t, Request);
}
function I(t, e, n) {
  if (!(e in t))
    return;
  const r = t[e];
  if (typeof r != "function")
    return;
  const s = n(r);
  typeof s == "function" && jn(s, r);
  try {
    t[e] = s;
  } catch {
    h && d.log(`Failed to replace method "${e}" in object`, t);
  }
}
function $(t, e, n) {
  try {
    Object.defineProperty(t, e, {
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: n,
      writable: !0,
      configurable: !0
    });
  } catch {
    h && d.log(`Failed to add non-enumerable property "${String(e)}" to object`, t);
  }
}
function jn(t, e) {
  try {
    const n = e.prototype || {};
    t.prototype = e.prototype = n, $(t, "__sentry_original__", e);
  } catch {
  }
}
function he(t) {
  return t.__sentry_original__;
}
function Un(t) {
  if (x(t))
    return {
      message: t.message,
      name: t.name,
      stack: t.stack,
      ...Ce(t)
    };
  if (Ct(t)) {
    const { type: e, target: n, currentTarget: r, detail: s } = t;
    return {
      type: e,
      target: n,
      currentTarget: r,
      ...s ? { detail: s } : {},
      ...Ce(t)
    };
  }
  return t;
}
function Ce(t) {
  return xt(t) ? Object.fromEntries(Object.entries(t)) : {};
}
function Qr(t) {
  const e = Object.keys(Un(t));
  return e.sort(), e[0] ? e.join(", ") : "[object has no keys]";
}
let Y;
function Dt(t) {
  if (Y !== void 0)
    return Y ? Y(t) : t();
  const e = /* @__PURE__ */ Symbol.for("__SENTRY_SAFE_RANDOM_ID_WRAPPER__"), n = m;
  return e in n && typeof n[e] == "function" ? (Y = n[e], Y(t)) : (Y = null, t());
}
function kt() {
  return Dt(() => Math.random());
}
function tt() {
  return Dt(() => Date.now());
}
const Zr = /* @__PURE__ */ Symbol.for("sentry.skipNormalization"), ts = /* @__PURE__ */ Symbol.for("sentry.overrideNormalizationDepth");
function es(t) {
  return !!t[Zr];
}
function ns(t) {
  const e = t[ts];
  return typeof e == "number" ? e : void 0;
}
let zt;
function rs(t) {
  zt = t;
}
function w(t, e = 100, n = 1 / 0) {
  try {
    return Yt("", t, e, n);
  } catch (r) {
    return { ERROR: `**non-serializable** (${r})` };
  }
}
function Bn(t, e = 3, n = 100 * 1024) {
  const r = w(t, e);
  return is(r) > n ? Bn(t, e - 1, n) : r;
}
function Yt(t, e, n = 1 / 0, r = 1 / 0, s = as()) {
  const [o, i] = s;
  if (e == null || // this matches null and undefined -> eqeq not eqeqeq
  ["boolean", "string"].includes(typeof e) || typeof e == "number" && Number.isFinite(e))
    return e;
  const a = Hn(t, e);
  if (!a.startsWith("[object "))
    return a;
  if (es(e))
    return e;
  const c = ns(e), u = c !== void 0 ? c : n;
  if (u === 0)
    return a.replace("object ", "");
  if (o(e))
    return "[Circular ~]";
  const f = e;
  if (f && typeof f.toJSON == "function")
    try {
      const _ = f.toJSON();
      return Yt("", _, u - 1, r, s);
    } catch {
    }
  const l = Array.isArray(e) ? [] : {};
  let g = 0;
  const p = Un(e);
  for (const _ in p) {
    if (!Object.prototype.hasOwnProperty.call(p, _))
      continue;
    if (g >= r) {
      l[_] = "[MaxProperties ~]";
      break;
    }
    const b = p[_];
    l[_] = Yt(_, b, u - 1, r, s), g++;
  }
  return i(e), l;
}
function Hn(t, e) {
  try {
    if (zt) {
      const r = zt(e);
      if (r)
        return r;
    }
    return typeof global < "u" && e === global ? "[Global]" : typeof e == "number" && !Number.isFinite(e) ? `[${e}]` : typeof e == "function" ? `[Function: ${M(e)}]` : typeof e == "symbol" ? `[${String(e)}]` : typeof e == "bigint" ? `[BigInt: ${String(e)}]` : `[object ${ss(e)}]`;
  } catch (n) {
    return `**non-serializable** (${n})`;
  }
}
function ss(t) {
  const e = Object.getPrototypeOf(t);
  return e?.constructor ? e.constructor.name : "null prototype";
}
function os(t) {
  return ~-encodeURI(t).split(/%..|./).length;
}
function is(t) {
  return os(JSON.stringify(t));
}
function as() {
  const t = /* @__PURE__ */ new WeakSet();
  function e(r) {
    return t.has(r) ? !0 : (t.add(r), !1);
  }
  function n(r) {
    t.delete(r);
  }
  return [e, n];
}
function Vt(t, e = 0) {
  return typeof t != "string" || e === 0 || t.length <= e ? t : `${t.slice(0, e)}...`;
}
function Ot(t, e) {
  if (!Array.isArray(t))
    return "";
  const n = [];
  for (let r = 0; r < t.length; r++) {
    const s = t[r];
    ft(s) ? n.push(String(s)) : s instanceof Error ? n.push(s.message ? `${s.name}: ${s.message}` : s.name) : n.push(Hn(void 0, s));
  }
  return n.join(e);
}
function ot(t, e, n = !1) {
  return N(t) ? Jr(e) ? e.test(t) : N(e) ? n ? t === e : t.includes(e) : typeof e == "function" ? e(t) : !1 : !1;
}
function pt(t, e = [], n = !1) {
  for (const r of e)
    if (ot(t, r, n))
      return !0;
  return !1;
}
function cs() {
  const t = m;
  return t.crypto || t.msCrypto;
}
let Ut;
function us() {
  return kt() * 16;
}
function T(t = cs()) {
  try {
    if (t?.randomUUID)
      return Dt(() => t.randomUUID()).replace(/-/g, "");
  } catch {
  }
  return Ut || (Ut = "10000000100040008000" + 1e11), Ut.replace(
    /[018]/g,
    (e) => (
      // eslint-disable-next-line no-bitwise
      (e ^ (us() & 15) >> e / 4).toString(16)
    )
  );
}
function Wn(t) {
  return t.exception?.values?.[0];
}
function B(t) {
  const { message: e, event_id: n } = t;
  if (e)
    return e;
  const r = Wn(t);
  return r ? r.type && r.value ? `${r.type}: ${r.value}` : r.type || r.value || n || "<unknown>" : n || "<unknown>";
}
function Kt(t, e, n) {
  const r = t.exception = t.exception || {}, s = r.values = r.values || [], o = s[0] = s[0] || {};
  o.value || (o.value = e || ""), o.type || (o.type = "Error");
}
function P(t, e) {
  const n = Wn(t);
  if (!n)
    return;
  const r = { type: "generic", handled: !0 }, s = n.mechanism;
  if (n.mechanism = { ...r, ...s, ...e }, e && "data" in e) {
    const o = { ...s?.data, ...e.data };
    n.mechanism.data = o;
  }
}
function De(t) {
  if (fs(t))
    return !0;
  try {
    $(t, "__sentry_captured__", !0);
  } catch {
  }
  return !1;
}
function fs(t) {
  try {
    return t.__sentry_captured__;
  } catch {
  }
}
const qn = 1e3;
function dt() {
  return tt() / qn;
}
function ls() {
  const { performance: t } = m;
  if (!t?.now || !t.timeOrigin)
    return dt;
  const e = t.timeOrigin;
  return () => (e + Dt(() => t.now())) / qn;
}
let Le;
function A() {
  return (Le ?? (Le = ls()))();
}
function ps(t) {
  const e = A(), n = {
    sid: T(),
    init: !0,
    timestamp: e,
    started: e,
    duration: 0,
    status: "ok",
    errors: 0,
    ignoreDuration: !1,
    toJSON: () => gs(n)
  };
  return t && V(n, t), n;
}
function V(t, e = {}) {
  if (e.user && (!t.ipAddress && e.user.ip_address && (t.ipAddress = e.user.ip_address), !t.did && !e.did && (t.did = e.user.id || e.user.email || e.user.username)), t.timestamp = e.timestamp || A(), e.abnormal_mechanism && (t.abnormal_mechanism = e.abnormal_mechanism), e.ignoreDuration && (t.ignoreDuration = e.ignoreDuration), e.sid && (t.sid = e.sid.length === 32 ? e.sid : T()), e.init !== void 0 && (t.init = e.init), !t.did && e.did && (t.did = `${e.did}`), typeof e.started == "number" && (t.started = e.started), t.ignoreDuration)
    t.duration = void 0;
  else if (typeof e.duration == "number")
    t.duration = e.duration;
  else {
    const n = t.timestamp - t.started;
    t.duration = n >= 0 ? n : 0;
  }
  e.release && (t.release = e.release), e.environment && (t.environment = e.environment), !t.ipAddress && e.ipAddress && (t.ipAddress = e.ipAddress), !t.userAgent && e.userAgent && (t.userAgent = e.userAgent), typeof e.errors == "number" && (t.errors = e.errors), e.status && (t.status = e.status);
}
function ds(t, e) {
  let n = {};
  t.status === "ok" && (n = { status: "exited" }), V(t, n);
}
function gs(t) {
  return {
    sid: `${t.sid}`,
    init: t.init,
    // Make sure that sec is converted to ms for date constructor
    started: new Date(t.started * 1e3).toISOString(),
    timestamp: new Date(t.timestamp * 1e3).toISOString(),
    status: t.status,
    errors: t.errors,
    did: typeof t.did == "number" || typeof t.did == "string" ? `${t.did}` : void 0,
    duration: t.duration,
    abnormal_mechanism: t.abnormal_mechanism,
    attrs: {
      release: t.release,
      environment: t.environment,
      ip_address: t.ipAddress,
      user_agent: t.userAgent
    }
  };
}
function gt(t, e, n = 2) {
  if (!e || typeof e != "object" || n <= 0)
    return e;
  if (t && Object.keys(e).length === 0)
    return t;
  const r = { ...t };
  for (const s in e)
    Object.prototype.hasOwnProperty.call(e, s) && (r[s] = gt(r[s], e[s], n - 1));
  return r;
}
function Pe() {
  return T();
}
function Gn() {
  return T().substring(16);
}
function hs(t) {
  try {
    const e = m.WeakRef;
    if (typeof e == "function")
      return new e(t);
  } catch {
  }
  return t;
}
function zn(t) {
  if (t) {
    if (typeof t == "object" && "deref" in t && typeof t.deref == "function")
      try {
        return t.deref();
      } catch {
        return;
      }
    return t;
  }
}
const Xt = "_sentrySpan";
function Me(t, e) {
  e ? $(t, Xt, hs(e)) : delete t[Xt];
}
function $e(t) {
  return zn(t[Xt]);
}
const ms = 100;
class O {
  // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.
  constructor() {
    this._notifyingListeners = !1, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._attributes = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = {
      traceId: Pe(),
      sampleRand: kt()
    };
  }
  /**
   * Clone all data from this scope into a new scope.
   */
  clone() {
    const e = new O();
    return e._breadcrumbs = [...this._breadcrumbs], e._tags = { ...this._tags }, e._attributes = { ...this._attributes }, e._extra = { ...this._extra }, e._contexts = { ...this._contexts }, this._contexts.flags && (e._contexts.flags = {
      values: [...this._contexts.flags.values]
    }), e._user = this._user, e._level = this._level, e._session = this._session, e._transactionName = this._transactionName, e._fingerprint = this._fingerprint, e._eventProcessors = [...this._eventProcessors], e._attachments = [...this._attachments], e._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, e._propagationContext = { ...this._propagationContext }, e._client = this._client, e._lastEventId = this._lastEventId, e._conversationId = this._conversationId, Me(e, $e(this)), e;
  }
  /**
   * Update the client assigned to this scope.
   * Note that not every scope will have a client assigned - isolation scopes & the global scope will generally not have a client,
   * as well as manually created scopes.
   */
  setClient(e) {
    this._client = e;
  }
  /**
   * Set the ID of the last captured error event.
   * This is generally only captured on the isolation scope.
   */
  setLastEventId(e) {
    this._lastEventId = e;
  }
  /**
   * Get the client assigned to this scope.
   */
  getClient() {
    return this._client;
  }
  /**
   * Get the ID of the last captured error event.
   * This is generally only available on the isolation scope.
   */
  lastEventId() {
    return this._lastEventId;
  }
  /**
   * @inheritDoc
   */
  addScopeListener(e) {
    this._scopeListeners.push(e);
  }
  /**
   * Add an event processor that will be called before an event is sent.
   */
  addEventProcessor(e) {
    return this._eventProcessors.push(e), this;
  }
  /**
   * Set the user for this scope.
   * Set to `null` to unset the user.
   */
  setUser(e) {
    return this._user = e || {
      email: void 0,
      id: void 0,
      ip_address: void 0,
      username: void 0
    }, this._session && V(this._session, { user: e }), this._notifyScopeListeners(), this;
  }
  /**
   * Get the user from this scope.
   */
  getUser() {
    return this._user;
  }
  /**
   * Set the conversation ID for this scope.
   * Set to `null` to unset the conversation ID.
   */
  setConversationId(e) {
    return this._conversationId = e || void 0, this._notifyScopeListeners(), this;
  }
  /**
   * Set an object that will be merged into existing tags on the scope,
   * and will be sent as tags data with the event.
   */
  setTags(e) {
    return this._tags = {
      ...this._tags,
      ...e
    }, this._notifyScopeListeners(), this;
  }
  /**
   * Set a single tag that will be sent as tags data with the event.
   */
  setTag(e, n) {
    return this.setTags({ [e]: n });
  }
  /**
   * Sets attributes onto the scope.
   *
   * These attributes are applied to logs, metrics and streamed spans.
   *
   * Supported attribute value types are `string`, `number`, `boolean`, `string[]`, `number[]` and `boolean[]`.
   *
   * @param newAttributes - The attributes to set on the scope, as key-value pairs.
   *
   * @example
   * ```typescript
   * scope.setAttributes({
   *   is_admin: true,
   *   payment_selection: 'credit_card',
   *   render_duration: 150,
   * });
   * ```
   */
  setAttributes(e) {
    return this._attributes = {
      ...this._attributes,
      ...e
    }, this._notifyScopeListeners(), this;
  }
  /**
   * Sets an attribute onto the scope.
   *
   * These attributes are applied to logs, metrics and streamed spans.
   *
   * Supported attribute value types are `string`, `number`, `boolean`, `string[]`, `number[]` and `boolean[]`.
   *
   * @param key - The attribute key.
   * @param value - The attribute value.
   *
   * @example
   * ```typescript
   * scope.setAttribute('is_admin', true);
   * scope.setAttribute('render_duration', 150);
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAttribute(e, n) {
    return this.setAttributes({ [e]: n });
  }
  /**
   * Removes the attribute with the given key from the scope.
   *
   * @param key - The attribute key.
   *
   * @example
   * ```typescript
   * scope.removeAttribute('is_admin');
   * ```
   */
  removeAttribute(e) {
    return e in this._attributes && (delete this._attributes[e], this._notifyScopeListeners()), this;
  }
  /**
   * Set an object that will be merged into existing extra on the scope,
   * and will be sent as extra data with the event.
   */
  setExtras(e) {
    return this._extra = {
      ...this._extra,
      ...e
    }, this._notifyScopeListeners(), this;
  }
  /**
   * Set a single key:value extra entry that will be sent as extra data with the event.
   */
  setExtra(e, n) {
    return this._extra = { ...this._extra, [e]: n }, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the fingerprint on the scope to send with the events.
   * @param {string[]} fingerprint Fingerprint to group events in Sentry.
   */
  setFingerprint(e) {
    return this._fingerprint = e, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the level on the scope for future events.
   */
  setLevel(e) {
    return this._level = e, this._notifyScopeListeners(), this;
  }
  /**
   * Sets the transaction name on the scope so that the name of e.g. taken server route or
   * the page location is attached to future events.
   *
   * IMPORTANT: Calling this function does NOT change the name of the currently active
   * root span. If you want to change the name of the active root span, use
   * `Sentry.updateSpanName(rootSpan, 'new name')` instead.
   *
   * By default, the SDK updates the scope's transaction name automatically on sensible
   * occasions, such as a page navigation or when handling a new request on the server.
   */
  setTransactionName(e) {
    return this._transactionName = e, this._notifyScopeListeners(), this;
  }
  /**
   * Sets context data with the given name.
   * Data passed as context will be normalized. You can also pass `null` to unset the context.
   * Note that context data will not be merged - calling `setContext` will overwrite an existing context with the same key.
   */
  setContext(e, n) {
    return n === null ? delete this._contexts[e] : this._contexts[e] = n, this._notifyScopeListeners(), this;
  }
  /**
   * Set the session for the scope.
   */
  setSession(e) {
    return e ? this._session = e : delete this._session, this._notifyScopeListeners(), this;
  }
  /**
   * Get the session from the scope.
   */
  getSession() {
    return this._session;
  }
  /**
   * Updates the scope with provided data. Can work in three variations:
   * - plain object containing updatable attributes
   * - Scope instance that'll extract the attributes from
   * - callback function that'll receive the current scope as an argument and allow for modifications
   */
  update(e) {
    if (!e)
      return this;
    const n = typeof e == "function" ? e(this) : e, r = n instanceof O ? n.getScopeData() : Rt(n) ? e : void 0, {
      tags: s,
      attributes: o,
      extra: i,
      user: a,
      contexts: c,
      level: u,
      fingerprint: f = [],
      propagationContext: l,
      conversationId: g
    } = r || {};
    return this._tags = { ...this._tags, ...s }, this._attributes = { ...this._attributes, ...o }, this._extra = { ...this._extra, ...i }, this._contexts = { ...this._contexts, ...c }, a && Object.keys(a).length && (this._user = a), u && (this._level = u), f.length && (this._fingerprint = f), l && (this._propagationContext = l), g && (this._conversationId = g), this;
  }
  /**
   * Clears the current scope and resets its properties.
   * Note: The client will not be cleared.
   */
  clear() {
    return this._breadcrumbs = [], this._tags = {}, this._attributes = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._session = void 0, this._conversationId = void 0, Me(this, void 0), this._attachments = [], this.setPropagationContext({
      traceId: Pe(),
      sampleRand: kt()
    }), this._notifyScopeListeners(), this;
  }
  /**
   * Adds a breadcrumb to the scope.
   * By default, the last 100 breadcrumbs are kept.
   */
  addBreadcrumb(e, n) {
    const r = typeof n == "number" ? n : ms;
    if (r <= 0)
      return this;
    const s = {
      timestamp: dt(),
      ...e,
      // Breadcrumb messages can theoretically be infinitely large and they're held in memory so we truncate them not to leak (too much) memory
      message: e.message ? Vt(e.message, 2048) : e.message
    };
    return this._breadcrumbs.push(s), this._breadcrumbs.length > r && (this._breadcrumbs = this._breadcrumbs.slice(-r), this._client?.recordDroppedEvent("buffer_overflow", "log_item")), this._notifyScopeListeners(), this;
  }
  /**
   * Get the last breadcrumb of the scope.
   */
  getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }
  /**
   * Clear all breadcrumbs from the scope.
   */
  clearBreadcrumbs() {
    return this._breadcrumbs = [], this._notifyScopeListeners(), this;
  }
  /**
   * Add an attachment to the scope.
   */
  addAttachment(e) {
    return this._attachments.push(e), this;
  }
  /**
   * Clear all attachments from the scope.
   */
  clearAttachments() {
    return this._attachments = [], this;
  }
  /**
   * Get the data of this scope, which should be applied to an event during processing.
   */
  getScopeData() {
    return {
      breadcrumbs: this._breadcrumbs,
      attachments: this._attachments,
      contexts: this._contexts,
      tags: this._tags,
      attributes: this._attributes,
      extra: this._extra,
      user: this._user,
      level: this._level,
      fingerprint: this._fingerprint || [],
      eventProcessors: this._eventProcessors,
      propagationContext: this._propagationContext,
      sdkProcessingMetadata: this._sdkProcessingMetadata,
      transactionName: this._transactionName,
      span: $e(this),
      conversationId: this._conversationId
    };
  }
  /**
   * Add data which will be accessible during event processing but won't get sent to Sentry.
   */
  setSDKProcessingMetadata(e) {
    return this._sdkProcessingMetadata = gt(this._sdkProcessingMetadata, e, 2), this;
  }
  /**
   * Add propagation context to the scope, used for distributed tracing
   */
  setPropagationContext(e) {
    return this._propagationContext = e, this;
  }
  /**
   * Get propagation context from the scope, used for distributed tracing
   */
  getPropagationContext() {
    return this._propagationContext;
  }
  /**
   * Capture an exception for this scope.
   *
   * @returns {string} The id of the captured Sentry event.
   */
  captureException(e, n) {
    const r = n?.event_id || T();
    if (!this._client)
      return h && d.warn("No client configured on scope - will not capture exception!"), r;
    const s = new Error("Sentry syntheticException");
    return this._client.captureException(
      e,
      {
        originalException: e,
        syntheticException: s,
        ...n,
        event_id: r
      },
      this
    ), r;
  }
  /**
   * Capture a message for this scope.
   *
   * @returns {string} The id of the captured message.
   */
  captureMessage(e, n, r) {
    const s = r?.event_id || T();
    if (!this._client)
      return h && d.warn("No client configured on scope - will not capture message!"), s;
    const o = r?.syntheticException ?? new Error(e);
    return this._client.captureMessage(
      e,
      n,
      {
        originalException: e,
        syntheticException: o,
        ...r,
        event_id: s
      },
      this
    ), s;
  }
  /**
   * Capture a Sentry event for this scope.
   *
   * @returns {string} The id of the captured event.
   */
  captureEvent(e, n) {
    const r = e.event_id || n?.event_id || T();
    return this._client ? (this._client.captureEvent(e, { ...n, event_id: r }, this), r) : (h && d.warn("No client configured on scope - will not capture event!"), r);
  }
  /**
   * This will be called on every set call.
   */
  _notifyScopeListeners() {
    this._notifyingListeners || (this._notifyingListeners = !0, this._scopeListeners.forEach((e) => {
      e(this);
    }), this._notifyingListeners = !1);
  }
}
function _s() {
  return J("defaultCurrentScope", () => new O());
}
function ys() {
  return J("defaultIsolationScope", () => new O());
}
const Fe = (t) => t instanceof Promise && !t[Yn], Yn = /* @__PURE__ */ Symbol("chained PromiseLike"), Es = (t, e, n) => {
  const r = t.then(
    (s) => (e(s), s),
    (s) => {
      throw n(s), s;
    }
  );
  return Fe(r) && Fe(t) ? r : Ss(t, r);
}, Ss = (t, e) => {
  if (!e) return t;
  let n = !1;
  for (const r in t) {
    if (r in e) continue;
    n = !0;
    const s = t[r];
    typeof s == "function" ? Object.defineProperty(e, r, {
      value: (...o) => s.apply(t, o),
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : e[r] = s;
  }
  return n && Object.assign(e, { [Yn]: !0 }), e;
};
class bs {
  constructor(e, n) {
    let r;
    e ? r = e : r = new O();
    let s;
    n ? s = n : s = new O(), this._stack = [{ scope: r }], this._isolationScope = s;
  }
  /**
   * Fork a scope for the stack.
   */
  withScope(e) {
    const n = this._pushScope();
    let r;
    try {
      r = e(n);
    } catch (s) {
      throw this._popScope(), s;
    }
    return lt(r) ? Es(
      r,
      () => this._popScope(),
      () => this._popScope()
    ) : (this._popScope(), r);
  }
  /**
   * Get the client of the stack.
   */
  getClient() {
    return this.getStackTop().client;
  }
  /**
   * Returns the scope of the top stack.
   */
  getScope() {
    return this.getStackTop().scope;
  }
  /**
   * Get the isolation scope for the stack.
   */
  getIsolationScope() {
    return this._isolationScope;
  }
  /**
   * Returns the topmost scope layer in the order domain > local > process.
   */
  getStackTop() {
    return this._stack[this._stack.length - 1];
  }
  /**
   * Push a scope to the stack.
   */
  _pushScope() {
    const e = this.getScope().clone();
    return this._stack.push({
      client: this.getClient(),
      scope: e
    }), e;
  }
  /**
   * Pop a scope from the stack.
   */
  _popScope() {
    return this._stack.length <= 1 ? !1 : !!this._stack.pop();
  }
}
function K() {
  const t = Nt(), e = At(t);
  return e.stack = e.stack || new bs(_s(), ys());
}
function vs(t) {
  return K().withScope(t);
}
function Is(t, e) {
  const n = K();
  return n.withScope(() => (n.getStackTop().scope = t, e(t)));
}
function je(t) {
  return K().withScope(() => t(K().getIsolationScope()));
}
function Ts() {
  return {
    withIsolationScope: je,
    withScope: vs,
    withSetScope: Is,
    withSetIsolationScope: (t, e) => je(e),
    getCurrentScope: () => K().getScope(),
    getIsolationScope: () => K().getIsolationScope()
  };
}
function me(t) {
  const e = At(t);
  return e.acs ? e.acs : Ts();
}
function Rs(t) {
  return typeof t == "object" && t != null && !Array.isArray(t) && Object.keys(t).includes("value");
}
function ks(t, e) {
  const { value: n, unit: r } = Rs(t) ? t : { value: t, unit: void 0 }, s = Os(n), o = r && typeof r == "string" ? { unit: r } : {};
  if (s)
    return { ...s, ...o };
  if (!e || e === "skip-undefined" && n === void 0)
    return;
  let i = "";
  try {
    i = JSON.stringify(n) ?? "";
  } catch {
  }
  return {
    value: i,
    type: "string",
    ...o
  };
}
function Ue(t, e = !1) {
  const n = {};
  for (const [r, s] of Object.entries(t ?? {})) {
    const o = ks(s, e);
    o && (n[r] = o);
  }
  return n;
}
function Os(t) {
  if (Array.isArray(t))
    return { value: t, type: "array" };
  const e = typeof t == "string" ? "string" : typeof t == "boolean" ? "boolean" : typeof t == "number" && !Number.isNaN(t) ? Number.isInteger(t) ? "integer" : "double" : null;
  if (e)
    return { value: t, type: e };
}
function C() {
  const t = Nt();
  return me(t).getCurrentScope();
}
function z() {
  const t = Nt();
  return me(t).getIsolationScope();
}
function ws() {
  return J("globalScope", () => new O());
}
function _e(...t) {
  const e = Nt(), n = me(e);
  if (t.length === 2) {
    const [r, s] = t;
    return r ? n.withSetScope(r, s) : n.withScope(s);
  }
  return n.withScope(t[0]);
}
function S() {
  return C().getClient();
}
function Ns(t) {
  const e = t.getPropagationContext(), { traceId: n, parentSpanId: r, propagationSpanId: s } = e, o = {
    trace_id: n,
    span_id: s || Gn()
  };
  return r && (o.parent_span_id = r), o;
}
const As = "sentry.source", xs = "sentry.sample_rate", Cs = "sentry.previous_trace_sample_rate", Vn = "sentry.op", Ds = "sentry.origin", Kn = "sentry.profile_id", Xn = "sentry.exclusive_time", Ls = "gen_ai.conversation.id", Ps = 0, Ms = 1, $s = "_sentryScope", Fs = "_sentryIsolationScope";
function Jt(t) {
  const e = t;
  return {
    scope: e[$s],
    isolationScope: zn(e[Fs])
  };
}
const Be = "sentry-";
function js(t) {
  const e = Us(t);
  if (!e)
    return;
  const n = Object.entries(e).reduce((r, [s, o]) => {
    if (s.startsWith(Be)) {
      const i = s.slice(Be.length);
      r[i] = o;
    }
    return r;
  }, {});
  if (Object.keys(n).length > 0)
    return n;
}
function Us(t) {
  if (!(!t || !N(t) && !Array.isArray(t)))
    return Array.isArray(t) ? t.reduce((e, n) => {
      const r = He(n);
      return Object.entries(r).forEach(([s, o]) => {
        e[s] = o;
      }), e;
    }, {}) : He(t);
}
function He(t) {
  return t.split(",").map((e) => {
    const n = e.indexOf("=");
    if (n === -1)
      return [];
    const r = e.slice(0, n), s = e.slice(n + 1);
    return [r, s].map((o) => {
      try {
        return decodeURIComponent(o.trim());
      } catch {
        return;
      }
    });
  }).reduce((e, [n, r]) => (n && r && (e[n] = r), e), {});
}
const Bs = /^o(\d+)\./, Hs = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)((?:\[[:.%\w]+\]|[\w.-]+))(?::(\d+))?\/(.+)/;
function Ws(t) {
  return t === "http" || t === "https";
}
function ht(t, e = !1) {
  const { host: n, path: r, pass: s, port: o, projectId: i, protocol: a, publicKey: c } = t;
  return `${a}://${c}${e && s ? `:${s}` : ""}@${n}${o ? `:${o}` : ""}/${r && `${r}/`}${i}`;
}
function qs(t) {
  const e = Hs.exec(t);
  if (!e) {
    Q(() => {
      console.error(`Invalid Sentry Dsn: ${t}`);
    });
    return;
  }
  const [n, r, s = "", o = "", i = "", a = ""] = e.slice(1);
  let c = "", u = a;
  const f = u.split("/");
  if (f.length > 1 && (c = f.slice(0, -1).join("/"), u = f.pop()), u) {
    const l = u.match(/^\d+/);
    l && (u = l[0]);
  }
  return Jn({ host: o, pass: s, path: c, projectId: u, port: i, protocol: n, publicKey: r });
}
function Jn(t) {
  return {
    protocol: t.protocol,
    publicKey: t.publicKey || "",
    pass: t.pass || "",
    host: t.host,
    port: t.port || "",
    path: t.path || "",
    projectId: t.projectId
  };
}
function Gs(t) {
  if (!h)
    return !0;
  const { port: e, projectId: n, protocol: r } = t;
  return ["protocol", "publicKey", "host", "projectId"].find((i) => t[i] ? !1 : (d.error(`Invalid Sentry Dsn: ${i} missing`), !0)) ? !1 : n.match(/^\d+$/) ? Ws(r) ? e && isNaN(parseInt(e, 10)) ? (d.error(`Invalid Sentry Dsn: Invalid port ${e}`), !1) : !0 : (d.error(`Invalid Sentry Dsn: Invalid protocol ${r}`), !1) : (d.error(`Invalid Sentry Dsn: Invalid projectId ${n}`), !1);
}
function zs(t) {
  return t.match(Bs)?.[1];
}
function Ys(t) {
  const e = t.getOptions(), { host: n } = t.getDsn() || {};
  let r;
  return e.orgId ? r = String(e.orgId) : n && (r = zs(n)), r;
}
function Vs(t) {
  const e = typeof t == "string" ? qs(t) : Jn(t);
  if (!(!e || !Gs(e)))
    return e;
}
function Ks(t) {
  if (typeof t == "boolean")
    return Number(t);
  const e = typeof t == "string" ? parseFloat(t) : t;
  if (!(typeof e != "number" || isNaN(e) || e < 0 || e > 1))
    return e;
}
const Qn = 1;
let We = !1;
function Xs(t) {
  const { spanId: e, traceId: n, isRemote: r } = t.spanContext(), s = r ? e : Lt(t).parent_span_id, o = Jt(t).scope, i = r ? o?.getPropagationContext().propagationSpanId || Gn() : e;
  return {
    parent_span_id: s,
    span_id: i,
    trace_id: n
  };
}
function Js(t) {
  if (t && t.length > 0)
    return t.map(({ context: { spanId: e, traceId: n, traceFlags: r, ...s }, attributes: o }) => ({
      span_id: e,
      trace_id: n,
      sampled: r === Qn,
      attributes: o,
      ...s
    }));
}
function qe(t) {
  return typeof t == "number" ? Ge(t) : Array.isArray(t) ? t[0] + t[1] / 1e9 : t instanceof Date ? Ge(t.getTime()) : A();
}
function Ge(t) {
  return t > 9999999999 ? t / 1e3 : t;
}
function Lt(t) {
  if (eo(t))
    return t.getSpanJSON();
  const { spanId: e, traceId: n } = t.spanContext();
  if (to(t)) {
    const { attributes: r, startTime: s, name: o, endTime: i, status: a, links: c } = t;
    return {
      span_id: e,
      trace_id: n,
      data: r,
      description: o,
      parent_span_id: Qs(t),
      start_timestamp: qe(s),
      // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
      timestamp: qe(i) || void 0,
      status: ro(a),
      op: r[Vn],
      origin: r[Ds],
      links: Js(c)
    };
  }
  return {
    span_id: e,
    trace_id: n,
    start_timestamp: 0,
    data: {}
  };
}
function Qs(t) {
  return "parentSpanId" in t ? t.parentSpanId : "parentSpanContext" in t ? t.parentSpanContext?.spanId : void 0;
}
function Zs(t) {
  return {
    ...t,
    attributes: Ue(t.attributes),
    links: t.links?.map((e) => ({
      ...e,
      attributes: Ue(e.attributes)
    }))
  };
}
function to(t) {
  const e = t;
  return !!e.attributes && !!e.startTime && !!e.name && !!e.endTime && !!e.status;
}
function eo(t) {
  return typeof t.getSpanJSON == "function";
}
function no(t) {
  const { traceFlags: e } = t.spanContext();
  return e === Qn;
}
function ro(t) {
  if (!(!t || t.code === Ps))
    return t.code === Ms ? "ok" : t.message || "internal_error";
}
const so = "_sentryRootSpan", Zn = oo;
function oo(t) {
  return t[so] || t;
}
function ze() {
  We || (Q(() => {
    console.warn(
      "[Sentry] Returning null from `beforeSendSpan` is disallowed. To drop certain spans, configure the respective integrations directly or use `ignoreSpans`."
    );
  }), We = !0);
}
function Ye(t) {
  if (typeof __SENTRY_TRACING__ == "boolean" && !__SENTRY_TRACING__)
    return !1;
  const e = t || S()?.getOptions();
  return !!e && // Note: This check is `!= null`, meaning "nullish". `0` is not "nullish", `undefined` and `null` are. (This comment was brought to you by 15 minutes of questioning life)
  (e.tracesSampleRate != null || !!e.tracesSampler);
}
function Ve(t) {
  d.log(`Ignoring span ${t.op} - ${t.description} because it matches \`ignoreSpans\`.`);
}
function Ke(t, e) {
  if (!e?.length)
    return !1;
  for (const n of e) {
    if (co(n)) {
      if (t.description && ot(t.description, n))
        return h && Ve(t), !0;
      continue;
    }
    const r = !!n.attributes && Object.keys(n.attributes).length > 0;
    if (!n.name && !n.op && !r)
      continue;
    const s = n.name ? t.description && ot(t.description, n.name) : !0, o = n.op ? t.op && ot(t.op, n.op) : !0, i = n.attributes ? Object.entries(n.attributes).every(
      ([a, c]) => io(t.attributes?.[a], c)
    ) : !0;
    if (s && o && i)
      return h && Ve(t), !0;
  }
  return !1;
}
function io(t, e) {
  return typeof t == "string" && (typeof e == "string" || e instanceof RegExp) ? ot(t, e) : Array.isArray(t) && Array.isArray(e) ? t.length === e.length && t.every((n, r) => n === e[r]) : t === e;
}
function ao(t, e) {
  const n = e.parent_span_id, r = e.span_id;
  if (n)
    for (const s of t)
      s.parent_span_id === r && (s.parent_span_id = n);
}
function co(t) {
  return typeof t == "string" || t instanceof RegExp;
}
const uo = /* @__PURE__ */ Symbol.for("sentry.nonRecordingSpan");
function fo(t) {
  return !!t && t[uo] === !0;
}
const ye = "production", lo = "_frozenDsc";
function tr(t, e) {
  const n = e.getOptions(), { publicKey: r } = e.getDsn() || {}, s = {
    environment: n.environment || ye,
    release: n.release,
    public_key: r,
    trace_id: t,
    org_id: Ys(e)
  };
  return e.emit("createDsc", s), s;
}
function er(t, e) {
  const n = e.getPropagationContext();
  return n.dsc || tr(n.traceId, t);
}
function po(t) {
  const e = S();
  if (!e)
    return {};
  const n = Zn(t), r = Lt(n), s = r.data, o = n.spanContext().traceState, i = o?.get("sentry.sample_rate") ?? s[xs] ?? s[Cs];
  function a(R) {
    return (typeof i == "number" || typeof i == "string") && (R.sample_rate = `${i}`), R;
  }
  const c = n[lo];
  if (c)
    return a(c);
  const u = fo(n), f = u && n.dropReason === "ignored";
  if (u && (!Ye(e.getOptions()) || f)) {
    const R = Jt(n).scope;
    if (R) {
      const v = { ...er(e, R) };
      return f && (v.sampled = "false"), a(v);
    }
  }
  const l = o?.get("sentry.dsc"), g = l && js(l);
  if (g)
    return a(g);
  const p = tr(t.spanContext().traceId, e), _ = s[As] ?? s["sentry.segment.name.source"], b = r.description;
  return _ !== "url" && b && (p.transaction = b), Ye() && (p.sampled = String(no(n)), p.sample_rand = // In OTEL we store the sample rand on the trace state because we cannot access scopes for NonRecordingSpans
  // The Sentry OTEL SpanSampler takes care of writing the sample rand on the root span
  o?.get("sentry.sample_rand") ?? // On all other platforms we can actually get the scopes from a root span (we use this as a fallback)
  Jt(n).scope?.getPropagationContext().sampleRand.toString()), a(p), e.emit("createDsc", p, n), p;
}
function go(t) {
  return !!t && typeof t == "function" && "_streamed" in t && !!t._streamed;
}
function et(t, e = []) {
  return [t, e];
}
function Xe(t, e) {
  const [n, r] = t;
  return [n, [...r, e]];
}
function Qt(t, e) {
  const n = t[1];
  for (const r of n) {
    const s = r[0].type;
    if (e(r, s))
      return !0;
  }
  return !1;
}
function ho(t, e) {
  return Qt(t, (n, r) => e.includes(r));
}
function Zt(t) {
  const e = At(m);
  return e.encodePolyfill ? e.encodePolyfill(t) : new TextEncoder().encode(t);
}
function mo(t) {
  const [e, n] = t;
  let r = JSON.stringify(e);
  function s(o) {
    typeof r == "string" ? r = typeof o == "string" ? r + o : [Zt(r), o] : r.push(typeof o == "string" ? Zt(o) : o);
  }
  for (const o of n) {
    const [i, a] = o;
    if (s(`
${JSON.stringify(i)}
`), typeof a == "string" || a instanceof Uint8Array)
      s(a);
    else {
      let c;
      try {
        c = JSON.stringify(a);
      } catch {
        c = JSON.stringify(w(a));
      }
      s(c);
    }
  }
  return typeof r == "string" ? r : _o(r);
}
function _o(t) {
  const e = t.reduce((s, o) => s + o.length, 0), n = new Uint8Array(e);
  let r = 0;
  for (const s of t)
    n.set(s, r), r += s.length;
  return n;
}
function yo(t) {
  const e = typeof t.data == "string" ? Zt(t.data) : t.data;
  return [
    {
      type: "attachment",
      length: e.length,
      filename: t.filename,
      content_type: t.contentType,
      attachment_type: t.attachmentType
    },
    e
  ];
}
const nr = {
  sessions: "session",
  event: "error",
  client_report: "internal",
  user_report: "default",
  profile_chunk: "profile",
  replay_event: "replay",
  replay_recording: "replay",
  check_in: "monitor",
  raw_security: "security",
  log: "log_item",
  trace_metric: "metric"
};
function Eo(t) {
  return t in nr;
}
function Je(t) {
  return Eo(t) ? nr[t] : t;
}
function rr(t) {
  if (!t?.sdk)
    return;
  const { name: e, version: n } = t.sdk;
  return { name: e, version: n };
}
function So(t, e, n, r) {
  const s = t.sdkProcessingMetadata?.dynamicSamplingContext;
  return {
    event_id: t.event_id,
    sent_at: new Date(tt()).toISOString(),
    ...e && { sdk: e },
    ...!!n && r && { dsn: ht(r) },
    ...s && {
      trace: s
    }
  };
}
function bo(t, e) {
  if (!e)
    return t;
  const n = t.sdk || {};
  return t.sdk = {
    ...n,
    name: n.name || e.name,
    version: n.version || e.version,
    integrations: [...t.sdk?.integrations || [], ...e.integrations || []],
    packages: [...t.sdk?.packages || [], ...e.packages || []],
    settings: t.sdk?.settings || e.settings ? {
      ...t.sdk?.settings,
      ...e.settings
    } : void 0
  }, t;
}
function vo(t, e, n, r) {
  const s = rr(n), o = {
    sent_at: new Date(tt()).toISOString(),
    ...s && { sdk: s },
    ...!!r && e && { dsn: ht(e) }
  }, i = "aggregates" in t ? [{ type: "sessions" }, t] : [{ type: "session" }, t.toJSON()];
  return et(o, [i]);
}
function Io(t, e, n, r) {
  const s = rr(n), o = t.type && t.type !== "replay_event" ? t.type : "event";
  bo(t, n?.sdk);
  const i = So(t, s, r, e);
  return delete t.sdkProcessingMetadata, et(i, [[{ type: o }, t]]);
}
function To(t) {
  return t.getOptions().traceLifecycle === "stream";
}
function Ro(t, e) {
  const { fingerprint: n, span: r, breadcrumbs: s, sdkProcessingMetadata: o } = e;
  ko(t, e), r && No(t, r), Ao(t, n), Oo(t, s), wo(t, o);
}
function Qe(t, e) {
  const {
    extra: n,
    tags: r,
    attributes: s,
    user: o,
    contexts: i,
    level: a,
    sdkProcessingMetadata: c,
    breadcrumbs: u,
    fingerprint: f,
    eventProcessors: l,
    attachments: g,
    propagationContext: p,
    transactionName: _,
    span: b
  } = e;
  nt(t, "extra", n), nt(t, "tags", r), nt(t, "attributes", s), nt(t, "user", o), nt(t, "contexts", i), t.sdkProcessingMetadata = gt(t.sdkProcessingMetadata, c, 2), a && (t.level = a), _ && (t.transactionName = _), b && (t.span = b), u.length && (t.breadcrumbs = [...t.breadcrumbs, ...u]), f.length && (t.fingerprint = [...t.fingerprint, ...f]), l.length && (t.eventProcessors = [...t.eventProcessors, ...l]), g.length && (t.attachments = [...t.attachments, ...g]), t.propagationContext = { ...t.propagationContext, ...p };
}
function nt(t, e, n) {
  t[e] = gt(t[e], n, 1);
}
function sr(t, e) {
  const n = ws().getScopeData();
  return t && Qe(n, t.getScopeData()), e && Qe(n, e.getScopeData()), n;
}
function ko(t, e) {
  const { extra: n, tags: r, user: s, contexts: o, level: i, transactionName: a } = e;
  Object.keys(n).length && (t.extra = { ...n, ...t.extra }), Object.keys(r).length && (t.tags = { ...r, ...t.tags }), Object.keys(s).length && (t.user = { ...s, ...t.user }), Object.keys(o).length && (t.contexts = { ...o, ...t.contexts }), i && (t.level = i), a && t.type !== "transaction" && (t.transaction = a);
}
function Oo(t, e) {
  const n = [...t.breadcrumbs || [], ...e];
  t.breadcrumbs = n.length ? n : void 0;
}
function wo(t, e) {
  t.sdkProcessingMetadata = {
    ...t.sdkProcessingMetadata,
    ...e
  };
}
function No(t, e) {
  t.contexts = {
    trace: Xs(e),
    ...t.contexts
  }, t.sdkProcessingMetadata = {
    dynamicSamplingContext: po(e),
    ...t.sdkProcessingMetadata
  };
  const n = Zn(e), r = Lt(n).description;
  r && !t.transaction && t.type === "transaction" && (t.transaction = r);
}
function Ao(t, e) {
  t.fingerprint = t.fingerprint ? Array.isArray(t.fingerprint) ? t.fingerprint : [t.fingerprint] : [], e && (t.fingerprint = t.fingerprint.concat(e)), t.fingerprint.length || delete t.fingerprint;
}
const xo = "url.full";
function or(t, e) {
  const n = t.attributes ?? (t.attributes = {});
  Object.entries(e).forEach(([r, s]) => {
    s != null && !(r in n) && (n[r] = s);
  });
}
const Bt = 0, Ze = 1, tn = 2;
function mt(t) {
  return new at((e) => {
    e(t);
  });
}
function ir(t) {
  return new at((e, n) => {
    n(t);
  });
}
class at {
  constructor(e) {
    this._state = Bt, this._handlers = [], this._runExecutor(e);
  }
  /** @inheritdoc */
  then(e, n) {
    return new at((r, s) => {
      this._handlers.push([
        !1,
        (o) => {
          if (!e)
            r(o);
          else
            try {
              r(e(o));
            } catch (i) {
              s(i);
            }
        },
        (o) => {
          if (!n)
            s(o);
          else
            try {
              r(n(o));
            } catch (i) {
              s(i);
            }
        }
      ]), this._executeHandlers();
    });
  }
  /** @inheritdoc */
  catch(e) {
    return this.then((n) => n, e);
  }
  /** @inheritdoc */
  finally(e) {
    return new at((n, r) => {
      let s, o;
      return this.then(
        (i) => {
          o = !1, s = i, e && e();
        },
        (i) => {
          o = !0, s = i, e && e();
        }
      ).then(() => {
        if (o) {
          r(s);
          return;
        }
        n(s);
      });
    });
  }
  /** Excute the resolve/reject handlers. */
  _executeHandlers() {
    if (this._state === Bt)
      return;
    const e = this._handlers.slice();
    this._handlers = [], e.forEach((n) => {
      n[0] || (this._state === Ze && n[1](this._value), this._state === tn && n[2](this._value), n[0] = !0);
    });
  }
  /** Run the executor for the SyncPromise. */
  _runExecutor(e) {
    const n = (o, i) => {
      if (this._state === Bt) {
        if (lt(i)) {
          i.then(r, s);
          return;
        }
        this._state = o, this._value = i, this._executeHandlers();
      }
    }, r = (o) => {
      n(Ze, o);
    }, s = (o) => {
      n(tn, o);
    };
    try {
      e(r, s);
    } catch (o) {
      s(o);
    }
  }
}
function Co(t, e, n, r = 0) {
  try {
    const s = te(e, n, t, r);
    return lt(s) ? s : mt(s);
  } catch (s) {
    return ir(s);
  }
}
function te(t, e, n, r) {
  const s = n[r];
  if (!t || !s)
    return t;
  const o = s({ ...t }, e);
  return h && o === null && d.log(`Event processor "${s.id || "?"}" dropped event`), lt(o) ? o.then((i) => te(i, e, n, r + 1)) : te(o, e, n, r + 1);
}
let j, en, nn, D;
function Do(t) {
  const e = m._sentryDebugIds, n = m._debugIds;
  if (!e && !n)
    return {};
  const r = e ? Object.keys(e) : [], s = n ? Object.keys(n) : [];
  if (D && r.length === en && s.length === nn)
    return D;
  en = r.length, nn = s.length, D = {}, j || (j = {});
  const o = (i, a) => {
    for (const c of i) {
      const u = a[c], f = j?.[c];
      if (f && D && u)
        D[f[0]] = u, j && (j[c] = [f[0], u]);
      else if (u) {
        const l = t(c);
        for (let g = l.length - 1; g >= 0; g--) {
          const _ = l[g]?.filename;
          if (_ && D && j) {
            D[_] = u, j[c] = [_, u];
            break;
          }
        }
      }
    }
  };
  return e && o(r, e), n && o(s, n), D;
}
function Lo(t, e, n, r, s, o) {
  const { normalizeDepth: i = 3, normalizeMaxBreadth: a = 1e3 } = t, c = {
    ...e,
    event_id: e.event_id || n.event_id || T(),
    timestamp: e.timestamp || dt()
  }, u = n.integrations || t.integrations.map((v) => v.name);
  Po(c, t), Fo(c, u), s && s.emit("applyFrameMetadata", e), e.type === void 0 && Mo(c, t.stackParser);
  const f = Uo(r, n.captureContext);
  n.mechanism && P(c, n.mechanism);
  const l = s ? s.getEventProcessors() : [], g = sr(o, f), p = [...n.attachments || [], ...g.attachments];
  p.length && (n.attachments = p), Ro(c, g);
  const _ = [
    ...l,
    // Run scope event processors _after_ all other processors
    ...g.eventProcessors
  ];
  return (n.data && n.data.__sentry__ === !0 ? mt(c) : Co(_, c, n)).then((v) => (v && $o(v), typeof i == "number" && i > 0 ? jo(v, i, a) : v));
}
function Po(t, e) {
  const { environment: n, release: r, dist: s, maxValueLength: o } = e;
  t.environment = t.environment || n || ye, !t.release && r && (t.release = r), !t.dist && s && (t.dist = s);
  const i = t.request;
  i?.url && o && (i.url = Vt(i.url, o)), o && t.exception?.values?.forEach((a) => {
    a.value && (a.value = Vt(a.value, o));
  });
}
function Mo(t, e) {
  const n = Do(e);
  t.exception?.values?.forEach((r) => {
    r.stacktrace?.frames?.forEach((s) => {
      s.filename && (s.debug_id = n[s.filename]);
    });
  });
}
function $o(t) {
  const e = {};
  if (t.exception?.values?.forEach((r) => {
    r.stacktrace?.frames?.forEach((s) => {
      s.debug_id && (s.abs_path ? e[s.abs_path] = s.debug_id : s.filename && (e[s.filename] = s.debug_id), delete s.debug_id);
    });
  }), Object.keys(e).length === 0)
    return;
  t.debug_meta = t.debug_meta || {}, t.debug_meta.images = t.debug_meta.images || [];
  const n = t.debug_meta.images;
  Object.entries(e).forEach(([r, s]) => {
    n.push({
      type: "sourcemap",
      code_file: r,
      debug_id: s
    });
  });
}
function Fo(t, e) {
  e.length > 0 && (t.sdk = t.sdk || {}, t.sdk.integrations = [...t.sdk.integrations || [], ...e]);
}
function jo(t, e, n) {
  if (!t)
    return null;
  const r = {
    ...t,
    ...t.breadcrumbs && {
      breadcrumbs: t.breadcrumbs.map((s) => ({
        ...s,
        ...s.data && {
          data: w(s.data, e, n)
        }
      }))
    },
    ...t.user && {
      user: w(t.user, e, n)
    },
    ...t.contexts && {
      contexts: w(t.contexts, e, n)
    },
    ...t.extra && {
      extra: w(t.extra, e, n)
    }
  };
  return t.contexts?.trace && r.contexts && (r.contexts.trace = t.contexts.trace, t.contexts.trace.data && (r.contexts.trace.data = w(t.contexts.trace.data, e, n))), t.spans && (r.spans = t.spans.map((s) => ({
    ...s,
    ...s.data && {
      data: w(s.data, e, n)
    }
  }))), t.contexts?.flags && r.contexts && (r.contexts.flags = w(t.contexts.flags, 3, n)), r;
}
function Uo(t, e) {
  if (!e)
    return t;
  const n = t ? t.clone() : new O();
  return n.update(e), n;
}
function Bo(t) {
  if (t)
    return Ho(t) ? { captureContext: t } : qo(t) ? {
      captureContext: t
    } : t;
}
function Ho(t) {
  return t instanceof O || typeof t == "function";
}
const Wo = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "propagationContext"
];
function qo(t) {
  return Object.keys(t).some((e) => Wo.includes(e));
}
function Ee(t, e) {
  return C().captureException(t, Bo(e));
}
function ar(t, e) {
  return C().captureEvent(t, e);
}
function rn(t) {
  const e = z(), { user: n } = sr(e, C()), { userAgent: r } = m.navigator || {}, s = ps({
    user: n,
    ...r && { userAgent: r },
    ...t
  }), o = e.getSession();
  return o?.status === "ok" && V(o, { status: "exited" }), cr(), e.setSession(s), s;
}
function cr() {
  const t = z(), n = C().getSession() || t.getSession();
  n && ds(n), ur(), t.setSession();
}
function ur() {
  const t = z(), e = S(), n = t.getSession();
  n && e && e.captureSession(n);
}
function Ht(t = !1) {
  if (t) {
    cr();
    return;
  }
  ur();
}
function fr(t) {
  return typeof t == "object" && typeof t.unref == "function" && t.unref(), t;
}
const Go = "7";
function zo(t) {
  const e = t.protocol ? `${t.protocol}:` : "", n = t.port ? `:${t.port}` : "";
  return `${e}//${t.host}${n}${t.path ? `/${t.path}` : ""}/api/`;
}
function Yo(t) {
  return `${zo(t)}${t.projectId}/envelope/`;
}
function Vo(t, e) {
  const n = {
    sentry_version: Go
  };
  return t.publicKey && (n.sentry_key = t.publicKey), e && (n.sentry_client = `${e.name}/${e.version}`), new URLSearchParams(n).toString();
}
function Ko(t, e, n) {
  return e || `${Yo(t)}?${Vo(t, n)}`;
}
const sn = [];
function Xo(t) {
  const e = {};
  return t.forEach((n) => {
    const { name: r } = n, s = e[r];
    s && !s.isDefaultInstance && n.isDefaultInstance || (e[r] = n);
  }), Object.values(e);
}
function Jo(t) {
  const e = t.defaultIntegrations || [], n = t.integrations;
  e.forEach((s) => {
    s.isDefaultInstance = !0;
  });
  let r;
  if (Array.isArray(n))
    r = [...e, ...n];
  else if (typeof n == "function") {
    const s = n(e);
    r = Array.isArray(s) ? s : [s];
  } else
    r = e;
  return Xo(r);
}
function Qo(t, e) {
  const n = {};
  return e.forEach((r) => {
    r?.beforeSetup && r.beforeSetup(t);
  }), e.forEach((r) => {
    r && lr(t, r, n);
  }), n;
}
function on(t, e) {
  for (const n of e)
    n?.afterAllSetup && n.afterAllSetup(t);
}
function lr(t, e, n) {
  if (n[e.name]) {
    h && d.log(`Integration skipped because it was already installed: ${e.name}`);
    return;
  }
  if (n[e.name] = e, !sn.includes(e.name) && typeof e.setupOnce == "function" && (e.setupOnce(), sn.push(e.name)), e.setup && typeof e.setup == "function" && e.setup(t), typeof e.preprocessEvent == "function") {
    const r = e.preprocessEvent.bind(e);
    t.on("preprocessEvent", (s, o) => r(s, o, t));
  }
  if (typeof e.processEvent == "function") {
    const r = e.processEvent.bind(e), s = Object.assign((o, i) => r(o, i, t), {
      id: e.name
    });
    t.addEventProcessor(s);
  }
  ["processSpan", "processSegmentSpan"].forEach((r) => {
    const s = e[r];
    typeof s == "function" && t.on(r, (o) => s.call(e, o, t));
  }), h && d.log(`Integration installed: ${e.name}`);
}
function Zo() {
  return typeof __SENTRY_BROWSER_BUNDLE__ < "u" && !!__SENTRY_BROWSER_BUNDLE__;
}
function ti() {
  return "npm";
}
function ei() {
  return !Zo() && Object.prototype.toString.call(typeof process < "u" ? process : 0) === "[object process]";
}
function Se() {
  return typeof window < "u" && (!ei() || ni());
}
function ni() {
  return m.process?.type === "renderer";
}
function ri(t, e) {
  const n = e ? "auto" : "never";
  return [
    {
      type: "log",
      item_count: t.length,
      content_type: "application/vnd.sentry.items.log+json"
    },
    {
      version: 2,
      ...Se() && {
        ingest_settings: { infer_ip: n, infer_user_agent: n }
      },
      items: t
    }
  ];
}
function si(t, e, n, r, s) {
  const o = {};
  return e?.sdk && (o.sdk = {
    name: e.sdk.name,
    version: e.sdk.version
  }), n && r && (o.dsn = ht(r)), et(o, [ri(t, s)]);
}
function oi(t, e) {
  const n = e ?? ii(t) ?? [];
  if (n.length === 0)
    return;
  const r = t.getOptions(), s = si(
    n,
    r._metadata,
    r.tunnel,
    t.getDsn(),
    t.getDataCollectionOptions().userInfo
  );
  pr().set(t, []), t.emit("flushLogs"), t.sendEnvelope(s);
}
function ii(t) {
  return pr().get(t);
}
function pr() {
  return J("clientToLogBufferMap", () => /* @__PURE__ */ new WeakMap());
}
function ai(t, e) {
  const n = e ? "auto" : "never";
  return [
    {
      type: "trace_metric",
      item_count: t.length,
      content_type: "application/vnd.sentry.items.trace-metric+json"
    },
    {
      version: 2,
      ...Se() && {
        ingest_settings: { infer_ip: n, infer_user_agent: n }
      },
      items: t
    }
  ];
}
function ci(t, e, n, r, s) {
  const o = {};
  return e?.sdk && (o.sdk = {
    name: e.sdk.name,
    version: e.sdk.version
  }), n && r && (o.dsn = ht(r)), et(o, [ai(t, s)]);
}
function ui(t, e) {
  const n = e ?? fi(t) ?? [];
  if (n.length === 0)
    return;
  const r = t.getOptions(), s = ci(
    n,
    r._metadata,
    r.tunnel,
    t.getDsn(),
    t.getDataCollectionOptions().userInfo
  );
  dr().set(t, []), t.emit("flushMetrics"), t.sendEnvelope(s);
}
function fi(t) {
  return dr().get(t);
}
function dr() {
  return J("clientToMetricBufferMap", () => /* @__PURE__ */ new WeakMap());
}
function li(t) {
  const e = {
    trace_id: t.trace_id,
    span_id: t.span_id,
    parent_span_id: t.parent_span_id,
    name: t.description || "",
    start_timestamp: t.start_timestamp,
    end_timestamp: t.timestamp || t.start_timestamp,
    status: !t.status || t.status === "ok" || t.status === "cancelled" ? "ok" : "error",
    is_segment: !1,
    attributes: { ...t.data },
    links: t.links
  };
  return Zs(e);
}
function pi(t, e) {
  if (t.type !== "transaction" || !t.spans?.length || !t.sdkProcessingMetadata?.hasGenAiSpans || e.getOptions().streamGenAiSpans === !1 || To(e))
    return;
  const n = [], r = [];
  for (const o of t.spans)
    o.op?.startsWith("gen_ai.") ? n.push(li(o)) : r.push(o);
  if (n.length === 0)
    return;
  t.spans = r;
  const s = e.getDataCollectionOptions().userInfo ? "auto" : "never";
  return [
    { type: "span", item_count: n.length, content_type: "application/vnd.sentry.items.span.v2+json" },
    {
      version: 2,
      ...Se() && {
        ingest_settings: { infer_ip: s, infer_user_agent: s }
      },
      items: n
    }
  ];
}
const be = /* @__PURE__ */ Symbol.for("SentryBufferFullError");
function ve(t = 100) {
  const e = /* @__PURE__ */ new Set();
  function n() {
    return e.size < t;
  }
  function r(i) {
    e.delete(i);
  }
  function s(i) {
    if (!n())
      return ir(be);
    const a = i();
    return e.add(a), a.then(
      () => r(a),
      () => r(a)
    ), a;
  }
  function o(i) {
    if (!e.size)
      return mt(!0);
    const a = Promise.allSettled(Array.from(e)).then(() => !0);
    if (!i)
      return a;
    const c = [
      a,
      new Promise((u) => fr(setTimeout(() => u(!1), i)))
    ];
    return Promise.race(c);
  }
  return {
    get $() {
      return Array.from(e);
    },
    add: s,
    drain: o
  };
}
const di = 60 * 1e3;
function gi(t, e = tt()) {
  const n = parseInt(`${t}`, 10);
  if (!isNaN(n))
    return n * 1e3;
  const r = Date.parse(`${t}`);
  return isNaN(r) ? di : r - e;
}
function hi(t, e) {
  return t[e] || t.all || 0;
}
function mi(t, e, n = tt()) {
  return hi(t, e) > n;
}
function _i(t, { statusCode: e, headers: n }, r = tt()) {
  const s = {
    ...t
  }, o = n?.["x-sentry-rate-limits"], i = n?.["retry-after"];
  if (o)
    for (const a of o.trim().split(",")) {
      const [c, u, , , f] = a.split(":", 5), l = parseInt(c, 10), g = (isNaN(l) ? 60 : l) * 1e3;
      if (!u)
        s.all = r + g;
      else
        for (const p of u.split(";"))
          p === "metric_bucket" ? (!f || f.split(";").includes("custom")) && (s[p] = r + g) : s[p] = r + g;
    }
  else i ? s.all = r + gi(i, r) : e === 429 && (s.all = r + 60 * 1e3);
  return s;
}
const gr = 64;
function yi(t, e, n = ve(
  t.bufferSize || gr
)) {
  let r = {};
  const s = (i) => n.drain(i);
  function o(i) {
    const a = [];
    if (Qt(i, (l, g) => {
      const p = Je(g);
      mi(r, p) ? t.recordDroppedEvent("ratelimit_backoff", p) : a.push(l);
    }), a.length === 0)
      return Promise.resolve({});
    const c = et(i[0], a), u = (l) => {
      if (ho(c, ["client_report"])) {
        h && d.warn(`Dropping client report. Will not send outcomes (reason: ${l}).`);
        return;
      }
      Qt(c, (g, p) => {
        t.recordDroppedEvent(l, Je(p));
      });
    }, f = () => e({ body: mo(c) }).then(
      (l) => l.statusCode === 413 ? (h && d.error(
        "Sentry responded with status code 413. Envelope was discarded due to exceeding size limits."
      ), u("send_error"), l) : (h && l.statusCode !== void 0 && (l.statusCode < 200 || l.statusCode >= 300) && d.warn(`Sentry responded with status code ${l.statusCode} to sent event.`), r = _i(r, l), l),
      (l) => {
        throw u("network_error"), h && d.error("Encountered error running transport request:", l), l;
      }
    );
    return n.add(f).then(
      (l) => l,
      (l) => {
        if (l === be)
          return h && d.error("Skipped sending event because buffer is full."), u("queue_overflow"), Promise.resolve({});
        throw l;
      }
    );
  }
  return {
    send: o,
    flush: s
  };
}
function Ei(t, e, n) {
  const r = [
    { type: "client_report" },
    {
      timestamp: dt(),
      discarded_events: t
    }
  ];
  return et(e ? { dsn: e } : {}, [r]);
}
function hr(t) {
  const e = [];
  t.message && e.push(t.message);
  try {
    const n = t.exception.values[t.exception.values.length - 1];
    n?.value && (e.push(n.value), n.type && e.push(`${n.type}: ${n.value}`));
  } catch {
  }
  return e;
}
function Si(t) {
  const { trace_id: e, parent_span_id: n, span_id: r, status: s, origin: o, data: i, op: a } = t.contexts?.trace ?? {};
  return {
    data: i ?? {},
    description: t.transaction,
    op: a,
    parent_span_id: n,
    span_id: r ?? "",
    start_timestamp: t.start_timestamp ?? 0,
    status: s,
    timestamp: t.timestamp,
    trace_id: e ?? "",
    origin: o,
    profile_id: i?.[Kn],
    exclusive_time: i?.[Xn],
    measurements: t.measurements,
    is_segment: !0
  };
}
function bi(t) {
  return {
    type: "transaction",
    timestamp: t.timestamp,
    start_timestamp: t.start_timestamp,
    transaction: t.description,
    contexts: {
      trace: {
        trace_id: t.trace_id,
        span_id: t.span_id,
        parent_span_id: t.parent_span_id,
        op: t.op,
        status: t.status,
        origin: t.origin,
        data: {
          ...t.data,
          ...t.profile_id && { [Kn]: t.profile_id },
          ...t.exclusive_time && { [Xn]: t.exclusive_time }
        }
      }
    },
    measurements: t.measurements
  };
}
const yt = ["forwarded", "-ip", "remote-", "via", "-user"];
function vi(t) {
  return t === !0 ? {
    userInfo: !0,
    cookies: !0,
    httpHeaders: { request: !0, response: !0 },
    httpBodies: ["incomingRequest", "outgoingRequest", "incomingResponse", "outgoingResponse"],
    urlQueryParams: !0,
    graphQL: { document: !0, variables: !0 },
    genAI: { inputs: !0, outputs: !0 },
    databaseQueryData: !0,
    stackFrameVariables: !0,
    frameContextLines: 7
    // default should be 5, but ContextLines integration uses 7
  } : {
    userInfo: !1,
    cookies: { deny: yt },
    httpHeaders: { request: { deny: yt }, response: { deny: yt } },
    httpBodies: [],
    urlQueryParams: { deny: yt },
    // The GraphQL document has literal values redacted at collection time, so it was historically
    // always attached regardless of `sendDefaultPii`; keep it on to preserve that behavior.
    graphQL: { document: !0, variables: !0 },
    genAI: { inputs: !1, outputs: !1 },
    // Database query values were only sent with `sendDefaultPii: true` (e.g. Supabase gated on it),
    // so map the legacy "off" state to `false`.
    databaseQueryData: !1,
    stackFrameVariables: !0,
    frameContextLines: 7
    // default should be 5, but ContextLines integration uses 7
  };
}
const Ii = {
  userInfo: !0,
  cookies: !0,
  httpHeaders: { request: !0, response: !0 },
  httpBodies: ["incomingRequest", "outgoingRequest", "incomingResponse", "outgoingResponse"],
  urlQueryParams: !0,
  graphQL: { document: !0, variables: !0 },
  genAI: { inputs: !0, outputs: !0 },
  databaseQueryData: !0,
  stackFrameVariables: !0,
  frameContextLines: 5
};
function Ti(t) {
  const e = t.dataCollection != null ? Ii : vi(t.sendDefaultPii), n = t.dataCollection ?? {};
  return {
    userInfo: n.userInfo ?? e.userInfo,
    cookies: n.cookies ?? e.cookies,
    httpHeaders: {
      request: n.httpHeaders?.request ?? e.httpHeaders.request,
      response: n.httpHeaders?.response ?? e.httpHeaders.response
    },
    httpBodies: n.httpBodies ?? e.httpBodies,
    // oxlint-disable-next-line typescript/no-deprecated
    urlQueryParams: n.urlQueryParams ?? n.queryParams ?? e.urlQueryParams,
    graphQL: {
      document: n.graphQL?.document ?? e.graphQL.document,
      variables: n.graphQL?.variables ?? e.graphQL.variables
    },
    genAI: {
      inputs: n.genAI?.inputs ?? e.genAI.inputs,
      outputs: n.genAI?.outputs ?? e.genAI.outputs
    },
    databaseQueryData: n.databaseQueryData ?? e.databaseQueryData,
    stackFrameVariables: n.stackFrameVariables ?? e.stackFrameVariables,
    frameContextLines: n.frameContextLines ?? e.frameContextLines
  };
}
const an = "Not capturing exception because it's already been captured.", cn = "Discarded session because of missing or non-string release", mr = /* @__PURE__ */ Symbol.for("SentryInternalError"), _r = /* @__PURE__ */ Symbol.for("SentryDoNotSendEventError"), Ri = 5e3;
function bt(t) {
  return {
    message: t,
    [mr]: !0
  };
}
function Wt(t) {
  return {
    message: t,
    [_r]: !0
  };
}
function un(t) {
  return xt(t) && mr in t;
}
function fn(t) {
  return xt(t) && _r in t;
}
function ln(t, e, n, r, s) {
  let o = 0, i, a = !1;
  t.on(n, () => {
    o = 0, clearTimeout(i), a = !1;
  }), t.on(e, (c) => {
    if (o += r(c), o >= 8e5)
      s(t);
    else if (!a) {
      const u = t.getOptions()._flushInterval ?? Ri;
      u > 0 && (a = !0, i = fr(
        setTimeout(() => {
          s(t);
        }, u)
      ));
    }
  }), t.on("flush", () => {
    s(t);
  });
}
class ki {
  /**
   * Initializes this client instance.
   *
   * @param options Options for the client.
   */
  constructor(e) {
    if (this._options = e, this._integrations = {}, this._numProcessing = 0, this._outcomes = {}, this._hooks = {}, this._eventProcessors = [], this._promiseBuffer = ve(e.transportOptions?.bufferSize ?? gr), this._dataCollection = Ti(e), e.dsn ? this._dsn = Vs(e.dsn) : h && d.warn("No DSN provided, client will not send events."), this._dsn) {
      const r = Ko(
        this._dsn,
        e.tunnel,
        e._metadata ? e._metadata.sdk : void 0
      );
      this._transport = e.transport({
        tunnel: this._options.tunnel,
        recordDroppedEvent: this.recordDroppedEvent.bind(this),
        ...e.transportOptions,
        url: r
      });
    }
    this._options.enableLogs = this._options.enableLogs ?? this._options._experiments?.enableLogs, this._options.enableLogs && ln(this, "afterCaptureLog", "flushLogs", Ai, oi), (this._options.enableMetrics ?? this._options._experiments?.enableMetrics ?? !0) && ln(
      this,
      "afterCaptureMetric",
      "flushMetrics",
      Ni,
      ui
    );
  }
  /**
   * Captures an exception event and sends it to Sentry.
   *
   * Unlike `captureException` exported from every SDK, this method requires that you pass it the current scope.
   */
  captureException(e, n, r) {
    const s = T();
    if (De(e))
      return h && d.log(an), s;
    const o = {
      event_id: s,
      ...n
    };
    return this._process(
      () => this.eventFromException(e, o).then((i) => this._captureEvent(i, o, r)).then((i) => i),
      "error"
    ), o.event_id;
  }
  /**
   * Captures a message event and sends it to Sentry.
   *
   * Unlike `captureMessage` exported from every SDK, this method requires that you pass it the current scope.
   */
  captureMessage(e, n, r, s) {
    const o = {
      event_id: T(),
      ...r
    }, i = de(e) ? e : String(e), a = ft(e), c = a ? this.eventFromMessage(i, n, o) : this.eventFromException(e, o);
    return this._process(
      () => c.then((u) => this._captureEvent(u, o, s)),
      a ? "unknown" : "error"
    ), o.event_id;
  }
  /**
   * Captures a manually created event and sends it to Sentry.
   *
   * Unlike `captureEvent` exported from every SDK, this method requires that you pass it the current scope.
   */
  captureEvent(e, n, r) {
    const s = T();
    if (n?.originalException && De(n.originalException))
      return h && d.log(an), s;
    const o = {
      event_id: s,
      ...n
    }, i = e.sdkProcessingMetadata || {}, a = i.capturedSpanScope, c = i.capturedSpanIsolationScope, u = pn(e.type);
    return this._process(
      () => this._captureEvent(e, o, a || r, c),
      u
    ), o.event_id;
  }
  /**
   * Captures a session.
   */
  captureSession(e) {
    this.sendSession(e), V(e, { init: !1 });
  }
  /**
   * Get the current Dsn.
   */
  getDsn() {
    return this._dsn;
  }
  /**
   * Get the current options.
   */
  getOptions() {
    return this._options;
  }
  /**
   * Get the resolved data collection configuration.
   */
  getDataCollectionOptions() {
    return this._dataCollection;
  }
  /**
   * Get the SDK metadata.
   * @see SdkMetadata
   */
  getSdkMetadata() {
    return this._options._metadata;
  }
  /**
   * Returns the transport that is used by the client.
   * Please note that the transport gets lazy initialized so it will only be there once the first event has been sent.
   */
  getTransport() {
    return this._transport;
  }
  /**
   * Wait for all events to be sent or the timeout to expire, whichever comes first.
   *
   * @param timeout Maximum time in ms the client should wait for events to be flushed. Omitting this parameter will
   *   cause the client to wait until all events are sent before resolving the promise.
   * @returns A promise that will resolve with `true` if all events are sent before the timeout, or `false` if there are
   * still events in the queue when the timeout is reached.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
  async flush(e) {
    const n = this._transport;
    if (this.emit("flush"), !n)
      return !0;
    const r = await this._isClientDoneProcessing(e), s = await n.flush(e);
    return r && s;
  }
  /**
   * Flush the event queue and set the client to `enabled = false`. See {@link Client.flush}.
   *
   * @param {number} timeout Maximum time in ms the client should wait before shutting down. Omitting this parameter will cause
   *   the client to wait until all events are sent before disabling itself.
   * @returns {Promise<boolean>} A promise which resolves to `true` if the flush completes successfully before the timeout, or `false` if
   * it doesn't.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
  async close(e) {
    const n = await this.flush(e);
    return this.getOptions().enabled = !1, this.emit("close"), n;
  }
  /**
   * Get all installed event processors.
   */
  getEventProcessors() {
    return this._eventProcessors;
  }
  /**
   * Adds an event processor that applies to any event processed by this client.
   */
  addEventProcessor(e) {
    this._eventProcessors.push(e);
  }
  /**
   * Initialize this client.
   * Call this after the client was set on a scope.
   */
  init() {
    (this._isEnabled() || // Force integrations to be setup even if no DSN was set when we have
    // Spotlight enabled. This is particularly important for browser as we
    // don't support the `spotlight` option there and rely on the users
    // adding the `spotlightBrowserIntegration()` to their integrations which
    // wouldn't get initialized with the check below when there's no DSN set.
    this._options.integrations.some(({ name: e }) => e.startsWith("Spotlight"))) && this._setupIntegrations();
  }
  /**
   * Gets an installed integration by its name.
   *
   * @returns {Integration|undefined} The installed integration or `undefined` if no integration with that `name` was installed.
   */
  getIntegrationByName(e) {
    return this._integrations[e];
  }
  /**
   * Returns the names of all installed integrations.
   */
  getIntegrationNames() {
    return Object.keys(this._integrations);
  }
  /**
   * Add an integration to the client.
   * This can be used to e.g. lazy load integrations.
   * In most cases, this should not be necessary,
   * and you're better off just passing the integrations via `integrations: []` at initialization time.
   * However, if you find the need to conditionally load & add an integration, you can use `addIntegration` to do so.
   */
  addIntegration(e) {
    const n = this._integrations[e.name];
    !n && e.beforeSetup && e.beforeSetup(this), lr(this, e, this._integrations), n || on(this, [e]);
  }
  /**
   * Send a fully prepared event to Sentry.
   */
  sendEvent(e, n = {}) {
    this.emit("beforeSendEvent", e, n);
    const r = pi(e, this);
    let s = Io(e, this._dsn, this._options._metadata, this._options.tunnel);
    for (const o of n.attachments || [])
      s = Xe(s, yo(o));
    r && (s = Xe(s, r)), this.sendEnvelope(s).then((o) => this.emit("afterSendEvent", e, o));
  }
  /**
   * Send a session or session aggregrates to Sentry.
   */
  sendSession(e) {
    const { release: n, environment: r = ye } = this._options;
    if ("aggregates" in e) {
      const o = e.attrs || {};
      if (!o.release && !n) {
        h && d.warn(cn);
        return;
      }
      o.release = o.release || n, o.environment = o.environment || r, e.attrs = o;
    } else {
      if (!e.release && !n) {
        h && d.warn(cn);
        return;
      }
      e.release = e.release || n, e.environment = e.environment || r;
    }
    this.emit("beforeSendSession", e);
    const s = vo(e, this._dsn, this._options._metadata, this._options.tunnel);
    this.sendEnvelope(s);
  }
  /**
   * Record on the client that an event got dropped (ie, an event that will not be sent to Sentry).
   */
  recordDroppedEvent(e, n, r = 1) {
    if (this._options.sendClientReports) {
      const s = `${e}:${n}`;
      h && d.log(`Recording outcome: "${s}"${r > 1 ? ` (${r} times)` : ""}`), this._outcomes[s] = (this._outcomes[s] || 0) + r;
    }
  }
  /**
   * Register a hook on this client.
   */
  on(e, n) {
    const r = this._hooks[e] = this._hooks[e] || /* @__PURE__ */ new Set(), s = (...o) => n(...o);
    return r.add(s), () => {
      r.delete(s);
    };
  }
  /**
   * Emit a hook that was previously registered via `on()`.
   */
  emit(e, ...n) {
    const r = this._hooks[e];
    r && r.forEach((s) => s(...n));
  }
  /**
   * Send an envelope to Sentry.
   */
  // @ts-expect-error - PromiseLike is a subset of Promise
  async sendEnvelope(e) {
    if (this.emit("beforeEnvelope", e), this._isEnabled() && this._transport)
      try {
        return await this._transport.send(e);
      } catch (n) {
        return h && d.error("Error while sending envelope:", n), {};
      }
    return h && d.error("Transport disabled"), {};
  }
  /**
   * Register a cleanup function to be called when the client is disposed.
   * This is useful for integrations that need to clean up global state.
   *
   * NOTE: This is a no-op in the base `Client` class. Subclasses like `ServerRuntimeClient`
   * override this method to actually register and execute cleanup callbacks.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registerCleanup(e) {
  }
  /**
   * Disposes of the client and releases all resources.
   *
   * Subclasses should override this method to clean up their own resources, including invoking
   * any callbacks registered via {@link Client.registerCleanup}. The base implementation is a
   * no-op and does NOT execute registered cleanup callbacks.
   *
   * After calling dispose(), the client should not be used anymore.
   */
  dispose() {
  }
  /* eslint-enable @typescript-eslint/unified-signatures */
  /** Setup integrations for this client. */
  _setupIntegrations() {
    const { integrations: e } = this._options;
    this._integrations = Qo(this, e), on(this, e);
  }
  /** Updates existing session based on the provided event */
  _updateSessionFromEvent(e, n) {
    let r = n.level === "fatal", s = !1;
    const o = n.exception?.values;
    if (o) {
      s = !0, r = !1;
      for (const c of o)
        if (c.mechanism?.handled === !1) {
          r = !0;
          break;
        }
    }
    const i = e.status === "ok";
    (i && e.errors === 0 || i && r) && (V(e, {
      ...r && { status: "crashed" },
      errors: e.errors || Number(s || r)
    }), this.captureSession(e));
  }
  /**
   * Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
   * "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
   *
   * @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
   * passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
   * `true`.
   * @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
   * `false` otherwise
   */
  async _isClientDoneProcessing(e) {
    let n = 0;
    for (; !e || n < e; ) {
      if (await new Promise((r) => setTimeout(r, 1)), !this._numProcessing)
        return !0;
      n++;
    }
    return !1;
  }
  /** Determines whether this SDK is enabled and a transport is present. */
  _isEnabled() {
    return this.getOptions().enabled !== !1 && this._transport !== void 0;
  }
  /**
   * Adds common information to events.
   *
   * The information includes release and environment from `options`,
   * breadcrumbs and context (extra, tags and user) from the scope.
   *
   * Information that is already present in the event is never overwritten. For
   * nested objects, such as the context, keys are merged.
   *
   * @param event The original event.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A new event with more information.
   */
  _prepareEvent(e, n, r, s) {
    const o = this.getOptions(), i = this.getIntegrationNames();
    return !n.integrations && i.length && (n.integrations = i), this.emit("preprocessEvent", e, n), e.type || s.setLastEventId(e.event_id || n.event_id), Lo(o, e, n, r, this, s).then((a) => {
      if (a === null)
        return a;
      this.emit("postprocessEvent", a, n), a.contexts = {
        trace: { ...a.contexts?.trace, ...Ns(r) },
        ...a.contexts
      };
      const c = er(this, r);
      return a.sdkProcessingMetadata = {
        dynamicSamplingContext: c,
        ...a.sdkProcessingMetadata
      }, a;
    });
  }
  /**
   * Processes the event and logs an error in case of rejection
   * @param event
   * @param hint
   * @param scope
   */
  _captureEvent(e, n = {}, r = C(), s = z()) {
    return h && ee(e) && d.log(`Captured error event \`${hr(e)[0] || "<unknown>"}\``), this._processEvent(e, n, r, s).then(
      (o) => o.event_id,
      (o) => {
        h && (fn(o) ? d.log(o.message) : un(o) ? d.warn(o.message) : d.warn(o));
      }
    );
  }
  /**
   * Processes an event (either error or message) and sends it to Sentry.
   *
   * This also adds breadcrumbs and context information to the event. However,
   * platform specific meta data (such as the User's IP address) must be added
   * by the SDK implementor.
   *
   *
   * @param event The event to send to Sentry.
   * @param hint May contain additional information about the original exception.
   * @param currentScope A scope containing event metadata.
   * @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
   */
  _processEvent(e, n, r, s) {
    const o = this.getOptions(), { sampleRate: i } = o, a = yr(e), c = ee(e), f = `before send for type \`${e.type || "error"}\``, l = typeof i > "u" ? void 0 : Ks(i), g = pn(e.type);
    return this._prepareEvent(e, n, r, s).then((p) => {
      if (p === null)
        throw this.recordDroppedEvent("event_processor", g), Wt("An event processor returned `null`, will not send event.");
      if (n.data?.__sentry__ === !0)
        return p;
      const b = wi(this, o, p, n);
      return Oi(b, f);
    }).then((p) => {
      if (p === null) {
        if (this.recordDroppedEvent("before_send", g), a) {
          const v = 1 + (e.spans || []).length;
          this.recordDroppedEvent("before_send", "span", v);
        }
        throw Wt(`${f} returned \`null\`, will not send event.`);
      }
      const _ = r.getSession() || s.getSession();
      if (c && _ && this._updateSessionFromEvent(_, p), c && typeof l == "number" && kt() > l)
        throw this.recordDroppedEvent("sample_rate", "error"), Wt(
          `Discarding event because it's not included in the random sample (sampling rate = ${i})`
        );
      if (a) {
        const R = p.sdkProcessingMetadata?.spanCountBeforeProcessing || 0, v = p.spans ? p.spans.length : 0, ke = R - v;
        ke > 0 && this.recordDroppedEvent("before_send", "span", ke);
      }
      const b = p.transaction_info;
      if (a && b && p.transaction !== e.transaction) {
        const R = "custom";
        p.transaction_info = {
          ...b,
          source: R
        };
      }
      return this.sendEvent(p, n), p;
    }).then(null, (p) => {
      throw fn(p) || un(p) ? p : (this.captureException(p, {
        mechanism: {
          handled: !1,
          type: "internal"
        },
        data: {
          __sentry__: !0
        },
        originalException: p
      }), bt(
        `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${p}`
      ));
    });
  }
  /**
   * Occupies the client with processing and event
   */
  _process(e, n) {
    this._numProcessing++, this._promiseBuffer.add(e).then(
      (r) => (this._numProcessing--, r),
      (r) => (this._numProcessing--, r === be && this.recordDroppedEvent("queue_overflow", n), r)
    );
  }
  /**
   * Clears outcomes on this client and returns them.
   */
  _clearOutcomes() {
    const e = this._outcomes;
    return this._outcomes = {}, Object.entries(e).map(([n, r]) => {
      const [s, o] = n.split(":");
      return {
        reason: s,
        category: o,
        quantity: r
      };
    });
  }
  /**
   * Sends client reports as an envelope.
   */
  _flushOutcomes() {
    h && d.log("Flushing outcomes...");
    const e = this._clearOutcomes();
    if (e.length === 0) {
      h && d.log("No outcomes to send");
      return;
    }
    if (!this._dsn) {
      h && d.log("No dsn provided, will not send outcomes");
      return;
    }
    h && d.log("Sending outcomes:", e);
    const n = Ei(e, this._options.tunnel && ht(this._dsn));
    this.sendEnvelope(n);
  }
}
function pn(t) {
  return t === "replay_event" ? "replay" : t || "error";
}
function Oi(t, e) {
  const n = `${e} must return \`null\` or a valid event.`;
  if (lt(t))
    return t.then(
      (r) => {
        if (!Rt(r) && r !== null)
          throw bt(n);
        return r;
      },
      (r) => {
        throw bt(`${e} rejected with ${r}`);
      }
    );
  if (!Rt(t) && t !== null)
    throw bt(n);
  return t;
}
function wi(t, e, n, r) {
  const { beforeSend: s, beforeSendTransaction: o, ignoreSpans: i } = e, a = !go(e.beforeSendSpan) && e.beforeSendSpan;
  let c = n;
  if (ee(c) && s)
    return s(c, r);
  if (yr(c)) {
    if (a || i) {
      const u = Si(c);
      if (i?.length && Ke(
        { description: u.description, op: u.op, attributes: u.data },
        i
      ))
        return null;
      if (a) {
        const f = a(u);
        f ? c = gt(n, bi(f)) : ze();
      }
      if (c.spans) {
        const f = [], l = c.spans;
        for (const p of l) {
          if (i?.length && Ke({ description: p.description, op: p.op, attributes: p.data }, i)) {
            ao(l, p);
            continue;
          }
          if (a) {
            const _ = a(p);
            _ ? f.push(_) : (ze(), f.push(p));
          } else
            f.push(p);
        }
        const g = c.spans.length - f.length;
        g && t.recordDroppedEvent("before_send", "span", g), c.spans = f;
      }
    }
    if (o) {
      if (c.spans) {
        const u = c.spans.length;
        c.sdkProcessingMetadata = {
          ...n.sdkProcessingMetadata,
          spanCountBeforeProcessing: u
        };
      }
      return o(c, r);
    }
  }
  return c;
}
function ee(t) {
  return t.type === void 0;
}
function yr(t) {
  return t.type === "transaction";
}
function Ni(t) {
  let e = 0;
  return t.name && (e += t.name.length * 2), e += 8, e + Er(t.attributes);
}
function Ai(t) {
  let e = 0;
  return t.message && (e += t.message.length * 2), e + Er(t.attributes);
}
function Er(t) {
  if (!t)
    return 0;
  let e = 0;
  return Object.values(t).forEach((n) => {
    Array.isArray(n) ? e += n.length * dn(n[0]) : ft(n) ? e += dn(n) : e += 100;
  }), e;
}
function dn(t) {
  return typeof t == "string" ? t.length * 2 : typeof t == "number" ? 8 : typeof t == "boolean" ? 4 : 0;
}
function xi(t, e) {
  e.debug === !0 && (h ? d.enable() : Q(() => {
    console.warn("[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.");
  })), C().update(e.initialScope);
  const r = new t(e);
  return Ci(r), r.init(), r;
}
function Ci(t) {
  C().setClient(t);
}
function qt(t) {
  if (!t)
    return {};
  const e = t.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
  if (!e)
    return {};
  const n = e[6] || "", r = e[8] || "";
  return {
    host: e[4],
    path: e[5],
    protocol: e[2],
    search: n,
    hash: r,
    relative: e[5] + n + r
    // everything minus origin
  };
}
function Di(t, e = !0) {
  if (t.startsWith("data:")) {
    const n = t.match(/^data:([^;,]+)/), r = n ? n[1] : "text/plain", s = t.includes(";base64,"), o = t.indexOf(",");
    let i = "";
    if (e && o !== -1) {
      const a = t.slice(o + 1);
      i = a.length > 10 ? `${a.slice(0, 10)}... [truncated]` : a;
    }
    return `data:${r}${s ? ",base64" : ""}${i ? `,${i}` : ""}`;
  }
  return t;
}
function Li(t) {
  "aggregates" in t ? t.attrs?.ip_address === void 0 && (t.attrs = {
    ...t.attrs,
    ip_address: "{{auto}}"
  }) : t.ipAddress === void 0 && (t.ipAddress = "{{auto}}");
}
function Pi(t, e, n = [e], r = "npm") {
  const s = (t._metadata = t._metadata || {}).sdk = t._metadata.sdk || {};
  s.name || (s.name = `sentry.javascript.${e}`, s.packages = n.map((o) => ({
    name: `${r}:@sentry/${o}`,
    version: H
  })), s.version = H);
}
const Mi = 100;
function F(t, e) {
  const n = S(), r = z();
  if (!n) return;
  const { beforeBreadcrumb: s = null, maxBreadcrumbs: o = Mi } = n.getOptions();
  if (o <= 0) return;
  const a = { timestamp: dt(), ...t }, c = s ? Q(() => s(a, e)) : a;
  c !== null && (n.emit && n.emit("beforeAddBreadcrumb", c, e), r.addBreadcrumb(c, o));
}
const $i = "FunctionToString", gn = /* @__PURE__ */ new WeakMap(), Fi = (() => ({
  name: $i,
  setupOnce() {
    const t = Function.prototype.toString;
    try {
      Function.prototype.toString = function(...e) {
        const n = he(this);
        let r;
        try {
          gn.has(S()) && n !== void 0 && (r = n);
        } catch {
        }
        return t.apply(r ?? this, e);
      };
    } catch {
    }
  },
  setup(t) {
    gn.set(t, !0);
  }
})), ji = Fi, Ui = [
  /^Script error\.?$/,
  /^Javascript error: Script error\.? on line 0$/,
  /^ResizeObserver loop completed with undelivered notifications.$/,
  // The browser logs this when a ResizeObserver handler takes a bit longer. Usually this is not an actual issue though. It indicates slowness.
  /^Cannot redefine property: googletag$/,
  // This is thrown when google tag manager is used in combination with an ad blocker
  /^Can't find variable: gmo$/,
  // Error from Google Search App https://issuetracker.google.com/issues/396043331
  /^undefined is not an object \(evaluating 'a\.[A-Z]'\)$/,
  // Random error that happens but not actionable or noticeable to end-users.
  /can't redefine non-configurable property "solana"/,
  // Probably a browser extension or custom browser (Brave) throwing this error
  /vv\(\)\.getRestrictions is not a function/,
  // Error thrown by GTM, seemingly not affecting end-users
  /Can't find variable: _AutofillCallbackHandler/,
  // Unactionable error in instagram webview https://developers.facebook.com/community/threads/320013549791141/
  /Object Not Found Matching Id:\d+, MethodName:simulateEvent/,
  // unactionable error from CEFSharp, a .NET library that embeds chromium in .NET apps
  /^Java exception was raised during method invocation$/
  // error from Facebook Mobile browser (https://github.com/getsentry/sentry-javascript/issues/15065)
], Bi = "EventFilters", Hi = (t = {}) => {
  let e;
  return {
    name: Bi,
    setup(n) {
      const r = n.getOptions();
      e = hn(t, r);
    },
    processEvent(n, r, s) {
      if (!e) {
        const o = s.getOptions();
        e = hn(t, o);
      }
      return Wi(n, e) ? null : n;
    }
  };
}, Sr = ((t = {}) => ({
  ...Hi(t),
  name: "InboundFilters"
}));
function hn(t = {}, e = {}) {
  return {
    allowUrls: [...t.allowUrls || [], ...e.allowUrls || []],
    denyUrls: [...t.denyUrls || [], ...e.denyUrls || []],
    ignoreErrors: [
      ...t.ignoreErrors || [],
      ...e.ignoreErrors || [],
      ...t.disableErrorDefaults ? [] : Ui
    ],
    ignoreTransactions: [...t.ignoreTransactions || [], ...e.ignoreTransactions || []]
  };
}
function Wi(t, e) {
  if (t.type) {
    if (t.type === "transaction" && Gi(t, e.ignoreTransactions))
      return h && d.warn(
        `Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${B(t)}`
      ), !0;
  } else {
    if (qi(t, e.ignoreErrors))
      return h && d.warn(
        `Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${B(t)}`
      ), !0;
    if (Ki(t))
      return h && d.warn(
        `Event dropped due to not having an error message, error type or stacktrace.
Event: ${B(
          t
        )}`
      ), !0;
    if (zi(t, e.denyUrls))
      return h && d.warn(
        `Event dropped due to being matched by \`denyUrls\` option.
Event: ${B(
          t
        )}.
Url: ${wt(t)}`
      ), !0;
    if (!Yi(t, e.allowUrls))
      return h && d.warn(
        `Event dropped due to not being matched by \`allowUrls\` option.
Event: ${B(
          t
        )}.
Url: ${wt(t)}`
      ), !0;
  }
  return !1;
}
function qi(t, e) {
  return e?.length ? hr(t).some((n) => pt(n, e)) : !1;
}
function Gi(t, e) {
  if (!e?.length)
    return !1;
  const n = t.transaction;
  return n ? pt(n, e) : !1;
}
function zi(t, e) {
  if (!e?.length)
    return !1;
  const n = wt(t);
  return n ? pt(n, e) : !1;
}
function Yi(t, e) {
  if (!e?.length)
    return !0;
  const n = wt(t);
  return n ? pt(n, e) : !0;
}
function Vi(t = []) {
  for (let e = t.length - 1; e >= 0; e--) {
    const n = t[e];
    if (n && n.filename !== "<anonymous>" && n.filename !== "[native code]")
      return n.filename || null;
  }
  return null;
}
function wt(t) {
  try {
    const n = [...t.exception?.values ?? []].reverse().find((r) => r.mechanism?.parent_id === void 0 && r.stacktrace?.frames?.length)?.stacktrace?.frames;
    return n ? Vi(n) : null;
  } catch {
    return h && d.error(`Cannot extract url for event ${B(t)}`), null;
  }
}
function Ki(t) {
  return t.exception?.values?.length ? (
    // No top-level message
    !t.message && // There are no exception values that have a stacktrace, a non-generic-Error type or value
    !t.exception.values.some((e) => e.stacktrace || e.type && e.type !== "Error" || e.value)
  ) : !1;
}
function Xi(t, e, n, r, s, o) {
  if (!s.exception?.values || !o || !x(o.originalException))
    return;
  const i = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
  i && (s.exception.values = ne(
    t,
    e,
    r,
    o.originalException,
    n,
    s.exception.values,
    i,
    0
  ));
}
function ne(t, e, n, r, s, o, i, a) {
  if (o.length >= n + 1)
    return o;
  let c = [...o];
  if (x(r[s])) {
    mn(i, a, r);
    const u = t(e, r[s]), f = c.length;
    _n(u, s, f, a), c = ne(
      t,
      e,
      n,
      r[s],
      s,
      [u, ...c],
      u,
      f
    );
  }
  return br(r) && r.errors.forEach((u, f) => {
    if (x(u)) {
      mn(i, a, r);
      const l = t(e, u), g = c.length;
      _n(l, `errors[${f}]`, g, a), c = ne(
        t,
        e,
        n,
        u,
        s,
        [l, ...c],
        l,
        g
      );
    }
  }), c;
}
function br(t) {
  return Array.isArray(t.errors);
}
function mn(t, e, n) {
  t.mechanism = {
    handled: !0,
    type: "auto.core.linked_errors",
    ...br(n) && { is_exception_group: !0 },
    ...t.mechanism,
    exception_id: e
  };
}
function _n(t, e, n, r) {
  t.mechanism = {
    handled: !0,
    ...t.mechanism,
    type: "chained",
    source: e,
    exception_id: n,
    parent_id: r
  };
}
function Ji(t) {
  return x(t) && "__sentry_fetch_url_host__" in t && typeof t.__sentry_fetch_url_host__ == "string";
}
function yn(t) {
  return Ji(t) ? `${t.message} (${t.__sentry_fetch_url_host__})` : t.message;
}
const En = /* @__PURE__ */ new Set([]);
function vr(t) {
  const e = "console", n = q(e, t);
  return G(e, Qi), n;
}
const Sn = /* @__PURE__ */ new Set();
function Qi() {
  "console" in m && Cn.forEach(function(t) {
    Sn.has(t) || !(t in m.console) || (Sn.add(t), I(m.console, t, function(e) {
      return Tt[t] = e, function(...n) {
        const r = n[0], s = Tt[t], o = En.size && typeof r == "string" && pt(r, En);
        o || k("console", { args: n, level: t }), (!o || h && d.isEnabled()) && s?.apply(m.console, n);
      };
    }));
  });
}
function re(t) {
  return t === "warn" ? "warning" : ["fatal", "error", "warning", "log", "info", "debug"].includes(t) ? t : "log";
}
const Zi = "CaptureConsole", ta = ((t = {}) => {
  const e = t.levels || Cn, n = t.handled ?? !0;
  return {
    name: Zi,
    setup(r) {
      "console" in m && vr(({ args: s, level: o }) => {
        S() !== r || !e.includes(o) || na(s, o, n);
      });
    }
  };
}), ea = ta;
function na(t, e, n) {
  const r = re(e), s = new Error(), o = {
    level: re(e),
    extra: {
      arguments: t
    }
  };
  _e((i) => {
    if (i.addEventProcessor((u) => (u.logger = "console", P(u, {
      handled: n,
      type: "auto.core.capture_console"
    }), u)), e === "assert") {
      if (!t[0]) {
        const u = `Assertion failed: ${Ot(t.slice(1), " ") || "console.assert"}`;
        i.setExtra("arguments", t.slice(1)), i.captureMessage(u, r, { captureContext: o, syntheticException: s });
      }
      return;
    }
    const a = t.find((u) => u instanceof Error);
    if (a) {
      Ee(a, o);
      return;
    }
    const c = Ot(t, " ");
    i.captureMessage(c, r, { captureContext: o, syntheticException: s });
  });
}
const ra = "Dedupe", sa = (() => {
  let t;
  return {
    name: ra,
    processEvent(e) {
      if (e.type)
        return e;
      try {
        if (oa(e, t))
          return h && d.warn("Event dropped due to being a duplicate of previously captured event."), null;
      } catch {
      }
      return t = e;
    }
  };
}), Ir = sa;
function oa(t, e) {
  return e ? !!(ia(t, e) || aa(t, e)) : !1;
}
function ia(t, e) {
  const n = t.message, r = e.message;
  return !(!n && !r || n && !r || !n && r || n !== r || !Rr(t, e) || !Tr(t, e));
}
function aa(t, e) {
  const n = bn(e), r = bn(t);
  return !(!n || !r || n.type !== r.type || n.value !== r.value || !Rr(t, e) || !Tr(t, e));
}
function Tr(t, e) {
  let n = Ne(t), r = Ne(e);
  if (!n && !r)
    return !0;
  if (n && !r || !n && r || (n = n, r = r, r.length !== n.length))
    return !1;
  for (let s = 0; s < r.length; s++) {
    const o = r[s], i = n[s];
    if (o.filename !== i.filename || o.lineno !== i.lineno || o.colno !== i.colno || o.function !== i.function)
      return !1;
  }
  return !0;
}
function Rr(t, e) {
  let n = t.fingerprint, r = e.fingerprint;
  if (!n && !r)
    return !0;
  if (n && !r || !n && r)
    return !1;
  n = n, r = r;
  try {
    return n.join("") === r.join("");
  } catch {
    return !1;
  }
}
function bn(t) {
  return t.exception?.values?.[0];
}
const ca = "ConversationId", ua = (() => ({
  name: ca,
  setup(t) {
    t.on("spanStart", (e) => {
      const n = C().getScopeData(), r = z().getScopeData(), s = n.conversationId || r.conversationId;
      if (s) {
        const { op: o, data: i, description: a } = Lt(e);
        if (!o?.startsWith("gen_ai.") && !i["ai.operationId"] && !a?.startsWith("ai."))
          return;
        e.setAttribute(Ls, s);
      }
    });
  }
})), fa = ua;
function kr(t) {
  if (t !== void 0)
    return t >= 400 && t < 500 ? "warning" : t >= 500 ? "error" : void 0;
}
const ct = m;
function la() {
  return "history" in ct && !!ct.history;
}
function pa() {
  if (!("fetch" in ct))
    return !1;
  try {
    return new Headers(), new Request("data:,"), new Response(), !0;
  } catch {
    return !1;
  }
}
function se(t) {
  return t && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(t.toString());
}
function da() {
  if (typeof EdgeRuntime == "string")
    return !0;
  if (!pa())
    return !1;
  if (se(ct.fetch))
    return !0;
  let t = !1;
  const e = ct.document;
  if (e && typeof e.createElement == "function")
    try {
      const n = e.createElement("iframe");
      n.hidden = !0, e.head.appendChild(n), n.contentWindow?.fetch && (t = se(n.contentWindow.fetch)), e.head.removeChild(n);
    } catch (n) {
      h && d.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", n);
    }
  return t;
}
function ga(t, e) {
  const n = "fetch", r = q(n, t);
  return G(n, () => ha(void 0, e)), r;
}
function ha(t, e = !1) {
  e && !da() || I(m, "fetch", function(n) {
    return function(...r) {
      const s = new Error(), { method: o, url: i } = ma(r), a = {
        args: r,
        fetchData: {
          method: o,
          url: i
        },
        startTimestamp: A() * 1e3,
        // // Adding the error to be able to fingerprint the failed fetch event in HttpClient instrumentation
        virtualError: s,
        headers: _a(r)
      };
      return k("fetch", {
        ...a
      }), n.apply(m, r).then(
        async (c) => (k("fetch", {
          ...a,
          endTimestamp: A() * 1e3,
          response: c
        }), c),
        (c) => {
          k("fetch", {
            ...a,
            endTimestamp: A() * 1e3,
            error: c
          }), x(c) && c.stack === void 0 && (c.stack = s.stack, $(c, "framesToPop", 1));
          const f = S()?.getOptions().enhanceFetchErrorMessages ?? "always";
          if (f !== !1 && x(c) && c.name === "TypeError" && (c.message === "Failed to fetch" || c.message === "Load failed" || c.message === "NetworkError when attempting to fetch resource."))
            try {
              const p = new URL(a.fetchData.url).host;
              f === "always" ? c.message = `${c.message} (${p})` : $(c, "__sentry_fetch_url_host__", p);
            } catch {
            }
          throw c;
        }
      );
    };
  });
}
function vt(t, e) {
  return xt(t) && !!t[e];
}
function vn(t) {
  return typeof t == "string" ? t : t ? vt(t, "url") ? t.url : t.toString ? t.toString() : "" : "";
}
function ma(t) {
  if (t.length === 0)
    return { method: "GET", url: "" };
  if (t.length === 2) {
    const [n, r] = t;
    return {
      url: vn(n),
      method: vt(r, "method") ? String(r.method).toUpperCase() : (
        // Request object as first argument
        Fn(n) && vt(n, "method") ? String(n.method).toUpperCase() : "GET"
      )
    };
  }
  const e = t[0];
  return {
    url: vn(e),
    method: vt(e, "method") ? String(e.method).toUpperCase() : "GET"
  };
}
function _a(t) {
  const [e, n] = t;
  try {
    if (typeof n == "object" && n !== null && "headers" in n && n.headers)
      return new Headers(n.headers);
    if (Fn(e))
      return new Headers(e.headers);
  } catch {
  }
}
const Or = m;
function Ie() {
  try {
    return Or.document.location.href;
  } catch {
    return "";
  }
}
function ya(t, e = 5) {
  if (!Or.HTMLElement)
    return null;
  let n = t;
  for (let r = 0; r < e; r++) {
    if (!n)
      return null;
    if (n instanceof HTMLElement) {
      if (n.dataset.sentryComponent)
        return n.dataset.sentryComponent;
      if (n.dataset.sentryElement)
        return n.dataset.sentryElement;
    }
    n = n.parentNode;
  }
  return null;
}
const y = m;
let oe = 0;
function wr() {
  return oe > 0;
}
function Ea() {
  oe++, setTimeout(() => {
    oe--;
  });
}
function X(t, e = {}) {
  function n(s) {
    return typeof s == "function";
  }
  if (!n(t))
    return t;
  try {
    if (Object.prototype.hasOwnProperty.call(t, "__sentry_wrapped__")) {
      const o = t.__sentry_wrapped__;
      return typeof o == "function" ? o : t;
    }
    if (he(t))
      return t;
  } catch {
    return t;
  }
  const r = function(...s) {
    m._sentryWrappedDepth = (m._sentryWrappedDepth || 0) + 1;
    try {
      const o = s.map((i) => X(i, e));
      return t.apply(this, o);
    } catch (o) {
      throw Ea(), _e((i) => {
        i.addEventProcessor((a) => (e.mechanism && (Kt(a, void 0), P(a, e.mechanism)), a.extra = {
          ...a.extra,
          arguments: s
        }, a)), Ee(o);
      }), o;
    } finally {
      m._sentryWrappedDepth = (m._sentryWrappedDepth || 0) - 1;
    }
  };
  try {
    for (const s in t)
      Object.prototype.hasOwnProperty.call(t, s) && (r[s] = t[s]);
  } catch {
  }
  jn(r, t), $(t, "__sentry_wrapped__", r);
  try {
    Object.getOwnPropertyDescriptor(r, "name").configurable && Object.defineProperty(r, "name", {
      get() {
        return t.name;
      }
    });
  } catch {
  }
  return r;
}
function In() {
  const t = Ie(), { referrer: e } = y.document || {}, { userAgent: n } = y.navigator || {}, r = {
    ...e && { Referer: e },
    ...n && { "User-Agent": n }
  };
  return {
    url: t,
    headers: r
  };
}
function Te(t, e) {
  const n = Pt(t, e), r = {
    type: Ta(e),
    value: Ra(e)
  };
  return n.length && (r.stacktrace = { frames: n }), r.type === void 0 && r.value === "" && (r.value = "Unrecoverable error caught"), r;
}
function Sa(t, e, n, r) {
  const o = S()?.getOptions().normalizeDepth, i = Aa(e), a = {
    __serialized__: Bn(e, o)
  };
  if (i)
    return {
      exception: {
        values: [Te(t, i)]
      },
      extra: a
    };
  const c = {
    exception: {
      values: [
        {
          type: Ct(e) ? e.constructor.name : r ? "UnhandledRejection" : "Error",
          value: wa(e, { isUnhandledRejection: r })
        }
      ]
    },
    extra: a
  };
  if (n) {
    const u = Pt(t, n);
    u.length && (c.exception.values[0].stacktrace = { frames: u });
  }
  return c;
}
function Gt(t, e) {
  return {
    exception: {
      values: [Te(t, e)]
    }
  };
}
function Pt(t, e) {
  const n = e.stacktrace || e.stack || "", r = va(e), s = Ia(e);
  try {
    return t(n, r, s);
  } catch {
  }
  return [];
}
const ba = /Minified React error #\d+;/i;
function va(t) {
  return t && ba.test(t.message) ? 1 : 0;
}
function Ia(t) {
  return typeof t.framesToPop == "number" ? t.framesToPop : 0;
}
function Nr(t) {
  return typeof WebAssembly < "u" && typeof WebAssembly.Exception < "u" ? t instanceof WebAssembly.Exception : !1;
}
function Ta(t) {
  const e = t?.name;
  return !e && Nr(t) ? t.message && Array.isArray(t.message) && t.message.length == 2 ? t.message[0] : "WebAssembly.Exception" : e;
}
function Ra(t) {
  const e = t?.message;
  return Nr(t) ? Array.isArray(t.message) && t.message.length == 2 ? t.message[1] : "wasm exception" : e ? e.error && typeof e.error.message == "string" ? yn(e.error) : yn(t) : "No error message";
}
function ka(t, e, n, r) {
  const s = n?.syntheticException || void 0, o = Re(t, e, s, r);
  return P(o), o.level = "error", n?.event_id && (o.event_id = n.event_id), mt(o);
}
function Oa(t, e, n = "info", r, s) {
  const o = r?.syntheticException || void 0, i = ie(t, e, o, s);
  return i.level = n, r?.event_id && (i.event_id = r.event_id), mt(i);
}
function Re(t, e, n, r, s) {
  let o;
  if ($n(e) && e.error)
    return Gt(t, e.error);
  if (xe(e) || Xr(e)) {
    const i = e;
    if ("stack" in e) {
      o = Gt(t, e);
      const a = o.exception?.values?.[0];
      if (r && n && a && !a.stacktrace) {
        const c = Pt(t, n);
        c.length && (a.stacktrace = { frames: c }, P(o, { synthetic: !0 }));
      }
    } else {
      const a = i.name || (xe(i) ? "DOMError" : "DOMException"), c = i.message ? `${a}: ${i.message}` : a;
      o = ie(t, c, n, r), Kt(o, c);
    }
    return "code" in i && (o.tags = { ...o.tags, "DOMException.code": `${i.code}` }), o;
  }
  return x(e) ? Gt(t, e) : Rt(e) || Ct(e) ? (o = Sa(t, e, n, s), P(o, {
    synthetic: !0
  }), o) : (o = ie(t, e, n, r), Kt(o, `${e}`), P(o, {
    synthetic: !0
  }), o);
}
function ie(t, e, n, r) {
  const s = {};
  if (r && n) {
    const o = Pt(t, n);
    o.length && (s.exception = {
      values: [{ value: e, stacktrace: { frames: o } }]
    }), P(s, { synthetic: !0 });
  }
  if (de(e)) {
    const { __sentry_template_string__: o, __sentry_template_values__: i } = e;
    return s.logentry = {
      message: o,
      params: i
    }, s;
  }
  return s.message = e, s;
}
function wa(t, { isUnhandledRejection: e }) {
  const n = Qr(t), r = e ? "promise rejection" : "exception";
  return $n(t) ? `Event \`ErrorEvent\` captured as ${r} with message \`${t.message}\`` : Ct(t) ? `Event \`${Na(t)}\` (type=${t.type}) captured as ${r}` : `Object captured as ${r} with keys: ${n}`;
}
function Na(t) {
  try {
    const e = Object.getPrototypeOf(t);
    return e ? e.constructor.name : void 0;
  } catch {
  }
}
function Aa(t) {
  return Object.values(t).find(x);
}
class xa extends ki {
  /**
   * Creates a new Browser SDK instance.
   *
   * @param options Configuration options for this SDK.
   */
  constructor(e) {
    const n = Ca(e), r = y.SENTRY_SDK_SOURCE || ti();
    Pi(n, "browser", ["browser"], r), super(n);
    const { userInfo: s } = this.getDataCollectionOptions();
    n._metadata?.sdk && (n._metadata.sdk.settings = {
      // Only allow IP inferral by Relay if the user opted in via dataCollection
      infer_ip: s ? "auto" : "never",
      // purposefully allowing already passed settings to override the default
      ...n._metadata.sdk.settings
    });
    const { sendClientReports: o } = this._options;
    y.document && y.document.addEventListener("visibilitychange", () => {
      y.document.visibilityState === "hidden" && (o && this._flushOutcomes(), queueMicrotask(() => {
        this.flush();
      }));
    }), s && this.on("beforeSendSession", Li);
  }
  /**
   * @inheritDoc
   */
  eventFromException(e, n) {
    return ka(this._options.stackParser, e, n, this._options.attachStacktrace);
  }
  /**
   * @inheritDoc
   */
  eventFromMessage(e, n = "info", r) {
    return Oa(this._options.stackParser, e, n, r, this._options.attachStacktrace);
  }
  /**
   * @inheritDoc
   */
  _prepareEvent(e, n, r, s) {
    return e.platform = e.platform || "javascript", super._prepareEvent(e, n, r, s);
  }
}
function Ca(t) {
  return {
    release: typeof __SENTRY_RELEASE__ == "string" ? __SENTRY_RELEASE__ : y.SENTRY_RELEASE?.id,
    // This supports the variable that sentry-webpack-plugin injects
    sendClientReports: !0,
    // We default this to true, as it is the safer scenario
    parentSpanIsAlwaysRootSpan: !0,
    ...t
  };
}
const Da = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, E = m;
function Tn(t, e, n) {
  E.document && E.addEventListener(t, e, n);
}
function Rn(t, e, n) {
  E.document && E.removeEventListener(t, e, n);
}
const La = (t) => {
  let e = !1;
  return () => {
    e || (t(), e = !0);
  };
}, Pa = (t) => {
  const e = E.requestIdleCallback || E.setTimeout;
  E.document?.visibilityState === "hidden" ? t() : (t = La(t), Tn("visibilitychange", t, { once: !0, capture: !0 }), Tn("pagehide", t, { once: !0, capture: !0 }), e(() => {
    t(), Rn("visibilitychange", t, { capture: !0 }), Rn("pagehide", t, { capture: !0 });
  }));
}, Ma = 80, U = {};
try {
  typeof Node < "u" && (U.parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get), typeof Element < "u" && (U.tagName = Object.getOwnPropertyDescriptor(Element.prototype, "tagName").get, U.id = Object.getOwnPropertyDescriptor(Element.prototype, "id").get, U.className = Object.getOwnPropertyDescriptor(Element.prototype, "className").get, U.getAttribute = Element.prototype.getAttribute), typeof HTMLElement < "u" && (U.dataset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "dataset").get);
} catch {
}
function L(t, e, n) {
  const r = U[e];
  if (r)
    try {
      return r.call(t, n);
    } catch {
    }
  const s = t[e];
  return typeof s == "function" ? s.call(t, n) : s;
}
function Ar(t, e = {}) {
  if (!t)
    return "<unknown>";
  try {
    let n = t;
    const r = 5, s = [];
    let o = 0, i = 0;
    const a = " > ", c = a.length;
    let u;
    const f = Array.isArray(e) ? e : e.keyAttrs, l = !Array.isArray(e) && e.maxStringLength || Ma;
    for (; n && o++ < r && (u = $a(n, f), !(u === "html" || o > 1 && i + s.length * c + u.length >= l)); )
      s.push(u), i += u.length, n = L(n, "parentNode");
    return s.reverse().join(a);
  } catch {
    return "<unknown>";
  }
}
function $a(t, e) {
  const n = [], r = L(t, "tagName");
  if (!r)
    return "";
  if (typeof HTMLElement < "u" && t instanceof HTMLElement) {
    const o = L(t, "dataset");
    if (o) {
      if (o.sentryComponent)
        return o.sentryComponent;
      if (o.sentryElement)
        return o.sentryElement;
    }
  }
  n.push(r.toLowerCase());
  const s = e?.length ? e.filter((o) => L(t, "getAttribute", o)).map((o) => [o, L(t, "getAttribute", o)]) : null;
  if (s?.length)
    s.forEach((o) => {
      n.push(`[${o[0]}="${o[1]}"]`);
    });
  else {
    const o = L(t, "id");
    o && n.push(`#${o}`);
    const i = L(t, "className");
    if (i && N(i)) {
      const a = i.split(/\s+/);
      for (const c of a)
        n.push(`.${c}`);
    }
  }
  for (const o of ["aria-label", "type", "name", "title", "alt"]) {
    const i = L(t, "getAttribute", o);
    i && n.push(`[${o}="${i}"]`);
  }
  return n.join("");
}
const Fa = 1e3;
let kn, ae, ce;
function ja(t) {
  q("dom", t), G("dom", Ua);
}
function Ua() {
  if (!E.document)
    return;
  const t = k.bind(null, "dom"), e = On(t, !0);
  E.document.addEventListener("click", e, !1), E.document.addEventListener("keypress", e, !1), ["EventTarget", "Node"].forEach((n) => {
    const s = E[n]?.prototype;
    s?.hasOwnProperty?.("addEventListener") && (I(s, "addEventListener", function(o) {
      return function(i, a, c) {
        if (i === "click" || i == "keypress")
          try {
            const u = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {}, f = u[i] = u[i] || { refCount: 0 };
            if (!f.handler) {
              const l = On(t);
              f.handler = l, o.call(this, i, l, c);
            }
            f.refCount++;
          } catch {
          }
        return o.call(this, i, a, c);
      };
    }), I(
      s,
      "removeEventListener",
      function(o) {
        return function(i, a, c) {
          if (i === "click" || i == "keypress")
            try {
              const u = this.__sentry_instrumentation_handlers__ || {}, f = u[i];
              f && (f.refCount--, f.refCount <= 0 && (o.call(this, i, f.handler, c), f.handler = void 0, delete u[i]), Object.keys(u).length === 0 && delete this.__sentry_instrumentation_handlers__);
            } catch {
            }
          return o.call(this, i, a, c);
        };
      }
    ));
  });
}
function Ba(t) {
  if (t.type !== ae)
    return !1;
  try {
    if (!t.target || t.target._sentryId !== ce)
      return !1;
  } catch {
  }
  return !0;
}
function Ha(t, e) {
  return t !== "keypress" ? !1 : e?.tagName ? !(e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable) : !0;
}
function On(t, e = !1) {
  return (n) => {
    if (!n || n._sentryCaptured)
      return;
    const r = Wa(n);
    if (Ha(n.type, r))
      return;
    $(n, "_sentryCaptured", !0), r && !r._sentryId && $(r, "_sentryId", T());
    const s = n.type === "keypress" ? "input" : n.type;
    Ba(n) || (t({ event: n, name: s, global: e }), ae = n.type, ce = r ? r._sentryId : void 0), clearTimeout(kn), kn = E.setTimeout(() => {
      ce = void 0, ae = void 0;
    }, Fa);
  };
}
function Wa(t) {
  try {
    return t.target;
  } catch {
    return null;
  }
}
let Et;
function xr(t) {
  const e = "history";
  q(e, t), G(e, qa);
}
function qa() {
  if (E.addEventListener("popstate", () => {
    const e = E.location.href, n = Et;
    if (Et = e, n === e)
      return;
    k("history", { from: n, to: e });
  }), !la())
    return;
  function t(e) {
    return function(...n) {
      const r = n.length > 2 ? n[2] : void 0;
      if (r) {
        const s = Et, o = Ga(String(r));
        if (Et = o, s === o)
          return e.apply(this, n);
        k("history", { from: s, to: o });
      }
      return e.apply(this, n);
    };
  }
  I(E.history, "pushState", t), I(E.history, "replaceState", t);
}
function Ga(t) {
  try {
    return new URL(t, E.location.origin).toString();
  } catch {
    return t;
  }
}
const It = {};
function za(t) {
  const e = It[t];
  if (e)
    return e;
  let n = E[t];
  if (se(n))
    return It[t] = n.bind(E);
  const r = E.document;
  if (r && typeof r.createElement == "function")
    try {
      const s = r.createElement("iframe");
      s.hidden = !0, r.head.appendChild(s);
      const o = s.contentWindow;
      o?.[t] && (n = o[t]), r.head.removeChild(s);
    } catch (s) {
      Da && d.warn(`Could not create sandbox iframe for ${t} check, bailing to window.${t}: `, s);
    }
  return n && (It[t] = n.bind(E));
}
function Ya(t) {
  It[t] = void 0;
}
const st = "__sentry_xhr_v3__";
function Va(t) {
  q("xhr", t), G("xhr", Ka);
}
function Ka() {
  if (!E.XMLHttpRequest)
    return;
  const t = XMLHttpRequest.prototype;
  t.open = new Proxy(t.open, {
    apply(e, n, r) {
      const s = new Error(), o = A() * 1e3, i = N(r[0]) ? r[0].toUpperCase() : void 0, a = Xa(r[1]);
      if (!i || !a)
        return e.apply(n, r);
      n[st] = {
        method: i,
        url: a,
        request_headers: {}
      }, i === "POST" && a.match(/sentry_key/) && (n.__sentry_own_request__ = !0);
      const c = () => {
        const u = n[st];
        if (u && n.readyState === 4) {
          try {
            u.status_code = n.status;
          } catch {
          }
          const f = {
            endTimestamp: A() * 1e3,
            startTimestamp: o,
            xhr: n,
            virtualError: s
          };
          k("xhr", f), n.removeEventListener("readystatechange", c);
        }
      };
      return "onreadystatechange" in n && typeof n.onreadystatechange == "function" ? n.onreadystatechange = new Proxy(n.onreadystatechange, {
        apply(u, f, l) {
          return c(), u.apply(f, l);
        }
      }) : n.addEventListener("readystatechange", c), n.setRequestHeader = new Proxy(n.setRequestHeader, {
        apply(u, f, l) {
          const [g, p] = l, _ = f[st];
          return _ && N(g) && N(p) && (_.request_headers[g.toLowerCase()] = p), u.apply(f, l);
        }
      }), e.apply(n, r);
    }
  }), t.send = new Proxy(t.send, {
    apply(e, n, r) {
      const s = n[st];
      if (!s)
        return e.apply(n, r);
      r[0] !== void 0 && (s.body = r[0]);
      const o = {
        startTimestamp: A() * 1e3,
        xhr: n
      };
      return k("xhr", o), e.apply(n, r);
    }
  });
}
function Xa(t) {
  if (N(t))
    return t;
  try {
    return t.toString();
  } catch {
  }
}
function Ja(t) {
  if (typeof Element > "u")
    return !1;
  try {
    return t instanceof Element;
  } catch {
    return !1;
  }
}
const Qa = 40;
function Za(t, e = za("fetch")) {
  let n = 0, r = 0;
  async function s(o) {
    const i = o.body.length;
    n += i, r++;
    const a = {
      body: o.body,
      method: "POST",
      referrerPolicy: "strict-origin",
      headers: t.headers,
      // Outgoing requests are usually cancelled when navigating to a different page, causing a "TypeError: Failed to
      // fetch" error and sending a "network_error" client-outcome - in Chrome, the request status shows "(cancelled)".
      // The `keepalive` flag keeps outgoing requests alive, even when switching pages. We want this since we're
      // frequently sending events right before the user is switching pages (eg. when finishing navigation transactions).
      // Gotchas:
      // - `keepalive` isn't supported by Firefox
      // - As per spec (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch):
      //   If the sum of contentLength and inflightKeepaliveBytes is greater than 64 kibibytes, then return a network error.
      //   We will therefore only activate the flag when we're below that limit.
      // There is also a limit of requests that can be open at the same time, so we also limit this to 15
      // See https://github.com/getsentry/sentry-javascript/pull/7553 for details
      keepalive: n <= 6e4 && r < 15,
      ...t.fetchOptions
    };
    try {
      const c = await e(t.url, a);
      return {
        statusCode: c.status,
        headers: {
          "x-sentry-rate-limits": c.headers.get("X-Sentry-Rate-Limits"),
          "retry-after": c.headers.get("Retry-After")
        }
      };
    } catch (c) {
      throw Ya("fetch"), c;
    } finally {
      n -= i, r--;
    }
  }
  return yi(
    t,
    s,
    ve(t.bufferSize || Qa)
  );
}
const Mt = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__, tc = 30, ec = 50;
function ue(t, e, n, r) {
  const s = {
    filename: t,
    function: e === "<anonymous>" ? W : e,
    in_app: !0
    // All browser frames are considered in_app
  };
  return n !== void 0 && (s.lineno = n), r !== void 0 && (s.colno = r), s;
}
const nc = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i, rc = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i, sc = /\((\S*)(?::(\d+))(?::(\d+))\)/, oc = /at (.+?) ?\(data:(.+?),/, ic = (t) => {
  const e = t.match(oc);
  if (e)
    return {
      filename: `<data:${e[2]}>`,
      function: e[1]
    };
  const n = nc.exec(t);
  if (n) {
    const [, s, o, i] = n;
    return ue(s, W, +o, +i);
  }
  const r = rc.exec(t);
  if (r) {
    if (r[2]?.indexOf("eval") === 0) {
      const a = sc.exec(r[2]);
      a && (r[2] = a[1], r[3] = a[2], r[4] = a[3]);
    }
    const [o, i] = Cr(r[1] || W, r[2]);
    return ue(i, o, r[3] ? +r[3] : void 0, r[4] ? +r[4] : void 0);
  }
}, ac = [tc, ic], cc = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i, uc = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i, fc = (t) => {
  const e = cc.exec(t);
  if (e) {
    if (e[3] && e[3].indexOf(" > eval") > -1) {
      const o = uc.exec(e[3]);
      o && (e[1] = e[1] || "eval", e[3] = o[1], e[4] = o[2], e[5] = "");
    }
    let r = e[3], s = e[1] || W;
    return [s, r] = Cr(s, r), ue(r, s, e[4] ? +e[4] : void 0, e[5] ? +e[5] : void 0);
  }
}, lc = [ec, fc], pc = [ac, lc], dc = Pn(...pc), Cr = (t, e) => {
  const n = t.indexOf("safari-extension") !== -1, r = t.indexOf("safari-web-extension") !== -1;
  return n || r ? [
    t.indexOf("@") !== -1 ? t.split("@")[0] : W,
    n ? `safari-extension:${e}` : `safari-web-extension:${e}`
  ] : [t, e];
}, St = 1024, gc = "Breadcrumbs", hc = ((t = {}) => {
  const e = {
    console: !0,
    dom: !0,
    fetch: !0,
    history: !0,
    sentry: !0,
    xhr: !0,
    ...t
  };
  return {
    name: gc,
    setup(n) {
      e.console && vr(Ec(n)), e.dom && ja(yc(n, e.dom)), e.xhr && Va(Sc(n)), e.fetch && ga(bc(n)), e.history && xr(vc(n)), e.sentry && n.on("beforeSendEvent", _c(n));
    }
  };
}), mc = hc;
function _c(t) {
  return function(n) {
    S() === t && F(
      {
        category: `sentry.${n.type === "transaction" ? "transaction" : "event"}`,
        event_id: n.event_id,
        level: n.level,
        message: B(n)
      },
      {
        event: n
      }
    );
  };
}
function yc(t, e) {
  return function(r) {
    if (S() !== t)
      return;
    let s, o, i = typeof e == "object" ? e.serializeAttribute : void 0, a = typeof e == "object" && typeof e.maxStringLength == "number" ? e.maxStringLength : void 0;
    a && a > St && (Mt && d.warn(
      `\`dom.maxStringLength\` cannot exceed ${St}, but a value of ${a} was configured. Sentry will use ${St} instead.`
    ), a = St), typeof i == "string" && (i = [i]);
    try {
      const u = r.event, f = Ic(u) ? u.target : u;
      s = Ar(f, { keyAttrs: i, maxStringLength: a }), o = ya(f);
    } catch {
      s = "<unknown>";
    }
    if (s.length === 0)
      return;
    const c = {
      category: `ui.${r.name}`,
      message: s
    };
    o && (c.data = { "ui.component_name": o }), F(c, {
      event: r.event,
      name: r.name,
      global: r.global
    });
  };
}
function Ec(t) {
  return function(n) {
    if (S() !== t)
      return;
    const r = {
      category: "console",
      data: {
        arguments: n.args,
        logger: "console"
      },
      level: re(n.level),
      message: Ot(n.args, " ")
    };
    if (n.level === "assert")
      if (n.args[0] === !1)
        r.message = `Assertion failed: ${Ot(n.args.slice(1), " ") || "console.assert"}`, r.data.arguments = n.args.slice(1);
      else
        return;
    F(r, {
      input: n.args,
      level: n.level
    });
  };
}
function Sc(t) {
  return function(n) {
    if (S() !== t)
      return;
    const { startTimestamp: r, endTimestamp: s } = n, o = n.xhr[st];
    if (!r || !s || !o)
      return;
    const { method: i, url: a, status_code: c, body: u } = o, f = {
      method: i,
      url: a,
      status_code: c
    }, l = {
      xhr: n.xhr,
      input: u,
      startTimestamp: r,
      endTimestamp: s
    }, g = {
      category: "xhr",
      data: f,
      type: "http",
      level: kr(c)
    };
    t.emit("beforeOutgoingRequestBreadcrumb", g, l), F(g, l);
  };
}
function bc(t) {
  return function(n) {
    if (S() !== t)
      return;
    const { startTimestamp: r, endTimestamp: s } = n;
    if (s && !(n.fetchData.url.match(/sentry_key/) && n.fetchData.method === "POST"))
      if (n.error) {
        const o = {
          data: n.error,
          input: n.args,
          startTimestamp: r,
          endTimestamp: s
        }, i = {
          category: "fetch",
          data: n.fetchData,
          level: "error",
          type: "http"
        };
        t.emit("beforeOutgoingRequestBreadcrumb", i, o), F(i, o);
      } else {
        const o = n.response, i = {
          ...n.fetchData,
          status_code: o?.status
        }, a = {
          input: n.args,
          response: o,
          startTimestamp: r,
          endTimestamp: s
        }, c = {
          category: "fetch",
          data: i,
          type: "http",
          level: kr(i.status_code)
        };
        t.emit("beforeOutgoingRequestBreadcrumb", c, a), F(c, a);
      }
  };
}
function vc(t) {
  return function(n) {
    if (S() !== t)
      return;
    let r = n.from, s = n.to;
    const o = qt(y.location.href);
    let i = r ? qt(r) : void 0;
    const a = qt(s);
    i?.path || (i = o), o.protocol === a.protocol && o.host === a.host && (s = a.relative), o.protocol === i.protocol && o.host === i.host && (r = i.relative), F({
      category: "navigation",
      data: {
        from: r,
        to: s
      }
    });
  };
}
function Ic(t) {
  return !!t && !!t.target;
}
const Tc = "EventTarget,Window,Node,ApplicationCache,AudioTrackList,BroadcastChannel,ChannelMergerNode,CryptoOperation,EventSource,FileReader,HTMLUnknownElement,IDBDatabase,IDBRequest,IDBTransaction,KeyOperation,MediaController,MessagePort,ModalWindow,Notification,SVGElementInstance,Screen,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebSocket,WebSocketWorker,Worker,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload".split(
  ","
), Rc = "BrowserApiErrors", kc = ((t = {}) => {
  const e = {
    XMLHttpRequest: !0,
    eventTarget: !0,
    requestAnimationFrame: !0,
    setInterval: !0,
    setTimeout: !0,
    unregisterOriginalCallbacks: !1,
    ...t
  };
  return {
    name: Rc,
    // TODO: This currently only works for the first client this is setup
    // We may want to adjust this to check for client etc.
    setupOnce() {
      e.setTimeout && I(y, "setTimeout", wn), e.setInterval && I(y, "setInterval", wn), e.requestAnimationFrame && I(y, "requestAnimationFrame", wc), e.XMLHttpRequest && "XMLHttpRequest" in y && I(XMLHttpRequest.prototype, "send", Nc);
      const n = e.eventTarget;
      n && (Array.isArray(n) ? n : Tc).forEach((s) => Ac(s, e));
    }
  };
}), Oc = kc;
function wn(t) {
  return function(...e) {
    const n = e[0];
    return e[0] = X(n, {
      mechanism: {
        handled: !1,
        type: `auto.browser.browserapierrors.${M(t)}`
      }
    }), t.apply(this, e);
  };
}
function wc(t) {
  return function(e) {
    return t.apply(this, [
      X(e, {
        mechanism: {
          data: {
            handler: M(t)
          },
          handled: !1,
          type: "auto.browser.browserapierrors.requestAnimationFrame"
        }
      })
    ]);
  };
}
function Nc(t) {
  return function(...e) {
    const n = this;
    return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((s) => {
      s in n && typeof n[s] == "function" && I(n, s, function(o) {
        const i = {
          mechanism: {
            data: {
              handler: M(o)
            },
            handled: !1,
            type: `auto.browser.browserapierrors.xhr.${s}`
          }
        }, a = he(o);
        return a && (i.mechanism.data.handler = M(a)), X(o, i);
      });
    }), t.apply(this, e);
  };
}
function Ac(t, e) {
  const r = y[t]?.prototype;
  r?.hasOwnProperty?.("addEventListener") && (I(r, "addEventListener", function(s) {
    return function(o, i, a) {
      try {
        xc(i) && (i.handleEvent = X(i.handleEvent, {
          mechanism: {
            data: {
              handler: M(i),
              target: t
            },
            handled: !1,
            type: "auto.browser.browserapierrors.handleEvent"
          }
        }));
      } catch {
      }
      return e.unregisterOriginalCallbacks && Cc(this, o, i), s.apply(this, [
        o,
        X(i, {
          mechanism: {
            data: {
              handler: M(i),
              target: t
            },
            handled: !1,
            type: "auto.browser.browserapierrors.addEventListener"
          }
        }),
        a
      ]);
    };
  }), I(r, "removeEventListener", function(s) {
    return function(o, i, a) {
      try {
        if (Object.prototype.hasOwnProperty.call(i, "__sentry_wrapped__")) {
          const c = i.__sentry_wrapped__;
          c && s.call(this, o, c, a);
        }
      } catch {
      }
      return s.call(this, o, i, a);
    };
  }));
}
function xc(t) {
  return typeof t.handleEvent == "function";
}
function Cc(t, e, n) {
  t && typeof t == "object" && "removeEventListener" in t && typeof t.removeEventListener == "function" && t.removeEventListener(e, n);
}
const Dc = (t = {}) => {
  const e = t.lifecycle ?? "route";
  return {
    name: "BrowserSession",
    setupOnce() {
      if (typeof y.document > "u") {
        Mt && d.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.");
        return;
      }
      rn({ ignoreDuration: !0 });
      let n = !1;
      Pa(() => {
        n || (Ht(), n = !0);
      });
      const r = z();
      let s = r.getUser();
      r.addScopeListener((o) => {
        const i = o.getUser();
        (s?.id !== i?.id || s?.ip_address !== i?.ip_address) && (s = i, n && Ht());
      }), e === "route" && xr(({ from: o, to: i }) => {
        o !== i && (rn({ ignoreDuration: !0 }), Ht(), n = !0);
      });
    }
  };
}, Lc = "CultureContext", Pc = (() => ({
  name: Lc,
  preprocessEvent(t) {
    const e = Nn();
    e && (t.contexts = {
      ...t.contexts,
      culture: { ...e, ...t.contexts?.culture }
    });
  },
  processSegmentSpan(t) {
    const e = Nn();
    e && or(t, {
      "culture.locale": e.locale,
      "culture.timezone": e.timezone,
      "culture.calendar": e.calendar
    });
  }
})), Mc = Pc;
function Nn() {
  try {
    const t = y.Intl;
    if (!t)
      return;
    const e = t.DateTimeFormat().resolvedOptions();
    return {
      locale: e.locale,
      timezone: e.timeZone,
      calendar: e.calendar
    };
  } catch {
    return;
  }
}
const $c = "GlobalHandlers", Fc = ((t = {}) => {
  const e = {
    onerror: !0,
    onunhandledrejection: !0,
    ...t
  };
  return {
    name: $c,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(n) {
      e.onerror && (jc(n), An("onerror")), e.onunhandledrejection && (Uc(n), An("onunhandledrejection"));
    }
  };
}), Dr = Fc;
function jc(t) {
  zr((e) => {
    const { stackParser: n, attachStacktrace: r } = Lr();
    if (S() !== t || wr())
      return;
    const { msg: s, url: o, line: i, column: a, error: c } = e, u = Wc(
      Re(n, c || s, void 0, r, !1),
      o,
      i,
      a
    );
    u.level = "error", ar(u, {
      originalException: c,
      mechanism: {
        handled: !1,
        type: "auto.browser.global_handlers.onerror"
      }
    });
  });
}
function Uc(t) {
  Vr((e) => {
    const { stackParser: n, attachStacktrace: r } = Lr();
    if (S() !== t || wr())
      return;
    const s = Bc(e), o = ft(s) ? Hc(s) : Re(n, s, void 0, r, !0);
    o.level = "error", ar(o, {
      originalException: s,
      mechanism: {
        handled: !1,
        type: "auto.browser.global_handlers.onunhandledrejection"
      }
    });
  });
}
function Bc(t) {
  if (ft(t))
    return t;
  try {
    if ("reason" in t)
      return t.reason;
    if ("detail" in t && "reason" in t.detail)
      return t.detail.reason;
  } catch {
  }
  return t;
}
function Hc(t) {
  return {
    exception: {
      values: [
        {
          type: "UnhandledRejection",
          // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
          value: `Non-Error promise rejection captured with value: ${String(t)}`
        }
      ]
    }
  };
}
function Wc(t, e, n, r) {
  const s = t.exception = t.exception || {}, o = s.values = s.values || [], i = o[0] = o[0] || {}, a = i.stacktrace = i.stacktrace || {}, c = a.frames = a.frames || [];
  return c.length === 0 && c.push({
    colno: r,
    lineno: n,
    filename: qc(e) ?? Ie(),
    function: W,
    in_app: !0
  }), t;
}
function An(t) {
  Mt && d.log(`Global Handler attached: ${t}`);
}
function Lr() {
  return S()?.getOptions() || {
    stackParser: () => [],
    attachStacktrace: !1
  };
}
function qc(t) {
  if (!(!N(t) || t.length === 0))
    return t.startsWith("data:") ? `<${Di(t, !1)}>` : t;
}
const Gc = () => ({
  name: "HttpContext",
  preprocessEvent(t) {
    if (!y.navigator && !y.location && !y.document)
      return;
    const e = In(), n = {
      ...e.headers,
      ...t.request?.headers
    };
    t.request = {
      ...e,
      ...t.request,
      headers: n
    };
  },
  processSegmentSpan(t) {
    const e = t.attributes?.[Vn];
    if (!y.navigator && !y.location && !y.document)
      return;
    const n = In();
    or(t, {
      // Coerce empty string to undefined so the helper's nullish check drops it,
      // rather than writing an empty `url.full` attribute onto the span.
      [xo]: e !== "http.client" ? n.url : void 0,
      "http.request.header.user_agent": n.headers["User-Agent"],
      "http.request.header.referer": n.headers.Referer
    });
  }
}), zc = "cause", Yc = 5, Vc = "LinkedErrors", Kc = ((t = {}) => {
  const e = t.limit || Yc, n = t.key || zc;
  return {
    name: Vc,
    preprocessEvent(r, s, o) {
      const i = o.getOptions();
      Xi(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        Te,
        i.stackParser,
        n,
        e,
        r,
        s
      );
    }
  };
}), Pr = Kc, Xc = /^HTML(\w*)Element$/;
function Jc(t) {
  if (typeof window < "u" && t === window)
    return "[Window]";
  if (typeof document < "u" && t === document)
    return "[Document]";
  if (Ja(t)) {
    const e = Qc(t);
    if (Xc.test(e))
      return `[HTMLElement: ${Ar(t)}]`;
  }
}
function Qc(t) {
  const e = Object.getPrototypeOf(t);
  return e?.constructor ? e.constructor.name : "null prototype";
}
function Zc() {
  return tu() ? (Mt && Q(() => {
    console.error(
      "[Sentry] You cannot use Sentry.init() in a browser extension, see: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/"
    );
  }), !0) : !1;
}
function tu() {
  if (typeof y.window > "u")
    return !1;
  const t = y;
  if (t.nw || !(t.chrome || t.browser)?.runtime?.id)
    return !1;
  const n = Ie();
  return !(y === y.top && /^(?:chrome-extension|moz-extension|ms-browser-extension|safari-web-extension):\/\//.test(n));
}
function eu(t) {
  return [
    // TODO(v11): Replace with `eventFiltersIntegration` once we remove the deprecated `inboundFiltersIntegration`
    // eslint-disable-next-line typescript/no-deprecated
    Sr(),
    ji(),
    fa(),
    Oc(),
    mc(),
    Dr(),
    Pr(),
    Ir(),
    Gc(),
    Mc(),
    Dc()
  ];
}
function nu(t = {}) {
  const e = !t.skipBrowserExtensionCheck && Zc();
  let n = t.defaultIntegrations == null ? eu() : t.defaultIntegrations;
  const r = {
    ...t,
    enabled: e ? !1 : t.enabled,
    stackParser: qr(t.stackParser || dc),
    integrations: Jo({
      integrations: t.integrations,
      defaultIntegrations: n
    }),
    transport: t.transport || Za
  };
  return rs(Jc), xi(xa, r);
}
const ru = 0.5, su = /* @__PURE__ */ new Set(["thechoicervoicer.app", "www.thechoicervoicer.app"]), ou = /* @__PURE__ */ new Set([
  "choicervoicer.pages.dev",
  "choicervoicer-7w4.pages.dev",
  "choicervoicer-dev.pages.dev"
]);
function iu(t) {
  return t === "/pack-maker" || t.startsWith("/pack-maker/");
}
function au(t) {
  return [...ou].some((e) => t === e || t.endsWith(`.${e}`));
}
function cu({ hostname: t, pathname: e, localTest: n = !1, surfaceHint: r = "" }) {
  const s = r === "pack-maker" || iu(e), o = su.has(t);
  return {
    enabled: n || o || au(t),
    environment: n ? "local-test" : o ? "production" : "preview",
    surface: s ? "pack-maker" : "studio",
    redactSensitiveData: !s,
    errorSampleRate: n || s ? 1 : ru,
    consoleLevels: s ? ["error"] : ["error", "warn"]
  };
}
const uu = "https://724b958183104963b5a71051c715c024@er.thechoicervoicer.app/1", fu = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]"]), lu = /^(?:chrome|moz|safari-web)-extension:\/\//i, pu = /(?:^|\/)multiplayer\.js(?:[?#]|$)/i, du = /\/vendor\/ogv\/ogv(?:-[^/?]+)?\.js(?:[?#]|$)/i, gu = /^(?:authorization|cookie|proxy-authorization|x-room-token)$/i, Mr = /^(?:deviceId|groupId|deviceLabel|label|token|roomCode|playerId|playerName|email|recordingId|caption|packId|packTitle|blob|url)$/i;
let xn = !1, it = !1;
const $r = /* @__PURE__ */ new WeakSet();
function fe(t) {
  if (typeof t != "string" || !t) return t;
  try {
    const e = new URL(t, window.location.origin);
    return e.protocol === "blob:" || e.protocol === "data:" ? `${e.protocol}[redacted]` : (e.search = "", e.hash = "", e.pathname = e.pathname.replace(/(\/api\/rooms\/)[^/]+/i, "$1[room]"), e.toString());
  } catch {
    return t.split(/[?#]/, 1)[0].replace(/(\/api\/rooms\/)[^/]+/i, "$1[room]");
  }
}
function hu(t) {
  if (t.category === "console" || t.category?.startsWith("ui.")) return null;
  if (!t.data) return t;
  for (const e of ["url", "from", "to"])
    t.data[e] && (t.data[e] = fe(t.data[e]));
  return t;
}
function mu(t) {
  const e = t.exception?.values?.flatMap((n) => n.stacktrace?.frames || []).map((n) => n.filename).filter(Boolean) || [];
  return e.length > 0 && e.every((n) => lu.test(n) || /(?:googletagmanager|google-analytics|doubleclick|adsterra)\./i.test(n));
}
function _u(t) {
  const e = t.tags?.error_area;
  return e === "microphone" ? !1 : e === "multiplayer" ? !0 : !!t.exception?.values?.some((n) => n.stacktrace?.frames?.some((r) => pu.test(r.filename || "")));
}
function yu(t) {
  if (t.tags?.error_area === "microphone") return !1;
  const e = t.exception?.values || [];
  return e.some((r) => r.type === "AbortError" && /^Aborted$/i.test(String(r.value || "").trim())) ? e.some((r) => r.stacktrace?.frames?.some((s) => du.test(s.filename || "") || /^(?:ArrayBufferBackend|StreamFile|OGVWrapperCodec)\./.test(s.function || ""))) : !1;
}
function Eu(t) {
  return !!t.exception?.values?.some((e) => e.type === "PackImportError");
}
function Su(t) {
  return t.tags?.error_area === "microphone" && t.tags?.expected_permission_failure === "true";
}
function bu(t, e = {}, n = !0) {
  const r = e.originalException;
  if (t.logger === "console" && r && typeof r == "object" && $r.has(r) || _u(t) || yu(t) || Eu(t) || Su(t) || mu(t)) return null;
  if (n) {
    if (t.request && (t.request.url = fe(t.request.url), delete t.request.data, t.request.headers))
      for (const s of Object.keys(t.request.headers))
        gu.test(s) ? delete t.request.headers[s] : /^(?:origin|referer|referrer)$/i.test(s) && (t.request.headers[s] = fe(t.request.headers[s]));
    delete t.user;
  }
  return t.logger === "console" && (t.tags = {
    ...t.tags || {},
    error_area: t.tags?.error_area || "console",
    error_stage: t.tags?.error_stage || (t.level === "warning" ? "console-warning" : "console-error"),
    client_sample_rate: t.tags?.client_sample_rate || "1"
  }, n && t.extra && (t.extra = ut(t.extra))), t;
}
function ut(t, e = 0) {
  return t == null || typeof t == "boolean" || typeof t == "number" ? t : typeof t == "string" ? t.slice(0, 200) : e >= 3 ? "[truncated]" : Array.isArray(t) ? t.slice(0, 20).map((n) => ut(n, e + 1)) : typeof t != "object" ? String(t).slice(0, 200) : Object.fromEntries(Object.entries(t).filter(([n]) => !Mr.test(n)).slice(0, 60).map(([n, r]) => [n, ut(r, e + 1)]));
}
function vu(t) {
  return Object.freeze({
    captureException(e, n = {}) {
      if (!it) return null;
      const r = e && typeof e == "object" ? e : new Error(String(e || "Unknown frontend error"));
      $r.add(r);
      const s = Number(n.sampleRate ?? 1), o = Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : 1;
      return o < 1 && Math.random() >= o ? null : _e((a) => {
        const c = String(n.area || "frontend").slice(0, 80), u = String(n.stage || "unknown").slice(0, 80);
        a.setLevel(n.level || "error"), a.setTag("error_area", c), a.setTag("error_stage", u), a.setTag("error_name", String(r.name || "Error").slice(0, 80)), a.setTag("client_sample_rate", String(o));
        for (const [l, g] of Object.entries(n.tags || {}))
          (!t || !Mr.test(l)) && g != null && a.setTag(l.slice(0, 80), String(g).slice(0, 200));
        const f = t ? ut(n.context || {}) : n.context;
        return f && typeof f == "object" && Object.keys(f).length && a.setContext(c, f), a.setFingerprint([
          "choicervoicer",
          c,
          String(n.fingerprint || u || r.name || "error").slice(0, 200)
        ]), Ee(r);
      });
    },
    addBreadcrumb(e, n = {}) {
      it && F({
        category: "microphone",
        level: "info",
        message: String(e).slice(0, 200),
        data: t ? ut(n) : n
      });
    }
  });
}
function Iu(t, e) {
  return fu.has(t) && new URLSearchParams(e).get("bugsink-test") === "1";
}
function Tu() {
  if (xn) return it;
  xn = !0;
  const { hostname: t, pathname: e, search: n } = window.location, r = Iu(t, n), s = document.querySelector('meta[name="choicer-surface"]')?.content || "", o = cu({ hostname: t, pathname: e, localTest: r, surfaceHint: s });
  return it = o.enabled, window.ChoicerMonitoring = vu(o.redactSensitiveData), it ? (nu({
    dsn: uu,
    release: "choicervoicer-web@249f8bcf4668",
    environment: o.environment,
    // Studio traffic remains sampled to protect the self-hosted digest
    // worker. Pack Maker and explicit local tests retain every error.
    sampleRate: o.errorSampleRate,
    tracesSampleRate: 0,
    sendDefaultPii: !o.redactSensitiveData,
    sendClientReports: !1,
    attachStacktrace: !0,
    // Preserve nested diagnostic arrays such as Pack Maker FFmpeg logs.
    normalizeDepth: 5,
    maxBreadcrumbs: 40,
    // The browser defaults instrument timers, DOM events, XHR/fetch,
    // navigation, sessions, and more. This site only needs uncaught errors,
    // promise rejections, explicit captures, and console errors.
    defaultIntegrations: [],
    integrations: [
      Sr(),
      Dr(),
      Pr(),
      Ir(),
      ea({ levels: o.consoleLevels, handled: !0 })
    ],
    ignoreErrors: [
      /^ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i,
      /^Non-Error promise rejection captured with value: Object Not Found Matching Id/i
    ],
    denyUrls: [
      /^(?:chrome|moz|safari-web)-extension:\/\//i,
      /(?:googletagmanager|google-analytics|doubleclick|adsterra)\./i
    ],
    ...o.redactSensitiveData ? { beforeBreadcrumb: hu } : {},
    beforeSend: (a, c) => bu(a, c, o.redactSensitiveData),
    initialScope: {
      tags: {
        surface: o.surface
      }
    }
  }), !0) : !1;
}
export {
  Tu as initializeMonitoring
};
//# sourceMappingURL=browser-xN4dxw4e.js.map

//# debugId=c1ff5b5c-5bfd-5601-a09c-e248af9b8a92
