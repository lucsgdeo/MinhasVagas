const STORAGE_KEY = 'minhasvagas_applied';
const THEME_STORAGE_KEY = 'minhasvagas_theme';
const MODE_STORAGE_KEY = 'minhasvagas_mode';

// Aba "Últimos 2 dias": vagas publicadas hoje ou ontem (dias do calendário,
// no fuso horário local do navegador) e sem candidatura registrada.
const ROTULO_JANELA_RECENTE = 'hoje e ontem';

// As cores disponíveis no dropdown. `cor` é o que o botão mostra e precisa
// bater com `--tema-primary` de `[data-theme="..."]` em styles.css — é a única
// parte do tema que o JS precisa conhecer. Cada tema define ainda uma variante
// escura e um preenchimento, mas o botão mostra sempre a clara, que é a cor da
// família: é o que faz o usuário reconhecer o tema.
const CORES = [
    { id: 'red', nome: 'Vermelho', cor: '#dc0202' },
    { id: 'crimson', nome: 'Carmim', cor: '#ba022f' },
    { id: 'rose', nome: 'Rosa', cor: '#da0227' },
    { id: 'pink', nome: 'Fúcsia', cor: '#d70261' },
    { id: 'fuchsia', nome: 'Magenta', cor: '#ba05d0' },
    { id: 'purple', nome: 'Roxo', cor: '#8d11fd' },
    { id: 'violet', nome: 'Violeta', cor: '#7525fd' },
    { id: 'indigo', nome: 'Índigo', cor: '#3a2efd' },
    { id: 'blue', nome: 'Azul', cor: '#0e59fd' },
    { id: 'sky', nome: 'Azul-céu', cor: '#0273ae' },
    { id: 'navy', nome: 'Marinho', cor: '#09309f' },
    { id: 'cyan', nome: 'Ciano', cor: '#027895' },
    { id: 'teal', nome: 'Verde-azulado', cor: '#017c71' },
    { id: 'emerald', nome: 'Esmeralda', cor: '#018059' },
    { id: 'green', nome: 'Verde', cor: '#018030' },
    { id: 'lime', nome: 'Verde-limão', cor: '#437501' },
    { id: 'amber', nome: 'Âmbar', cor: '#a55902' },
    { id: 'orange', nome: 'Laranja', cor: '#c14302' },
    { id: 'brown', nome: 'Marrom', cor: '#8f3701' },
    { id: 'slate', nome: 'Ardosia', cor: '#484f58' },
    { id: 'zinc', nome: 'Zinco', cor: '#4d4d5b' },
    { id: 'stone', nome: 'Pedra', cor: '#776b63' }
];

const state = {
    techVagas: [],
    geralVagas: [],
    descartadasVagas: [],
    currentTab: 'tech',
    currentSubTab: 'recentes', // padrão: abre em "Últimos 2 dias" (hoje + ontem, sem candidatura)
    // Padrão: "Todas", que é tudo de tecnologia menos estágio. É o primeiro
    // botão e o que abre a página — o resto do agrupamento é para quando se quer
    // afinar por área.
    currentTechFilter: 'todas',
    // ABC primeiro: é o botão padrão e o lugar onde a pessoa quer trabalhar.
    currentGeralFilter: 'abc',
    currentScheduleFilter: 'suporte',
    // Na aba de descartadas nenhum filtro começa ativo, para a lista abrir
    // mostrando tudo. Clicar num deles filtra; clicar de novo limpa.
    currentDescartadasFilter: null,
    searchTerm: '',
    appliedIds: new Set(),
    // Instantâneos fixados no carregamento da página.
    // A aba "Últimos 2 dias" filtra por estes valores para que a lista só
    // mude ao recarregar a página (nunca durante a sessão).
    appliedAtLoad: new Set(),
    janelaRecente: null,
    currentTheme: 'red',
    currentMode: 'light',
    // Índice id -> vaga das três listas, para o painel de descrição não
    // depender do card (que é recriado a cada filtro).
    vagasPorId: new Map(),
    // Mapa id -> seções, baixado de `descricoes.json` só no primeiro clique
    // em "Ver descrição" (o arquivo pesa ~380 KB e não é necessário para listar).
    descricoes: null,
    descricoesPromise: null,
    descricaoAbertaId: null
};

let els = {};

