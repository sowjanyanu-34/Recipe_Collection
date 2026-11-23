/* Home, explore, my recipes, recipe details, add/edit recipe form */
(function () {
  'use strict';
  const { $, $$, api, esc, toast, recipeCard, pagerHtml, empty, spinner, fmtMin, showErrors, clearErrors } = App;
  const FILTER_FIELDS = ['q', 'category', 'difficulty', 'cuisine', 'maxTime', 'sort'];

  /* ---------- Home ---------- */
  async function initHome() {
    $('#home-cats').innerHTML = App.CATEGORIES.map((c) => `<a class="chip" href="/explore?category=${encodeURIComponent(c)}">${esc(c)}</a>`).join('');
    if (App.user) {
      const cta = $('#home-cta');
      cta.textContent = 'Add a recipe';
      cta.href = '/recipes/new';
    }
    const box = $('#home-latest');
    box.innerHTML = spinner();
    try {
      const { data } = await api('/api/recipes?limit=6');
      box.innerHTML = data.recipes.length
        ? data.recipes.map((r) => recipeCard(r)).join('')
        : empty('🍽️', 'No recipes yet', 'Create an account and add the first one.', '<a class="btn btn-primary" href="/register">Get started</a>');
    } catch (err) {
      box.innerHTML = empty('⚠️', 'Recipes could not be loaded', err.message);
    }
  }

  /* ---------- Explore / My recipes ---------- */
  function initList(mine) {
    if (mine && !App.requireAuth()) return;
    const form = $('#filters'), grid = $('#results'), pager = $('#pager'), count = $('#count');
    const params = new URLSearchParams(location.search);
    FILTER_FIELDS.forEach((f) => { if (params.has(f) && form.elements[f]) form.elements[f].value = params.get(f); });
    let page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

    const values = () => Object.fromEntries(FILTER_FIELDS.map((f) => [f, form.elements[f].value.trim()]));
    const filtersActive = () => ['q', 'category', 'difficulty', 'cuisine', 'maxTime'].some((f) => values()[f]);

    async function load() {
      grid.innerHTML = spinner('Loading recipes');
      pager.innerHTML = '';
      const qs = new URLSearchParams();
      Object.entries(values()).forEach(([k, v]) => { if (v && !(k === 'sort' && v === 'newest')) qs.set(k, v); });
      if (page > 1) qs.set('page', page);
      history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : ''));
      const apiQs = new URLSearchParams(qs);
      apiQs.set('page', page);
      if (mine) apiQs.set('mine', 'true');
      try {
        const { data } = await api('/api/recipes?' + apiQs);
        const p = data.pagination;
        if (page > p.pages) { page = p.pages; return load(); }
        count.textContent = p.total ? `${p.total} recipe${p.total === 1 ? '' : 's'} found` : '';
        if (!data.recipes.length) {
          grid.innerHTML = filtersActive()
            ? empty('🔍', 'No recipes match these filters', 'Try a different search or remove a filter.', '<button type="button" class="btn btn-outline" data-clear>Clear filters</button>')
            : mine
              ? empty('📝', 'You have not added any recipes', 'Your recipes will appear here.', '<a class="btn btn-primary" href="/recipes/new">Add your first recipe</a>')
              : empty('🍽️', 'No recipes yet', 'Add the first recipe to the collection.', '<a class="btn btn-primary" href="/recipes/new">Add a recipe</a>');
          return;
        }
        grid.innerHTML = data.recipes.map((r) => recipeCard(r, { manage: mine })).join('');
        pager.innerHTML = pagerHtml(p);
      } catch (err) {
        count.textContent = '';
        grid.innerHTML = empty('⚠️', 'Recipes could not be loaded', err.message);
      }
    }

    let timer;
    form.addEventListener('input', (e) => {
      page = 1;
      clearTimeout(timer);
      if (e.target.tagName === 'INPUT') timer = setTimeout(load, 350); else load();
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
    const clear = () => { form.reset(); FILTER_FIELDS.forEach((f) => { form.elements[f].value = f === 'sort' ? 'newest' : ''; }); page = 1; load(); };
    $('#clear-filters').addEventListener('click', clear);
    grid.addEventListener('click', async (e) => {
      if (e.target.closest('[data-clear]')) return clear();
      const del = e.target.closest('[data-delete]');
      if (!del) return;
      if (!(await App.confirm(`Delete "${del.dataset.name}"? This cannot be undone.`))) return;
      try {
        await api('/api/recipes/' + del.dataset.delete, { method: 'DELETE' });
        toast('Recipe deleted.');
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
    pager.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      page = parseInt(b.dataset.page, 10);
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    load();
  }

  /* ---------- Recipe details ---------- */
  async function initDetail() {
    const root = $('#recipe-root');
    const id = location.pathname.split('/')[2];
    try {
      const { data } = await api('/api/recipes/' + encodeURIComponent(id));
      const r = data.recipe;
      document.title = r.recipeName + ' | Recipe Collection';
      const owner = r.isOwner
        ? `<div class="owner-bar"><a class="btn btn-outline btn-sm" href="/recipes/${r.id}/edit">Edit recipe</a><button type="button" class="btn btn-danger btn-sm" id="delete-btn">Delete recipe</button></div>` : '';
      const date = new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      root.innerHTML = `
        <p class="crumbs"><a href="/explore">Recipes</a> / ${esc(r.category)}</p>
        <div class="detail-hero">
          <div>
            <h1>${esc(r.recipeName)}</h1>
            <p class="lead">${esc(r.description)}</p>
            <p class="muted">By <strong>${esc(r.author ? r.author.name : 'Unknown')}</strong>, added ${esc(date)}</p>
            <div class="tag-row">${r.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
            <button type="button" class="btn btn-outline fav-toggle${r.isFavorite ? ' on' : ''}" data-fav="${r.id}" aria-pressed="${r.isFavorite}"><span aria-hidden="true">&#9829;</span> <span data-fav-label>${r.isFavorite ? 'Saved to favourites' : 'Save to favourites'}</span></button>
            ${owner}
          </div>
          <img src="${esc(r.imageUrl)}" alt="${esc(r.recipeName)}">
        </div>
        <div class="facts">
          <div class="fact"><span>Prep time</span><b>${fmtMin(r.preparationTime)}</b></div>
          <div class="fact"><span>Cooking time</span><b>${fmtMin(r.cookingTime)}</b></div>
          <div class="fact"><span>Total time</span><b>${fmtMin(r.totalTime)}</b></div>
          <div class="fact"><span>Servings</span><b>${r.servings}</b></div>
          <div class="fact"><span>Difficulty</span><b>${esc(r.difficulty)}</b></div>
          <div class="fact"><span>Cuisine</span><b>${esc(r.cuisine)}</b></div>
          <div class="fact"><span>Category</span><b>${esc(r.category)}</b></div>
        </div>
        <div class="detail-cols">
          <section class="panel"><h2>Ingredients</h2><ul class="ingredients">${r.ingredients.map((i) => `<li><span>${esc(i.name)}</span><span>${esc(i.quantity)}</span></li>`).join('')}</ul></section>
          <section class="panel"><h2>Method</h2><ol class="steps">${r.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
        </div>`;
      const del = $('#delete-btn');
      if (del) del.addEventListener('click', async () => {
        if (!(await App.confirm(`Delete "${r.recipeName}"? This cannot be undone.`))) return;
        try {
          await api('/api/recipes/' + r.id, { method: 'DELETE' });
          toast('Recipe deleted.');
          setTimeout(() => { location.href = '/my-recipes'; }, 600);
        } catch (err) { toast(err.message, 'error'); }
      });
    } catch (err) {
      root.innerHTML = empty('🍳', err.status === 404 ? 'Recipe not found' : 'Could not load recipe', err.message, '<a class="btn btn-primary" href="/explore">Explore recipes</a>');
    }
  }

  /* ---------- Add / edit form ---------- */
  async function initForm() {
    if (!App.requireAuth()) return;
    const mode = document.body.dataset.mode;
    const form = $('#recipe-form'), errBox = $('#form-error');
    const ingBox = $('#ingredients'), stepBox = $('#steps');
    const preview = $('#img-preview'), previewImg = $('img', preview), removeWrap = $('#remove-wrap');
    let recipeId = null;

    function addIngredient(name, qty) {
      const row = document.createElement('div');
      row.className = 'dyn-row';
      row.innerHTML = `<input type="text" class="ing-name" maxlength="100" placeholder="Ingredient" aria-label="Ingredient name" value="${esc(name || '')}"><input type="text" class="qty ing-qty" maxlength="60" placeholder="Quantity, e.g. 2 cups" aria-label="Ingredient quantity" value="${esc(qty || '')}"><button type="button" class="rm" aria-label="Remove ingredient">&#10005;</button>`;
      ingBox.appendChild(row);
    }
    function addStep(text) {
      const row = document.createElement('div');
      row.className = 'dyn-row';
      row.innerHTML = `<span class="step-no"></span><textarea class="step-text" rows="2" maxlength="1000" placeholder="Describe this step" aria-label="Instruction step">${esc(text || '')}</textarea><button type="button" class="rm" aria-label="Remove step">&#10005;</button>`;
      stepBox.appendChild(row);
      numberSteps();
    }
    const numberSteps = () => $$('.step-no', stepBox).forEach((s, i) => { s.textContent = i + 1; });
    function removeRow(box, btn, minRows) {
      if (box.children.length <= minRows) return toast('At least one row is required.', 'error');
      btn.closest('.dyn-row').remove();
      numberSteps();
    }
    ingBox.addEventListener('click', (e) => { const b = e.target.closest('.rm'); if (b) removeRow(ingBox, b, 1); });
    stepBox.addEventListener('click', (e) => { const b = e.target.closest('.rm'); if (b) removeRow(stepBox, b, 1); });
    $('#add-ingredient').addEventListener('click', () => { addIngredient(); $$('.ing-name', ingBox).pop().focus(); });
    $('#add-step').addEventListener('click', () => { addStep(); $$('.step-text', stepBox).pop().focus(); });

    $('#image').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) { preview.hidden = !previewImg.src || previewImg.dataset.existing !== '1'; return; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { e.target.value = ''; return toast('Choose a JPG, PNG or WEBP image.', 'error'); }
      if (f.size > 5 * 1024 * 1024) { e.target.value = ''; return toast('Image is too large. Maximum size is 5 MB.', 'error'); }
      previewImg.src = URL.createObjectURL(f);
      previewImg.dataset.existing = '0';
      preview.hidden = false;
      removeWrap.hidden = true;
    });

    if (mode === 'edit') {
      recipeId = location.pathname.split('/')[2];
      try {
        const { data } = await api('/api/recipes/' + encodeURIComponent(recipeId));
        const r = data.recipe;
        if (!r.isOwner) { toast('You can only edit your own recipes.', 'error'); return setTimeout(() => location.replace('/recipes/' + r.id), 900); }
        ['recipeName', 'description', 'category', 'cuisine', 'difficulty', 'preparationTime', 'cookingTime', 'servings'].forEach((f) => { form.elements[f].value = r[f]; });
        form.elements.tags.value = r.tags.join(', ');
        r.ingredients.forEach((i) => addIngredient(i.name, i.quantity));
        r.instructions.forEach((s) => addStep(s));
        if (r.image) { previewImg.src = r.imageUrl; previewImg.dataset.existing = '1'; preview.hidden = false; removeWrap.hidden = false; }
      } catch (err) {
        form.hidden = true;
        return $('main').insertAdjacentHTML('beforeend', `<div class="container">${empty('🍳', 'Recipe not found', err.message, '<a class="btn btn-primary" href="/my-recipes">Back to my recipes</a>')}</div>`);
      }
    } else {
      addIngredient(); addIngredient(); addStep(); addStep();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(errBox);
      const ingredients = $$('.dyn-row', ingBox).map((r) => ({ name: $('.ing-name', r).value.trim(), quantity: $('.ing-qty', r).value.trim() })).filter((i) => i.name);
      const steps = $$('.step-text', stepBox).map((t) => t.value.trim()).filter(Boolean);
      const problems = [];
      if (form.recipeName.value.trim().length < 2) problems.push({ message: 'Enter a recipe name.' });
      if (form.description.value.trim().length < 10) problems.push({ message: 'Description must be at least 10 characters.' });
      if (!form.category.value) problems.push({ message: 'Choose a category.' });
      if (form.cuisine.value.trim().length < 2) problems.push({ message: 'Enter the cuisine type.' });
      if (!ingredients.length) problems.push({ message: 'Add at least one ingredient.' });
      if (!steps.length) problems.push({ message: 'Add at least one instruction step.' });
      if (problems.length) return showErrors(errBox, Object.assign(new Error(problems[0].message), { errors: problems }));

      const fd = new FormData();
      ['recipeName', 'description', 'category', 'cuisine', 'difficulty', 'preparationTime', 'cookingTime', 'servings', 'tags'].forEach((f) => fd.append(f, form.elements[f].value.trim()));
      fd.append('ingredients', JSON.stringify(ingredients));
      fd.append('instructions', JSON.stringify(steps));
      const file = $('#image').files[0];
      if (file) fd.append('image', file);
      if (mode === 'edit' && $('#removeImage').checked) fd.append('removeImage', 'true');

      const btn = $('#save-btn');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const res = await api(mode === 'edit' ? '/api/recipes/' + recipeId : '/api/recipes', { method: mode === 'edit' ? 'PUT' : 'POST', body: fd });
        toast(res.message);
        setTimeout(() => { location.href = '/recipes/' + res.data.recipe.id; }, 500);
      } catch (err) {
        showErrors(errBox, err);
        btn.disabled = false; btn.textContent = 'Save recipe';
      }
    });
  }

  App.ready.then(() => {
    const page = document.body.dataset.page;
    if (page === 'home') initHome();
    else if (page === 'explore') initList(false);
    else if (page === 'my-recipes') initList(true);
    else if (page === 'recipe') initDetail();
    else if (page === 'recipe-form') initForm();
  });
})();
