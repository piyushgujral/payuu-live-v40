/* ====================================================
   PAYUU LIVE DASHBOARD - MASTER JAVASCRIPT ENGINE
   ==================================================== */

const STATUS = {
    AWAITING_PAYMENT: "Awaiting Payment",
    AWAITING_VERIFICATION: "Awaiting Verification",
    APPROVED: "Approved",
    REJECTED: "Rejected"
};

const DEFAULT_SETTINGS = {
    websiteName: "Payuu Live",
    streamerName: "Payuu Live",
    tagline: "Every contribution helps upgrade the stream, improve the gaming setup, and create better content for the community. Thank you for being part of the journey! ❤️🎮",
    logoUrl: "assets/images/logo.png",
    faviconUrl: "assets/images/favicon.png",
    
    upiId: "payalgupta545757-1@okicici",
    qrCodeUrl: "",
    suggestedAmounts: [40, 50, 100, 250, 500, 1000],
    minAmount: 40,
    maxAmount: 50000,
    
    goalTarget: 10000,
    goalTitle: "Monthly Goal",
    currencySymbol: "₹",
    thankYouMessage: "Your payment request has been submitted. Please wait while Payuu verifies your payment.",
    fallbackMessage: "Supported the stream!",
    
    socials: {
        kick: "https://kick.com/payuu-25",
        instagram: "https://www.instagram.com/payuulive",
        youtube: "https://www.youtube.com/@payuulive",
        discord: "https://discord.gg/nSZCe9mS62",
        facebook: "",
        twitter: "",
        website: ""
    },
    
    overlay: {
        duration: 12, // Default 12s
        confetti: true,
        sound: true,
        volume: 0.8,
        animation: "bounce"
    },

    voice: {
        enabled: true,
        language: "en-IN",
        gender: "female",
        style: "excited",
        volumePct: 90,
        pitch: 1.2,
        rate: 1.0,
        pauseMs: 500,
        script: "🔥 New Support Received!\n\n{SupporterName} has supported the stream.\n\nAmount: {Currency}{Amount}.\n\n{Message}\n\nThank you for supporting {WebsiteName}."
    },

    emailNotifications: {
        enabled: true,
        serviceId: "",
        templateId: "",
        publicKey: "",
        senderName: "Payuu Live Dashboard",
        replyTo: "support@payuulive.com",
        subject: "🔔 New Support Request - Payuu Live"
    },
    
    homeTexts: {
        welcomeTitle: "PAYUU LIVE",
        welcomeSubtitle: "CREATOR SUPPORT DASHBOARD",
        supportBtnText: "SUPPORT NOW",
        footerText: "Made with ❤️ by Payuu Live"
    }
};

