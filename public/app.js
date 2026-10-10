/**
 * CasaControl Tablet Frontend Application
 * Vanilla ES6+ touch-optimized dashboard client
 */

// Application State
const state = {
  theme: localStorage.getItem('casacontrol-theme') || 'dark',
  entities: [],
  selectedDomain: 'all',
  searchQuery: '',
  scheduleItems: [],
  groceryItems: [],
  activeModalAction: null, // Holds target payload when confirmation modal is open
  pollingTimers: {},
};

// API Endpoints
const API = {
  entities: '/api/homeassistant/entities',
  action: '/api/homeassistant/action',
  schedule: '/api/schedule',
  groceries: '/api/groceries',
};

// Polling intervals in milliseconds
const INTERVALS = {
  entities: 10000,   // 10s
  schedule: 60000,   // 60s
  groceries: 60000,  // 60s
};

/* ==========================================================================
   Initialization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initEventListeners();

  // Initial fetches
  fetchEntities();
  fetchSchedule();
  fetchGroceries();

  // Setup independent polling
  startPolling();
});

/* ==========================================================================
   Theme Management
   ========================================================================== */

function initTheme() {
  document.body.className = state.theme === 'light' ? 'theme-light' : 'theme-dark';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', state.theme === 'light' ? '#f1f5f9' : '#0f172a');
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('casacontrol-theme', state.theme);
  initTheme();
}

/* ==========================================================================
   Live Clock & Date
   ========================================================================== */

function initClock() {
  const timeEl = document.getElementById('live-time');
  const dateEl = document.getElementById('live-date');

  function update() {
    const now = new Date();
    // 24-hr or 12-hr display (e.g. 10:42)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;

    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    }
  }

  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function initEventListeners() {
  // Theme Toggle Button
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Refresh All Button
  const refreshAllBtn = document.getElementById('btn-refresh-all');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', () => {
      showToast('Refreshing all panels...', 'info');
      fetchEntities();
      fetchSchedule();
      fetchGroceries();
    });
  }

  // Individual Card Refresh Buttons
  document.getElementById('ha-refresh-btn')?.addEventListener('click', () => fetchEntities());
  document.getElementById('schedule-refresh-btn')?.addEventListener('click', () => fetchSchedule());
  document.getElementById('groceries-refresh-btn')?.addEventListener('click', () => fetchGroceries());

  // Domain Filter Tabs
  const filterTabs = document.getElementById('domain-filter-tabs');
  if (filterTabs) {
    filterTabs.addEventListener('click', (e) => {
      const target = e.target.closest('.domain-tab');
      if (!target) return;
      filterTabs.querySelectorAll('.domain-tab').forEach((t) => t.classList.remove('active'));
      target.classList.add('active');
      state.selectedDomain = target.dataset.filter || 'all';
      renderEntities();
    });
  }

  // Search Input Filter
  const searchInput = document.getElementById('ha-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderEntities();
    });
  }

  // Modal Cancel & Confirm
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeModal);
  }

  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', executeConfirmedAction);
  }

  // Close modal when tapping background overlay
  const modalOverlay = document.getElementById('confirmation-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
}

/* ==========================================================================
   Polling Management
   ========================================================================== */

function startPolling() {
  clearInterval(state.pollingTimers.entities);
  clearInterval(state.pollingTimers.schedule);
  clearInterval(state.pollingTimers.groceries);

  state.pollingTimers.entities = setInterval(() => {
    fetchEntities(true);
  }, INTERVALS.entities);

  state.pollingTimers.schedule = setInterval(() => {
    fetchSchedule(true);
  }, INTERVALS.schedule);

  state.pollingTimers.groceries = setInterval(() => {
    fetchGroceries(true);
  }, INTERVALS.groceries);
}

/* ==========================================================================
   Home Assistant Integration & UI
   ========================================================================== */

