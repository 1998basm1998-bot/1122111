/* =========================================================
   1. Data Layer & State Management (البيانات والتخزين)
========================================================= */
const DB_KEY = 'clinic_erp_data';

// Default Database Structure based on Excel Analysis
let db = {
    transactions: [], // Stores all financial transactions (incomes, expenses, etc.)
    dailyEntries: []  // Stores daily shift inputs
};

// Initialize App
function initApp() {
    // Set Current Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('ar-EG', dateOptions);
    
    // Set Date Inputs to today
    document.getElementById('dailyDate').valueAsDate = new Date();
    document.getElementById('trxDate').valueAsDate = new Date();

    loadData();
    setupEventListeners();
    calculateAndRenderDashboard();
}

// Load from LocalStorage
function loadData() {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
        db = JSON.parse(stored);
    }
}

// Save to LocalStorage
function saveData() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    calculateAndRenderDashboard();
    renderRecordsTable();
}

/* =========================================================
   2. UI Layer & Navigation (تغيير الواجهات)
========================================================= */
function setupEventListeners() {
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Update Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch View
            const targetId = item.getAttribute('data-target');
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Refresh specific view data if needed
            if(targetId === 'view-reports') renderRecordsTable();
        });
    });

    // Forms Submission
    document.getElementById('dailyEntryForm').addEventListener('submit', handleDailyEntry);
    document.getElementById('transactionForm').addEventListener('submit', handleTransaction);

    // Settings Actions
    document.getElementById('excelFile').addEventListener('change', handleExcelImport);
    document.getElementById('clearDataBtn').addEventListener('click', clearDatabase);
}

/* =========================================================
   3. Logic Layer (العمليات الحسابية والـ CRUD)
========================================================= */

// --- إضافة سجل تنزيل يومي ---
function handleDailyEntry(e) {
    e.preventDefault();
    const entry = {
        id: Date.now(),
        type: 'daily_entry',
        date: document.getElementById('dailyDate').value,
        department: document.getElementById('department').value,
        shift: document.getElementById('shift').value,
        amount: parseFloat(document.getElementById('shiftIncome').value)
    };
    db.dailyEntries.push(entry);
    saveData();
    e.target.reset();
    document.getElementById('dailyDate').valueAsDate = new Date();
    
    Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم تسجيل الوارد اليومي بنجاح', timer: 1500, showConfirmButton: false, background: '#203a43', color: '#fff' });
}

// --- إضافة معاملة مالية عامة ---
function handleTransaction(e) {
    e.preventDefault();
    const trx = {
        id: Date.now(),
        type: document.getElementById('trxType').value,
        date: document.getElementById('trxDate').value,
        amount: parseFloat(document.getElementById('trxAmount').value),
        details: document.getElementById('trxDetails').value
    };
    db.transactions.push(trx);
    saveData();
    e.target.reset();
    document.getElementById('trxDate').valueAsDate = new Date();

    Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم تسجيل المعاملة بنجاح', timer: 1500, showConfirmButton: false, background: '#203a43', color: '#fff' });
}

// --- حساب معادلات الـ Excel وعرض الـ Dashboard ---
function calculateAndRenderDashboard() {
    let totalIncome = 0;
    let totalOutcome = 0;

    // 1. حساب الواردات (التنزيل اليومي + الواردات الخارجية)
    db.dailyEntries.forEach(entry => totalIncome += entry.amount);
    db.transactions.forEach(trx => {
        if (trx.type === 'incomes_ext') totalIncome += trx.amount;
    });

    // 2. حساب الصادرات (المصروفات، التسديدات، السحوبات، الرواتب)
    db.transactions.forEach(trx => {
        if (['expenses', 'payments', 'withdrawals', 'salaries'].includes(trx.type)) {
            totalOutcome += trx.amount;
        }
    });

    // 3. الرصيد في القاصة
    let safeBalance = totalIncome - totalOutcome;

    // تحديث الواجهة
    document.getElementById('totalIncome').innerHTML = `${totalIncome.toLocaleString()} <span>د.ع</span>`;
    document.getElementById('totalOutcome').innerHTML = `${totalOutcome.toLocaleString()} <span>د.ع</span>`;
    document.getElementById('safeBalance').innerHTML = `${safeBalance.toLocaleString()} <span>د.ع</span>`;
}

