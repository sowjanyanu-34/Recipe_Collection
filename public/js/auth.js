/* Login, register and profile pages */
(function () {
  'use strict';
  const { $, api, toast, showErrors, clearErrors, esc } = App;

  const safeNext = () => {
    const n = new URLSearchParams(location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard';
  };

  async function submit(form, btn, work) {
    const errBox = $('#form-error');
    clearErrors(errBox);
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Please wait...';
    try { await work(); } catch (err) { showErrors(errBox, err); } finally { btn.disabled = false; btn.textContent = label; }
  }

  function initLogin() {
    if (App.user) return location.replace('/dashboard');
    const form = $('#login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(form, $('button[type=submit]', form), async () => {
        if (!form.email.value.trim() || !form.password.value) throw new Error('Enter your email and password.');
        await api('/api/auth/login', { method: 'POST', body: { email: form.email.value.trim(), password: form.password.value } });
        location.href = safeNext();
      });
    });
  }

  function initRegister() {
    if (App.user) return location.replace('/dashboard');
    const form = $('#register-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(form, $('button[type=submit]', form), async () => {
        const problems = [];
        if (form.name.value.trim().length < 2) problems.push({ message: 'Enter your full name (at least 2 characters).' });
        if (!/^\S+@\S+\.\S+$/.test(form.email.value.trim())) problems.push({ message: 'Enter a valid email address.' });
        if (form.password.value.length < 8 || !/[A-Za-z]/.test(form.password.value) || !/\d/.test(form.password.value)) problems.push({ message: 'Password needs 8+ characters with a letter and a number.' });
        if (form.password.value !== form.confirmPassword.value) problems.push({ message: 'Passwords do not match.' });
        if (problems.length) throw Object.assign(new Error(problems[0].message), { errors: problems });
        await api('/api/auth/register', {
          method: 'POST',
          body: { name: form.name.value.trim(), email: form.email.value.trim(), password: form.password.value, confirmPassword: form.confirmPassword.value }
        });
        location.href = '/dashboard';
      });
    });
  }

  async function initProfile() {
    if (!App.requireAuth()) return;
    const form = $('#profile-form');
    async function load() {
      const { data } = await api('/api/users/profile');
      form.name.value = data.user.name;
      form.email.value = data.user.email;
      const since = new Date(data.user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      $('#profile-stats').innerHTML =
        `<div class="stat"><strong>${data.stats.recipes}</strong><span>Recipes shared</span></div>` +
        `<div class="stat"><strong>${data.stats.favorites}</strong><span>Favourites</span></div>` +
        `<div class="stat"><strong>${esc(since)}</strong><span>Member since</span></div>`;
    }
    try { await load(); } catch (err) { toast(err.message, 'error'); }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(form, $('button[type=submit]', form), async () => {
        if (form.newPassword.value && !form.currentPassword.value) throw new Error('Enter your current password to set a new one.');
        await api('/api/users/profile', {
          method: 'PUT',
          body: { name: form.name.value.trim(), email: form.email.value.trim(), currentPassword: form.currentPassword.value, newPassword: form.newPassword.value, confirmNewPassword: form.confirmNewPassword.value }
        });
        toast('Profile updated.');
        form.currentPassword.value = form.newPassword.value = form.confirmNewPassword.value = '';
        await load();
        App.user.name = form.name.value.trim();
        const link = document.querySelector('.nav-links a[href="/profile"]');
        if (link) link.textContent = App.user.name.split(' ')[0];
      });
    });
  }

  App.ready.then(() => {
    const page = document.body.dataset.page;
    if (page === 'login') initLogin();
    else if (page === 'register') initRegister();
    else if (page === 'profile') initProfile();
  });
})();
