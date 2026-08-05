(function () {
  const navLinks = document.querySelectorAll('.ds-nav a[href^="#"]');
  const sections = [...document.querySelectorAll('.ds-section[id]')];

  function setActiveNav() {
    let current = sections[0]?.id;
    const y = window.scrollY + 120;
    for (const s of sections) {
      if (s.offsetTop <= y) current = s.id;
    }
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', setActiveNav, { passive: true });
  setActiveNav();

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next === 'light' ? 'light' : '');
    document.getElementById('theme-toggle').textContent =
      next === 'light' ? 'Dark mode' : 'Light preview';
  });

  document.querySelectorAll('.accordion-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.accordion-item');
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
  });

  document.querySelectorAll('.switch').forEach((el) => {
    el.setAttribute('role', 'switch');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', () => {
      const on = el.classList.toggle('on');
      el.setAttribute('aria-checked', on);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        el.click();
      }
    });
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const group = tab.closest('.tabs');
      group.querySelectorAll('.tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });

  document.querySelectorAll('.segmented button').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const progress = document.getElementById('demo-progress');
  if (progress) {
    let v = 35;
    setInterval(() => {
      v = (v + 7) % 100;
      progress.style.width = v + '%';
      progress.setAttribute('aria-valuenow', String(v));
    }, 1200);
  }

  const copyBtn = document.getElementById('copy-tokens');
  const tokensPre = document.getElementById('tokens-json');
  if (copyBtn && tokensPre) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(tokensPre.textContent);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy tokens JSON'; }, 2000);
      } catch {
        copyBtn.textContent = 'Copy failed';
      }
    });
  }

  function renderTokens(data) {
    if (data && tokensPre) tokensPre.textContent = JSON.stringify(data, null, 2);
  }

  const embedded = document.getElementById('embedded-tokens');
  if (embedded?.textContent?.trim()) {
    try { renderTokens(JSON.parse(embedded.textContent)); } catch { /* fall through */ }
  }

  const paths = ['design-system/tokens.json', 'src/design-system/tokens.json'];
  (async () => {
    for (const p of paths) {
      try {
        const r = await fetch(p);
        if (r.ok) { renderTokens(await r.json()); return; }
      } catch { /* next */ }
    }
  })();
})();
