# Architecture

## Runtime — `window.Platform`
Composed by `core/platform.js`; bootstrapped by `core/boot.js` in fixed order:
install storage/error listeners → hydrate state → load locale → theme/brand/persona → router/nav → ready.
Subsystems: `Config, Endpoints, Flags, Routes, Personas, StateSchema, Brand, I18n, Router, State, Bus,
API, BaseService, UI, Format, Storage, Log, Errors, A11y, Modules, Theme, Persona, Nav, Lifecycle`.

## Base classes (mandatory reuse)
- **`PfBaseElement`** (`shared/components/_base.js`) — shadow DOM, one cached shared stylesheet,
  auto-cleanup listeners, scoped queries, `t()`. Every `<pf-*>` extends it.
- **`BaseModule`** (`core/base-module.js`) — static `id/label/icon/nav/audience/status`; default
  `onMount` fetches `view.html`, injects `styles.css`, resolves `[data-i18n]`; scoped `state`/`shared`,
  auto-cleared timers/listeners, `this.call(serviceFn,args)`. Every module extends it.
- **`BaseService`** (`core/base-service.js`) — `endpoint(KEY, opts)` factory: key resolution,
  expectedKeys validation, cache/sort/paginate. No service writes raw `fetch`.

## API path
Call sites use a registry **key** only. `core/api.js` is the sole `fetch` site: 45s AbortController,
recursive payload sanitisation, dual-envelope normalisation (v1 `ok` / v4 `success`), never-throw
normalised result `{ok,kind,status,data,errors,body,headers,durationMs,correlationId}`, auto-toast,
structured log with persona + correlationId.

## CSS
`@layer reset, tokens, themes, subbrand, primitives, shell, components, modules, utilities, animations,
responsive, print`. Colour literals live only in `themes/`. `!important` only in `utilities.css`.

## Inter-module discipline (§3.13)
Modules import only from `core/`, `shared/`, `config/` — never another module. Cross-cutting
communication via `Platform.Bus` (`module:<id>:<verb>`, `platform:<system>:<verb>`, `audit:<verb>`)
and shared state (`shared.<domain>.*`, declared once in `config/state.schema.js`).