function init() {
    els = {
        tabTech: document.getElementById('tab-tech'),
        tabGeral: document.getElementById('tab-geral'),
        tabSchedule: document.getElementById('tab-schedule'),
        tabDescartadas: document.getElementById('tab-descartadas'),
        subTabs: document.getElementById('subtabs'),
        subTabBtns: document.querySelectorAll('.subtab-btn'),
        searchInput: document.getElementById('search-input'),
        techFilterPillsContainer: document.getElementById('tech-filter-pills'),
        geralFilterPillsContainer: document.getElementById('geral-filter-pills'),
        techFilterPills: document.querySelectorAll('#tech-filter-pills .filter-pill'),
        geralFilterPills: document.querySelectorAll('#geral-filter-pills .filter-pill'),
        descartadasFilterPills: document.querySelectorAll('#descartadas-filter-pills .filter-pill'),
        descartadasFilters: document.getElementById('descartadas-filters'),
        descartadasCount: document.getElementById('descartadas-count'),
        scheduleFilterPills: document.querySelectorAll('#schedule-filter-pills .filter-pill'),
        themeToggle: document.getElementById('theme-toggle'),
        themeMenu: document.getElementById('theme-menu'),
        themeOptions: document.getElementById('theme-options'),
        modeToggle: document.getElementById('mode-toggle'),
        vacanciesGrid: document.getElementById('vacancies-grid'),
        scheduleContainer: document.getElementById('schedule-container'),
        scheduleBars: document.getElementById('schedule-bars'),
        scheduleSummary: document.getElementById('schedule-summary'),
        filtersContainer: document.getElementById('filters-container'),
        scheduleFiltersContainer: document.getElementById('schedule-filters-container'),
        emptyState: document.getElementById('empty-state'),
        emptyTitle: document.querySelector('#empty-state .empty-title'),
        emptyText: document.querySelector('#empty-state .empty-text'),
        loading: document.getElementById('loading'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        retryBtn: document.getElementById('retry-btn'),
        stats: document.getElementById('stats'),
        statTotal: document.getElementById('stat-total'),
        descBackdrop: document.getElementById('desc-backdrop'),
        descDrawer: document.getElementById('desc-drawer'),
        descDrawerTitle: document.getElementById('desc-drawer-title'),
        descDrawerSubtitle: document.getElementById('desc-drawer-subtitle'),
        descDrawerBody: document.getElementById('desc-drawer-body'),
        descDrawerApply: document.getElementById('desc-drawer-apply'),
        descDrawerClose: document.getElementById('desc-drawer-close'),
        descricaoAbertaBotao: null,
        footerTech: document.getElementById('footer-tech'),
        footerGeral: document.getElementById('footer-geral'),
        footerDescartadas: document.getElementById('footer-descartadas')
    };

    buildThemeOptions();
    loadThemeFromStorage();
    loadModeFromStorage();
    loadAppliedFromStorage();
    loadVagas();
    setupEventListeners();
}

function setupEventListeners() {
    if (els.tabTech) els.tabTech.addEventListener('click', () => switchTab('tech'));
    if (els.tabGeral) els.tabGeral.addEventListener('click', () => switchTab('geral'));
    if (els.tabSchedule) els.tabSchedule.addEventListener('click', () => switchTab('schedule'));
    if (els.tabDescartadas) els.tabDescartadas.addEventListener('click', () => switchTab('descartadas'));

    els.subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
    });

    if (els.searchInput) {
        els.searchInput.addEventListener('input', (e) => {
            state.searchTerm = e.target.value.toLowerCase();
            if (state.currentTab !== 'schedule') renderVagas();
        });
    }

    els.techFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.techFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentTechFilter = pill.dataset.filter;
            renderVagas();
        });
    });

    els.geralFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.geralFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentGeralFilter = pill.dataset.filter;
            renderVagas();
        });
    });

    // Filtros de descarte: clicar no mesmo botão de novo limpa o filtro. Não há
    // botão "Todas" nessa lista (sem ele a aba seria vazia por definição), então
    // o estado sem filtro é o que mostra tudo.
    els.descartadasFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const filtro = pill.dataset.filter;
            const jaAtivo = state.currentDescartadasFilter === filtro;
            els.descartadasFilterPills.forEach(p => p.classList.remove('active'));
            if (jaAtivo) {
                state.currentDescartadasFilter = null;
            } else {
                pill.classList.add('active');
                state.currentDescartadasFilter = filtro;
            }
            renderVagas();
        });
    });

    els.scheduleFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.scheduleFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentScheduleFilter = pill.dataset.filter;
            renderSchedule();
        });
    });

    if (els.retryBtn) els.retryBtn.addEventListener('click', loadVagas);

    if (els.vacanciesGrid) {
        els.vacanciesGrid.addEventListener('change', (e) => {
            if (e.target.matches('.apply-toggle input')) {
                const vagaId = e.target.dataset.vagaId;
                toggleApplied(vagaId, e.target.checked);
            }
        });

        els.vacanciesGrid.addEventListener('click', (e) => {
            if (e.target.closest('.desc-btn')) {
                abrirDescricao(e.target.closest('.desc-btn').dataset.vagaId, e.target.closest('.desc-btn'));
                return;
            }

            if (e.target.closest('.apply-btn')) {
                const link = e.target.closest('.apply-btn');
                const vagaId = link.dataset.vagaId;
                if (vagaId && !state.appliedIds.has(vagaId)) {
                    toggleApplied(vagaId, true);
                    const checkbox = document.querySelector(`.apply-toggle input[data-vaga-id="${vagaId}"]`);
                    if (checkbox) checkbox.checked = true;
                }
            }
        });
    }

    // Painel de descrição: fecha no botão, no clique fora e no Esc.
    if (els.descDrawerClose) els.descDrawerClose.addEventListener('click', fecharDescricao);
    if (els.descBackdrop) els.descBackdrop.addEventListener('click', fecharDescricao);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // O Esc fecha o que estiver aberto, do mais raso pro mais fundo.
            if (!els.themeMenu.hidden) fecharMenuTema();
            else if (state.descricaoAbertaId) fecharDescricao();
        }
    });

    // Dropdown de tema: abre/fecha, fecha no clique fora e escolhe cor.
    if (els.themeToggle) {
        els.themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            alternarMenuTema();
        });
    }
    if (els.themeMenu) {
        els.themeMenu.addEventListener('click', (e) => e.stopPropagation());
    }
    if (els.modeToggle) {
        els.modeToggle.addEventListener('click', () => setMode(state.currentMode === 'dark' ? 'light' : 'dark'));
    }
    document.addEventListener('click', () => fecharMenuTema());

    // A grade de cores é montada em `buildThemeOptions`, então este listener vai
    // no container e não em cada botão: delegar funciona para as cores que ainda
    // não existem no momento do bind.
    if (els.themeOptions) {
        els.themeOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (option) setTheme(option.dataset.theme);
        });
    }
}

