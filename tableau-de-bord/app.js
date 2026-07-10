import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let allProjects = [];
let activeStatusFilter = 'all';
let editingProjectId = null;

// ===================== RÉFÉRENCES DOM =====================
const authRequired = document.getElementById('auth-required');
const dashboardContent = document.getElementById('dashboard-content');

const avatarImg = document.getElementById('profile-avatar');
const avatarInput = document.getElementById('avatar-input');
const fullNameInput = document.getElementById('profile-full-name');
const disciplineSelect = document.getElementById('profile-discipline');
const schoolSelect = document.getElementById('profile-school');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileSuccess = document.getElementById('profile-success');

const grid = document.getElementById('my-projects-grid');
const projectsLoading = document.getElementById('projects-loading');
const projectsEmpty = document.getElementById('projects-empty');
const statusTabs = document.getElementById('status-tabs');

const newProjectBtn = document.getElementById('new-project-btn');
const createModal = document.getElementById('create-project-modal');
const createModalClose = document.getElementById('create-modal-close');
const createForm = document.getElementById('create-project-form');
const createError = document.getElementById('create-error');

const editModal = document.getElementById('edit-project-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editProjectTitle = document.getElementById('edit-project-title');
const editStatus = document.getElementById('edit-status');
const deliverablesEditList = document.getElementById('deliverables-edit-list');
const editSuccess = document.getElementById('edit-success');

// ===================== INITIALISATION =====================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    authRequired.hidden = false;
    dashboardContent.hidden = true;
    return;
  }

  currentUser = session.user;
  authRequired.hidden = true;
  dashboardContent.hidden = false;

  await loadDisciplineOptions();
  await loadSchoolOptions();
  await loadProfile();
  await loadMyProjects();
}

// ===================== LISTES DÉROULANTES ===================== 
async function loadDisciplineOptions() {
  const { data } = await supabase.from('disciplines').select('id, name').eq('active', true).order('name');
  disciplineSelect.innerHTML = '<option value="">Non renseigné</option>';
  (data || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    disciplineSelect.appendChild(opt);
  });
}

async function loadSchoolOptions() {
  const { data } = await supabase.from('schools').select('id, name').order('name');
  schoolSelect.innerHTML = '<option value="">Non renseigné</option>';
  (data || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    schoolSelect.appendChild(opt);
  });
}
// ===================== PROFIL =====================
async function loadProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, discipline_id, school_id, avatar_url')
    .eq('id', currentUser.id)
    .single();

  if (error || !data) return;
  currentProfile = data;

  fullNameInput.value = data.full_name || '';
  disciplineSelect.value = data.discipline_id || '';
  schoolSelect.value = data.school_id || '';
  avatarImg.src = data.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + currentUser.id;
}

avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop();
  const path = `${currentUser.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) {
    alert("Erreur lors de l'upload de l'avatar : " + uploadError.message);
    return;
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // évite le cache navigateur

  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
  avatarImg.src = publicUrl;
});

saveProfileBtn.addEventListener('click', async () => {
  profileSuccess.hidden = true;
  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = 'Enregistrement...';

  const { error } = await supabase.from('profiles').update({
    full_name: fullNameInput.value.trim(),
    discipline_id: disciplineSelect.value || null,
    school_id: schoolSelect.value || null
  }).eq('id', currentUser.id);

  saveProfileBtn.disabled = false;
  saveProfileBtn.textContent = 'Enregistrer le profil';

  if (!error) {
    profileSuccess.hidden = false;
    setTimeout(() => { profileSuccess.hidden = true; }, 2500);
  }
});

// ===================== MES PROJETS =====================
async function loadMyProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, cover_image_url, status, created_at')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: false });

  projectsLoading.hidden = true;

  if (error) {
    projectsEmpty.hidden = false;
    projectsEmpty.textContent = 'Erreur de chargement des projets.';
    return;
  }

  allProjects = data || [];
  renderProjects();
}

function renderProjects() {
  grid.querySelectorAll('.project-card').forEach(el => el.remove());

  const filtered = activeStatusFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.status === activeStatusFilter);

  if (filtered.length === 0) {
    projectsEmpty.hidden = false;
    projectsEmpty.textContent = activeStatusFilter === 'all'
      ? "Aucun projet pour l'instant — crée le premier !"
      : "Aucun projet avec ce statut.";
    return;
  }
  projectsEmpty.hidden = true;

  const statusLabels = {
    draft: 'Brouillon', in_progress: 'En cours',
    submitted: 'Soumis', validated: 'Validé', archived: 'Archivé'
  };

  filtered.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <span class="status-badge ${project.status}">${statusLabels[project.status] || project.status}</span>
      <h3>${escapeHtml(project.title)}</h3>
      <p class="card-desc">${escapeHtml(project.description || 'Pas de description.')}</p>
    `;
    card.addEventListener('click', () => openEditModal(project));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

statusTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.status-tab');
  if (!btn) return;
  statusTabs.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  activeStatusFilter = btn.dataset.status;
  renderProjects();
});

// ===================== CRÉATION DE PROJET =====================
newProjectBtn.addEventListener('click', () => { createModal.hidden = false; });
createModalClose.addEventListener('click', () => { createModal.hidden = true; });
createModal.addEventListener('click', (e) => { if (e.target === createModal) createModal.hidden = true; });

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createError.hidden = true;

  const title = document.getElementById('new-title').value.trim();
  const description = document.getElementById('new-description').value.trim();
  const cover = document.getElementById('new-cover').value.trim();

  if (!currentProfile?.discipline_id) {
    createError.textContent = "Renseigne d'abord ta discipline dans ton profil avant de créer un projet.";
    createError.hidden = false;
    return;
  }

  const { error } = await supabase.from('projects').insert({
    owner_id: currentUser.id,
    discipline_id: currentProfile.discipline_id,
    school_id: currentProfile.school_id,
    title,
    description,
    cover_image_url: cover || null,
    status: 'draft'
  });

  if (error) {
    createError.textContent = 'Erreur : ' + error.message;
    createError.hidden = false;
    return;
  }

  createForm.reset();
  createModal.hidden = true;
  await loadMyProjects();
});

// ===================== ÉDITION PROJET + LIVRABLES =====================
async function openEditModal(project) {
  editingProjectId = project.id;
  editProjectTitle.textContent = project.title;
  editStatus.value = ['draft', 'in_progress', 'submitted'].includes(project.status) ? project.status : 'draft';

  await loadDeliverables(project.id);
  editModal.hidden = false;
}

editModalClose.addEventListener('click', () => { editModal.hidden = true; loadMyProjects(); });
editModal.addEventListener('click', (e) => { if (e.target === editModal) { editModal.hidden = true; loadMyProjects(); } });

editStatus.addEventListener('change', async () => {
  await supabase.from('projects').update({ status: editStatus.value }).eq('id', editingProjectId);
});

async function loadDeliverables(projectId) {
  const { data } = await supabase
    .from('project_deliverables')
    .select('id, step_number, step_name, content, file_urls, is_validated')
    .eq('project_id', projectId)
    .order('step_number');

  deliverablesEditList.innerHTML = '';

  (data || []).forEach(d => {
    const item = document.createElement('div');
    item.className = 'deliverable-edit-item';
    item.innerHTML = `
      <div class="deliverable-edit-header">
        <span class="step-title"><span class="step-num">${String(d.step_number).padStart(2, '0')}</span> ${escapeHtml(d.step_name)}</span>
        <span class="status-pill ${d.is_validated ? 'validated' : ''}">${d.is_validated ? 'Validé' : 'En attente'}</span>
      </div>
      <textarea rows="3" placeholder="Décris ce livrable...">${escapeHtml(d.content || '')}</textarea>
      <div class="file-row">
        <label class="file-upload-btn">
          📎 Ajouter un fichier
          <input type="file" hidden data-deliverable-id="${d.id}" data-project-id="${projectId}">
        </label>
        <span class="file-count">${(d.file_urls || []).length} fichier(s)</span>
        <button class="save-step-btn" data-deliverable-id="${d.id}">Enregistrer</button>
      </div>
    `;
    deliverablesEditList.appendChild(item);

    // Enregistrer le texte du livrable
    const saveBtn = item.querySelector('.save-step-btn');
    const textarea = item.querySelector('textarea');
    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = '...';
      await supabase.from('project_deliverables')
        .update({ content: textarea.value.trim() })
        .eq('id', d.id);
      saveBtn.textContent = 'Enregistré ✓';
      setTimeout(() => { saveBtn.textContent = 'Enregistrer'; }, 1800);
    });

    // Upload de fichier pour ce livrable
    const fileInput = item.querySelector('input[type="file"]');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const path = `${projectId}/step_${d.step_number}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file);

      if (uploadError) {
        alert('Erreur upload : ' + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
      const newFileUrls = [...(d.file_urls || []), urlData.publicUrl];

      await supabase.from('project_deliverables').update({ file_urls: newFileUrls }).eq('id', d.id);
      item.querySelector('.file-count').textContent = `${newFileUrls.length} fichier(s)`;
      d.file_urls = newFileUrls;
    });
  });
}

// ===================== LANCEMENT =====================
init();
