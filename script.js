
document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://rgailnxnblttwflgwjtn.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Vu0X5D2-5r663Co4yqbbZw_2Ura1WBv';
    const ACTIVE_VIEW_STORAGE_KEY = 'pharmaActiveView';
    const APP_DATA_TABLE = 'pharmacy_app_data';
    const LEGACY_STORAGE_KEYS = {
        stock: 'pharmaStockData',
        invoices: 'pharmaInvoices',
        orders: 'pharmaMedicineOrders',
        settings: 'pharmacyDetails'
    };
    const INVOICE_PREFIX = 'ET';
    const INVOICE_PAD_LENGTH = 5;
    const launchParams = new URLSearchParams(window.location.search);

    let supabase = null;
    let currentUser = null;
    let editingInvoiceId = null;
    let activeInvoiceViewId = null;
    let confirmHandler = null;
    let appDataLoaded = false;
    let appDataLoadPromise = null;
    let activePrintJob = null;
    let printMediaQueryList = null;
    let printMediaQueryHandler = null;

    const state = {
        stockData: [],
        invoiceData: [],
        orderData: [],
        pharmacyDetails: normalizeSettings(null)
    };

    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authAlert = document.getElementById('auth-form-alerts');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const authInputs = {
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        registerName: document.getElementById('reg-name'),
        registerEmail: document.getElementById('reg-email'),
        registerPassword: document.getElementById('reg-password'),
        registerConfirmPassword: document.getElementById('reg-confirm-password'),
        resetEmail: document.getElementById('reset-email')
    };
    const navBtns = document.querySelectorAll('.nav-btn');
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
    const navigationBtns = document.querySelectorAll('.nav-btn, .mobile-nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');
    const currentUserEmail = document.getElementById('current-user-email');
    const tableBody = document.getElementById('table-body');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileQuickInvoice = document.getElementById('mobile-quick-invoice');

    const ui = {
        patientName: document.getElementById('patient-name'),
        doctorName: document.getElementById('doctor-name'),
        invoiceNo: document.getElementById('invoice-no'),
        invoiceDate: document.getElementById('invoice-date'),
        invoiceTime: document.getElementById('invoice-time'),
        invoiceNotes: document.getElementById('invoice-notes'),
        grossAmt: document.getElementById('gross-amt'),
        netAmt: document.getElementById('net-payable-amt'),
        discount: document.getElementById('discount-input'),
        discountType: document.getElementById('discount-type'),
        adjust: document.getElementById('adjust-input'),
        amountWords: document.getElementById('amount-words'),
        billType: document.getElementById('bill-type'),
        printBillType: document.getElementById('print-bill-type'),
        printFooterGross: document.getElementById('print-footer-gross'),
        printFooterDiscount: document.getElementById('print-footer-discount'),
        printFooterAdjust: document.getElementById('print-footer-adjust'),
        printFooterNet: document.getElementById('print-footer-net'),
        printPatientName: document.getElementById('print-patient-name'),
        printDoctorName: document.getElementById('print-doctor-name'),
        printInvoiceNo: document.getElementById('print-invoice-no'),
        printInvoiceDate: document.getElementById('print-invoice-date'),
        printBilledTime: document.getElementById('print-billed-time'),
        reportsDateFrom: document.getElementById('reports-date-from'),
        reportsDateTo: document.getElementById('reports-date-to'),
        reportsBillType: document.getElementById('reports-bill-type'),
        reportsSearch: document.getElementById('reports-search'),
        reportsTotalSales: document.getElementById('reports-total-sales'),
        reportsTotalInvoices: document.getElementById('reports-total-invoices'),
        reportsAverageSale: document.getElementById('reports-average-sale'),
        reportsTopItem: document.getElementById('reports-top-item'),
        reportsSalesTrend: document.getElementById('reports-sales-trend'),
        reportsBillTypeChart: document.getElementById('reports-billtype-chart'),
        reportsTopMedicinesChart: document.getElementById('reports-top-medicines-chart'),
        reportsTableBody: document.getElementById('reports-table-body'),
        reportsRangeLabel: document.getElementById('reports-range-label'),
        reportsPrintRange: document.getElementById('reports-print-range')
    };

    injectInterfaceUpgrades();
    syncDiscountFieldState();
    initBaseState();
    bindAuth();
    bindNavigation();
    bindPrintLifecycle();
    bindBilling();
    bindInventory();
    bindInvoices();
    bindOrders();
    bindReports();
    bindSettings();
    bindModals();
    renderPharmacyDetails();
    renderStockTable();
    renderDashboard();
    renderInvoiceTable();
    renderOrders();
    renderReports();
    renderProductPicker();
    addRow();
    registerServiceWorker();
    initSupabase();

    function injectInterfaceUpgrades() {
        const inventoryHeader = document.querySelector('#view-inventory .view-header');
        if (inventoryHeader && !document.getElementById('inventory-search')) {
            inventoryHeader.insertAdjacentHTML('beforeend', '<div class="actions premium-actions"><div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input id="inventory-search" class="form-control" type="search" placeholder="Search inventory"></div><button id="open-add-stock-modal" class="btn btn-success primary"><i class="fa-solid fa-plus"></i> Add Item</button><button id="open-import-stock-modal" class="btn btn-outline-secondary secondary"><i class="fa-solid fa-file-import"></i> Import JSON</button></div>');
        }
        const invoicesHeader = document.querySelector('#view-invoices .view-header');
        if (invoicesHeader && !document.getElementById('invoice-search')) {
            invoicesHeader.insertAdjacentHTML('beforeend', '<div class="actions premium-actions"><div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input id="invoice-search" class="form-control" type="search" placeholder="Search invoices"></div><button id="new-invoice-from-list" class="btn btn-success primary"><i class="fa-solid fa-plus"></i> New Invoice</button></div>');
        }
        const billingHeader = document.querySelector('#view-billing .view-header .actions');
        if (billingHeader && !document.getElementById('save-invoice-btn')) {
            billingHeader.insertAdjacentHTML('afterbegin', '<button id="save-invoice-btn" class="btn btn-success primary"><i class="fa-solid fa-floppy-disk"></i> Save Invoice</button>');
            billingHeader.insertAdjacentHTML('beforeend', '<button id="reset-billing-btn" class="btn btn-outline-secondary secondary"><i class="fa-solid fa-rotate-left"></i> Reset</button>');
        }
        const dashboardArea = document.querySelector('#view-dashboard .dashboard-scroll-area');
        if (dashboardArea && !document.getElementById('db-stock-count')) {
            const metricGrid = dashboardArea.querySelector('.dashboard-grid');
            metricGrid.insertAdjacentHTML('beforeend', '<div class="metric-card premium-card"><div class="metric-icon"><i class="fa-solid fa-box"></i></div><div class="metric-content"><h3>Inventory Items</h3><p id="db-stock-count">0</p></div></div><div class="metric-card premium-card"><div class="metric-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="metric-content"><h3>Low Stock</h3><p id="db-low-stock-count">0</p></div></div>');
            dashboardArea.insertAdjacentHTML('beforeend', '<div class="dashboard-extras"><div class="panel mt-3"><div class="panel-header"><h3><i class="fa-solid fa-clock-rotate-left"></i> Recent Activity</h3></div><div id="dashboard-activity" class="activity-list"></div></div><div class="panel mt-3"><div class="panel-header"><h3><i class="fa-solid fa-warehouse"></i> Low Stock Watch</h3></div><div id="dashboard-low-stock" class="activity-list"></div></div></div>');
        }
        const settingsPanel = document.querySelector('#view-settings .panel');
        const settingsHeader = document.querySelector('#view-settings .view-header');
        const invoiceTableHeadRow = document.querySelector('#view-invoices table thead tr');
        if (invoiceTableHeadRow) {
            invoiceTableHeadRow.innerHTML = '<th>Date/Time</th><th>Invoice No</th><th>Patient Name</th><th>Total Amount</th><th>Status</th><th>Actions</th>';
        }
        const inventoryTableHeadRow = document.querySelector('#view-inventory table thead tr');
        if (inventoryTableHeadRow) {
            inventoryTableHeadRow.innerHTML = '<th>Product Name</th><th>SCH</th><th>MFG</th><th>Batch</th><th>EXP</th><th>Shelf</th><th>QTY</th><th>Rate</th><th>Status</th><th>Actions</th>';
        }
        if (settingsHeader && !document.getElementById('open-settings-modal')) {
            settingsHeader.insertAdjacentHTML('beforeend', '<div class="actions premium-actions"><button id="open-settings-modal" class="btn btn-success primary"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</button><button id="open-reset-data-modal" class="btn btn-outline-secondary secondary"><i class="fa-solid fa-trash"></i> Reset Data</button></div>');
        }
        if (settingsPanel && !document.getElementById('settings-summary')) {
            settingsPanel.insertAdjacentHTML('afterend', '<div id="settings-summary" class="panel mt-3 settings-summary"></div>');
        }
        if (!document.getElementById('confirm-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="confirm-modal" class="modal-shell"><div class="modal-card"><div class="modal-header"><h3 id="confirm-title">Confirm action</h3><button class="close-btn" data-close-modal="confirm-modal">&times;</button></div><p id="confirm-message"></p><div class="modal-footer"><button class="btn btn-outline-secondary secondary" data-close-modal="confirm-modal">Cancel</button><button id="confirm-action-btn" class="btn btn-danger danger-solid">Confirm</button></div></div></div>
                <div id="notice-modal" class="modal-shell"><div class="modal-card"><div class="modal-header"><h3 id="notice-title">Notice</h3><button class="close-btn" data-close-modal="notice-modal">&times;</button></div><p id="notice-message"></p><div class="modal-footer"><button class="btn btn-success primary" data-close-modal="notice-modal">Close</button></div></div></div>
                <div id="invoice-view-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3 id="invoice-view-title">Invoice Preview</h3><button class="close-btn" data-close-modal="invoice-view-modal">&times;</button></div><div id="invoice-view-meta" class="invoice-preview-meta"></div><div class="table-container"><table class="invoice-table table align-middle mb-0"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody id="invoice-view-items"></tbody></table></div><div class="modal-footer"><button id="invoice-view-edit-btn" class="btn btn-outline-secondary secondary">Edit</button><button id="invoice-view-delete-btn" class="btn btn-danger danger-solid">Delete</button></div></div></div>
                <div id="order-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3 id="order-modal-title">Medicine Order</h3><button class="close-btn" data-close-modal="order-modal">&times;</button></div><form id="order-form"><input type="hidden" id="order-id"><div class="form-grid compact"><div class="form-group"><label>Patient Name</label><input id="order-patient-name" class="form-control" required></div><div class="form-group"><label>Phone Number</label><input id="order-patient-phone" class="form-control" placeholder="Optional"></div><div class="form-group"><label>Medicine Name</label><input id="order-medicine-name" class="form-control" required></div><div class="form-group"><label>Quantity</label><input id="order-quantity" class="form-control" type="number" min="1" step="1" value="1"></div><div class="form-group"><label>Due Date</label><input id="order-due-date" class="form-control" type="date" required></div><div class="form-group"><label>Status</label><select id="order-status" class="form-control" style="appearance: auto;"><option value="Pending">Pending</option><option value="Ordered">Ordered</option><option value="Ready">Ready</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></select></div><div class="form-group full-span"><label>Notes</label><textarea id="order-notes" class="form-control" rows="3" placeholder="Anything important for this patient order"></textarea></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary secondary" data-close-modal="order-modal">Cancel</button><button class="btn btn-success primary" type="submit">Save Order</button></div></form></div></div>
                <div id="inventory-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3 id="inventory-modal-title">Inventory Item</h3><button class="close-btn" data-close-modal="inventory-modal">&times;</button></div><form id="inventory-form"><input type="hidden" id="inventory-id"><div class="form-grid compact"><div class="form-group"><label>Item Name</label><input id="inventory-item" class="form-control" required></div><div class="form-group"><label>Category</label><input id="inventory-category" class="form-control"></div><div class="form-group"><label>SCH</label><input id="inventory-sch" class="form-control"></div><div class="form-group"><label>MFG</label><input id="inventory-mfg" class="form-control"></div><div class="form-group"><label>Batch</label><input id="inventory-batch" class="form-control"></div><div class="form-group"><label>Expiry</label><input id="inventory-expiry" class="form-control"></div><div class="form-group"><label>Shelf / Rack</label><input id="inventory-shelf" class="form-control" placeholder="e.g. Shelf A2"></div><div class="form-group"><label>Stock Qty</label><input id="inventory-stock" class="form-control" type="number" min="0"></div><div class="form-group"><label>Tabs Per Sheet</label><input id="inventory-units-per-sheet" class="form-control" type="number" min="0" step="1" placeholder="e.g. 10"></div><div class="form-group"><label>Sheet Price</label><input id="inventory-sheet-price" class="form-control" type="number" min="0" step="0.01" placeholder="e.g. 10.00"></div><div class="form-group"><label>Rate Per Tablet</label><input id="inventory-price" class="form-control" type="number" min="0" step="0.01"></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary secondary" data-close-modal="inventory-modal">Cancel</button><button class="btn btn-success primary" type="submit">Save Item</button></div></form></div></div>
                <div id="inventory-import-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3>Import Inventory JSON</h3><button class="close-btn" data-close-modal="inventory-import-modal">&times;</button></div><div class="form-group"><label>JSON Array</label><textarea id="stock-json-modal-input" class="form-control" rows="8" placeholder='[{"item":"Paracetamol 500mg","sch":"H","mfg":"SUN","batch":"B10","stock":100,"unitsPerSheet":10,"sheetPrice":10,"price":1,"expiry":"12/26"}]'></textarea></div><div class="modal-footer"><button class="btn btn-outline-secondary secondary" data-close-modal="inventory-import-modal">Cancel</button><button id="save-json-stock-modal-btn" class="btn btn-success primary">Import Items</button></div></div></div>
                <div id="settings-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3>Edit Pharmacy Profile</h3><button class="close-btn" data-close-modal="settings-modal">&times;</button></div><form id="settings-form-modal"><div class="form-grid compact"><div class="form-group"><label>Name</label><input id="modal-setting-name" class="form-control"></div><div class="form-group"><label>Owner</label><input id="modal-setting-owner" class="form-control"></div><div class="form-group"><label>Phone</label><input id="modal-setting-phone" class="form-control"></div><div class="form-group"><label>GSTIN</label><input id="modal-setting-gstin" class="form-control"></div><div class="form-group full-span"><label>Address</label><textarea id="modal-setting-address" class="form-control" rows="3"></textarea></div><div class="form-group"><label>D.L.No1</label><input id="modal-setting-dl1" class="form-control"></div><div class="form-group"><label>D.L.No2</label><input id="modal-setting-dl2" class="form-control"></div><div class="form-group full-span"><label>Footer Note</label><textarea id="modal-setting-footer" class="form-control" rows="2"></textarea></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary secondary" data-close-modal="settings-modal">Cancel</button><button class="btn btn-success primary" type="submit">Save Changes</button></div></form></div></div>
                <div id="reset-password-modal" class="modal-shell"><div class="modal-card"><div class="modal-header"><h3>Reset Password</h3><button class="close-btn" data-close-modal="reset-password-modal">&times;</button></div><div class="form-group"><label>Email</label><input id="reset-email" class="form-control" type="email" placeholder="admin@pharmabill.com"></div><div class="modal-footer"><button class="btn btn-outline-secondary secondary" data-close-modal="reset-password-modal">Cancel</button><button id="send-reset-btn" class="btn btn-success primary">Send Reset Link</button></div></div></div>
                <div id="product-picker-modal" class="modal-shell"><div class="modal-card modal-wide"><div class="modal-header"><h3>Select Inventory Item</h3><button class="close-btn" data-close-modal="product-picker-modal">&times;</button></div><div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input id="product-picker-search" class="form-control" type="search" placeholder="Search products"></div><div id="product-picker-list" class="picker-list"></div></div></div>
            `);
        }
    }

    function initBaseState() {
        const now = new Date();
        ui.invoiceDate.valueAsDate = now;
        ui.invoiceTime.value = now.toTimeString().slice(0, 5);
        ui.invoiceNo.value = getNextInvoiceNumber();
        syncPrintHeader();
    }

    function safeParseJson(value, fallback) {
        try {
            return JSON.parse(value ?? '');
        } catch (error) {
            return fallback;
        }
    }

    function readLegacyBusinessData() {
        return {
            stockData: safeParseJson(localStorage.getItem(LEGACY_STORAGE_KEYS.stock), []),
            invoiceData: safeParseJson(localStorage.getItem(LEGACY_STORAGE_KEYS.invoices), []),
            orderData: safeParseJson(localStorage.getItem(LEGACY_STORAGE_KEYS.orders), []),
            pharmacyDetails: safeParseJson(localStorage.getItem(LEGACY_STORAGE_KEYS.settings), null)
        };
    }

    function hasLegacyBusinessData(data = readLegacyBusinessData()) {
        return Boolean(
            (Array.isArray(data.stockData) && data.stockData.length)
            || (Array.isArray(data.invoiceData) && data.invoiceData.length)
            || (Array.isArray(data.orderData) && data.orderData.length)
            || data.pharmacyDetails
        );
    }

    function clearLegacyBusinessData() {
        Object.values(LEGACY_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    function applyBusinessState(payload = {}) {
        const normalizedInvoices = normalizeInvoices(payload.invoiceData || []);
        const invoiceDataWasRepaired = JSON.stringify(payload.invoiceData || []) !== JSON.stringify(normalizedInvoices);
        state.stockData = normalizeStock(payload.stockData || []);
        state.invoiceData = normalizedInvoices;
        state.orderData = normalizeOrders(payload.orderData || []);
        state.pharmacyDetails = normalizeSettings(payload.pharmacyDetails || null);
        return { invoiceDataWasRepaired };
    }

    function buildCloudPayload() {
        return {
            user_id: currentUser.id,
            stock_data: state.stockData,
            invoice_data: state.invoiceData,
            order_data: state.orderData,
            pharmacy_details: state.pharmacyDetails
        };
    }

    async function writeCloudPayload() {
        return supabase.from(APP_DATA_TABLE).upsert(buildCloudPayload(), { onConflict: 'user_id' });
    }

    function isMissingAppDataTableError(error) {
        const message = `${error?.message || ''} ${error?.details || ''}`;
        return error?.code === '42P01' || error?.code === 'PGRST205' || /pharmacy_app_data|relation .* does not exist|Could not find the table/i.test(message);
    }

    function showCloudDataError(title, error) {
        console.error(title, error);
        const suffix = isMissingAppDataTableError(error)
            ? ' Run the SQL from supabase-schema.sql in your Supabase SQL editor first.'
            : '';
        openNotice('Supabase sync error', `${title} failed. ${error?.message || 'Unknown error.'}${suffix}`);
    }

    async function persistCloudState(options = {}) {
        if (!supabase || !currentUser?.id) {
            openNotice('Supabase required', 'Please sign in with Supabase before saving business data.');
            return false;
        }
        const {
            loadingText = 'Saving data...',
            errorTitle = 'Saving data',
            successMessage = '',
            silent = false
        } = options;
        if (!silent) showLoading(loadingText);
        const { error } = await writeCloudPayload();
        if (!silent) hideLoading();
        if (error) {
            showCloudDataError(errorTitle, error);
            return false;
        }
        clearLegacyBusinessData();
        if (successMessage) showToast(successMessage, 'success');
        return true;
    }

    function renderAppState() {
        renderPharmacyDetails();
        renderStockTable();
        renderDashboard();
        renderInvoiceTable();
        renderOrders();
        renderReports();
        renderProductPicker();
        if (!editingInvoiceId) {
            ui.invoiceNo.value = getNextInvoiceNumber();
        }
        syncPrintHeader();
        calculateOverallTotals();
    }

    async function loadCloudAppData() {
        if (appDataLoaded) return true;
        if (appDataLoadPromise) return appDataLoadPromise;
        appDataLoadPromise = (async () => {
            if (!supabase || !currentUser?.id) return false;
            showLoading('Loading pharmacy data...');
            const { data, error } = await supabase
                .from(APP_DATA_TABLE)
                .select('stock_data, invoice_data, order_data, pharmacy_details')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (error) {
                hideLoading();
                showCloudDataError('Loading pharmacy data', error);
                return false;
            }

            if (data) {
                const repairResult = applyBusinessState({
                    stockData: data.stock_data,
                    invoiceData: data.invoice_data,
                    orderData: data.order_data,
                    pharmacyDetails: data.pharmacy_details
                });
                if (repairResult.invoiceDataWasRepaired) {
                    const { error: repairError } = await writeCloudPayload();
                    if (repairError) {
                        console.error('Repairing invoice numbers failed:', repairError);
                    } else {
                        showToast('Invoice numbers were repaired to avoid duplicates.', 'success');
                    }
                }
                clearLegacyBusinessData();
            } else {
                const legacyData = readLegacyBusinessData();
                const usingLegacyData = hasLegacyBusinessData(legacyData);
                const repairResult = applyBusinessState(usingLegacyData ? legacyData : {});
                const { error: seedError } = await writeCloudPayload();
                if (seedError) {
                    hideLoading();
                    showCloudDataError(usingLegacyData ? 'Migrating local data to Supabase' : 'Preparing cloud data', seedError);
                    return false;
                }
                if (usingLegacyData) {
                    showToast('Existing local data was migrated to Supabase.', 'success');
                    clearLegacyBusinessData();
                }
                if (repairResult.invoiceDataWasRepaired) {
                    showToast('Invoice numbers were repaired to avoid duplicates.', 'success');
                }
            }

            renderAppState();
            appDataLoaded = true;
            hideLoading();
            return true;
        })();
        const loaded = await appDataLoadPromise;
        appDataLoadPromise = null;
        return loaded;
    }

    function initSupabase() {
        if (!(window.supabase && SUPABASE_KEY)) {
            showAuthAlert('Supabase is required for authentication and cloud data sync.', 'error');
            showAuth();
            return;
        }
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            checkSession();
        } catch (error) {
            showAuthAlert('Backend initialization failed. Supabase sync is unavailable.', 'error');
            showAuth();
        }
    }

    async function checkSession() {
        showLoading('Checking Session...');
        const { data } = await supabase.auth.getSession();
        hideLoading();
        if (data?.session) {
            currentUser = data.session.user;
            showApp();
        } else {
            showAuth();
        }
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                currentUser = session.user;
                showApp();
            }
            if (event === 'SIGNED_OUT') {
                currentUser = null;
                showAuth();
            }
        });
    }
    function setAuthView(view) {
        const showRegister = view === 'register';
        loginView.classList.toggle('is-active', !showRegister);
        registerView.classList.toggle('is-active', showRegister);
        clearAuthValidation();
        authAlert.style.display = 'none';
    }

    function clearFieldError(input) {
        if (!input) return;
        input.classList.remove('input-error');
        input.removeAttribute('aria-invalid');
    }

    function setFieldError(input, message, notify = showAuthAlert) {
        if (!input) return false;
        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        notify(message, 'error');
        return false;
    }

    function clearAuthValidation() {
        Object.values(authInputs).forEach(clearFieldError);
    }

    function normalizeEmail(value) {
        return value.trim().toLowerCase();
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validateLoginForm() {
        clearAuthValidation();
        const email = normalizeEmail(authInputs.loginEmail.value);
        const password = authInputs.loginPassword.value;

        if (!email) return setFieldError(authInputs.loginEmail, 'Email is required.');
        if (!isValidEmail(email)) return setFieldError(authInputs.loginEmail, 'Enter a valid email address.');
        if (!password) return setFieldError(authInputs.loginPassword, 'Password is required.');
        if (password.length < 6) return setFieldError(authInputs.loginPassword, 'Password must be at least 6 characters.');

        return { email, password };
    }

    function validateRegisterForm() {
        clearAuthValidation();
        const fullName = authInputs.registerName.value.trim().replace(/\s+/g, ' ');
        const email = normalizeEmail(authInputs.registerEmail.value);
        const password = authInputs.registerPassword.value;
        const confirmPassword = authInputs.registerConfirmPassword.value;

        if (!fullName) return setFieldError(authInputs.registerName, 'Full name is required.');
        if (fullName.length < 3) return setFieldError(authInputs.registerName, 'Full name must be at least 3 characters.');
        if (!/^[a-zA-Z][a-zA-Z\s'.-]+$/.test(fullName)) return setFieldError(authInputs.registerName, 'Full name can contain letters, spaces, apostrophes, periods, and hyphens only.');
        if (!email) return setFieldError(authInputs.registerEmail, 'Email is required.');
        if (!isValidEmail(email)) return setFieldError(authInputs.registerEmail, 'Enter a valid email address.');
        if (!password) return setFieldError(authInputs.registerPassword, 'Password is required.');
        if (password.length < 8) return setFieldError(authInputs.registerPassword, 'Password must be at least 8 characters.');
        if (!/[A-Z]/.test(password)) return setFieldError(authInputs.registerPassword, 'Password must include at least one uppercase letter.');
        if (!/[a-z]/.test(password)) return setFieldError(authInputs.registerPassword, 'Password must include at least one lowercase letter.');
        if (!/\d/.test(password)) return setFieldError(authInputs.registerPassword, 'Password must include at least one number.');
        if (!confirmPassword) return setFieldError(authInputs.registerConfirmPassword, 'Please confirm your password.');
        if (password !== confirmPassword) return setFieldError(authInputs.registerConfirmPassword, 'Passwords do not match.');

        return { fullName, email, password };
    }

    function validateResetEmail() {
        clearFieldError(authInputs.resetEmail);
        const email = normalizeEmail(authInputs.resetEmail.value);
        const notify = message => showToast(message, 'error');
        if (!email) return setFieldError(authInputs.resetEmail, 'Enter the account email first.', notify);
        if (!isValidEmail(email)) return setFieldError(authInputs.resetEmail, 'Enter a valid email address.', notify);
        return email;
    }

    function calculateUnitPriceFromSheet(unitsPerSheet, sheetPrice, fallbackPrice = 0) {
        const units = Number(unitsPerSheet || 0);
        const packPrice = Number(sheetPrice || 0);
        if (units > 0 && packPrice > 0) return Number((packPrice / units).toFixed(2));
        return Number(fallbackPrice || 0);
    }

    function getPackLabel(item) {
        const units = Number(item.unitsPerSheet || 0);
        const packPrice = Number(item.sheetPrice || 0);
        if (!units || !packPrice) return '';
        return `${units} tabs/sheet | Sheet Rs ${packPrice.toFixed(2)}`;
    }

    function syncInventoryRateFromSheet() {
        const unitsInput = document.getElementById('inventory-units-per-sheet');
        const sheetPriceInput = document.getElementById('inventory-sheet-price');
        const priceInput = document.getElementById('inventory-price');
        if (!unitsInput || !sheetPriceInput || !priceInput) return;
        const units = Number(unitsInput.value || 0);
        const packPrice = Number(sheetPriceInput.value || 0);
        if (units > 0 && packPrice > 0) {
            priceInput.value = calculateUnitPriceFromSheet(units, packPrice).toFixed(2);
        }
    }

    function bindAuth() {
        setAuthView('login');
        document.getElementById('to-register').onclick = () => setAuthView('register');
        document.getElementById('to-login').onclick = () => setAuthView('login');
        Object.values(authInputs).forEach(input => {
            input?.addEventListener('input', () => {
                clearFieldError(input);
                authAlert.style.display = 'none';
            });
        });
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                const showing = input.type === 'text';
                input.type = showing ? 'password' : 'text';
                btn.textContent = showing ? 'Show' : 'Hide';
            });
        });
        const regPassword = document.getElementById('reg-password');
        const meter = document.getElementById('password-meter-fill');
        if (regPassword && meter) {
            regPassword.addEventListener('input', () => {
                const score = Math.min(100, regPassword.value.length * 15 + (/[A-Z]/.test(regPassword.value) ? 20 : 0) + (/\d/.test(regPassword.value) ? 20 : 0));
                meter.style.width = `${score}%`;
            });
        }
        document.getElementById('open-reset-modal')?.addEventListener('click', () => openModal('reset-password-modal'));
        document.getElementById('send-reset-btn')?.addEventListener('click', async () => {
            const email = validateResetEmail();
            if (!email || email === false) return;
            if (!supabase) {
                closeModal('reset-password-modal');
                return showToast('Supabase authentication is unavailable.', 'error');
            }
            showLoading('Sending reset link...');
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            hideLoading();
            if (error) return showToast(error.message, 'error');
            closeModal('reset-password-modal');
            showToast('Password reset link sent.', 'success');
        });
        document.getElementById('btn-login').onclick = async () => {
            const form = validateLoginForm();
            if (!form || form === false) return;
            const { email, password } = form;
            confirmAction('Sign in', `Sign in with ${email}?`, async () => {
                if (!supabase) {
                    return showAuthAlert('Supabase authentication is unavailable.', 'error');
                }
                showLoading('Signing in...');
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                hideLoading();
                if (error) {
                    const message = /email.*confirm|confirm.*email|not confirmed/i.test(error.message)
                        ? 'Your email is not verified yet. Please open your inbox and verify your email before signing in.'
                        : error.message;
                    return showAuthAlert(message, 'error');
                }
                showToast('Signed in successfully.', 'success');
            });
        };
        document.getElementById('btn-register').onclick = async () => {
            const form = validateRegisterForm();
            if (!form || form === false) return;
            const { fullName, email, password } = form;
            confirmAction('Create account', `Create a new account for ${email}?`, async () => {
                if (!supabase) {
                    return showAuthAlert('Supabase authentication is unavailable.', 'error');
                }
                showLoading('Creating account...');
                const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
                hideLoading();
                if (error) return showAuthAlert(error.message, 'error');
                setAuthView('login');
                authInputs.registerName.value = '';
                authInputs.registerEmail.value = '';
                authInputs.registerPassword.value = '';
                authInputs.registerConfirmPassword.value = '';
                authInputs.loginEmail.value = email;
                authInputs.loginPassword.value = '';
                const verificationRequired = !data?.session;
                const successMessage = verificationRequired
                    ? 'Registration successful. Please verify your email from your inbox before signing in.'
                    : 'Registration successful. Your account is ready to use.';
                showAuthAlert(successMessage, 'success');
            });
        };
        document.getElementById('btn-logout').onclick = async () => {
            confirmAction('Logout', 'Do you want to sign out of the current session?', async () => {
                if (supabase) await supabase.auth.signOut();
                currentUser = null;
                showAuth();
                showToast('Signed out.', 'success');
            });
        };
    }

    function bindNavigation() {
        navigationBtns.forEach(btn => btn.addEventListener('click', () => {
            activateView(btn.dataset.target);
            closeMobileNavigation();
        }));
        document.getElementById('new-invoice-from-list')?.addEventListener('click', () => { resetBillingForm(); activateView('view-billing'); });
        mobileMenuToggle?.addEventListener('click', toggleMobileNavigation);
        mobileSidebarOverlay?.addEventListener('click', closeMobileNavigation);
        mobileQuickInvoice?.addEventListener('click', () => {
            resetBillingForm();
            activateView('view-billing');
            closeMobileNavigation();
        });
        window.addEventListener('resize', () => {
            if (!isMobileViewport()) closeMobileNavigation();
        });
    }

    function bindBilling() {
        ui.patientName.addEventListener('input', syncPrintHeader);
        ui.doctorName.addEventListener('input', syncPrintHeader);
        ui.invoiceNo.addEventListener('input', syncPrintHeader);
        ui.invoiceDate.addEventListener('input', syncPrintHeader);
        ui.invoiceTime.addEventListener('input', syncPrintHeader);
        ui.billType.addEventListener('change', syncPrintHeader);
        ui.discount.addEventListener('input', calculateOverallTotals);
        ui.discountType.addEventListener('change', handleDiscountTypeChange);
        ui.adjust.addEventListener('input', calculateOverallTotals);
        document.getElementById('add-row-btn').addEventListener('click', addRow);
        document.getElementById('save-invoice-btn')?.addEventListener('click', () => {
            const invoice = collectInvoiceFromForm();
            if (!invoice.invoiceNo) return openNotice('Invoice', 'Invoice number is required.');
            if (!invoice.items.length) return openNotice('Invoice', 'Add at least one billing item.');
            confirmAction('Save invoice', `Save invoice ${invoice.invoiceNo}?`, () => saveInvoice(false));
        });
        document.getElementById('print-btn').addEventListener('click', () => {
            const invoice = collectInvoiceFromForm();
            if (!invoice.invoiceNo) return openNotice('Invoice', 'Invoice number is required.');
            if (!invoice.items.length) return openNotice('Invoice', 'Add at least one billing item.');
            confirmAction('Print invoice', `Save and print invoice ${invoice.invoiceNo}?`, () => saveInvoice(true));
        });
        document.getElementById('reset-billing-btn')?.addEventListener('click', () => confirmAction('Reset draft', 'Clear the current invoice draft?', resetBillingForm));
        document.getElementById('load-sample-invoice-btn')?.addEventListener('click', fillSampleInvoice);
        document.getElementById('open-product-picker')?.addEventListener('click', () => {
            renderProductPicker();
            openModal('product-picker-modal');
        });
        document.getElementById('product-picker-search')?.addEventListener('input', renderProductPicker);
        document.getElementById('export-btn')?.addEventListener('click', () => confirmAction('Export invoices', 'Export the current invoice data to CSV?', exportInvoices));
    }

    function bindInventory() {
        document.getElementById('open-add-stock-modal')?.addEventListener('click', () => openInventoryModal());
        document.getElementById('open-import-stock-modal')?.addEventListener('click', () => openModal('inventory-import-modal'));
        document.getElementById('inventory-units-per-sheet')?.addEventListener('input', syncInventoryRateFromSheet);
        document.getElementById('inventory-sheet-price')?.addEventListener('input', syncInventoryRateFromSheet);
        document.getElementById('inventory-form')?.addEventListener('submit', event => {
            event.preventDefault();
            const id = document.getElementById('inventory-id').value || `stk_${Date.now()}`;
            const unitsPerSheet = Number(document.getElementById('inventory-units-per-sheet').value || 0);
            const sheetPrice = Number(document.getElementById('inventory-sheet-price').value || 0);
            const stockItem = {
                id,
                item: document.getElementById('inventory-item').value.trim(),
                category: document.getElementById('inventory-category').value.trim(),
                sch: document.getElementById('inventory-sch').value.trim(),
                mfg: document.getElementById('inventory-mfg').value.trim(),
                batch: document.getElementById('inventory-batch').value.trim(),
                expiry: document.getElementById('inventory-expiry').value.trim(),
                shelf: document.getElementById('inventory-shelf').value.trim(),
                stock: Number(document.getElementById('inventory-stock').value || 0),
                unitsPerSheet,
                sheetPrice,
                price: calculateUnitPriceFromSheet(unitsPerSheet, sheetPrice, document.getElementById('inventory-price').value || 0)
            };
            if (!stockItem.item) return openNotice('Inventory', 'Item name is required.');
            if (sheetPrice > 0 && unitsPerSheet <= 0) return openNotice('Inventory', 'Enter tabs per sheet to calculate the tablet price.');
            const isEdit = state.stockData.some(item => item.id === id);
            confirmAction(isEdit ? 'Update inventory item' : 'Save inventory item', `Do you want to ${isEdit ? 'update' : 'save'} ${stockItem.item}?`, async () => {
                const index = state.stockData.findIndex(item => item.id === id);
                if (index >= 0) state.stockData[index] = stockItem; else state.stockData.push(stockItem);
                const saved = await persistStock({ loadingText: 'Saving inventory...', errorTitle: 'Saving inventory item' });
                if (!saved) return;
                renderStockTable();
                renderDashboard();
                renderProductPicker();
                closeModal('inventory-modal');
                showToast('Inventory item saved.', 'success');
            });
        });
        document.getElementById('save-json-stock-modal-btn')?.addEventListener('click', () => {
            const raw = document.getElementById('stock-json-modal-input').value.trim();
            if (!raw) return openNotice('Import inventory', 'Paste a JSON array first.');
            confirmAction('Import inventory', 'Import inventory items from the pasted JSON?', importInventoryJson);
        });
        document.getElementById('inventory-search')?.addEventListener('input', renderStockTable);
    }

    function bindInvoices() {
        document.getElementById('invoice-search')?.addEventListener('input', renderInvoiceTable);
        document.getElementById('invoice-view-edit-btn')?.addEventListener('click', () => {
            const invoice = state.invoiceData.find(item => item.id === activeInvoiceViewId);
            if (invoice) {
                loadInvoiceIntoBilling(invoice);
                closeModal('invoice-view-modal');
                activateView('view-billing');
            }
        });
        document.getElementById('invoice-view-delete-btn')?.addEventListener('click', () => {
            const id = activeInvoiceViewId;
            closeModal('invoice-view-modal');
            confirmAction('Delete invoice', 'This invoice will be removed permanently.', () => deleteInvoice(id));
        });
    }

    function bindOrders() {
        document.getElementById('open-order-modal')?.addEventListener('click', () => openOrderModal());
        document.getElementById('orders-search')?.addEventListener('input', renderOrders);
        document.getElementById('orders-status-filter')?.addEventListener('change', renderOrders);
        document.getElementById('order-form')?.addEventListener('submit', event => {
            event.preventDefault();
            const id = document.getElementById('order-id').value || `ord_${Date.now()}`;
            const order = {
                id,
                patientName: document.getElementById('order-patient-name').value.trim(),
                patientPhone: document.getElementById('order-patient-phone').value.trim(),
                medicineName: document.getElementById('order-medicine-name').value.trim(),
                quantity: Number(document.getElementById('order-quantity').value || 1),
                dueDate: document.getElementById('order-due-date').value,
                status: document.getElementById('order-status').value,
                notes: document.getElementById('order-notes').value.trim(),
                createdAt: state.orderData.find(item => item.id === id)?.createdAt || new Date().toISOString()
            };

            if (!order.patientName) return openNotice('Medicine Orders', 'Patient name is required.');
            if (!order.medicineName) return openNotice('Medicine Orders', 'Medicine name is required.');
            if (!order.dueDate) return openNotice('Medicine Orders', 'Due date is required.');
            if (order.quantity <= 0) return openNotice('Medicine Orders', 'Quantity should be at least 1.');

            const isEdit = state.orderData.some(item => item.id === id);
            confirmAction(isEdit ? 'Update medicine order' : 'Save medicine order', `Do you want to ${isEdit ? 'update' : 'save'} the order for ${order.patientName}?`, async () => {
                const index = state.orderData.findIndex(item => item.id === id);
                if (index >= 0) state.orderData[index] = order; else state.orderData.push(order);
                const saved = await persistOrders({ loadingText: 'Saving medicine order...', errorTitle: 'Saving medicine order' });
                if (!saved) return;
                renderOrders();
                closeModal('order-modal');
                showToast('Medicine order saved.', 'success');
            });
        });
    }

    function bindReports() {
        setReportsPreset('today');
        [
            ui.reportsDateFrom,
            ui.reportsDateTo,
            ui.reportsBillType,
            ui.reportsSearch
        ].forEach(input => input?.addEventListener('input', renderReports));
        ui.reportsBillType?.addEventListener('change', renderReports);
        document.getElementById('reports-today-btn')?.addEventListener('click', () => setReportsPreset('today'));
        document.getElementById('reports-week-btn')?.addEventListener('click', () => setReportsPreset('week'));
        document.getElementById('reports-month-btn')?.addEventListener('click', () => setReportsPreset('month'));
        document.getElementById('reports-all-btn')?.addEventListener('click', () => setReportsPreset('all'));
        document.getElementById('reports-reset-btn')?.addEventListener('click', () => {
            ui.reportsBillType.value = 'all';
            ui.reportsSearch.value = '';
            setReportsPreset('today');
        });
        document.getElementById('reports-print-btn')?.addEventListener('click', printReports);
        document.getElementById('reports-export-btn')?.addEventListener('click', exportReports);
    }

    function getDateInputValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function setReportsPreset(preset) {
        const now = new Date();
        const today = getDateInputValue(now);
        if (preset === 'today') {
            ui.reportsDateFrom.value = today;
            ui.reportsDateTo.value = today;
        } else if (preset === 'week') {
            const start = new Date(now);
            start.setDate(now.getDate() - 6);
            ui.reportsDateFrom.value = getDateInputValue(start);
            ui.reportsDateTo.value = today;
        } else if (preset === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            ui.reportsDateFrom.value = getDateInputValue(start);
            ui.reportsDateTo.value = today;
        } else {
            ui.reportsDateFrom.value = '';
            ui.reportsDateTo.value = '';
        }
        renderReports();
    }

    function formatCurrency(value) {
        return Number(value || 0).toFixed(2);
    }

    function getReportRangeLabel() {
        const from = ui.reportsDateFrom.value;
        const to = ui.reportsDateTo.value;
        const billType = ui.reportsBillType.value;
        const search = ui.reportsSearch.value.trim();
        const parts = [];
        if (from && to && from === to) parts.push(`For ${formatDate(from)}`);
        else if (from && to) parts.push(`${formatDate(from)} to ${formatDate(to)}`);
        else if (from) parts.push(`From ${formatDate(from)}`);
        else if (to) parts.push(`Up to ${formatDate(to)}`);
        else parts.push('All time');
        if (billType && billType !== 'all') parts.push(`Bill type: ${billType}`);
        if (search) parts.push(`Search: ${search}`);
        return parts.join(' | ');
    }

    function getFilteredInvoicesForReports() {
        const from = ui.reportsDateFrom.value;
        const to = ui.reportsDateTo.value;
        const billType = ui.reportsBillType.value;
        const search = ui.reportsSearch.value.trim().toLowerCase();

        return [...state.invoiceData]
            .filter(invoice => {
                if (from && invoice.date < from) return false;
                if (to && invoice.date > to) return false;
                if (billType !== 'all' && invoice.billType !== billType) return false;
                if (search) {
                    const haystack = `${invoice.invoiceNo} ${invoice.patientName} ${invoice.doctorName || ''}`.toLowerCase();
                    if (!haystack.includes(search)) return false;
                }
                return true;
            })
            .sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));
    }

    function buildReportData() {
        const invoices = getFilteredInvoicesForReports();
        const totalSales = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
        const invoiceCount = invoices.length;
        const averageSale = invoiceCount ? totalSales / invoiceCount : 0;
        const salesByDate = new Map();
        const billTypeSummary = new Map();
        const medicineSummary = new Map();

        invoices.forEach(invoice => {
            const dateKey = invoice.date || '';
            salesByDate.set(dateKey, (salesByDate.get(dateKey) || 0) + Number(invoice.totalAmount || 0));

            const typeKey = invoice.billType || 'Unknown';
            const currentType = billTypeSummary.get(typeKey) || { label: typeKey, value: 0, count: 0 };
            currentType.value += Number(invoice.totalAmount || 0);
            currentType.count += 1;
            billTypeSummary.set(typeKey, currentType);

            invoice.items.forEach(item => {
                const itemKey = item.item || 'Unknown item';
                const currentItem = medicineSummary.get(itemKey) || { label: itemKey, value: 0, qty: 0 };
                currentItem.value += Number(item.amount || Number(item.qty || 0) * Number(item.price || 0));
                currentItem.qty += Number(item.qty || 0);
                medicineSummary.set(itemKey, currentItem);
            });
        });

        const salesTrend = [...salesByDate.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({ label: formatDate(date), rawLabel: date, value }));
        const billTypeBreakdown = [...billTypeSummary.values()].sort((a, b) => b.value - a.value);
        const topMedicines = [...medicineSummary.values()].sort((a, b) => b.value - a.value).slice(0, 8);
        const topItem = topMedicines[0]?.label || '-';

        return {
            invoices,
            totalSales,
            invoiceCount,
            averageSale,
            topItem,
            salesTrend,
            billTypeBreakdown,
            topMedicines,
            rangeLabel: getReportRangeLabel()
        };
    }

    function renderTrendChart(points) {
        if (!points.length) return '<div class="report-empty-state">No sales found for the selected range.</div>';
        const maxValue = Math.max(...points.map(point => point.value), 1);
        return `
            <div class="report-trend-scroll">
                <div class="report-trend-chart">
                    ${points.map(point => `
                        <div class="report-trend-column">
                            <div class="report-trend-value">Rs ${formatCurrency(point.value)}</div>
                            <div class="report-trend-bar-wrap">
                                <div class="report-trend-bar" style="height:${Math.max((point.value / maxValue) * 100, 6)}%;"></div>
                            </div>
                            <div class="report-trend-label">${escapeHtml(point.label)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderBarList(items, formatter, fillClass = '') {
        if (!items.length) return '<div class="report-empty-state">No data available for this view.</div>';
        const maxValue = Math.max(...items.map(item => item.value), 1);
        return `
            <div class="report-bar-list">
                ${items.map(item => `
                    <div class="report-bar-item">
                        <div class="report-bar-meta">
                            <strong>${escapeHtml(item.label)}</strong>
                            <span>${formatter(item)}</span>
                        </div>
                        <div class="report-bar-track">
                            <div class="report-bar-fill ${fillClass}" style="width:${Math.max((item.value / maxValue) * 100, 8)}%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderReportsTable(invoices) {
        ui.reportsTableBody.innerHTML = '';
        if (!invoices.length) {
            ui.reportsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state-cell">No invoices found for the selected filters.</td></tr>';
            return;
        }
        invoices.forEach(invoice => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(invoice.date)} ${escapeHtml(invoice.time || '')}</td>
                <td>${escapeHtml(invoice.invoiceNo)}</td>
                <td>${escapeHtml(invoice.patientName)}</td>
                <td>${escapeHtml(invoice.billType || '-')}</td>
                <td>${invoice.items.length}</td>
                <td style="font-weight:bold;">${formatCurrency(invoice.totalAmount)}</td>`;
            ui.reportsTableBody.appendChild(tr);
        });
    }

    function renderReports() {
        const report = buildReportData();
        if (!ui.reportsTotalSales) return;
        ui.reportsTotalSales.textContent = formatCurrency(report.totalSales);
        ui.reportsTotalInvoices.textContent = String(report.invoiceCount);
        ui.reportsAverageSale.textContent = formatCurrency(report.averageSale);
        ui.reportsTopItem.textContent = report.topItem;
        ui.reportsRangeLabel.textContent = report.rangeLabel;
        ui.reportsPrintRange.textContent = report.rangeLabel;
        ui.reportsSalesTrend.innerHTML = renderTrendChart(report.salesTrend);
        ui.reportsBillTypeChart.innerHTML = renderBarList(
            report.billTypeBreakdown,
            item => `Rs ${formatCurrency(item.value)} | ${item.count} invoices`
        );
        ui.reportsTopMedicinesChart.innerHTML = renderBarList(
            report.topMedicines,
            item => `Rs ${formatCurrency(item.value)} | Qty ${item.qty}`,
            'alt'
        );
        renderReportsTable(report.invoices);
    }

    function getTodayDateString() {
        return getDateInputValue(new Date());
    }

    function getOrderStatusBadge(order) {
        const status = order.status || 'Pending';
        const today = getTodayDateString();
        if ((status === 'Pending' || status === 'Ordered') && order.dueDate && order.dueDate < today) {
            return { label: 'Overdue', className: 'danger' };
        }
        if (status === 'Ready') return { label: 'Ready', className: 'ready' };
        if (status === 'Delivered') return { label: 'Delivered', className: 'ready' };
        if (status === 'Cancelled') return { label: 'Cancelled', className: 'neutral' };
        if (status === 'Ordered') return { label: 'Ordered', className: 'warn' };
        return { label: 'Pending', className: '' };
    }

    function formatOrderCreatedAt(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return `${formatDate(getDateInputValue(date))} ${date.toTimeString().slice(0, 5)}`;
    }

    function openOrderModal(id = null) {
        const defaultDueDate = getTodayDateString();
        const order = state.orderData.find(item => item.id === id) || {
            id: '',
            patientName: '',
            patientPhone: '',
            medicineName: '',
            quantity: 1,
            dueDate: defaultDueDate,
            status: 'Pending',
            notes: ''
        };
        document.getElementById('order-modal-title').textContent = id ? 'Edit Medicine Order' : 'Add Medicine Order';
        document.getElementById('order-id').value = order.id || '';
        document.getElementById('order-patient-name').value = order.patientName || '';
        document.getElementById('order-patient-phone').value = order.patientPhone || '';
        document.getElementById('order-medicine-name').value = order.medicineName || '';
        document.getElementById('order-quantity').value = order.quantity || 1;
        document.getElementById('order-due-date').value = order.dueDate || defaultDueDate;
        document.getElementById('order-status').value = order.status || 'Pending';
        document.getElementById('order-notes').value = order.notes || '';
        openModal('order-modal');
    }

    async function persistOrders(options = {}) {
        return persistCloudState({
            loadingText: 'Saving medicine orders...',
            errorTitle: 'Saving medicine orders',
            ...options
        });
    }

    async function updateOrderStatus(id, status) {
        const order = state.orderData.find(item => item.id === id);
        if (!order) return;
        order.status = status;
        const saved = await persistOrders({ loadingText: 'Updating medicine order...', errorTitle: 'Updating medicine order' });
        if (!saved) return;
        renderOrders();
        showToast(`Order marked as ${status.toLowerCase()}.`, 'success');
    }

    async function deleteOrder(id) {
        state.orderData = state.orderData.filter(item => item.id !== id);
        const saved = await persistOrders({ loadingText: 'Deleting medicine order...', errorTitle: 'Deleting medicine order' });
        if (!saved) return;
        renderOrders();
        showToast('Medicine order deleted.', 'success');
    }

    function renderOrders() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;
        const search = document.getElementById('orders-search')?.value.trim().toLowerCase() || '';
        const statusFilter = document.getElementById('orders-status-filter')?.value || 'all';
        const filtered = [...state.orderData]
            .filter(order => {
                const badge = getOrderStatusBadge(order);
                const matchesStatus = statusFilter === 'all' || order.status === statusFilter || (statusFilter === 'Pending' && badge.label === 'Overdue');
                if (!matchesStatus) return false;
                if (!search) return true;
                const haystack = `${order.patientName} ${order.patientPhone} ${order.medicineName} ${order.notes}`.toLowerCase();
                return haystack.includes(search);
            })
            .sort((a, b) => {
                const dueCompare = (a.dueDate || '').localeCompare(b.dueDate || '');
                if (dueCompare !== 0) return dueCompare;
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            });

        tbody.innerHTML = '';
        filtered.forEach(order => {
            const badge = getOrderStatusBadge(order);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatOrderCreatedAt(order.createdAt)}</td>
                <td><strong>${escapeHtml(order.patientName)}</strong>${order.patientPhone ? `<div class="text-sm">${escapeHtml(order.patientPhone)}</div>` : ''}</td>
                <td>${escapeHtml(order.medicineName)}</td>
                <td>${order.quantity}</td>
                <td>${formatDate(order.dueDate)}</td>
                <td><span class="status-badge ${badge.className}">${escapeHtml(badge.label)}</span></td>
                <td class="order-notes-cell">${escapeHtml(order.notes || '-')}</td>
                <td class="table-actions wrap">
                    <button class="btn secondary btn-sm js-order-edit" data-id="${order.id}"><i class="fa-solid fa-pen"></i></button>
                    ${order.status !== 'Ready' && order.status !== 'Delivered' && order.status !== 'Cancelled' ? `<button class="btn secondary btn-sm js-order-ready" data-id="${order.id}"><i class="fa-solid fa-box-open"></i> Ready</button>` : ''}
                    ${order.status !== 'Delivered' && order.status !== 'Cancelled' ? `<button class="btn secondary btn-sm js-order-delivered" data-id="${order.id}"><i class="fa-solid fa-circle-check"></i> Delivered</button>` : ''}
                    ${order.status !== 'Cancelled' ? `<button class="btn secondary btn-sm js-order-cancel" data-id="${order.id}"><i class="fa-solid fa-ban"></i></button>` : ''}
                    <button class="btn danger-solid btn-sm js-order-delete" data-id="${order.id}"><i class="fa-solid fa-trash"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });

        if (!filtered.length) tbody.innerHTML = '<tr><td colspan="8" class="empty-state-cell">No medicine orders found.</td></tr>';

        const totalCount = state.orderData.length;
        const pendingCount = state.orderData.filter(item => ['Pending', 'Ordered'].includes(item.status)).length;
        const overdueCount = state.orderData.filter(item => getOrderStatusBadge(item).label === 'Overdue').length;
        const deliveredCount = state.orderData.filter(item => item.status === 'Delivered').length;
        document.getElementById('orders-total-count').textContent = String(totalCount);
        document.getElementById('orders-pending-count').textContent = String(pendingCount);
        document.getElementById('orders-overdue-count').textContent = String(overdueCount);
        document.getElementById('orders-delivered-count').textContent = String(deliveredCount);

        tbody.querySelectorAll('.js-order-edit').forEach(btn => btn.addEventListener('click', () => openOrderModal(btn.dataset.id)));
        tbody.querySelectorAll('.js-order-ready').forEach(btn => btn.addEventListener('click', () => confirmAction('Mark order ready', 'Mark this medicine order as ready for the patient?', () => updateOrderStatus(btn.dataset.id, 'Ready'))));
        tbody.querySelectorAll('.js-order-delivered').forEach(btn => btn.addEventListener('click', () => confirmAction('Mark delivered', 'Mark this medicine order as delivered?', () => updateOrderStatus(btn.dataset.id, 'Delivered'))));
        tbody.querySelectorAll('.js-order-cancel').forEach(btn => btn.addEventListener('click', () => confirmAction('Cancel order', 'Cancel this medicine order?', () => updateOrderStatus(btn.dataset.id, 'Cancelled'))));
        tbody.querySelectorAll('.js-order-delete').forEach(btn => btn.addEventListener('click', () => confirmAction('Delete order', 'Delete this medicine order permanently?', () => deleteOrder(btn.dataset.id))));
    }

    function printReports() {
        runPrintJob({
            mode: 'reports',
            viewId: 'view-reports',
            beforePrint: () => renderReports()
        });
    }

    function exportReports() {
        const report = buildReportData();
        if (!window.XLSX) return openNotice('Export', 'Excel export library is unavailable.');

        const summaryRows = [
            { Metric: 'Range', Value: report.rangeLabel },
            { Metric: 'Total Sales', Value: formatCurrency(report.totalSales) },
            { Metric: 'Invoice Count', Value: report.invoiceCount },
            { Metric: 'Average Invoice', Value: formatCurrency(report.averageSale) },
            { Metric: 'Top Medicine', Value: report.topItem }
        ];
        const invoiceRows = report.invoices.map(invoice => ({
            'Invoice No': invoice.invoiceNo,
            Date: invoice.date,
            Time: invoice.time,
            Patient: invoice.patientName,
            Doctor: invoice.doctorName || '',
            'Bill Type': invoice.billType || '',
            Items: invoice.items.length,
            Total: formatCurrency(invoice.totalAmount),
            Notes: invoice.notes || ''
        }));
        const medicineRows = report.topMedicines.map(item => ({
            Medicine: item.label,
            Quantity: item.qty,
            Revenue: formatCurrency(item.value)
        }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invoiceRows), 'Invoices');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(medicineRows), 'Top Medicines');
        XLSX.writeFile(workbook, 'pharmabill-reports.xlsx');
        showToast('Report exported.', 'success');
    }

    function bindSettings() {
        document.getElementById('open-settings-modal')?.addEventListener('click', () => {
            populateSettingsModal();
            openModal('settings-modal');
        });
        document.getElementById('settings-form-modal')?.addEventListener('submit', event => {
            event.preventDefault();
            const details = {
                name: document.getElementById('modal-setting-name').value.trim(),
                owner: document.getElementById('modal-setting-owner').value.trim(),
                phone: document.getElementById('modal-setting-phone').value.trim(),
                gstin: document.getElementById('modal-setting-gstin').value.trim(),
                address: document.getElementById('modal-setting-address').value.trim(),
                dl1: document.getElementById('modal-setting-dl1').value.trim(),
                dl2: document.getElementById('modal-setting-dl2').value.trim(),
                footer: document.getElementById('modal-setting-footer').value.trim()
            };
            confirmAction('Save profile settings', 'Save these pharmacy profile changes?', async () => {
                state.pharmacyDetails = details;
                const saved = await persistCloudState({ loadingText: 'Saving pharmacy profile...', errorTitle: 'Saving pharmacy profile' });
                if (!saved) return;
                renderPharmacyDetails();
                closeModal('settings-modal');
                showToast('Settings updated.', 'success');
            });
        });
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            const details = {
                ...state.pharmacyDetails,
                name: document.getElementById('setting-name').value.trim(),
                phone: document.getElementById('setting-phone').value.trim(),
                address: document.getElementById('setting-address').value.trim(),
                gstin: document.getElementById('setting-gstin').value.trim(),
                dl1: document.getElementById('setting-dl1').value.trim(),
                dl2: document.getElementById('setting-dl2').value.trim()
            };
            confirmAction('Save settings', 'Save these pharmacy details?', async () => {
                state.pharmacyDetails = details;
                const saved = await persistCloudState({ loadingText: 'Saving settings...', errorTitle: 'Saving settings' });
                if (!saved) return;
                renderPharmacyDetails();
                showToast('Settings saved.', 'success');
            });
        });
        document.getElementById('open-reset-data-modal')?.addEventListener('click', () => confirmAction('Reset data', 'Clear invoices, inventory, medicine orders, and pharmacy profile from Supabase?', resetDemoData));
    }
    function bindModals() {
        document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
        document.querySelectorAll('.modal-shell').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal) closeModal(modal.id);
            });
        });
        document.getElementById('confirm-action-btn')?.addEventListener('click', () => {
            const handler = confirmHandler;
            confirmHandler = null;
            if (handler) handler();
            closeModal('confirm-modal');
        });
    }

    function addRow(item = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-sno"><span class="readonly-text"></span></td>
            <td class="col-item"><input type="text" class="item-input" value="${escapeHtml(item.item || '')}"></td>
            <td class="col-sch"><input type="text" class="sch-input" value="${escapeHtml(item.sch || '')}"></td>
            <td class="col-mfg"><input type="text" class="mfg-input" value="${escapeHtml(item.mfg || '')}"></td>
            <td class="col-batch"><input type="text" class="batch-input" value="${escapeHtml(item.batch || '')}"></td>
            <td class="col-expiry"><input type="text" class="expiry-input" value="${escapeHtml(item.expiry || '')}"></td>
            <td class="col-shelf no-print"><input type="text" class="shelf-input" value="${escapeHtml(item.shelf || '')}" readonly tabindex="-1"></td>
            <td class="col-qty"><input type="number" min="1" value="${item.qty || 1}" class="qty-input"></td>
            <td class="col-price"><input type="number" min="0" step="0.01" value="${item.price || 0}" class="price-input"></td>
            <td class="col-amount"><input type="text" readonly value="0.00" class="amount-input" tabindex="-1"></td>
            <td class="action-col no-print"><button class="btn danger delete-row-btn" tabindex="-1"><i class="fa-solid fa-trash"></i></button></td>`;
        tableBody.appendChild(tr);
        tr.querySelector('.item-input').addEventListener('input', event => handleItemInput(event, tr));
        tr.querySelectorAll('.qty-input, .price-input').forEach(input => input.addEventListener('input', () => calculateRow(tr)));
        tr.querySelector('.delete-row-btn').addEventListener('click', () => {
            tr.remove();
            updateSno();
            calculateOverallTotals();
        });
        tr.querySelectorAll('input:not([readonly])').forEach(input => input.addEventListener('keydown', event => handleInputNavigation(event, tr)));
        updateSno();
        calculateRow(tr);
    }

    function handleItemInput(event, tr) {
        const search = event.target.value.toLowerCase().trim();
        if (!search) return;
        const match = state.stockData.find(stock => (stock.item || '').toLowerCase().includes(search));
        if (!match) return;
        tr.querySelector('.item-input').value = match.item || '';
        tr.querySelector('.sch-input').value = match.sch || '';
        tr.querySelector('.mfg-input').value = match.mfg || '';
        tr.querySelector('.batch-input').value = match.batch || '';
        tr.querySelector('.expiry-input').value = match.expiry || '';
        tr.querySelector('.shelf-input').value = match.shelf || '';
        tr.querySelector('.price-input').value = match.price || 0;
        calculateRow(tr);
    }

    function handleInputNavigation(event, tr) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const inputs = [...tr.querySelectorAll('input:not([readonly])')];
        const index = inputs.indexOf(event.target);
        if (index < inputs.length - 1) return inputs[index + 1].focus();
        addRow();
        tableBody.lastElementChild?.querySelector('.item-input')?.focus();
    }

    function calculateRow(tr) {
        const qty = Number(tr.querySelector('.qty-input').value || 0);
        const price = Number(tr.querySelector('.price-input').value || 0);
        const total = roundCurrency(qty * price);
        tr.dataset.subtotal = String(total);
        tr.querySelector('.amount-input').value = total.toFixed(2);
        calculateOverallTotals();
    }

    function calculateOverallTotals() {
        let grossAmt = 0;
        tableBody.querySelectorAll('tr').forEach(tr => grossAmt += Number(tr.dataset.subtotal || 0));
        grossAmt = roundCurrency(grossAmt);
        const discountType = getDiscountType();
        const discountValue = getNormalizedDiscountValue(Number(ui.discount.value || 0), discountType);
        const discount = getDiscountAmount(grossAmt, discountValue, discountType);
        ui.discount.value = discountValue.toFixed(2);
        const amountAfterDiscount = Math.max(0, roundCurrency(grossAmt - discount));
        const adjust = getAutoAdjustAmount(amountAfterDiscount);
        const finalAmount = Math.max(0, roundCurrency(amountAfterDiscount + adjust));
        ui.adjust.value = adjust.toFixed(2);
        ui.grossAmt.textContent = grossAmt.toFixed(2);
        ui.netAmt.textContent = finalAmount.toFixed(2);
        ui.printFooterGross.textContent = grossAmt.toFixed(2);
        ui.printFooterDiscount.textContent = discount.toFixed(2);
        ui.printFooterAdjust.textContent = adjust.toFixed(2);
        ui.printFooterNet.textContent = finalAmount.toFixed(2);
        ui.amountWords.textContent = `${convertNumberToWords(finalAmount)} Rupees Only.`;
    }

    function collectInvoiceFromForm() {
        const items = [...tableBody.querySelectorAll('tr')].map(tr => ({
            item: tr.querySelector('.item-input').value.trim(),
            sch: tr.querySelector('.sch-input').value.trim(),
            mfg: tr.querySelector('.mfg-input').value.trim(),
            batch: tr.querySelector('.batch-input').value.trim(),
            expiry: tr.querySelector('.expiry-input').value.trim(),
            shelf: tr.querySelector('.shelf-input').value.trim(),
            qty: Number(tr.querySelector('.qty-input').value || 0),
            price: Number(tr.querySelector('.price-input').value || 0),
            amount: Number(tr.dataset.subtotal || 0)
        })).filter(item => item.item && item.qty > 0);
        const discountType = getDiscountType();
        const discountValue = getNormalizedDiscountValue(Number(ui.discount.value || 0), discountType);
        const grossAmount = roundCurrency(Number(ui.grossAmt.textContent || 0));
        return {
            id: editingInvoiceId || `inv_${Date.now()}`,
            invoiceNo: sanitizeInvoiceNumber(ui.invoiceNo.value),
            patientName: ui.patientName.value.trim() || 'Walk-in',
            doctorName: ui.doctorName.value.trim(),
            billType: ui.billType.value,
            date: ui.invoiceDate.value,
            time: ui.invoiceTime.value,
            discountType,
            discountValue,
            discount: getDiscountAmount(grossAmount, discountValue, discountType),
            adjust: Number(ui.adjust.value || 0),
            notes: ui.invoiceNotes.value.trim(),
            totalAmount: Number(ui.netAmt.textContent || 0),
            status: 'Saved',
            items
        };
    }

    async function saveInvoice(shouldPrint) {
        const invoice = collectInvoiceFromForm();
        if (!invoice.invoiceNo) return openNotice('Invoice', 'Invoice number is required.');
        if (!invoice.items.length) return openNotice('Invoice', 'Add at least one billing item.');
        const duplicateInvoice = state.invoiceData.find(item => item.id !== invoice.id && sanitizeInvoiceNumber(item.invoiceNo) === invoice.invoiceNo);
        if (duplicateInvoice) {
            return openNotice('Duplicate invoice number', `Invoice number ${invoice.invoiceNo} already exists. Please use the next available invoice number.`);
        }
        const existingIndex = state.invoiceData.findIndex(item => item.id === invoice.id);
        if (existingIndex >= 0) state.invoiceData[existingIndex] = invoice; else state.invoiceData.push(invoice);
        const saved = await persistCloudState({ loadingText: shouldPrint ? 'Saving invoice for print...' : 'Saving invoice...', errorTitle: shouldPrint ? 'Saving invoice for print' : 'Saving invoice' });
        if (!saved) return;
        editingInvoiceId = invoice.id;
        const invoiceSearch = document.getElementById('invoice-search');
        if (invoiceSearch) invoiceSearch.value = '';
        updateBillingMode();
        renderInvoiceTable();
        renderDashboard();
        renderReports();
        showToast(existingIndex >= 0 ? 'Invoice updated.' : 'Invoice saved.', 'success');
        if (shouldPrint) {
            runPrintJob({
                mode: 'invoice',
                viewId: 'view-billing',
                afterPrint: () => {
                    resetBillingForm();
                    activateView('view-invoices');
                }
            });
            return;
        }
        resetBillingForm();
        activateView('view-invoices');
    }

    function loadInvoiceIntoBilling(invoice) {
        editingInvoiceId = invoice.id;
        ui.patientName.value = invoice.patientName || '';
        ui.doctorName.value = invoice.doctorName || '';
        ui.billType.value = invoice.billType || 'Cash';
        ui.invoiceNo.value = sanitizeInvoiceNumber(invoice.invoiceNo);
        ui.invoiceDate.value = invoice.date || '';
        ui.invoiceTime.value = invoice.time || '';
        ui.invoiceNotes.value = invoice.notes || '';
        ui.discountType.value = invoice.discountType || 'amount';
        ui.discount.value = Number(invoice.discountValue ?? invoice.discount ?? 0).toFixed(2);
        syncDiscountFieldState();
        ui.adjust.value = invoice.adjust || 0;
        tableBody.innerHTML = '';
        invoice.items.forEach(item => addRow(item));
        if (!invoice.items.length) addRow();
        syncPrintHeader();
        calculateOverallTotals();
        updateBillingMode();
    }

    function resetBillingForm() {
        editingInvoiceId = null;
        ui.patientName.value = '';
        ui.doctorName.value = '';
        ui.invoiceNo.value = getNextInvoiceNumber();
        const now = new Date();
        ui.invoiceDate.valueAsDate = now;
        ui.invoiceTime.value = now.toTimeString().slice(0, 5);
        ui.billType.value = 'Cash';
        ui.invoiceNotes.value = '';
        ui.discountType.value = 'amount';
        ui.discount.value = '0.00';
        syncDiscountFieldState();
        ui.adjust.value = '0.00';
        tableBody.innerHTML = '';
        addRow();
        syncPrintHeader();
        calculateOverallTotals();
        updateBillingMode();
    }

    function updateBillingMode() {
        const header = document.querySelector('#view-billing .view-header h2');
        if (header) header.textContent = editingInvoiceId ? 'Update Invoice' : 'Create Invoice';
    }

    function snapshotBillingForm() {
        return {
            editingInvoiceId,
            patientName: ui.patientName.value,
            doctorName: ui.doctorName.value,
            billType: ui.billType.value,
            invoiceNo: ui.invoiceNo.value,
            date: ui.invoiceDate.value,
            time: ui.invoiceTime.value,
            notes: ui.invoiceNotes.value,
            discountType: getDiscountType(),
            discount: ui.discount.value,
            adjust: ui.adjust.value,
            rows: [...tableBody.querySelectorAll('tr')].map(tr => ({
                item: tr.querySelector('.item-input')?.value || '',
                sch: tr.querySelector('.sch-input')?.value || '',
                mfg: tr.querySelector('.mfg-input')?.value || '',
                batch: tr.querySelector('.batch-input')?.value || '',
                expiry: tr.querySelector('.expiry-input')?.value || '',
                shelf: tr.querySelector('.shelf-input')?.value || '',
                qty: Number(tr.querySelector('.qty-input')?.value || 0),
                price: Number(tr.querySelector('.price-input')?.value || 0)
            }))
        };
    }

    function restoreBillingSnapshot(snapshot) {
        editingInvoiceId = snapshot?.editingInvoiceId || null;
        ui.patientName.value = snapshot?.patientName || '';
        ui.doctorName.value = snapshot?.doctorName || '';
        ui.billType.value = snapshot?.billType || 'Cash';
        ui.invoiceNo.value = sanitizeInvoiceNumber(snapshot?.invoiceNo) || (editingInvoiceId ? '' : getNextInvoiceNumber());
        ui.invoiceDate.value = snapshot?.date || '';
        ui.invoiceTime.value = snapshot?.time || '';
        ui.invoiceNotes.value = snapshot?.notes || '';
        ui.discountType.value = snapshot?.discountType || 'amount';
        ui.discount.value = snapshot?.discount || '0.00';
        syncDiscountFieldState();
        ui.adjust.value = snapshot?.adjust || '0.00';
        tableBody.innerHTML = '';
        if (snapshot?.rows?.length) {
            snapshot.rows.forEach(row => addRow(row));
        } else {
            addRow();
        }
        syncPrintHeader();
        calculateOverallTotals();
        updateBillingMode();
    }

    function fillSampleInvoice() {
        resetBillingForm();
        ui.patientName.value = 'Rohit Sharma';
        ui.doctorName.value = 'Dr. Priya Nair';
        ui.invoiceNotes.value = 'Paid by cash';
        tableBody.innerHTML = '';
        addRow({ item: 'Paracetamol 500mg', sch: 'H', mfg: 'SUN', batch: 'B10', expiry: '12/26', qty: 2, price: 5 });
        addRow({ item: 'Vitamin C Syrup', sch: 'OTC', mfg: 'CIPLA', batch: 'C11', expiry: '08/27', qty: 1, price: 85 });
        syncPrintHeader();
    }
    function renderDashboard() {
        const today = new Date().toISOString().split('T')[0];
        let todaySales = 0;
        let todayCount = 0;
        const frequency = {};
        state.invoiceData.forEach(invoice => {
            if (invoice.date === today) {
                todaySales += Number(invoice.totalAmount || 0);
                todayCount += 1;
            }
            invoice.items.forEach(item => {
                frequency[item.item] = (frequency[item.item] || 0) + Number(item.qty || 0);
            });
        });
        document.getElementById('db-today-sales').textContent = todaySales.toFixed(2);
        document.getElementById('db-today-count').textContent = String(todayCount);
        document.getElementById('db-stock-count')?.replaceChildren(document.createTextNode(String(state.stockData.length)));
        document.getElementById('db-low-stock-count')?.replaceChildren(document.createTextNode(String(state.stockData.filter(item => Number(item.stock) <= 10).length)));
        const topBody = document.getElementById('db-top-medicines');
        topBody.innerHTML = '';
        Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([item, qty]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${escapeHtml(item)}</td><td>${qty}</td>`;
            topBody.appendChild(tr);
        });
        if (!topBody.children.length) topBody.innerHTML = '<tr><td colspan="2" class="empty-state-cell">No sales data yet.</td></tr>';

        const activity = document.getElementById('dashboard-activity');
        if (activity) {
            activity.innerHTML = '';
            [...state.invoiceData].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 4).forEach(invoice => {
                activity.insertAdjacentHTML('beforeend', `<div class="activity-item"><strong>${escapeHtml(invoice.invoiceNo)}</strong><span>${escapeHtml(invoice.patientName)}</span><em>Rs ${Number(invoice.totalAmount).toFixed(2)}</em></div>`);
            });
            if (!activity.children.length) activity.innerHTML = '<div class="activity-item empty">No recent invoice activity.</div>';
        }
        const lowStock = document.getElementById('dashboard-low-stock');
        if (lowStock) {
            lowStock.innerHTML = '';
            state.stockData.filter(item => Number(item.stock) <= 10).slice(0, 5).forEach(item => {
                lowStock.insertAdjacentHTML('beforeend', `<div class="activity-item"><strong>${escapeHtml(item.item)}</strong><span>${escapeHtml(item.batch || 'No batch')}</span><em>${Number(item.stock || 0)} left</em></div>`);
            });
            if (!lowStock.children.length) lowStock.innerHTML = '<div class="activity-item empty">No low-stock alerts.</div>';
        }
    }

    function renderInvoiceTable() {
        const tbody = document.getElementById('invoices-history-body');
        const search = document.getElementById('invoice-search')?.value.trim().toLowerCase() || '';
        tbody.innerHTML = '';
        const filtered = [...state.invoiceData].reverse().filter(invoice => {
            const invoiceNo = String(invoice.invoiceNo || '').toLowerCase();
            const patientName = String(invoice.patientName || '').toLowerCase();
            return !search || invoiceNo.includes(search) || patientName.includes(search);
        });
        filtered.forEach(invoice => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(invoice.date)} ${escapeHtml(invoice.time || '')}</td>
                <td>${escapeHtml(invoice.invoiceNo)}</td>
                <td>${escapeHtml(invoice.patientName)}</td>
                <td style="font-weight:bold;">${Number(invoice.totalAmount).toFixed(2)}</td>
                <td><span class="status-badge">${escapeHtml(invoice.status || 'Saved')}</span></td>
                <td class="table-actions"><button class="btn secondary btn-sm js-view" data-id="${invoice.id}"><i class="fa-solid fa-eye"></i> View</button><button class="btn secondary btn-sm js-edit" data-id="${invoice.id}"><i class="fa-solid fa-pen"></i> Edit</button><button class="btn secondary btn-sm js-print" data-id="${invoice.id}"><i class="fa-solid fa-print"></i> Print</button><button class="btn danger-solid btn-sm js-delete" data-id="${invoice.id}"><i class="fa-solid fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
        if (!filtered.length) tbody.innerHTML = '<tr><td colspan="6" class="empty-state-cell">No invoices found.</td></tr>';
        tbody.querySelectorAll('.js-view').forEach(btn => btn.addEventListener('click', () => openInvoicePreview(btn.dataset.id)));
        tbody.querySelectorAll('.js-edit').forEach(btn => btn.addEventListener('click', () => {
            const invoice = state.invoiceData.find(item => item.id === btn.dataset.id);
            if (invoice) {
                loadInvoiceIntoBilling(invoice);
                activateView('view-billing');
            }
        }));
        tbody.querySelectorAll('.js-print').forEach(btn => btn.addEventListener('click', () => printSavedInvoice(btn.dataset.id)));
        tbody.querySelectorAll('.js-delete').forEach(btn => btn.addEventListener('click', () => confirmAction('Delete invoice', 'This invoice will be removed permanently.', () => deleteInvoice(btn.dataset.id))));
    }

    function printSavedInvoice(id) {
        const invoice = state.invoiceData.find(item => item.id === id);
        if (!invoice) return showToast('Invoice not found.', 'error');
        const billingSnapshot = snapshotBillingForm();
        loadInvoiceIntoBilling(invoice);
        runPrintJob({
            mode: 'invoice',
            viewId: 'view-billing',
            afterPrint: () => restoreBillingSnapshot(billingSnapshot)
        });
    }

    function openInvoicePreview(id) {
        const invoice = state.invoiceData.find(item => item.id === id);
        if (!invoice) return;
        activeInvoiceViewId = id;
        document.getElementById('invoice-view-title').textContent = `Invoice ${invoice.invoiceNo}`;
        document.getElementById('invoice-view-meta').innerHTML = `<div class="preview-grid"><div><span>Patient</span><strong>${escapeHtml(invoice.patientName)}</strong></div><div><span>Doctor</span><strong>${escapeHtml(invoice.doctorName || '-')}</strong></div><div><span>Date</span><strong>${formatDate(invoice.date)} ${escapeHtml(invoice.time || '')}</strong></div><div><span>Total</span><strong>Rs ${Number(invoice.totalAmount).toFixed(2)}</strong></div><div><span>Notes</span><strong>${escapeHtml(invoice.notes || '-')}</strong></div></div>`;
        const itemsBody = document.getElementById('invoice-view-items');
        itemsBody.innerHTML = '';
        invoice.items.forEach(item => {
            itemsBody.insertAdjacentHTML('beforeend', `<tr><td>${escapeHtml(item.item)}</td><td>${item.qty}</td><td>${Number(item.price || 0).toFixed(2)}</td><td>${Number(item.amount || item.qty * item.price).toFixed(2)}</td></tr>`);
        });
        openModal('invoice-view-modal');
    }

    async function deleteInvoice(id) {
        state.invoiceData = state.invoiceData.filter(item => item.id !== id);
        const saved = await persistCloudState({ loadingText: 'Deleting invoice...', errorTitle: 'Deleting invoice' });
        if (!saved) return;
        renderInvoiceTable();
        renderDashboard();
        renderReports();
        if (editingInvoiceId === id) resetBillingForm();
        showToast('Invoice deleted.', 'success');
    }

    function renderStockTable() {
        const tbody = document.getElementById('stock-inventory-body');
        const search = document.getElementById('inventory-search')?.value.trim().toLowerCase() || '';
        const header = document.querySelector('#view-inventory table thead tr');
        if (header && header.children.length < 8) header.insertAdjacentHTML('beforeend', '<th>Actions</th>');
        tbody.innerHTML = '';
        state.stockData.filter(item => {
            const haystack = `${item.item} ${item.mfg} ${item.batch} ${item.shelf || ''}`.toLowerCase();
            return !search || haystack.includes(search);
        }).forEach(item => {
            const qty = Number(item.stock || 0);
            const status = qty <= 10 ? 'Low stock' : 'Healthy';
            const packLabel = getPackLabel(item);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(item.item)}</td>
                <td>${escapeHtml(item.sch || '')}</td>
                <td>${escapeHtml(item.mfg || '')}</td>
                <td>${escapeHtml(item.batch || '')}</td>
                <td>${escapeHtml(item.expiry || '')}</td>
                <td>${escapeHtml(item.shelf || '-')}</td>
                <td class="${qty <= 10 ? 'stock-warning' : ''}">${qty}</td>
                <td><div>Rs ${Number(item.price || 0).toFixed(2)}${packLabel ? ' / tab' : ''}</div>${packLabel ? `<div class="text-sm">${escapeHtml(packLabel)}</div>` : ''}</td>
                <td><span class="status-badge ${qty <= 10 ? 'warn' : ''}">${status}</span></td>
                <td class="table-actions"><button class="btn secondary btn-sm js-stock-edit" data-id="${item.id}"><i class="fa-solid fa-pen"></i></button><button class="btn danger-solid btn-sm js-stock-delete" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button></td>`;
            tbody.appendChild(tr);
        });
        if (!tbody.children.length) tbody.innerHTML = '<tr><td colspan="10" class="empty-state-cell">No inventory items found.</td></tr>';
        tbody.querySelectorAll('.js-stock-edit').forEach(btn => btn.addEventListener('click', () => openInventoryModal(btn.dataset.id)));
        tbody.querySelectorAll('.js-stock-delete').forEach(btn => btn.addEventListener('click', () => confirmAction('Delete inventory item', 'Remove this item from stock?', () => deleteStockItem(btn.dataset.id))));
    }

    function openInventoryModal(id = null) {
        const item = state.stockData.find(stock => stock.id === id) || { id: '', item: '', category: '', sch: '', mfg: '', batch: '', expiry: '', shelf: '', stock: 0, unitsPerSheet: 0, sheetPrice: 0, price: 0 };
        document.getElementById('inventory-modal-title').textContent = id ? 'Edit Inventory Item' : 'Add Inventory Item';
        document.getElementById('inventory-id').value = item.id || '';
        document.getElementById('inventory-item').value = item.item || '';
        document.getElementById('inventory-category').value = item.category || '';
        document.getElementById('inventory-sch').value = item.sch || '';
        document.getElementById('inventory-mfg').value = item.mfg || '';
        document.getElementById('inventory-batch').value = item.batch || '';
        document.getElementById('inventory-expiry').value = item.expiry || '';
        document.getElementById('inventory-shelf').value = item.shelf || '';
        document.getElementById('inventory-stock').value = item.stock || 0;
        document.getElementById('inventory-units-per-sheet').value = item.unitsPerSheet || '';
        document.getElementById('inventory-sheet-price').value = item.sheetPrice || '';
        document.getElementById('inventory-price').value = item.price || 0;
        openModal('inventory-modal');
    }

    async function deleteStockItem(id) {
        state.stockData = state.stockData.filter(item => item.id !== id);
        const saved = await persistStock({ loadingText: 'Deleting inventory item...', errorTitle: 'Deleting inventory item' });
        if (!saved) return;
        renderStockTable();
        renderDashboard();
        renderProductPicker();
        showToast('Inventory item deleted.', 'success');
    }

    async function importInventoryJson() {
        const raw = document.getElementById('stock-json-modal-input').value.trim();
        if (!raw) return openNotice('Import inventory', 'Paste a JSON array first.');
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return openNotice('Import inventory', 'JSON must be an array.');
            parsed.forEach(entry => {
                const stockItem = normalizeStock([entry])[0];
                const index = state.stockData.findIndex(item => item.id === stockItem.id || item.item.toLowerCase() === stockItem.item.toLowerCase());
                if (index >= 0) state.stockData[index] = stockItem; else state.stockData.push(stockItem);
            });
            const saved = await persistStock({ loadingText: 'Importing inventory...', errorTitle: 'Importing inventory' });
            if (!saved) return;
            renderStockTable();
            renderDashboard();
            renderProductPicker();
            closeModal('inventory-import-modal');
            showToast('Inventory JSON imported.', 'success');
        } catch (error) {
            openNotice('Import inventory', 'Invalid JSON format.');
        }
    }
    function renderProductPicker() {
        const search = document.getElementById('product-picker-search')?.value.trim().toLowerCase() || '';
        const list = document.getElementById('product-picker-list');
        if (!list) return;
        list.innerHTML = '';
        state.stockData.filter(item => !search || item.item.toLowerCase().includes(search)).forEach(item => {
            const packLabel = getPackLabel(item);
            const shelfLabel = item.shelf ? ` | Shelf ${escapeHtml(item.shelf)}` : '';
            list.insertAdjacentHTML('beforeend', `<button class="picker-item" data-id="${item.id}"><span><strong>${escapeHtml(item.item)}</strong><em>${escapeHtml(item.mfg || 'No MFG')} | ${escapeHtml(item.batch || 'No batch')}${shelfLabel}${packLabel ? ` | ${escapeHtml(packLabel)}` : ''}</em></span><span>Rs ${Number(item.price || 0).toFixed(2)}${packLabel ? '/tab' : ''}</span></button>`);
        });
        if (!list.children.length) list.innerHTML = '<div class="activity-item empty">No matching inventory item.</div>';
        list.querySelectorAll('.picker-item').forEach(btn => btn.addEventListener('click', () => {
            const item = state.stockData.find(stock => stock.id === btn.dataset.id);
            if (!item) return;
            addRow({ ...item, qty: 1 });
            closeModal('product-picker-modal');
        }));
    }

    function renderPharmacyDetails() {
        const details = state.pharmacyDetails;
        setValue('setting-name', details.name);
        setValue('setting-phone', details.phone);
        setValue('setting-address', details.address);
        setValue('setting-gstin', details.gstin);
        setValue('setting-dl1', details.dl1);
        setValue('setting-dl2', details.dl2);
        document.getElementById('print-pharmacy-name').textContent = details.name;
        document.getElementById('print-pharmacy-address').textContent = details.address;
        document.getElementById('print-pharmacy-phone').textContent = details.phone;
        document.getElementById('print-pharmacy-gstin').textContent = details.gstin;
        document.getElementById('print-pharmacy-dl1').textContent = details.dl1;
        document.getElementById('print-pharmacy-dl2').textContent = details.dl2;
        document.querySelectorAll('.dy-pharm-name').forEach(el => el.textContent = details.name);
        const summary = document.getElementById('settings-summary');
        if (summary) {
            summary.innerHTML = `<div class="panel-header"><h3><i class="fa-solid fa-hospital"></i> Profile Summary</h3></div><div class="detail-grid"><div><span>Name</span><strong>${escapeHtml(details.name)}</strong></div><div><span>Owner</span><strong>${escapeHtml(details.owner)}</strong></div><div><span>Phone</span><strong>${escapeHtml(details.phone)}</strong></div><div><span>GSTIN</span><strong>${escapeHtml(details.gstin || '-')}</strong></div><div><span>Address</span><strong>${escapeHtml(details.address)}</strong></div><div><span>Footer Note</span><strong>${escapeHtml(details.footer)}</strong></div></div>`;
        }
    }

    function populateSettingsModal() {
        const details = state.pharmacyDetails;
        setValue('modal-setting-name', details.name);
        setValue('modal-setting-owner', details.owner);
        setValue('modal-setting-phone', details.phone);
        setValue('modal-setting-gstin', details.gstin);
        setValue('modal-setting-address', details.address);
        setValue('modal-setting-dl1', details.dl1);
        setValue('modal-setting-dl2', details.dl2);
        setValue('modal-setting-footer', details.footer);
    }

    async function persistStock(options = {}) {
        return persistCloudState({
            loadingText: 'Saving inventory...',
            errorTitle: 'Saving inventory',
            ...options
        });
    }

    async function resetDemoData() {
        state.stockData = [];
        state.invoiceData = [];
        state.orderData = [];
        state.pharmacyDetails = normalizeSettings(null);
        const saved = await persistCloudState({ loadingText: 'Resetting cloud data...', errorTitle: 'Resetting cloud data' });
        if (!saved) return;
        clearLegacyBusinessData();
        renderStockTable();
        renderInvoiceTable();
        renderOrders();
        renderPharmacyDetails();
        renderDashboard();
        renderReports();
        renderProductPicker();
        resetBillingForm();
        showToast('Supabase data reset.', 'success');
    }

    function showAuth() {
        appDataLoaded = false;
        appDataLoadPromise = null;
        activeInvoiceViewId = null;
        editingInvoiceId = null;
        closeMobileNavigation();
        applyBusinessState({});
        renderAppState();
        resetBillingForm();
        setAuthView('login');
        authContainer.style.display = 'grid';
        appContainer.style.display = 'none';
    }

    async function showApp() {
        authContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        currentUserEmail.textContent = currentUser?.email || 'user@pharmabill.app';
        const loaded = await loadCloudAppData();
        if (!loaded) return;
        const savedView = getInitialViewTarget();
        activateView(savedView, { persist: false });
    }

    function getInitialViewTarget() {
        const requestedView = launchParams.get('view');
        const validView = requestedView && [...viewPanels].some(panel => panel.id === requestedView) ? requestedView : '';
        if (validView) {
            localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, validView);
            return validView;
        }
        return localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) || 'view-dashboard';
    }

    function activateView(target, options = {}) {
        const { persist = true } = options;
        const panelExists = [...viewPanels].some(panel => panel.id === target);
        const nextTarget = panelExists ? target : 'view-dashboard';
        viewPanels.forEach(panel => panel.classList.toggle('active', panel.id === nextTarget));
        navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.target === nextTarget));
        mobileNavBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.target === nextTarget));
        if (persist) localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, nextTarget);
        if (nextTarget === 'view-reports') renderReports();
        closeMobileNavigation();
    }

    function bindPrintLifecycle() {
        window.addEventListener('afterprint', finishPrintJob);
        if (!window.matchMedia) return;
        printMediaQueryList = window.matchMedia('print');
        printMediaQueryHandler = event => {
            if (!event.matches) finishPrintJob();
        };
        if (typeof printMediaQueryList.addEventListener === 'function') {
            printMediaQueryList.addEventListener('change', printMediaQueryHandler);
            return;
        }
        if (typeof printMediaQueryList.addListener === 'function') {
            printMediaQueryList.addListener(printMediaQueryHandler);
        }
    }

    function runPrintJob({ mode, viewId, beforePrint, afterPrint } = {}) {
        finishPrintJob();
        const previousView = document.querySelector('.view-panel.active')?.id || getInitialViewTarget();
        activePrintJob = {
            afterPrint: typeof afterPrint === 'function' ? afterPrint : null,
            previousView,
            viewId
        };
        document.body.dataset.printMode = mode || '';
        if (typeof beforePrint === 'function') beforePrint();
        if (viewId) activateView(viewId, { persist: false });
        const handleFocus = () => {
            window.removeEventListener('focus', handleFocus);
            window.setTimeout(() => {
                if (activePrintJob && !printMediaQueryList?.matches) finishPrintJob();
            }, 150);
        };
        window.addEventListener('focus', handleFocus);
        window.print();
    }

    function finishPrintJob() {
        if (!activePrintJob) return;
        const { afterPrint, previousView, viewId } = activePrintJob;
        activePrintJob = null;
        delete document.body.dataset.printMode;
        if (typeof afterPrint === 'function') afterPrint();
        const currentView = document.querySelector('.view-panel.active')?.id;
        if (previousView && currentView === viewId) activateView(previousView, { persist: false });
    }

    function isMobileViewport() {
        return window.innerWidth <= 960;
    }

    function openMobileNavigation() {
        if (!isMobileViewport()) return;
        mobileSidebar?.classList.add('is-open');
        mobileSidebarOverlay?.classList.add('active');
        mobileMenuToggle?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-nav-open');
    }

    function closeMobileNavigation() {
        mobileSidebar?.classList.remove('is-open');
        mobileSidebarOverlay?.classList.remove('active');
        mobileMenuToggle?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-nav-open');
    }

    function toggleMobileNavigation() {
        if (mobileSidebar?.classList.contains('is-open')) closeMobileNavigation();
        else openMobileNavigation();
    }

    function syncPrintHeader() {
        ui.printPatientName.textContent = ui.patientName.value;
        ui.printDoctorName.textContent = ui.doctorName.value;
        ui.printInvoiceNo.textContent = ui.invoiceNo.value;
        ui.printBillType.textContent = ui.billType.value;
        ui.printInvoiceDate.textContent = formatDate(ui.invoiceDate.value);
        ui.printBilledTime.textContent = ui.invoiceTime.value;
    }

    function updateSno() {
        tableBody.querySelectorAll('tr').forEach((tr, index) => {
            tr.querySelector('.col-sno span').textContent = index + 1;
        });
    }

    function showLoading(text) {
        document.getElementById('loading-overlay').classList.add('active');
        document.getElementById('loading-text').textContent = text;
    }

    function hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    function showAuthAlert(message, type = 'error') {
        authAlert.style.display = 'block';
        authAlert.className = `alert ${type}`;
        authAlert.textContent = message;
        setTimeout(() => { authAlert.style.display = 'none'; }, 4000);
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        }, 2600);
    }

    function openNotice(title, message) {
        document.getElementById('notice-title').textContent = title;
        document.getElementById('notice-message').textContent = message;
        openModal('notice-modal');
    }

    function confirmAction(title, message, callback) {
        confirmHandler = callback;
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        openModal('confirm-modal');
    }

    function openModal(id) {
        document.getElementById(id)?.classList.add('active');
    }

    function closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').catch(error => {
                console.error('Service worker registration failed:', error);
            });
        }, { once: true });
    }

    function normalizeStock(items) {
        return (items || []).map(item => ({
            id: item.id || `stk_${String(item.item || Math.random()).replace(/\W+/g, '').toLowerCase()}`,
            item: item.item || '',
            category: item.category || '',
            sch: item.sch || '',
            mfg: item.mfg || '',
            batch: item.batch || '',
            expiry: item.expiry || '',
            shelf: item.shelf || item.location || item.rack || '',
            stock: Number(item.stock || 0),
            unitsPerSheet: Number(item.unitsPerSheet || item.sheetQty || item.tabsPerSheet || 0),
            sheetPrice: Number(item.sheetPrice || item.stripPrice || 0),
            price: calculateUnitPriceFromSheet(
                item.unitsPerSheet || item.sheetQty || item.tabsPerSheet || 0,
                item.sheetPrice || item.stripPrice || 0,
                item.price || 0
            )
        }));
    }

    function normalizeInvoices(items) {
        const normalized = (items || []).map(item => ({
            ...item,
            invoiceNo: sanitizeInvoiceNumber(item.invoiceNo),
            items: item.items || [],
            totalAmount: Number(item.totalAmount || 0),
            discount: Number(item.discount || 0),
            discountType: item.discountType === 'percent' ? 'percent' : 'amount',
            discountValue: Number(item.discountValue ?? item.discount ?? 0),
            adjust: Number(item.adjust || 0),
            patientName: item.patientName || 'Walk-in',
            status: item.status || 'Saved'
        }));
        const seenInvoiceNumbers = new Set();
        let highestSequence = normalized.reduce((max, item) => {
            const sequence = parseInvoiceSequence(item.invoiceNo);
            return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
        }, 0);
        return normalized.map(item => {
            let invoiceNo = item.invoiceNo;
            if (!invoiceNo || seenInvoiceNumbers.has(invoiceNo)) {
                highestSequence += 1;
                invoiceNo = formatInvoiceNumber(highestSequence);
                while (seenInvoiceNumbers.has(invoiceNo)) {
                    highestSequence += 1;
                    invoiceNo = formatInvoiceNumber(highestSequence);
                }
            }
            seenInvoiceNumbers.add(invoiceNo);
            return { ...item, invoiceNo };
        });
    }

    function sanitizeInvoiceNumber(value) {
        return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    }

    function parseInvoiceSequence(invoiceNo) {
        const match = sanitizeInvoiceNumber(invoiceNo).match(new RegExp(`^${INVOICE_PREFIX}(\\d+)$`));
        return match ? Number(match[1]) : NaN;
    }

    function formatInvoiceNumber(sequence) {
        return `${INVOICE_PREFIX}${String(Math.max(1, Number(sequence) || 1)).padStart(INVOICE_PAD_LENGTH, '0')}`;
    }

    function getNextInvoiceNumber(excludeId = null) {
        const usedInvoiceNumbers = new Set(
            state.invoiceData
                .filter(item => item.id !== excludeId)
                .map(item => sanitizeInvoiceNumber(item.invoiceNo))
                .filter(Boolean)
        );
        let nextSequence = state.invoiceData.reduce((max, item) => {
            if (item.id === excludeId) return max;
            const sequence = parseInvoiceSequence(item.invoiceNo);
            return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
        }, 0) + 1;
        let nextInvoiceNo = formatInvoiceNumber(nextSequence);
        while (usedInvoiceNumbers.has(nextInvoiceNo)) {
            nextSequence += 1;
            nextInvoiceNo = formatInvoiceNumber(nextSequence);
        }
        return nextInvoiceNo;
    }

    function normalizeOrders(items) {
        return (items || []).map(item => ({
            id: item.id || `ord_${Date.now()}`,
            patientName: item.patientName || '',
            patientPhone: item.patientPhone || '',
            medicineName: item.medicineName || item.item || '',
            quantity: Number(item.quantity || 1),
            dueDate: item.dueDate || getTodayDateString(),
            status: item.status || 'Pending',
            notes: item.notes || '',
            createdAt: item.createdAt || new Date().toISOString()
        }));
    }

    function normalizeSettings(item) {
        return { name: item?.name || 'SRI GANGA PHARMACY', owner: item?.owner || 'Store Admin', phone: item?.phone || '7981020716', address: item?.address || '# 1-124/2/2/D/1/1/A, SHOP NO.2, SINGLE ROAD, GROUND FLOOR, BESIDE POLICE STATION, MUGPAL, NIZAMABAD - 503230', gstin: item?.gstin || '', dl1: item?.dl1 || '20B:TS/NZB/2023-112389', dl2: item?.dl2 || '21B:TS/NZB/2023-112389', footer: item?.footer || 'Goods once sold will not be taken back or exchanged.' };
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
    }

    function roundCurrency(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }

    function getAutoAdjustAmount(amount) {
        const roundedAmount = Math.round(Number(amount || 0));
        return roundCurrency(roundedAmount - Number(amount || 0));
    }

    function getDiscountType() {
        return ui.discountType?.value === 'percent' ? 'percent' : 'amount';
    }

    function getNormalizedDiscountValue(value, type) {
        const numericValue = Math.max(0, roundCurrency(value));
        return type === 'percent' ? Math.min(numericValue, 100) : numericValue;
    }

    function getDiscountAmount(grossAmount, discountValue, discountType) {
        if (discountType === 'percent') {
            return roundCurrency((grossAmount * discountValue) / 100);
        }
        return Math.min(roundCurrency(discountValue), grossAmount);
    }

    function syncDiscountFieldState() {
        if (getDiscountType() === 'percent') {
            ui.discount.setAttribute('max', '100');
            ui.discount.setAttribute('placeholder', 'Discount %');
        } else {
            ui.discount.removeAttribute('max');
            ui.discount.setAttribute('placeholder', 'Discount amount');
        }
    }

    function handleDiscountTypeChange() {
        syncDiscountFieldState();
        calculateOverallTotals();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    }

    function convertNumberToWords(amount) {
        if (amount === 0) return 'Zero';
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        let num = Math.floor(amount);
        let str = '';
        str += num >= 10000000 ? `${convertBlock(Math.floor((num / 10000000) % 100))}Crore ` : '';
        str += num >= 100000 ? `${convertBlock(Math.floor((num / 100000) % 100))}Lakh ` : '';
        str += num >= 1000 ? `${convertBlock(Math.floor((num / 1000) % 100))}Thousand ` : '';
        str += num >= 100 ? `${convertBlock(Math.floor((num / 100) % 10))}Hundred ` : '';
        const lastTwo = num % 100;
        if (lastTwo > 0) str += `${str ? 'and ' : ''}${convertBlock(lastTwo)}`;
        return str.trim();
        function convertBlock(n) {
            if (n < 20) return a[n];
            return b[Math.floor(n / 10)] + (n % 10 > 0 ? `-${a[n % 10]}` : ' ');
        }
    }

    function exportInvoices() {
        const rows = state.invoiceData.map(invoice => ({ 'Invoice No': invoice.invoiceNo, 'Patient Name': invoice.patientName, Date: invoice.date, Time: invoice.time, Total: invoice.totalAmount, Notes: invoice.notes }));
        if (window.XLSX) {
            const sheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, 'Invoices');
            XLSX.writeFile(workbook, 'pharmabill-invoices.xlsx');
            return showToast('Invoices exported.', 'success');
        }
        openNotice('Export', 'Excel export library is unavailable.');
    }
});
