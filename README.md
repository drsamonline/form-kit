# form-kit

[![live](https://img.shields.io/badge/live-online-22c55e)](https://drsamonline.github.io/form-kit/)
[![test](https://github.com/drsamonline/form-kit/actions/workflows/test.yml/badge.svg)](https://github.com/drsamonline/form-kit/actions/workflows/test.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)

**24 form controls for offline apps.** Zero dependencies. One file. The controls every app in
this fleet hand-rolls — inputs, selects, a date picker, OTP boxes, uploads, checkboxes,
switches, sliders, rating, toggles, colour pickers — with one API and one validation pass.

## Use it

```js
var F = require("./form-kit.js");             // Node; in a browser it is window.Form

var name = F.input({ label: "Name", required: true });
document.body.appendChild(name.wrap);         // label + control + help + error line

name.value();                                 // read
name.set("Ada");                              // write, without firing a change
name.on("change", fn);                        // listen

F.bind(name, someSignal);                     // two-way with a ui-kit signal
```

## What it does

- **Text** — `input`, `textarea`, `password`, `search`, `number` (reads as a number or
  `null`), `date`, `datePicker`
- **Choice** — `select`, `autocomplete` (type to filter, click to pick), `checkbox`,
  `switch`, `radioGroup`, `slider`, `rate`, `toggleGroup` (single or multiple), `otp`
- **Wider** — `calendar` (Monday-first month grid, ISO dates), `upload`, `colorSwatches`,
  `colorPicker`, `imageSelect`, `editableText`, `hotkey`
- **Layout** — `field` wrappers with label, help text, required marker and an error line
  wired by `aria-describedby`; `group` as a `fieldset`; `submitFooter`
- **`F.validate(values, rules)`** — `required`, `min`, `max`, `minLength`, `maxLength`,
  `pattern`, and a custom `validate` that returns `true` or a message. Errors are messages,
  because the message is what the user has to read
- **`F.showErrors(controls, result)`** — paints those messages onto the controls and sets
  `aria-invalid`
- **`F.values(controls)`** — collect a named set of controls into one object
- **`F.bind(control, signal)`** — two-way binding to anything callable with `.update()`, so
  `ui-kit` stays optional rather than a dependency

Every control returns the same shape — `el`, `wrap`, `value()`, `set()`, `on()`, `disable()`,
`invalid()` — so a form can be built, validated and reset without special-casing any of them.

## Verified

```
node test-node.js
108 passed, 0 failed
```

The tests run against a small DOM written inside `test-node.js` (createElement, appendChild,
setAttribute, addEventListener, dispatch), so the kit exercises the same code paths in Node
that it does in a page. They cover each control's structure and ARIA attributes, value
round-trips, change events, the calendar's Monday-first grid and year wrap, OTP focus flow,
autocomplete filtering and selection, multi-select toggles, every validation rule, and
binding in both directions.

## Consumers

None, by design — no app in the fleet is modified by this pass. The measured case for it:
date pickers appear in 18 files across 5 sampled apps, checkboxes and switches in 14 files
across 5, sliders in 2. Adopting it is a decision made one app at a time.

## Deferred, and why

`hotkeyInput`'s capture is here as `hotkey`; lobe's `Select` with async search and its
`Upload` with a progress stream are not — no app in the fleet has asked for either yet. Adding
them later is additive, not a breaking change.

## Support

<img src="docs/assets/support-portrait.jpg" width="72" height="72" alt="Dr. Sohil Momin" align="left" style="border-radius:50%;margin-right:1rem">

Free, offline, accountless — and staying that way. If it earned its keep:

| | |
|---|---|
| UPI (India) | `drsohilboi@ybl` — payee Dr. Sohil Momin, open amount, or scan [the QR](docs/assets/upi-qr.svg) |
| GitHub Sponsors | [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) |
| Ko-fi | [ko-fi.com/matneo](https://ko-fi.com/matneo) |
| PayPal | [paypal.me/drsohilmomin](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN) |
| My books | [Amazon author store](https://www.amazon.com/stores/author/B08ZT331LY/allbooks) |
| More apps | [drsamonline.github.io](https://drsamonline.github.io/) |
| Email | [sohilmomin2000@gmail.com](mailto:sohilmomin2000@gmail.com) |

Nothing is gated behind it: no accounts, no tracking, no network requests.

## Licence

PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin. Part of the Forge system — kits
open, orchestrator licensed.