async function fetchEntities(isBackground = false) {
  const pill = document.getElementById('ha-status-pill');
  if (!isBackground && pill) {
    updateStatusPill(pill, 'loading', 'Updating...');
  }

  try {
    const res = await fetch(API.entities);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch entities');
    }

    state.entities = data.entities || [];
    updateStatusPill(pill, 'healthy', `${state.entities.length} Devices`);
    renderEntities();
  } catch (err) {
    console.error('Entities fetch error:', err);
    updateStatusPill(pill, 'unreachable', 'HA Offline');
    if (!state.entities.length) {
      const container = document.getElementById('ha-entities-container');
      if (container) {
        container.innerHTML = `
          <div class="error-banner">
            <strong>Unable to reach Home Assistant</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }
}

function isHighImpact(entity) {
  const domain = entity.entity_id.split('.')[0];
  const idLower = entity.entity_id.toLowerCase();
  const deviceClass = entity.attributes?.device_class?.toLowerCase?.();

  if (domain === 'lock') return true;
  if (domain === 'alarm_control_panel') return true;
  if (domain === 'cover' && (deviceClass === 'garage' || idLower.includes('garage'))) return true;
  return false;
}

function getEntityDomain(entityId) {
  return entityId.split('.')[0];
}

function getFriendlyName(entity) {
  return entity.attributes?.friendly_name || entity.entity_id;
}

function renderEntities() {
  const container = document.getElementById('ha-entities-container');
  if (!container) return;

  let filtered = state.entities.filter((entity) => {
    const domain = getEntityDomain(entity.entity_id);
    const friendlyName = getFriendlyName(entity).toLowerCase();
    const entityId = entity.entity_id.toLowerCase();

    // Domain filter
    if (state.selectedDomain !== 'all') {
      if (state.selectedDomain === 'cover') {
        if (domain !== 'cover') return false;
      } else if (domain !== state.selectedDomain) {
        return false;
      }
    }

    // Search filter
    if (state.searchQuery) {
      const matches = friendlyName.includes(state.searchQuery) || entityId.includes(state.searchQuery);
      if (!matches) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span>No matching devices found</span>
      </div>
    `;
    return;
  }

  // Group entities by domain
  const groups = {};
  filtered.forEach((entity) => {
    const domain = getEntityDomain(entity.entity_id);
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(entity);
  });

  const domainLabels = {
    light: 'Lights',
    switch: 'Switches',
    lock: 'Locks',
    cover: 'Covers & Garage',
    climate: 'Climate & Thermostats',
    alarm_control_panel: 'Alarm & Security',
    fan: 'Fans',
    media_player: 'Media Players',
    scene: 'Scenes',
  };

  let html = '';
  for (const [domain, items] of Object.entries(groups)) {
    const label = domainLabels[domain] || domain.toUpperCase();
    html += `
      <div class="entity-group">
        <div class="entity-group-header">${escapeHtml(label)} (${items.length})</div>
        <div class="entity-grid">
          ${items.map((entity) => renderEntityCard(entity)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Attach tap event listeners
  container.querySelectorAll('.entity-card').forEach((card) => {
    card.addEventListener('click', () => {
      const entityId = card.dataset.entityId;
      const entity = state.entities.find((e) => e.entity_id === entityId);
      if (entity) handleEntityTap(entity, card);
    });
  });
}

function renderEntityCard(entity) {
  const domain = getEntityDomain(entity.entity_id);
  const friendlyName = getFriendlyName(entity);
  const stateStr = entity.state || 'unknown';
  const isActive = ['on', 'open', 'unlocked', 'heat', 'cool'].includes(stateStr.toLowerCase());
  const highImpact = isHighImpact(entity);

  return `
    <div class="entity-card ${isActive ? 'state-active' : ''} ${highImpact ? 'high-impact' : ''}" 
         data-entity-id="${escapeHtml(entity.entity_id)}"
         role="button"
         tabindex="0"
         aria-label="${escapeHtml(friendlyName)}, state: ${escapeHtml(stateStr)}">
      <div class="entity-card-top">
        <div class="entity-icon-wrap">
          ${getEntityIconSvg(domain, stateStr)}
        </div>
        ${highImpact ? '<span class="entity-badge-safety">Safety Lock</span>' : ''}
      </div>
      <div class="entity-info">
        <div class="entity-name" title="${escapeHtml(friendlyName)}">${escapeHtml(friendlyName)}</div>
        <div class="entity-state-label">${escapeHtml(stateStr)}</div>
      </div>
    </div>
  `;
}

function getEntityIconSvg(domain, state) {
  if (domain === 'light') {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2v1M12 18a6 6 0 1 0-6-6c0 2.22 1.2 4.15 3 5.19"></path></svg>`;
  }
  if (domain === 'lock') {
    if (state === 'locked') {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
  }
  if (domain === 'cover') {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M3 15h18"></path></svg>`;
  }
  if (domain === 'climate') {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>`;
  }
  if (domain === 'alarm_control_panel') {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  }
  // Default switch / plug
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v10"></path></svg>`;
}

/* ==========================================================================
   Action Execution & Confirmation Logic
   ========================================================================== */

function determineAction(entity) {
  const domain = getEntityDomain(entity.entity_id);
  const stateStr = (entity.state || '').toLowerCase();

  if (domain === 'light' || domain === 'switch') {
    return {
      domain,
      service: 'toggle',
      label: 'Toggle State',
    };
  }

  if (domain === 'lock') {
    const isLocked = stateStr === 'locked';
    return {
      domain: 'lock',
      service: isLocked ? 'unlock' : 'lock',
      label: isLocked ? 'Unlock Door' : 'Lock Door',
      warning: isLocked 
        ? 'Unlocking this door allows physical entry into the home. Please confirm.' 
        : 'Locking this door secures the entrance.',
    };
  }

  if (domain === 'cover') {
    const isOpen = stateStr === 'open';
    return {
      domain: 'cover',
      service: isOpen ? 'close_cover' : 'open_cover',
      label: isOpen ? 'Close Garage / Cover' : 'Open Garage / Cover',
      warning: 'Operating garage doors or motorized covers can cause property damage or injury. Confirm movement.',
    };
  }

  if (domain === 'alarm_control_panel') {
    const isDisarmed = stateStr === 'disarmed';
    return {
      domain: 'alarm_control_panel',
      service: isDisarmed ? 'alarm_arm_home' : 'alarm_disarm',
      label: isDisarmed ? 'Arm Alarm (Home)' : 'Disarm Alarm',
      warning: 'Changing the household security alarm state. Please verify.',
    };
  }

  // Fallback toggle
  return {
    domain,
    service: 'toggle',
    label: `Toggle ${domain}`,
  };
}

function handleEntityTap(entity, cardElement) {
  const actionInfo = determineAction(entity);
  const highImpact = isHighImpact(entity);

  if (highImpact) {
    // Open Universal Confirmation Modal
    openConfirmationModal({
      entity_id: entity.entity_id,
      entity_name: getFriendlyName(entity),
      domain: actionInfo.domain,
      service: actionInfo.service,
      label: actionInfo.label,
      warning: actionInfo.warning || 'Executing this high-impact action requires confirmation.',
      cardElement,
    });
  } else {
    // Direct execution
    executeAction({
      entity_id: entity.entity_id,
      domain: actionInfo.domain,
      service: actionInfo.service,
      confirmed: false,
      cardElement,
    });
  }
}

function openConfirmationModal(actionData) {
  state.activeModalAction = actionData;

  const modal = document.getElementById('confirmation-modal');
  const nameEl = document.getElementById('modal-entity-name');
  const actionEl = document.getElementById('modal-action-text');
  const warningEl = document.getElementById('modal-warning-text');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  if (nameEl) nameEl.textContent = actionData.entity_name;
  if (actionEl) actionEl.textContent = actionData.label;
  if (warningEl) warningEl.textContent = actionData.warning;

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.querySelector('.btn-text')?.classList.remove('hidden');
    confirmBtn.querySelector('.btn-spinner')?.classList.add('hidden');
  }

  if (modal) modal.classList.remove('hidden');
}

function closeModal() {
  state.activeModalAction = null;
  const modal = document.getElementById('confirmation-modal');
  if (modal) modal.classList.add('hidden');
}

async function executeConfirmedAction() {
  if (!state.activeModalAction) return;

  const { entity_id, domain, service, cardElement } = state.activeModalAction;
  const confirmBtn = document.getElementById('modal-confirm-btn');

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.querySelector('.btn-text')?.classList.add('hidden');
    confirmBtn.querySelector('.btn-spinner')?.classList.remove('hidden');
  }

  try {
    const res = await fetch(API.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id,
        domain,
        service,
        confirmed: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || 'Action failed');
    }

    showToast(`Executed: ${service} on ${entity_id}`, 'success');
    closeModal();
    // Refresh entity states after slight delay to allow HA device transition
    setTimeout(() => fetchEntities(), 600);
  } catch (err) {
    console.error('Action error:', err);
    showToast(`Error: ${err.message}`, 'error');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.querySelector('.btn-text')?.classList.remove('hidden');
      confirmBtn.querySelector('.btn-spinner')?.classList.add('hidden');
    }
  }
}

