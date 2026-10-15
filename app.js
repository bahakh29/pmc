/**
 * Residents On-Call Dashboard - main application script.
 *
 * Note: WEB_APP_URL, authPassword, requestSheetData() and window.__initialSheet are defined by a small
 * inline script in index.html's <head> so the schedule request starts as early as possible.
 */

let RESIDENTS = [];

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Builds the month's day list. firstWeekdayIdx: 0 = Sunday ... 6 = Saturday.
function buildMonthDays(firstWeekdayIdx, daysInMonth) {
    return Array.from({length: daysInMonth}, (_, i) => {
        const dayNum = i + 1;
        const dayIdx = (i + firstWeekdayIdx) % 7;
        return {
            dayNum,
            dayIdx,
            weekdayAR: WEEKDAYS_AR[dayIdx],
            weekdayEN: WEEKDAYS_EN[dayIdx],
            weekdayENShort: WEEKDAYS_EN_SHORT[dayIdx],
            isWeekend: dayIdx === 5 || dayIdx === 6
        };
    });
}
let MONTH_DAYS = [];   // filled from the sheet

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

let RAW_SCHEDULE = {};

// UI Translations
const TRANSLATIONS = {
    ar: {
        pageTitle: "جدول المناوبات والدوام - قسم الباطنية",
        programBadge: "برنامج مقيمي الباطني",
        hospitalName: "| مجمع فلسطين الطبي",
        headerTitle: "جدول المناوبات والدوام",
        syncText: "تحديث البيانات",
        lastUpdatedPrefix: "آخر تحديث: ",
        loadingShort: "جارٍ التحميل...",
        authSubtitle: "أدخل كلمة المرور للمتابعة",
        authPlaceholder: "كلمة المرور",
        authBtn: "دخول",
        authChecking: "جارٍ التحقق...",
        authWrong: "كلمة المرور غير صحيحة",
        authLocked: "محاولات خاطئة كثيرة. حاول مرة أخرى بعد بضع دقائق.",
        authConnError: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
        syncFailedShort: "تعذر التحديث",
        syncFailedMsg: "تعذر تحديث البيانات من Google Sheet. البيانات المعروضة قد لا تكون الأحدث.",
        btnExport: "تصدير Excel",
        btnPrint: "طباعة",
        btnInstall: "تثبيت التطبيق",
        langBtn: "English",
        tabAnalytics: "📊 الملخص",
        tabMatrix: "🗓️ الجدول الشامل للشهر",
        tabResident: "👤 جدول الطبيب المقيم",
        tabDaily: "📅 التوزيع اليومي للدوام",
        kpiResidentsLabel: "عدد الأطباء المقيمين",
        chartTitle: "توزيع المناوبات/A/الإجازات",
        chartOnCallLegend: "عدد المناوبات (On Call)",
        chartALegend: "A",
        chartOffLegend: "عدد أيام الإجازة (Off)",
        summaryTableTitle: "ملخص دوام المقيمين",
        thDocName: "اسم الطبيب المقيم",
        thOnCall: "المناوبات (On Call)",
        thPostCall: "بعد المناوبة (Post Call)",
        thDutyA: "A",
        thOff: "أيام الإجازة (Off)",
        searchPlaceholder: "بحث باسم الطبيب...",
        filterLabel: "تصفية:",
        filterAll: "الكل",
        filterOnCall: "مناوبة",
        filterPostCall: "بعد المناوبة",
        filterA: "A",
        filterOff: "إجازة Off",
        thMatrixDoc: "اسم الطبيب",
        thMatrixOC: "م.",
        badgeOnCall: "مناوبة",
        badgePostCall: "بعد",
        badgeA: "A",
        badgeOff: "Off",
        labelSelectDoc: "اختر الطبيب المقيم:",
        statOnCall: "مناوبة (On Call)",
        statPostCall: "بعد المناوبة",
        statA: "A",
        statOff: "أيام الإجازة (Off)",
        calendarTitle: "التقويم الشهري الشخصي",
        dailySubtitle: "استعراض تفاصيل اليوم",
        labelSelectDay: "حدد اليوم:",
        cardTitleOnCall: "مناوبة (On Call)",
        cardTitlePostCall: "بعد المناوبة (Post Call)",
        cardTitleDutyA: "A",
        cardTitleOff: "إجازة (Off)",
        btnDetails: "التفاصيل",
        noDoctors: "لا يوجد أطباء في هذه الحالة",
        shiftDescriptions: {
            "On call": "مناوبة (On Call)",
            "Post call": "بعد المناوبة (Post Call)",
            "A": "A",
            "Off": "إجازة (Off)"
        }
    },
    en: {
        pageTitle: "On-Call & Duty Schedule - Internal Medicine",
        programBadge: "IM Residents Schedule",
        hospitalName: "| Palestine Medical Complex",
        headerTitle: "On-Call & Duty Schedule",
        syncText: "Update Data",
        lastUpdatedPrefix: "Updated: ",
        loadingShort: "Loading...",
        authSubtitle: "Enter the password to continue",
        authPlaceholder: "Password",
        authBtn: "Enter",
        authChecking: "Checking...",
        authWrong: "Wrong password",
        authLocked: "Too many wrong attempts. Try again in a few minutes.",
        authConnError: "Could not reach the server. Please try again.",
        syncFailedShort: "Update failed",
        syncFailedMsg: "Could not update data from the Google Sheet. The data shown may not be the latest.",
        btnExport: "Export Excel",
        btnPrint: "Print",
        btnInstall: "Install App",
        langBtn: "العربية",
        tabAnalytics: "📊 Summary",
        tabMatrix: "🗓️ Full Monthly Schedule",
        tabResident: "👤 Resident Schedule",
        tabDaily: "📅 Daily Duty Breakdown",
        kpiResidentsLabel: "Total Residents",
        chartTitle: "On-Call/A/Off Distribution",
        chartOnCallLegend: "On Call Shifts",
        chartALegend: "A Shifts",
        chartOffLegend: "Off Days",
        summaryTableTitle: "Residents Duty Summary",
        thDocName: "Resident Name",
        thOnCall: "On Call",
        thPostCall: "Post Call",
        thDutyA: "A",
        thOff: "Off Days",
        searchPlaceholder: "Search resident name...",
        filterLabel: "Filter:",
        filterAll: "All",
        filterOnCall: "On Call",
        filterPostCall: "Post Call",
        filterA: "A",
        filterOff: "Off",
        thMatrixDoc: "Resident Name",
        thMatrixOC: "OC",
        badgeOnCall: "On Call",
        badgePostCall: "Post Call",
        badgeA: "A",
        badgeOff: "Off",
        labelSelectDoc: "Select Resident:",
        statOnCall: "On Call",
        statPostCall: "Post Call",
        statA: "A",
        statOff: "Off Days",
        calendarTitle: "Personal Monthly Calendar",
        dailySubtitle: "View Daily Details",
        labelSelectDay: "Select Day:",
        cardTitleOnCall: "On Call",
        cardTitlePostCall: "Post Call",
        cardTitleDutyA: "A",
        cardTitleOff: "Off",
        btnDetails: "Details",
        noDoctors: "No residents for this status",
        shiftDescriptions: {
            "On call": "On Call",
            "Post call": "Post Call",
            "A": "A",
            "Off": "Off"
        }
    }
};