// Monta a grade de cores do dropdown a partir de `CORES`.
function buildThemeOptions() {
    if (!els.themeOptions) return;
    els.themeOptions.innerHTML = CORES.map(c => `
        <button type="button" class="theme-option${c.id === state.currentTheme ? ' active' : ''}"
                data-theme="${escapeHtml(c.id)}" style="background: ${c.cor};"
                aria-label="${escapeHtml(c.nome)}" title="${escapeHtml(c.nome)}"></button>
    `).join('');
}

function alternarMenuTema() {
    if (!els.themeMenu) return;
    els.themeMenu.hidden = !els.themeMenu.hidden;
    els.themeToggle.setAttribute('aria-expanded', els.themeMenu.hidden ? 'false' : 'true');
}

function fecharMenuTema() {
    if (!els.themeMenu || els.themeMenu.hidden) return;
    els.themeMenu.hidden = true;
    if (els.themeToggle) els.themeToggle.setAttribute('aria-expanded', 'false');
}

function loadAppliedFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const ids = JSON.parse(stored);
            // Normaliza para string: os ids podem vir como número do JSON
            state.appliedIds = new Set(Array.isArray(ids) ? ids.map(String) : []);
        }
    } catch (e) {
        console.warn('Erro ao ler localStorage:', e);
    }

    // Congela o estado das candidaturas e a janela "hoje + ontem" neste momento:
    // marcar "Vista" durante a sessão não deve remover a vaga da aba
    // "Últimos 2 dias". O filtro só é recalculado no próximo carregamento.
    state.appliedAtLoad = new Set(state.appliedIds);
    state.janelaRecente = calcularJanelaRecente(Date.now());
}

function loadThemeFromStorage() {
    let stored = null;
    try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
        console.warn('Erro ao ler tema do localStorage:', e);
    }
    // Uma cor salva que não existe mais em `CORES` deixaria a página sem
    // `--tema-primary` (o atributo aponta para um bloco que não está no CSS).
    // Cai no primeiro tema em vez disso.
    const valida = CORES.some(c => c.id === stored);
    setTheme(valida ? stored : 'red', { persistir: false });
}

function saveThemeToStorage() {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, state.currentTheme);
    } catch (e) {
        console.warn('Erro ao salvar tema no localStorage:', e);
    }
}

function setTheme(theme, opcoes = {}) {
    state.currentTheme = theme;
    applyTheme(theme);
    updateThemeOptions(theme);
    if (opcoes.persistir !== false) saveThemeToStorage();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

// Modo claro/escuro. Vive em `data-mode` no `<html>`, separado do `data-theme`
// da cor — são eixos independentes: 22 cores × 2 modos. Misturar os dois em
// um único atributo exigiria duplicar cada tema no CSS.
function loadModeFromStorage() {
    let modo = null;
    try {
        modo = localStorage.getItem(MODE_STORAGE_KEY);
    } catch (e) {
        console.warn('Erro ao ler modo do localStorage:', e);
    }
    // Sem preferência salva, segue o sistema. Uma vez escolhido, o vale do
    // usuário manda e o sistema não mais mexe: ele muda de tema ao amanhecer
    // e isso viraria uma troca de tema sozinha, sem ninguém pedir.
    if (modo !== 'dark' && modo !== 'light') {
        modo = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }
    setMode(modo, { persistir: false });
}

function saveModeToStorage() {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, state.currentMode);
    } catch (e) {
        console.warn('Erro ao salvar modo no localStorage:', e);
    }
}

function setMode(modo, opcoes = {}) {
    state.currentMode = modo === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mode', state.currentMode);
    if (els.modeToggle) {
        const escuro = state.currentMode === 'dark';
        els.modeToggle.setAttribute('aria-checked', escuro ? 'true' : 'false');
        const icone = els.modeToggle.querySelector('.mode-toggle-icon');
        // O ícone mostra o estado atual, então mostra o sol quando está escuro.
        // As duas classes são alternadas sempre, e não só a lua: o desenho vem
        // da máscara do CSS, e um ícone sem classe nenhuma ficaria invisível.
        if (icone) {
            icone.classList.toggle('moon', !escuro);
            icone.classList.toggle('sun', escuro);
        }
        const texto = els.modeToggle.querySelector('.mode-toggle-text');
        if (texto) texto.textContent = escuro ? 'Modo claro' : 'Modo escuro';
    }
    if (opcoes.persistir !== false) saveModeToStorage();
}