// ====================================================
// MODULE 4: PLUGGABLE VOICE MANAGER ENGINE
// ====================================================
class VoiceManager {
    constructor() {
        this.queue = [];
        this.isSpeaking = false;
        this.synth = window.speechSynthesis || null;

        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => { this.getAvailableVoices(); };
        }
    }

    getAvailableVoices() {
        return this.synth ? this.synth.getVoices() : [];
    }

    constructSpeechLines(template, item, settings) {
        const dateStr = item.dateSubmitted || (item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : new Date().toLocaleDateString());
        const timeStr = item.timeSubmitted || (item.approvedAt ? new Date(item.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString());
        const supporterMsg = item.msg ? item.msg.trim() : "";

        let lines = template.split('\n');
        let processedLines = [];

        lines.forEach(line => {
            if (line.includes('{Message}') && !supporterMsg) {
                return;
            }

            let l = line
                .replace(/\{SupporterName\}/g, item.name || "A Supporter")
                .replace(/\{Amount\}/g, item.amount || 0)
                .replace(/\{Message\}/g, supporterMsg)
                .replace(/\{Currency\}/g, settings.currencySymbol || "₹")
                .replace(/\{StreamerName\}/g, settings.streamerName || "Payuu Live")
                .replace(/\{WebsiteName\}/g, settings.websiteName || "Payuu Live")
                .replace(/\{Date\}/g, dateStr)
                .replace(/\{Time\}/g, timeStr);

            if (l.trim().length > 0) {
                processedLines.push(l.trim());
            }
        });

        return processedLines;
    }

    speak(item, settings, onComplete) {
        const vCfg = settings.voice || {};
        if (!this.synth || vCfg.enabled === false) {
            if (onComplete) onComplete();
            return;
        }

        const scriptTemplate = vCfg.script && vCfg.script.trim().length > 0 ? vCfg.script : DEFAULT_SETTINGS.voice.script;
        const lines = this.constructSpeechLines(scriptTemplate, item, settings);

        if (lines.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        this.queue.push({ lines, vCfg, onComplete });
        this.processQueue();
    }

    processQueue() {
        if (this.isSpeaking || this.queue.length === 0) return;

        this.isSpeaking = true;
        const current = this.queue.shift();

        this.synth.cancel();

        const pauseMs = Number(current.vCfg.pauseMs) !== undefined ? Number(current.vCfg.pauseMs) : 500;
        let lineIdx = 0;

        const speakNextLine = () => {
            if (lineIdx >= current.lines.length) {
                this.isSpeaking = false;
                if (current.onComplete) current.onComplete();
                this.processQueue();
                return;
            }

            const currentText = current.lines[lineIdx];
            const utterance = new SpeechSynthesisUtterance(currentText);

            const lang = current.vCfg.language === "mixed" ? "en-IN" : (current.vCfg.language || "en-IN");
            utterance.lang = lang;
            utterance.volume = (current.vCfg.volumePct !== undefined ? current.vCfg.volumePct : 90) / 100;
            utterance.rate = Number(current.vCfg.rate) || 1.0;

            if (current.vCfg.gender === "male") {
                utterance.pitch = Number(current.vCfg.pitch) ? Number(current.vCfg.pitch) * 0.7 : 0.8;
            } else {
                utterance.pitch = Number(current.vCfg.pitch) || 1.2;
            }

            const voices = this.getAvailableVoices();
            const matched = voices.find(v => v.lang === lang || v.lang.replace('_', '-').startsWith(lang.split('-')[0]));
            if (matched) utterance.voice = matched;

            utterance.onend = () => {
                lineIdx++;
                setTimeout(speakNextLine, pauseMs);
            };

            utterance.onerror = () => {
                lineIdx++;
                setTimeout(speakNextLine, pauseMs);
            };

            this.synth.speak(utterance);
        };

        speakNextLine();
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
            this.queue = [];
        }
    }
}

const voiceManagerEngine = new VoiceManager();

const STATE = {
    goalTarget: 10000,
    goalCurrent: 0,
    selectedAmount: 50,
    topSupporter: { name: "No Top Supporter", amount: 0, isPinned: false },
    upiId: "payalgupta545757-1@okicici",
    payeeName: "Payuu Live",
    approvedSupporters: [],
    pendingQueue: [],
    adminList: [],
    auditLogs: [],
    notificationLogs: [],
    activeSubmission: null,
    settings: { ...DEFAULT_SETTINGS },
    currentAdmin: null
};

let chartInstances = {};
let qrCodeInstance = null;

