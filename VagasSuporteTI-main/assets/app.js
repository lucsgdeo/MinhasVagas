const STORAGE_KEY = 'vagasti_applied';
const THEME_STORAGE_KEY = 'vagasti_theme';
const MODE_STORAGE_KEY = 'vagasti_mode';

// Aba "Últimos 7 dias": vagas publicadas na última semana (dias do calendário,
// no fuso horário local do navegador) e ainda não marcadas como vistas.
// O histórico do suporte guarda 14 dias, então a semana sempre tem folga.
const DIAS_JANELA_RECENTE = 7;
const ROTULO_JANELA_RECENTE = 'últimos 7 dias';

// O GitHub Pages manda o navegador guardar os arquivos por 10 minutos. Sem
// isto, quem abriu o site antes da atualização das 18h30 continuava vendo as
// vagas antigas. "no-cache" não baixa tudo de novo: o navegador só pergunta ao
// servidor se o arquivo mudou e reaproveita a cópia quando não mudou.
const SEM_CACHE = { cache: 'no-cache' };

const state = {
    suporteVagas: [],
    geralVagas: [],
    currentTab: 'suporte',
    currentSubTab: 'recentes', // padrão: abre em "Últimos 7 dias" (sem as já vistas)
    currentSuporteFilter: 'todas',
    // Plataformas marcadas no filtro (seleção múltipla). Vazio = todas.
    fontesSelecionadas: new Set(),
    currentGeralFilter: 'todas',
    currentScheduleFilter: 'todas',
    searchTerm: '',
    appliedIds: new Set(),
    // Instantâneos fixados no carregamento da página.
    // A aba "Últimos 7 dias" filtra por estes valores para que a lista só
    // mude ao recarregar a página (nunca durante a sessão).
    appliedAtLoad: new Set(),
    janelaRecente: null,
    currentTheme: 'blue',
    currentMode: 'light',
    // Índice id -> vaga das duas listas, para o painel de descrição não
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
        tabSuporte: document.getElementById('tab-suporte'),
        tabGeral: document.getElementById('tab-geral'),
        tabSchedule: document.getElementById('tab-schedule'),
        subTabs: document.getElementById('subtabs'),
        subTabBtns: document.querySelectorAll('.subtab-btn'),
        searchInput: document.getElementById('search-input'),
        suporteFilterPillsContainer: document.getElementById('suporte-filter-pills'),
        geralFilterPillsContainer: document.getElementById('geral-filter-pills'),
        suporteFilterPills: document.querySelectorAll('#suporte-filter-pills .filter-pill'),
        geralFilterPills: document.querySelectorAll('#geral-filter-pills .filter-pill'),
        sourceFilter: document.getElementById('source-filter'),
        sourcePills: document.querySelectorAll('#source-filter .source-pill'),
        sourceClear: document.getElementById('source-clear'),
        scheduleFilterPills: document.querySelectorAll('#schedule-filter-pills .filter-pill'),
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
        themeOptions: document.querySelectorAll('.theme-option'),
        modeToggle: document.getElementById('mode-toggle'),
        descBackdrop: document.getElementById('desc-backdrop'),
        descDrawer: document.getElementById('desc-drawer'),
        descDrawerTitle: document.getElementById('desc-drawer-title'),
        descDrawerSubtitle: document.getElementById('desc-drawer-subtitle'),
        descDrawerBody: document.getElementById('desc-drawer-body'),
        descDrawerApply: document.getElementById('desc-drawer-apply'),
        descDrawerClose: document.getElementById('desc-drawer-close'),
        descricaoAbertaBotao: null
    };

    loadThemeFromStorage();
    loadModeFromStorage();
    loadAppliedFromStorage();
    loadVagas();
    setupEventListeners();
}

