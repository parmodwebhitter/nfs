/* ==========================================================
   Momentra — interactions & animations
   ========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- counters ---------- */
  const runCounter = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const target = parseFloat(el.dataset.count);
    const decimals = +el.dataset.decimals || 0;
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const dur = 1800;
    const start = performance.now();
    const fmt = (n) => pre + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suf;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(runCounter);
      if (e.target.matches('[data-count]')) runCounter(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- rotating hero word ---------- */
  const words = $$('.rotator__word');
  let wi = 0;
  if (words.length && !reduceMotion) {
    setInterval(() => {
      const cur = words[wi];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      setTimeout(() => cur.classList.remove('is-leaving'), 600);
      wi = (wi + 1) % words.length;
      words[wi].classList.add('is-active');
    }, 3000);
  }

  /* ---------- typewriter in SERP mock ---------- */
  $$('.typed').forEach((el) => {
    const queries = [el.dataset.text, 'seo agency near me', 'how to lower cost per lead'];
    let q = 0, i = 0, del = false;
    const loop = () => {
      const txt = queries[q];
      el.textContent = txt.slice(0, i);
      if (!del && i < txt.length) i++;
      else if (!del) { del = true; return setTimeout(loop, 1800); }
      else if (i > 0) i--;
      else { del = false; q = (q + 1) % queries.length; }
      setTimeout(loop, del ? 30 : 70);
    };
    loop();
  });

  /* ---------- manifesto word-by-word highlight ---------- */
  const split = $('.split-words');
  if (split) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) return frag.appendChild(document.createTextNode(part));
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          n.classList.add('w');
        }
      });
    };
    walk(split);
  }
  const splitWords = split ? $$('.w', split) : [];

  /* ---------- scroll-driven: header, progress, manifesto, process ---------- */
  const header = $('.header');
  const progress = $('.scroll-progress');
  const steps = $$('.step');
  const meter = $('.process__meter');
  const processSec = $('.process');
  let lastY = 0, ticking = false;

  const onScroll = () => {
    const y = scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;

    header.classList.toggle('scrolled', y > 20);
    if (!header.classList.contains('open')) header.classList.toggle('hidden', y > lastY && y > 400);
    lastY = y;

    if (split) {
      const r = split.getBoundingClientRect();
      const p = Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0), 1);
      const n = Math.round(p * splitWords.length);
      splitWords.forEach((w, i) => w.classList.toggle('on', i < n || reduceMotion));
    }

    if (processSec) {
      const r = processSec.getBoundingClientRect();
      const p = Math.min(Math.max((innerHeight * 0.5 - r.top) / r.height, 0), 1);
      meter.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      let active = -1;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.55) active = i; });
      steps.forEach((s, i) => s.classList.toggle('active', i === active));
    }

    // active nav link
    $$('.nav a').forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      a.classList.toggle('active', r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.4);
    });
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $('.burger');
  burger.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => {
    header.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- pointer effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $('.cursor-glow');
    let gx = innerWidth / 2, gy = innerHeight / 2, cx = gx, cy = gy;
    addEventListener('mousemove', (e) => { gx = e.clientX; gy = e.clientY; document.body.classList.add('has-cursor'); });
    document.addEventListener('mouseleave', () => document.body.classList.remove('has-cursor'));
    (function follow() {
      cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12;
      glow.style.transform = `translate(${cx - 210}px, ${cy - 210}px)`;
      requestAnimationFrame(follow);
    })();

    // magnetic buttons
    $$('.magnetic').forEach((b) => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });

    // 3D tilt + spotlight
    $$('.tilt').forEach((el) => {
      const strength = el.classList.contains('dash') ? 8 : 5;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * strength}deg) rotateY(${(px - 0.5) * strength}deg) translateY(-4px)`;
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- logo marquee: duplicate for seamless loop ---------- */
  const track = $('.marquee__track');
  if (track) track.innerHTML += track.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

  /* ---------- case studies horizontal nav ---------- */
  const cases = $('.cases');
  $$('.work__nav .round-btn').forEach((b) => b.addEventListener('click', () => {
    const card = $('.case', cases);
    cases.scrollBy({ left: (card.offsetWidth + 22) * +b.dataset.dir, behavior: 'smooth' });
  }));
  // drag to scroll on desktop
  let down = false, sx = 0, sl = 0;
  cases.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = cases.scrollLeft; cases.style.scrollSnapType = 'none'; cases.style.cursor = 'grabbing'; });
  addEventListener('pointerup', () => { if (!down) return; down = false; cases.style.scrollSnapType = ''; cases.style.cursor = ''; });
  addEventListener('pointermove', (e) => { if (down) cases.scrollLeft = sl - (e.clientX - sx); });

  /* ---------- reviews slider ---------- */
  const slider = $('.slider');
  const strack = $('.slider__track', slider);
  const slides = $$('.review', strack);
  const dotsWrap = $('.slider__dots', slider);
  let idx = 0, timer;
  const perView = () => (innerWidth <= 640 ? 1 : innerWidth <= 1100 ? 2 : 3);
  const maxIdx = () => Math.max(slides.length - perView(), 0);
  const buildDots = () => {
    dotsWrap.innerHTML = '';
    for (let i = 0; i <= maxIdx(); i++) {
      const d = document.createElement('button');
      d.setAttribute('aria-label', `Go to review ${i + 1}`);
      d.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(d);
    }
  };
  const go = (i) => {
    idx = (i + maxIdx() + 1) % (maxIdx() + 1);
    const step = slides[0].offsetWidth + 22;
    strack.style.transform = `translateX(${-idx * step}px)`;
    $$('button', dotsWrap).forEach((d, j) => d.classList.toggle('on', j === idx));
  };
  const restart = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(idx + 1), 5500); };
  $$('[data-slide]', slider).forEach((b) => b.addEventListener('click', () => { go(idx + +b.dataset.slide); restart(); }));
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', restart);
  let tx = null;
  slider.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    tx = null;
  });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { buildDots(); go(Math.min(idx, maxIdx())); }, 150); });
  buildDots(); go(0); restart();

  /* ---------- FAQ: one open at a time ---------- */
  const faqs = $$('.accordion details');
  faqs.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
  }));

  /* ---------- contact form (front-end only) ---------- */
  const form = $('.form');
  const msg = $('.form__msg', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    ['name', 'email'].forEach((n) => {
      const f = form.elements[n];
      const valid = f.value.trim() && (n !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
      f.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    if (!ok) { msg.className = 'form__msg err'; msg.textContent = 'Please add your name and a valid work email.'; return; }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.firstChild.textContent = 'Sending… ';
    setTimeout(() => {
      btn.disabled = false;
      btn.firstChild.textContent = 'Get my free audit ';
      msg.className = 'form__msg ok';
      msg.textContent = `Thanks ${form.elements.name.value.split(' ')[0]}! A strategist will be in touch within 24 hours.`;
      form.reset();
    }, 1200);
  });
  $$('input', form).forEach((f) => f.addEventListener('input', () => f.classList.remove('invalid')));
})();
