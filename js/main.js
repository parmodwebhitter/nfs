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

  /* ---------- flip variants for reveal ---------- */
  $$('.bento .card, .case, .review').forEach((el) => el.classList.add('reveal', 'flip'));
  $$('.step, .stat, .accordion details, .platform').forEach((el) => el.classList.add('reveal', 'flip-up'));

  /* ---------- tool flip cards: build front/back faces ---------- */
  $$('.tool').forEach((t) => {
    const badge = t.querySelector('span');
    const name = t.textContent.replace(badge.textContent, '').trim();
    t.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'tool__inner';
    const front = document.createElement('div');
    front.className = 'tool__face';
    front.append(badge, document.createTextNode(name));
    const back = document.createElement('div');
    back.className = 'tool__face tool__back';
    back.innerHTML = '<b>Certified</b><small></small>';
    back.querySelector('small').textContent = name + ' experts';
    inner.append(front, back);
    t.appendChild(inner);
    t.classList.add('flip-up');
  });

  /* ---------- scroll reveal ---------- */
  const revealEl = (el) => {
    el.classList.add('in');
    $$('[data-count]', el).forEach(runCounter);
    if (el.matches('[data-count]')) runCounter(el);
    io.unobserve(el);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      // also reveal anything already scrolled past (fast scroll, anchor jumps)
      if (e.isIntersecting || e.boundingClientRect.top < 0) revealEl(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // safety net: anything whose top has entered the viewport gets revealed, even
  // when it sits off to the side in a horizontal scroller or carousel
  let pendingReveal = $$('.reveal');
  const sweepReveals = () => {
    if (!pendingReveal.length) return;
    pendingReveal = pendingReveal.filter((el) => {
      if (el.classList.contains('in')) return false;
      const top = el.closest('.cases, .slider')?.getBoundingClientRect().top ?? el.getBoundingClientRect().top;
      if (top < innerHeight * 0.92) { revealEl(el); return false; }
      return true;
    });
  };

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

  /* ---------- hero banner slider ---------- */
  const hsSlides = $$('.hs__slide');
  if (hsSlides.length) {
    const hero = $('.hero-slider');
    const dots = $$('.hs__dots button');
    const count = $('.hs__count b');
    const DUR = 2000; // auto-rotate every 2 seconds
    hero.style.setProperty('--hs-dur', DUR + 'ms');
    let cur = 0, hsTimer;
    const show = (i) => {
      const prev = cur;
      cur = (i + hsSlides.length) % hsSlides.length;
      hsSlides.forEach((s, j) => {
        s.classList.toggle('is-leaving', j === prev && prev !== cur);
        s.classList.toggle('is-active', j === cur);
        s.setAttribute('aria-hidden', j !== cur);
        $$('a, button', s).forEach((el) => (el.tabIndex = j === cur ? 0 : -1));
      });
      dots.forEach((d, j) => {
        d.classList.remove('on');
        if (j === cur) { void d.offsetWidth; d.classList.add('on'); }
      });
      if (count) count.textContent = String(cur + 1).padStart(2, '0');
    };
    const play = () => { clearInterval(hsTimer); if (!reduceMotion) hsTimer = setInterval(() => show(cur + 1), DUR); };
    // stop rotating while the hero is off screen or the tab is in the background
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : clearInterval(hsTimer))).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(hsTimer) : play()));
    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); play(); }));
    $$('[data-hs]').forEach((b) => b.addEventListener('click', () => { show(cur + +b.dataset.hs); play(); }));
    hero.addEventListener('mouseenter', () => { clearInterval(hsTimer); hero.classList.add('hs-paused'); });
    hero.addEventListener('mouseleave', () => { hero.classList.remove('hs-paused'); play(); });
    let hx = null;
    hero.addEventListener('touchstart', (e) => { hx = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      if (hx === null) return;
      const dx = e.changedTouches[0].clientX - hx;
      if (Math.abs(dx) > 50) { show(cur + (dx < 0 ? 1 : -1)); play(); }
      hx = null;
    });
    show(0); play();
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
    sweepReveals();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  // reveals also run straight from scroll, so content never stays hidden if frames are throttled
  let lastSweep = 0;
  addEventListener('scroll', () => { const now = Date.now(); if (now - lastSweep > 120) { lastSweep = now; sweepReveals(); } }, { passive: true });
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

  /* ---------- flip cards no longer turn over: show the back's description on the front ---------- */
  $$('.flip:not(.plan__grid .flip)').forEach((card) => {
    const front = $('.flipcard__face:not(.flipcard__back)', card);
    const detail = $('.flipcard__back p', card);
    if (!front || !detail) return;
    const p = document.createElement('p');
    p.className = 'flip-detail';
    p.textContent = detail.textContent;
    front.appendChild(p);
  });

  /* ---------- logo marquee: duplicate for seamless loop ---------- */
  const track = $('.marquee__track');
  if (track) track.innerHTML += track.innerHTML.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

  /* ---------- reviews slider ---------- */
  const slider = $('.slider');
  if (slider) {
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
  }

  /* ---------- FAQ: one open at a time ---------- */
  const faqs = $$('.accordion details');
  faqs.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
  }));

  /* ---------- contact form (front-end only) ---------- */
  const form = $('.form');
  if (form) {
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

  // contact page: pre-select services from ?plan= or ?service= in the link
  const qs = new URLSearchParams(location.search);
  const planServices = { 'SEO': ['seo'], 'Performance Ads': ['ppc'], 'Social Media': ['social'], 'Complete Growth': ['seo', 'ppc', 'social', 'content'] };
  const serviceMap = { seo: ['seo'], ai: ['seo'], ppc: ['ppc'], social: ['social'], content: ['content'], web: ['web'], ecom: ['ppc', 'seo'], cro: ['web'], orm: ['seo'] };
  const wanted = planServices[qs.get('plan')] || serviceMap[qs.get('service')];
  if (wanted) $$('input[name="svc"]', form).forEach((c) => { c.checked = wanted.includes(c.value); });
  const planNote = $('.form__plan', form);
  if (planNote && qs.get('plan')) { planNote.hidden = false; planNote.querySelector('b').textContent = qs.get('plan'); }
  }

  /* ---------- quick audit forms (hero + mid-page band, front-end only) ---------- */
  $$('.audit-form').forEach((af) => {
    const out = $('.audit-form__msg', af);
    af.addEventListener('submit', (e) => {
      e.preventDefault();
      const site = af.elements.site, email = af.elements.email;
      const siteOk = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(site.value.trim());
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      site.classList.toggle('invalid', !siteOk);
      email.classList.toggle('invalid', !emailOk);
      if (!siteOk || !emailOk) { out.className = 'audit-form__msg err'; out.textContent = 'Please enter your website and a valid email.'; return; }
      const btn = $('button', af);
      btn.disabled = true;
      setTimeout(() => {
        btn.disabled = false;
        out.className = 'audit-form__msg ok';
        out.textContent = `Thanks! Your audit for ${site.value.trim().replace(/^https?:\/\//, '')} is on its way within 48 hours.`;
        af.reset();
      }, 900);
    });
    $$('input', af).forEach((f) => f.addEventListener('input', () => f.classList.remove('invalid')));
  });

  /* ---------- placeholder links (href="#") shouldn't throw the page back to the top ---------- */
  $$('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

})();