function setupEventListeners() {
    if (els.tabSuporte) els.tabSuporte.addEventListener('click', () => switchTab('suporte'));
    if (els.tabGeral) els.tabGeral.addEventListener('click', () => switchTab('geral'));
    if (els.tabSchedule) els.tabSchedule.addEventListener('click', () => switchTab('schedule'));

    els.subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
    });

    if (els.searchInput) {
        els.searchInput.addEventListener('input', (e) => {
            state.searchTerm = e.target.value.toLowerCase();
            if (state.currentTab !== 'schedule') renderVagas();
        });
    }

    els.suporteFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.suporteFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentSuporteFilter = pill.dataset.filter;
            renderVagas();
        });
    });

    // Plataformas: cada clique liga/desliga uma. Marcar Catho e InfoJobs mostra
    // as vagas das duas; desmarcar todas volta a mostrar tudo.
    els.sourcePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const fonte = pill.dataset.fonte;
            if (state.fontesSelecionadas.has(fonte)) {
                state.fontesSelecionadas.delete(fonte);
            } else {
                state.fontesSelecionadas.add(fonte);
            }
            atualizarBotoesDeFonte();
            renderVagas();
        });
    });

    if (els.sourceClear) {
        els.sourceClear.addEventListener('click', () => {
            state.fontesSelecionadas.clear();
            atualizarBotoesDeFonte();
            renderVagas();
        });
    }

    els.geralFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.geralFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentGeralFilter = pill.dataset.filter;
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
        if (e.key === 'Escape' && state.descricaoAbertaId) fecharDescricao();
    });

    // Theme selector
    els.themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            setTheme(theme);
        });
    });

    // Alternância claro/escuro
    if (els.modeToggle) els.modeToggle.addEventListener('click', toggleMode);
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

    // Congela o estado das candidaturas e a janela recente neste momento:
    // marcar "Vista" durante a sessão não deve remover a vaga da aba
    // "Últimos 7 dias". O filtro só é recalculado no próximo carregamento.
    state.appliedAtLoad = new Set(state.appliedIds);
    state.janelaRecente = calcularJanelaRecente(Date.now());
}

function loadThemeFromStorage() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
            state.currentTheme = stored;
            applyTheme(stored);
        } else {
            applyTheme('blue');
        }
    } catch (e) {
        console.warn('Erro ao ler tema do localStorage:', e);
        applyTheme('blue');
    }
}

function saveThemeToStorage() {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, state.currentTheme);
    } catch (e) {
        console.warn('Erro ao salvar tema no localStorage:', e);
    }
}

function setTheme(theme) {
    state.currentTheme = theme;
    applyTheme(theme);
    saveThemeToStorage();
    updateThemeOptions(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeOptions(activeTheme) {
    els.themeOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.theme === activeTheme);
    });
}

function loadModeFromStorage() {
    let mode = null;
    try {
        mode = localStorage.getItem(MODE_STORAGE_KEY);
    } catch (e) {
        console.warn('Erro ao ler modo do localStorage:', e);
    }
    if (mode !== 'dark' && mode !== 'light') {
        mode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'dark'
            : 'light';
    }
    applyMode(mode);
}

function saveModeToStorage() {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, state.currentMode);
    } catch (e) {
        console.warn('Erro ao salvar modo no localStorage:', e);
    }
}

function applyMode(mode) {
    state.currentMode = mode;
    if (mode === 'dark') {
        document.documentElement.setAttribute('data-mode', 'dark');
    } else {
        document.documentElement.removeAttribute('data-mode');
    }
    updateModeToggle(mode);
}

function toggleMode() {
    applyMode(state.currentMode === 'dark' ? 'light' : 'dark');
    saveModeToStorage();
}

