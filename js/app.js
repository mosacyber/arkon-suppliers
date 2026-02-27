// ===== SUPPLIER REGISTRATION FORM - ARKON ALLIANCE =====

document.addEventListener('DOMContentLoaded', function () {

    // ===== STATE =====
    let currentStep = 1;
    const totalSteps = 8;

    // ===== NAVBAR SCROLL EFFECT =====
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ===== HERO PARTICLES =====
    const particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 10 + 8) + 's';
            particle.style.animationDelay = (Math.random() * 10) + 's';
            particle.style.width = (Math.random() * 4 + 2) + 'px';
            particle.style.height = particle.style.width;
            particlesContainer.appendChild(particle);
        }
    }

    // ===== ANIMATED COUNTERS =====
    const statNumbers = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;
        countersAnimated = true;

        statNumbers.forEach(function (el) {
            const target = parseInt(el.getAttribute('data-target'));
            const duration = 2000;
            const start = 0;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(eased * target);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    el.textContent = target;
                }
            }

            requestAnimationFrame(update);
        });
    }

    // Trigger counter animation when hero is visible
    const heroObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounters();
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        heroObserver.observe(heroStats);
    }

    // ===== OTHER ACTIVITY TOGGLE =====
    const otherActivityCheck = document.getElementById('otherActivityCheck');
    const otherActivityGroup = document.getElementById('otherActivityGroup');

    if (otherActivityCheck) {
        otherActivityCheck.addEventListener('change', function () {
            otherActivityGroup.style.display = this.checked ? 'flex' : 'none';
        });
    }

    // ===== EQUIPMENT TOGGLE =====
    const equipmentRadios = document.querySelectorAll('input[name="hasEquipment"]');
    const equipmentListGroup = document.getElementById('equipmentListGroup');

    equipmentRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'نعم') {
                equipmentListGroup.style.display = 'flex';
            } else {
                equipmentListGroup.style.display = 'none';
            }
        });
    });

    // ===== FILE UPLOAD HANDLING =====
    // Document upload cards
    document.querySelectorAll('.doc-upload-area .file-input').forEach(function (input) {
        input.addEventListener('change', function () {
            const area = this.closest('.doc-upload-area');
            const nameEl = area.querySelector('.doc-file-name');
            if (this.files.length > 0) {
                nameEl.textContent = this.files[0].name;
                area.classList.add('has-file');
            } else {
                nameEl.textContent = '';
                area.classList.remove('has-file');
            }
        });
    });

    // Certificate file upload
    const certInput = document.getElementById('certFiles');
    const certFileList = document.getElementById('certFileList');

    if (certInput) {
        certInput.addEventListener('change', function () {
            certFileList.innerHTML = '';
            Array.from(this.files).forEach(function (file) {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML =
                    '<span>' + file.name + '</span>' +
                    '<span>' + (file.size / 1024 / 1024).toFixed(2) + ' MB</span>';
                certFileList.appendChild(item);
            });
        });
    }

    // Drag and drop
    document.querySelectorAll('.file-upload-zone').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        zone.addEventListener('dragleave', function () {
            this.classList.remove('dragover');
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
    });

    // ===== NUMBER FORMATTING =====
    ['largestProject', 'monthlyCapacity', 'creditLimit'].forEach(function (id) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function () {
                let value = this.value.replace(/[^\d]/g, '');
                if (value) {
                    this.value = parseInt(value).toLocaleString('en-US');
                }
            });
        }
    });

    // ===== FORM VALIDATION =====
    function validateStep(step) {
        const stepEl = document.querySelector('.form-step[data-step="' + step + '"]');
        if (!stepEl) return true;

        const requiredFields = stepEl.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(function (field) {
            const group = field.closest('.form-group');
            const errorMsg = group ? group.querySelector('.error-msg') : null;

            // Reset
            field.classList.remove('error');
            if (errorMsg) {
                errorMsg.textContent = '';
                errorMsg.classList.remove('show');
            }

            // Check radio buttons
            if (field.type === 'radio') {
                const name = field.name;
                const checked = stepEl.querySelector('input[name="' + name + '"]:checked');
                if (!checked) {
                    isValid = false;
                    if (errorMsg) {
                        errorMsg.textContent = 'يرجى الاختيار';
                        errorMsg.classList.add('show');
                    }
                }
                return;
            }

            // Check empty value
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                if (errorMsg) {
                    errorMsg.textContent = 'هذا الحقل مطلوب';
                    errorMsg.classList.add('show');
                }
                return;
            }

            // Email validation
            if (field.type === 'email') {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(field.value)) {
                    isValid = false;
                    field.classList.add('error');
                    if (errorMsg) {
                        errorMsg.textContent = 'أدخل بريد إلكتروني صحيح';
                        errorMsg.classList.add('show');
                    }
                }
            }

            // Phone validation
            if (field.id === 'mobile') {
                if (!/^5\d{8}$/.test(field.value)) {
                    isValid = false;
                    field.classList.add('error');
                    if (errorMsg) {
                        errorMsg.textContent = 'أدخل رقم جوال صحيح يبدأ بـ 5';
                        errorMsg.classList.add('show');
                    }
                }
            }
        });

        // Special check for step 8 declarations
        if (step === 8) {
            const dataAccuracy = document.getElementById('dataAccuracy');
            const policyAgreement = document.getElementById('policyAgreement');

            if (!dataAccuracy.checked || !policyAgreement.checked) {
                isValid = false;
                if (!dataAccuracy.checked) {
                    dataAccuracy.closest('.declaration-item').style.borderColor = '#ef4444';
                }
                if (!policyAgreement.checked) {
                    policyAgreement.closest('.declaration-item').style.borderColor = '#ef4444';
                }
            }
        }

        return isValid;
    }

    // Clear error on input
    document.querySelectorAll('input, select, textarea').forEach(function (field) {
        field.addEventListener('input', function () {
            this.classList.remove('error');
            const group = this.closest('.form-group');
            if (group) {
                const errorMsg = group.querySelector('.error-msg');
                if (errorMsg) {
                    errorMsg.textContent = '';
                    errorMsg.classList.remove('show');
                }
            }
        });
    });

    // Declarations - clear border
    ['dataAccuracy', 'policyAgreement'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function () {
                if (this.checked) {
                    this.closest('.declaration-item').style.borderColor = '';
                }
            });
        }
    });

    // ===== STEP NAVIGATION =====
    window.nextStep = function () {
        if (!validateStep(currentStep)) {
            // Scroll to first error
            const firstError = document.querySelector('.form-step.active .error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (currentStep < totalSteps) {
            currentStep++;
            updateStep();
        }
    };

    window.prevStep = function () {
        if (currentStep > 1) {
            currentStep--;
            updateStep();
        }
    };

    function updateStep() {
        // Update form steps
        document.querySelectorAll('.form-step').forEach(function (step) {
            step.classList.remove('active');
        });
        var activeStep = document.querySelector('.form-step[data-step="' + currentStep + '"]');
        if (activeStep) {
            activeStep.classList.add('active');
        }

        // Update progress
        document.querySelectorAll('.progress-step').forEach(function (step) {
            const stepNum = parseInt(step.getAttribute('data-step'));
            step.classList.remove('active', 'completed');
            if (stepNum === currentStep) {
                step.classList.add('active');
            } else if (stepNum < currentStep) {
                step.classList.add('completed');
            }
        });

        // Update progress line
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        document.getElementById('progressFill').style.width = progress + '%';

        // Generate summary on last step
        if (currentStep === totalSteps) {
            generateSummary();
        }

        // Scroll to form
        var formStart = document.getElementById('form-start');
        if (formStart) {
            formStart.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Allow clicking on completed steps
    document.querySelectorAll('.progress-step').forEach(function (step) {
        step.addEventListener('click', function () {
            const stepNum = parseInt(this.getAttribute('data-step'));
            if (stepNum < currentStep) {
                currentStep = stepNum;
                updateStep();
            }
        });
    });

    // ===== SUMMARY GENERATION =====
    function generateSummary() {
        const summaryContent = document.getElementById('summaryContent');
        if (!summaryContent) return;

        const fields = [
            { label: 'اسم الشركة', id: 'companyName' },
            { label: 'رقم السجل التجاري', id: 'crNumber' },
            { label: 'نوع الكيان', id: 'entityType' },
            { label: 'المدينة', id: 'city' },
            { label: 'الشخص المسؤول', id: 'contactName' },
            { label: 'رقم الجوال', id: 'mobile' },
            { label: 'البريد الإلكتروني', id: 'email' },
            { label: 'عدد الموظفين', id: 'employeeCount' },
            { label: 'حجم الأعمال السنوي', id: 'annualTurnover' },
            { label: 'التوريد الآجل', id: 'creditTerms' }
        ];

        let html = '';

        fields.forEach(function (field) {
            const el = document.getElementById(field.id);
            const value = el ? el.value : '';
            if (value) {
                html += '<div class="summary-item">' +
                    '<span class="summary-label">' + field.label + '</span>' +
                    '<span class="summary-value">' + escapeHtml(value) + '</span>' +
                    '</div>';
            }
        });

        // Activities
        const activities = [];
        document.querySelectorAll('input[name="activity"]:checked').forEach(function (cb) {
            activities.push(cb.value);
        });
        if (activities.length > 0) {
            html += '<div class="summary-item" style="grid-column: 1/-1">' +
                '<span class="summary-label">الأنشطة</span>' +
                '<span class="summary-value">' + escapeHtml(activities.join(' | ')) + '</span>' +
                '</div>';
        }

        summaryContent.innerHTML = html;
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    // ===== FILE READING HELPER =====
    function readFileAsBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: reader.result
                });
            };
            reader.onerror = function () { reject(reader.error); };
            reader.readAsDataURL(file);
        });
    }

    function collectFiles() {
        var promises = [];
        var fileMap = {};
        var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

        // Document upload cards
        var docNames = ['commercialRegister', 'zakatCert', 'insuranceCert', 'vatCert', 'bankLetter', 'catalog'];
        var docLabels = {
            commercialRegister: 'السجل التجاري',
            zakatCert: 'شهادة الزكاة',
            insuranceCert: 'شهادة التأمين',
            vatCert: 'شهادة الضريبة',
            bankLetter: 'خطاب البنك',
            catalog: 'كتالوج المنتجات'
        };

        docNames.forEach(function (name) {
            var input = document.querySelector('input[name="' + name + '"]');
            if (input && input.files.length > 0) {
                var file = input.files[0];
                if (file.size > MAX_FILE_SIZE) {
                    alert('الملف "' + file.name + '" أكبر من 5 ميجابايت. يرجى تصغير حجم الملف.');
                    return;
                }
                promises.push(
                    readFileAsBase64(file).then(function (fileData) {
                        fileData.docType = name;
                        fileData.docLabel = docLabels[name];
                        fileMap[name] = fileData;
                    })
                );
            }
        });

        // Certificate files (multiple)
        var certInput = document.getElementById('certFiles');
        if (certInput && certInput.files.length > 0) {
            var certFiles = [];
            Array.from(certInput.files).forEach(function (file) {
                if (file.size > MAX_FILE_SIZE) {
                    alert('الملف "' + file.name + '" أكبر من 5 ميجابايت.');
                    return;
                }
                promises.push(
                    readFileAsBase64(file).then(function (fileData) {
                        fileData.docType = 'certificate';
                        fileData.docLabel = 'شهادة';
                        certFiles.push(fileData);
                    })
                );
            });
            fileMap._certFiles = certFiles;
        }

        return Promise.all(promises).then(function () {
            return fileMap;
        });
    }

    // ===== FORM SUBMISSION =====
    var form = document.getElementById('supplierForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!validateStep(currentStep)) return;

            var submitBtn = document.getElementById('submitBtn');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            var data = {
                Company_Name: getValue('companyName'),
                CR_Number: getValue('crNumber'),
                Establish_Date: getValue('establishDate'),
                Entity_Type: getValue('entityType'),
                City: getValue('city'),
                National_Address: getValue('nationalAddress'),
                VAT_Number: getValue('vatNumber'),
                Chamber_Number: getValue('chamberNumber'),
                Contact_Name: getValue('contactName'),
                Job_Title: getValue('jobTitle'),
                Mobile: '+966' + getValue('mobile'),
                Email: getValue('email'),
                Website: getValue('website'),
                Activities: getCheckedValues('activity'),
                Employee_Count: getValue('employeeCount'),
                Engineer_Count: getValue('engineerCount'),
                Largest_Project: getValue('largestProject'),
                Monthly_Capacity: getValue('monthlyCapacity'),
                Has_Factory: getRadioValue('hasFactory'),
                Has_Equipment: getRadioValue('hasEquipment'),
                Contractor_Classification: getValue('contractorClassification'),
                ISO_Certifications: getCheckedValues('iso'),
                Accreditations: getCheckedValues('accreditation'),
                Contractor_Membership: getRadioValue('contractorMembership'),
                Annual_Turnover: getValue('annualTurnover'),
                Credit_Terms: getValue('creditTerms'),
                Credit_Limit: getValue('creditLimit')
            };

            // Collect files then submit
            collectFiles().then(function (fileMap) {
                if (Object.keys(fileMap).length > 0) {
                    data.Files = fileMap;
                }

                return fetch('/api/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            })
            .then(function (res) { return res.json(); })
            .then(function (result) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;

                if (result.success) {
                    document.getElementById('requestNumber').textContent = result.Supplier_ID;
                    document.getElementById('successModal').classList.add('show');
                } else {
                    alert('حدث خطأ في الإرسال. حاول مرة أخرى.');
                }
            })
            .catch(function () {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                alert('حدث خطأ في الاتصال بالسيرفر. حاول مرة أخرى.');
            });
        });
    }

    function getValue(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }

    function getRadioValue(name) {
        var el = document.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    function getCheckedValues(name) {
        var values = [];
        document.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (cb) {
            values.push(cb.value);
        });
        return values;
    }

    // ===== CLOSE MODAL =====
    window.closeModal = function () {
        document.getElementById('successModal').classList.remove('show');
        // Reset form
        form.reset();
        currentStep = 1;
        updateStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Close modal on overlay click
    var modal = document.getElementById('successModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                window.closeModal();
            }
        });
    }

});
