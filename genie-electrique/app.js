// ===================== CONFIGURATION SUPABASE =====================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DISCIPLINE_SLUG = 'genie-electrique';

// ===================== ÉTAT LOCAL =====================
let allProjects = [];
let disciplineId = null;

// ===================== RÉFÉRENCES DOM =====================
const grid = document.getElementById('projects-grid');
const loadingMsg = document.getElementById('loading-msg');
const emptyMsg = document.getElementById('empty-msg');
const projectCount = document.getElementById('project-count');

const filterSchool = document.getElementById('filter-school');
const filterStructure = document.getElementById('filter-structure'); // ici : type de système
const filterSearch = document.getElementById('filter-search');

const modal = document.getElementById('project-modal');
const modalClose = document.getElementById('modal-close');

// ===================== CHARGEMENT INITIAL =====================
async function init() {
  const { data: discipline, error: discErr } = await supabase
    .from('disciplines')
    .select('id')
    .eq('slug', DISCIPLINE_SLUG)
    .single();

  if (discErr || !discipline) {
    showError("Impossible de charger la discipline Génie Électrique.");
    console.error(discErr);
    return;
  }
  disciplineId = discipline.id;

  const { data: schools } = await supabase.from('schools').select('id, name').order('name');
  if (schools) {
    schools.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      filterSchool.appendChild(opt);
    });
  }

  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select(`
      id, title, description, cover_image_url, created_at, school_id,
      schools ( name ),
      profiles!projects_owner_id_fkey ( full_name ),
      specs_electrique ( type_systeme, tension_v, puissance_kw, norme_appliquee, schema_unifilaire_url, fiche_composants_url )
    `)
    .eq('discipline_id', disciplineId)
    .eq('status', 'validated')
    .order('created_at', { ascending: false });

  if (projErr) {
    showError("Erreur de chargement des projets.");
    console.error(projErr);
    return;
  }

  allProjects = projects || [];
  loadingMsg.hidden = true;
  renderProjects(allProjects);
  updateCount(allProjects.length);
}

function showError(msg) {
  loadingMsg.hidden = true;
  emptyMsg.hidden = false;
  emptyMsg.textContent = msg;
}

function updateCount(n) {
  projectCount.textContent = `${n} projet${n > 1 ? 's' : ''} validé${n > 1 ? 's' : ''} — GÉNIE ÉLECTRIQUE`;
}

// ===================== AFFICHAGE DE LA GRILLE =====================
function renderProjects(list) {
  grid.querySelectorAll('.project-card').forEach(el => el.remove());

  if (list.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  list.forEach(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <img class="cover" src="${project.cover_image_url || ''}" alt="${escapeHtml(project.title)}" onerror="this.style.opacity=0">
      <div class="card-body">
        <span class="card-eyebrow">${project.schools?.name || 'École non renseignée'}</span>
        <h3>${escapeHtml(project.title)}</h3>
        <p class="card-desc">${escapeHtml(project.description || '')}</p>
        <div class="card-meta">
          <span>${project.specs_electrique?.[0]?.type_systeme || '—'}</span>
          <span>Voir le projet →</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(project));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===================== FILTRES =====================
function applyFilters() {
  const schoolVal = filterSchool.value;
  const structureVal = filterStructure.value;
  const searchVal = filterSearch.value.trim().toLowerCase();

  const filtered = allProjects.filter(p => {
    const matchSchool = !schoolVal || p.school_id === schoolVal;
    const matchStructure = !structureVal || p.specs_electrique?.[0]?.type_systeme === structureVal;
    const matchSearch = !searchVal || p.title.toLowerCase().includes(searchVal);
    return matchSchool && matchStructure && matchSearch;
  });

  renderProjects(filtered);
  updateCount(filtered.length);
}

filterSchool.addEventListener('change', applyFilters);
filterStructure.addEventListener('change', applyFilters);
filterSearch.addEventListener('input', applyFilters);

// ===================== MODALE DE DÉTAIL =====================
async function openModal(project) {
  document.getElementById('modal-cover').src = project.cover_image_url || '';
  document.getElementById('modal-school').textContent = project.schools?.name || '—';
  document.getElementById('modal-title').textContent = project.title;
  document.getElementById('modal-description').textContent = project.description || '';
  document.getElementById('modal-student').textContent = project.profiles?.full_name || 'Non renseigné';

  const spec = project.specs_electrique?.[0] || {};
  document.getElementById('spec-type-systeme').textContent = spec.type_systeme || '—';
  document.getElementById('spec-tension').textContent = spec.tension_v ? `${spec.tension_v} V` : '—';
  document.getElementById('spec-puissance').textContent = spec.puissance_kw ? `${spec.puissance_kw} kW` : '—';
  document.getElementById('spec-norme').textContent = spec.norme_appliquee || '—';

  const schemaLink = document.getElementById('spec-schema-link');
  if (spec.schema_unifilaire_url) {
    schemaLink.href = spec.schema_unifilaire_url;
    schemaLink.style.opacity = '1';
  } else {
    schemaLink.removeAttribute('href');
    schemaLink.style.opacity = '0.4';
  }

  const ficheLink = document.getElementById('spec-fiche-link');
  if (spec.fiche_composants_url) {
    ficheLink.href = spec.fiche_composants_url;
    ficheLink.style.opacity = '1';
  } else {
    ficheLink.removeAttribute('href');
    ficheLink.style.opacity = '0.4';
  }

  const { data: deliverables } = await supabase
    .from('project_deliverables')
    .select('step_number, step_name, is_validated, profiles ( full_name )')
    .eq('project_id', project.id)
    .order('step_number');

  const validatedBy = (deliverables || []).find(d => d.is_validated && d.profiles?.full_name);
  document.getElementById('modal-validator').textContent = validatedBy?.profiles?.full_name || 'Pas encore validé';

  const list = document.getElementById('deliverables-list');
  list.innerHTML = '';
  (deliverables || []).forEach(d => {
    const li = document.createElement('li');
    li.className = 'deliverable-item';
    li.innerHTML = `
      <span class="step-name"><span class="step-num">${String(d.step_number).padStart(2, '0')}</span> ${escapeHtml(d.step_name)}</span>
      <span class="status ${d.is_validated ? 'validated' : 'pending'}">${d.is_validated ? 'Validé' : 'En attente'}</span>
    `;
    list.appendChild(li);
  });

  modal.hidden = false;
}

modalClose.addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

// ===================== LANCEMENT =====================
init();