function updateVoiceScriptPreview() {
    const scriptVal = document.getElementById('set-voice-script')?.value || DEFAULT_SETTINGS.voice.script;
    const previewContainer = document.getElementById('voice-script-preview-text');
    
    if (previewContainer) {
        const sampleItem = {
            name: "Rahul",
            amount: 500,
            msg: "Love your stream!",
            dateSubmitted: new Date().toLocaleDateString(),
            timeSubmitted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const lines = voiceManagerEngine.constructSpeechLines(scriptVal, sampleItem, STATE.settings);
        previewContainer.textContent = lines.join('\n');
    }
}

function applySettingsToUI(s) {
    if (!s) return;
    STATE.settings = { ...DEFAULT_SETTINGS, ...s };
    const cfg = STATE.settings;

    document.getElementById('page-title').textContent = `${cfg.websiteName} | Official Creator Support Hub`;
    document.getElementById('dyn-nav-brand').innerHTML = `${escapeHtml(cfg.websiteName)} <span>LIVE</span>`;
    document.getElementById('dyn-welcome-title').textContent = cfg.homeTexts.welcomeTitle || cfg.websiteName;
    document.getElementById('dyn-welcome-subtitle').textContent = cfg.homeTexts.welcomeSubtitle;
    document.getElementById('dyn-hero-title').textContent = cfg.websiteName;
    document.getElementById('dyn-hero-tagline').textContent = cfg.tagline;

    if (cfg.logoUrl) {
        document.querySelectorAll('.dynamic-logo').forEach(img => img.src = cfg.logoUrl);
    }
    if (cfg.faviconUrl) {
        document.getElementById('favicon-link').href = cfg.faviconUrl;
    }

    STATE.upiId = cfg.upiId;
    STATE.payeeName = cfg.streamerName;
    STATE.goalTarget = Number(cfg.goalTarget || 10000);
    document.getElementById('upi-id-text').textContent = cfg.upiId;
    document.getElementById('dyn-goal-title').textContent = cfg.goalTitle;
    document.getElementById('dyn-btn-text').textContent = cfg.homeTexts.supportBtnText;
    document.getElementById('warn-min-amt').textContent = cfg.minAmount;

    document.querySelectorAll('.curr-sym').forEach(el => el.textContent = cfg.currencySymbol || '₹');

    if (cfg.emailNotifications && cfg.emailNotifications.publicKey && window.emailjs) {
        try {
            emailjs.init(cfg.emailNotifications.publicKey);
        } catch (e) { console.error("EmailJS Init Error:", e); }
    }

    const tiersContainer = document.getElementById('tier-cards-container');
    if (tiersContainer && Array.isArray(cfg.suggestedAmounts)) {
        const tierLabels = ["Rookie 🎮", "Gamer ⭐", "Pro 🔥", "Elite 💎", "Champion 👑", "Legend 🏆"];
        const tierBadges = ["🎮", "⭐", "🔥", "💎", "👑", "🏆"];
        
        tiersContainer.innerHTML = '';
        cfg.suggestedAmounts.forEach((amt, idx) => {
            const card = document.createElement('div');
            card.className = `donation-card ${amt === STATE.selectedAmount ? 'active' : ''}`;
            card.setAttribute('data-value', amt);
            card.innerHTML = `
                <div class="tier-badge-icon">${tierBadges[idx % tierBadges.length]}</div>
                <div class="tier-amount-display"><span class="curr-sym">${cfg.currencySymbol || '₹'}</span>${amt}</div>
                <div class="tier-name-label">${tierLabels[idx % tierLabels.length]}</div>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.donation-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                STATE.selectedAmount = Number(amt);
                const customInput = document.getElementById('custom-amount');
                if (customInput) customInput.value = '';
                document.getElementById('amount-warning').style.display = 'none';
                updateRealQRCode();
            });
            tiersContainer.appendChild(card);
        });
    }

    if (cfg.socials) {
        const k = cfg.socials;
        if (k.kick) {
            document.getElementById('nav-link-kick').href = k.kick;
            document.getElementById('foot-link-kick').href = k.kick;
            document.getElementById('social-card-kick').href = k.kick;
            document.getElementById('btn-kick-sidebar').href = k.kick;
        }
        if (k.instagram) {
            document.getElementById('nav-link-insta').href = k.instagram;
            document.getElementById('foot-link-insta').href = k.instagram;
            document.getElementById('social-card-insta').href = k.instagram;
        }
        if (k.youtube) {
            document.getElementById('nav-link-yt').href = k.youtube;
            document.getElementById('foot-link-yt').href = k.youtube;
            document.getElementById('social-card-yt').href = k.youtube;
        }
        if (k.discord) {
            document.getElementById('nav-link-discord').href = k.discord;
            document.getElementById('foot-link-discord').href = k.discord;
            document.getElementById('social-card-discord').href = k.discord;
        }
    }

    document.getElementById('dyn-footer-brand').textContent = cfg.websiteName;
    document.getElementById('dyn-footer-copy-brand').textContent = cfg.websiteName;
    document.getElementById('dyn-footer-love-text').textContent = cfg.homeTexts.footerText;
    document.getElementById('dyn-thankyou-desc').innerHTML = `${escapeHtml(cfg.thankYouMessage)}<br>Please wait while ${escapeHtml(cfg.streamerName)} verifies your payment.`;

    updateVoiceScriptPreview();
    renderUI();
}

function renderUI() {
    STATE.goalCurrent = STATE.approvedSupporters.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    let pinnedItem = STATE.approvedSupporters.find(item => item.pinned === true);
    let highestItem = { name: "No Top Supporter", amount: 0, isPinned: false };

    if (pinnedItem) {
        highestItem = { name: pinnedItem.name, amount: Number(pinnedItem.amount), isPinned: true };
    } else {
        STATE.approvedSupporters.forEach(item => {
            if (Number(item.amount) > highestItem.amount) {
                highestItem = { name: item.name, amount: Number(item.amount), isPinned: false };
            }
        });
    }
    STATE.topSupporter = highestItem;

    const sym = STATE.settings.currencySymbol || '₹';

    const raisedEl = document.getElementById('raised-text');
    const targetEl = document.getElementById('target-text');
    const percentageEl = document.getElementById('percentage-text');
    const remainingEl = document.getElementById('remaining-text');
    const goalBar = document.getElementById('goal-bar');

    if (raisedEl) raisedEl.textContent = `${sym}${STATE.goalCurrent.toLocaleString()}`;
    if (targetEl) targetEl.textContent = `Target ${sym}${STATE.goalTarget.toLocaleString()}`;
    
    const percentage = Math.min(Math.round((STATE.goalCurrent / STATE.goalTarget) * 100), 100);
    const remaining = Math.max(STATE.goalTarget - STATE.goalCurrent, 0);

    if (goalBar) goalBar.style.width = `${percentage}%`;
    if (percentageEl) percentageEl.textContent = `${percentage}% Completed`;
    if (remainingEl) remainingEl.textContent = `${sym}${remaining.toLocaleString()} Remaining`;

    const statSupporters = document.getElementById('stat-total-supporters');
    const statRaised = document.getElementById('stat-total-raised');
    const statHighest = document.getElementById('stat-highest-donation');

    if (statSupporters) statSupporters.textContent = STATE.approvedSupporters.length;
    if (statRaised) statRaised.textContent = `${sym}${STATE.goalCurrent.toLocaleString()}`;
    if (statHighest) statHighest.textContent = `${sym}${STATE.topSupporter.amount.toLocaleString()}`;

    const topNameEl = document.getElementById('top-name');
    const topAmountEl = document.getElementById('top-amount');
    const topAvatarEl = document.getElementById('top-avatar-letter');
    const topBadgeEl = document.getElementById('top-supporter-badge');

    if (topNameEl) topNameEl.textContent = STATE.topSupporter.name;
    if (topAmountEl) topAmountEl.textContent = `${sym}${STATE.topSupporter.amount.toLocaleString()}`;
    if (topAvatarEl) {
        topAvatarEl.textContent = STATE.topSupporter.name !== "No Top Supporter" ? STATE.topSupporter.name.charAt(0).toUpperCase() : "?";
    }
    if (topBadgeEl) {
        topBadgeEl.textContent = STATE.topSupporter.isPinned ? "📌 PINNED" : "LEGEND";
    }

    const feed = document.getElementById('supporters-feed');
    if (feed) {
        feed.innerHTML = '';
        if (STATE.approvedSupporters.length === 0) {
            feed.innerHTML = '<div style="color: var(--text-sub); font-size:0.8rem; text-align:center;">No recent superchats yet.</div>';
        } else {
            const displayFeedList = [...STATE.approvedSupporters].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
            displayFeedList.slice(0, 10).forEach(s => {
                const card = document.createElement('div');
                card.className = 'feed-card';
                card.innerHTML = `
                    <div class="feed-card-header">
                        <span class="feed-card-user">${s.pinned ? '📌 ' : ''}${escapeHtml(s.name)}</span>
                        <span class="feed-card-amount">${sym}${s.amount}</span>
                    </div>
                    <div class="feed-card-body">${escapeHtml(s.msg || STATE.settings.fallbackMessage)}</div>
                `;
                feed.appendChild(card);
            });
        }
    }

    renderPendingQueue();
    renderApprovedAdminList();
    renderAdminsList();
    renderNotificationLogs();
    renderAuditLogs();
    renderAnalyticsDashboard();
    updateRealQRCode();
}

function renderAnalyticsDashboard() {
    const sym = STATE.settings.currencySymbol || '₹';
    const approved = STATE.approvedSupporters || [];
    const pending = STATE.pendingQueue || [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - (7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let revToday = 0, revYesterday = 0, revWeek = 0, revMonth = 0, revAll = 0;
    let hourlyHeatmap = new Array(24).fill(0);
    let amountsList = [];

    let topToday = { name: "-", amount: 0 };
    let topMonth = { name: "-", amount: 0 };
    let largestMsg = { name: "-", len: 0 };

    approved.forEach(item => {
        const amt = Number(item.amount) || 0;
        const ts = item.approvedAt || item.timestamp || 0;
        revAll += amt;
        amountsList.push(amt);

        if (ts >= todayStart) {
            revToday += amt;
            if (amt > topToday.amount) topToday = { name: item.name, amount: amt };
        } else if (ts >= yesterdayStart && ts < todayStart) {
            revYesterday += amt;
        }

        if (ts >= weekStart) revWeek += amt;
        if (ts >= monthStart) {
            revMonth += amt;
            if (amt > topMonth.amount) topMonth = { name: item.name, amount: amt };
        }

        if (ts > 0) {
            const hour = new Date(ts).getHours();
            hourlyHeatmap[hour] += amt;
        }

        if (item.msg && item.msg.length > largestMsg.len) {
            largestMsg = { name: item.name, len: item.msg.length };
        }
    });

    if (document.getElementById('an-rev-today')) document.getElementById('an-rev-today').textContent = `${sym}${revToday.toLocaleString()}`;
    if (document.getElementById('an-rev-yesterday')) document.getElementById('an-rev-yesterday').textContent = `${sym}${revYesterday.toLocaleString()}`;
    if (document.getElementById('an-rev-week')) document.getElementById('an-rev-week').textContent = `${sym}${revWeek.toLocaleString()}`;
    if (document.getElementById('an-rev-month')) document.getElementById('an-rev-month').textContent = `${sym}${revMonth.toLocaleString()}`;
    if (document.getElementById('an-rev-all')) document.getElementById('an-rev-all').textContent = `${sym}${revAll.toLocaleString()}`;

    amountsList.sort((a, b) => a - b);
    const count = amountsList.length;
    const avg = count > 0 ? Math.round(revAll / count) : 0;
    const highest = count > 0 ? amountsList[count - 1] : 0;
    const lowest = count > 0 ? amountsList[0] : 0;
    
    let median = 0;
    if (count > 0) {
        median = count % 2 === 0 ? Math.round((amountsList[count / 2 - 1] + amountsList[count / 2]) / 2) : amountsList[Math.floor(count / 2)];
    }

    if (document.getElementById('an-stat-approved')) document.getElementById('an-stat-approved').textContent = approved.length;
    if (document.getElementById('an-stat-pending')) document.getElementById('an-stat-pending').textContent = pending.length;
    if (document.getElementById('an-stat-rejected')) document.getElementById('an-stat-rejected').textContent = "0";
    if (document.getElementById('an-stat-avg')) document.getElementById('an-stat-avg').textContent = `${sym}${avg.toLocaleString()}`;
    if (document.getElementById('an-stat-median')) document.getElementById('an-stat-median').textContent = `${sym}${median.toLocaleString()}`;
    if (document.getElementById('an-stat-highest')) document.getElementById('an-stat-highest').textContent = `${sym}${highest.toLocaleString()}`;
    if (document.getElementById('an-stat-lowest')) document.getElementById('an-stat-lowest').textContent = `${sym}${lowest.toLocaleString()}`;

    const target = STATE.goalTarget || 10000;
    const pct = Math.min(Math.round((revMonth / target) * 100), 100);
    const rem = Math.max(target - revMonth, 0);

    let estCompletion = "N/A";
    const dayOfMonth = now.getDate();
    if (revMonth > 0 && rem > 0 && dayOfMonth > 0) {
        const dailyRate = revMonth / dayOfMonth;
        const daysNeeded = Math.ceil(rem / dailyRate);
        const estDate = new Date();
        estDate.setDate(now.getDate() + daysNeeded);
        estCompletion = estDate.toLocaleDateString();
    } else if (rem === 0) {
        estCompletion = "Goal Reached! 🎉";
    }

    if (document.getElementById('an-goal-target')) document.getElementById('an-goal-target').textContent = `${sym}${target.toLocaleString()}`;
    if (document.getElementById('an-goal-pct')) document.getElementById('an-goal-pct').textContent = `${pct}%`;
    if (document.getElementById('an-goal-rem')) document.getElementById('an-goal-rem').textContent = `${sym}${rem.toLocaleString()}`;
    if (document.getElementById('an-goal-est')) document.getElementById('an-goal-est').textContent = estCompletion;

    let maxHour = 0, maxHourVal = 0;
    hourlyHeatmap.forEach((val, h) => {
        if (val > maxHourVal) { maxHourVal = val; maxHour = h; }
    });
    const peakHourText = maxHourVal > 0 ? `${maxHour}:00 - ${maxHour + 1}:00 (${sym}${maxHourVal})` : "N/A";

    if (document.getElementById('an-top-today')) document.getElementById('an-top-today').textContent = topToday.amount > 0 ? `${topToday.name} (${sym}${topToday.amount})` : "-";
    if (document.getElementById('an-top-month')) document.getElementById('an-top-month').textContent = topMonth.amount > 0 ? `${topMonth.name} (${sym}${topMonth.amount})` : "-";
    if (document.getElementById('an-peak-hour')) document.getElementById('an-peak-hour').textContent = peakHourText;
    if (document.getElementById('an-largest-msg')) document.getElementById('an-largest-msg').textContent = largestMsg.len > 0 ? `${largestMsg.name} (${largestMsg.len} chars)` : "-";

    const heatmapGrid = document.getElementById('heatmap-grid');
    if (heatmapGrid) {
        heatmapGrid.innerHTML = '';
        const maxHeat = Math.max(...hourlyHeatmap, 1);
        for (let h = 0; h < 24; h++) {
            const val = hourlyHeatmap[h];
            const intensity = val > 0 ? Math.min(val / maxHeat, 1) : 0;
            const cell = document.createElement('div');
            cell.style.padding = "6px 2px";
            cell.style.textAlign = "center";
            cell.style.fontSize = "0.65rem";
            cell.style.borderRadius = "4px";
            cell.style.background = val > 0 ? `rgba(255, 215, 0, ${0.2 + intensity * 0.8})` : "rgba(255,255,255,0.05)";
            cell.style.color = val > 0 ? "#000" : "var(--text-sub)";
            cell.style.fontWeight = val > 0 ? "800" : "normal";
            cell.title = `${h}:00 - ₹${val}`;
            cell.textContent = `${h}h`;
            heatmapGrid.appendChild(cell);
        }
    }

    if (window.Chart && document.getElementById('chart-revenue-daily')) {
        renderDailyChart(approved);
        renderTierDistributionChart(approved);
    }
}

function renderDailyChart(approvedData) {
    const ctx = document.getElementById('chart-revenue-daily').getContext('2d');
    const last7Days = [];
    const revenueByDay = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        last7Days.push(dayStr);

        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + 86400000;

        const daySum = approvedData.reduce((sum, item) => {
            const ts = item.approvedAt || item.timestamp || 0;
            return (ts >= dayStart && ts < dayEnd) ? sum + Number(item.amount || 0) : sum;
        }, 0);

        revenueByDay.push(daySum);
    }

    if (chartInstances.daily) chartInstances.daily.destroy();

    chartInstances.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Daily Revenue (₹)',
                data: revenueByDay,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#A0B3C6' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#A0B3C6' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function renderTierDistributionChart(approvedData) {
    const ctx = document.getElementById('chart-tier-distribution').getContext('2d');
    const tiers = { "Rookie (₹40)": 0, "Gamer (₹50)": 0, "Pro (₹100)": 0, "Elite (₹250)": 0, "Hero (₹500+)": 0 };

    approvedData.forEach(item => {
        const amt = Number(item.amount) || 0;
        if (amt >= 500) tiers["Hero (₹500+)"]++;
        else if (amt >= 250) tiers["Elite (₹250)"]++;
        else if (amt >= 100) tiers["Pro (₹100)"]++;
        else if (amt >= 50) tiers["Gamer (₹50)"]++;
        else tiers["Rookie (₹40)"]++;
    });

    if (chartInstances.tier) chartInstances.tier.destroy();

    chartInstances.tier = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(tiers),
            datasets: [{
                data: Object.values(tiers),
                backgroundColor: ['#00F0FF', '#10B981', '#FFD700', '#FF007F', '#A855F7']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#A0B3C6', font: { size: 10 } } } }
        }
    });
}

function populateSettingsForm() {
    const s = STATE.settings;
    document.getElementById('set-website-name').value = s.websiteName || '';
    document.getElementById('set-streamer-name').value = s.streamerName || '';
    document.getElementById('set-tagline').value = s.tagline || '';
    document.getElementById('set-upi-id').value = s.upiId || '';
    document.getElementById('set-suggested-amounts').value = Array.isArray(s.suggestedAmounts) ? s.suggestedAmounts.join(', ') : '';
    document.getElementById('set-min-amount').value = s.minAmount || 40;
    document.getElementById('set-max-amount').value = s.maxAmount || 50000;
    document.getElementById('set-goal-target').value = s.goalTarget || 10000;
    document.getElementById('set-goal-title').value = s.goalTitle || '';
    document.getElementById('set-currency-symbol').value = s.currencySymbol || '₹';
    document.getElementById('set-thankyou-msg').value = s.thankYouMessage || '';

    if (s.emailNotifications) {
        document.getElementById('set-email-enabled').value = String(s.emailNotifications.enabled !== false);
        document.getElementById('set-emailjs-service').value = s.emailNotifications.serviceId || '';
        document.getElementById('set-emailjs-template').value = s.emailNotifications.templateId || '';
        document.getElementById('set-emailjs-publickey').value = s.emailNotifications.publicKey || '';
        document.getElementById('set-email-sender-name').value = s.emailNotifications.senderName || 'Payuu Live Dashboard';
        document.getElementById('set-email-reply-to').value = s.emailNotifications.replyTo || 'support@payuulive.com';
        document.getElementById('set-email-subject').value = s.emailNotifications.subject || '🔔 New Support Request - Payuu Live';
    }

    if (s.voice) {
        document.getElementById('set-voice-enabled').value = String(s.voice.enabled !== false);
        document.getElementById('set-voice-language').value = s.voice.language || 'en-IN';
        document.getElementById('set-voice-gender').value = s.voice.gender || 'female';
        document.getElementById('set-voice-style').value = s.voice.style || 'excited';
        document.getElementById('set-voice-pause').value = String(s.voice.pauseMs !== undefined ? s.voice.pauseMs : 500);
        document.getElementById('set-voice-volume-pct').value = s.voice.volumePct !== undefined ? s.voice.volumePct : 90;
        document.getElementById('set-voice-pitch').value = s.voice.pitch || 1.2;
        document.getElementById('set-voice-rate').value = s.voice.rate || 1.0;
        document.getElementById('set-voice-script').value = s.voice.script || DEFAULT_SETTINGS.voice.script;
    }

    if (s.socials) {
        document.getElementById('set-social-kick').value = s.socials.kick || '';
        document.getElementById('set-social-insta').value = s.socials.instagram || '';
        document.getElementById('set-social-yt').value = s.socials.youtube || '';
        document.getElementById('set-social-discord').value = s.socials.discord || '';
        document.getElementById('set-social-fb').value = s.socials.facebook || '';
        document.getElementById('set-social-twitter').value = s.socials.twitter || '';
        document.getElementById('set-social-website').value = s.socials.website || '';
    }

    if (s.overlay) {
        document.getElementById('set-overlay-duration').value = s.overlay.duration || 12;
        document.getElementById('set-overlay-volume').value = s.overlay.volume || 0.8;
        document.getElementById('set-overlay-confetti').value = String(s.overlay.confetti);
        document.getElementById('set-overlay-sound').value = String(s.overlay.sound);
        document.getElementById('set-overlay-animation').value = s.overlay.animation || 'bounce';
    }

    if (s.homeTexts) {
        document.getElementById('set-welcome-title').value = s.homeTexts.welcomeTitle || '';
        document.getElementById('set-welcome-subtitle').value = s.homeTexts.welcomeSubtitle || '';
        document.getElementById('set-btn-text').value = s.homeTexts.supportBtnText || '';
        document.getElementById('set-footer-text').value = s.homeTexts.footerText || '';
    }

    updateVoiceScriptPreview();
}

// EVENT BINDINGS
document.addEventListener('DOMContentLoaded', () => {
    initGoldenParticles();
    initFirebaseListeners();

    const scriptTextarea = document.getElementById('set-voice-script');
    if (scriptTextarea) {
        scriptTextarea.addEventListener('input', updateVoiceScriptPreview);
    }

    const testVoiceBtn = document.getElementById('btn-test-voice');
    if (testVoiceBtn) {
        testVoiceBtn.addEventListener('click', () => {
            const voiceSettings = {
                enabled: document.getElementById('set-voice-enabled').value === 'true',
                language: document.getElementById('set-voice-language').value,
                gender: document.getElementById('set-voice-gender').value,
                style: document.getElementById('set-voice-style').value,
                pitch: parseFloat(document.getElementById('set-voice-pitch').value) || 1.2,
                rate: parseFloat(document.getElementById('set-voice-rate').value) || 1.0,
                volumePct: parseFloat(document.getElementById('set-voice-volume-pct').value) || 90,
                pauseMs: parseInt(document.getElementById('set-voice-pause').value) || 500,
                script: document.getElementById('set-voice-script').value || DEFAULT_SETTINGS.voice.script
            };

            const sampleItem = {
                name: "Rahul",
                amount: 500,
                msg: "Love your stream!",
                dateSubmitted: new Date().toLocaleDateString(),
                timeSubmitted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            voiceManagerEngine.speak(sampleItem, { ...STATE.settings, voice: voiceSettings }, () => {
                console.log("Test voice announcement completed.");
            });
        });
    }

    const settingsForm = document.getElementById('admin-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (STATE.currentAdmin && STATE.currentAdmin.role !== 'owner') {
                alert("Access Denied: Only Owners can modify settings.");
                return;
            }

            const logoFile = document.getElementById('set-logo-file').files[0];
            const faviconFile = document.getElementById('set-favicon-file').files[0];
            const qrFile = document.getElementById('set-qr-file').files[0];

            let logoUrl = STATE.settings.logoUrl;
            let faviconUrl = STATE.settings.faviconUrl;
            let qrCodeUrl = STATE.settings.qrCodeUrl;

            try {
                if (logoFile) logoUrl = await fileToBase64(logoFile);
                if (faviconFile) faviconUrl = await fileToBase64(faviconFile);
                if (qrFile) qrCodeUrl = await fileToBase64(qrFile);

                const suggestedRaw = document.getElementById('set-suggested-amounts').value;
                const suggestedArray = suggestedRaw.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);

                const updatedSettings = {
                    websiteName: document.getElementById('set-website-name').value.trim(),
                    streamerName: document.getElementById('set-streamer-name').value.trim(),
                    tagline: document.getElementById('set-tagline').value.trim(),
                    logoUrl: logoUrl,
                    faviconUrl: faviconUrl,

                    upiId: document.getElementById('set-upi-id').value.trim(),
                    qrCodeUrl: qrCodeUrl,
                    suggestedAmounts: suggestedArray.length > 0 ? suggestedArray : DEFAULT_SETTINGS.suggestedAmounts,
                    minAmount: Number(document.getElementById('set-min-amount').value) || 40,
                    maxAmount: Number(document.getElementById('set-max-amount').value) || 50000,

                    goalTarget: Number(document.getElementById('set-goal-target').value) || 10000,
                    goalTitle: document.getElementById('set-goal-title').value.trim(),
                    currencySymbol: document.getElementById('set-currency-symbol').value.trim() || '₹',
                    thankYouMessage: document.getElementById('set-thankyou-msg').value.trim(),

                    emailNotifications: {
                        enabled: document.getElementById('set-email-enabled').value === 'true',
                        serviceId: document.getElementById('set-emailjs-service').value.trim(),
                        templateId: document.getElementById('set-emailjs-template').value.trim(),
                        publicKey: document.getElementById('set-emailjs-publickey').value.trim(),
                        senderName: document.getElementById('set-email-sender-name').value.trim(),
                        replyTo: document.getElementById('set-email-reply-to').value.trim(),
                        subject: document.getElementById('set-email-subject').value.trim()
                    },

                    voice: {
                        enabled: document.getElementById('set-voice-enabled').value === 'true',
                        language: document.getElementById('set-voice-language').value,
                        gender: document.getElementById('set-voice-gender').value,
                        style: document.getElementById('set-voice-style').value,
                        pauseMs: Number(document.getElementById('set-voice-pause').value) || 500,
                        pitch: Number(document.getElementById('set-voice-pitch').value) || 1.2,
                        rate: Number(document.getElementById('set-voice-rate').value) || 1.0,
                        volumePct: Number(document.getElementById('set-voice-volume-pct').value) || 90,
                        script: document.getElementById('set-voice-script').value || DEFAULT_SETTINGS.voice.script
                    },

                    socials: {
                        kick: document.getElementById('set-social-kick').value.trim(),
                        instagram: document.getElementById('set-social-insta').value.trim(),
                        youtube: document.getElementById('set-social-yt').value.trim(),
                        discord: document.getElementById('set-social-discord').value.trim(),
                        facebook: document.getElementById('set-social-fb').value.trim(),
                        twitter: document.getElementById('set-social-twitter').value.trim(),
                        website: document.getElementById('set-social-website').value.trim()
                    },

                    overlay: {
                        duration: Number(document.getElementById('set-overlay-duration').value) || 12,
                        volume: Number(document.getElementById('set-overlay-volume').value) || 0.8,
                        confetti: document.getElementById('set-overlay-confetti').value === 'true',
                        sound: document.getElementById('set-overlay-sound').value === 'true',
                        animation: document.getElementById('set-overlay-animation').value
                    },

                    homeTexts: {
                        welcomeTitle: document.getElementById('set-welcome-title').value.trim(),
                        welcomeSubtitle: document.getElementById('set-welcome-subtitle').value.trim(),
                        supportBtnText: document.getElementById('set-btn-text').value.trim(),
                        footerText: document.getElementById('set-footer-text').value.trim()
                    }
                };

                if (window.firebaseDB) {
                    await window.firebaseDB.saveSettings(updatedSettings);

                    window.firebaseDB.logAuditAction({
                        adminEmail: STATE.currentAdmin ? STATE.currentAdmin.email : "System",
                        action: "Settings Change",
                        supporterName: "N/A",
                        amount: 0,
                        details: "Updated site configuration and voice script settings"
                    });

                    alert("Settings updated successfully across the site!");
                }
            } catch (err) {
                console.error("Error saving settings:", err);
                alert("Failed to save settings. Please try again.");
            }
        });
    }
});