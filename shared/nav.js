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
