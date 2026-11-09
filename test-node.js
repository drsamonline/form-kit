/* A DOM small enough to run these tests in Node, and real enough that the kit
 * uses the same code paths it uses in a page: createElement, appendChild,
 * setAttribute, addEventListener and dispatch. */
function makeDom() {
  function Node(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      className: "",
      id: "",
      textContent: "",
      innerHTML: "",
      value: "",
      checked: false,
      disabled: false,
      hidden: false,
      files: null,
      style: {},
      attrs: {},
      children: [],
      listeners: {},
      appendChild(child) { this.children.push(child); return child; },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
      removeAttribute(k) { delete this.attrs[k]; },
      hasAttribute(k) { return this.attrs[k] !== undefined; },
      addEventListener(kind, fn) { (this.listeners[kind] = this.listeners[kind] || []).push(fn); },
      removeEventListener(kind, fn) {
        this.listeners[kind] = (this.listeners[kind] || []).filter((f) => f !== fn);
      },
      dispatch(kind, extra) {
        const ev = Object.assign({ type: kind, preventDefault() {}, target: this }, extra || {});
        (this.listeners[kind] || []).forEach((fn) => fn(ev));
        return ev;
      },
      focus() { this.focused = true; },
      select() { this.selected = true; },
      click() { this.dispatch("click"); },
      querySelector() { return null; },
      /* enough traversal for assertions */
      all(pred, out) {
        out = out || [];
        if (pred(this)) out.push(this);
        this.children.forEach((c) => (c && c.all ? c.all(pred, out) : null));
        return out;
      }
    };
  }
  /* innerHTML is a setter that clears children, as a browser's does: a kit that
     empties a list must actually empty it. */
  const origNode = Node;
  function NodeWithHtml(tag) {
    const n = origNode(tag);
    let html = "";
    Object.defineProperty(n, "innerHTML", {
      get() { return html; },
      set(v) { html = String(v); if (v === "") n.children.length = 0; }
    });
    return n;
  }
  const doc = {
    createElement: (tag) => NodeWithHtml(tag),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) })
  };
  return doc;
}

const path = require("path");
global.document = makeDom();
const F = require(path.join(__dirname, "form-kit.js"));

let pass = 0, fail = 0;
function ok(n, c, e) { c ? (pass++, console.log("PASS  " + n + (e ? "  (" + e + ")" : ""))) : (fail++, console.log("FAIL  " + n + (e ? "  (" + e + ")" : ""))); }
const textOf = (n) => n.all((x) => x.nodeType === 3).map((x) => x.textContent).join("") + n.all((x) => x.textContent && !x.children.length).map((x) => x.textContent).join("");

/* ---------- shape ---------- */
ok("version is a string", typeof F.version === "string", F.version);
ok("24 controls are exported", ["input", "textarea", "number", "password", "search", "otp", "select",
  "autocomplete", "date", "datePicker", "calendar", "upload", "checkbox", "switch", "radioGroup",
  "slider", "rate", "toggleGroup", "colorSwatches", "colorPicker", "imageSelect", "editableText",
  "hotkey", "group"].every((k) => typeof F[k] === "function"),
  Object.keys(F).filter((k) => typeof F[k] === "function").length + " functions");

/* ---------- text inputs ---------- */
const input = F.input({ label: "Name", value: "Ada", required: true, placeholder: "Your name", name: "n" });
ok("input has a value", input.value() === "Ada");
ok("input sets a value", (input.set("Grace"), input.value() === "Grace"));
ok("input element is an input", input.el.tagName === "INPUT");
ok("input keeps its placeholder", input.el.getAttribute("placeholder") === "Your name");
ok("input has an id", !!input.el.getAttribute("id"));
ok("input is wrapped with a label", !!input.wrap && input.wrap.tagName === "DIV");
ok("label points at the input", input.wrap.all((x) => x.tagName === "LABEL")[0].getAttribute("for") === input.el.getAttribute("id"));
ok("required is marked", input.wrap.all((x) => x.className === "field-required").length === 1);
ok("input emits change", (function () {
  let seen = null;
  input.on("change", (v) => (seen = v));
  input.el.value = "typed";
  input.el.dispatch("change");
  return seen === "typed";
})());
ok("input emits input", (function () {
  let seen = null;
  input.on("input", (v) => (seen = v));
  input.el.value = "x";
  input.el.dispatch("input");
  return seen === "x";
})());
ok("help text is wired with aria-describedby", (function () {
  const c = F.input({ label: "A", help: "Some help" });
  return c.el.getAttribute("aria-describedby") === c.el.getAttribute("id") + "-help";
})());
ok("password is type password", F.password({}).el.getAttribute("type") === "password");
ok("search has the searchbox role", F.search({}).el.getAttribute("role") === "searchbox");
ok("textarea is a textarea", F.textarea({}).el.tagName === "TEXTAREA");

