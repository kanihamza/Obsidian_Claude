# Events

Bus namespaces (§3.11): `module:<id>:<verb>` · `platform:<system>:<verb>` · `audit:<verb>`.

| Event | Publisher | Payload |
|---|---|---|
| platform:ready | boot | { ts } |
| platform:route:changed / platform:nav:changed | router | { id, params } |
| platform:nav:rebuilt | nav-controller | { groups, utils, activeId } |
| platform:nav:toggle | header | {} |
| platform:theme:changed / :cycle | theme-manager | { mode, resolved } |
| platform:brand:changed | brand-manager | { id } |
| platform:persona:changed | persona-controller | { id } |
| platform:state:changed | state | { path, value } |
| platform:storage:changed | storage | { key, value } |
| platform:ui:toast / :toast-dismiss | ui | { id, text, variant, timeout } |
| platform:ui:modal / :modal-close | ui | { id, titleKey, … } |
| platform:error | errors | normalized result |
| module:<id>:data-loaded | base-module | { endpoint } |
| audit:persona-switch / audit:route-denied | persona/router | { persona, … } |
