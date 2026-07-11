import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('form-error');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Connexion...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Se connecter';

  if (error) {
    showError(error.message === 'Invalid login credentials'
      ? 'Email ou mot de passe incorrect.'
      : 'Erreur de connexion : ' + error.message);
    return;
  }

  // Connexion réussie — redirection selon le rôle
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();

  if (profile?.role === 'visitor') {
    window.location.href = '../index.html';
  } else {
    // student, teacher ET admin utilisent tous le même dashboard de gestion de projets
    window.location.href = '../tableau-de-bord/index.html';
  }
});
