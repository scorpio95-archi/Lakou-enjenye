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

  // Connexion réussie — le tableau de bord n'existe pas encore,
  // donc on affiche juste une confirmation pour l'instant.
  submitBtn.textContent = 'Connecté ✓';
  errorEl.hidden = true;
  const successMsg = document.createElement('p');
  successMsg.className = 'form-success';
  successMsg.textContent = `Bienvenue ! Session active pour ${data.user.email}. Le tableau de bord arrive bientôt.`;
  form.appendChild(successMsg);
});
