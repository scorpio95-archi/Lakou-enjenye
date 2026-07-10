import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

const authRequired = document.getElementById('auth-required');
const settingsContent = document.getElementById('settings-content');

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    authRequired.hidden = false;
    settingsContent.hidden = true;
    return;
  }
  currentUser = session.user;
  authRequired.hidden = true;
  settingsContent.hidden = false;
  await loadAccountInfo();
}

// ===================== §01 INFOS COMPTE =====================
async function loadAccountInfo() {
  document.getElementById('account-email').textContent = currentUser.email;

  const { data } = await supabase
    .from('profiles')
    .select('role, created_at, notifications_enabled')
    .eq('id', currentUser.id)
    .single();

  if (data) {
    const roleLabels = { admin: 'Administrateur', teacher: 'Enseignant', student: 'Étudiant', visitor: 'Curieux' };
    document.getElementById('account-role').textContent = roleLabels[data.role] || data.role;
    document.getElementById('account-since').textContent = new Date(data.created_at).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('notif-toggle').checked = data.notifications_enabled !== false;
  }
}

// ===================== §02 MOT DE PASSE =====================
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');
  errorEl.hidden = true; successEl.hidden = true;

  const newPassword = document.getElementById('new-password').value;
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    errorEl.textContent = 'Erreur : ' + error.message;
    errorEl.hidden = false;
  } else {
    successEl.textContent = 'Mot de passe mis à jour ✓';
    successEl.hidden = false;
    document.getElementById('new-password').value = '';
  }
});

// ===================== §03 EMAIL =====================
document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('email-error');
  const successEl = document.getElementById('email-success');
  errorEl.hidden = true; successEl.hidden = true;

  const newEmail = document.getElementById('new-email').value.trim();
  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    errorEl.textContent = 'Erreur : ' + error.message;
    errorEl.hidden = false;
  } else {
    successEl.textContent = 'Email de confirmation envoyé à ' + newEmail + ' ✓';
    successEl.hidden = false;
    document.getElementById('new-email').value = '';
  }
});

// ===================== §04 NOTIFICATIONS =====================
document.getElementById('notif-toggle').addEventListener('change', async (e) => {
  await supabase.from('profiles')
    .update({ notifications_enabled: e.target.checked })
    .eq('id', currentUser.id);
});

// ===================== §05 DÉCONNEXION =====================
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
});

// ===================== §06 SUPPRESSION DE COMPTE =====================
const deleteModal = document.getElementById('delete-modal');
const openDeleteBtn = document.getElementById('open-delete-btn');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteForm = document.getElementById('delete-form');
const deleteError = document.getElementById('delete-error');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

openDeleteBtn.addEventListener('click', () => { deleteModal.hidden = false; });
deleteModalClose.addEventListener('click', () => { deleteModal.hidden = true; });
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) deleteModal.hidden = true; });

deleteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  deleteError.hidden = true;
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Vérification...';

  const password = document.getElementById('delete-password').value;

  // 1. Reconfirmer l'identité avec le mot de passe
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password
  });

  if (reauthError) {
    deleteError.textContent = 'Mot de passe incorrect.';
    deleteError.hidden = false;
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Supprimer définitivement';
    return;
  }

  // 2. Appeler la fonction serveur qui supprime réellement le compte
  deleteConfirmBtn.textContent = 'Suppression...';
  const { data, error } = await supabase.functions.invoke('delete-account');

  if (error || data?.error) {
    deleteError.textContent = 'Erreur : ' + (data?.error || error.message);
    deleteError.hidden = false;
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Supprimer définitivement';
    return;
  }

  // 3. Compte supprimé — déconnexion locale et retour à l'accueil
  await supabase.auth.signOut();
  window.location.href = '../index.html';
});

// ===================== LANCEMENT =====================
init();
