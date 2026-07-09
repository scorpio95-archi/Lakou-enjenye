 <script type="module">
  // ===================== CONFIGURATION SUPABASE =====================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bblhqjdymssqhfbwoxie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7PbAzInao2xZLI85BP42XA_nAlnxcQL';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DISCIPLINE_SLUG = 'genie-civil';

// ===================== ÉTAT LOCAL =====================
let allProjects = [];   // tous les projets validés chargés une fois
let disciplineId = null;

// ===================== RÉFÉRENCES DOM =====================
const grid = document.getElementById('projects-grid');
const loadingMsg = document.getElementById('loading-msg');
const emptyMsg = document.getElementById('empty-msg');
const projectCount = document.getElementById('project-count');

const filterSchool = document.getElementById('filter-school');
const filterStructure = document.getElementById('filter-structure');
const filterSearch = document.getElementById('filter-search');

const modal = document.getElementById('project-modal');
const modalClose = document.getElementById('modal-close');

// ===================== CHARGEMENT INITIAL =====================
async function init() {
  // 1. Récupérer l'ID de la discipline "Génie Civil"
  const { data: discipline, error: discErr } = await supabase
    .from('disciplines')
    .select('id')
    .eq('slug', DISCIPLINE_SLUG)
    .single();

  if (discErr || !discipline) {
    showError("Impossible de charger la discipline Génie Civil.");
    console.error(discErr);
    return;
  }
  disciplineId = discipline.id;

  // 2. Charger les écoles pour remplir le filtre
  const { data: schools } = await supabase.from('schools').select('id, name').order('name');
  if (schools) {
    schools.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      filterSchool.appendChild(opt);
    });
  }

  // 3. Charger les projets validés de cette discipline, avec leurs specs civil jointes
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select(`
      id, title, description, cover_image_url, created_at, school_id,
      schools ( name ),
      profiles!projects_owner_id_fkey ( full_name ),
      specs_civil ( type_structure, charge_admissible_kn, resistance_sol_kpa, surface_m2, norme_appliquee, plan_url )
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
  projectCount.textContent = `${n} projet${n > 1 ? 's' : ''} validé${n > 1 ? 's' : ''} — GÉNIE CIVIL`;
}

// ===================== AFFICHAGE DE LA GRILLE =====================
function renderProjects(list) {
  // Nettoyer la grille (sauf les messages)
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
          <span>${project.specs_civil?.[0]?.type_structure || '—'}</span>
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
    const matchStructure = !structureVal || p.specs_civil?.[0]?.type_structure === structureVal;
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

  const spec = project.specs_civil?.[0] || {};
  document.getElementById('spec-type-structure').textContent = spec.type_structure || '—';
  document.getElementById('spec-charge').textContent = spec.charge_admissible_kn ? `${spec.charge_admissible_kn} kN` : '—';
  document.getElementById('spec-resistance-sol').textContent = spec.resistance_sol_kpa ? `${spec.resistance_sol_kpa} kPa` : '—';
  document.getElementById('spec-surface').textContent = spec.surface_m2 ? `${spec.surface_m2} m²` : '—';
  document.getElementById('spec-norme').textContent = spec.norme_appliquee || '—';

  const planLink = document.getElementById('spec-plan-link');
  if (spec.plan_url) {
    planLink.href = spec.plan_url;
    planLink.style.pointerEvents = 'auto';
    planLink.style.opacity = '1';
  } else {
    planLink.removeAttribute('href');
    planLink.style.opacity = '0.4';
  }

  // Charger les livrables de ce projet (avec le nom du prof qui a validé, si applicable)
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
  
 // ===================== MENU GLOBAL — LAKOU ENJENYÈ =====================
// À coller dans /shared/nav.js — chargé par <script src="/shared/nav.js" defer> sur chaque page

(function () {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const disciplinesTrigger = document.getElementById('disciplines-trigger');
  const disciplinesMenu = document.getElementById('disciplines-menu');

  // ----- Hamburger mobile -----
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });
  }

  // ----- Dropdown Disciplines -----
  if (disciplinesTrigger && disciplinesMenu) {
    disciplinesTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = disciplinesMenu.classList.toggle('open');
      disciplinesTrigger.setAttribute('aria-expanded', isOpen);
    });

    // Fermer le dropdown si on clique ailleurs sur la page
    document.addEventListener('click', (e) => {
      if (!disciplinesMenu.contains(e.target) && e.target !== disciplinesTrigger) {
        disciplinesMenu.classList.remove('open');
        disciplinesTrigger.setAttribute('aria-expanded', 'false');
      }
    });
     // Fermer le dropdown après avoir cliqué sur un lien de discipline
    disciplinesMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        disciplinesMenu.classList.remove('open');
        disciplinesTrigger.setAttribute('aria-expanded', 'false');
        if (links.classList.contains('open')) {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // ----- Fermer le menu mobile si on redimensionne vers desktop -----
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780 && links.classList.contains('open')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ----- Marquer le lien de la page courante comme actif -----
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link[href]').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.style.color = 'var(--cyan, #4fd1c5)';
    }
  });

  // ----- NOTE POUR PLUS TARD (branché avec l'authentification) -----
  // - vérifier la session Supabase (supabase.auth.getSession())
  // - si connecté :
  //     - retirer "hidden" sur #nav-settings-link
  //     - remplacer #nav-auth-zone (Connexion/Inscription) par "Bonjour {prénom}" + "Tableau de bord" + "Déconnexion"
  // - si non connecté : garder l'état actuel (Connexion + Inscription visibles, Paramètres caché)
})();

