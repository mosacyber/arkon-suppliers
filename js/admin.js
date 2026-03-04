// ===== ADMIN PANEL - ARKON ALLIANCE =====

document.addEventListener('DOMContentLoaded', function () {

    // ===== AUTH =====
    var adminToken = sessionStorage.getItem('arkon_token') || '';
    var isLoggedIn = !!adminToken;

    if (isLoggedIn) {
        showDashboard();
    }

    // Helper: authenticated fetch
    function adminFetch(url, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers['Authorization'] = 'Bearer ' + adminToken;
        return fetch(url, options);
    }

    // Login form
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var user = document.getElementById('adminUser').value;
            var pass = document.getElementById('adminPass').value;
            var errorEl = document.getElementById('loginError');
            var submitBtn = loginForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري التحقق...';

            fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.token) {
                    adminToken = data.token;
                    sessionStorage.setItem('arkon_token', adminToken);
                    showDashboard();
                } else {
                    errorEl.textContent = data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة';
                    document.getElementById('adminPass').value = '';
                }
            })
            .catch(function () {
                errorEl.textContent = 'حدث خطأ في الاتصال، حاول مرة أخرى';
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'تسجيل الدخول';
            });
        });
    }

    function showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        loadData();
    }

    window.logout = function () {
        sessionStorage.removeItem('arkon_token');
        adminToken = '';
        location.reload();
    };

    window.closeSidebar = function () {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    };

    // ===== SIDEBAR NAVIGATION =====
    var navItems = document.querySelectorAll('.nav-item');
    var pageTitles = {
        'overview': 'نظرة عامة',
        'suppliers': 'جميع الموردين',
        'pending': 'بانتظار المراجعة',
        'approved': 'المعتمدين',
        'rejected': 'المرفوضين',
        'tasks': 'المهام والتقويم'
    };

    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            var page = this.getAttribute('data-page');

            navItems.forEach(function (n) { n.classList.remove('active'); });
            this.classList.add('active');

            document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
            var targetPage = document.getElementById('page-' + page);
            if (targetPage) targetPage.classList.add('active');

            document.getElementById('pageTitle').textContent = pageTitles[page] || '';

            // Close mobile sidebar
            var sidebar = document.getElementById('sidebar');
            var overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');

            if (page === 'tasks') {
                loadTasks();
            } else {
                loadData();
            }
        });
    });

    // Mobile menu toggle
    var menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            var sidebar = document.getElementById('sidebar');
            var overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        });
    }

    // ===== DATA MANAGEMENT (SERVER API) =====
    var cachedSuppliers = [];

    function loadData() {
        adminFetch('/api/suppliers')
            .then(function (res) { return res.json(); })
            .then(function (suppliers) {
                cachedSuppliers = suppliers;
                updateStats(suppliers);
                renderRecentTable(suppliers);
                renderSuppliersTable(suppliers);
                renderPendingTable(suppliers);
                renderApprovedTable(suppliers);
                renderRejectedTable(suppliers);
                populateFilters(suppliers);
            })
            .catch(function (err) {
                console.error('Error loading data:', err);
            });
    }

    function getSuppliers() {
        return cachedSuppliers;
    }

    // ===== STATS =====
    function updateStats(suppliers) {
        var total = suppliers.length;
        var pending = suppliers.filter(function (s) { return s.Approval_Status === 'تحت المراجعة'; }).length;
        var approved = suppliers.filter(function (s) { return s.Approval_Status === 'معتمد'; }).length;
        var rejected = suppliers.filter(function (s) { return s.Approval_Status === 'مرفوض'; }).length;

        animateNumber('totalCount', total);
        animateNumber('pendingCount', pending);
        animateNumber('approvedCount', approved);
        animateNumber('rejectedCount', rejected);
    }

    function animateNumber(id, target) {
        var el = document.getElementById(id);
        if (!el) return;
        var current = parseInt(el.textContent) || 0;
        if (current === target) { el.textContent = target; return; }

        var duration = 500;
        var start = performance.now();

        function update(time) {
            var elapsed = time - start;
            var progress = Math.min(elapsed / duration, 1);
            el.textContent = Math.floor(current + (target - current) * progress);
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = target;
        }
        requestAnimationFrame(update);
    }

    // ===== RENDER TABLES =====
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        var d = new Date(dateStr);
        return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function getStatusBadge(status) {
        var cls = 'badge-pending';
        if (status === 'معتمد') cls = 'badge-approved';
        else if (status === 'مرفوض') cls = 'badge-rejected';
        return '<span class="badge ' + cls + '">' + escapeHtml(status) + '</span>';
    }

    function getActivitiesText(activities) {
        if (!activities) return '-';
        if (Array.isArray(activities)) return activities.slice(0, 2).join(', ') + (activities.length > 2 ? '...' : '');
        return activities;
    }

    function renderRecentTable(suppliers) {
        var body = document.getElementById('recentBody');
        var empty = document.getElementById('emptyRecent');
        if (!body) return;

        var recent = suppliers.slice().sort(function (a, b) {
            return new Date(b.Submission_Date) - new Date(a.Submission_Date);
        }).slice(0, 10);

        if (recent.length === 0) {
            body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        body.innerHTML = recent.map(function (s, i) {
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.Supplier_ID) + '</strong></td>' +
                '<td>' + escapeHtml(s.Company_Name) + '</td>' +
                '<td>' + escapeHtml(s.City) + '</td>' +
                '<td>' + escapeHtml(getActivitiesText(s.Activities)) + '</td>' +
                '<td>' + formatDate(s.Submission_Date) + '</td>' +
                '<td>' + getStatusBadge(s.Approval_Status) + '</td>' +
                '<td><button class="btn-action btn-view" onclick="viewSupplier(' + i + ')">عرض</button></td>' +
                '</tr>';
        }).join('');
    }

    function renderSuppliersTable(suppliers) {
        var body = document.getElementById('suppliersBody');
        var empty = document.getElementById('emptySuppliers');
        if (!body) return;

        // Apply filters
        var filtered = applyFilters(suppliers);

        if (filtered.length === 0) {
            body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        body.innerHTML = filtered.map(function (s) {
            var idx = suppliers.indexOf(s);
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.Supplier_ID) + '</strong></td>' +
                '<td>' + escapeHtml(s.Company_Name) + '</td>' +
                '<td>' + escapeHtml(s.City) + '</td>' +
                '<td>' + escapeHtml(getActivitiesText(s.Activities)) + '</td>' +
                '<td>' + escapeHtml(s.Annual_Turnover || '-') + '</td>' +
                '<td>' + (s.Has_Factory === 'نعم' ? '<span class="badge badge-approved">نعم</span>' : '<span class="badge badge-rejected">لا</span>') + '</td>' +
                '<td>' + (s.Has_Equipment === 'نعم' ? '<span class="badge badge-approved">نعم</span>' : '<span class="badge badge-rejected">لا</span>') + '</td>' +
                '<td>' + formatDate(s.Submission_Date) + '</td>' +
                '<td>' + getStatusBadge(s.Approval_Status) + '</td>' +
                '<td>' +
                    '<button class="btn-action btn-view" onclick="viewSupplier(' + idx + ')">عرض</button>' +
                    (s.Approval_Status === 'تحت المراجعة' ? '<button class="btn-action btn-approve" onclick="approveSupplier(' + idx + ')">اعتماد</button><button class="btn-action btn-reject" onclick="rejectSupplier(' + idx + ')">رفض</button>' : '') +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderPendingTable(suppliers) {
        var body = document.getElementById('pendingBody');
        if (!body) return;

        var pending = suppliers.filter(function (s) { return s.Approval_Status === 'تحت المراجعة'; });

        body.innerHTML = pending.map(function (s) {
            var idx = suppliers.indexOf(s);
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.Supplier_ID) + '</strong></td>' +
                '<td>' + escapeHtml(s.Company_Name) + '</td>' +
                '<td>' + escapeHtml(s.City) + '</td>' +
                '<td>' + escapeHtml(getActivitiesText(s.Activities)) + '</td>' +
                '<td>' + formatDate(s.Submission_Date) + '</td>' +
                '<td>' +
                    '<button class="btn-action btn-view" onclick="viewSupplier(' + idx + ')">عرض</button>' +
                    '<button class="btn-action btn-approve" onclick="approveSupplier(' + idx + ')">اعتماد</button>' +
                    '<button class="btn-action btn-reject" onclick="rejectSupplier(' + idx + ')">رفض</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function renderApprovedTable(suppliers) {
        var body = document.getElementById('approvedBody');
        if (!body) return;

        var approved = suppliers.filter(function (s) { return s.Approval_Status === 'معتمد'; });

        body.innerHTML = approved.map(function (s) {
            var idx = suppliers.indexOf(s);
            var rating = parseInt(s.Rating) || 0;
            var stars = '';
            for (var i = 1; i <= 5; i++) {
                stars += '<span class="star ' + (i <= rating ? 'active' : '') + '" onclick="setRating(' + idx + ',' + i + ')">&#9733;</span>';
            }
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.Supplier_ID) + '</strong></td>' +
                '<td>' + escapeHtml(s.Company_Name) + '</td>' +
                '<td>' + escapeHtml(s.City) + '</td>' +
                '<td>' + escapeHtml(getActivitiesText(s.Activities)) + '</td>' +
                '<td><div class="rating-stars">' + stars + '</div></td>' +
                '<td><button class="btn-action btn-view" onclick="viewSupplier(' + idx + ')">عرض</button></td>' +
                '</tr>';
        }).join('');
    }

    function renderRejectedTable(suppliers) {
        var body = document.getElementById('rejectedBody');
        if (!body) return;

        var rejected = suppliers.filter(function (s) { return s.Approval_Status === 'مرفوض'; });

        body.innerHTML = rejected.map(function (s) {
            var idx = suppliers.indexOf(s);
            return '<tr>' +
                '<td><strong>' + escapeHtml(s.Supplier_ID) + '</strong></td>' +
                '<td>' + escapeHtml(s.Company_Name) + '</td>' +
                '<td>' + escapeHtml(s.City) + '</td>' +
                '<td>' + escapeHtml(s.Notes || 'لم يحدد') + '</td>' +
                '<td>' +
                    '<button class="btn-action btn-view" onclick="viewSupplier(' + idx + ')">عرض</button>' +
                    '<button class="btn-action btn-approve" onclick="approveSupplier(' + idx + ')">إعادة اعتماد</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    // ===== FILTERS =====
    function populateFilters(suppliers) {
        var cityFilter = document.getElementById('filterCity');
        var activityFilter = document.getElementById('filterActivity');
        var classFilter = document.getElementById('filterClassification');
        var turnoverFilter = document.getElementById('filterTurnover');
        var accreditFilter = document.getElementById('filterAccreditation');
        if (!cityFilter || !activityFilter) return;

        var cities = {};
        var activities = {};
        var classifications = {};
        var turnovers = {};
        var accreditations = {};

        suppliers.forEach(function (s) {
            if (s.City) cities[s.City] = true;
            if (Array.isArray(s.Activities)) {
                s.Activities.forEach(function (a) { activities[a] = true; });
            }
            if (s.Contractor_Classification) classifications[s.Contractor_Classification] = true;
            if (s.Annual_Turnover) turnovers[s.Annual_Turnover] = true;
            if (Array.isArray(s.Accreditations)) {
                s.Accreditations.forEach(function (a) { accreditations[a] = true; });
            }
        });

        var currentCity = cityFilter.value;
        var currentActivity = activityFilter.value;

        cityFilter.innerHTML = '<option value="">كل المدن</option>';
        Object.keys(cities).sort().forEach(function (c) {
            cityFilter.innerHTML += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
        });
        cityFilter.value = currentCity;

        activityFilter.innerHTML = '<option value="">كل الأنشطة</option>';
        Object.keys(activities).sort().forEach(function (a) {
            activityFilter.innerHTML += '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>';
        });
        activityFilter.value = currentActivity;

        if (classFilter) {
            var currentClass = classFilter.value;
            classFilter.innerHTML = '<option value="">كل التصنيفات</option>';
            Object.keys(classifications).sort().forEach(function (c) {
                classFilter.innerHTML += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
            });
            classFilter.value = currentClass;
        }

        if (turnoverFilter) {
            var currentTurnover = turnoverFilter.value;
            turnoverFilter.innerHTML = '<option value="">كل القدرات المالية</option>';
            Object.keys(turnovers).sort().forEach(function (t) {
                turnoverFilter.innerHTML += '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
            });
            turnoverFilter.value = currentTurnover;
        }

        if (accreditFilter) {
            var currentAccredit = accreditFilter.value;
            accreditFilter.innerHTML = '<option value="">كل الاعتمادات</option>';
            Object.keys(accreditations).sort().forEach(function (a) {
                accreditFilter.innerHTML += '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>';
            });
            accreditFilter.value = currentAccredit;
        }
    }

    function applyFilters(suppliers) {
        var search = (document.getElementById('searchInput') || {}).value || '';
        var city = (document.getElementById('filterCity') || {}).value || '';
        var activity = (document.getElementById('filterActivity') || {}).value || '';
        var status = (document.getElementById('filterStatus') || {}).value || '';
        var classification = (document.getElementById('filterClassification') || {}).value || '';
        var turnover = (document.getElementById('filterTurnover') || {}).value || '';
        var equipment = (document.getElementById('filterEquipment') || {}).value || '';
        var accreditation = (document.getElementById('filterAccreditation') || {}).value || '';

        return suppliers.filter(function (s) {
            if (search) {
                var q = search.toLowerCase();
                var match = (s.Company_Name || '').toLowerCase().indexOf(q) >= 0 ||
                            (s.Supplier_ID || '').toLowerCase().indexOf(q) >= 0 ||
                            (s.Contact_Name || '').toLowerCase().indexOf(q) >= 0;
                if (!match) return false;
            }
            if (city && s.City !== city) return false;
            if (activity && Array.isArray(s.Activities) && s.Activities.indexOf(activity) < 0) return false;
            if (status && s.Approval_Status !== status) return false;
            if (classification && s.Contractor_Classification !== classification) return false;
            if (turnover && s.Annual_Turnover !== turnover) return false;
            if (equipment && s.Has_Equipment !== equipment) return false;
            if (accreditation) {
                if (!Array.isArray(s.Accreditations) || s.Accreditations.indexOf(accreditation) < 0) return false;
            }
            return true;
        });
    }

    // Filter events
    ['searchInput', 'filterCity', 'filterActivity', 'filterStatus', 'filterClassification', 'filterTurnover', 'filterEquipment', 'filterAccreditation'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function () { loadData(); });
            el.addEventListener('change', function () { loadData(); });
        }
    });

    // ===== SORTING =====
    var sortField = '';
    var sortAsc = true;

    document.querySelectorAll('.sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            var field = this.getAttribute('data-sort');
            if (sortField === field) {
                sortAsc = !sortAsc;
            } else {
                sortField = field;
                sortAsc = true;
            }

            cachedSuppliers.sort(function (a, b) {
                var va = a[field] || '';
                var vb = b[field] || '';
                if (va < vb) return sortAsc ? -1 : 1;
                if (va > vb) return sortAsc ? 1 : -1;
                return 0;
            });

            updateStats(cachedSuppliers);
            renderRecentTable(cachedSuppliers);
            renderSuppliersTable(cachedSuppliers);
            renderPendingTable(cachedSuppliers);
            renderApprovedTable(cachedSuppliers);
            renderRejectedTable(cachedSuppliers);
        });
    });

    // ===== ACTIONS =====
    window.viewSupplier = function (index) {
        var suppliers = getSuppliers();
        var s = suppliers[index];
        if (!s) return;

        document.getElementById('modalTitle').textContent = s.Company_Name || 'تفاصيل المورد';

        var html = '<div class="detail-grid">';

        // Company Info
        html += '<div class="detail-section-title">بيانات الشركة</div>';
        html += detailItem('رقم الطلب', s.Supplier_ID);
        html += detailItem('اسم الشركة', s.Company_Name);
        html += detailItem('رقم السجل التجاري', s.CR_Number);
        html += detailItem('تاريخ التأسيس', s.Establish_Date);
        html += detailItem('نوع الكيان', s.Entity_Type);
        html += detailItem('المدينة', s.City);
        html += detailItem('العنوان الوطني', s.National_Address, true);
        html += detailItem('رقم الضريبة', s.VAT_Number);
        html += detailItem('الغرفة التجارية', s.Chamber_Number);

        // Contact
        html += '<div class="detail-section-title">معلومات التواصل</div>';
        html += detailItem('المسؤول', s.Contact_Name);
        html += detailItem('المسمى الوظيفي', s.Job_Title);
        html += detailItem('الجوال', s.Mobile);
        html += detailItem('البريد', s.Email);
        html += detailItem('الموقع', s.Website);

        // Activities
        html += '<div class="detail-section-title">النشاط</div>';
        var acts = Array.isArray(s.Activities) ? s.Activities.join(' | ') : (s.Activities || '-');
        html += detailItem('الأنشطة', acts, true);

        // Operational
        html += '<div class="detail-section-title">القدرة التشغيلية</div>';
        html += detailItem('عدد الموظفين', s.Employee_Count);
        html += detailItem('عدد المهندسين', s.Engineer_Count);
        html += detailItem('أكبر مشروع', s.Largest_Project);
        html += detailItem('القدرة الشهرية', s.Monthly_Capacity);
        html += detailItem('مصنع', s.Has_Factory);
        html += detailItem('معدات', s.Has_Equipment);

        // Classifications
        html += '<div class="detail-section-title">التصنيفات</div>';
        html += detailItem('تصنيف المقاولين', s.Contractor_Classification);
        var isos = Array.isArray(s.ISO_Certifications) ? s.ISO_Certifications.join(', ') : (s.ISO_Certifications || '-');
        html += detailItem('شهادات ISO', isos);
        var accred = Array.isArray(s.Accreditations) ? s.Accreditations.join(', ') : (s.Accreditations || '-');
        html += detailItem('الاعتمادات', accred);
        html += detailItem('هيئة المقاولين', s.Contractor_Membership);

        // Financial
        html += '<div class="detail-section-title">الوضع المالي</div>';
        html += detailItem('حجم الأعمال السنوي', s.Annual_Turnover);
        html += detailItem('التوريد الآجل', s.Credit_Terms);
        html += detailItem('الحد الائتماني', s.Credit_Limit);

        // Documents / Files
        if (s.Files && Object.keys(s.Files).length > 0) {
            html += '<div class="detail-section-title">المستندات المرفقة</div>';
            html += '<div class="files-grid">';

            var docLabels = {
                commercialRegister: 'السجل التجاري',
                zakatCert: 'شهادة الزكاة',
                insuranceCert: 'شهادة التأمين',
                vatCert: 'شهادة الضريبة',
                bankLetter: 'خطاب البنك',
                catalog: 'كتالوج المنتجات'
            };

            Object.keys(s.Files).forEach(function (key) {
                if (key === '_certFiles') {
                    // Multiple certificate files
                    var certs = s.Files._certFiles;
                    if (Array.isArray(certs)) {
                        certs.forEach(function (cert, idx) {
                            html += '<div class="file-card">' +
                                '<div class="file-card-icon">' + getFileIcon(cert.type) + '</div>' +
                                '<div class="file-card-info">' +
                                    '<div class="file-card-label">شهادة ' + (idx + 1) + '</div>' +
                                    '<div class="file-card-name">' + escapeHtml(cert.name) + '</div>' +
                                    '<div class="file-card-size">' + formatFileSize(cert.size) + '</div>' +
                                '</div>' +
                                '<button class="file-card-btn" onclick="viewFile(\'' + escapeAttr(cert.data) + '\', \'' + escapeAttr(cert.type) + '\')">عرض</button>' +
                                '</div>';
                        });
                    }
                } else {
                    var fileData = s.Files[key];
                    if (fileData && fileData.data) {
                        html += '<div class="file-card">' +
                            '<div class="file-card-icon">' + getFileIcon(fileData.type) + '</div>' +
                            '<div class="file-card-info">' +
                                '<div class="file-card-label">' + escapeHtml(docLabels[key] || key) + '</div>' +
                                '<div class="file-card-name">' + escapeHtml(fileData.name) + '</div>' +
                                '<div class="file-card-size">' + formatFileSize(fileData.size) + '</div>' +
                            '</div>' +
                            '<button class="file-card-btn" onclick="viewFile(\'' + escapeAttr(fileData.data) + '\', \'' + escapeAttr(fileData.type) + '\')">عرض</button>' +
                            '</div>';
                    }
                }
            });

            html += '</div>';
        }

        // Status
        html += '<div class="detail-section-title">حالة الطلب</div>';
        html += '<div class="detail-item"><div class="detail-label">الحالة</div><div class="detail-value">' + getStatusBadge(s.Approval_Status) + '</div></div>';
        html += detailItem('تاريخ التقديم', formatDate(s.Submission_Date));

        html += '</div>';

        // Notes
        html += '<div style="margin-top:16px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">ملاحظات:</label>' +
                '<textarea class="notes-input" id="modalNotes" rows="3" placeholder="أضف ملاحظات...">' + escapeHtml(s.Notes || '') + '</textarea></div>';

        document.getElementById('modalBody').innerHTML = html;

        // Footer
        var footer = '<div style="display:flex;gap:8px;">';
        if (s.Approval_Status !== 'معتمد') {
            footer += '<button class="btn-action btn-approve" onclick="approveSupplier(' + index + '); closeDetail();">اعتماد</button>';
        }
        if (s.Approval_Status !== 'مرفوض') {
            footer += '<button class="btn-action btn-reject" onclick="rejectSupplier(' + index + '); closeDetail();">رفض</button>';
        }
        footer += '</div>';
        footer += '<button class="btn-action btn-view" onclick="saveNotes(' + index + ')">حفظ الملاحظات</button>';

        document.getElementById('modalFooter').innerHTML = footer;

        document.getElementById('detailModal').classList.add('show');
    };

    function detailItem(label, value, fullWidth) {
        return '<div class="detail-item' + (fullWidth ? ' full-width' : '') + '">' +
            '<div class="detail-label">' + escapeHtml(label) + '</div>' +
            '<div class="detail-value">' + escapeHtml(value || '-') + '</div>' +
            '</div>';
    }

    window.closeDetail = function () {
        document.getElementById('detailModal').classList.remove('show');
    };

    // Close on overlay click
    var detailModal = document.getElementById('detailModal');
    if (detailModal) {
        detailModal.addEventListener('click', function (e) {
            if (e.target === this) closeDetail();
        });
    }

    window.approveSupplier = function (index) {
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            adminFetch('/api/suppliers/' + encodeURIComponent(suppliers[index].Supplier_ID), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Approval_Status: 'معتمد' })
            }).then(function () { loadData(); });
        }
    };

    window.rejectSupplier = function (index) {
        var reason = prompt('سبب الرفض (اختياري):');
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            var body = { Approval_Status: 'مرفوض' };
            if (reason) body.Notes = reason;
            adminFetch('/api/suppliers/' + encodeURIComponent(suppliers[index].Supplier_ID), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).then(function () { loadData(); });
        }
    };

    window.saveNotes = function (index) {
        var notes = document.getElementById('modalNotes');
        if (!notes) return;
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            adminFetch('/api/suppliers/' + encodeURIComponent(suppliers[index].Supplier_ID), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Notes: notes.value })
            }).then(function () {
                alert('تم حفظ الملاحظات');
                loadData();
            });
        }
    };

    window.setRating = function (index, rating) {
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            adminFetch('/api/suppliers/' + encodeURIComponent(suppliers[index].Supplier_ID), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Rating: rating })
            }).then(function () { loadData(); });
        }
    };

    // ===== DEMO DATA =====
    window.loadDemoData = function () {
        var suppliers = getSuppliers();
        var demoSuppliers = [
            {
                Supplier_ID: 'ARK-2026-1001',
                Company_Name: 'شركة الأفق للمقاولات',
                CR_Number: '1010567890',
                Establish_Date: '2015-03-12',
                Entity_Type: 'شركة',
                City: 'الرياض',
                National_Address: 'حي العليا، شارع التحلية، الرياض 12345',
                VAT_Number: '310123456700003',
                Chamber_Number: 'RC-4521',
                Contact_Name: 'محمد العتيبي',
                Job_Title: 'مدير المبيعات',
                Mobile: '+966512345678',
                Email: 'info@alofuq.sa',
                Website: 'https://alofuq.sa',
                Activities: ['مواد خرسانية', 'حديد تسليح', 'أسفلت'],
                Employee_Count: '51-200',
                Engineer_Count: '15',
                Largest_Project: '12,000,000',
                Monthly_Capacity: '3,000,000',
                Has_Factory: 'نعم',
                Has_Equipment: 'نعم',
                Contractor_Classification: 'الدرجة الثانية',
                ISO_Certifications: ['ISO 9001', 'ISO 14001'],
                Accreditations: ['أرامكو'],
                Contractor_Membership: 'نعم',
                Annual_Turnover: '20-50 مليون',
                Credit_Terms: '60 يوم',
                Credit_Limit: '2,000,000',
                Approval_Status: 'تحت المراجعة',
                Rating: '',
                Notes: '',
                Submission_Date: new Date(Date.now() - 86400000).toISOString()
            },
            {
                Supplier_ID: 'ARK-2026-1002',
                Company_Name: 'مؤسسة البنيان للتوريدات',
                CR_Number: '2050123456',
                Establish_Date: '2018-07-20',
                Entity_Type: 'مؤسسة',
                City: 'جدة',
                National_Address: 'حي الصفا، جدة 21452',
                VAT_Number: '310987654300003',
                Chamber_Number: 'RC-7832',
                Contact_Name: 'خالد الحربي',
                Job_Title: 'المدير العام',
                Mobile: '+966551234567',
                Email: 'khalid@bunyan.sa',
                Website: '',
                Activities: ['أنابيب وشبكات مياه', 'كهرباء'],
                Employee_Count: '11-50',
                Engineer_Count: '8',
                Largest_Project: '5,000,000',
                Monthly_Capacity: '1,500,000',
                Has_Factory: 'لا',
                Has_Equipment: 'نعم',
                Contractor_Classification: 'الدرجة الثالثة',
                ISO_Certifications: ['ISO 9001'],
                Accreditations: [],
                Contractor_Membership: 'نعم',
                Annual_Turnover: '5-20 مليون',
                Credit_Terms: '30 يوم',
                Credit_Limit: '500,000',
                Approval_Status: 'تحت المراجعة',
                Rating: '',
                Notes: '',
                Submission_Date: new Date(Date.now() - 172800000).toISOString()
            },
            {
                Supplier_ID: 'ARK-2026-1003',
                Company_Name: 'مصنع الصلب السعودي',
                CR_Number: '1010999888',
                Establish_Date: '2010-01-05',
                Entity_Type: 'مصنع',
                City: 'الدمام',
                National_Address: 'المنطقة الصناعية الثانية، الدمام 31411',
                VAT_Number: '310555666700003',
                Chamber_Number: 'RC-1120',
                Contact_Name: 'فهد الدوسري',
                Job_Title: 'مدير التسويق',
                Mobile: '+966599876543',
                Email: 'fahad@saudisteel.sa',
                Website: 'https://saudisteel.sa',
                Activities: ['حديد تسليح', 'مصانع'],
                Employee_Count: '201-500',
                Engineer_Count: '35',
                Largest_Project: '50,000,000',
                Monthly_Capacity: '10,000,000',
                Has_Factory: 'نعم',
                Has_Equipment: 'نعم',
                Contractor_Classification: 'الدرجة الأولى',
                ISO_Certifications: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
                Accreditations: ['أرامكو', 'سابك'],
                Contractor_Membership: 'نعم',
                Annual_Turnover: '50-100 مليون',
                Credit_Terms: '90 يوم',
                Credit_Limit: '5,000,000',
                Approval_Status: 'معتمد',
                Rating: 5,
                Notes: 'مورد متميز - أولوية عالية',
                Submission_Date: new Date(Date.now() - 604800000).toISOString()
            },
            {
                Supplier_ID: 'ARK-2026-1004',
                Company_Name: 'شركة النخبة للمعدات الثقيلة',
                CR_Number: '4030567123',
                Establish_Date: '2020-11-15',
                Entity_Type: 'شركة',
                City: 'الخبر',
                National_Address: 'حي اليرموك، الخبر 31952',
                VAT_Number: '310444333200003',
                Chamber_Number: '',
                Contact_Name: 'سعود القحطاني',
                Job_Title: 'مدير العمليات',
                Mobile: '+966501112233',
                Email: 'saud@nokhba-equip.sa',
                Website: '',
                Activities: ['معدات ثقيلة', 'مقاول باطن'],
                Employee_Count: '11-50',
                Engineer_Count: '5',
                Largest_Project: '2,000,000',
                Monthly_Capacity: '800,000',
                Has_Factory: 'لا',
                Has_Equipment: 'نعم',
                Contractor_Classification: 'الدرجة الرابعة',
                ISO_Certifications: [],
                Accreditations: [],
                Contractor_Membership: 'لا',
                Annual_Turnover: '1-5 مليون',
                Credit_Terms: 'نقدي فقط',
                Credit_Limit: '',
                Approval_Status: 'مرفوض',
                Rating: '',
                Notes: 'لا يوجد تصنيف مقاولين كافي',
                Submission_Date: new Date(Date.now() - 432000000).toISOString()
            },
            {
                Supplier_ID: 'ARK-2026-1005',
                Company_Name: 'مؤسسة الإنشاء المتقدم',
                CR_Number: '1010333222',
                Establish_Date: '2017-05-08',
                Entity_Type: 'مؤسسة',
                City: 'مكة المكرمة',
                National_Address: 'حي العزيزية، مكة المكرمة 21955',
                VAT_Number: '310222111000003',
                Chamber_Number: 'RC-5567',
                Contact_Name: 'عبدالله الشهري',
                Job_Title: 'مدير المشاريع',
                Mobile: '+966544556677',
                Email: 'abdullah@adv-const.sa',
                Website: 'https://adv-const.sa',
                Activities: ['ميكانيكا', 'كهرباء', 'مقاول باطن'],
                Employee_Count: '51-200',
                Engineer_Count: '20',
                Largest_Project: '8,000,000',
                Monthly_Capacity: '2,500,000',
                Has_Factory: 'لا',
                Has_Equipment: 'نعم',
                Contractor_Classification: 'الدرجة الثانية',
                ISO_Certifications: ['ISO 9001', 'ISO 45001'],
                Accreditations: ['NHC', 'أمانات'],
                Contractor_Membership: 'نعم',
                Annual_Turnover: '20-50 مليون',
                Credit_Terms: '60 يوم',
                Credit_Limit: '1,500,000',
                Approval_Status: 'تحت المراجعة',
                Rating: '',
                Notes: '',
                Submission_Date: new Date().toISOString()
            }
        ];

        // Send to server
        adminFetch('/api/suppliers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(demoSuppliers)
        })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            loadData();
            alert('تم إضافة ' + result.added + ' مورد تجريبي');
        })
        .catch(function () {
            alert('حدث خطأ في إضافة البيانات التجريبية');
        });
    };

    // ===== EXPORT CSV =====
    window.exportCSV = function () {
        var suppliers = getSuppliers();
        if (suppliers.length === 0) {
            alert('لا توجد بيانات للتصدير');
            return;
        }

        var headers = [
            'رقم الطلب', 'اسم الشركة', 'السجل التجاري', 'نوع الكيان', 'المدينة',
            'المسؤول', 'الجوال', 'البريد', 'الأنشطة', 'عدد الموظفين',
            'حجم الأعمال', 'مصنع', 'معدات', 'التصنيف', 'الحالة', 'التقييم', 'ملاحظات', 'تاريخ التقديم'
        ];

        var rows = suppliers.map(function (s) {
            return [
                s.Supplier_ID,
                s.Company_Name,
                s.CR_Number,
                s.Entity_Type,
                s.City,
                s.Contact_Name,
                s.Mobile,
                s.Email,
                Array.isArray(s.Activities) ? s.Activities.join(' | ') : '',
                s.Employee_Count,
                s.Annual_Turnover,
                s.Has_Factory,
                s.Has_Equipment,
                s.Contractor_Classification,
                s.Approval_Status,
                s.Rating || '',
                s.Notes || '',
                s.Submission_Date
            ].map(function (v) {
                return '"' + String(v || '').replace(/"/g, '""') + '"';
            }).join(',');
        });

        var bom = '\uFEFF';
        var csv = bom + headers.join(',') + '\n' + rows.join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'arkon_suppliers_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // ===== FILE HELPERS =====
    window.viewFile = function (dataUrl, type) {
        var win = window.open('');
        if (type && type.indexOf('pdf') !== -1) {
            win.document.write('<iframe src="' + dataUrl + '" style="width:100%;height:100%;border:none;"></iframe>');
        } else {
            win.document.write('<img src="' + dataUrl + '" style="max-width:100%;height:auto;">');
        }
    };

    function getFileIcon(type) {
        if (!type) return '📄';
        if (type.indexOf('pdf') !== -1) return '📕';
        if (type.indexOf('image') !== -1) return '🖼️';
        return '📄';
    }

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ===== UTILITY =====
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text || ''));
        return div.innerHTML;
    }

    // ===== GOOGLE CALENDAR SETTINGS =====

    window.toggleCalendarSettings = function () {
        var body = document.getElementById('calendarSettingsBody');
        var icon = document.getElementById('settingsToggleIcon');
        if (!body) return;
        var isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        if (icon) icon.innerHTML = isOpen ? '&#8964;' : '&#8963;';
        if (!isOpen) loadCalendarSettings();
    };

    function loadCalendarSettings() {
        adminFetch('/api/settings/calendar')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var clientIdEl = document.getElementById('settingsClientId');
                var redirectEl = document.getElementById('settingsRedirectUri');
                var connectArea = document.getElementById('calendarConnectArea');
                if (clientIdEl) clientIdEl.value = data.client_id || '';
                if (redirectEl) redirectEl.value = data.redirect_uri || '';
                if (connectArea) {
                    if (data.client_id && data.has_secret) {
                        connectArea.innerHTML = checkCalendarStatus._lastConnected
                            ? '<span style="color:#27ae60;font-weight:600;">&#10003; مرتبط بـ Google Calendar</span>'
                            : '<button class="btn-action btn-view" style="padding:8px 18px;" onclick="connectCalendar()">ربط Google Calendar</button>';
                    } else {
                        connectArea.innerHTML = '<span style="color:#e67e22;font-size:13px;">أضف Client ID و Client Secret أولاً ثم احفظ</span>';
                    }
                }
            })
            .catch(function () {});
    }

    window.saveCalendarSettings = function () {
        var clientId = (document.getElementById('settingsClientId') || {}).value || '';
        var clientSecret = (document.getElementById('settingsClientSecret') || {}).value || '';
        var msgEl = document.getElementById('settingsMsg');

        if (!clientId.trim()) {
            if (msgEl) { msgEl.textContent = 'Client ID مطلوب'; msgEl.style.color = '#e74c3c'; }
            return;
        }

        adminFetch('/api/settings/calendar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() || null })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (msgEl) {
                if (data.success) {
                    msgEl.textContent = 'تم حفظ الإعدادات بنجاح';
                    msgEl.style.color = '#27ae60';
                    if (clientSecret.trim()) {
                        document.getElementById('settingsClientSecret').value = '';
                    }
                    loadCalendarSettings();
                } else {
                    msgEl.textContent = data.error || 'حدث خطأ';
                    msgEl.style.color = '#e74c3c';
                }
            }
            setTimeout(function () { if (msgEl) msgEl.textContent = ''; }, 3000);
        })
        .catch(function () {
            if (msgEl) { msgEl.textContent = 'خطأ في الاتصال'; msgEl.style.color = '#e74c3c'; }
        });
    };

    window.copyRedirectUri = function () {
        var el = document.getElementById('settingsRedirectUri');
        if (!el) return;
        navigator.clipboard.writeText(el.value).then(function () {
            var btn = el.nextElementSibling;
            if (btn) { btn.textContent = 'تم النسخ ✓'; setTimeout(function () { btn.textContent = 'نسخ'; }, 2000); }
        }).catch(function () {
            el.select();
            document.execCommand('copy');
        });
    };

    // ===== TASKS & GOOGLE CALENDAR =====

    // Check calendar status and update UI
    checkCalendarStatus._lastConnected = false;

    function checkCalendarStatus() {
        adminFetch('/api/calendar/status')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                checkCalendarStatus._lastConnected = !!data.connected;
                var statusEl = document.getElementById('calendarStatus');
                var connectArea = document.getElementById('calendarConnectArea');
                var connected = data.connected;

                if (statusEl) {
                    statusEl.innerHTML = connected
                        ? '<span style="color:#27ae60;font-weight:600;">&#10003; Google Calendar مرتبط</span>'
                        : '';
                }
                if (connectArea && !connected) {
                    connectArea.innerHTML = '<button class="btn-action btn-view" style="padding:8px 18px;" onclick="connectCalendar()">ربط Google Calendar</button>';
                } else if (connectArea && connected) {
                    connectArea.innerHTML = '<span style="color:#27ae60;font-weight:600;">&#10003; مرتبط بـ Google Calendar</span>';
                }
            })
            .catch(function () {});
    }

    window.connectCalendar = function () {
        adminFetch('/api/calendar/auth')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert(data.error || 'تعذر بدء الربط');
                }
            })
            .catch(function () { alert('خطأ في الاتصال'); });
    };

    // Handle cal= query param (redirect back from Google OAuth)
    (function () {
        var params = new URLSearchParams(window.location.search);
        var cal = params.get('cal');
        if (cal === 'success') {
            alert('تم ربط Google Calendar بنجاح! ستُضاف المهام تلقائياً إلى تقويمك.');
            history.replaceState({}, '', '/admin');
        } else if (cal === 'error') {
            alert('حدث خطأ أثناء ربط Google Calendar. تأكد من بيانات Google API.');
            history.replaceState({}, '', '/admin');
        }
    })();

    // Load tasks
    var cachedTasks = [];

    function loadTasks() {
        checkCalendarStatus();
        adminFetch('/api/tasks')
            .then(function (r) { return r.json(); })
            .then(function (tasks) {
                cachedTasks = tasks;
                renderTasksTable(tasks);
            })
            .catch(function (err) { console.error('Error loading tasks:', err); });
    }

    function renderTasksTable(tasks) {
        var body = document.getElementById('tasksBody');
        var empty = document.getElementById('emptyTasks');
        if (!body) return;

        if (tasks.length === 0) {
            body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        var statusColors = { 'معلق': 'badge-pending', 'قيد التنفيذ': 'badge-pending', 'مكتمل': 'badge-approved' };

        body.innerHTML = tasks.map(function (t) {
            var dueDate = t.due_date ? new Date(t.due_date).toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
            var calIcon = t.calendar_event_id
                ? '<span style="color:#27ae60;font-size:18px;" title="مرتبط بـ Google Calendar">&#128197;</span>'
                : '<span style="color:#bbb;font-size:18px;" title="غير مرتبط">&#128197;</span>';
            var statusCls = statusColors[t.status] || 'badge-pending';

            return '<tr>' +
                '<td>' + t.id + '</td>' +
                '<td><strong>' + escapeHtml(t.title) + '</strong></td>' +
                '<td>' + escapeHtml(t.description || '-') + '</td>' +
                '<td>' + dueDate + '</td>' +
                '<td>' + escapeHtml(t.supplier_id || '-') + '</td>' +
                '<td><span class="badge ' + statusCls + '">' + escapeHtml(t.status) + '</span></td>' +
                '<td style="text-align:center;">' + calIcon + '</td>' +
                '<td>' +
                    '<button class="btn-action btn-view" onclick="openTaskModal(' + t.id + ')">تعديل</button>' +
                    '<button class="btn-action btn-reject" onclick="deleteTask(' + t.id + ')">حذف</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    // Populate suppliers in task modal
    function populateTaskSuppliers() {
        var sel = document.getElementById('taskSupplier');
        if (!sel) return;
        var current = sel.value;
        sel.innerHTML = '<option value="">— بدون مورد —</option>';
        cachedSuppliers.forEach(function (s) {
            sel.innerHTML += '<option value="' + escapeHtml(s.Supplier_ID) + '">' + escapeHtml(s.Company_Name) + ' (' + escapeHtml(s.Supplier_ID) + ')</option>';
        });
        sel.value = current;
    }

    window.openTaskModal = function (id) {
        document.getElementById('taskId').value = '';
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskStatus').value = 'معلق';
        document.getElementById('taskError').textContent = '';
        document.getElementById('taskModalTitle').textContent = 'إضافة مهمة';
        populateTaskSuppliers();

        if (id) {
            var task = cachedTasks.find(function (t) { return t.id === id; });
            if (task) {
                document.getElementById('taskModalTitle').textContent = 'تعديل المهمة';
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDesc').value = task.description || '';
                // Format datetime-local value
                var d = new Date(task.due_date);
                var local = d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0') + 'T' +
                    String(d.getHours()).padStart(2, '0') + ':' +
                    String(d.getMinutes()).padStart(2, '0');
                document.getElementById('taskDueDate').value = local;
                document.getElementById('taskStatus').value = task.status || 'معلق';
                document.getElementById('taskSupplier').value = task.supplier_id || '';
            }
        }

        document.getElementById('taskModal').classList.add('show');
    };

    window.closeTaskModal = function () {
        document.getElementById('taskModal').classList.remove('show');
    };

    var taskModalEl = document.getElementById('taskModal');
    if (taskModalEl) {
        taskModalEl.addEventListener('click', function (e) {
            if (e.target === this) closeTaskModal();
        });
    }

    window.saveTask = function () {
        var id = document.getElementById('taskId').value;
        var title = document.getElementById('taskTitle').value.trim();
        var desc = document.getElementById('taskDesc').value.trim();
        var dueDate = document.getElementById('taskDueDate').value;
        var status = document.getElementById('taskStatus').value;
        var supplierId = document.getElementById('taskSupplier').value;
        var errorEl = document.getElementById('taskError');

        errorEl.textContent = '';
        if (!title) { errorEl.textContent = 'العنوان مطلوب'; return; }
        if (!dueDate) { errorEl.textContent = 'تاريخ الاستحقاق مطلوب'; return; }

        var body = {
            title: title,
            description: desc || null,
            due_date: new Date(dueDate).toISOString(),
            status: status,
            supplier_id: supplierId || null
        };

        var method = id ? 'PUT' : 'POST';
        var url = id ? '/api/tasks/' + id : '/api/tasks';

        adminFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.success || data.id) {
                closeTaskModal();
                loadTasks();
            } else {
                errorEl.textContent = data.error || 'حدث خطأ';
            }
        })
        .catch(function () { errorEl.textContent = 'خطأ في الاتصال'; });
    };

    window.deleteTask = function (id) {
        if (!confirm('هل تريد حذف هذه المهمة وإزالتها من Google Calendar؟')) return;
        adminFetch('/api/tasks/' + id, { method: 'DELETE' })
            .then(function () { loadTasks(); })
            .catch(function () { alert('خطأ في حذف المهمة'); });
    };

});
