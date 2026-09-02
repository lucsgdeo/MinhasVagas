const STORAGE_KEY = 'minhasvagas_applied';
const THEME_STORAGE_KEY = 'minhasvagas_theme';

const state = {
    allVagas: [],
    currentTab: '24h',
    currentFilter: 'todas',
    currentScheduleFilter: 'todas',
    searchTerm: '',
    appliedIds: new Set(),
    currentTheme: 'red'
};

const els = {
    tab24h: document.getElementById('tab-24h'),
    tab7d: document.getElementById('tab-7d'),
    tabSchedule: document.getElementById('tab-schedule'),
    searchInput: document.getElementById('search-input'),
    filterPills: document.querySelectorAll('.filter-pill'),
    scheduleFilterPills: document.querySelectorAll('#schedule-filter-pills .filter-pill'),
    vacanciesGrid: document.getElementById('vacancies-grid'),
    scheduleContainer: document.getElementById('schedule-container'),
    scheduleBars: document.getElementById('schedule-bars'),
    scheduleSummary: document.getElementById('schedule-summary'),
    filtersContainer: document.getElementById('filters-container'),
    scheduleFiltersContainer: document.getElementById('schedule-filters-container'),
    emptyState: document.getElementById('empty-state'),
    loading: document.getElementById('loading'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    stats: document.getElementById('stats'),
    statTotal: document.getElementById('stat-total'),
    themeOptions: document.querySelectorAll('.theme-option')
};

function init() {
    loadThemeFromStorage();
    loadAppliedFromStorage();
    loadVagas();
    setupEventListeners();
}

function setupEventListeners() {
    els.tab24h.addEventListener('click', () => switchTab('24h'));
    els.tab7d.addEventListener('click', () => switchTab('7d'));
    els.tabSchedule.addEventListener('click', () => switchTab('schedule'));

    els.searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.toLowerCase();
        if (state.currentTab !== 'schedule') renderVagas();
    });

    els.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.filterPills.forEach(p => {
                p.classList.remove('active');
            });
            pill.classList.add('active');
            state.currentFilter = pill.dataset.filter;
            renderVagas();
        });
    });

    els.scheduleFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            els.scheduleFilterPills.forEach(p => {
                p.classList.remove('active');
            });
            pill.classList.add('active');
            state.currentScheduleFilter = pill.dataset.filter;
            renderSchedule();
        });
    });

    els.retryBtn.addEventListener('click', loadVagas);

    els.vacanciesGrid.addEventListener('change', (e) => {
        if (e.target.matches('.apply-toggle input')) {
            const vagaId = e.target.dataset.vagaId;
            toggleApplied(vagaId, e.target.checked);
        }
    });

    els.vacanciesGrid.addEventListener('click', (e) => {
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

    // Theme selector
    els.themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            setTheme(theme);
        });
    });
}

function loadAppliedFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const ids = JSON.parse(stored);
            state.appliedIds = new Set(ids);
        }
    } catch (e) {
        console.warn('Erro ao ler localStorage:', e);
    }
}

