// BASE TEMPORÁRIA
// Neste primeiro protótipo, os dados vêm de data.js.
// Depois podemos ligar este mesmo site diretamente ao Google Sheets.

const DATA = Array.isArray(window.FAQ_DATA) ? window.FAQ_DATA : [];

const searchInput = document.getElementById("searchInput");
const categoriesEl = document.getElementById("categories");
const faqList = document.getElementById("faqList");
const resultCount = document.getElementById("resultCount");
const sectionTitle = document.getElementById("sectionTitle");
const emptyState = document.getElementById("emptyState");
const clearFilter = document.getElementById("clearFilter");

let activeCategory = "Todas";

const categories = ["Todas", ...new Set(DATA.map(x => x.categoria).filter(Boolean))];

function renderCategories() {
  categoriesEl.innerHTML = categories.map(category => `
    <button class="category ${category === activeCategory ? "active" : ""}"
            data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  categoriesEl.querySelectorAll(".category").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderCategories();
      render();
    });
  });
}

function getFiltered() {
  const term = searchInput.value.trim().toLowerCase();

  return DATA.filter(item => {
    const categoryOk = activeCategory === "Todas" || item.categoria === activeCategory;
    const text = `${item.categoria} ${item.pergunta} ${item.resposta}`.toLowerCase();
    return categoryOk && (!term || text.includes(term));
  });
}

function render() {
  const items = getFiltered();

  sectionTitle.textContent =
    activeCategory === "Todas" ? "Perguntas frequentes" : activeCategory;

  resultCount.textContent = `${items.length} ${items.length === 1 ? "pergunta" : "perguntas"}`;
  clearFilter.hidden = activeCategory === "Todas" && !searchInput.value;

  faqList.innerHTML = items.map((item, index) => `
    <article class="faq-item" data-index="${index}">
      <button class="faq-question" aria-expanded="false">
        <span>
          <span class="category-label">${escapeHtml(item.categoria)}</span><br>
          ${escapeHtml(item.pergunta)}
        </span>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="faq-answer">${formatAnswer(item.resposta)}</div>
    </article>
  `).join("");

  faqList.querySelectorAll(".faq-question").forEach(button => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const open = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });

  emptyState.hidden = items.length !== 0;
}

function formatAnswer(value) {
  return escapeHtml(String(value || "")).replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchInput.addEventListener("input", render);

clearFilter.addEventListener("click", () => {
  activeCategory = "Todas";
  searchInput.value = "";
  renderCategories();
  render();
});

renderCategories();
render();