const num = F.number({ label: "Age", min: 0, max: 120, value: 30 });
ok("number reads as a number", num.value() === 30);
ok("number returns null when empty", (num.set(""), num.value() === null));
ok("number carries min and max", num.el.getAttribute("min") === "0" && num.el.getAttribute("max") === "120");
ok("date input is type date", F.date({}).el.getAttribute("type") === "date");

/* ---------- OTP ---------- */
const otp = F.otp({ length: 4, label: "Code" });
ok("otp has one cell per digit", otp.cells.length === 4);
ok("otp sets across cells", (otp.set("1234"), otp.value() === "1234"));
ok("otp is a group", otp.el.getAttribute("role") === "group");
ok("otp emits when complete", (function () {
  let seen = null;
  otp.on("change", (v) => (seen = v));
  otp.set("9999");
  otp.cells[3].dispatch("input");
  return seen === "9999";
})());

/* ---------- select and autocomplete ---------- */
const sel = F.select({ label: "Colour", options: ["red", "green"], value: "green" });
ok("select has options plus none", sel.el.children.length === 2);
ok("select reads its value", sel.value() === "green");
ok("select sets its value", (sel.set("red"), sel.value() === "red"));
ok("select accepts labelled options", (function () {
  const s = F.select({ options: [{ value: "a", label: "Option A" }] });
  return s.el.children[0].getAttribute("value") === "a" && s.el.children[0].textContent === "Option A";
})());
ok("select placeholder adds a disabled option", (function () {
  const s = F.select({ placeholder: "Pick one", options: ["a"] });
  return s.el.children[0].getAttribute("value") === "" && s.el.children[0].getAttribute("disabled") === "";
})());

const ac = F.autocomplete({ label: "Remedy", options: ["Arnica", "Belladonna", "Bryonia"] });
ok("autocomplete filters", (function () {
  ac.filter("bel");
  const items = ac.wrap.all((x) => x.className === "autocomplete-item");
  return items.length === 1 && items[0].textContent === "Belladonna";
})());
ok("autocomplete selects on click", (function () {
  let seen = null;
  ac.on("change", (v) => (seen = v));
  ac.filter("arn");
  const item = ac.wrap.all((x) => x.className === "autocomplete-item")[0];
  item.dispatch("click");
  return seen === "Arnica" && ac.value() === "Arnica";
})());
ok("autocomplete hides an empty list", (function () {
  ac.filter("");
  const list = ac.wrap.all((x) => x.className === "autocomplete-list")[0];
  return list.hidden === true;
})());
ok("autocomplete is a combobox", ac.el.getAttribute("role") === "combobox");