let currentLang = 'ar';
let activeMatrixFilter = 'ALL';
let chartInstanceOnCall = null;
let lastUpdatedTime = new Date();

// On Load Initialization
window.addEventListener('DOMContentLoaded', () => {
    initDoctorSelect();
    initDaySelects();
    renderKPIs();
    renderAnalyticsView();
    renderMatrixTable();
    renderIndividualRoster();
    renderDailyBreakdown();
    renderLastUpdated();

    // Use the request that was already started in <head>; otherwise start one now
    if (window.__initialSheet) {
        isSyncing = true;
        document.getElementById('syncIcon').classList.add('fa-spin');
        window.__initialSheet.then(r => r.ok ? onSheetDataLoaded(r.data, false) : onSheetDataError(r.error, false));
        hideGate();
    } else {
        showGate();
    }
});

// Render Last Updated Timestamp
let lastSyncFailed = false;
let isSyncing = false;
let hasLoadedOnce = false;

function renderLastUpdated() {
    const el = document.getElementById('lastUpdatedText');
    if (!el || !lastUpdatedTime) return;

    const t = TRANSLATIONS[currentLang];
    if (lastSyncFailed) {
        el.innerText = t.syncFailedShort;
        return;
    }
    if (!hasLoadedOnce) {
        el.innerText = t.loadingShort;
        return;
    }
    const hours = String(lastUpdatedTime.getHours()).padStart(2, '0');
    const minutes = String(lastUpdatedTime.getMinutes()).padStart(2, '0');
    const day = String(lastUpdatedTime.getDate()).padStart(2, '0');
    const month = String(lastUpdatedTime.getMonth() + 1).padStart(2, '0');

    el.innerText = `${t.lastUpdatedPrefix}${day}/${month} ${hours}:${minutes}`;
}

// Fetch Data from Google Sheet "Counter"
function fetchSheetData(isManualTrigger) {
    if (isSyncing) return;
    if (!authPassword) { showGate(); return; }

    const syncIcon = document.getElementById('syncIcon');
    isSyncing = true;
    if (syncIcon) syncIcon.classList.add('fa-spin');
    requestSheetData(hasLoadedOnce ? 0 : 1)
        .then(data => onSheetDataLoaded(data, isManualTrigger),
              err => onSheetDataError(err, isManualTrigger));
}

