// Organize Me! — site behavior (no dependencies)
(function () {
  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      }
    });
  }

  // Space-solution detail dialogs
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-dialog'));
      if (dlg && dlg.showModal) dlg.showModal();
    });
  });
  document.querySelectorAll('dialog').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  // Contact form
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type="submit"]');
  var started = form.querySelector('input[name="started"]');
  if (started) started.value = String(Date.now());

  var otherBox = form.querySelector('input[value="Other"]');
  var otherText = form.querySelector('.other-text');
  if (otherBox && otherText) {
    var sync = function () { otherText.hidden = !otherBox.checked; };
    otherBox.addEventListener('change', sync); sync();
  }

  function show(kind, msg) {
    status.className = 'form-status ' + kind;
    status.textContent = msg;
    status.focus();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!form.querySelector('input[name="spaces"]:checked')) {
      show('err', 'Please choose at least one space you would like organized.');
      return;
    }
    if (!form.reportValidity()) return;

    submit.disabled = true;
    var label = submit.textContent;
    submit.textContent = 'Sending…';
    try {
      var res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.ok) {
        form.reset();
        if (otherText) otherText.hidden = true;
        show('ok', "Thank you! Your message is on its way. We'll be in touch soon.");
      } else {
        show('err', data.error || 'Something went wrong. Please call or email us instead.');
      }
    } catch (err) {
      show('err', 'We could not send your message. Please call +1 706-593-9493 or email jenn@organizeme.org.');
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
})();
