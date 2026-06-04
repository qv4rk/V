import './style.css';
import data from './data.json';

const app = document.getElementById('app');

// ----- Theme Toggle -----
const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
};

const createThemeToggle = () => {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  const current = localStorage.getItem('theme') || 'light';
  btn.textContent = current === 'dark' ? '☀️ Light' : '🌙 Dark';
  btn.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    btn.textContent = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
  });
  return btn;
};

// ----- Navigation -----
const createNav = () => {
  const nav = document.createElement('nav');
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = '🧬 Metabolic Science';
  nav.appendChild(logo);
  nav.appendChild(createThemeToggle());
  return nav;
};

// ----- Accordion Sections -----
const createSection = (section) => {
  const container = document.createElement('div');
  container.className = 'accordion';
  container.id = section.id;

  const header = document.createElement('div');
  header.className = 'accordion-header';
  header.textContent = section.title;

  const body = document.createElement('div');
  body.className = 'accordion-body';
  const inner = document.createElement('div');
  inner.className = 'content-inner';

  // Main paragraph
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = section.content;
  inner.appendChild(contentDiv);

  // Bullets
  if (section.bullets && section.bullets.length) {
    const ul = document.createElement('ul');
    ul.className = 'bullet-list';
    section.bullets.forEach(b => {
      const li = document.createElement('li');
      li.innerHTML = `<h4>${b.title}</h4><p>${b.text}</p>`;
      ul.appendChild(li);
    });
    inner.appendChild(ul);
  }

  body.appendChild(inner);
  container.appendChild(header);
  container.appendChild(body);

  header.addEventListener('click', () => {
    container.classList.toggle('active');
  });

  return container;
};

// ----- References -----
const createReferenceSearch = () => {
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'search-box';
  searchInput.placeholder = 'Search references by author, title, or source...';
  return searchInput;
};

const createReferenceList = (references) => {
  const container = document.createElement('div');

  references.forEach(category => {
    const catDiv = document.createElement('div');
    catDiv.className = 'ref-category';
    const heading = document.createElement('h3');
    heading.textContent = category.category;
    catDiv.appendChild(heading);

    const ul = document.createElement('ul');
    ul.className = 'ref-list';

    category.items.forEach(item => {
      const li = document.createElement('li');
      li.setAttribute('data-ref-citation', item.citation.toLowerCase());
      li.setAttribute('data-ref-source', item.source.toLowerCase());
      li.innerHTML = `${item.citation} <a href="${item.link}" target="_blank" rel="noopener noreferrer">[${item.source}]</a>`;
      ul.appendChild(li);
    });

    catDiv.appendChild(ul);
    container.appendChild(catDiv);
  });

  return container;
};

// ----- Main build -----
const buildApp = () => {
  app.innerHTML = '';

  // Navigation
  app.appendChild(createNav());

  // Title & intro
  const titleEl = document.createElement('h1');
  titleEl.textContent = data.title;
  const introEl = document.createElement('p');
  introEl.className = 'intro-text';
  introEl.textContent = data.intro;

  app.appendChild(titleEl);
  app.appendChild(introEl);

  // Sections
  data.sections.forEach(section => {
    app.appendChild(createSection(section));
  });

  // References heading
  const refSection = document.createElement('div');
  refSection.className = 'references-section';
  const refHeading = document.createElement('h2');
  refHeading.textContent = 'References';
  refSection.appendChild(refHeading);

  const searchBox = createReferenceSearch();
  refSection.appendChild(searchBox);

  const refListContainer = createReferenceList(data.references);
  refSection.appendChild(refListContainer);
  app.appendChild(refSection);

  // Search functionality
  searchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allRefs = document.querySelectorAll('[data-ref-citation]');
    
    allRefs.forEach(li => {
      const citationText = li.getAttribute('data-ref-citation');
      const sourceText = li.getAttribute('data-ref-source');
      if (query === '') {
        li.classList.remove('hidden-ref');
      } else {
        if (citationText.includes(query) || sourceText.includes(query)) {
          li.classList.remove('hidden-ref');
        } else {
          li.classList.add('hidden-ref');
        }
      }
    });

    // Hide empty categories
    document.querySelectorAll('.ref-category').forEach(cat => {
      const visibleItems = cat.querySelectorAll('li:not(.hidden-ref)');
      if (visibleItems.length === 0) {
        cat.style.display = 'none';
      } else {
        cat.style.display = '';
      }
    });
  });

  // Open first accordion by default
  const firstAccordion = document.querySelector('.accordion');
  if (firstAccordion) firstAccordion.classList.add('active');
};

// Start
initTheme();
buildApp();
