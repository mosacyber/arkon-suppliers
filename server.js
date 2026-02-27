const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'suppliers.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// File upload config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        const allowed = /pdf|jpg|jpeg|png/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        if (ext) cb(null, true);
        else cb(new Error('نوع الملف غير مدعوم'));
    }
});

// ===== HELPERS =====
function readSuppliers() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeSuppliers(suppliers) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(suppliers, null, 2), 'utf8');
}

// ===== API ROUTES =====

// GET all suppliers
app.get('/api/suppliers', function (req, res) {
    var suppliers = readSuppliers();
    res.json(suppliers);
});

// GET single supplier
app.get('/api/suppliers/:id', function (req, res) {
    var suppliers = readSuppliers();
    var supplier = suppliers.find(function (s) { return s.Supplier_ID === req.params.id; });
    if (supplier) {
        res.json(supplier);
    } else {
        res.status(404).json({ error: 'المورد غير موجود' });
    }
});

// POST new supplier
app.post('/api/suppliers', function (req, res) {
    var suppliers = readSuppliers();
    var data = req.body;

    // Generate ID
    var year = new Date().getFullYear();
    var num = String(Math.floor(Math.random() * 9000) + 1000);
    data.Supplier_ID = 'ARK-' + year + '-' + num;
    data.Approval_Status = 'تحت المراجعة';
    data.Rating = '';
    data.Notes = '';
    data.Submission_Date = new Date().toISOString();

    suppliers.push(data);
    writeSuppliers(suppliers);

    res.status(201).json({ success: true, Supplier_ID: data.Supplier_ID });
});

// PUT update supplier (status, rating, notes)
app.put('/api/suppliers/:id', function (req, res) {
    var suppliers = readSuppliers();
    var index = suppliers.findIndex(function (s) { return s.Supplier_ID === req.params.id; });

    if (index === -1) {
        return res.status(404).json({ error: 'المورد غير موجود' });
    }

    var updates = req.body;
    Object.keys(updates).forEach(function (key) {
        suppliers[index][key] = updates[key];
    });

    writeSuppliers(suppliers);
    res.json({ success: true, supplier: suppliers[index] });
});

// DELETE supplier
app.delete('/api/suppliers/:id', function (req, res) {
    var suppliers = readSuppliers();
    var filtered = suppliers.filter(function (s) { return s.Supplier_ID !== req.params.id; });

    if (filtered.length === suppliers.length) {
        return res.status(404).json({ error: 'المورد غير موجود' });
    }

    writeSuppliers(filtered);
    res.json({ success: true });
});

// POST upload files
app.post('/api/upload', upload.array('files', 10), function (req, res) {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'لم يتم رفع ملفات' });
    }

    var uploaded = req.files.map(function (f) {
        return {
            filename: f.filename,
            originalname: f.originalname,
            size: f.size,
            path: '/uploads/' + f.filename
        };
    });

    res.json({ success: true, files: uploaded });
});

// POST bulk demo data
app.post('/api/suppliers/bulk', function (req, res) {
    var suppliers = readSuppliers();
    var newItems = req.body;

    if (!Array.isArray(newItems)) {
        return res.status(400).json({ error: 'البيانات يجب أن تكون مصفوفة' });
    }

    var existingIds = {};
    suppliers.forEach(function (s) { existingIds[s.Supplier_ID] = true; });

    var added = 0;
    newItems.forEach(function (item) {
        if (!existingIds[item.Supplier_ID]) {
            suppliers.push(item);
            added++;
        }
    });

    writeSuppliers(suppliers);
    res.json({ success: true, added: added });
});

// GET stats
app.get('/api/stats', function (req, res) {
    var suppliers = readSuppliers();
    res.json({
        total: suppliers.length,
        pending: suppliers.filter(function (s) { return s.Approval_Status === 'تحت المراجعة'; }).length,
        approved: suppliers.filter(function (s) { return s.Approval_Status === 'معتمد'; }).length,
        rejected: suppliers.filter(function (s) { return s.Approval_Status === 'مرفوض'; }).length
    });
});

// Serve main page
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, function () {
    console.log('Arkon Suppliers Server running on port ' + PORT);
});