async function executeAction({ entity_id, domain, service, confirmed, cardElement }) {
  if (cardElement) cardElement.classList.add('entity-loading');

  try {
    const res = await fetch(API.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id,
        domain,
        service,
        confirmed,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || 'Action failed');
    }

    showToast(`Updated ${entity_id}`, 'success');
    // Refresh entity states
    setTimeout(() => fetchEntities(), 400);
  } catch (err) {
    console.error('Direct action error:', err);
    showToast(`Action failed: ${err.message}`, 'error');
  } finally {
    if (cardElement) cardElement.classList.remove('entity-loading');
  }
}

/* ==========================================================================
   Schedule & Tasks Integration & UI
   ========================================================================== */

async function fetchSchedule(isBackground = false) {
  const pill = document.getElementById('schedule-status-pill');
  if (!isBackground && pill) {
    updateStatusPill(pill, 'loading', 'Updating...');
  }

  try {
    const res = await fetch(API.schedule);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch schedule');
    }

    state.scheduleItems = data.items || [];
    updateStatusPill(pill, 'healthy', `${state.scheduleItems.length} Items`);
    renderSchedule();
  } catch (err) {
    console.error('Schedule fetch error:', err);
    updateStatusPill(pill, 'degraded', 'Schedule Offline');
    if (!state.scheduleItems.length) {
      const container = document.getElementById('schedule-container');
      if (container) {
        container.innerHTML = `
          <div class="error-banner">
            <strong>Google Calendar / Tasks unavailable</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }
}

function renderSchedule() {
  const container = document.getElementById('schedule-container');
  if (!container) return;

  if (state.scheduleItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>No upcoming events or tasks</span>
      </div>
    `;
    return;
  }

  const itemsHtml = state.scheduleItems.map((item) => {
    const isCalendar = item.type === 'calendar';
    const isCompleted = item.status === 'completed';
    const timeFormatted = formatScheduleTime(item);

    return `
      <div class="schedule-item ${isCalendar ? 'type-calendar' : 'type-task'}">
        <div class="schedule-badge-wrap">
          <span class="time-badge">${escapeHtml(timeFormatted.time)}</span>
          <span class="date-badge">${escapeHtml(timeFormatted.date)}</span>
        </div>
        <div class="schedule-content">
          <div class="schedule-title">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="schedule-meta">
            <span>${isCalendar ? '📅 Event' : '☑️ Task'}</span>
            ${item.source ? `<span>&bull; ${escapeHtml(item.source)}</span>` : ''}
            ${item.location ? `<span>&bull; 📍 ${escapeHtml(item.location)}</span>` : ''}
          </div>
        </div>
        ${!isCalendar ? `
          <div class="task-checkbox-mock ${isCompleted ? 'checked' : ''}" title="Read-only indicator">
            ${isCompleted ? '✓' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="schedule-list">${itemsHtml}</div>`;
}

function formatScheduleTime(item) {
  if (item.allDay) {
    const d = item.start ? new Date(item.start) : new Date();
    return {
      time: 'ALL DAY',
      date: isNaN(d) ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  }

  const d = new Date(item.start);
  if (isNaN(d.getTime())) {
    return { time: '--:--', date: 'Today' };
  }

  return {
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

/* ==========================================================================
   CartSync Grocery Checklist Integration & UI (Read-Only v1)
   ========================================================================== */

async function fetchGroceries(isBackground = false) {
  const pill = document.getElementById('groceries-status-pill');
  if (!isBackground && pill) {
    updateStatusPill(pill, 'loading', 'Updating...');
  }

  try {
    const res = await fetch(API.groceries);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch groceries');
    }

    state.groceryItems = data.items || [];
    updateStatusPill(pill, 'healthy', `${state.groceryItems.length} Items`);
    renderGroceries();
  } catch (err) {
    console.error('Groceries fetch error:', err);
    updateStatusPill(pill, 'warning', 'CartSync Offline');
    if (!state.groceryItems.length) {
      const container = document.getElementById('groceries-container');
      if (container) {
        container.innerHTML = `
          <div class="error-banner">
            <strong>CartSync service unreachable</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }
}

function renderGroceries() {
  const container = document.getElementById('groceries-container');
  if (!container) return;

  if (state.groceryItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span>Grocery list is empty</span>
      </div>
    `;
    return;
  }

  const itemsHtml = state.groceryItems.map((item) => {
    const qtyText = item.quantity ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}` : '';
    return `
      <div class="grocery-item">
        <div class="grocery-item-left">
          <div class="grocery-checkbox-mock ${item.completed ? 'checked' : ''}" title="Read-only indicator in v1">
            ${item.completed ? '✓' : ''}
          </div>
          <div class="grocery-item-details">
            <div class="grocery-name">${escapeHtml(item.name)}</div>
            ${item.note ? `<div class="grocery-note">${escapeHtml(item.note)}</div>` : ''}
          </div>
        </div>
        <div class="grocery-tags">
          ${qtyText ? `<span class="grocery-qty">${escapeHtml(qtyText)}</span>` : ''}
          ${item.category ? `<span class="grocery-category">${escapeHtml(item.category)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="grocery-list">${itemsHtml}</div>`;
}

/* ==========================================================================
   Helpers: UI Status Pills, Toasts, Escaping
   ========================================================================== */

function updateStatusPill(pillEl, stateClass, text) {
  if (!pillEl) return;
  pillEl.className = `status-pill status-${stateClass}`;
  pillEl.textContent = text;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