function loadThemeFromStorage() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
            state.currentTheme = stored;
            applyTheme(stored);
        } else {
            applyTheme('red');
        }
    } catch (e) {
        console.warn('Erro ao ler tema do localStorage:', e);
        applyTheme('red');
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

function switchTab(tab) {
    state.currentTab = tab;

    [els.tab24h, els.tab7d, els.tabSchedule].forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    const activeTab = document.getElementById(`tab-${tab === '24h' ? '24h' : tab === '7d' ? '7d' : 'schedule'}`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
    }

    const isSchedule = tab === 'schedule';
    els.vacanciesGrid.classList.toggle('hidden', isSchedule);
    els.scheduleContainer.classList.toggle('hidden', !isSchedule);
    els.filtersContainer.classList.toggle('hidden', isSchedule);
    els.scheduleFiltersContainer.classList.toggle('hidden', !isSchedule);
    els.stats.classList.toggle('hidden', isSchedule);
    els.emptyState.classList.add('hidden');
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
        const response = await fetch('vagas_recentes.json');
        if (!response.ok) {
            if (response.status === 404) {
                state.allVagas = [];
                showEmpty();
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        state.allVagas = await response.json();
        if (state.currentTab === 'schedule') {
            renderSchedule();
        } else {
            renderVagas();
        }
    } catch (err) {
        console.error('Erro ao carregar vagas:', err);
        showError(`Não foi possível carregar as vagas: ${err.message}`);
    } finally {
        showLoading(false);
    }
}

function filterVagas() {
    let filtered = state.allVagas;

    if (state.currentTab === '24h') {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        filtered = filtered.filter(v => {
            const pubDate = new Date(v.publishedDate.replace('Z', '+00:00'));
            return pubDate >= dayAgo;
        });
    }

    if (state.searchTerm) {
        filtered = filtered.filter(v =>
            v.name.toLowerCase().includes(state.searchTerm)
        );
    }

    if (state.currentFilter !== 'todas') {
        filtered = filtered.filter(v => {
            const topic = v.topic.toLowerCase();
            switch (state.currentFilter) {
                case 'suporte': return topic.includes('suporte');
                case 'ti': return topic.includes('ti');
                case 'infraestrutura': return topic.includes('infra');
                case 'service-desk': return topic.includes('service desk');
                case 'junior': return topic.includes('júnior') || topic.includes('junior');
                case 'help-desk': return topic.includes('help desk');
                default: return true;
            }
        });
    }

    return filtered;
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

function createCard(vaga) {
    const vagaId = vaga.id || '';
    const isApplied = state.appliedIds.has(vagaId);
    const modalidade = vaga.workplaceType || 'N/I';
    const isRemote = modalidade.toLowerCase() === 'remote' || modalidade.toLowerCase() === 'remoto';
    const badgeClass = isRemote ? 'remote' : 'onsite';
    const badgeText = isRemote ? '100% Remoto' : 'Presencial';
    const topic = vaga.topic || 'Geral';
    const dataPub = formatDateShort(vaga.publishedDate);
    const link = vaga.jobUrl || '#';

    return `
        <article class="vacancy-card${isApplied ? ' applied' : ''}" data-vaga-id="${escapeHtml(vagaId)}">
            <div class="vacancy-card-content">
                <div class="vacancy-header">
                    <h3 class="vacancy-title">${escapeHtml(vaga.name || 'Sem título')}</h3>
                    <span class="vacancy-badge ${badgeClass}">${badgeText}</span>
                </div>
                <span class="vacancy-topic">${escapeHtml(topic)}</span>
                <div class="vacancy-footer">
                    <span class="vacancy-date">${escapeHtml(dataPub)}</span>
                    <div class="vacancy-actions">
                        <label class="apply-toggle">
                            <input type="checkbox" data-vaga-id="${escapeHtml(vagaId)}" ${isApplied ? 'checked' : ''}>
                            <span class="apply-toggle-slider"></span>
                            <span class="apply-toggle-label">Candidatei-me</span>
                        </label>
                        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="apply-btn" data-vaga-id="${escapeHtml(vagaId)}">Candidatar-se →</a>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function renderSchedule() {
    let filtered = state.allVagas;

    if (state.currentScheduleFilter !== 'todas') {
        filtered = filtered.filter(v => {
            const topic = v.topic.toLowerCase();
            switch (state.currentScheduleFilter) {
                case 'suporte': return topic.includes('suporte');
                case 'ti': return topic.includes('ti');
                case 'infraestrutura': return topic.includes('infra');
                case 'service-desk': return topic.includes('service desk');
                case 'junior': return topic.includes('júnior') || topic.includes('junior');
                case 'help-desk': return topic.includes('help desk');
                default: return true;
            }
        });
    }

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

function showStats(vagas) {
    const total = vagas.length;
    els.statTotal.textContent = `${total} vaga${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`;
    els.stats.classList.remove('hidden');
}

function hideStats() {
    els.stats.classList.add('hidden');
}

function formatDateShort(dateStr) {
    if (!dateStr) return 'N/I';
    try {
        const date = new Date(dateStr.replace('Z', '+00:00'));
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
        return 'Data inválida';
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
    els.scheduleContainer.classList.toggle('hidden', show);
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
    els.emptyState.classList.remove('hidden');
    els.vacanciesGrid.classList.add('hidden');
}

function hideEmpty() {
    els.emptyState.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);