// --- عرض السجلات (Reports) ---
function renderRecordsTable() {
    const tbody = document.getElementById('recordsTableBody');
    tbody.innerHTML = '';

    // دمج السجلات لغرض العرض وترتيبها تنازلياً حسب التاريخ
    let allRecords = [...db.dailyEntries, ...db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Map Types to Arabic labels
    const typeMap = {
        'daily_entry': 'وارد يومي',
        'incomes_ext': 'وارد خارجي',
        'expenses': 'مصروفات',
        'payments': 'تسديدات',
        'withdrawals': 'سحوبات',
        'salaries': 'رواتب'
    };

    allRecords.forEach(record => {
        const tr = document.createElement('tr');
        const details = record.type === 'daily_entry' ? `${record.department} - ${record.shift}` : record.details;
        const amountColor = ['expenses', 'payments', 'withdrawals', 'salaries'].includes(record.type) ? 'color: #dc3545;' : 'color: #198754;';

        tr.innerHTML = `
            <td><span class="badge" style="background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 5px;">${typeMap[record.type]}</span></td>
            <td>${record.date}</td>
            <td>${details}</td>
            <td style="${amountColor} font-weight: bold;">${record.amount.toLocaleString()}</td>
            <td>
                <button class="action-btn" onclick="deleteRecord(${record.id}, '${record.type}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- حذف سجل ---
window.deleteRecord = function(id, type) {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من استرجاع هذا السجل!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'نعم، احذف!',
        cancelButtonText: 'إلغاء',
        background: '#203a43',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            if (type === 'daily_entry') {
                db.dailyEntries = db.dailyEntries.filter(item => item.id !== id);
            } else {
                db.transactions = db.transactions.filter(item => item.id !== id);
            }
            saveData();
            Swal.fire({ icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1000, background: '#203a43', color: '#fff'});
        }
    });
}

/* =========================================================
   4. Excel Integration (الميزة الاحترافية: استيراد الإكسل)
========================================================= */
function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // Show loading
    Swal.fire({
        title: 'جاري تحليل الملف...',
        html: 'نقوم بتحليل أوراق الإكسل والمحاكاة...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() },
        background: '#203a43', color: '#fff'
    });

    reader.onload = function(evt) {
        const data = evt.target.result;
        // قراءة الملف باستخدام SheetJS
        const workbook = XLSX.read(data, {type: 'binary'});
        
        let importedTransactionsCount = 0;

        // ميكانيكية ذكية لقراءة الشيتات بناءً على أسمائها
        workbook.SheetNames.forEach(sheetName => {
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
            
            // تحليل شيت "المصروفات" كمثال للاستيراد
            if(sheetName.includes("المصروفات") && !sheetName.includes("تنزيل")) {
                // تجاوز الهيدر والبحث عن البيانات (ت، التاريخ، المبلغ، التفاصيل)
                for(let i=3; i<sheetData.length; i++) {
                    let row = sheetData[i];
                    if(row[1] && row[2]) { // اذا وجد تاريخ ومبلغ
                        db.transactions.push({
                            id: Date.now() + Math.random(),
                            type: 'expenses',
                            date: row[1] || new Date().toISOString().split('T')[0],
                            amount: parseFloat(row[2]) || 0,
                            details: row[3] || 'مستورد من إكسل'
                        });
                        importedTransactionsCount++;
                    }
                }
            }
            // ملاحظة: يمكن إضافة شروط مشابهة لقراءة شيت "الرواتب", "السحوبات" وغيرها بناءً على نفس الهيكلية.
        });

        saveData();
        
        Swal.fire({
            icon: 'success',
            title: 'اكتمل الاستيراد!',
            text: `تم استيراد ${importedTransactionsCount} سجل مالي بنجاح وإضافته للنظام.`,
            background: '#203a43', color: '#fff'
        });
        
        // Reset file input
        e.target.value = '';
    };

    reader.readAsBinaryString(file);
}

// مسح قاعدة البيانات بالكامل
function clearDatabase() {
    Swal.fire({
        title: 'تحذير خطير!',
        text: "سيتم مسح كافة البيانات بصورة نهائية. هل أنت متأكد؟",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'نعم، قم بمسح النظام!',
        cancelButtonText: 'تراجع',
        background: '#203a43', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(DB_KEY);
            db = { transactions: [], dailyEntries: [] };
            saveData();
            Swal.fire({icon: 'success', title: 'تم التصفير', background: '#203a43', color: '#fff'});
        }
    });
}

// Run App
window.onload = initApp;