/* ---------- calendar ---------- */
const cal = F.calendar({ year: 2026, month: 10, value: "2026-11-09" });
ok("calendar titles the month", cal.el.all((x) => x.className === "calendar-title")[0].textContent === "November 2026");
ok("calendar shows 30 days in November", cal.el.all((x) => x.className && x.className.indexOf("calendar-cell") === 0 && x.className.indexOf("is-empty") === -1).length === 30);
ok("calendar marks the selected day", cal.el.all((x) => x.className.indexOf("is-selected") !== -1).length === 1);
ok("calendar emits on click", (function () {
  let seen = null;
  cal.on("change", (v) => (seen = v));
  const cell = cal.el.all((x) => x.getAttribute && x.getAttribute("data-date") === "2026-11-15")[0];
  cell.dispatch("click");
  return seen === "2026-11-15";
})());
ok("calendar steps months", (function () {
  cal.next();
  return cal.month().month === 11;
})());
ok("calendar wraps the year", (function () {
  const c = F.calendar({ year: 2026, month: 11 });
  c.next();
  return c.month().year === 2027 && c.month().month === 0;
})());
ok("calendar starts weeks on Monday", (function () {
  /* 1 November 2026 is a Sunday: it must land in the last column */
  const c = F.calendar({ year: 2026, month: 10 });
  const row = c.el.all((x) => x.className === "calendar-row" && x.children.some((k) => k.getAttribute && k.getAttribute("data-date")))[0];
  const cells = row.children;
  return cells[cells.length - 1].getAttribute("data-date") === "2026-11-01";
})());

/* ---------- upload ---------- */
const up = F.upload({ label: "Attach", accept: ".pdf", multiple: true });
ok("upload hides the file input", up.el.all((x) => x.tagName === "INPUT")[0].getAttribute("hidden") === "");
ok("upload passes accept", up.el.all((x) => x.tagName === "INPUT")[0].getAttribute("accept") === ".pdf");
ok("upload sets files", (up.set([{ name: "a.pdf", size: 12 }]), up.value().length === 1));
ok("upload lists the files", up.el.all((x) => x.className === "upload-item")[0].textContent.indexOf("a.pdf") === 0);
ok("upload clears", (up.clear(), up.value().length === 0));

/* ---------- choice ---------- */
const cb = F.checkbox({ label: "Agree", value: true });
ok("checkbox reads true", cb.value() === true);
ok("checkbox toggles", (cb.set(false), cb.value() === false));
ok("checkbox is a checkbox", cb.el.getAttribute("type") === "checkbox");
ok("checkbox emits change", (function () {
  let seen = null;
  cb.on("change", (v) => (seen = v));
  cb.el.checked = true;
  cb.el.dispatch("change");
  return seen === true;
})());

const sw = F.switch({ label: "Dark mode", value: false });
ok("switch has the switch role", sw.el.getAttribute("role") === "switch");
ok("switch sets", (sw.set(true), sw.value() === true));

const rg = F.radioGroup({ label: "Plan", options: ["free", "pro"], value: "pro" });
ok("radio group has one input per option", rg.el.all((x) => x.getAttribute && x.getAttribute("type") === "radio").length === 2);
ok("radio group reads the checked option", rg.value() === "pro");
ok("radio group sets", (rg.set("free"), rg.value() === "free"));
ok("radio group is a radiogroup", rg.el.getAttribute("role") === "radiogroup");
ok("radio inputs share a name", (function () {
  const names = rg.el.all((x) => x.getAttribute && x.getAttribute("type") === "radio").map((x) => x.getAttribute("name"));
  return names[0] === names[1] && !!names[0];
})());

const sl = F.slider({ label: "Volume", min: 0, max: 10, value: 5 });
ok("slider reads a number", sl.value() === 5);
ok("slider sets", (sl.set(8), sl.value() === 8));
ok("slider shows its value", sl.wrap.all((x) => x.tagName === "OUTPUT")[0].textContent === "8");

const rt = F.rate({ value: 3 });
ok("rate reads its value", rt.value() === 3);
ok("rate has five stars", rt.el.all((x) => x.className.indexOf("rate-star") === 0).length === 5);
ok("rate marks the chosen stars", rt.el.all((x) => x.className.indexOf("is-on") !== -1).length === 3);
ok("rate sets", (rt.set(5), rt.el.all((x) => x.className.indexOf("is-on") !== -1).length === 5));
ok("rate emits on click", (function () {
  let seen = null;
  rt.on("change", (v) => (seen = v));
  rt.el.all((x) => x.getAttribute && x.getAttribute("data-value") === "2")[0].dispatch("click");
  return seen === 2;
})());

