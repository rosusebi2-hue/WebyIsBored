(() => {
  'use strict';
  const games = Array.isArray(window.WEBY_GAMES) ? window.WEBY_GAMES : [];
  const playableRoot = document.getElementById('playable-games');
  const upcomingRoot = document.getElementById('upcoming-games');
  const dialog = document.getElementById('controls-dialog');
  const localPath = value => typeof value === 'string' && /^(?:games|assets)\/[a-zA-Z0-9_./-]+$/.test(value) && !value.split('/').includes('..');
  const playable = games.filter(game => game.status === 'playable' && localPath(game.href) && game.href.startsWith('games/'));
  if (playableRoot && playable.length) {
    const feature = playableRoot.querySelector('.game-feature');
    const fragment = document.createDocumentFragment();
    for (const game of playable) {
      const card = feature.cloneNode(true);
      card.querySelector('.feature-link').href = game.href;
      card.querySelector('.feature-kicker').textContent = game.kicker || 'PLAY IN YOUR BROWSER';
      card.querySelector('h3').textContent = game.title;
      card.querySelector('.feature-description').textContent = game.description || '';
      card.querySelector('.cover-caption').textContent = `${game.title.toUpperCase()} / COVER ART`;
      const artwork = card.querySelector('.feature-art');
      if (localPath(game.cover)) artwork.src = game.cover; else artwork.remove();
      const tags = card.querySelector('.game-tags'); tags.replaceChildren();
      for (const tag of game.tags || []) { const item = document.createElement('li'); item.textContent = tag; tags.append(item); }
      const controls = card.querySelector('.controls-button');
      if (game.controls === 'stick-and-swing' && dialog && typeof dialog.showModal === 'function') { controls.hidden = false; controls.dataset.controls = game.controls; }
      else controls.remove();
      fragment.append(card);
    }
    playableRoot.replaceChildren(fragment);
    playableRoot.classList.toggle('multiple-games', playable.length > 1);
    document.getElementById('playable-count').textContent = String(playable.length).padStart(2, '0');
  }
  if (upcomingRoot) {
    const upcoming = games.filter(game => game.status === 'coming-soon');
    const fragment = document.createDocumentFragment();
    upcoming.forEach((game, index) => {
      const card = document.getElementById('upcoming-template').content.cloneNode(true);
      card.querySelector('article').classList.add(['mint', 'lilac', 'amber'].includes(game.accent) ? game.accent : 'mint');
      card.querySelector('.slot-number').textContent = game.slot || String(index + playable.length + 1).padStart(2, '0');
      card.querySelector('h3').textContent = game.title; fragment.append(card);
    });
    upcomingRoot.replaceChildren(fragment);
  }
  if (dialog) {
    let opener;
    playableRoot?.addEventListener('click', event => {
      const button = event.target.closest('[data-controls]');
      if (!button || typeof dialog.showModal !== 'function') return;
      opener = button; dialog.showModal(); document.body.classList.add('dialog-open');
    });
    dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); if (opener?.isConnected) opener.focus(); });
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }, { threshold: .08 });
    document.querySelectorAll('.reveal').forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
      element.classList.add('will-reveal'); observer.observe(element);
    });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      observer.disconnect(); document.querySelectorAll('.will-reveal').forEach(e => e.classList.remove('will-reveal'));
    });
  }
})();
