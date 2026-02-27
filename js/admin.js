// ===== ADMIN PANEL - ARKON ALLIANCE =====

document.addEventListener('DOMContentLoaded', function () {

    // ===== AUTH =====
    var ADMIN_USER = 'admin';
    var ADMIN_PASS = 'arkon2026';
    var isLoggedIn = sessionStorage.getItem('arkon_admin') === 'true';

    if (isLoggedIn) {
        showDashboard();
    }

    // Login form
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var user = document.getElementById('adminUser').value;
            var pass = document.getElementById('adminPass').value;
            var errorEl = document.getElementById('loginError');

            if (user === ADMIN_USER && pass === ADMIN_PASS) {
                sessionStorage.setItem('arkon_admin', 'true');
                showDashboard();
            } else {
                errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
                document.getElementById('adminPass').value = '';
            }
        });
    }

    function showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        loadData();
    }

    window.logout = function () {
        sessionStorage.removeItem('arkon_admin');
        location.reload();
    };

    // ===== SIDEBAR NAVIGATION =====
    var navItems = document.querySelectorAll('.nav-item');
    var pageTitles = {
        'overview': 'نظرة عامة',
        'suppliers': 'جميع الموردين',
        'pending': 'بانتظار المراجعة',
        'approved': 'المعتمدين',
        'rejected': 'المرفوضين'
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
            document.querySelector('.sidebar').classList.remove('open');

            loadData();
        });
    });

    // Mobile menu toggle
    var menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    // ===== DATA MANAGEMENT =====
    function getSuppliers() {
        return JSON.parse(localStorage.getItem('arkon_suppliers') || '[]');
    }

    function saveSuppliers(data) {
        localStorage.setItem('arkon_suppliers', JSON.stringify(data));
    }

    function loadData() {
        var suppliers = getSuppliers();
        updateStats(suppliers);
        renderRecentTable(suppliers);
        renderSuppliersTable(suppliers);
        renderPendingTable(suppliers);
        renderApprovedTable(suppliers);
        renderRejectedTable(suppliers);
        populateFilters(suppliers);
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
        if (!cityFilter || !activityFilter) return;

        var cities = {};
        var activities = {};

        suppliers.forEach(function (s) {
            if (s.City) cities[s.City] = true;
            if (Array.isArray(s.Activities)) {
                s.Activities.forEach(function (a) { activities[a] = true; });
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
    }

    function applyFilters(suppliers) {
        var search = (document.getElementById('searchInput') || {}).value || '';
        var city = (document.getElementById('filterCity') || {}).value || '';
        var activity = (document.getElementById('filterActivity') || {}).value || '';
        var status = (document.getElementById('filterStatus') || {}).value || '';

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
            return true;
        });
    }

    // Filter events
    ['searchInput', 'filterCity', 'filterActivity', 'filterStatus'].forEach(function (id) {
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

            var suppliers = getSuppliers();
            suppliers.sort(function (a, b) {
                var va = a[field] || '';
                var vb = b[field] || '';
                if (va < vb) return sortAsc ? -1 : 1;
                if (va > vb) return sortAsc ? 1 : -1;
                return 0;
            });

            saveSuppliers(suppliers);
            loadData();
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
            suppliers[index].Approval_Status = 'معتمد';
            saveSuppliers(suppliers);
            loadData();
        }
    };

    window.rejectSupplier = function (index) {
        var reason = prompt('سبب الرفض (اختياري):');
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            suppliers[index].Approval_Status = 'مرفوض';
            if (reason) suppliers[index].Notes = reason;
            saveSuppliers(suppliers);
            loadData();
        }
    };

    window.saveNotes = function (index) {
        var notes = document.getElementById('modalNotes');
        if (!notes) return;
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            suppliers[index].Notes = notes.value;
            saveSuppliers(suppliers);
            alert('تم حفظ الملاحظات');
        }
    };

    window.setRating = function (index, rating) {
        var suppliers = getSuppliers();
        if (suppliers[index]) {
            suppliers[index].Rating = rating;
            saveSuppliers(suppliers);
            loadData();
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

        // Merge: add only demo suppliers not already existing
        var existingIds = {};
        suppliers.forEach(function(s) { existingIds[s.Supplier_ID] = true; });
        var added = 0;
        demoSuppliers.forEach(function(d) {
            if (!existingIds[d.Supplier_ID]) {
                suppliers.push(d);
                added++;
            }
        });

        saveSuppliers(suppliers);
        loadData();
        alert('تم إضافة ' + added + ' مورد تجريبي');
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

    // ===== UTILITY =====
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text || ''));
        return div.innerHTML;
    }

});
