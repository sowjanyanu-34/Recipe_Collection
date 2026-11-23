/* Shared helpers: API client, header/footer, toasts, dialogs, recipe cards */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts', 'Beverages', 'Vegetarian', 'Non-Vegetarian'];

  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    let res;
    try {
      res = await fetch(path, init);
    } catch (e) {
      throw Object.assign(new Error('Cannot reach the server. Check that the app is still running.'), { status: 0, errors: [] });
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok || data.success === false) {
      throw Object.assign(new Error(data.message || 'Something went wrong. Please try again.'), { status: res.status, errors: data.errors || [] });
    }
    return data;
  }

  function toast(message, type) {
    const box = $('#toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
  }

  function confirmDialog(message, confirmText) {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.innerHTML = '<p></p><div class="form-actions"><button type="button" class="btn btn-outline" data-r="0">Cancel</button><button type="button" class="btn btn-danger" data-r="1"></button></div>';
      $('p', dlg).textContent = message;
      $('[data-r="1"]', dlg).textContent = confirmText || 'Delete';
      dlg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (b) dlg.close(b.dataset.r);
      });
      dlg.addEventListener('close', () => { resolve(dlg.returnValue === '1'); dlg.remove(); });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  const spinner = (label) => `<div class="loading"><span class="spinner"></span> ${esc(label || 'Loading')}</div>`;
  const empty = (emoji, title, text, actionHtml) =>
    `<div class="empty"><div class="big-emoji" aria-hidden="true">${emoji}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml || ''}</div>`;

  function fmtMin(m) {
    m = Number(m) || 0;
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  }

  function recipeCard(r, opts = {}) {
    const cook = r.cookingTime > 0 ? 'Cook ' + fmtMin(r.cookingTime) : 'No cooking';
    const manage = opts.manage && r.isOwner
      ? `<a class="btn btn-outline btn-sm" href="/recipes/${r.id}/edit">Edit</a><button type="button" class="btn btn-danger btn-sm" data-delete="${r.id}" data-name="${esc(r.recipeName)}">Delete</button>`
      : '';
    return `<article class="card">
      <div class="card-img">
        <a href="/recipes/${r.id}" tabindex="-1" aria-hidden="true"><img src="${esc(r.imageUrl)}" alt="" loading="lazy"></a>
        <span class="badge">${esc(r.category)}</span>
        <button type="button" class="fav-btn${r.isFavorite ? ' on' : ''}" data-fav="${r.id}" aria-pressed="${r.isFavorite ? 'true' : 'false'}" aria-label="Favourite ${esc(r.recipeName)}" title="Favourite"><span aria-hidden="true">&#9829;</span></button>
      </div>
      <div class="card-body">
        <h3><a href="/recipes/${r.id}">${esc(r.recipeName)}</a></h3>
        <div class="meta"><span>&#9202; ${esc(cook)}</span><span class="diff diff-${esc(r.difficulty)}">${esc(r.difficulty)}</span><span>${esc(r.cuisine)}</span></div>
        <p class="card-desc">${esc(r.description)}</p>
        <div class="card-actions"><a class="btn btn-primary btn-sm" href="/recipes/${r.id}">View recipe</a>${manage}</div>
      </div></article>`;
  }

  function pagerHtml(p) {
    if (!p || p.pages <= 1) return '';
    const start = Math.max(1, Math.min(p.page - 2, p.pages - 4));
    const end = Math.min(p.pages, start + 4);
    let h = `<button type="button" data-page="${p.page - 1}" ${p.page === 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>`;
    for (let i = start; i <= end; i++) h += `<button type="button" data-page="${i}" ${i === p.page ? 'aria-current="page"' : ''}>${i}</button>`;
    h += `<button type="button" data-page="${p.page + 1}" ${p.page === p.pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>`;
    return h;
  }

  function showErrors(listEl, err) {
    if (!listEl) return;
    const msgs = err.errors && err.errors.length ? err.errors.map((e) => e.message) : [err.message];
    listEl.innerHTML = msgs.map((m) => `<li>${esc(m)}</li>`).join('');
    listEl.hidden = false;
    listEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  const clearErrors = (listEl) => { if (listEl) { listEl.hidden = true; listEl.innerHTML = ''; } };

  const App = (window.App = { $, $$, esc, api, toast, confirm: confirmDialog, spinner, empty, fmtMin, recipeCard, pagerHtml, showErrors, clearErrors, CATEGORIES, user: null });

  App.requireAuth = function () {
    if (App.user) return true;
    location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    return false;
  };

  function renderHeader() {
    const header = $('#site-header');
    if (!header) return;
    const path = location.pathname;
    const li = (href, label) => `<li><a href="${href}"${path === href ? ' aria-current="page"' : ''}>${label}</a></li>`;
    const links = App.user
      ? li('/dashboard', 'Dashboard') + li('/explore', 'Explore') + li('/my-recipes', 'My recipes') + li('/favorites', 'Favourites') + li('/profile', esc(App.user.name.split(' ')[0])) +
        '<li><a class="btn btn-primary btn-sm" href="/recipes/new">Add recipe</a></li><li><button type="button" class="linklike" id="logout-btn">Log out</button></li>'
      : li('/', 'Home') + li('/explore', 'Explore') + li('/login', 'Log in') + '<li><a class="btn btn-primary btn-sm" href="/register">Sign up</a></li>';
    header.innerHTML = `<nav class="nav" aria-label="Main">
      <a class="brand" href="${App.user ? '/dashboard' : '/'}"><span class="brand-mark" aria-hidden="true">&#127858;</span>Recipe Collection</a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button>
      <ul class="nav-links" id="nav-links">${links}</ul></nav>`;
    const toggle = $('.nav-toggle', header), list = $('#nav-links', header);
    toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', String(list.classList.toggle('open'))));
    const out = $('#logout-btn', header);
    if (out) out.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
      location.href = '/';
    });
  }

  function renderFooter() {
    const f = $('#site-footer');
    if (f) f.innerHTML = '<div class="container"><span>Recipe Collection and Management System</span><span>Built with Node.js, Express and MongoDB</span></div>';
  }

  // Favourite toggle for any [data-fav] button on any page
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    if (!App.user) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return; }
    const id = btn.dataset.fav, wasOn = btn.classList.contains('on');
    btn.disabled = true;
    try {
      await api('/api/favorites/' + id, { method: wasOn ? 'DELETE' : 'POST' });
      $$('[data-fav="' + id + '"]').forEach((b) => {
        b.classList.toggle('on', !wasOn);
        b.setAttribute('aria-pressed', String(!wasOn));
        const label = $('[data-fav-label]', b);
        if (label) label.textContent = wasOn ? 'Save to favourites' : 'Saved to favourites';
      });
      toast(wasOn ? 'Removed from favourites.' : 'Saved to favourites.');
      document.dispatchEvent(new CustomEvent('favourite:changed', { detail: { id, on: !wasOn } }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  App.ready = (async () => {
    try { App.user = (await api('/api/auth/me')).user; } catch (e) { App.user = null; }
    renderHeader();
    renderFooter();
  })();
})();
