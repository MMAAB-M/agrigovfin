function formToast(message, type='error') { let wrap = document.getElementById('buyerToastWrap'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'buyerToastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); } const toast = document.createElement('div'); toast.className = `toast-item ${type}`; toast.textContent = message; wrap.appendChild(toast); setTimeout(() => toast.classList.add('visible'), 10); setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 250); }, 2600); }
let currentRole = '';
let autresType = '';
let veggies = [];

const roleConfig = {
  agriculteur: {
    emoji: '🌾',
    label: 'Agriculteur',
    badgeText: '🌾 Agriculteur',
    formTitle: 'Créez votre<br><em style="font-style:italic;color:var(--green-accent)">compte agriculteur</em>'
  },
  acheteur: {
    emoji: '🛒',
    label: 'Acheteur',
    badgeText: '🛒 Acheteur',
    formTitle: 'Créez votre<br><em style="font-style:italic;color:var(--green-accent)">compte acheteur</em>'
  },
  transporteur: {
    emoji: '🚛',
    label: 'Transporteur',
    badgeText: '🚛 Transporteur',
    formTitle: 'Créez votre<br><em style="font-style:italic;color:var(--green-accent)">compte transporteur</em>'
  },
  autres: {
    emoji: '💡',
    label: 'Autres',
    badgeText: '💡 Autres',
    formTitle: 'Créez votre<br><em style="font-style:italic;color:var(--green-accent)">compte professionnel</em>'
  }
};

function showForm(role) {
  currentRole = role;

  const roleInput = document.getElementById('role-input');
  if (roleInput) roleInput.value = role;

  document.getElementById('step-role').style.display = 'none';
  document.getElementById('step-form').style.display = 'block';

  const cfg = roleConfig[role];
  document.getElementById('form-role-badge').innerHTML = cfg.badgeText;
  document.getElementById('form-title').innerHTML = cfg.formTitle;

  ['fields-agriculteur', 'fields-acheteur', 'fields-transporteur', 'fields-autres'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  document.getElementById('fields-' + role).style.display = 'block';
  syncConditionalRequiredFields();
}

function showRole() {
  document.getElementById('step-form').style.display = 'none';
  document.getElementById('step-role').style.display = 'flex';
}

function setAutresType(type) {
  autresType = type;
  const hidden = document.getElementById('other-type-hidden');
  if (hidden) hidden.value = type;
}

function addFarm() {
  const container = document.getElementById('farms-container');
  const entry = document.createElement('div');
  entry.className = 'farm-entry';
  entry.innerHTML = `
    <input type="text" placeholder="Ex: Ferme Nouvelle" class="farm-input" name="farm_names">
    <button type="button" class="remove-farm" onclick="removeFarm(this)">×</button>
  `;
  container.appendChild(entry);
  syncConditionalRequiredFields();
}

function removeFarm(button) {
  button.parentElement.remove();
}

function addVeggie(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = document.getElementById('f-veggie-input');
    const val = input.value.trim();

    if (!val || veggies.includes(val.toLowerCase())) {
      input.value = '';
      return;
    }

    veggies.push(val);
    renderVeggies();
    input.value = '';
  }
}

function removeVeggie(index) {
  veggies.splice(index, 1);
  renderVeggies();
}

function renderVeggies() {
  const tags = document.getElementById('veggie-tags');
  tags.innerHTML = veggies.map((v, index) => `
    <div class="veggie-tag">
      ${escapeHtml(v)}
      <button type="button" onclick="removeVeggie(${index})">×</button>
    </div>
  `).join('');

  const hidden = document.getElementById('main-products-hidden');
  if (hidden) hidden.value = veggies.join(', ');
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('photo-name').textContent = '✓ ' + file.name;
  document.getElementById('photo-upload-area').classList.add('has-file');
}

function handleFileUpload(inputId, nameId, areaId) {
  const input = document.getElementById(inputId);
  const files = input.files;
  if (!files.length) return;

  document.getElementById(nameId).textContent =
    '✓ ' + Array.from(files).map(f => f.name).join(', ');
  document.getElementById(areaId).classList.add('has-file');
}

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function syncConditionalRequiredFields() {
  const surface = document.getElementById('f-surface');
  const vehicle = document.getElementById('f-vehicule');
  const rc = document.getElementById('f-rc');
  const vehDocs = document.getElementById('f-veh-docs');
  const farmInputs = document.querySelectorAll('.farm-input');
  const autresRadio = document.querySelectorAll('input[name="autres-type-ui"]');

  farmInputs.forEach(input => input.required = false);
  if (surface) surface.required = false;
  if (vehicle) vehicle.required = false;
  if (rc) rc.required = false;
  if (vehDocs) vehDocs.required = false;
  autresRadio.forEach(r => r.required = false);

  if (currentRole === 'agriculteur') {
    farmInputs.forEach(input => input.required = true);
    if (surface) surface.required = true;
  } else if (currentRole === 'acheteur') {
    if (rc) rc.required = true;
  } else if (currentRole === 'transporteur') {
    if (vehicle) vehicle.required = true;
    if (vehDocs) vehDocs.required = true;
  } else if (currentRole === 'autres') {
    autresRadio.forEach(r => r.required = true);
  }
}

function validateBeforeSubmit() {
  if (!currentRole) {
    formToast('Veuillez choisir un rôle.');
    return false;
  }

  const p1 = document.getElementById('f-password').value.trim();
  const p2 = document.getElementById('f-password2').value.trim();

  if (p1 !== p2) {
    formToast('Les mots de passe ne correspondent pas.');
    return false;
  }

  if (currentRole === 'agriculteur') {
    const farmInputs = Array.from(document.querySelectorAll('.farm-input'));
    const hasFarm = farmInputs.some(input => input.value.trim() !== '');
    const surface = document.getElementById('f-surface').value.trim();

    if (!hasFarm) {
      formToast('Veuillez ajouter au moins une ferme.');
      return false;
    }

    if (!surface) {
      formToast('Veuillez remplir la surface totale.');
      return false;
    }

    if (veggies.length === 0) {
      formToast('Veuillez ajouter au moins un produit principal.');
      return false;
    }
  }

  if (currentRole === 'acheteur') {
    const rc = document.getElementById('f-rc');
    if (!rc.files.length) {
      formToast('Veuillez joindre le registre de commerce.');
      return false;
    }
  }

  if (currentRole === 'transporteur') {
    const vehicle = document.getElementById('f-vehicule').value.trim();
    const docs = document.getElementById('f-veh-docs');

    if (!vehicle) {
      formToast('Veuillez renseigner le véhicule.');
      return false;
    }

    if (!docs.files.length) {
      formToast('Veuillez joindre les documents du véhicule.');
      return false;
    }
  }

  if (currentRole === 'autres') {
    if (!autresType) {
      formToast('Veuillez sélectionner votre spécialité.');
      return false;
    }
  }

  return true;
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('signup-form');

  if (form) {
    form.addEventListener('submit', function (e) {
      if (!validateBeforeSubmit()) {
        e.preventDefault();
        return;
      }

      const hidden = document.getElementById('main-products-hidden');
      if (hidden) hidden.value = veggies.join(', ');

      const roleInput = document.getElementById('role-input');
      if (roleInput) roleInput.value = currentRole;
    });
  }
});