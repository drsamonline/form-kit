# form-kit — API reference

**Version 1.0.0.** **24 form controls for offline apps.** Zero dependencies. One file. The controls every app in this fleet hand-rolls — inputs, selects, a date picker, OTP boxes, uploads, checkboxes, switches, sliders, rating, toggles, colour pickers — with one API and one validation pass.

Generated from the source in this repository: every name, argument and
note below is read out of the kit file, so it cannot describe a function
that is not there.

```js
<script src="form-kit.js"></script>
Form.input(...)
// or: const Form = require('./form-kit.js')
```

## The surface (30 entries)

| Name | Arguments | What it does |
|---|---|---|
| `Form.input` | `(props)` | — |
| `Form.textarea` | `(props)` | — |
| `Form.password` | `(props)` | — |
| `Form.search` | `(props)` | — |
| `Form.number` | `(props)` | — |
| `Form.date` | `(props)` | — |
| `Form.otp` | `(props)` | — |
| `Form.select` | `(props)` | — |
| `Form.autocomplete` | `(props)` | — |
| `Form.calendar` | `(props)` | A month grid. Monday first, ISO weeks, no locale dependency. |
| `Form.datePicker` | `(props)` | — |
| `Form.upload` | `(props)` | — |
| `Form.checkbox` | `(props)` | — |
| `Form.switch` | `(props)` | — |
| `Form.radioGroup` | `(props)` | — |
| `Form.slider` | `(props)` | — |
| `Form.rate` | `(props)` | — |
| `Form.toggleGroup` | `(props)` | — |
| `Form.colorSwatches` | `(props)` | — |
| `Form.colorPicker` | `(props)` | — |
| `Form.imageSelect` | `(props)` | — |
| `Form.editableText` | `(props)` | A span that becomes an input when clicked: the pattern a title or a tag uses. |
| `Form.hotkey` | `(props)` | — |
| `Form.group` | `(props)` | — |
| `Form.submitFooter` | `(props)` | — |
| `Form.validate` | `(values, rules)` | — |
| `Form.showErrors` | `(controls, result)` | Paint the result of validate() onto the controls, by field name. |
| `Form.values` | `(controls)` | Collect values from a set of controls, by name. |
| `Form.bind` | `(c, signal)` | — |
| `Form.mount` | `(target, c)` | Mount a control (or a group) into an element. |

## Notes

- Zero dependencies, one file, no build step: it works from `file://`, from a
  `<script>` tag and from Node.
- The version above is the `VERSION` file in this repository; a pinned copy is
  what an app vendors.