// ----- Password gate helpers -----
let gateErrorKind = null;

function showGate(errorKind) {
    isSyncing = false;
    const gate = document.getElementById('authGate');
    gate.classList.remove('hidden');
    setGateBusy(false);
    const input = document.getElementById('authPassword');
    input.value = '';
    gateErrorKind = errorKind || null;
    if (gateErrorKind) showGateError(gateErrorKind);
    else document.getElementById('authError').classList.add('hidden');
    setTimeout(() => input.focus(), 50);
}

function hideGate() {
    gateErrorKind = null;
    setGateBusy(false);
    document.getElementById('authGate').classList.add('hidden');
}

function showGateError(kind) {
    const t = TRANSLATIONS[currentLang];
    const el = document.getElementById('authError');
    el.innerText = kind === 'locked' ? t.authLocked : kind === 'conn' ? t.authConnError : t.authWrong;
    el.classList.remove('hidden');
}

function setGateBusy(busy) {
    const btn = document.getElementById('authBtn');
    btn.disabled = busy;
    document.getElementById('ui-authBtn').innerText = busy ? TRANSLATIONS[currentLang].authChecking : TRANSLATIONS[currentLang].authBtn;
}

function submitPassword(ev) {
    ev.preventDefault();
    const pw = document.getElementById('authPassword').value;
    if (!pw || isSyncing) return;
    authPassword = pw;
    gateErrorKind = null;
    document.getElementById('authError').classList.add('hidden');
    setGateBusy(true);
    fetchSheetData(false);
}

function forgetPassword() {
    authPassword = null;
    try { sessionStorage.removeItem('pmc_pw'); } catch (e) {}
}

function onSheetDataLoaded(response, isManualTrigger) {
    isSyncing = false;
    const syncIcon = document.getElementById('syncIcon');
    if (syncIcon) syncIcon.classList.remove('fa-spin');

    if (response && (response.status === 'unauthorized' || response.status === 'locked')) {
        forgetPassword();
        showGate(response.status);
        return;
    }

    const valid = response && response.status === 'success' &&
        Array.isArray(response.residents) && response.residents.length > 0 &&
        response.rawSchedule && typeof response.rawSchedule === 'object';

    if (!valid) {
        onSheetDataError(new Error((response && response.message) || 'Unexpected response'), isManualTrigger);
        return;
    }

    RESIDENTS = response.residents;
    RAW_SCHEDULE = response.rawSchedule;

    // Month layout from the sheet (falls back to the current layout if missing)
    const daysInMonth = Number.isInteger(response.daysInMonth) && response.daysInMonth >= 28 && response.daysInMonth <= 31
        ? response.daysInMonth : (MONTH_DAYS.length || 31);
    const firstWeekday = Number.isInteger(response.firstWeekday) && response.firstWeekday >= 0 && response.firstWeekday <= 6
        ? response.firstWeekday : (MONTH_DAYS.length ? MONTH_DAYS[0].dayIdx : 4);
    MONTH_DAYS = buildMonthDays(firstWeekday, daysInMonth);

    if (Array.isArray(response.warnings) && response.warnings.length) {
        console.warn('Sheet warnings:', response.warnings);
    }

    try { sessionStorage.setItem('pmc_pw', authPassword); } catch (e) {}
    hideGate();
    lastSyncFailed = false;
    hasLoadedOnce = true;
    lastUpdatedTime = new Date();
    renderLastUpdated();

    initDoctorSelect();
    initDaySelects();
    renderKPIs();
    renderAnalyticsView();
    renderMatrixTable();
    renderIndividualRoster();
    renderDailyBreakdown();

    if (isManualTrigger) {
        alert(currentLang === 'ar' ? 'تم تحديث البيانات بنجاح.' : 'Data updated successfully.');
    }
}

function onSheetDataError(err, isManualTrigger) {
    isSyncing = false;
    const syncIcon = document.getElementById('syncIcon');
    if (syncIcon) syncIcon.classList.remove('fa-spin');
    console.warn("Sheet sync error:", err);

    if (!document.getElementById('authGate').classList.contains('hidden')) {
        // Failure while logging in (not a wrong password): keep the gate, say why
        authPassword = null;
        showGate('conn');
        return;
    }

    // Never fail silently: the numbers on screen may be older than the sheet
    lastSyncFailed = true;
    renderLastUpdated();
    if (!hasLoadedOnce) renderAnalyticsView();
    if (isManualTrigger) {
        const detail = err && err.message ? '\n\n' + err.message : '';
        alert(TRANSLATIONS[currentLang].syncFailedMsg + detail);
    }
}