function updateThemeOptions(activeTheme) {
    if (!els.themeOptions) return;
    els.themeOptions.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === activeTheme);
    });
}

function saveAppliedToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.appliedIds]));
    } catch (e) {
        console.warn('Erro ao salvar localStorage:', e);
    }
}

function toggleApplied(vagaId, applied) {
    if (applied) {
        state.appliedIds.add(vagaId);
    } else {
        state.appliedIds.delete(vagaId);
    }
    saveAppliedToStorage();
    updateCardAppliedState(vagaId, applied);
}

function updateCardAppliedState(vagaId, applied) {
    const card = document.querySelector(`.vacancy-card[data-vaga-id="${vagaId}"]`);
    if (card) {
        card.classList.toggle('applied', applied);
    }
}

function switchSubTab(subTab) {
    state.currentSubTab = subTab;

    els.subTabBtns.forEach(btn => {
        const isActive = btn.dataset.subtab === subTab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    renderVagas();
}

function switchTab(tab) {
    state.currentTab = tab;

    [els.tabTech, els.tabGeral, els.tabSchedule, els.tabDescartadas].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
    }

    const isSchedule = tab === 'schedule';
    const isTech = tab === 'tech';
    const isGeral = tab === 'geral';
    const isDescartadas = tab === 'descartadas';

    els.vacanciesGrid.classList.toggle('hidden', isSchedule);
    els.scheduleContainer.classList.toggle('hidden', !isSchedule);
    els.stats.classList.toggle('hidden', isSchedule);
    els.emptyState.classList.add('hidden');
    // Na auditoria o container de filtros continua visível — só os dois grupos
    // de botões de área saem, porque nenhum deles é o filtro certo lá. O que
    // fica é o campo de busca, que faz sentido em qualquer aba. Os filtros
    // próprios da auditoria são os de tech sem "Todas".
    els.filtersContainer.classList.toggle('hidden', isSchedule);
    els.descartadasFilters.classList.toggle('hidden', !isDescartadas);
    els.scheduleFiltersContainer.classList.toggle('hidden', !isSchedule);
    // As sub-abas são de período e de "vista", que não existem na auditoria.
    if (els.subTabs) els.subTabs.classList.toggle('hidden', isSchedule || isDescartadas);

    if (els.techFilterPillsContainer) els.techFilterPillsContainer.classList.toggle('hidden', !isTech);
    if (els.geralFilterPillsContainer) els.geralFilterPillsContainer.classList.toggle('hidden', !isGeral);

    els.searchInput.value = '';
    state.searchTerm = '';

    if (isSchedule) {
        renderSchedule();
    } else {
        renderVagas();
    }
}

async function loadVagas() {
    showLoading(true);
    hideError();
    hideEmpty();

    try {
        // A auditoria entra no mesmo `allSettled`: o arquivo ainda não existe
        // em quem rodou o programa antes desta mudança, e um 404 ali não pode
        // derrubar as duas listas que são o essencial.
        const [resTech, resGeral, resDescartadas] = await Promise.allSettled([
            fetch('data/vagas_recentes.json'),
            fetch('data/vagas_gerais.json'),
            fetch('data/vagas_descartadas.json')
        ]);

        state.techVagas = await lerVagas(resTech);
        state.geralVagas = await lerVagas(resGeral);
        state.descartadasVagas = await lerVagas(resDescartadas);

        if (state.currentTab === 'schedule') {
            renderSchedule();
        } else {
            renderVagas();
        }

        atualizarContadoresFooter();
        indexarVagas();
    } catch (err) {
        console.error('Erro ao carregar vagas:', err);
        showError(`Não foi possível carregar as vagas: ${err.message}`);
    } finally {
        showLoading(false);
    }
}

// Uma resposta ausente ou quebrada vale lista vazia: cada aba é independente e
// um erro em uma não pode apagar as outras.
async function lerVagas(resultado) {
    if (resultado.status !== 'fulfilled' || !resultado.value.ok) return [];
    try {
        const dados = await resultado.value.json();
        return Array.isArray(dados) ? dados : [];
    } catch (err) {
        console.warn('Não foi possível ler um dos arquivos de vagas:', err);
        return [];
    }
}

// Os números do footer e o contador do botão de auditoria. Vêm do tamanho das
// listas já carregadas — é a contagem do que está em tela hoje, com a retenção
// de 7 dias já aplicada.
function atualizarContadoresFooter() {
    const formatar = n => n.toLocaleString('pt-BR');
    if (els.descartadasCount) els.descartadasCount.textContent = formatar(state.descartadasVagas.length);
    if (els.footerTech) els.footerTech.textContent = formatar(state.techVagas.length);
    if (els.footerGeral) els.footerGeral.textContent = formatar(state.geralVagas.length);
    if (els.footerDescartadas) els.footerDescartadas.textContent = formatar(state.descartadasVagas.length);
}

// Índice id -> vaga, usado pelo painel de descrição para não depender do card.
// As descartadas entram também: é o que permite abrir a descrição de uma vaga
// que foi para a auditoria mas ainda está no histórico.
function indexarVagas() {
    state.vagasPorId = new Map();
    [...state.techVagas, ...state.geralVagas, ...state.descartadasVagas].forEach(vaga => {
        state.vagasPorId.set(String(vaga.id || ''), vaga);
    });
}

function isVagaRemota(vaga) {
    const modalidade = (vaga.workplaceType || '').toLowerCase();
    const topic = (vaga.topic || '').toLowerCase();
    return modalidade === 'remote' || modalidade === 'remoto' || topic.includes('remoto');
}

// A aba "Vagas Tech" tem dois grupos de botões: a lista de vagas e o gráfico de
// "Horários de Postagem". Os dois filtram pelas mesmas áreas, então o `switch`
// vive aqui — duplicado, os dois começariam a divergir na primeira área nova.
//
// `todas` é a exceção que precisa de um nome: em "Vagas Tech" o botão "Todas"
// significa "tudo menos estágio", porque estágio tem botão próprio e chega por
// busca por radical (traz RH, jurídico, pedagogia). Excluir pelo rótulo é o que
// separa os dois conjuntos; o "todas" do gráfico já usava o mesmo sentido.
function passaNoFiltroTech(vaga, filtro) {
    const topic = (vaga.topic || '').toLowerCase();
    const ehEstagio = topic.includes('estágio') || topic.includes('estagio');
    switch (filtro) {
        case 'todas': return !ehEstagio;
        case 'suporte': return topic.includes('suporte');
        case 'estagio': return ehEstagio;
        // O botão "Dev" engloba também as vagas de sistemas.
        case 'dev': return topic.includes('desenvolvimento') || topic.includes('sistemas');
        case 'ti': return topic.includes('ti');
        case 'outras': return topic.startsWith('outras');
        default: return true;
    }
}

function getPublishedTimestamp(vaga) {
    const raw = vaga && vaga.publishedDate;
    if (!raw) return null;
    const ts = Date.parse(String(raw));
    return Number.isNaN(ts) ? null : ts;
}

function inicioDoDiaLocal(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Janela "hoje + ontem": do início de ontem até o início de amanhã.
// Usa dias do calendário no fuso local do navegador (mesma referência das datas
// exibidas no card) e setDate() para não quebrar em horário de verão.
function calcularJanelaRecente(refTs) {
    const inicioOntem = inicioDoDiaLocal(refTs);
    inicioOntem.setDate(inicioOntem.getDate() - 1);

    const inicioAmanha = inicioDoDiaLocal(refTs);
    inicioAmanha.setDate(inicioAmanha.getDate() + 1);

    return { inicio: inicioOntem.getTime(), fim: inicioAmanha.getTime() };
}

// Aba "Últimos 2 dias": publicada hoje ou ontem e sem candidatura registrada
// no carregamento da página (snapshot em `state.appliedAtLoad`).
function isVagaRecenteSemCandidatura(vaga) {
    const ts = getPublishedTimestamp(vaga);
    if (ts === null) return false;

    const janela = state.janelaRecente || calcularJanelaRecente(Date.now());
    if (ts < janela.inicio || ts >= janela.fim) return false;

    return isVagaNaoCandidata(vaga);
}

// Aba "Não candidatadas": mesmo conjunto da aba "Todas", sem as candidaturas
// registradas no carregamento da página (snapshot em `state.appliedAtLoad`).
function isVagaNaoCandidata(vaga) {
    return !state.appliedAtLoad.has(String(vaga.id || ''));
}

function ordenarPorDataDecrescente(vagas) {
    return [...vagas].sort((a, b) => {
        const tsA = getPublishedTimestamp(a) || 0;
        const tsB = getPublishedTimestamp(b) || 0;
        return tsB - tsA;
    });
}

function aplicarFiltroSubTab(vagas) {
    if (state.currentSubTab === 'recentes') {
        return ordenarPorDataDecrescente(vagas.filter(isVagaRecenteSemCandidatura));
    }

    if (state.currentSubTab === 'nao-candidatas') {
        return vagas.filter(isVagaNaoCandidata);
    }

    return vagas;
}

function filterVagas() {
    if (state.currentTab === 'tech') {
        let filtered = state.techVagas;

        if (state.searchTerm) {
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(state.searchTerm)
            );
        }

        filtered = filtered.filter(v => passaNoFiltroTech(v, state.currentTechFilter));

        return aplicarFiltroSubTab(filtered);
    }

    if (state.currentTab === 'descartadas') {
        let filtered = state.descartadasVagas;

        if (state.searchTerm) {
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(state.searchTerm)
            );
        }

        // Sem filtro ativo a lista mostra tudo, que é o padrão ao abrir a aba.
        if (state.currentDescartadasFilter) {
            filtered = filtered.filter(v => passaNoFiltroTech(v, state.currentDescartadasFilter));
        }

        return ordenarPorDataDecrescente(filtered);
    }

    if (state.currentTab === 'geral') {
        let filtered = state.geralVagas;

        if (state.searchTerm) {
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(state.searchTerm)
            );
        }

        // Os botões de cargo decidem pelo rótulo; "Remoto" decide pela
        // modalidade, então alcança também as remotas que os termos de cargo já
        // rotularam. Por isso ele é o último e não um termo da lista.
        const rotulo = state.currentGeralFilter;
        switch (rotulo) {
            case 'remoto':
                filtered = filtered.filter(v => isVagaRemota(v));
                break;
            case 'junior':
                // "jr" e "Júnior" gravam o mesmo rótulo, então um teste cobre as
                // duas buscas.
                filtered = filtered.filter(v => {
                    const topic = (v.topic || '').toLowerCase();
                    return topic.includes('júnior') || topic.includes('junior');
                });
                break;
            default:
                // Os demais casam por substring do rótulo. O de "ABC" é exato
                // porque ele é geografia e não nome de cargo: nenhum outro
                // rótulo deveria casar com "ABC" por acidente.
                if (rotulo === 'abc') {
                    filtered = filtered.filter(v => (v.topic || '').toLowerCase() === 'abc');
                } else {
                    filtered = filtered.filter(v => (v.topic || '').toLowerCase().includes(rotulo));
                }
        }

        filtered = ordenarPorDataDecrescente(filtered);

        return aplicarFiltroSubTab(filtered);
    }

    return [];
}

