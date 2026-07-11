import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let allSubmitted = [];
let activeDisciplineFilter = '';

const authRequired = document.getElementById('auth-required');
const notAuthorized = document.getElementById('not-authorized');
const dashboardContent = document.getElementById('dashboard-content');

const grid = document.getElementById('submitted-grid');
const loadingMsg = document.getElementById('loading-msg');
const emptyMsg = document.getElementById('empty-msg');
const disciplineFilter = document.getElementById('filter-discipline');

const reviewModal = document.getElementById('review-modal');
const reviewModalClose = document.getElementById('review-modal-close');
const validateProjectBtn = document.getElementById('validate-project-btn');
const reviewSuccess = document.getElementById('review-success');

let currentReviewProjectId = null;

// ===================== INIT =====================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    authRequired.hidden = false;
    return;
  }
  currentUser = session.user;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
  if (!profile || !['teacher', 'admin'].includes(profile.role)) {
    notAuthorized.hidden = false;
    return;
  }

  dashboardContent.hidden = false;
  await loadDisciplineOptions();
  await loadSubmittedProjects();
}

async function loadDisciplineOptions() {
  const { data } = await supabase.from('disciplines').select('id, name').order('name');
  (data || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    disciplineFilter.appendChild(opt);
  });
}

disciplineFilter.addEventListener('change', () => {
  activeDisciplineFilter = disciplineFilter.value;
  renderProjects();
});

// ===================== LISTE DES PROJETS SOUMIS =====================
async function loadSubmittedProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, description, status, created_at, discipline_id,
      disciplines ( name ),
      schools ( name ),
      profiles!projects_owner_id_fkey ( full_name )
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  loadingMsg.hidden = true;

  if (error) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = 'Erreur de chargement.';
    return;
  }

  allSubmitted = data || [];
  renderProjects();
}

function renderProjects() {
  grid.querySelectorAll('.project-card').forEach(el => el.remove());

  const filtered = activeDisciplineFilter
    ? allSubmitted.filter(p => p.discipline_id === activeDisciplineFilter)
    : allSubmitted;

  if (filtered.length === 0) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = 'Aucun projet en attente de validation pour l\'instant.';
    return;
  }
  emptyMsg.hidden = true;

  filtered.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <span class="discipline-tag">${escapeHtml(project.disciplines?.name || '—')}</span>
      <h3>${escapeHtml(project.title)}</h3>
      <span class="card-meta-line">${escapeHtml(project.profiles?.full_name || 'Étudiant inconnu')} — ${escapeHtml(project.schools?.name || 'École non renseignée')}</span>
    `;
    card.addEventListener('click', () => openReviewModal(project));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===================== MODALE DE REVUE =====================
async function openReviewModal(project) {
  currentReviewProjectId = project.id;
  reviewSuccess.hidden = true;

  document.getElementById('review-discipline').textContent = project.disciplines?.name || '—';
  document.getElementById('review-title').textContent = project.title;
  document.getElementById('review-description').textContent = project.description || '';
  document.getElementById('review-student').textContent = project.profiles?.full_name || '—';
  document.getElementById('review-school').textContent = project.schools?.name || '—';

  await loadDeliverablesForReview(project.id);
  reviewModal.hidden = false;
}

async function loadDeliverablesForReview(projectId) {
  const { data } = await supabase
    .from('project_deliverables')
    .select('id, step_number, step_name, content, file_urls, is_validated')
    .eq('project_id', projectId)
    .order('step_number');

  const list = document.getElementById('deliverables-review-list');
  list.innerHTML = '';

  (data || []).forEach(d => {
    const item = document.createElement('div');
    item.className = 'deliverable-review-item';

    const filesHtml = (d.file_urls || []).map((url, i) =>
      `<a href="${url}" target="_blank">Fichier ${i + 1} →</a>`
    ).join('');

    item.innerHTML = `
      <div class="deliverable-review-header">
        <span class="step-title"><span class="step-num">${String(d.step_number).padStart(2, '0')}</span> ${escapeHtml(d.step_name)}</span>
        <span class="status-pill ${d.is_validated ? 'validated' : ''}">${d.is_validated ? 'Validé' : 'En attente'}</span>
      </div>
      <p class="deliverable-content-text ${!d.content ? 'empty' : ''}">${escapeHtml(d.content) || 'Aucun contenu renseigné.'}</p>
      <div class="deliverable-files">${filesHtml}</div>
      <div class="validate-step-row">
        <button class="btn-validate-step" data-id="${d.id}" ${d.is_validated ? 'disabled' : ''}>
          ${d.is_validated ? 'Déjà validé' : '✓ Valider ce livrable'}
        </button>
      </div>
    `;
    list.appendChild(item);

    const btn = item.querySelector('.btn-validate-step');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '...';
      const { error } = await supabase
        .from('project_deliverables')
        .update({ is_validated: true })
        .eq('id', d.id);

      if (error) {
        alert('Erreur : ' + error.message);
        btn.disabled = false;
        btn.textContent = '✓ Valider ce livrable';
        return;
      }
      btn.textContent = 'Déjà validé';
      item.querySelector('.status-pill').classList.add('validated');
      item.querySelector('.status-pill').textContent = 'Validé';
    });
  });
}

reviewModalClose.addEventListener('click', () => { reviewModal.hidden = true; loadSubmittedProjects(); });
reviewModal.addEventListener('click', (e) => { if (e.target === reviewModal) { reviewModal.hidden = true; loadSubmittedProjects(); } });

validateProjectBtn.addEventListener('click', async () => {
  validateProjectBtn.disabled = true;
  validateProjectBtn.textContent = 'Validation...';

  const { error } = await supabase
    .from('projects')
    .update({ status: 'validated' })
    .eq('id', currentReviewProjectId);

  validateProjectBtn.disabled = false;
  validateProjectBtn.textContent = '✓ Valider le projet entier';

  if (error) {
    alert('Erreur : ' + error.message);
    return;
  }

  reviewSuccess.hidden = false;
  setTimeout(() => {
    reviewModal.hidden = true;
    loadSubmittedProjects();
  }, 1200);
});

// ===================== LANCEMENT =====================
init();