// Toggle Language
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    const htmlEl = document.documentElement;
    htmlEl.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    htmlEl.setAttribute('lang', currentLang);

    const t = TRANSLATIONS[currentLang];
    document.getElementById('pageTitle').innerText = t.pageTitle;
    document.getElementById('ui-programBadge').innerText = t.programBadge;
    document.getElementById('ui-hospitalName').innerText = t.hospitalName;
    document.getElementById('ui-headerTitle').innerText = t.headerTitle;
    document.getElementById('syncText').innerText = t.syncText;
    document.getElementById('ui-btnExport').innerText = t.btnExport;
    document.getElementById('ui-btnPrint').innerText = t.btnPrint;
    document.getElementById('ui-btnInstall').innerText = t.btnInstall;
    document.getElementById('langBtnText').innerText = t.langBtn;

    document.getElementById('ui-authProgram').innerText = t.programBadge;
    document.getElementById('ui-authTitle').innerText = t.headerTitle;
    document.getElementById('ui-authSubtitle').innerText = t.authSubtitle;
    document.getElementById('authPassword').placeholder = t.authPlaceholder;
    document.getElementById('ui-authBtn').innerText = t.authBtn;
    document.getElementById('authLangBtnText').innerText = t.langBtn;
    if (gateErrorKind) showGateError(gateErrorKind);

    document.getElementById('ui-tabAnalytics').innerText = t.tabAnalytics;
    document.getElementById('ui-tabMatrix').innerText = t.tabMatrix;
    document.getElementById('ui-tabResident').innerText = t.tabResident;
    document.getElementById('ui-tabDaily').innerText = t.tabDaily;

    document.getElementById('ui-kpiResidentsLabel').innerText = t.kpiResidentsLabel;
    document.getElementById('ui-chartTitle').innerHTML = `<i class="fa-solid fa-chart-column text-rose-500"></i> ${t.chartTitle}`;
    document.getElementById('ui-summaryTableTitle').innerHTML = `<i class="fa-solid fa-list-check text-indigo-500"></i> ${t.summaryTableTitle}`;

    document.getElementById('ui-thDocName').innerText = t.thDocName;
    document.getElementById('ui-thOnCall').innerText = t.thOnCall;
    document.getElementById('ui-thPostCall').innerText = t.thPostCall;
    document.getElementById('ui-thDutyA').innerText = t.thDutyA;
    document.getElementById('ui-thOff').innerText = t.thOff;

    document.getElementById('doctorSearchInput').placeholder = t.searchPlaceholder;
    document.getElementById('ui-filterLabel').innerText = t.filterLabel;
    document.getElementById('btn-filter-ALL').innerText = t.filterAll;
    document.getElementById('btn-filter-Oncall').innerText = t.filterOnCall;
    document.getElementById('btn-filter-Postcall').innerText = t.filterPostCall;
    document.getElementById('btn-filter-A').innerText = t.filterA;
    document.getElementById('btn-filter-Off').innerText = t.filterOff;

    document.getElementById('ui-labelSelectDoc').innerText = t.labelSelectDoc;
    document.getElementById('ui-calendarTitle').innerHTML = `<i class="fa-regular fa-calendar-days text-brand-500 text-lg sm:text-2xl"></i> ${t.calendarTitle}`;

    document.getElementById('ui-dailySubtitle').innerText = t.dailySubtitle;
    document.getElementById('ui-labelSelectDay').innerText = t.labelSelectDay;

    document.getElementById('ui-cardTitleOnCall').innerText = t.cardTitleOnCall;
    document.getElementById('ui-cardTitlePostCall').innerText = t.cardTitlePostCall;
    document.getElementById('ui-cardTitleDutyA').innerText = t.cardTitleDutyA;
    document.getElementById('ui-cardTitleOff').innerText = t.cardTitleOff;

    renderLastUpdated();
    initDaySelects();
    renderAnalyticsView();
    renderMatrixTable();
    renderIndividualRoster();
    renderDailyBreakdown();
}

