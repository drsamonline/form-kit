/* form-kit — form controls for offline apps. Zero dependencies. One file.
 *
 * The controls every drsamonline app hand-rolls: inputs, selects, date pickers,
 * OTP boxes, uploads, checkboxes, switches, sliders, rating, colour pickers and
 * validation. Each control is a real DOM element with the same small API:
 *
 *   var c = Form.input({ label: "Name", value: "Ada", required: true });
 *   c.el;                 // the element to append
 *   c.value();            // read
 *   c.set("Grace");       // write, without firing a change
 *   c.on("change", fn);   // listen
 *
 * Bind a control to a ui-kit signal with Form.bind(control, signal): the signal
 * is duck-typed (callable, with .update), so ui-kit stays optional.
 *
 * Ported in shape from lobe-mygo pkg/field, pkg/choice and pkg/form (MIT): the
 * same control set and the same props. The Go code draws on a GPU surface; this
 * builds DOM, so it works in a page, a PWA and a single-file app.
 *
 * PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Form = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var F = { version: "1.0.0" };

  /* ---------- element helpers ---------- */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k === "html") e.innerHTML = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "value") { e.value = v; e.setAttribute("value", v); }
        else if (k === "checked") e.checked = !!v;
        else if (k === "style" && typeof v === "object") Object.keys(v).forEach(function (p) { e.style[p] = v[p]; });
        else e.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : (c.el || c));
    });
    return e;
  }
  F.el = el;

  var uid = 0;
  function id(prefix) { return prefix + "-" + (++uid); }

  /* Every control returns this shape, so a caller can treat them alike. */
  function control(e, get, set, opts) {
    var o = opts || {};
    var listeners = { change: [], input: [] };

    function emit(kind, value) {
      (listeners[kind] || []).forEach(function (fn) { fn(value); });
    }

    var api = {
      el: e,
      value: function () { return get(); },
      set: function (v) { set(v); return api; },
      on: function (kind, fn) {
        (listeners[kind] = listeners[kind] || []).push(fn);
        return api;
      },
      emit: emit,
      disable: function (v) {
        api.el.disabled = v !== false;
        if (v !== false) api.el.setAttribute("disabled", "");
        else api.el.removeAttribute("disabled");
        return api;
      },
      invalid: function (msg) {
        if (msg) {
          api.el.setAttribute("aria-invalid", "true");
          api.el.setAttribute("data-invalid", "true");
          if (o.errorEl) { o.errorEl.textContent = msg; o.errorEl.hidden = false; }
        } else {
          api.el.removeAttribute("aria-invalid");
          api.el.removeAttribute("data-invalid");
          if (o.errorEl) { o.errorEl.textContent = ""; o.errorEl.hidden = true; }
        }
        return api;
      }
    };
    return api;
  }

  /* Wrap a control with its label, help text and error line. */
  function labelled(tag, label, controlEl, opts) {
    var o = opts || {};
    var controlId = controlEl.getAttribute("id") || id("f");
    controlEl.setAttribute("id", controlId);
    var errorEl = el("p", { class: "field-error", role: "alert", hidden: true });
    var parts = [];
    if (label) {
      var lab = el("label", { class: "field-label", for: controlId, text: label });
      if (o.required) lab.appendChild(el("span", { class: "field-required", text: " *", "aria-hidden": "true" }));
      parts.push(lab);
    }
    parts.push(controlEl);
    if (o.help) {
      var helpId = controlId + "-help";
      parts.push(el("p", { class: "field-help", id: helpId, text: o.help }));
      controlEl.setAttribute("aria-describedby", helpId);
    }
    parts.push(errorEl);
    var wrap = el("div", { class: "field" + (o.class ? " " + o.class : ""), "data-field": tag }, parts);
    return { wrap: wrap, errorEl: errorEl, id: controlId };
  }

  /* ---------- text-ish inputs ---------- */
  function textish(tag, props, type) {
    var p = props || {};
    var inputId = p.id || id("in");
    var attrs = { id: inputId, type: type || "text", class: "control" };
    if (p.placeholder) attrs.placeholder = p.placeholder;
    if (p.name) attrs.name = p.name;
    if (p.autocomplete) attrs.autocomplete = p.autocomplete;
    if (p.maxlength) attrs.maxlength = p.maxlength;
    if (p.inputmode) attrs.inputmode = p.inputmode;
    if (p.disabled) attrs.disabled = true;
    var input = el(tag, attrs);
    if (p.value != null) input.value = p.value;

    var wrap = labelled("input", p.label, input, p);
    var c = control(input, function () { return input.value; }, function (v) {
      input.value = v == null ? "" : String(v);
    }, { errorEl: wrap.errorEl });

    input.addEventListener("input", function () { c.emit("input", input.value); });
    input.addEventListener("change", function () { c.emit("change", input.value); });

    /* keep the wrapper and the control together for a caller that mounts one */
    c.wrap = wrap.wrap;
    return c;
  }

  F.input = function (props) { return textish("input", props, "text"); };
  F.textarea = function (props) { return textish("textarea", props); };
  F.password = function (props) { return textish("input", props, "password"); };
  F.search = function (props) {
    var c = textish("input", props, "search");
    c.el.setAttribute("role", "searchbox");
    return c;
  };

  F.number = function (props) {
    var p = props || {};
    var c = textish("input", p, "number");
    if (p.min != null) c.el.setAttribute("min", p.min);
    if (p.max != null) c.el.setAttribute("max", p.max);
    if (p.step != null) c.el.setAttribute("step", p.step);
    var read = c.value, write = c.set;
    c.value = function () {
      var v = read();
      if (v === "" || v == null) return null;
      var n = Number(v);
      return isNaN(n) ? null : n;
    };
    c.set = function (v) { write(v == null ? "" : v); return c; };
    return c;
  };

  F.date = function (props) {
    var c = textish("input", props, "date");
    if (props && props.min) c.el.setAttribute("min", props.min);
    if (props && props.max) c.el.setAttribute("max", props.max);
    return c;
  };

  /* ---------- OTP ---------- */
  F.otp = function (props) {
    var p = props || {};
    var length = p.length || 6;
    var box = el("div", { class: "otp", role: "group", "aria-label": p.label || "One-time code" });
    var cells = [];
    for (var i = 0; i < length; i++) {
      var cell = el("input", {
        class: "otp-cell", type: "text", inputmode: "numeric", maxlength: 1,
        "aria-label": "Digit " + (i + 1), autocomplete: "one-time-code"
      });
      cells.push(cell);
      box.appendChild(cell);
    }
    function value() { return cells.map(function (c) { return c.value; }).join(""); }
    function set(v) {
      var s = String(v == null ? "" : v);
      cells.forEach(function (c, i) { c.value = s.charAt(i) || ""; });
    }
    var wrap = labelled("otp", p.label, box, p);
    var api = control(box, value, set, { errorEl: wrap.errorEl });

    cells.forEach(function (cell, i) {
      cell.addEventListener("input", function () {
        if (cell.value && i + 1 < cells.length) cells[i + 1].focus && cells[i + 1].focus();
        if (value().length === length) api.emit("change", value());
      });
      cell.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !cell.value && i > 0) cells[i - 1].focus && cells[i - 1].focus();
      });
    });
    api.cells = cells;
    api.wrap = wrap.wrap;
    return api;
  };

  /* ---------- select and autocomplete ---------- */
  F.select = function (props) {
    var p = props || {};
    var selectId = p.id || id("sel");
    var select = el("select", { id: selectId, class: "control" });
    if (p.placeholder) {
      select.appendChild(el("option", { value: "", text: p.placeholder, disabled: !p.allowEmpty, selected: p.value == null }));
    }
    (p.options || []).forEach(function (o) {
      var value = typeof o === "object" ? o.value : o;
      var label = typeof o === "object" ? (o.label == null ? o.value : o.label) : o;
      select.appendChild(el("option", { value: value, text: label }));
    });
    if (p.value != null) select.value = p.value;

    var wrap = labelled("select", p.label, select, p);
    var api = control(select, function () { return select.value; }, function (v) { select.value = v; }, { errorEl: wrap.errorEl });
    select.addEventListener("change", function () { api.emit("change", select.value); });
    api.wrap = wrap.wrap;
    return api;
  };

  /* A text input with a filtered list beneath it: the same behaviour as a
     select, but you can type. */
  F.autocomplete = function (props) {
    var p = props || {};
    var options = (p.options || []).map(function (o) {
      return typeof o === "object" ? o : { value: o, label: o };
    });
    var inputId = p.id || id("ac");
    var input = el("input", {
      id: inputId, type: "text", class: "control", role: "combobox",
      "aria-autocomplete": "list", "aria-expanded": "false", autocomplete: "off"
    });
    var list = el("ul", { class: "autocomplete-list", role: "listbox", hidden: true });
    var box = el("div", { class: "autocomplete" }, [input, list]);
    var wrap = labelled("autocomplete", p.label, box, p);
    var selected = p.value == null ? "" : p.value;
    if (p.value != null) input.value = p.value;

    function render(query) {
      list.innerHTML = "";
      var q = String(query || "").toLowerCase();
      var hits = options.filter(function (o) { return String(o.label).toLowerCase().indexOf(q) !== -1; });
      if (p.limit) hits = hits.slice(0, p.limit);
      hits.forEach(function (o) {
        var li = el("li", { role: "option", class: "autocomplete-item", "data-value": o.value, text: o.label });
        li.addEventListener("click", function () {
          selected = o.value;
          input.value = o.label;
          list.hidden = true;
          input.setAttribute("aria-expanded", "false");
          api.emit("change", selected);
        });
        list.appendChild(li);
      });
      list.hidden = hits.length === 0 || q === "";
      input.setAttribute("aria-expanded", list.hidden ? "false" : "true");
    }

    input.addEventListener("input", function () { render(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { list.hidden = true; input.setAttribute("aria-expanded", "false"); }
    });

    var api = control(input, function () { return selected; }, function (v) {
      selected = v;
      var hit = options.filter(function (o) { return o.value === v; })[0];
      input.value = hit ? hit.label : (v == null ? "" : v);
    }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    api.options = options;
    api.filter = render;
    return api;
  };

  /* ---------- calendar and date picker ---------- */
  /* A month grid. Monday first, ISO weeks, no locale dependency. */
  F.calendar = function (props) {
    var p = props || {};
    var state = { month: p.month == null ? new Date().getMonth() : p.month, year: p.year == null ? new Date().getFullYear() : p.year };
    var selected = p.value || null;
    var grid = el("div", { class: "calendar", role: "grid", "aria-label": p.label || "Calendar" });
    var head = el("div", { class: "calendar-head" });
    var prev = el("button", { type: "button", class: "calendar-nav", "aria-label": "Previous month", text: "\u2039" });
    var next = el("button", { type: "button", class: "calendar-nav", "aria-label": "Next month", text: "\u203a" });
    var title = el("span", { class: "calendar-title" });
    head.appendChild(prev); head.appendChild(title); head.appendChild(next);
    var body = el("div", { class: "calendar-body" });
    grid.appendChild(head); grid.appendChild(body);

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function iso(y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); }

    function draw() {
      var names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      var monthNames = ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];
      title.textContent = monthNames[state.month] + " " + state.year;
      body.innerHTML = "";
      var dow = el("div", { class: "calendar-row calendar-dow" });
      names.forEach(function (n) { dow.appendChild(el("span", { class: "calendar-dow-cell", text: n.charAt(0) })); });
      body.appendChild(dow);

      var first = new Date(Date.UTC(state.year, state.month, 1));
      var startCol = (first.getUTCDay() + 6) % 7;              /* Monday = 0 */
      var days = new Date(Date.UTC(state.year, state.month + 1, 0)).getUTCDate();
      var cells = [];
      for (var i = 0; i < startCol; i++) cells.push(null);
      for (var d = 1; d <= days; d++) cells.push(d);

      var row = el("div", { class: "calendar-row" });
      cells.forEach(function (d, i) {
        if (i % 7 === 0 && i > 0) { body.appendChild(row); row = el("div", { class: "calendar-row" }); }
        if (d === null) { row.appendChild(el("span", { class: "calendar-cell is-empty" })); return; }
        var value = iso(state.year, state.month, d);
        var cell = el("button", {
          type: "button", class: "calendar-cell" + (value === selected ? " is-selected" : ""),
          "data-date": value, text: String(d), "aria-label": value
        });
        cell.addEventListener("click", function () {
          selected = value;
          draw();
          api.emit("change", value);
        });
        row.appendChild(cell);
      });
      body.appendChild(row);
    }

    prev.addEventListener("click", function () {
      state.month--; if (state.month < 0) { state.month = 11; state.year--; } draw();
    });
    next.addEventListener("click", function () {
      state.month++; if (state.month > 11) { state.month = 0; state.year++; } draw();
    });

    var wrap = labelled("calendar", p.label, grid, p);
    var api = control(grid, function () { return selected; }, function (v) {
      selected = v || null;
      if (v) { var parts = String(v).split("-"); state.year = +parts[0]; state.month = +parts[1] - 1; }
      draw();
    }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    api.month = function () { return { year: state.year, month: state.month }; };
    api.next = function () { state.month++; if (state.month > 11) { state.month = 0; state.year++; } draw(); };
    api.prev = function () { state.month--; if (state.month < 0) { state.month = 11; state.year--; } draw(); };
    draw();
    return api;
  };

  F.datePicker = function (props) {
    var p = props || {};
    var c = textish("input", p, "date");
    if (p.min) c.el.setAttribute("min", p.min);
    if (p.max) c.el.setAttribute("max", p.max);
    return c;
  };

  /* ---------- upload ---------- */
  F.upload = function (props) {
    var p = props || {};
    var inputId = p.id || id("up");
    var input = el("input", {
      id: inputId, type: "file", class: "upload-input", hidden: true
    });
    if (p.accept) input.setAttribute("accept", p.accept);
    if (p.multiple) input.setAttribute("multiple", "");
    var button = el("button", { type: "button", class: "control upload-button", text: p.label || "Choose a file" });
    var listEl = el("ul", { class: "upload-list" });
    var files = [];
    var box = el("div", { class: "upload" }, [button, input, listEl]);

    function draw() {
      listEl.innerHTML = "";
      files.forEach(function (f) {
        listEl.appendChild(el("li", { class: "upload-item", "data-name": f.name, text: f.name + " · " + (f.size || 0) + " B" }));
      });
    }

    button.addEventListener("click", function () { input.click && input.click(); });
    input.addEventListener("change", function () {
      files = [];
      var list = input.files || [];
      for (var i = 0; i < list.length; i++) files.push(list[i]);
      if (!p.multiple && files.length > 1) files = files.slice(0, 1);
      draw();
      api.emit("change", files);
    });

    var wrap = labelled("upload", p.label, box, p);
    var api = control(box, function () { return files; }, function (v) { files = v || []; draw(); }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    api.clear = function () { files = []; if (input.value !== undefined) input.value = ""; draw(); return api; };
    api.draw = draw;
    return api;
  };

  /* ---------- choice ---------- */
  F.checkbox = function (props) {
    var p = props || {};
    var inputId = p.id || id("cb");
    var input = el("input", { id: inputId, type: "checkbox", class: "control-check" });
    input.checked = !!p.value;
    var label = el("label", { class: "choice-label", for: inputId }, [input, el("span", { text: p.label || "" })]);
    var box = el("div", { class: "choice" }, [label]);
    var errorEl = el("p", { class: "field-error", role: "alert", hidden: true });
    box.appendChild(errorEl);
    var api = control(input, function () { return !!input.checked; }, function (v) { input.checked = !!v; }, { errorEl: errorEl });
    input.addEventListener("change", function () { api.emit("change", !!input.checked); });
    api.wrap = box;
    return api;
  };

  F.switch = function (props) {
    var p = props || {};
    var inputId = p.id || id("sw");
    var input = el("input", { id: inputId, type: "checkbox", role: "switch", class: "control-switch" });
    input.checked = !!p.value;
    var label = el("label", { class: "choice-label switch-label", for: inputId }, [input, el("span", { class: "switch-track", "aria-hidden": "true" })]);
    var box = el("div", { class: "choice switch" }, [label]);
    if (p.label) box.appendChild(el("span", { class: "switch-text", text: p.label }));
    var errorEl = el("p", { class: "field-error", role: "alert", hidden: true });
    box.appendChild(errorEl);
    var api = control(input, function () { return !!input.checked; }, function (v) { input.checked = !!v; }, { errorEl: errorEl });
    input.addEventListener("change", function () { api.emit("change", !!input.checked); });
    api.wrap = box;
    return api;
  };

  F.radioGroup = function (props) {
    var p = props || {};
    var name = p.name || id("rg");
    var options = (p.options || []).map(function (o) {
      return typeof o === "object" ? o : { value: o, label: o };
    });
    var inputs = [];
    var box = el("div", { class: "radio-group", role: "radiogroup" });
    if (p.label) box.setAttribute("aria-label", p.label);
    options.forEach(function (o) {
      var rid = id("r");
      var input = el("input", { id: rid, type: "radio", name: name, class: "control-radio" });
      input.value = o.value;
      input.checked = o.value === p.value;
      inputs.push(input);
      box.appendChild(el("label", { class: "choice-label", for: rid }, [input, el("span", { text: o.label == null ? o.value : o.label })]));
    });
    var wrap = labelled("radio", p.label, box, p);
    function read() {
      for (var i = 0; i < inputs.length; i++) if (inputs[i].checked) return inputs[i].value;
      return null;
    }
    var api = control(box, read, function (v) {
      inputs.forEach(function (i) { i.checked = i.value === v; });
    }, { errorEl: wrap.errorEl });
    inputs.forEach(function (i) {
      i.addEventListener("change", function () { api.emit("change", read()); });
    });
    api.wrap = wrap.wrap;
    return api;
  };

  F.slider = function (props) {
    var p = props || {};
    var inputId = p.id || id("sl");
    var input = el("input", {
      id: inputId, type: "range", class: "control-slider",
      min: p.min == null ? 0 : p.min, max: p.max == null ? 100 : p.max, step: p.step == null ? 1 : p.step
    });
    input.value = p.value == null ? (p.min == null ? 0 : p.min) : p.value;
    var out = el("output", { class: "slider-value", text: String(input.value) });
    var box = el("div", { class: "slider" }, [input, out]);
    var wrap = labelled("slider", p.label, box, p);
    var api = control(input, function () { return Number(input.value); }, function (v) {
      input.value = v; out.textContent = String(v);
    }, { errorEl: wrap.errorEl });
    input.addEventListener("input", function () {
      out.textContent = String(input.value);
      api.emit("input", Number(input.value));
    });
    input.addEventListener("change", function () { api.emit("change", Number(input.value)); });
    api.wrap = wrap.wrap;
    return api;
  };

  F.rate = function (props) {
    var p = props || {};
    var count = p.count || 5;
    var value = p.value || 0;
    var box = el("div", { class: "rate", role: "radiogroup", "aria-label": p.label || "Rating" });
    var buttons = [];
    for (var i = 1; i <= count; i++) {
      (function (n) {
        var b = el("button", {
          type: "button", class: "rate-star", "data-value": n, role: "radio",
          "aria-label": n + (n === 1 ? " star" : " stars"), text: "\u2605"
        });
        b.addEventListener("click", function () {
          value = n;
          draw();
          api.emit("change", n);
        });
        buttons.push(b);
        box.appendChild(b);
      })(i);
    }
    function draw() {
      buttons.forEach(function (b, idx) {
        var on = idx + 1 <= value;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.className = "rate-star" + (on ? " is-on" : "");
      });
    }
    var wrap = labelled("rate", p.label, box, p);
    var api = control(box, function () { return value; }, function (v) { value = Number(v) || 0; draw(); }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    draw();
    return api;
  };

  F.toggleGroup = function (props) {
    var p = props || {};
    var options = (p.options || []).map(function (o) {
      return typeof o === "object" ? o : { value: o, label: o };
    });
    var multi = !!p.multiple;
    var selected = multi ? (p.value || []).slice() : p.value;
    var box = el("div", { class: "toggle-group", role: "group" });
    var buttons = [];
    options.forEach(function (o) {
      var b = el("button", { type: "button", class: "toggle", "data-value": o.value, text: o.label == null ? o.value : o.label });
      b.addEventListener("click", function () {
        if (multi) {
          var at = selected.indexOf(o.value);
          if (at === -1) selected.push(o.value); else selected.splice(at, 1);
        } else {
          selected = selected === o.value ? null : o.value;
        }
        draw();
        api.emit("change", multi ? selected.slice() : selected);
      });
      buttons.push({ b: b, v: o.value });
      box.appendChild(b);
    });
    function draw() {
      buttons.forEach(function (x) {
        var on = multi ? selected.indexOf(x.v) !== -1 : selected === x.v;
        x.b.setAttribute("aria-pressed", on ? "true" : "false");
        x.b.className = "toggle" + (on ? " is-on" : "");
      });
    }
    var wrap = labelled("toggle", p.label, box, p);
    var api = control(box, function () { return multi ? selected.slice() : selected; }, function (v) {
      selected = multi ? (v || []).slice() : v;
      draw();
    }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    draw();
    return api;
  };

  /* ---------- colour ---------- */
  var SWATCHES = [
    "#000000", "#1f1f1f", "#434343", "#595959", "#8c8c8c", "#bfbfbf", "#d9d9d9", "#ffffff",
    "#f5222d", "#fa541c", "#fa8c16", "#faad14", "#fadb14", "#a0d911", "#52c41a", "#13c2c2",
    "#1677ff", "#2f54eb", "#722ed1", "#eb2f96"
  ];
  F.swatches = SWATCHES.slice();

  F.colorSwatches = function (props) {
    var p = props || {};
    var colors = p.colors || SWATCHES;
    var value = p.value || null;
    var box = el("div", { class: "color-swatches", role: "radiogroup", "aria-label": p.label || "Colour" });
    var buttons = [];
    colors.forEach(function (c) {
      var b = el("button", {
        type: "button", class: "swatch", "data-color": c, role: "radio",
        "aria-label": c, style: { background: c }
      });
      b.addEventListener("click", function () { value = c; draw(); api.emit("change", c); });
      buttons.push({ b: b, c: c });
      box.appendChild(b);
    });
    function draw() {
      buttons.forEach(function (x) {
        var on = x.c === value;
        x.b.setAttribute("aria-checked", on ? "true" : "false");
        x.b.className = "swatch" + (on ? " is-on" : "");
      });
    }
    var wrap = labelled("swatches", p.label, box, p);
    var api = control(box, function () { return value; }, function (v) { value = v; draw(); }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    draw();
    return api;
  };

  F.colorPicker = function (props) {
    var p = props || {};
    var inputId = p.id || id("cp");
    var input = el("input", { id: inputId, type: "color", class: "control-color" });
    input.value = p.value || "#22c55e";
    var text = el("input", { type: "text", class: "control color-text", "aria-label": "Colour value" });
    text.value = input.value;
    var box = el("div", { class: "color-picker" }, [input, text]);
    var wrap = labelled("color", p.label, box, p);
    var api = control(input, function () { return input.value; }, function (v) {
      input.value = v; text.value = v;
    }, { errorEl: wrap.errorEl });
    input.addEventListener("input", function () { text.value = input.value; api.emit("input", input.value); });
    input.addEventListener("change", function () { api.emit("change", input.value); });
    text.addEventListener("change", function () {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) { input.value = text.value; api.emit("change", input.value); }
    });
    api.wrap = wrap.wrap;
    return api;
  };

  F.imageSelect = function (props) {
    var p = props || {};
    var options = p.options || [];
    var value = p.value || null;
    var box = el("div", { class: "image-select", role: "radiogroup", "aria-label": p.label || "Choose an image" });
    var buttons = [];
    options.forEach(function (o) {
      var b = el("button", {
        type: "button", class: "image-option", role: "radio", "data-value": o.value,
        "aria-label": o.label || o.value
      });
      if (o.src) b.appendChild(el("img", { src: o.src, alt: o.label || "", loading: "lazy" }));
      if (o.label) b.appendChild(el("span", { class: "image-label", text: o.label }));
      b.addEventListener("click", function () { value = o.value; draw(); api.emit("change", o.value); });
      buttons.push({ b: b, v: o.value });
      box.appendChild(b);
    });
    function draw() {
      buttons.forEach(function (x) {
        var on = x.v === value;
        x.b.setAttribute("aria-checked", on ? "true" : "false");
        x.b.className = "image-option" + (on ? " is-on" : "");
      });
    }
    var wrap = labelled("images", p.label, box, p);
    var api = control(box, function () { return value; }, function (v) { value = v; draw(); }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    draw();
    return api;
  };

  /* ---------- editable text ---------- */
  /* A span that becomes an input when clicked: the pattern a title or a tag uses. */
  F.editableText = function (props) {
    var p = props || {};
    var value = p.value == null ? "" : p.value;
    var span = el("span", { class: "editable", role: "textbox", tabindex: "0", text: value });
    var input = null;

    function startEdit() {
      if (input) return;
      input = el("input", { class: "control editable-input", type: "text" });
      input.value = value;
      span.textContent = "";
      span.appendChild(input);
      if (input.focus) input.focus();
      if (input.select) input.select();
    }
    function stopEdit(commit) {
      if (!input) return;
      if (commit) value = input.value;
      span.textContent = value;
      input = null;
      api.emit("change", value);
    }
    span.addEventListener("click", startEdit);
    span.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !input) startEdit();
    });
    var wrap = labelled("editable", p.label, span, p);
    var api = control(span, function () { return value; }, function (v) {
      value = v == null ? "" : String(v);
      if (input) input.value = value; else span.textContent = value;
    }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    api.commit = function () { stopEdit(true); return api; };
    api.cancel = function () { stopEdit(false); return api; };
    api.editing = function () { return !!input; };
    return api;
  };

  /* ---------- hotkey input ---------- */
  F.hotkey = function (props) {
    var p = props || {};
    var inputId = p.id || id("hk");
    var input = el("input", {
      id: inputId, type: "text", class: "control hotkey-input", readonly: "",
      placeholder: p.placeholder || "Press a key combination"
    });
    if (p.value) input.value = p.value;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Tab") return;
      if (e.preventDefault) e.preventDefault();
      if (e.key === "Escape") { input.value = ""; api.emit("change", ""); return; }
      var parts = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      var k = e.key;
      if (k && k.length === 1) k = k.toUpperCase();
      if (["Control", "Alt", "Shift", "Meta"].indexOf(k) === -1) parts.push(k);
      if (parts.length > 1) {
        input.value = parts.join("+");
        api.emit("change", input.value);
      }
    });
    var wrap = labelled("hotkey", p.label, input, p);
    var api = control(input, function () { return input.value; }, function (v) { input.value = v || ""; }, { errorEl: wrap.errorEl });
    api.wrap = wrap.wrap;
    return api;
  };

  /* ---------- layout: group and submit footer ---------- */
  F.group = function (props) {
    var p = props || {};
    var box = el("fieldset", { class: "form-group" });
    if (p.label) box.appendChild(el("legend", { class: "form-legend", text: p.label }));
    (p.children || []).forEach(function (c) { box.appendChild(c.el || c.wrap || c); });
    return { el: box, wrap: box };
  };

  F.submitFooter = function (props) {
    var p = props || {};
    var box = el("div", { class: "form-footer" });
    if (p.cancel) {
      var cancel = el("button", { type: "button", class: "control", text: p.cancel });
      if (p.onCancel) cancel.addEventListener("click", p.onCancel);
      box.appendChild(cancel);
    }
    var submit = el("button", { type: p.submitType || "submit", class: "control primary", text: p.submit || "Save" });
    box.appendChild(submit);
    return { el: box, wrap: box, submit: submit };
  };

  /* ---------- validation ---------- */
  /* One rule per field, checked against the values object. Errors are messages,
     not booleans, because the message is what the user needs to read. */
  F.validate = function (values, rules) {
    var errors = {};
    var valid = true;
    Object.keys(rules || {}).forEach(function (field) {
      var rule = rules[field] || {};
      var v = values ? values[field] : undefined;
      var empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);

      if (rule.required && empty) { errors[field] = rule.required === true ? "Required" : rule.required; valid = false; return; }
      if (empty) return;

      if (rule.min != null && Number(v) < rule.min) { errors[field] = rule.message || ("At least " + rule.min); valid = false; return; }
      if (rule.max != null && Number(v) > rule.max) { errors[field] = rule.message || ("At most " + rule.max); valid = false; return; }
      if (rule.minLength != null && String(v).length < rule.minLength) {
        errors[field] = rule.message || ("At least " + rule.minLength + " characters"); valid = false; return;
      }
      if (rule.maxLength != null && String(v).length > rule.maxLength) {
        errors[field] = rule.message || ("At most " + rule.maxLength + " characters"); valid = false; return;
      }
      if (rule.pattern && !rule.pattern.test(String(v))) {
        errors[field] = rule.message || "Not valid"; valid = false; return;
      }
      if (typeof rule.validate === "function") {
        var out = rule.validate(v, values);
        if (out !== true && out != null) { errors[field] = out; valid = false; }
      }
    });
    return { valid: valid, errors: errors };
  };

  /* Paint the result of validate() onto the controls, by field name. */
  F.showErrors = function (controls, result) {
    Object.keys(controls).forEach(function (name) {
      var c = controls[name];
      if (c && c.invalid) c.invalid(result.errors[name] || null);
    });
    return result;
  };

  /* Collect values from a set of controls, by name. */
  F.values = function (controls) {
    var out = {};
    Object.keys(controls).forEach(function (name) {
      var c = controls[name];
      out[name] = c && typeof c.value === "function" ? c.value() : undefined;
    });
    return out;
  };

  /* ---------- binding ---------- */
  /* Bind a control to a signal. A signal is anything callable that also has
     .update(fn): ui-kit's, or one that looks the same. Two-way, no globals. */
  F.bind = function (c, signal) {
    if (!c || typeof signal !== "function") return c;
    c.set(signal());
    c.on("change", function (v) {
      if (typeof signal.update === "function") signal.update(function () { return v; });
    });
    if (typeof signal.subscribe === "function") {
      signal.subscribe(function (v) { if (c.value() !== v) c.set(v); });
    }
    return c;
  };

  /* Mount a control (or a group) into an element. */
  F.mount = function (target, c) {
    if (!target || !c) return null;
    target.appendChild(c.el || c.wrap || c);
    return c;
  };

  return F;
});
