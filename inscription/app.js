import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================== RÉFÉRENCES DOM =====================
const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('form-error');
const successEl = document.getElementById('form-success');

const disciplineSelect = document.getElementById('discipline');
const schoolSelect = document.getElementById('school');
const schoolOtherGroup = document.getElementById('school-other-group');
const schoolOtherInput = document.getElementById('school_other');

// ===================== CHARGEMENT DYNAMIQUE DES LISTES =====================
async function loadDisciplines() {
  const { data, error } = await supabase
    .from('disciplines')
    .select('slug, name')
    .eq('active', true)
    .order('name');

  if (error || !data) return;

  disciplineSelect.innerHTML = '<option value="">Choisir...</option>';
  data.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.slug;
    opt.textContent = d.name;
    disciplineSelect.appendChild(opt);
  });
}

async function loadSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .order('name');

  if (error || !data) return;

  schoolSelect.innerHTML = '<option value="">Choisir...</option>';
  data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    schoolSelect.appendChild(opt);
  });

  // "Autre" toujours en dernier, valeur spéciale
  const otherOpt = document.createElement('option');
  otherOpt.value = 'autre';
  otherOpt.textContent = 'Autre';
  schoolSelect.appendChild(otherOpt);
}

// Afficher/cacher le champ texte libre selon le choix "Autre"
schoolSelect.addEventListener('change', () => {
  const isOther = schoolSelect.value === 'autre';
  schoolOtherGroup.hidden = !isOther;
  if (!isOther) schoolOtherInput.value = '';
});

// ===================== SOUMISSION DU FORMULAIRE =====================
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
  successEl.hidden = true;
}

function showSuccess(msg) {
  successEl.textContent = msg;
  successEl.hidden = false;
  errorEl.hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Création en cours...';

  const fullName = document.getElementById('full_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const disciplineSlug = disciplineSelect.value;
  const schoolValue = schoolSelect.value;
  const schoolOther = schoolOtherInput.value.trim();

  if (!disciplineSlug) {
    showError('Merci de choisir une discipline.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Créer mon compte';
    return;
  }

  if (schoolValue === 'autre' && !schoolOther) {
    showError('Merci de préciser le nom de ton école.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Créer mon compte';
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        discipline_slug: disciplineSlug,
        school_id: schoolValue !== 'autre' ? schoolValue : '',
        school_other: schoolValue === 'autre' ? schoolOther : ''
      }
    }
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Créer mon compte';

  if (error) {
    showError(error.message === 'User already registered'
      ? 'Un compte existe déjà avec cet email.'
      : "Erreur lors de l'inscription : " + error.message);
    return;
  }

  if (data.session) {
    // Confirmation email désactivée : l'utilisateur est déjà connecté
    showSuccess('Compte créé et connecté ! Le tableau de bord arrive bientôt.');
    form.reset();
  } else {
    // Confirmation email activée : il doit cliquer le lien reçu
    showSuccess('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.');
    form.reset();
  }
});

// ===================== LANCEMENT =====================
loadDisciplines();
loadSchools();