function toggleTheme() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-moon text-base sm:text-lg';
    } else {
        htmlEl.classList.add('dark');
        themeIcon.className = 'fa-solid fa-sun text-base sm:text-lg';
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-brand-600', 'text-white', 'shadow');
        btn.classList.add('text-slate-300');
    });

    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-${tabId}`);
    activeBtn.classList.add('bg-brand-600', 'text-white', 'shadow');
    activeBtn.classList.remove('text-slate-300');

    if (tabId === 'analytics') {
        renderAnalyticsCharts();
    }
}

function calculateDoctorStats(docName) {
    let stats = { onCall: 0, postCall: 0, dutyA: 0, off: 0, total: MONTH_DAYS.length };
    for (let day = 1; day <= MONTH_DAYS.length; day++) {
        if (!RAW_SCHEDULE[day]) continue;
        const shift = RAW_SCHEDULE[day][docName];
        if (shift === 'On call') stats.onCall++;
        else if (shift === 'Post call') stats.postCall++;
        else if (shift === 'A') stats.dutyA++;
        else if (shift === 'Off') stats.off++;
    }
    return stats;
}

function renderKPIs() {
    document.getElementById('kpi-total-residents').innerText = RESIDENTS.length || '–';
}

function initDoctorSelect() {
    const select = document.getElementById('residentSelect');
    const prevVal = select.value;
    select.innerHTML = '';
    RESIDENTS.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc;
        opt.textContent = doc;
        select.appendChild(opt);
    });
    if (prevVal && RESIDENTS.includes(prevVal)) {
        select.value = prevVal;
    }
}

function initDaySelects() {
    const select = document.getElementById('daySelect');
    const prevDay = select.value || 1;
    const quickBar = document.getElementById('dayQuickPickerButtons');
    select.innerHTML = '';
    quickBar.innerHTML = '';

    const isAr = currentLang === 'ar';

    MONTH_DAYS.forEach(d => {
        const dayName = isAr ? d.weekdayAR : d.weekdayEN;
        const shortName = isAr ? d.weekdayAR.substring(0, 4) : d.weekdayENShort;

        const opt = document.createElement('option');
        opt.value = d.dayNum;
        opt.textContent = `${dayName} - ${d.dayNum}`;
        select.appendChild(opt);

        const btn = document.createElement('button');
        btn.onclick = () => {
            select.value = d.dayNum;
            renderDailyBreakdown();
        };
        btn.id = `quick-day-btn-${d.dayNum}`;
        btn.className = `px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-all border ${
            d.isWeekend
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
        }`;
        btn.textContent = `${d.dayNum} ${shortName}`;
        quickBar.appendChild(btn);
    });

    select.value = prevDay;
    if (!select.value) select.value = 1;
}

function renderAnalyticsView() {
    const tbody = document.getElementById('analyticsTableBody');
    tbody.innerHTML = '';

    if (!RESIDENTS.length) {
        const t0 = TRANSLATIONS[currentLang];
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-bold">${lastSyncFailed ? t0.syncFailedShort : t0.loadingShort}</td></tr>`;
        renderAnalyticsCharts();
        return;
    }

    const doctorData = RESIDENTS.map(doc => {
        const stats = calculateDoctorStats(doc);
        return { name: doc, ...stats };
    });

    doctorData.forEach((d, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors';
        tr.innerHTML = `
            <td class="p-2.5 sm:p-4 text-slate-400 font-mono text-xs sm:text-base font-bold">${idx + 1}</td>
            <td class="p-2.5 sm:p-4 font-extrabold text-xs sm:text-lg text-slate-900 dark:text-white whitespace-nowrap">${escapeHtml(d.name)}</td>
            <td class="p-2.5 sm:p-4 text-center font-black text-xs sm:text-lg text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20">${d.onCall}</td>
            <td class="p-2.5 sm:p-4 text-center font-black text-xs sm:text-lg text-amber-600 dark:text-amber-400">${d.postCall}</td>
            <td class="p-2.5 sm:p-4 text-center font-black text-xs sm:text-lg text-indigo-600 dark:text-indigo-400">${d.dutyA}</td>
            <td class="p-2.5 sm:p-4 text-center font-black text-xs sm:text-lg text-slate-600 dark:text-slate-400">${d.off}</td>
        `;
        tbody.appendChild(tr);
    });

    renderAnalyticsCharts();
}

function renderAnalyticsCharts() {
    const ctxOnCall = document.getElementById('onCallChart').getContext('2d');
    const t = TRANSLATIONS[currentLang];

    const labels = RESIDENTS;
    const allStats = RESIDENTS.map(d => calculateDoctorStats(d));
    const onCallCounts = allStats.map(s => s.onCall);
    const dutyACounts = allStats.map(s => s.dutyA);
    const offCounts = allStats.map(s => s.off);

    if (chartInstanceOnCall) chartInstanceOnCall.destroy();

    chartInstanceOnCall = new Chart(ctxOnCall, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: t.chartOnCallLegend,
                    data: onCallCounts,
                    backgroundColor: '#f43f5e',
                    borderRadius: 6
                },
                {
                    label: t.chartALegend,
                    data: dutyACounts,
                    backgroundColor: '#6366f1',
                    borderRadius: 6
                },
                {
                    label: t.chartOffLegend,
                    data: offCounts,
                    backgroundColor: '#94a3b8',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Cairo', size: 11, weight: 'bold' } } }
            },
            scales: {
                x: { ticks: { font: { family: 'Cairo', size: 10, weight: 'bold' } } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }
            }
        }
    });
}