const tg = F.toggleGroup({ options: ["a", "b", "c"], value: "b" });
ok("toggle group reads its value", tg.value() === "b");
ok("toggle group marks one", tg.el.all((x) => x.className.indexOf("is-on") !== -1).length === 1);
ok("toggle group toggles off", (function () {
  tg.el.all((x) => x.getAttribute && x.getAttribute("data-value") === "b")[0].dispatch("click");
  return tg.value() === null;
})());
const tgm = F.toggleGroup({ options: ["a", "b"], multiple: true, value: ["a"] });
ok("multi toggle group returns an array", Array.isArray(tgm.value()) && tgm.value().length === 1);
ok("multi toggle group adds and removes", (function () {
  tgm.el.all((x) => x.getAttribute && x.getAttribute("data-value") === "b")[0].dispatch("click");
  const two = tgm.value().length === 2;
  tgm.el.all((x) => x.getAttribute && x.getAttribute("data-value") === "a")[0].dispatch("click");
  return two && tgm.value().length === 1;
})());

/* ---------- colour ---------- */
const cs = F.colorSwatches({ value: "#f5222d" });
ok("swatches render the palette", cs.el.all((x) => x.className.indexOf("swatch") === 0).length === F.swatches.length);
ok("swatches mark the chosen colour", cs.el.all((x) => x.className.indexOf("is-on") !== -1).length === 1);
ok("swatches emit on click", (function () {
  let seen = null;
  cs.on("change", (v) => (seen = v));
  cs.el.all((x) => x.getAttribute && x.getAttribute("data-color") === "#1677ff")[0].dispatch("click");
  return seen === "#1677ff";
})());

const cp = F.colorPicker({ value: "#22c55e" });
ok("colour picker reads its value", cp.value() === "#22c55e");
ok("colour picker keeps a text field in step", (function () {
  cp.set("#ffffff");
  return cp.wrap.all((x) => x.getAttribute && x.getAttribute("type") === "text")[0].value === "#ffffff";
})());

const is = F.imageSelect({ options: [{ value: "a", label: "A", src: "a.png" }, { value: "b", label: "B", src: "b.png" }], value: "b" });
ok("image select renders options", is.el.all((x) => x.className.indexOf("image-option") === 0).length === 2);
ok("image select marks the chosen one", is.el.all((x) => x.className.indexOf("is-on") !== -1).length === 1);
ok("image select renders the image", is.el.all((x) => x.tagName === "IMG").length === 2);

/* ---------- editable text and hotkey ---------- */
const ed = F.editableText({ value: "Title" });
ok("editable starts as text", ed.el.textContent === "Title");
ok("editable enters edit mode on click", (function () {
  ed.el.dispatch("click");
  return ed.editing() === true;
})());
ok("editable commits", (function () {
  const box = ed.el.all((x) => x.tagName === "INPUT")[0];
  box.value = "Renamed";
  ed.commit();
  return ed.value() === "Renamed" && ed.editing() === false;
})());
ok("editable cancels", (function () {
  ed.el.dispatch("click");
  ed.el.all((x) => x.tagName === "INPUT")[0].value = "Nope";
  ed.cancel();
  return ed.value() === "Renamed";
})());

const hk = F.hotkey({ label: "Shortcut" });
ok("hotkey captures a combination", (function () {
  let seen = null;
  hk.on("change", (v) => (seen = v));
  hk.el.dispatch("keydown", { key: "k", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false });
  return seen === "Ctrl+K" && hk.value() === "Ctrl+K";
})());
ok("hotkey ignores a bare key", (function () {
  hk.set("");
  hk.el.dispatch("keydown", { key: "a", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false });
  return hk.value() === "";
})());
ok("hotkey clears on Escape", (function () {
  hk.set("Ctrl+K");
  hk.el.dispatch("keydown", { key: "Escape", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false });
  return hk.value() === "";
})());

