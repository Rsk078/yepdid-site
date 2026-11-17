// Yepdid website: the logo build, the live phone demos, confetti and the tab-bar dock.
// Plain script, no build step. Every demo is decoration on top of readable HTML.
(() => {
  "use strict";

  /* Store links: paste the real URLs here once the app is live; until then the buttons say Soon. */
  const STORE = {
    apple: "https://apps.apple.com/app/id6834288221",
    google: "",
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dayLabel = (d) => `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const rupees = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  /** Monday of this week, as the app's week strip starts. */
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const dayOffset = (d) => Math.round((d - today) / 864e5);
  /** A person's avatar: a = Asha, b = Ben, e = either of them. */
  const faces = (w, size = "sm") =>
    w === "e"
      ? `<span class="ava ${size}">B</span><span class="ava a ${size}">A</span>`
      : `<span class="ava ${w === "a" ? "a " : ""}${size}">${w === "a" ? "A" : "B"}</span>`;
  /** The seven-day strip, Monday first: today picked, a dot on days in `marks` (offsets). */
  function weekStrip(el, marks) {
    el.innerHTML = Array.from({ length: 7 }, (_, k) => {
      const d = addDays(weekStart, k);
      const off = dayOffset(d);
      return `<button aria-pressed="${off === 0}" data-day="${off}" class="${marks.has(off) ? "dot" : ""}" aria-label="${dayLabel(d)}">${WD[d.getDay()]}<b>${d.getDate()}</b><i></i></button>`;
    }).join("");
  }
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {
        /* Private mode: the choice just isn't remembered. */
      }
    },
  };

  /** Runs `fn` once, the first time `el` scrolls into view. */
  function onSeen(el, fn, threshold = 0.35) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fn();
        }
      },
      { threshold },
    );
    io.observe(el);
  }

  function toaster(screen) {
    const el = $("[data-toast]", screen);
    let t = 0;
    return (text) => {
      if (!el) return;
      el.textContent = text;
      el.classList.add("show");
      clearTimeout(t);
      t = setTimeout(() => el.classList.remove("show"), 2200);
    };
  }

  /* ---------- Light and dark: one controller for the top-bar switch and the You demo ---------- */
  const theme = (() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listeners = new Set();
    const choice = () => root.dataset.theme ?? "light";
    const resolve = (t) => (t === "system" ? (mq.matches ? "dark" : "light") : t);
    const effective = () => resolve(choice());
    const notify = () => listeners.forEach((f) => f(choice(), effective()));
    function set(t, from) {
      const apply = () => {
        if (t === "light") delete root.dataset.theme;
        else root.dataset.theme = t;
        store.set("yepdid.theme", t === "light" ? null : t);
        notify();
      };
      if (!from || reduce || !document.startViewTransition || resolve(t) === effective()) return apply();
      // Spread the new theme out from the button that asked for it.
      const r = from.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add("theming");
      const vt = document.startViewTransition(apply);
      vt.ready
        .then(() =>
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
            { duration: 700, easing: "cubic-bezier(.3,.9,.3,1)", pseudoElement: "::view-transition-new(root)" },
          ),
        )
        .catch(() => {});
      vt.finished.finally(() => root.classList.remove("theming"));
    }
    mq.addEventListener?.("change", notify);
    return {
      set,
      effective,
      on(f) {
        listeners.add(f);
        f(choice(), effective());
      },
    };
  })();

  function themeToggle() {
    for (const btn of $$("[data-theme-toggle]")) {
      theme.on((_, e) => btn.setAttribute("aria-label", e === "dark" ? "Switch to light mode" : "Switch to dark mode"));
      btn.addEventListener("click", () => theme.set(theme.effective() === "dark" ? "light" : "dark", btn));
    }
  }

  /* ---------- Confetti: square pixels, like the logo. ---------- */
  const confetti = (() => {
    const c = $("#confetti");
    if (!c) return { at() {}, burst() {} };
    const ctx = c.getContext("2d");
    const colours = ["#D8F26A", "#90FA90", "#FD7501", "#E5399B", "#3A8DDE", "#F2C94C"];
    let parts = [];
    let raf = 0;
    const fit = () => {
      c.width = innerWidth * devicePixelRatio;
      c.height = innerHeight * devicePixelRatio;
    };
    addEventListener("resize", fit);
    fit();
    function tick() {
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of parts) {
        p.vy += 0.24;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 0.009;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.sq) ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        else ctx.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5);
        ctx.restore();
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }
    function burst(x, y, n = 60, power = 1) {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (3 + Math.random() * 6) * power;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 4 * power,
          s: 5 + Math.random() * 6,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.4,
          c: colours[i % colours.length],
          life: 1,
          sq: Math.random() < 0.65,
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    const at = (el, n, power) => {
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, n, power);
    };
    return { at, burst };
  })();

  /* ---------- Store buttons ---------- */
  function renderStores() {
    const items = [
      { key: "apple", icon: "i-apple", small: "Download on the", big: "App Store" },
      { key: "google", icon: "i-play", small: "Get it on", big: "Google Play" },
    ];
    for (const box of $$("[data-stores]")) {
      box.innerHTML = items
        .map((it) => {
          const inner = `<svg aria-hidden="true"><use href="#${it.icon}"/></svg><span><small>${it.small}</small><b>${it.big}</b></span>`;
          return STORE[it.key]
            ? `<a class="store" href="${STORE[it.key]}" rel="noopener">${inner}</a>`
            : `<a class="store" role="link" aria-disabled="true" tabindex="0">${inner}<span class="soon" aria-hidden="true">Soon</span><span class="sr-only"> (coming soon)</span></a>`;
        })
        .join("");
    }
    for (const el of $$('.store[aria-disabled="true"]')) {
      const poke = (e) => {
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        el.animate(
          [{ transform: "rotate(0)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(4deg)" }, { transform: "rotate(0)" }],
          { duration: 360 },
        );
        confetti.at(el, 18, 0.5);
      };
      el.addEventListener("click", poke);
      el.addEventListener("keydown", poke);
    }
  }

  /* ---------- Hero: the logo builds itself from its own pixels ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function bubbleCells() {
    const fillRows = { 1: [2, 8], 2: [1, 9], 3: [1, 9], 4: [1, 9], 5: [1, 9], 6: [1, 9], 7: [1, 9], 8: [2, 8], 9: [3, 4], 10: [3, 3] };
    const shade = new Set(["8,1", "9,5", "9,6", "9,7", "7,8", "8,8"]);
    const white = new Set(["3,2", "2,3"]);
    const cells = [];
    for (const [r, [a, b]] of Object.entries(fillRows)) {
      for (let c = a; c <= b; c++) {
        const k = `${c},${r}`;
        const fill = white.has(k) ? "#FFFFFF" : k === "4,2" ? "#C8FCC8" : shade.has(k) ? "#6FF47E" : "#90FA90";
        cells.push({ c, r: +r, fill });
      }
    }
    const outline = [];
    const run = (c, r1, r2) => {
      for (let r = r1; r <= r2; r++) outline.push([c, r]);
    };
    run(0, 2, 7);
    run(10, 2, 7);
    for (let c = 2; c <= 8; c++) outline.push([c, 0]);
    for (let c = 5; c <= 8; c++) outline.push([c, 9]);
    outline.push([1, 1], [1, 8], [9, 1], [9, 8], [2, 9], [2, 10], [2, 11], [3, 11], [4, 10]);
    for (const [c, r] of outline) cells.push({ c, r, fill: "currentColor" });
    return cells;
  }

  function buildLogo(animate) {
    const svg = $("#hero-logo");
    const g = $("#logo-bubble");
    if (!svg || !g) return;
    const X0 = 164;
    const Y0 = 220;
    const C = 23.6;
    g.textContent = "";
    svg.classList.remove("go", "done");
    for (const p of $$(".pop", svg)) p.style.strokeDashoffset = "";
    const cx = X0 + 5.5 * C;
    const cy = Y0 + 6 * C;
    for (const cell of bubbleCells()) {
      const r = document.createElementNS(NS, "rect");
      const x = X0 + cell.c * C;
      const y = Y0 + cell.r * C;
      r.setAttribute("x", x.toFixed(1));
      r.setAttribute("y", y.toFixed(1));
      r.setAttribute("width", (C + 0.7).toFixed(1));
      r.setAttribute("height", (C + 0.7).toFixed(1));
      r.setAttribute("fill", cell.fill);
      r.setAttribute("class", "px");
      g.appendChild(r);
      if (animate && !reduce && r.animate) {
        const dist = Math.hypot(x - cx, y - cy);
        r.animate(
          [
            {
              transform: `translate(${(Math.random() - 0.5) * 900}px, ${(Math.random() - 0.6) * 520}px) rotate(${(Math.random() - 0.5) * 400}deg) scale(0.2)`,
              opacity: 0,
            },
            { transform: "none", opacity: 1 },
          ],
          { duration: 760, delay: 80 + dist * 1.7 + Math.random() * 200, easing: "cubic-bezier(.2,1.35,.4,1)", fill: "backwards" },
        );
      }
    }
    $$(".letter", svg).forEach((l, i) => (l.style.animationDelay = `${1.8 + i * 0.11}s`));
    void svg.getBoundingClientRect();
    svg.classList.add("go");
    setTimeout(
      () => {
        for (const p of $$(".pop", svg)) p.style.strokeDashoffset = "0";
        svg.classList.add("done");
      },
      reduce ? 0 : 3700,
    );
  }

  function hero() {
    const svg = $("#hero-logo");
    if (!svg) return;
    buildLogo(true);
    svg.style.cursor = "pointer";
    svg.addEventListener("click", () => {
      buildLogo(true);
      setTimeout(() => confetti.at($("#logo-bubble"), 70, 1.1), reduce ? 0 : 1300);
    });
    if (!reduce) setTimeout(() => confetti.at($("#logo-bubble"), 60, 1), 1350);

    const drift = $(".drift");
    const colours = ["#D8F26A", "#90FA90", "#FD7501", "#6FF47E", "#3A8DDE", "#F2A6F2"];
    if (drift && !reduce) {
      for (let i = 0; i < 26; i++) {
        const sq = document.createElement("i");
        const s = 6 + Math.round(Math.random() * 14);
        sq.style.cssText = `--s:${s}px;--c:${colours[i % colours.length]};left:${Math.random() < 0.5 ? Math.random() * 13 : 87 + Math.random() * 12}%;top:${40 + Math.random() * 60}%;--d:${9 + Math.random() * 12}s;--delay:${-Math.random() * 20}s;--dx:${(Math.random() - 0.5) * 160}px;--r:${(Math.random() - 0.5) * 360}deg`;
        drift.appendChild(sq);
      }
    }
    const rain = $(".get .rain");
    if (rain && !reduce) {
      for (let i = 0; i < 22; i++) {
        const sq = document.createElement("i");
        sq.style.cssText = `left:${Math.random() * 100}%;--d:${6 + Math.random() * 8}s;--delay:${-Math.random() * 14}s;background:${colours[i % colours.length]};width:${6 + Math.random() * 10}px;height:${6 + Math.random() * 10}px`;
        rain.appendChild(sq);
      }
    }
  }

  /* ---------- Reveals, top bar, dock ---------- */
  function reveals() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((e) => io.observe(e));
  }

  function chrome() {
    const top = $("#top");
    const dock = $("#dock");
    const onScroll = () => {
      top?.classList.toggle("scrolled", scrollY > 8);
      dock?.classList.toggle("show", scrollY > innerHeight * 0.6);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (!dock) return;
    const links = $$(".slots a", dock);
    const ind = $(".ind", dock);
    const place = (i) => {
      links.forEach((a, k) => a.classList.toggle("on", k === i));
      if (!ind) return;
      const a = links[i];
      ind.style.opacity = a ? "1" : "0";
      if (a) ind.style.transform = `translateX(${a.offsetLeft + (a.offsetWidth - ind.offsetWidth) / 2}px)`;
    };
    place(0);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) place(Number(e.target.dataset.dock));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    $$("[data-dock]").forEach((s) => io.observe(s));
  }

  /* ---------- Demo: the two ticks ---------- */
  function ticksDemo() {
    const root = $("#demo-ticks");
    if (!root) return;
    const toast = toaster(root);
    const main = $("[data-main]", root);
    const notYet = $("[data-notyet]", root);
    const ring = $("[data-ring]", root);
    const status = $("[data-status]", root);
    const due = $("[data-due]", root);
    const who = $("[data-who]", root);
    const timeline = $("[data-timeline]", root);
    const goodJob = $("[data-goodjob]", root);
    const pokeBtn = $("[data-poke]", root);
    let step = 0;
    let lastPoke = 0;
    const line = (cls, text, when = "just now") => {
      const li = document.createElement("li");
      li.className = cls;
      li.innerHTML = `<i></i><span>${text}</span><small>${when}</small>`;
      timeline.appendChild(li);
      return li;
    };
    const setStatus = (cls, text) => {
      status.className = `tag ${cls}`;
      status.textContent = text;
    };
    const flipTo = (name) => {
      if (!reduce) who.animate([{ transform: "rotateX(90deg)" }, { transform: "none" }], { duration: 400, easing: "cubic-bezier(.2,1.5,.4,1)" });
      who.textContent = `${name}'s phone`;
    };
    function reset() {
      step = 0;
      ring.classList.remove("checked");
      setStatus("new", "● New");
      due.textContent = "Due today 7:00 pm, for Asha";
      timeline.innerHTML = '<li><i></i><span>Ben created</span><small>2 min ago</small></li>';
      main.textContent = "✓ Mark done";
      notYet.hidden = true;
      flipTo("Asha");
    }
    main.addEventListener("click", async () => {
      if (step === 0) {
        step = 0.5;
        ring.classList.add("checked");
        confetti.at(ring, 26, 0.6);
        setStatus("done", "✓ Done");
        due.textContent = "Done by you";
        line("a", "Asha marked done");
        main.textContent = "Done";
        await wait(1100);
        flipTo("Ben");
        due.textContent = "Done by Asha";
        main.textContent = "✓ Confirm";
        notYet.hidden = false;
        step = 1;
      } else if (step === 1) {
        step = 2;
        $$("li.wait", timeline).forEach((l) => l.remove());
        line("", "Ben confirmed");
        setStatus("done", "✓ Done");
        due.textContent = "Confirmed";
        notYet.hidden = true;
        goodJob.classList.add("show");
        confetti.at(goodJob, 90, 1.2);
        main.textContent = "↺ Play again";
        await wait(1800);
        goodJob.classList.remove("show");
      } else if (step === 2) {
        reset();
      }
    });
    notYet.addEventListener("click", () => {
      $$("li.wait", timeline).forEach((l) => l.remove());
      line("", "Ben said not yet: “Oat milk, please”");
      toast("Sent back to Asha");
      ring.classList.remove("checked");
      setStatus("new", "● Open");
      due.textContent = "Due today 7:00 pm, for Asha";
      notYet.hidden = true;
      main.textContent = "✓ Mark done";
      step = 0;
      setTimeout(() => flipTo("Asha"), 600);
    });
    pokeBtn.addEventListener("click", () => {
      const partner = who.textContent.startsWith("Asha") ? "Ben" : "Asha";
      const svg = $("svg", pokeBtn);
      svg.classList.remove("wave");
      void svg.getBoundingClientRect();
      svg.classList.add("wave");
      if (Date.now() - lastPoke < 6000) return toast(`You just poked ${partner}. Give them a minute.`);
      lastPoke = Date.now();
      toast(`Poked ${partner} 👋`);
    });
    $("[data-remind]", root).addEventListener("click", () => toast("I'll remind you tonight"));
  }

  /* ---------- Demo: Home ---------- */
  function homeDemo() {
    const root = $("#demo-home");
    if (!root) return;
    const toast = toaster(root);
    const board = $("[data-board]", root);
    const week = $("[data-week]", root);
    const left = $("[data-left]", root);
    const soon = $("[data-soon]", root);
    // `soon`: due within the hour, so it leads in the lime card instead of the list.
    const tasks = [
      { id: 1, t: "Book the cab", who: "b", state: "done", day: 0, time: "6:00 pm" },
      { id: 2, t: "Pick up milk", who: "a", state: "new", day: 0, time: "6:15 pm", soon: "15 min" },
      { id: 3, t: "Walk Bruno", who: "b", state: "open", day: 0, time: "8:00 pm" },
      { id: 4, t: "Call mom", who: "a", priv: true, state: "open", day: 0, time: "8:30 pm" },
      { id: 5, t: "Pay the electricity bill", who: "e", state: "open", day: 0, time: "9:00 pm" },
      { id: 6, t: "Gym", who: "a", state: "open", day: 1, time: "7:00 am" },
      { id: 7, t: "Water the plants", who: "b", state: "new", day: 3, time: "9:00 pm" },
    ];
    const ORDER = ["Today", "Tomorrow", "This week", "Done"];
    const secOf = (t) => (t.state === "done" ? "Done" : t.day === 0 ? "Today" : t.day === 1 ? "Tomorrow" : "This week");
    let filter = "all";
    let pickDay = null;
    const visible = (t) => {
      if (pickDay !== null && t.day !== pickDay) return false;
      if (filter === "mine") return t.who === "a" || t.who === "e" || t.priv;
      if (filter === "ben") return t.who === "b";
      if (filter === "private") return !!t.priv;
      return true;
    };
    const soonTask = () => tasks.find((t) => t.soon && t.state !== "done" && visible(t));
    const whenHtml = (t) => {
      const d = addDays(today, t.day);
      const label = t.day === 0 ? "Today" : t.day === 1 ? "Tmrw" : WD[d.getDay()];
      return `<span class="when"><b class="${t.day === 1 ? "near" : ""}">${label}</b>${t.time}</span>`;
    };
    const status = (t) =>
      t.state === "new" ? '<span class="st new">• New</span>' : t.state === "done" ? "<span>Done</span>" : `<span>${t.who === "b" ? "Ben" : t.who === "e" ? "Either of you" : "You"}</span>`;
    function headline() {
      const n = tasks.filter((t) => t.day === 0 && t.state !== "done").length;
      left.innerHTML = n === 0 ? "All done <mark>today!</mark>" : `<mark>${n} thing${n === 1 ? "" : "s"}</mark> left today`;
    }
    function render() {
      const lead = soonTask();
      soon.hidden = !lead;
      if (lead) {
        soon.innerHTML = `<span class="eyebrow">Today · due in</span>${lead.state === "new" ? '<span class="tagnew">New</span>' : ""}<span class="left">${lead.soon}</span><span class="t">${lead.t}</span><span class="meta">${faces(lead.who)}You · ${lead.time}</span><button class="check" data-soon-check aria-label="Mark “${lead.t}” done"><svg><use href="#i-check"/></svg></button>`;
      }
      const shown = tasks.filter((t) => visible(t) && t !== lead);
      if (!shown.length) {
        board.innerHTML = `<p style="text-align:center;color:var(--scr-muted);margin:24px 0">${filter === "private" ? "No private tasks. Add one and only you will see it." : pickDay !== null ? "Nothing due that day." : "Nothing here for you"}</p>`;
        return;
      }
      const groups =
        pickDay !== null ? [[DAYS[addDays(today, pickDay).getDay()], shown]] : ORDER.map((s) => [s, shown.filter((t) => secOf(t) === s)]).filter(([, l]) => l.length);
      board.innerHTML = groups
        .map(
          ([title, list]) =>
            `<div class="sec"><b>${title}</b><span>${list.length} task${list.length === 1 ? "" : "s"}</span></div>` +
            list
              .map(
                (t) =>
                  `<div class="row-wrap" data-id="${t.id}"><div class="swipe-under">✓ Done</div><div class="row${t.state === "done" ? " done" : ""}">${whenHtml(t)}<span class="body"><span class="t">${t.t}</span><span class="meta">${faces(t.who)}${t.priv ? '<svg class="lock"><use href="#i-lock"/></svg>' : ""}${status(t)}</span></span><button class="ring" data-check aria-label="Mark “${t.t}” done"><svg><use href="#i-check"/></svg></button></div></div>`,
              )
              .join(""),
        )
        .join("");
    }
    function act(t, el) {
      if (t.state === "done") return toast("Already ticked");
      if (t.who === "b") return toast("That one's Ben's to tick");
      t.state = "done";
      confetti.at(el, 30, 0.6);
      if (!t.priv) toast("Done! Ben can confirm it");
      render();
      headline();
    }
    soon.addEventListener("click", (e) => {
      const t = soonTask();
      if (!t) return;
      if (!e.target.closest("[data-soon-check]")) return toast(`Opens “${t.t}”`);
      soon.classList.add("gone");
      setTimeout(() => {
        soon.classList.remove("gone");
        act(t, soon);
      }, reduce ? 0 : 320);
    });
    board.addEventListener("click", (e) => {
      const ring = e.target.closest("[data-check]");
      if (!ring) return;
      const wrap = ring.closest(".row-wrap");
      act(tasks.find((x) => x.id === Number(wrap.dataset.id)), ring);
    });
    // Swipe right to check; a tap without a drag "opens" the task.
    board.addEventListener("pointerdown", (e) => {
      const wrap = e.target.closest(".row-wrap");
      if (!wrap || e.target.closest("[data-check]")) return;
      const row = $(".row", wrap);
      const t = tasks.find((x) => x.id === Number(wrap.dataset.id));
      const x0 = e.clientX;
      let dx = 0;
      row.style.transition = "none";
      const move = (ev) => {
        dx = Math.max(0, Math.min(130, ev.clientX - x0));
        row.style.transform = `translateX(${dx}px)`;
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        row.style.transition = "";
        row.style.transform = "";
        if (dx > 70) act(t, wrap);
        else if (dx < 6) toast(`Opens “${t.t}”`);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
    });
    $$("[data-filters] .chip", root).forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.f;
        $$("[data-filters] .chip", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      }),
    );
    weekStrip(week, new Set(tasks.map((t) => t.day)));
    $$("button", week).forEach((b) =>
      b.addEventListener("click", () => {
        const off = Number(b.dataset.day);
        pickDay = off === 0 || pickDay === off ? null : off;
        $$("button", week).forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.day) === (pickDay ?? 0))));
        render();
      }),
    );
    render();
    headline();
  }

  /* ---------- Demo: New task ---------- */
  function newDemo() {
    const root = $("#demo-new");
    if (!root) return;
    const toast = toaster(root);
    const typed = $("[data-type]", root);
    const label = $("[data-duelabel]", root);
    const dueChip = $("[data-duechip]", root);
    const forPick = $("[data-forpick]", root);
    const forName = $("[data-forname]", root);
    const forAva = $("[data-forava]", root);
    const needs = $("[data-needs]", root);
    const pdays = $("[data-pdays]", root);
    const slots = $("[data-slots]", root);
    const refusal = $("[data-refusal]", root);
    const sw = $("[data-switch]", root);
    // This is Ben's phone: "Me" is Ben, and Asha is busy at work until 9 tonight.
    let forWho = "Asha";
    let day = 0;
    let time = "9:00 pm";
    const dayName = (k) => (k === 0 ? "Today" : k === 1 ? "Tomorrow" : WD[addDays(today, k).getDay()]);
    const bounce = (el) => {
      if (!reduce) el.animate([{ transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 350, easing: "cubic-bezier(.2,1.6,.4,1)" });
    };
    const showDue = (flash) => {
      label.textContent = `${dayName(day)}, ${time.replace(":00", "")}`;
      if (flash) bounce(dueChip);
    };
    function showFor() {
      const me = forWho === "Me";
      forName.textContent = me ? "You" : forWho === "Either" ? "Either of you" : forWho;
      forAva.hidden = forWho === "Either";
      forAva.className = `ava${forWho === "Asha" ? " a" : ""}`;
      forAva.textContent = forWho === "Asha" ? "A" : "B";
      needs.textContent = me || forWho === "Either" ? "need to" : "needs to";
      bounce(forPick);
    }
    function renderDays() {
      pdays.innerHTML = Array.from({ length: 4 }, (_, k) => `<button class="chip choice" aria-pressed="${k === day}" data-d="${k}">${dayName(k)}</button>`).join("");
    }
    function renderSlots() {
      // Asha's busy time only blocks tonight, and only when the task is hers.
      const busy = forWho === "Asha" && day === 0;
      const rows = busy ? ["6:00 pm", "6:30 pm", "busy", "9:00 pm", "9:30 pm"] : ["6:00 pm", "6:30 pm", "7:00 pm", "7:30 pm", "9:00 pm"];
      slots.innerHTML = rows
        .map((v) =>
          v === "busy"
            ? `<button class="slot busy" data-busy aria-label="Busy 7:00 pm to 9:00 pm, Asha">7–9 pm · busy</button>`
            : `<button class="slot" aria-pressed="${v === time}" data-t="${v}">${v}</button>`,
        )
        .join("");
    }
    pdays.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      day = Number(b.dataset.d);
      refusal.textContent = "";
      renderDays();
      renderSlots();
      showDue(true);
    });
    slots.addEventListener("click", (e) => {
      const b = e.target.closest(".slot");
      if (!b) return;
      if (b.hasAttribute("data-busy")) {
        b.classList.remove("shake");
        void b.offsetWidth;
        b.classList.add("shake");
        refusal.textContent = "Asha is busy then";
        return;
      }
      time = b.dataset.t;
      refusal.textContent = "";
      renderSlots();
      showDue(true);
    });
    $$("[data-for] .chip", root).forEach((b) =>
      b.addEventListener("click", () => {
        forWho = b.textContent;
        $$("[data-for] .chip", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        refusal.textContent = "";
        showFor();
        renderSlots();
      }),
    );
    sw.addEventListener("click", () => sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true")));
    $("[data-add]", root).addEventListener("click", (e) => {
      confetti.at(e.currentTarget, 40, 0.7);
      toast(`Added for ${forWho === "Me" ? "you" : forWho === "Either" ? "either of you" : forWho} 🎉`);
    });
    renderDays();
    renderSlots();
    showDue(false);
    onSeen(root, async () => {
      const text = "Water the plants";
      if (reduce) return (typed.textContent = text);
      for (const ch of text) {
        typed.textContent += ch;
        await wait(55 + Math.random() * 60);
      }
    });
  }

  /* ---------- Demo: Schedule ---------- */
  function schedDemo() {
    const root = $("#demo-sched");
    if (!root) return;
    const toast = toaster(root);
    $("[data-sweek]", root).textContent = `Week of ${weekStart.getDate()} ${MON[weekStart.getMonth()]}`;
    $("[data-sday]", root).textContent = DAYS[today.getDay()];
    weekStrip($("[data-sstrip]", root), new Set([0]));
    const list = $("[data-sitems]", root);
    const band = $("[data-addblk]", root);
    const items = [
      { at: 7, tm: ["7:00 am", "to 8:00 am"], c: "ben", t: "Gym", sub: "Ben · busy · weekly", busy: true },
      { at: 9.5, tm: ["9:30 am", "to 6:00 pm"], c: "asha", t: "Work", sub: "Asha · busy · weekly", busy: true },
      { at: 19, tm: ["7:00 pm"], c: "asha", t: "Pick up milk", sub: "Asha · task" },
    ];
    const bandItem = { at: 20, tm: ["8:00 pm", "to 10:00 pm"], c: "ben", t: "Band practice", sub: "Ben · busy · weekly", busy: true };
    const NOW = 17.67;
    function render() {
      const all = [...items, ...(band.classList.contains("in") ? [bandItem] : [])].sort((a, b) => a.at - b.at);
      let html = "";
      let nowShown = false;
      for (const it of all) {
        if (!nowShown && it.at > NOW) {
          html += '<div class="now-div"><span class="now-pill">Now</span></div>';
          nowShown = true;
        }
        html += `<div class="sitem" style="--c:var(--${it.c})"><span class="tm"><b>${it.tm[0]}</b>${it.tm[1] ?? ""}</span><span class="ico${it.busy ? "" : " task"}"></span><span class="t">${it.t}<small>${it.sub}</small></span></div>`;
      }
      list.innerHTML = html;
    }
    $("[data-addbusy]", root).addEventListener("click", () => {
      const adding = !band.classList.contains("in");
      band.classList.toggle("in", adding);
      render();
      if (adding) toast("Busy time added for Ben. Deadlines skip it.");
    });
    render();
    onSeen(root, async () => {
      for (const b of $$("[data-blk]", root)) {
        b.classList.add("in");
        await wait(260);
      }
    });
  }

  /* ---------- Demo: Money ---------- */
  function moneyDemo() {
    const root = $("#demo-money");
    if (!root) return;
    const toast = toaster(root);
    const linesEl = $("[data-mlines]", root);
    const owe = $("[data-owe]", root);
    const dir = $("[data-dir]", root);
    const amount = $("[data-amount]", root);
    const spent = $("[data-spent]", root);
    const count = $("[data-count]", root);
    const balanceEl = $(".balance", root);
    $("[data-month]", root).textContent = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][today.getMonth()];
    // This is Ben's phone: "you" is Ben (b), and Asha is a.
    const lines = [
      { t: "Cab home", by: "a", amt: 340, split: "half", when: "yesterday" },
      { t: "Groceries", by: "b", amt: 1200, split: "half", when: "today" },
    ];
    const extras = [
      { t: "Movie tickets", by: "a", amt: 500, split: "half" },
      { t: "Dinner out", by: "b", amt: 1850, split: "half" },
      { t: "Plant pots", by: "a", amt: 600, split: "all" },
    ];
    let next = 0;
    // What a line means for me (Ben): positive, Asha owes me more.
    const effect = (l) => {
      if (l.split === "settle") return l.by === "a" ? -l.amt : l.amt;
      const owed = l.split === "half" ? l.amt / 2 : l.amt;
      return l.by === "b" ? owed : -owed;
    };
    const balance = () => lines.reduce((s, l) => s + effect(l), 0);
    function render() {
      const b = Math.round(balance());
      owe.textContent = b > 0 ? "Asha owes you" : b < 0 ? "You owe Asha" : "All square";
      dir.innerHTML = b === 0 ? "" : b > 0 ? `${faces("a")}<svg><use href="#i-arrow"/></svg>${faces("b")}` : `${faces("b")}<svg><use href="#i-arrow"/></svg>${faces("a")}`;
      amount.textContent = rupees(b);
      amount.className = b < 0 ? "owe" : b === 0 ? "square" : "";
      const bought = lines.filter((l) => l.split !== "settle");
      spent.textContent = rupees(bought.reduce((s, l) => s + l.amt, 0));
      count.textContent = `${lines.length} expense${lines.length === 1 ? "" : "s"}`;
      linesEl.innerHTML = lines
        .slice()
        .reverse()
        .slice(0, 4)
        .map((l) => {
          const e = Math.round(effect(l));
          const sub = l.split === "settle" ? (l.by === "a" ? "Asha paid you back" : "You paid Asha back") : `${l.by === "b" ? "You" : "Asha"} paid ${rupees(l.amt)} · ${l.when ?? "today"}`;
          const eff = l.split === "settle" ? `<div class="eff">${rupees(l.amt)}<small>settled</small></div>` : e > 0 ? `<div class="eff lent">+${rupees(e)}<small>you lent</small></div>` : `<div class="eff owe">−${rupees(e)}<small>you owe</small></div>`;
          return `<div class="mline">${faces(l.by, "")}<div class="what">${l.t}<small>${sub}</small></div>${eff}</div>`;
        })
        .join("");
    }
    $("[data-addexp]", root).addEventListener("click", () => {
      lines.push({ ...extras[next % extras.length] });
      next++;
      render();
    });
    $("[data-settle]", root).addEventListener("click", () => {
      const b = Math.round(balance());
      if (b === 0) return toast("You're all square");
      lines.push({ t: "Settle up", by: b > 0 ? "a" : "b", amt: Math.abs(b), split: "settle" });
      if (!reduce) {
        for (let i = 0; i < 7; i++) {
          const c = document.createElement("span");
          c.className = "coin";
          c.style.left = `${15 + Math.random() * 70}%`;
          c.style.animationDelay = `${i * 0.08}s`;
          balanceEl.appendChild(c);
          setTimeout(() => c.remove(), 1600);
        }
      }
      toast(`Recorded ${rupees(b)} paid back`);
      setTimeout(render, reduce ? 0 : 500);
      setTimeout(() => confetti.at(balanceEl, 40, 0.7), reduce ? 0 : 700);
    });
    render();
  }

  /* ---------- Demo: Activity and pokes ---------- */
  function feedDemo() {
    const root = $("#demo-feed");
    if (!root) return;
    const feed = $("[data-feed]", root);
    const push = $("[data-push]", root);
    const btn = $("[data-pokeasha]", root);
    const items = [
      ["b", "i-plus", "Ben created · Water the plants"],
      ["a", "i-cal", "Asha added busy time · Yoga"],
      ["b", "i-check", "Ben marked done · Water the plants"],
      ["a", "i-check", "Asha confirmed · Water the plants"],
      ["b", "i-wallet", "Ben added ₹1,200 · Groceries"],
      ["a", "i-pencil", "Asha changed the deadline · Gym"],
    ];
    let n = 0;
    let lastPoke = 0;
    const add = () => {
      const [w, icon, text] = items[n % items.length];
      const li = document.createElement("li");
      li.innerHTML = `<span class="ic" style="--c:var(--${w === "a" ? "asha" : "ben"})"><svg><use href="#${icon}"/></svg></span><div>${text}<small>now</small></div>`;
      feed.prepend(li);
      $$("li", feed).slice(6).forEach((x) => x.remove());
      $$("li small", feed).forEach((s, k) => (s.textContent = k === 0 ? "now" : `${k * 3} min ago`));
      n++;
    };
    onSeen(root, () => {
      add();
      if (reduce) {
        for (let k = 0; k < 4; k++) add();
        return;
      }
      setInterval(add, 1700);
    });
    btn.addEventListener("click", () => {
      if (Date.now() - lastPoke < 5000) {
        btn.textContent = "You just poked Asha. Give them a minute.";
        setTimeout(() => (btn.textContent = "👋 Poke Asha"), 1800);
        return;
      }
      lastPoke = Date.now();
      push.classList.add("show");
      setTimeout(() => push.classList.remove("show"), 2600);
    });
  }

  /* ---------- Demo: You (it recolours the website) ---------- */
  /** The app's four colours: the fill, then the text shade on the light and the night grounds. */
  const APP_COLOURS = {
    lime: ["#D8F26A", "#516901", "#D9F469"],
    blue: ["#9DB4FF", "#3B51C4", "#9DB4FF"],
    lilac: ["#CDB8F5", "#6238B5", "#CDB8F5"],
    peach: ["#FFC4A0", "#A2440F", "#FFC4A0"],
  };
  function youDemo() {
    const root = $("#demo-you");
    if (!root) return;
    const dots = $$("[data-dots] button", root);
    const segs = $$("[data-theme-seg] button", root);
    const pressColour = (k) => dots.forEach((d) => d.setAttribute("aria-pressed", String(d.dataset.c === k)));
    pressColour(APP_COLOURS[store.get("yepdid.colour")] ? store.get("yepdid.colour") : "lime");
    for (const d of dots) {
      d.addEventListener("click", () => {
        const key = d.dataset.c;
        const st = document.documentElement.style;
        if (key === "lime") {
          for (const v of ["--brand", "--brand-text-l", "--brand-text-d"]) st.removeProperty(v);
        } else {
          const [fill, light, dark] = APP_COLOURS[key];
          st.setProperty("--brand", fill);
          st.setProperty("--brand-text-l", light);
          st.setProperty("--brand-text-d", dark);
        }
        store.set("yepdid.colour", key === "lime" ? null : key);
        pressColour(key);
        confetti.at(d, 24, 0.5);
      });
    }
    const pressTheme = (t) => segs.forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.t === t)));
    theme.on((c) => pressTheme(c));
    for (const s of segs) s.addEventListener("click", () => theme.set(s.dataset.t, s));
  }

  /* ---------- Pairing: the code types itself in ---------- */
  function pairDemo() {
    const boxes = $("[data-boxes]");
    if (!boxes) return;
    const CODE = "K7Q2XA9M";
    boxes.innerHTML = `${"<span></span>".repeat(4)}<span class="dash">-</span>${"<span></span>".repeat(4)}`;
    const cells = $$("span:not(.dash)", boxes);
    const paired = $("[data-paired]");
    const solo = $("[data-solo]");
    const duo = $("[data-duo]");
    onSeen(boxes, async () => {
      for (let k = 0; k < cells.length; k++) {
        cells[k].textContent = CODE[k];
        cells[k].classList.add("lit");
        await wait(reduce ? 0 : 140);
      }
      if (paired) paired.style.opacity = "1";
      if (!reduce) {
        solo.style.transform = "translateX(8px) rotate(-1.5deg)";
        duo.style.transform = "translateX(-8px) rotate(1.5deg)";
        confetti.at(boxes, 60, 1);
      }
    }, 0.6);
  }

  function boot() {
    const y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
    themeToggle();
    renderStores();
    hero();
    reveals();
    chrome();
    ticksDemo();
    homeDemo();
    newDemo();
    schedDemo();
    moneyDemo();
    feedDemo();
    youDemo();
    pairDemo();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