function updateModeToggle(mode) {
    if (!els.modeToggle) return;
    const isDark = mode === 'dark';
    els.modeToggle.textContent = isDark ? '☀️' : '🌙';
    const rotulo = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
    els.modeToggle.setAttribute('aria-label', rotulo);
    els.modeToggle.setAttribute('title', rotulo);
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

    [els.tabSuporte, els.tabGeral, els.tabSchedule].forEach(btn => {
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
    const isSuporte = tab === 'suporte';
    const isGeral = tab === 'geral';

    els.vacanciesGrid.classList.toggle('hidden', isSchedule);
    els.scheduleContainer.classList.toggle('hidden', !isSchedule);
    els.filtersContainer.classList.toggle('hidden', isSchedule);
    els.scheduleFiltersContainer.classList.toggle('hidden', !isSchedule);
    els.stats.classList.toggle('hidden', isSchedule);
    els.emptyState.classList.add('hidden');
    if (els.subTabs) els.subTabs.classList.toggle('hidden', isSchedule);

    if (els.suporteFilterPillsContainer) els.suporteFilterPillsContainer.classList.toggle('hidden', !isSuporte);
    // "T.I. em Geral" só tem Gupy, então o filtro de plataforma é só do Suporte T.I.
    if (els.sourceFilter) els.sourceFilter.classList.toggle('hidden', !isSuporte);
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
        const [resLegal, resGeral] = await Promise.allSettled([
            fetch('data/vagas_suporte.json', SEM_CACHE),
            fetch('data/vagas_ti_geral.json', SEM_CACHE)
        ]);

        if (resLegal.status === 'fulfilled' && resLegal.value.ok) {
            state.suporteVagas = await resLegal.value.json();
        } else {
            state.suporteVagas = [];
        }

        if (resGeral.status === 'fulfilled' && resGeral.value.ok) {
            state.geralVagas = await resGeral.value.json();
        } else {
            state.geralVagas = [];
        }

        if (state.currentTab === 'schedule') {
            renderSchedule();
        } else {
            renderVagas();
        }

        indexarVagas();
    } catch (err) {
        console.error('Erro ao carregar vagas:', err);
        showError(`Não foi possível carregar as vagas: ${err.message}`);
    } finally {
        showLoading(false);
    }
}

// Índice id -> vaga, usado pelo painel de descrição para não depender do card.
function indexarVagas() {
    state.vagasPorId = new Map();
    [...state.suporteVagas, ...state.geralVagas].forEach(vaga => {
        state.vagasPorId.set(String(vaga.id || ''), vaga);
    });
}

function isVagaRemota(vaga) {
    const modalidade = (vaga.workplaceType || '').toLowerCase();
    const topic = (vaga.topic || '').toLowerCase();
    return modalidade === 'remote' || modalidade === 'remoto' || topic.includes('remoto');
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

// Janela recente: do início de (DIAS_JANELA_RECENTE - 1) dias atrás até o início de amanhã.
// Usa dias do calendário no fuso local do navegador (mesma referência das datas
// exibidas no card) e setDate() para não quebrar em horário de verão.
function calcularJanelaRecente(refTs) {
    const inicioOntem = inicioDoDiaLocal(refTs);
    inicioOntem.setDate(inicioOntem.getDate() - (DIAS_JANELA_RECENTE - 1));

    const inicioAmanha = inicioDoDiaLocal(refTs);
    inicioAmanha.setDate(inicioAmanha.getDate() + 1);

    return { inicio: inicioOntem.getTime(), fim: inicioAmanha.getTime() };
}

// Aba "Últimos 7 dias": publicada na janela recente e sem marcação registrada
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
    if (state.currentTab === 'suporte') {
        let filtered = state.suporteVagas;

        if (state.searchTerm) {
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(state.searchTerm)
            );
        }

        filtered = filtered.filter(v => filtroSuporte(v, state.currentSuporteFilter));

        // A contagem de cada botão de plataforma considera os outros filtros
        // (busca, área, sub-aba), mas não a própria plataforma: assim o número
        // diz quantas vagas aquele botão vai somar se for marcado.
        const antesDaFonte = aplicarFiltroSubTab(ordenarPorDataDecrescente(filtered));
        atualizarContagemPorFonte(antesDaFonte);

        if (state.fontesSelecionadas.size) {
            return antesDaFonte.filter(v => state.fontesSelecionadas.has(fonteDaVaga(v)));
        }
        return antesDaFonte;
    }

    if (state.currentTab === 'geral') {
        let filtered = state.geralVagas;

        if (state.searchTerm) {
            filtered = filtered.filter(v =>
                (v.name || '').toLowerCase().includes(state.searchTerm)
            );
        }

        filtered = filtered.filter(v => filtroGeral(v, state.currentGeralFilter));
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

    els.vacanciesGrid.innerHTML = filtered.map(vaga => createCard(vaga)).join('');
}

// Vagas antigas do histórico não têm o campo: todas eram da Gupy.
function fonteDaVaga(vaga) {
    return vaga.fonte || 'Gupy';
}

function atualizarBotoesDeFonte() {
    els.sourcePills.forEach(pill => {
        const marcada = state.fontesSelecionadas.has(pill.dataset.fonte);
        pill.setAttribute('aria-pressed', marcada ? 'true' : 'false');
    });
    if (els.sourceClear) els.sourceClear.classList.toggle('hidden', state.fontesSelecionadas.size === 0);
}

function atualizarContagemPorFonte(vagas) {
    const contagem = {};
    vagas.forEach(v => {
        const fonte = fonteDaVaga(v);
        contagem[fonte] = (contagem[fonte] || 0) + 1;
    });
    els.sourcePills.forEach(pill => {
        const total = contagem[pill.dataset.fonte] || 0;
        const span = pill.querySelector('.source-count');
        if (span) span.textContent = `(${total})`;
        // Plataforma sem vaga no recorte atual não pode ser marcada — a não ser
        // que já esteja marcada, senão a pessoa não conseguiria desmarcá-la.
        pill.disabled = total === 0 && !state.fontesSelecionadas.has(pill.dataset.fonte);
    });
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
                <div class="vacancy-tags">
                    <span class="vacancy-topic">${escapeHtml(topic)}</span>
                    <span class="vacancy-source" title="Site onde a vaga foi publicada">${escapeHtml(fonteDaVaga(vaga))}</span>
                </div>
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
        state.descricoesPromise = fetch('data/descricoes.json', SEM_CACHE)
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
    els.descDrawerSubtitle.textContent = [empresa, modalidade, fonteDaVaga(vaga), formatDateTime(vaga.publishedDate)]
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
    const vagaAberta = state.vagasPorId.get(String(state.descricaoAbertaId || ''));
    if ((!secoes || !secoes.length) && vagaAberta && fonteDaVaga(vagaAberta) !== 'Gupy') {
        els.descDrawerBody.innerHTML = `
            <p class="desc-status">
                Esta vaga é do ${escapeHtml(fonteDaVaga(vagaAberta))}. A descrição completa
                está no site original — use o botão abaixo.
            </p>
        `;
        return;
    }

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

// Botões da aba "Suporte T.I.": casam pelo rótulo (`topic`) que o monitor grava
// a partir do título ("Suporte N1", "Suporte N1/N2 Remoto", "Help Desk"…).
// Vaga que aceita N1 e N2 aparece nos dois botões.
function filtroSuporte(vaga, filtro) {
    const topic = (vaga.topic || '').toLowerCase();
    switch (filtro) {
        case 'n1': return /\bn1\b/.test(topic);
        case 'n2': return /\bn2\b/.test(topic);
        case 'jr': return topic.startsWith('suporte jr');
        case 'helpdesk': return topic.startsWith('help desk');
        case 'outros': return topic.startsWith('suporte técnico');
        default: return true;
    }
}

// Botões da aba "T.I. em Geral": área pelo rótulo da busca, modalidade pela vaga.
function filtroGeral(vaga, filtro) {
    const topic = (vaga.topic || '').toLowerCase();
    switch (filtro) {
        case 'infraestrutura': return topic.startsWith('infraestrutura');
        case 'redes': return topic.startsWith('redes');
        case 'tecnico': return topic.startsWith('técnico de informática');
        case 'analista': return topic.startsWith('analista de ti');
        case 'assistente': return topic.startsWith('assistente de ti');
        case 'remoto': return isVagaRemota(vaga);
        case 'presencial': return !isVagaRemota(vaga);
        default: return true;
    }
}

function renderSchedule() {
    const filtered = state.suporteVagas.filter(v => filtroSuporte(v, state.currentScheduleFilter));

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
    const base = `${total} vaga${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`;
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

    if (state.currentSubTab === 'recentes') {
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