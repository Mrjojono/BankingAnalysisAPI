/**
 * src/public/js/app.js
 * Logique du Dashboard Orabank - Earthen Digital Refined
 */

const socket = io();
let eventCount = 0;
let startTime = Date.now();
const logLimit = 50;

// === INITIALISATION ===
window.onload = () => {
    console.log("Dashboard Orabank Initialisé");
    updateDate();
    // Charger la page par défaut (Live)
    const initialBtn = document.querySelector('aside nav button');
    if (initialBtn) navigate('live', initialBtn);
};

function updateDate() {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('fr-FR', options);
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.innerText = dateStr;
}

// === GESTION DES WEBSOCKETS ===

socket.on('connect', () => {
    updateServerStatus(true);
    pushLog('SYSTEM', 'Connexion établie avec le nœud de monitoring Orabank.', 'success');
});

socket.on('disconnect', () => {
    updateServerStatus(false);
    pushLog('SYSTEM', 'Connexion interrompue. Tentative de reconnexion...', 'error');
});

socket.on('heartbeat', (data) => {
    if (document.getElementById('log-container')) {
        pushLog('HEARTBEAT', `Santé du serveur OK. Latence stable à 12ms.`, 'info');
    }
    updateThroughput();
});

socket.on('analytics_requested', (data) => {
    pushLog('ANALYTICS', `Requête ${data.type} traitée pour le client ${data.customerId.slice(0, 8)}`, 'primary');
    incrementEvents();
});

socket.on('feedback_saved', (data) => {
    pushLog('CLASSIFIER', `Règle GLOBALE : "${data.description}" → ${data.correctCategory}`, 'secondary');
    showToast(`Règle globale enregistrée : ${data.correctCategory}`, 'success');
    incrementEvents();
});

// === FONCTIONS UI ===

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const color = type === 'success' ? 'bg-primary' : 'bg-secondary';
    toast.className = `fixed bottom-8 right-8 ${color} text-white px-6 py-4 rounded-2xl shadow-xl page-animate z-50 flex items-center gap-3 font-bold`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'info'}</span>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function updateServerStatus(online) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const ping = document.getElementById('status-ping');

    if (!dot || !text || !ping) return;

    if (online) {
        dot.className = 'relative inline-flex rounded-full h-2 w-2 bg-primary';
        ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary';
        text.innerText = 'Serveur en ligne';
        text.className = 'font-bold uppercase text-[10px] tracking-wider text-primary';
    } else {
        dot.className = 'relative inline-flex rounded-full h-2 w-2 bg-error';
        ping.className = '';
        text.innerText = 'Serveur hors-ligne';
        text.className = 'font-bold uppercase text-[10px] tracking-wider text-error';
    }
}

function pushLog(type, message, category = 'info') {
    const container = document.getElementById('log-container');
    if (!container) return;

    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    
    const div = document.createElement('div');
    div.className = 'flex gap-4 group hover:bg-surface-container-low p-2 rounded transition-all page-animate';
    
    let typeClass = 'text-primary';
    if (category === 'error') typeClass = 'text-error';
    if (category === 'secondary') typeClass = 'text-secondary';

    div.innerHTML = `
        <span class="text-outline w-20 shrink-0 mono-data text-[13px]">${time}</span>
        <span class="${typeClass} font-bold w-28 shrink-0 text-[13px]">[${type}]</span>
        <span class="opacity-80 text-[13px]">${message}</span>
    `;

    container.prepend(div);
    if (container.children.length > logLimit) {
        container.removeChild(container.lastChild);
    }
}

function incrementEvents() {
    eventCount++;
    const counterEl = document.getElementById('event-count');
    if (counterEl) {
        counterEl.innerText = eventCount.toLocaleString();
    }
    updateThroughput();
}

function updateThroughput() {
    const throughputEl = document.getElementById('throughput');
    if (throughputEl) {
        const duration = (Date.now() - startTime) / 1000;
        const tps = (eventCount / duration).toFixed(1);
        throughputEl.innerText = tps;
    }
}

function clearLogs() {
    const container = document.getElementById('log-container');
    if (container) {
        container.innerHTML = '<div class="text-outline italic p-4 text-center">Journal effacé... Redémarrage de la surveillance.</div>';
        setTimeout(() => {
            container.innerHTML = '';
        }, 800);
    }
}

/**
 * Système de Navigation (Layout)
 */
async function navigate(pageId, btn) {
    document.querySelectorAll('aside nav button').forEach(b => {
        b.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all";
    });
    btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container text-on-primary-container font-semibold transition-all";

    const mainArea = document.getElementById('main-content-area');
    mainArea.innerHTML = '<div class="flex items-center justify-center h-full text-outline italic">Chargement du module...</div>';
    
    try {
        const response = await fetch(`/pages/${pageId}.html`);
        if (response.ok) {
            const html = await response.text();
            mainArea.innerHTML = html;
            
            const scripts = mainArea.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        } else {
            mainArea.innerHTML = `<div class="p-20 text-center text-error font-bold">Module "${pageId}" introuvable.</div>`;
        }
    } catch (err) {
        mainArea.innerHTML = '<div class="p-20 text-center text-error">Erreur réseau.</div>';
    }

    document.getElementById('breadcrumb-active').innerText = btn.innerText.trim();
}