/* ---------- layout ---------- */
const grp = F.group({ label: "Details", children: [input, cb] });
ok("group is a fieldset", grp.el.tagName === "FIELDSET");
ok("group has a legend", grp.el.all((x) => x.tagName === "LEGEND")[0].textContent === "Details");
ok("group holds its children", grp.el.children.length === 3);
const foot = F.submitFooter({ submit: "Save", cancel: "Cancel" });
ok("footer has two buttons", foot.el.children.length === 2);
ok("footer submit is a submit button", foot.submit.getAttribute("type") === "submit");

/* ---------- validation ---------- */
const rules = {
  name: { required: true, minLength: 2 },
  age: { min: 18, message: "Must be an adult" },
  email: { pattern: /^[^@]+@[^@]+\.[^@]+$/, message: "Not an email" },
  code: { validate: (v) => (v === "1234" ? true : "Wrong code") }
};
let r = F.validate({ name: "", age: 20, email: "a@b.co", code: "1234" }, rules);
ok("required fails on empty", r.valid === false && r.errors.name === "Required");
r = F.validate({ name: "A", age: 20, email: "a@b.co", code: "1234" }, rules);
ok("minLength fails", r.valid === false && /At least 2/.test(r.errors.name));
r = F.validate({ name: "Ada", age: 12, email: "a@b.co", code: "1234" }, rules);
ok("min fails with a custom message", r.valid === false && r.errors.age === "Must be an adult");
r = F.validate({ name: "Ada", age: 20, email: "nope", code: "1234" }, rules);
ok("pattern fails", r.valid === false && r.errors.email === "Not an email");
r = F.validate({ name: "Ada", age: 20, email: "a@b.co", code: "9999" }, rules);
ok("custom validate fails", r.valid === false && r.errors.code === "Wrong code");
r = F.validate({ name: "Ada", age: 20, email: "a@b.co", code: "1234" }, rules);
ok("valid values pass", r.valid === true && Object.keys(r.errors).length === 0);
ok("optional empty fields are skipped", F.validate({ name: "Ada" }, { age: { min: 18 } }).valid === true);
ok("maxLength is enforced", F.validate({ n: "abcdef" }, { n: { maxLength: 3 } }).valid === false);

/* showErrors paints the control */
const ctrl = F.input({ label: "Name" });
const res = F.showErrors({ name: ctrl }, { valid: false, errors: { name: "Required" } });
ok("showErrors marks the control invalid", ctrl.el.getAttribute("aria-invalid") === "true");
ok("showErrors writes the message", ctrl.wrap.all((x) => x.className === "field-error")[0].textContent === "Required");
ok("showErrors returns the result", res.errors.name === "Required");
F.showErrors({ name: ctrl }, { valid: true, errors: {} });
ok("showErrors clears", ctrl.el.getAttribute("aria-invalid") === null);

/* values() collects by name */
ok("values collects controls", (function () {
  const a = F.input({ value: "x" }), b = F.number({ value: 2 });
  const v = F.values({ a, b });
  return v.a === "x" && v.b === 2;
})());

/* ---------- binding ---------- */
/* A signal shaped like ui-kit's: callable, with update() and subscribe(). */
function signal(initial) {
  let value = initial;
  const subs = [];
  const s = function () { return value; };
  s.update = function (fn) { value = fn(value); subs.forEach((f) => f(value)); return s; };
  s.subscribe = function (fn) { subs.push(fn); return s; };
  s.set = function (v) { value = v; subs.forEach((f) => f(v)); return s; };
  return s;
}
const sig = signal("start");
const bound = F.bind(F.input({}), sig);
ok("bind seeds the control from the signal", bound.value() === "start");
ok("bind writes back on change", (function () {
  bound.el.value = "typed";
  bound.el.dispatch("change");
  return sig() === "typed";
})());
ok("bind follows the signal", (function () {
  sig.set("from signal");
  return bound.value() === "from signal";
})());
ok("bind tolerates a non-signal", F.bind(F.input({}), null).value() === "");

/* mount */
ok("mount appends the control", (function () {
  const host = document.createElement("div");
  F.mount(host, F.input({}));
  return host.children.length === 1;
})());
ok("mount tolerates null", F.mount(null, null) === null);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
