function formToast(message, type='error') { let wrap = document.getElementById('buyerToastWrap'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'buyerToastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); } const toast = document.createElement('div'); toast.className = `toast-item ${type}`; toast.textContent = message; wrap.appendChild(toast); setTimeout(() => toast.classList.add('visible'), 10); setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 250); }, 2600); }
const roleConfig = {
  agriculteur: {
    badge: '🌾 Agriculteur',
    badgeClass: '',
    title: 'Espace <em>Agriculteur</em>',
    titleClass: '',
    subtitle: 'Connectez-vous pour gérer vos récoltes, vos stocks et vos transactions.',
    cardClass: '',
    cardInnerClass: '',
    btnClass: '',
  },
  acheteur: {
    badge: '🛒 Acheteur',
    badgeClass: 'ach',
    title: 'Espace <em>Acheteur</em>',
    titleClass: 'ach',
    subtitle: 'Retrouvez vos commandes passées et explorez les offres disponibles.',
    cardClass: 'ach',
    cardInnerClass: 'ach-theme',
    btnClass: 'ach',
  },
  transporteur: {
    badge: '🚛 Transporteur',
    badgeClass: 'trans',
    title: 'Espace <em>Transporteur</em>',
    titleClass: 'trans',
    subtitle: 'Accédez à vos missions de livraison et suivez vos trajets en cours.',
    cardClass: 'trans',
    cardInnerClass: 'trans-theme',
    btnClass: 'trans',
  },
  autres: {
    badge: '🐾 Vétérinaire / Organisme',
    badgeClass: 'autres',
    title: 'Espace <em>Professionnel</em>',
    titleClass: 'autres',
    subtitle: 'Connectez-vous pour accéder à votre espace vétérinaire ou organisme phytosanitaire.',
    cardClass: 'autres',
    cardInnerClass: 'autres-theme',
    btnClass: 'autres',
  },
  admin: {
    badge: '🏛️ Administrateur',
    badgeClass: 'admin',
    title: 'Accès <em>Administrateur</em>',
    titleClass: 'admin',
    subtitle: 'Supervision nationale — Ministère de l’Agriculture, Algérie.',
    cardClass: 'admin',
    cardInnerClass: 'admin-theme',
    btnClass: 'admin',
  }
};

let currentRole = '';
let pwdVisible = false;

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function showLogin(role) {
  currentRole = role;
  const cfg = roleConfig[role];

  document.getElementById('login-role-badge').textContent = cfg.badge;
  document.getElementById('login-role-badge').className = `login-role-badge ${cfg.badgeClass}`;

  document.getElementById('login-title').innerHTML = cfg.title;
  document.getElementById('login-title').className = `login-title ${cfg.titleClass}`;

  document.getElementById('login-subtitle').textContent = cfg.subtitle;
  document.getElementById('login-card').className = `login-card ${cfg.cardClass}`;
  document.getElementById('login-card-inner').className = `login-card-inner ${cfg.cardInnerClass}`;
  document.getElementById('btn-login').className = `btn-login ${cfg.btnClass}`;

  const notice = document.getElementById('admin-notice');
  notice.className = role === 'admin' ? 'admin-notice visible' : 'admin-notice';

  const divider = document.getElementById('divider-link');
  const bottomLink = document.getElementById('bottom-link');

  if (role === 'admin') {
    divider.style.display = 'none';
    bottomLink.style.display = 'none';
  } else {
    divider.style.display = '';
    bottomLink.style.display = '';
  }

  document.getElementById('f-email').value = '';
  document.getElementById('f-password').value = '';
  clearErrors();

  document.getElementById('step-role').style.display = 'none';
  document.getElementById('step-login').style.display = 'block';
}

function showRole() {
  document.getElementById('step-login').style.display = 'none';
  document.getElementById('step-role').style.display = 'flex';
}

function togglePassword() {
  pwdVisible = !pwdVisible;
  const input = document.getElementById('f-password');
  const eye = document.getElementById('pwd-eye');
  input.type = pwdVisible ? 'text' : 'password';
  eye.textContent = pwdVisible ? '🙈' : '👁';
}

function clearErrors() {
  document.getElementById('f-email').classList.remove('input-error');
  document.getElementById('f-password').classList.remove('input-error');
  document.getElementById('err-email').classList.remove('show');
  document.getElementById('err-pass').classList.remove('show');
  document.getElementById('err-pass').textContent = 'Mot de passe incorrect. Veuillez réessayer.';
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('f-email').value.trim();
  const pass = document.getElementById('f-password').value;
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!currentRole) {
    formToast('Choisissez votre profil.');
    return;
  }

  if (!emailRx.test(email)) {
    document.getElementById('f-email').classList.add('input-error');
    document.getElementById('err-email').classList.add('show');
    return;
  }

  if (!pass) {
    document.getElementById('f-password').classList.add('input-error');
    document.getElementById('err-pass').classList.add('show');
    return;
  }

  const urlsBox = document.getElementById('page-urls');
  const loginApi = urlsBox.dataset.loginApi;

  try {
    const response = await fetch(loginApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: email,
        password: pass,
        role: currentRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      document.getElementById('f-password').classList.add('input-error');
      document.getElementById('err-pass').classList.add('show');
      document.getElementById('err-pass').textContent = data.error || 'Erreur de connexion.';
      return;
    }

    window.location.href = data.redirect_url || urlsBox.dataset.home;
  } catch (error) {
    document.getElementById('err-pass').classList.add('show');
    document.getElementById('err-pass').textContent = 'Erreur serveur. Réessayez.';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('step-login').style.display = 'none';
  document.getElementById('step-success').style.display = 'none';
  document.getElementById('step-role').style.display = 'flex';
});