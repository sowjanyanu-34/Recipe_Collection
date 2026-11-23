/* Dashboard: every number comes from /api/dashboard/stats (live MongoDB data) */
(function () {
  'use strict';
  const { $, api, esc, toast, recipeCard, empty, spinner } = App;

  App.ready.then(async () => {
    if (!App.requireAuth()) return;
    $('#welcome').textContent = 'Hello, ' + App.user.name.split(' ')[0];
    $('#recent').innerHTML = spinner();
    try {
      const { data } = await api('/api/dashboard/stats');
      const used = data.categories.filter((c) => c.count > 0).length;
      $('#stats').innerHTML =
        `<div class="stat"><strong>${data.totalRecipes}</strong><span>Recipes in the collection</span></div>` +
        `<div class="stat"><strong>${data.myRecipes}</strong><span>Recipes I submitted</span></div>` +
        `<div class="stat"><strong>${data.myFavorites}</strong><span>My favourites</span></div>` +
        `<div class="stat"><strong>${used}</strong><span>Categories with recipes</span></div>`;
      $('#cat-list').innerHTML = data.categories
        .map((c) => `<a class="chip" href="/explore?category=${encodeURIComponent(c.name)}">${esc(c.name)} <b>${c.count}</b></a>`).join('');
      $('#recent').innerHTML = data.recentRecipes.length
        ? data.recentRecipes.map((r) => recipeCard(r)).join('')
        : empty('🍽️', 'No recipes yet', 'Be the first to add one.', '<a class="btn btn-primary" href="/recipes/new">Add a recipe</a>');
      $('#mine').innerHTML = data.myLatestRecipes.length
        ? data.myLatestRecipes.map((r) => recipeCard(r, { manage: true })).join('')
        : empty('📝', 'You have not added a recipe yet', 'Share your first dish with the community.', '<a class="btn btn-primary" href="/recipes/new">Add your first recipe</a>');
    } catch (err) {
      $('#recent').innerHTML = '';
      toast(err.message, 'error');
    }
  });
})();
