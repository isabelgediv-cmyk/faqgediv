
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGl48MRFhtfZLirpHIvW9ySawBxitDg0w5m6wHLqo4KnJTXUHd-M-OA1mr9gpl0whhonMwvw0cZojj/pub?gid=1686832610&single=true&output=csv";

let DATA = [];
let activeCategory = "";

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const faqList = document.getElementById("faqList");
const resultCount = document.getElementById("resultCount");
const sectionTitle = document.getElementById("sectionTitle");
const emptyState = document.getElementById("emptyState");
const clearFilter = document.getElementById("clearFilter");

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);
      cell = "";

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);

    if (row.some(value => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAnswer(text) {
  let formatted = escapeHtml(text);

  // Converte **texto** em negrito.
  formatted = formatted.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );

  // Transforma URLs completas em links clicáveis.
  formatted = formatted.replace(
    /https?:\/\/[^\s<]+/g,
    url => {
      let cleanUrl = url;
      let punctuation = "";

      while (/[.,;:!?)]$/.test(cleanUrl)) {
        punctuation = cleanUrl.slice(-1) + punctuation;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${punctuation}`;
    }
  );

  // Preserva as quebras de linha.
  return formatted.replace(/\r?\n/g, "<br>");
}

function loadCSV(text) {
  const rows = parseCSV(text);

  if (rows.length < 2) {
    throw new Error("A planilha não possui dados suficientes.");
  }

  const headers = rows[0].map(normalize);

  const categoriaIndex = headers.findIndex(
    h => h === "categoria"
  );

  const perguntaIndex = headers.findIndex(
    h => h === "pergunta"
  );

  const respostaIndex = headers.findIndex(
    h => h === "resposta"
  );

  if (
    categoriaIndex === -1 ||
    perguntaIndex === -1 ||
    respostaIndex === -1
  ) {
    throw new Error(
      "As colunas Categoria, Pergunta e Resposta não foram encontradas."
    );
  }

  return rows.slice(1)
    .map(row => ({
      categoria: (row[categoriaIndex] || "").trim(),
      pergunta: (row[perguntaIndex] || "").trim(),
      resposta: (row[respostaIndex] || "").trim()
    }))
    .filter(item => item.pergunta && item.resposta);
}

// Preenche o menu de categorias.
function renderCategories() {
  const categories = [
    ...new Set(
      DATA.map(item => item.categoria).filter(Boolean)
    )
  ];

  categorySelect.innerHTML = `
    <option value="">Selecione uma categoria</option>
    <option value="all">Todas as categorias</option>
    ${categories.map(category => `
      <option value="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </option>
    `).join("")}
  `;

  categorySelect.value = activeCategory;
}

// Filtra por categoria e palavra-chave.
function getFiltered() {
  const search = normalize(searchInput.value);

  return DATA.filter(item => {
    const matchesCategory =
      !activeCategory ||
      activeCategory === "all" ||
      item.categoria === activeCategory;

    const searchableText = normalize(
      `${item.categoria} ${item.pergunta} ${item.resposta}`
    );

    const matchesSearch =
      !search || searchableText.includes(search);

    return matchesCategory && matchesSearch;
  });
}

function render() {
  const search = searchInput.value.trim();

  clearFilter.hidden = !activeCategory && !search;

  // Estado inicial: aguarda a escolha do usuário.
  if (!activeCategory && !search) {
    sectionTitle.textContent = "Perguntas frequentes";
    resultCount.textContent = "";
    faqList.innerHTML = "";

    emptyState.innerHTML = `
      <h3>Por onde começar?</h3>
      <p>
        Selecione uma categoria no menu acima ou digite
        uma palavra-chave na busca para encontrar orientações.
      </p>
    `;

    emptyState.style.display = "block";
    return;
  }

  const filtered = getFiltered();

  resultCount.textContent =
    `${filtered.length} ${
      filtered.length === 1 ? "resultado" : "resultados"
    }`;

  if (search) {
    sectionTitle.textContent = "Resultados da busca";
  } else if (activeCategory === "all") {
    sectionTitle.textContent = "Todas as perguntas";
  } else {
    sectionTitle.textContent = activeCategory;
  }

  // Nenhum resultado encontrado.
  if (filtered.length === 0) {
    faqList.innerHTML = "";

    emptyState.innerHTML = `
      <h3>Nenhuma pergunta encontrada</h3>
      <p>
        Tente outro termo ou escolha uma categoria diferente.
      </p>
    `;

    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  // Mostra a categoria quando os resultados são gerais
  // ou foram encontrados por meio da busca.
  faqList.innerHTML = filtered.map(item => `
    <article class="faq-item">

      ${
        activeCategory === "all" || search
          ? `<div class="category-label">
               ${escapeHtml(item.categoria)}
             </div>`
          : ""
      }

      <button class="faq-question" aria-expanded="false">
        <span>${escapeHtml(item.pergunta)}</span>
        <span class="faq-icon">+</span>
      </button>

      <div class="faq-answer">
        <div class="faq-answer-content">
          ${formatAnswer(item.resposta)}
        </div>
      </div>

    </article>
  `).join("");

  // Controla a abertura e o fechamento das respostas.
  document.querySelectorAll(".faq-question").forEach(button => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const isOpen = item.classList.contains("open");

      document.querySelectorAll(".faq-item.open").forEach(openItem => {
        openItem.classList.remove("open");
        openItem
          .querySelector(".faq-question")
          .setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

// Limpa a busca e volta ao estado inicial.
function resetFilters() {
  activeCategory = "";
  categorySelect.value = "";
  searchInput.value = "";
  render();
}

// Carrega os dados da planilha publicada.
async function loadData() {
  try {
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error("Não foi possível acessar a planilha.");
    }

    const csv = await response.text();
    DATA = loadCSV(csv);

  } catch (error) {
    console.error(error);

    // Usa os dados locais se a planilha estiver indisponível.
    if (Array.isArray(window.FAQ_DATA)) {
      DATA = window.FAQ_DATA;
    } else {
      sectionTitle.textContent = "Perguntas frequentes";
      resultCount.textContent = "";
      faqList.innerHTML = "";

      emptyState.innerHTML = `
        <h3>Não foi possível carregar as orientações</h3>
        <p>
          Atualize a página e tente novamente.
        </p>
      `;

      emptyState.style.display = "block";
      return;
    }
  }

  renderCategories();
  render();
}

// Eventos da busca e do menu.
searchInput.addEventListener("input", render);

categorySelect.addEventListener("change", () => {
  activeCategory = categorySelect.value;
  render();
});

clearFilter.addEventListener("click", resetFilters);

loadData();
