function agriGovGetCsrfToken() {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

async function agriGovReadJson(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return { success: false, error: raw || 'Réponse serveur invalide.' };
  }
}

window.AgriGovProfileApi = {
  async getProfile() {
    const response = await fetch('/api/profile/', {
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const data = await agriGovReadJson(response);
    if (!response.ok || !data.success) throw new Error(data.error || 'Erreur chargement profil');
    return data.profile;
  },

  async saveProfile(payload) {
    const options = {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': agriGovGetCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    if (payload instanceof FormData) {
      options.body = payload;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await fetch('/api/profile/', options);
    const data = await agriGovReadJson(response);
    if (!response.ok || !data.success) throw new Error(data.error || 'Erreur sauvegarde profil');
    return data.profile;
  },

  async changePassword(current_password, new_password, confirm_password) {
    const response = await fetch('/api/change-password/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': agriGovGetCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ current_password, new_password, confirm_password })
    });
    const data = await agriGovReadJson(response);
    if (!response.ok || !data.success) throw new Error(data.error || 'Erreur changement mot de passe');
    return data;
  }
};