function filterMatrixShift(shiftType) {
    activeMatrixFilter = shiftType;

    ['ALL', 'Oncall', 'Postcall', 'A', 'Off'].forEach(tKey => {
        const btn = document.getElementById(`btn-filter-${tKey}`);
        if (btn) {
            btn.classList.remove('ring-2', 'ring-slate-900', 'dark:ring-white');
        }
    });

    const activeBtnKey = shiftType === 'On call' ? 'Oncall' : shiftType === 'Post call' ? 'Postcall' : shiftType;
    const currentBtn = document.getElementById(`btn-filter-${activeBtnKey}`);
    if (currentBtn) currentBtn.classList.add('ring-2', 'ring-slate-900', 'dark:ring-white');

    renderMatrixTable();
}

function renderMatrixTable() {
    const headerRow = document.getElementById('matrixHeaderRow');
    const tbody = document.getElementById('matrixTableBody');
    const searchQuery = (document.getElementById('doctorSearchInput').value || '').trim().toLowerCase();
    const t = TRANSLATIONS[currentLang];
    const isAr = currentLang === 'ar';

    headerRow.innerHTML = `
        <th class="p-2 sm:p-3 sticky-col bg-slate-900 text-white font-extrabold text-xs sm:text-base min-w-[100px] sm:w-40 border-b border-slate-700 text-start shadow-md">
            ${t.thMatrixDoc}
        </th>
        <th class="p-1.5 sm:p-2 font-black text-center text-xs sm:text-sm border-b border-slate-700 bg-slate-800 text-rose-300 w-10 sm:w-12">
            ${t.thMatrixOC}
        </th>
    `;

    MONTH_DAYS.forEach(d => {
        const dayName = isAr ? d.weekdayAR : d.weekdayENShort;
        const th = document.createElement('th');
        th.className = `p-1.5 sm:p-2 text-center border-b border-slate-700 whitespace-nowrap min-w-[42px] sm:min-w-[55px] ${
            d.isWeekend ? 'bg-slate-800 text-rose-400 font-extrabold' : 'bg-slate-900 text-slate-200'
        }`;
        th.innerHTML = `
            <div class="text-[9px] sm:text-[11px] font-semibold opacity-80">${dayName}</div>
            <div class="text-xs sm:text-base font-black">${d.dayNum}</div>
        `;
        headerRow.appendChild(th);
    });

    tbody.innerHTML = '';
    const filteredResidents = RESIDENTS.filter(doc => doc.toLowerCase().includes(searchQuery));

    filteredResidents.forEach(doc => {
        const stats = calculateDoctorStats(doc);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors';

        let html = `
            <td class="p-2 sm:p-3 font-extrabold text-xs sm:text-base text-slate-900 dark:text-white sticky-col bg-white dark:bg-slate-800 border-l border-r border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap">
                ${escapeHtml(doc)}
            </td>
            <td class="p-1.5 sm:p-2 text-center font-black text-xs sm:text-base text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-l border-r border-slate-200 dark:border-slate-700">
                ${stats.onCall}
            </td>
        `;

        MONTH_DAYS.forEach(d => {
            const shift = (RAW_SCHEDULE[d.dayNum] && RAW_SCHEDULE[d.dayNum][doc]) ? RAW_SCHEDULE[d.dayNum][doc] : "Off";
            let badgeStyle = '';
            let labelText = '';

            if (shift === 'On call') {
                badgeStyle = 'bg-rose-500 text-white font-black shadow-sm';
                labelText = t.badgeOnCall;
            } else if (shift === 'Post call') {
                badgeStyle = 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 font-bold';
                labelText = t.badgePostCall;
            } else if (shift === 'A') {
                badgeStyle = 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-bold';
                labelText = t.badgeA;
            } else {
                badgeStyle = 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 font-medium';
                labelText = t.badgeOff;
            }

            const isDimmed = (activeMatrixFilter !== 'ALL' && shift !== activeMatrixFilter);

            html += `
                <td class="p-0.5 sm:p-1 text-center border-l border-r border-slate-100 dark:border-slate-800 ${isDimmed ? 'opacity-20' : ''}">
                    <span class="inline-block w-full py-1 px-0.5 rounded text-[10px] sm:text-xs font-bold transition-all ${badgeStyle}">
                        ${labelText}
                    </span>
                </td>
            `;
        });

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// TAB 3: RESIDENT SCHEDULE (MOBILE RESPONSIVE & ENLARGED)
function renderIndividualRoster() {
    const selectedDoc = document.getElementById('residentSelect').value || RESIDENTS[0];
    if (!selectedDoc) return;
    document.getElementById('selectedDoctorNameDisplay').innerText = selectedDoc;

    const stats = calculateDoctorStats(selectedDoc);
    const t = TRANSLATIONS[currentLang];
    const isAr = currentLang === 'ar';

    // Summary Badges
    const statsContainer = document.getElementById('residentStatsSummary');
    statsContainer.innerHTML = `
        <div class="bg-rose-50 dark:bg-rose-950/50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm">
            <span class="text-[11px] sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 block">${t.statOnCall}</span>
            <span class="text-xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 mt-0.5 sm:mt-1 block">${stats.onCall}</span>
        </div>
        <div class="bg-amber-50 dark:bg-amber-950/50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-900 shadow-sm">
            <span class="text-[11px] sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 block">${t.statPostCall}</span>
            <span class="text-xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 mt-0.5 sm:mt-1 block">${stats.postCall}</span>
        </div>
        <div class="bg-indigo-50 dark:bg-indigo-950/50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-200 dark:border-indigo-900 shadow-sm">
            <span class="text-[11px] sm:text-sm font-extrabold text-indigo-600 dark:text-indigo-400 block">${t.statA}</span>
            <span class="text-xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 sm:mt-1 block">${stats.dutyA}</span>
        </div>
        <div class="bg-slate-100 dark:bg-slate-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span class="text-[11px] sm:text-sm font-extrabold text-slate-600 dark:text-slate-400 block">${t.statOff}</span>
            <span class="text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 mt-0.5 sm:mt-1 block">${stats.off}</span>
        </div>
    `;

    const calendarHeadersEl = document.getElementById('calendarWeekdayHeaders');
    const weekdaysList = isAr ? WEEKDAYS_AR : WEEKDAYS_EN_SHORT;
    calendarHeadersEl.innerHTML = weekdaysList.map((wd, idx) => `
        <div class="${idx === 5 ? 'text-rose-500' : idx === 6 ? 'text-indigo-500' : ''}">${wd}</div>
    `).join('');

    // Calendar Grid Responsive Scaling
    const calendarGrid = document.getElementById('residentCalendarGrid');
    calendarGrid.innerHTML = '';

    const leadingEmptyCells = MONTH_DAYS.length ? MONTH_DAYS[0].dayIdx : 0;
    for (let i = 0; i < leadingEmptyCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'min-h-[70px] sm:min-h-[110px] bg-slate-50/50 dark:bg-slate-900/30 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 dark:border-slate-800';
        calendarGrid.appendChild(emptyCell);
    }

    MONTH_DAYS.forEach(d => {
        const shift = (RAW_SCHEDULE[d.dayNum] && RAW_SCHEDULE[d.dayNum][selectedDoc]) ? RAW_SCHEDULE[d.dayNum][selectedDoc] : "Off";
        const dayCell = document.createElement('div');
        let cardBg = '';
        let badgeColor = '';
        let shiftTitle = t.shiftDescriptions[shift] || shift;

        if (shift === 'On call') {
            cardBg = 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 shadow-sm';
            badgeColor = 'bg-rose-600 text-white font-black';
        } else if (shift === 'Post call') {
            cardBg = 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 shadow-sm';
            badgeColor = 'bg-amber-500 text-white font-black';
        } else if (shift === 'A') {
            cardBg = 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-sm';
            badgeColor = 'bg-indigo-600 text-white font-black';
        } else {
            cardBg = 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800';
            badgeColor = 'bg-slate-400 dark:bg-slate-700 text-white font-bold';
        }

        dayCell.className = `p-1.5 sm:p-3 min-h-[75px] sm:min-h-[115px] rounded-xl sm:rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${cardBg}`;
        dayCell.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-xs sm:text-base font-black ${d.isWeekend ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">${d.dayNum}</span>
                <span class="text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded ${badgeColor}">${shift}</span>
            </div>
            <div class="mt-1 text-[10px] sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                ${shiftTitle}
            </div>
            <div class="text-[9px] sm:text-xs font-bold text-slate-400 mt-0.5">
                ${isAr ? d.weekdayAR : d.weekdayENShort}
            </div>
        `;
        calendarGrid.appendChild(dayCell);
    });
}

function renderDailyBreakdown() {
    const selectedDayNum = parseInt(document.getElementById('daySelect').value) || 1;
    const dayData = MONTH_DAYS.find(d => d.dayNum === selectedDayNum) || MONTH_DAYS[0];
    if (!dayData) return;
    const isAr = currentLang === 'ar';

    const dayName = isAr ? dayData.weekdayAR : dayData.weekdayEN;
    document.getElementById('selectedDayTitle').innerText = `${dayName}، ${selectedDayNum}`;

    MONTH_DAYS.forEach(d => {
        const btn = document.getElementById(`quick-day-btn-${d.dayNum}`);
        if (btn) {
            if (d.dayNum === selectedDayNum) {
                btn.classList.add('ring-2', 'ring-brand-500', 'bg-brand-600', 'text-white');
            } else {
                btn.classList.remove('ring-2', 'ring-brand-500', 'bg-brand-600', 'text-white');
            }
        }
    });

    const shiftMap = { 'On call': [], 'Post call': [], 'A': [], 'Off': [] };

    RESIDENTS.forEach(doc => {
        const shift = (RAW_SCHEDULE[selectedDayNum] && RAW_SCHEDULE[selectedDayNum][doc]) ? RAW_SCHEDULE[selectedDayNum][doc] : "Off";
        if (shiftMap[shift]) shiftMap[shift].push(doc);
    });

    renderDailyCategoryList('daily-list-oncall', 'daily-count-oncall', shiftMap['On call'], 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900');
    renderDailyCategoryList('daily-list-postcall', 'daily-count-postcall', shiftMap['Post call'], 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900');
    renderDailyCategoryList('daily-list-duty', 'daily-count-duty', shiftMap['A'], 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900');
    renderDailyCategoryList('daily-list-off', 'daily-count-off', shiftMap['Off'], 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800');
}

function renderDailyCategoryList(containerId, countId, doctorsList, cardStyle) {
    const container = document.getElementById(containerId);
    const countBadge = document.getElementById(countId);
    const t = TRANSLATIONS[currentLang];

    countBadge.innerText = doctorsList.length;
    container.innerHTML = '';

    if (doctorsList.length === 0) {
        container.innerHTML = `<p class="text-xs sm:text-sm text-slate-400 italic text-center py-4 sm:py-6 font-bold">${t.noDoctors}</p>`;
        return;
    }

    doctorsList.forEach(doc => {
        const item = document.createElement('div');
        item.className = `p-2.5 sm:p-3.5 rounded-xl border flex items-center justify-between transition-all ${cardStyle}`;
        item.innerHTML = `
            <div class="flex items-center gap-2 sm:gap-2.5">
                <i class="fa-solid fa-user-doctor text-xs sm:text-base"></i>
                <span class="font-black text-xs sm:text-base md:text-lg">${escapeHtml(doc)}</span>
            </div>
            <button class="text-[11px] sm:text-xs md:text-sm font-bold px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border transition-all">
                ${t.btnDetails}
            </button>
        `;
        item.querySelector('button').addEventListener('click', () => inspectDoctor(doc));
        container.appendChild(item);
    });
}

function inspectDoctor(docName) {
    document.getElementById('residentSelect').value = docName;
    switchTab('resident');
    renderIndividualRoster();
}

function exportScheduleCSV() {
    const isAr = currentLang === 'ar';
    let csvContent = "\uFEFF";

    let headerRow = [isAr ? "اسم الطبيب" : "Resident Name"];
    MONTH_DAYS.forEach(d => {
        headerRow.push(`${d.dayNum} ${isAr ? d.weekdayAR : d.weekdayENShort}`);
    });
    csvContent += headerRow.join(",") + "\n";

    RESIDENTS.forEach(doc => {
        let row = [`"${String(doc).replace(/"/g, '""')}"`];
        MONTH_DAYS.forEach(d => {
            const shift = (RAW_SCHEDULE[d.dayNum] && RAW_SCHEDULE[d.dayNum][doc]) ? RAW_SCHEDULE[d.dayNum][doc] : "Off";
            row.push(`"${shift}"`);
        });
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PMC_IM_Schedule_${currentLang.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* =====================================================================
 * PWA: install button + service worker registration
 * ===================================================================== */
let deferredInstallPrompt = null;

(function setupPWA() {
    const installBtn = document.getElementById('installBtn');

    // Already running as an installed app? Then never show the button.
    const isStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // The browser fires this only when the app is installable (Chrome/Edge on Android & Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();               // stop the default mini-infobar
        deferredInstallPrompt = e;        // keep the event so we can trigger it from our button
        if (installBtn && !isStandalone()) installBtn.classList.add('is-visible');
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            installBtn.classList.remove('is-visible');
            deferredInstallPrompt.prompt();
            try {
                const choice = await deferredInstallPrompt.userChoice;
                console.log('PWA install choice:', choice.outcome);
            } catch (err) {}
            deferredInstallPrompt = null; // the event can only be used once
        });
    }

    // Hide the button once the app has been installed
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (installBtn) installBtn.classList.remove('is-visible');
    });

    // Register the service worker (requires HTTPS or localhost - GitHub Pages is HTTPS)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered, scope:', reg.scope))
                .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }
})();
