// Yepdid website: the logo build, the live phone demos, confetti and the tab-bar dock.
// Plain script, no build step. Every demo is decoration on top of readable HTML.
(() => {
  "use strict";

  /* Store links: paste the real URLs here once the app is live; until then the buttons say Soon. */
  const STORE = {
    apple: "",
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
    const choice = () => root.dataset.theme ?? "system";
    const resolve = (t) => (t === "system" ? (mq.matches ? "dark" : "light") : t);
    const effective = () => resolve(choice());
    const notify = () => listeners.forEach((f) => f(choice(), effective()));
    function set(t, from) {
      const apply = () => {
        if (t === "system") delete root.dataset.theme;
        else root.dataset.theme = t;
        store.set("yepdid.theme", t === "system" ? null : t);
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
    const colours = ["#90FA90", "#FD7501", "#E5399B", "#3A8DDE", "#F2C94C", "#6FF47E"];
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
    const colours = ["#90FA90", "#6FF47E", "#FD7501", "#A5E3AE", "#3A8DDE", "#F2A6F2"];
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
      setStatus("new", "✱ New");
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
        setStatus("wait", "◷ Waiting");
        due.textContent = "Done, waiting for Ben";
        line("a", "Asha marked done");
        const w = line("wait", "Waiting for Ben", "");
        main.textContent = "Sent to Ben…";
        await wait(1100);
        flipTo("Ben");
        setStatus("wait", "◷ Confirm?");
        due.textContent = "Done, awaiting your confirm";
        w.remove();
        line("wait", "Waiting for you", "");
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
      setStatus("new", "✱ Open");
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
    const arc = $("[data-arc]", root);
    const left = $("[data-left]", root);
    const later = addDays(today, 3);
    const tasks = [
      { id: 1, t: "Book the cab", who: "b", state: "confirm", day: 0, sec: "Waiting for you", icon: "i-phone", due: ["6:00 pm"] },
      { id: 2, t: "Pick up milk", who: "a", state: "new", day: 0, sec: "Today", icon: "i-cart", due: ["7:00 pm"] },
      { id: 3, t: "Walk Bruno", who: "b", state: "open", day: 0, sec: "Today", icon: "i-paw", due: ["8:00 pm"] },
      { id: 4, t: "Call mom", who: "a", priv: true, state: "open", day: 0, sec: "Today", icon: "i-phone", due: ["8:30 pm"] },
      { id: 5, t: "Pay the electricity bill", who: "e", state: "open", day: 0, sec: "Today", icon: "i-pay", due: ["9:00 pm"] },
      { id: 6, t: "Gym", who: "a", state: "open", day: 1, sec: "Tomorrow", icon: "i-gym", due: ["Tomorrow", "7:00 am"] },
      { id: 7, t: "Water the plants", who: "b", state: "open", day: 3, sec: "This week", icon: "i-sprout", due: [WD[later.getDay()], "9:00 pm"] },
    ];
    const ORDER = ["Waiting for you", "Overdue", "Today", "Tomorrow", "This week", "Later"];
    let filter = "all";
    let pickDay = null;
    const tagFor = (t) =>
      ({
        confirm: ['wait', "◷ Confirm?"],
        new: ["new", "✱ New"],
        waiting: ["wait", "◷ Waiting"],
        done: ["done", "✓ Done"],
      })[t.state] ?? null;
    const visible = (t) => {
      if (pickDay !== null && t.day !== pickDay) return false;
      if (filter === "mine") return t.who === "a" || t.who === "e" || t.priv;
      if (filter === "ben") return t.who === "b";
      if (filter === "private") return !!t.priv;
      return true;
    };
    function ringUpdate() {
      const todays = tasks.filter((t) => t.day === 0);
      const done = todays.filter((t) => t.state === "waiting" || t.state === "done" || t.state === "confirm").length;
      const leftN = todays.length - done;
      arc.style.strokeDashoffset = String(113 * (1 - done / todays.length));
      left.textContent = leftN === 0 ? "All done today!" : leftN === 1 ? "1 thing left today" : `${leftN} things left today`;
    }
    function render() {
      const shown = tasks.filter(visible);
      if (!shown.length) {
        board.innerHTML = `<p style="text-align:center;color:var(--scr-muted);margin:24px 0">${filter === "private" ? "No private tasks. Add one and only you will see it." : pickDay !== null ? "Nothing due that day." : "Nothing here for you"}</p>`;
        return;
      }
      const groups = pickDay !== null ? [[dayLabel(addDays(today, pickDay)), shown]] : ORDER.map((s) => [s, shown.filter((t) => t.sec === s)]).filter(([, l]) => l.length);
      board.innerHTML = groups
        .map(
          ([title, list]) =>
            `<div class="sec-title">${title}</div>` +
            list
              .map((t) => {
                const tag = tagFor(t);
                const face = t.who === "e" ? '<span class="who b" style="right:6px">B</span><span class="who a">A</span>' : `<span class="who ${t.who}">${t.who === "a" ? "A" : "B"}</span>`;
                return `<div class="card-wrap" data-id="${t.id}"><div class="swipe-under">✓ Done</div><div class="card"><span class="tile"><svg><use href="#${t.icon}"/></svg>${face}</span><span class="body"><span class="t">${t.priv ? "🔒 " : ""}${t.t}</span>${tag ? `<span class="tag ${tag[0]}">${tag[1]}</span>` : ""}</span><span class="due">${t.due.length > 1 ? `${t.due[0]}<small>${t.due[1]}</small>` : t.due[0]}</span></div></div>`;
              })
              .join(""),
        )
        .join("");
    }
    function act(t, wrap) {
      if (t.state === "done" || t.state === "waiting") return toast("Already ticked");
      if (t.who === "b" && t.state !== "confirm") return toast("That one's Ben's to tick");
      if (t.state === "confirm") {
        t.state = "done";
        confetti.at(wrap, 70, 1);
        toast("Confirmed! 🎉");
      } else if (t.priv) {
        t.state = "done";
        confetti.at(wrap, 30, 0.6);
      } else {
        t.state = "waiting";
        confetti.at(wrap, 30, 0.6);
        toast("Waiting for Ben to confirm");
      }
      render();
      ringUpdate();
    }
    // Swipe right to check; a tap without a drag "opens" the task.
    board.addEventListener("pointerdown", (e) => {
      const wrap = e.target.closest(".card-wrap");
      if (!wrap) return;
      const card = $(".card", wrap);
      const t = tasks.find((x) => x.id === Number(wrap.dataset.id));
      const x0 = e.clientX;
      let dx = 0;
      card.style.transition = "none";
      const move = (ev) => {
        dx = Math.max(0, Math.min(130, ev.clientX - x0));
        card.style.transform = `translateX(${dx}px)`;
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        card.style.transition = "";
        card.style.transform = "";
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
    const marks = new Set(tasks.map((t) => t.day));
    week.innerHTML = Array.from({ length: 7 }, (_, k) => {
      const off = k - 1;
      const d = addDays(today, off);
      return `<button aria-pressed="false" data-day="${off}" class="${off === 0 ? "today" : ""} ${marks.has(off) ? "dot" : ""}" aria-label="${dayLabel(d)}">${WD[d.getDay()].slice(0, 2).toUpperCase()}<b>${d.getDate()}</b><i></i></button>`;
    }).join("");
    $$("button", week).forEach((b) =>
      b.addEventListener("click", () => {
        const off = Number(b.dataset.day);
        pickDay = pickDay === off ? null : off;
        $$("button", week).forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.day) === pickDay)));
        render();
      }),
    );
    render();
    onSeen(root, () => setTimeout(ringUpdate, 300));
  }

  /* ---------- Demo: New task ---------- */
  function newDemo() {
    const root = $("#demo-new");
    if (!root) return;
    const toast = toaster(root);
    const typed = $("[data-type]", root);
    const label = $("[data-duelabel]", root);
    const dueChip = $("[data-duechip]", root);
    const pdays = $("[data-pdays]", root);
    const slots = $("[data-slots]", root);
    const refusal = $("[data-refusal]", root);
    const emojis = $("[data-emojis]", root);
    const rewardName = $("[data-rewardname]", root);
    const sw = $("[data-switch]", root);
    const REWARDS = [
      ["🎁", "A treat"],
      ["🍣", "Dinner out"],
      ["🍕", "Pizza night"],
      ["☕", "Coffee date"],
      ["🎬", "Movie night"],
    ];
    let forWho = "Asha";
    let day = 0;
    let time = "9:00 pm";
    const showDue = (flash) => {
      label.textContent = `${dayLabel(addDays(today, day))}, ${time}`;
      if (flash && !reduce) dueChip.animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 350, easing: "cubic-bezier(.2,1.6,.4,1)" });
    };
    function renderDays() {
      pdays.innerHTML = Array.from({ length: 4 }, (_, k) => {
        const d = addDays(today, k);
        return `<button class="chip" aria-pressed="${k === day}" data-d="${k}">${k === 0 ? "Today" : `${WD[d.getDay()]} ${d.getDate()}`}</button>`;
      }).join("");
    }
    function renderSlots() {
      const busy = forWho === "Asha";
      const rows = busy
        ? [["6:00 pm"], ["6:30 pm"], ["busy"], ["9:00 pm"], ["9:30 pm"]]
        : [["6:00 pm"], ["6:30 pm"], ["7:00 pm"], ["7:30 pm"], ["9:00 pm"]];
      slots.innerHTML = rows
        .map(([v]) =>
          v === "busy"
            ? `<button class="slot busy" data-busy aria-label="Busy 7:00 pm to 9:00 pm, Asha"><span>7:00 pm–9:00 pm</span><span>💼 Asha</span></button>`
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
    $$("[data-quick]", root).forEach((b) =>
      b.addEventListener("click", () => {
        day = Number(b.dataset.quick);
        time = "9:00 pm";
        renderDays();
        renderSlots();
        showDue(true);
      }),
    );
    $$("[data-for] .chip", root).forEach((b) =>
      b.addEventListener("click", () => {
        forWho = b.textContent;
        $$("[data-for] .chip", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        refusal.textContent = "";
        renderSlots();
      }),
    );
    emojis.innerHTML = REWARDS.map(([e, n], i) => `<button aria-pressed="${i === 2}" aria-label="${n}" data-i="${i}">${e}</button>`).join("");
    emojis.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const [em, name] = REWARDS[Number(b.dataset.i)];
      $$("button", emojis).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      rewardName.textContent = `${em} ${name}`;
    });
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
    $("[data-sday]", root).textContent = `Today, ${dayLabel(today)}`;
    const label = $("[data-sync-label]", root);
    const icon = $("[data-sync-icon]", root);
    const gblk = $("[data-gblk]", root);
    async function sync() {
      gblk.classList.remove("in");
      icon.classList.add("spin");
      label.textContent = "Syncing…";
      await wait(1300);
      icon.classList.remove("spin");
      gblk.classList.add("in");
      label.textContent = "Synced just now. Busy only, no event names.";
    }
    $("[data-sync]", root).addEventListener("click", sync);
    onSeen(root, async () => {
      for (const b of $$("[data-blk]", root)) {
        b.classList.add("in");
        await wait(260);
      }
      await wait(500);
      sync();
    });
  }

  /* ---------- Demo: Money ---------- */
  function moneyDemo() {
    const root = $("#demo-money");
    if (!root) return;
    const toast = toaster(root);
    const linesEl = $("[data-mlines]", root);
    const owe = $("[data-owe]", root);
    const amount = $("[data-amount]", root);
    const seesaw = $("[data-seesaw]", root);
    const balanceEl = $(".balance", root);
    const lines = [
      { t: "Cab home", by: "a", amt: 340, split: "half", icon: "i-phone" },
      { t: "Groceries", by: "b", amt: 1200, split: "half", icon: "i-cart" },
    ];
    const extras = [
      { t: "Movie tickets", by: "a", amt: 500, split: "half", icon: "i-sparkles" },
      { t: "Dinner out", by: "b", amt: 1850, split: "half", icon: "i-cart" },
      { t: "Plant pots", by: "a", amt: 600, split: "all", icon: "i-sprout" },
    ];
    let next = 0;
    const effect = (l) => {
      if (l.split === "settle") return l.by === "a" ? -l.amt : l.amt;
      const owed = l.split === "half" ? l.amt / 2 : l.amt;
      return l.by === "b" ? owed : -owed;
    };
    const balance = () => lines.reduce((s, l) => s + effect(l), 0);
    function render() {
      const b = Math.round(balance());
      owe.textContent = b > 0 ? "Asha owes you" : b < 0 ? "You owe Asha" : "All square";
      amount.textContent = rupees(b);
      seesaw.querySelector(".beam").style.setProperty("--tilt", `${Math.max(-14, Math.min(14, -b / 60))}deg`);
      linesEl.innerHTML = lines
        .slice()
        .reverse()
        .slice(0, 4)
        .map((l) => {
          const who = l.by === "b" ? "You" : "Asha";
          const sub = l.split === "settle" ? `${who === "You" ? "You paid Asha back" : "Asha paid you back"}` : `${who} paid, ${l.split === "half" ? "half each" : `all for ${l.by === "b" ? "Asha" : "you"}`}`;
          return `<div class="mline"><span class="tile"><svg><use href="#${l.icon}"/></svg></span><div>${l.t}<small>${sub}</small></div><b>${rupees(l.amt)}</b></div>`;
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
      lines.push({ t: "Settle up", by: b > 0 ? "a" : "b", amt: Math.abs(b), split: "settle", icon: "i-check" });
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
    seesaw.querySelector(".beam").style.setProperty("--tilt", "0deg");
    onSeen(root, () => setTimeout(render, 300));
  }

  /* ---------- Demo: Rewards ---------- */
  function rewardsDemo() {
    const root = $("#demo-rewards");
    if (!root) return;
    const gift = $("[data-gift]", root);
    const card = $("[data-revealcard]", root);
    const states = $$("[data-states] span", root);
    const owed = $("[data-owedyou]", root);
    let i = 0;
    let timer = 0;
    const stepStates = () => {
      states.forEach((s, k) => s.classList.toggle("on", k === i));
      i = (i + 1) % states.length;
    };
    onSeen(root, () => {
      stepStates();
      if (!reduce) timer = setInterval(stepStates, 1400);
    });
    gift.addEventListener("click", () => {
      if (gift.classList.contains("open")) return;
      gift.classList.add("open");
      confetti.at(gift, 90, 1.2);
      clearInterval(timer);
      states.forEach((s, k) => s.classList.toggle("on", k === 3));
      owed.textContent = "3";
      setTimeout(() => card.classList.add("show"), reduce ? 0 : 650);
    });
    $("[data-nice]", root).addEventListener("click", () => {
      card.classList.remove("show");
      setTimeout(() => gift.classList.remove("open"), 300);
      owed.textContent = "2";
      i = 0;
      if (!reduce) timer = setInterval(stepStates, 1400);
    });
  }

  /* ---------- Demo: Activity and pokes ---------- */
  function feedDemo() {
    const root = $("#demo-feed");
    if (!root) return;
    const feed = $("[data-feed]", root);
    const push = $("[data-push]", root);
    const btn = $("[data-pokeasha]", root);
    const items = [
      ["b", "Ben created “Water the plants”"],
      ["a", "Asha offered 🍣 Dinner out"],
      ["b", "Ben marked done “Water the plants”"],
      ["a", "Asha confirmed “Water the plants”"],
      ["b", "Ben added Groceries ₹1,200"],
      ["a", "Surprise revealed: 🍕 Pizza night"],
    ];
    let n = 0;
    let lastPoke = 0;
    const add = () => {
      const [w, text] = items[n % items.length];
      const li = document.createElement("li");
      li.innerHTML = `<span class="face ${w === "a" ? "asha" : "ben"}">${w === "a" ? "A" : "B"}</span><span>${text}</span><small>now</small>`;
      feed.prepend(li);
      $$("li", feed).slice(6).forEach((x) => x.remove());
      $$("li small", feed).forEach((s, k) => (s.textContent = k === 0 ? "now" : `${k * 3} min`));
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
  function youDemo() {
    const root = $("#demo-you");
    if (!root) return;
    const toast = toaster(root);
    const dots = $$("[data-dots] button", root);
    const segs = $$("[data-theme-seg] button", root);
    const codeEl = $("[data-code]", root);
    const CODE = "K7Q2XA9M";
    const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const savedBrand = store.get("yepdid.brand");
    const pressBrand = (c) => dots.forEach((d) => d.setAttribute("aria-pressed", String(d.dataset.c.toLowerCase() === c.toLowerCase())));
    if (savedBrand) pressBrand(savedBrand);
    for (const d of dots) {
      d.addEventListener("click", () => {
        const c = d.dataset.c;
        document.documentElement.style.setProperty("--brand", c);
        store.set("yepdid.brand", c === "#A5E3AE" ? null : c);
        pressBrand(c);
        confetti.at(d, 24, 0.5);
      });
    }
    const pressTheme = (t) => segs.forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.t === t)));
    theme.on((c) => pressTheme(c));
    for (const s of segs) s.addEventListener("click", () => theme.set(s.dataset.t, s));
    const paint = (s) => {
      codeEl.innerHTML = `${[...s.slice(0, 4)].map((c) => `<span>${c}</span>`).join("")}<span class="dash">-</span>${[...s.slice(4)].map((c) => `<span>${c}</span>`).join("")}`;
    };
    paint(CODE);
    onSeen(root, async () => {
      if (reduce) return;
      for (let k = 0; k < 14; k++) {
        paint(Array.from({ length: 8 }, (_, j) => (j < k - 5 ? CODE[j] : ALPHA[Math.floor(Math.random() * ALPHA.length)])).join(""));
        await wait(70);
      }
      paint(CODE);
    });
    $("[data-copy]", root).addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("K7Q2-XA9M");
      } catch {
        /* Clipboard blocked: the toast still answers. */
      }
      toast("Copied. (It's Asha's demo code!)");
    });
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
    rewardsDemo();
    feedDemo();
    youDemo();
    pairDemo();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
