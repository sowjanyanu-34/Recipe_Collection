/* Favourites page */
(function () {
  'use strict';
  const { $, api, toast, recipeCard, empty, spinner } = App;

  App.ready.then(async () => {
    if (!App.requireAuth()) return;
    const grid = $('#results'), count = $('#count');

    const refreshCount = () => {
      const n = grid.querySelectorAll('.card').length;
      count.textContent = n ? `${n} saved recipe${n === 1 ? '' : 's'}` : '';
      if (!n) grid.innerHTML = empty('💛', 'No favourites yet', 'Tap the heart on any recipe to save it here.', '<a class="btn btn-primary" href="/explore">Explore recipes</a>');
    };

    grid.innerHTML = spinner();
    try {
      const { data } = await api('/api/favorites');
      grid.innerHTML = data.recipes.map((r) => recipeCard(r)).join('');
      refreshCount();
    } catch (err) {
      grid.innerHTML = '';
      toast(err.message, 'error');
    }

    // Un-favouriting removes the card from this page
    document.addEventListener('favourite:changed', (e) => {
      if (e.detail.on) return;
      const btn = grid.querySelector('[data-fav="' + e.detail.id + '"]');
      if (btn) { btn.closest('.card').remove(); refreshCount(); }
    });
  });
})();