function renderVagas() {
    const filtered = filterVagas();

    els.vacanciesGrid.classList.remove('hidden');

    if (filtered.length === 0) {
        els.vacanciesGrid.innerHTML = '';
        showEmpty();
        hideStats();
        return;
    }

    hideEmpty();
    showStats(filtered);

    els.vacanciesGrid.innerHTML = state.currentTab === 'descartadas'
        ? filtered.map(vaga => createCardDescartada(vaga)).join('')
        : filtered.map(vaga => createCard(vaga)).join('');
}

// Card da aba de auditoria. É mais enxuto que o card comum de propósito: sem
// o toggle "Vista" e sem "Ver descrição". A descrição de uma vaga descartada não
// é coletada pelo programa, e o botão apareceria para prometer algo que não
// existe. O motivo do corte vai no lugar do rótulo — é a informação que
// justifica a lista inteira.
function createCardDescartada(vaga) {
    const vagaId = String(vaga.id || '');
    const motivo = vaga.motivo || 'fora do escopo';
    const ehCargo = motivo === 'cargo avançado';
    const link = vaga.jobUrl || '#';
    const dataPub = formatDateTime(vaga.publishedDate);
    const empresa = vaga.companyName || vaga.careerPageName || '';

    return `
        <article class="card-descartada" data-vaga-id="${escapeHtml(vagaId)}">
            <div class="card-descartada-content">
                <div class="vacancy-header">
                    <h3 class="vacancy-title">${escapeHtml(vaga.name || 'Sem título')}</h3>
                </div>
                <span class="motivo-tag${ehCargo ? ' motivo-cargo' : ''}">${escapeHtml(motivo)}</span>
                ${empresa ? `<span class="vacancy-company">${escapeHtml(empresa)}</span>` : ''}
                <div class="vacancy-footer">
                    <span class="vacancy-date">${escapeHtml(dataPub)}</span>
                    <div class="vacancy-actions">
                        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="apply-btn">Candidatar-se →</a>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function createCard(vaga) {
    const vagaId = String(vaga.id || '');
    const isApplied = state.appliedIds.has(vagaId);
    const isRemote = isVagaRemota(vaga);
    const badgeClass = isRemote ? 'remote' : 'onsite';
    const badgeText = isRemote ? 'Remoto' : 'Presencial';
    const topic = vaga.topic || 'Geral';
    const dataPub = formatDateTime(vaga.publishedDate);
    const link = vaga.jobUrl || '#';
    const companyName = vaga.companyName || vaga.careerPageName || '';
    const company = companyName ? `<span class="vacancy-company">${escapeHtml(companyName)}</span>` : '';

    return `
        <article class="vacancy-card${isApplied ? ' applied' : ''}" data-vaga-id="${escapeHtml(vagaId)}">
            <div class="vacancy-card-content">
                <div class="vacancy-header">
                    <h3 class="vacancy-title">${escapeHtml(vaga.name || 'Sem título')}</h3>
                    <span class="vacancy-badge ${badgeClass}">${badgeText}</span>
                </div>
                <span class="vacancy-topic">${escapeHtml(topic)}</span>
                ${company}
                <div class="vacancy-footer">
                    <span class="vacancy-date">${escapeHtml(dataPub)}</span>
                    <div class="vacancy-actions">
                        <button type="button" class="desc-btn" data-vaga-id="${escapeHtml(vagaId)}" aria-haspopup="dialog">Ver descrição</button>
                        <label class="apply-toggle">
                            <input type="checkbox" data-vaga-id="${escapeHtml(vagaId)}" ${isApplied ? 'checked' : ''}>
                            <span class="apply-toggle-slider"></span>
                            <span class="apply-toggle-label">Vista</span>
                        </label>
                        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="apply-btn" data-vaga-id="${escapeHtml(vagaId)}">Candidatar-se →</a>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// ---------------------------------------------------------------------------
// Painel de descrição (sobreposição à direita)
// ---------------------------------------------------------------------------

// `descricoes.json` é baixado uma vez, no primeiro clique. Se a busca falhar,
// a promessa é descartada para que o próximo clique tente de novo.
function garantirDescricoes() {
    if (state.descricoes) return Promise.resolve(state.descricoes);
    if (!state.descricoesPromise) {
        state.descricoesPromise = fetch('data/descricoes.json')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(dados => {
                state.descricoes = dados && typeof dados === 'object' ? dados : {};
                state.descricoesPromise = null;
                return state.descricoes;
            })
            .catch(err => {
                state.descricoesPromise = null;
                throw err;
            });
    }
    return state.descricoesPromise;
}

function abrirDescricao(vagaId, botao) {
    const vaga = state.vagasPorId.get(String(vagaId || ''));
    if (!vaga || !els.descDrawer) return;

    state.descricaoAbertaId = String(vagaId);
    els.descricaoAbertaBotao = botao || null;

    const empresa = vaga.companyName || vaga.careerPageName || '';
    const modalidade = isVagaRemota(vaga) ? 'Remoto' : 'Presencial';
    els.descDrawerTitle.textContent = vaga.name || 'Sem título';
    els.descDrawerSubtitle.textContent = [empresa, modalidade, formatDateTime(vaga.publishedDate)]
        .filter(Boolean)
        .join(' · ');
    els.descDrawerApply.href = vaga.jobUrl || '#';
    els.descDrawerBody.innerHTML = '<p class="desc-status">Carregando descrição…</p>';

    els.descDrawer.classList.add('open');
    els.descDrawer.setAttribute('aria-hidden', 'false');
    els.descBackdrop.classList.add('open');
    document.body.classList.add('drawer-open');
    els.descDrawerClose.focus();

    garantirDescricoes()
        .then(descricoes => {
            // O usuário pode ter fechado ou trocado de vaga enquanto baixava.
            if (state.descricaoAbertaId !== String(vagaId)) return;
            const entrada = descricoes[String(vagaId)];
            renderSecoes(entrada && entrada.secoes);
        })
        .catch(err => {
            console.error('Erro ao carregar descricoes.json:', err);
            if (state.descricaoAbertaId !== String(vagaId)) return;
            els.descDrawerBody.innerHTML = `
                <p class="desc-status">Não foi possível carregar a descrição agora. Tente novamente em alguns instantes.</p>
            `;
        });
}

function fecharDescricao() {
    if (!els.descDrawer) return;
    els.descDrawer.classList.remove('open');
    els.descDrawer.setAttribute('aria-hidden', 'true');
    els.descBackdrop.classList.remove('open');
    document.body.classList.remove('drawer-open');
    state.descricaoAbertaId = null;
    if (els.descricaoAbertaBotao) {
        els.descricaoAbertaBotao.focus();
        els.descricaoAbertaBotao = null;
    }
}

// Cada seção tem um título ("Responsabilidades", "Requisitos",
// "Informações adicionais"…) e uma lista de blocos. O tipo do bloco reproduz o
// que a empresa escreveu na vaga: "item" vira bullet, "subtitulo" vira um
// rótulo em negrito e "texto" vira parágrafo — é o que a Gupy mostra.
function renderSecoes(secoes) {
    if (!secoes || !secoes.length) {
        els.descDrawerBody.innerHTML = `
            <p class="desc-status">
                Esta vaga não detalha as atribuições em texto. A descrição completa
                está na vaga original — use o botão abaixo.
            </p>
        `;
        return;
    }

    els.descDrawerBody.innerHTML = secoes.map(secao => `
        <section class="desc-section">
            <h3 class="desc-section-title">${escapeHtml(secao.titulo || 'Descrição')}</h3>
            ${renderBlocos(secao.blocos || [])}
        </section>
    `).join('');

    els.descDrawerBody.scrollTop = 0;
}

// Itens vizinhos viram uma <ul>; subtítulos e parágrafos ficam soltos, na
// ordem em que a vaga escreveu.
function renderBlocos(blocos) {
    let html = '';
    let itens = '';

    const fechaLista = () => {
        if (itens) {
            html += `<ul class="desc-list">${itens}</ul>`;
            itens = '';
        }
    };

    for (const bloco of blocos) {
        const texto = escapeHtml(bloco.texto || '');
        if (bloco.tipo === 'item') {
            itens += `<li>${texto}</li>`;
        } else {
            fechaLista();
            html += bloco.tipo === 'subtitulo'
                ? `<h4 class="desc-subtitle">${texto}</h4>`
                : `<p class="desc-text">${texto}</p>`;
        }
    }
    fechaLista();

    return html;
}

function renderSchedule() {
    let filtered = state.techVagas;

    // O mesmo `switch` da lista de vagas: o botão "Todas" do gráfico também
    // exclui estágio, para os dois lugares não contarem números diferentes.
    filtered = filtered.filter(v => passaNoFiltroTech(v, state.currentScheduleFilter));

    const hourCounts = Array(24).fill(0);
    filtered.forEach(vaga => {
        const pubDate = vaga.publishedDate;
        if (pubDate) {
            try {
                const date = new Date(pubDate.replace('Z', '+00:00'));
                const hour = date.getHours();
                hourCounts[hour]++;
            } catch (e) {}
        }
    });

    const maxCount = Math.max(...hourCounts);
    const totalVagas = filtered.length;

    els.scheduleBars.innerHTML = hourCounts.map((count, hour) => {
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const label = `${hour.toString().padStart(2, '0')}:00`;
        return `
            <div class="schedule-bar-row">
                <span class="schedule-bar-label">${label}</span>
                <div class="schedule-bar-track">
                    <div class="schedule-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="schedule-bar-value">${count}</span>
            </div>
        `;
    }).join('');

    const peakHour = hourCounts.indexOf(maxCount);
    const morningCount = hourCounts.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoonCount = hourCounts.slice(12, 18).reduce((a, b) => a + b, 0);
    const nightCount = hourCounts.slice(18, 24).reduce((a, b) => a + b, 0);
    const earlyCount = hourCounts.slice(0, 6).reduce((a, b) => a + b, 0);

    els.scheduleSummary.innerHTML = `
        <div class="summary-item">
            <p class="summary-label">Total</p>
            <p class="summary-value">${totalVagas}</p>
        </div>
        <div class="summary-item">
            <p class="summary-label">Pico</p>
            <p class="summary-value">${peakHour}h (${maxCount})</p>
        </div>
        <div class="summary-item">
            <p class="summary-label">Manhã (6-12h)</p>
            <p class="summary-value">${morningCount}</p>
        </div>
        <div class="summary-item">
            <p class="summary-label">Tarde (12-18h)</p>
            <p class="summary-value">${afternoonCount}</p>
        </div>
        <div class="summary-item">
            <p class="summary-label">Noite (18-24h)</p>
            <p class="summary-value">${nightCount}</p>
        </div>
        <div class="summary-item">
            <p class="summary-label">Madrugada (0-6h)</p>
            <p class="summary-value">${earlyCount}</p>
        </div>
    `;
}

// Complemento do contador exibido na sub-aba ativa (vazio em "Todas").
function rotuloSubTab() {
    if (state.currentSubTab === 'recentes') return ROTULO_JANELA_RECENTE;
    if (state.currentSubTab === 'nao-candidatas') return 'ainda não vistas';
    return '';
}

function showStats(vagas) {
    const total = vagas.length;
    const plural = total !== 1;
    const rotulo = state.currentTab === 'descartadas'
        ? `vaga${plural ? 's' : ''} descartada${plural ? 's' : ''}`
        : `vaga${plural ? 's' : ''} encontrada${plural ? 's' : ''}`;
    const base = `${total} ${rotulo}`;
    els.statTotal.textContent = rotuloSubTab()
        ? `${base} · ${rotuloSubTab()}`
        : base;
    els.stats.classList.remove('hidden');
}

function hideStats() {
    els.stats.classList.add('hidden');
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/I';
    try {
        const date = new Date(dateStr.replace('Z', '+00:00'));
        const d = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
        const t = date.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${d} · ${t}`;
    } catch {
        return 'N/I';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    els.loading.classList.toggle('hidden', !show);
    els.vacanciesGrid.classList.toggle('hidden', show);
}

function showError(msg) {
    els.errorMessage.textContent = msg;
    els.errorState.classList.remove('hidden');
    els.vacanciesGrid.classList.add('hidden');
    els.scheduleContainer.classList.add('hidden');
    els.emptyState.classList.add('hidden');
    hideStats();
}

function hideError() {
    els.errorState.classList.add('hidden');
}

function showEmpty() {
    let titulo = 'Nenhuma vaga encontrada';
    let texto = 'Tente ajustar os filtros ou a busca';

    if (state.currentTab === 'descartadas') {
        // O arquivo nasce na primeira rodada depois da mudança, então lista
        // vazia aqui é o caso normal de quem ainda não rodou o programa.
        titulo = state.descartadasVagas.length === 0
            ? 'Nenhuma descarte registrada'
            : 'Nada com esse filtro';
        texto = state.descartadasVagas.length === 0
            ? 'Os filtros ainda não cortaram vaga nenhuma — ou o arquivo ainda não foi gerado'
            : 'Nenhuma vaga descartada com essa área';
    } else if (state.currentSubTab === 'recentes') {
        titulo = 'Nenhuma vaga nova';
        texto = `Nada publicado ${ROTULO_JANELA_RECENTE} ainda não visto`;
    } else if (state.currentSubTab === 'nao-candidatas') {
        titulo = 'Tudo já visto';
        texto = 'Você já marcou como vistas todas as vagas com os filtros atuais';
    }

    if (els.emptyTitle) els.emptyTitle.textContent = titulo;
    if (els.emptyText) els.emptyText.textContent = texto;

    els.emptyState.classList.remove('hidden');
    els.vacanciesGrid.classList.add('hidden');
}

function hideEmpty() {
    els.emptyState.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);