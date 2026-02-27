-- =====================================================
-- قاعدة بيانات تأهيل الموردين - تحالف أركون
-- ARKON Alliance Supplier Qualification Database
-- =====================================================

-- جدول الموردين الرئيسي
CREATE TABLE suppliers (
    Supplier_ID         INT             AUTO_INCREMENT PRIMARY KEY,
    Company_Name        VARCHAR(255)    NOT NULL COMMENT 'اسم الشركة',
    CR_Number           VARCHAR(10)     NOT NULL COMMENT 'رقم السجل التجاري',
    Establish_Date      DATE            COMMENT 'تاريخ التأسيس',
    Entity_Type         ENUM('مؤسسة', 'شركة', 'مصنع') NOT NULL COMMENT 'نوع الكيان',
    City                VARCHAR(100)    NOT NULL COMMENT 'المدينة',
    National_Address    VARCHAR(500)    NOT NULL COMMENT 'العنوان الوطني',
    VAT_Number          VARCHAR(15)     NOT NULL COMMENT 'رقم ضريبة القيمة المضافة',
    Chamber_Number      VARCHAR(50)     COMMENT 'رقم الغرفة التجارية',

    -- معلومات التواصل
    Contact_Name        VARCHAR(200)    NOT NULL COMMENT 'اسم الشخص المسؤول',
    Job_Title           VARCHAR(150)    NOT NULL COMMENT 'المسمى الوظيفي',
    Mobile              VARCHAR(15)     NOT NULL COMMENT 'رقم الجوال',
    Email               VARCHAR(200)    NOT NULL COMMENT 'البريد الإلكتروني',
    Website             VARCHAR(300)    COMMENT 'الموقع الإلكتروني',

    -- القدرة التشغيلية
    Employee_Count      VARCHAR(20)     COMMENT 'عدد الموظفين',
    Engineer_Count      INT             COMMENT 'عدد المهندسين',
    Largest_Project     DECIMAL(15,2)   COMMENT 'قيمة أكبر مشروع (ريال)',
    Monthly_Capacity    DECIMAL(15,2)   COMMENT 'القدرة التوريدية الشهرية (ريال)',
    Has_Factory         ENUM('نعم', 'لا') DEFAULT 'لا' COMMENT 'هل لديكم مصنع',
    Has_Equipment       ENUM('نعم', 'لا') DEFAULT 'لا' COMMENT 'هل لديكم معدات',
    Equipment_List      TEXT            COMMENT 'قائمة المعدات',

    -- التصنيفات
    Contractor_Classification VARCHAR(50) COMMENT 'تصنيف المقاولين',
    Contractor_Membership     ENUM('نعم', 'لا') DEFAULT 'لا' COMMENT 'عضوية هيئة المقاولين',

    -- الوضع المالي
    Annual_Turnover     VARCHAR(50)     COMMENT 'متوسط حجم الأعمال السنوي',
    Credit_Terms        VARCHAR(20)     COMMENT 'القدرة على التوريد الآجل',
    Credit_Limit        DECIMAL(15,2)   COMMENT 'حد ائتماني مقترح',

    -- حالة الطلب
    Approval_Status     ENUM('تحت المراجعة', 'معتمد', 'مرفوض') DEFAULT 'تحت المراجعة' COMMENT 'حالة الاعتماد',
    Rating              TINYINT         DEFAULT 0 COMMENT 'تقييم داخلي (1-5)',
    Notes               TEXT            COMMENT 'ملاحظات',

    -- بيانات النظام
    Submission_Date     DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT 'تاريخ التقديم',
    Review_Date         DATETIME        COMMENT 'تاريخ المراجعة',
    Reviewed_By         VARCHAR(100)    COMMENT 'تمت المراجعة بواسطة',
    Created_At          DATETIME        DEFAULT CURRENT_TIMESTAMP,
    Updated_At          DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (Approval_Status),
    INDEX idx_city (City),
    INDEX idx_cr (CR_Number),
    UNIQUE KEY uk_cr_number (CR_Number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- جدول الأنشطة (علاقة متعددة)
CREATE TABLE supplier_activities (
    ID                  INT             AUTO_INCREMENT PRIMARY KEY,
    Supplier_ID         INT             NOT NULL,
    Activity_Type       VARCHAR(100)    NOT NULL COMMENT 'نوع النشاط',
    FOREIGN KEY (Supplier_ID) REFERENCES suppliers(Supplier_ID) ON DELETE CASCADE,
    INDEX idx_supplier (Supplier_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- جدول شهادات ISO
CREATE TABLE supplier_iso (
    ID                  INT             AUTO_INCREMENT PRIMARY KEY,
    Supplier_ID         INT             NOT NULL,
    ISO_Type            VARCHAR(50)     NOT NULL COMMENT 'نوع شهادة ISO',
    FOREIGN KEY (Supplier_ID) REFERENCES suppliers(Supplier_ID) ON DELETE CASCADE,
    INDEX idx_supplier (Supplier_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- جدول اعتمادات الجهات
CREATE TABLE supplier_accreditations (
    ID                  INT             AUTO_INCREMENT PRIMARY KEY,
    Supplier_ID         INT             NOT NULL,
    Accreditation_Body  VARCHAR(100)    NOT NULL COMMENT 'الجهة المعتمِدة',
    FOREIGN KEY (Supplier_ID) REFERENCES suppliers(Supplier_ID) ON DELETE CASCADE,
    INDEX idx_supplier (Supplier_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- جدول المستندات المرفقة
CREATE TABLE supplier_documents (
    ID                  INT             AUTO_INCREMENT PRIMARY KEY,
    Supplier_ID         INT             NOT NULL,
    Document_Type       ENUM(
                            'السجل التجاري',
                            'شهادة الزكاة',
                            'شهادة التأمينات',
                            'شهادة ضريبة',
                            'خطاب تعريف بنكي',
                            'كتالوج المنتجات',
                            'شهادات ISO',
                            'أخرى'
                        ) NOT NULL COMMENT 'نوع المستند',
    File_Name           VARCHAR(255)    NOT NULL,
    File_Path           VARCHAR(500)    NOT NULL,
    File_Size           INT             COMMENT 'حجم الملف بالبايت',
    Uploaded_At         DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Supplier_ID) REFERENCES suppliers(Supplier_ID) ON DELETE CASCADE,
    INDEX idx_supplier (Supplier_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- استعلامات مفيدة
-- =====================================================

-- عرض جميع الموردين مع أنشطتهم
-- SELECT s.Supplier_ID, s.Company_Name, s.City, s.Approval_Status,
--        GROUP_CONCAT(sa.Activity_Type SEPARATOR ', ') AS Activities
-- FROM suppliers s
-- LEFT JOIN supplier_activities sa ON s.Supplier_ID = sa.Supplier_ID
-- GROUP BY s.Supplier_ID;

-- عرض الموردين حسب الحالة
-- SELECT * FROM suppliers WHERE Approval_Status = 'تحت المراجعة';

-- إحصائيات سريعة
-- SELECT Approval_Status, COUNT(*) AS Total FROM suppliers GROUP BY Approval_Status;
