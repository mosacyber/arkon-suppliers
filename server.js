const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ===== CREATE TABLE ON STARTUP =====
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS arkon_suppliers (
                id SERIAL PRIMARY KEY,
                supplier_id VARCHAR(20) UNIQUE NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Database table ready');
    } catch (err) {
        console.error('DB init error:', err.message);
    }
}

// ===== API ROUTES =====

// GET all suppliers
app.get('/api/suppliers', async function (req, res) {
    try {
        var result = await pool.query('SELECT data FROM arkon_suppliers ORDER BY created_at DESC');
        var suppliers = result.rows.map(function (r) { return r.data; });
        res.json(suppliers);
    } catch (err) {
        console.error('GET error:', err.message);
        res.status(500).json({ error: 'خطأ في قراءة البيانات' });
    }
});

// GET single supplier
app.get('/api/suppliers/:id', async function (req, res) {
    try {
        var result = await pool.query('SELECT data FROM arkon_suppliers WHERE supplier_id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.status(404).json({ error: 'المورد غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: 'خطأ في قراءة البيانات' });
    }
});

// POST new supplier
app.post('/api/suppliers', async function (req, res) {
    try {
        var data = req.body;

        // Generate unique ID
        var year = new Date().getFullYear();
        var num = String(Math.floor(Math.random() * 9000) + 1000);
        data.Supplier_ID = 'ARK-' + year + '-' + num;
        data.Approval_Status = 'تحت المراجعة';
        data.Rating = '';
        data.Notes = '';
        data.Submission_Date = new Date().toISOString();

        await pool.query(
            'INSERT INTO arkon_suppliers (supplier_id, data) VALUES ($1, $2::jsonb)',
            [data.Supplier_ID, JSON.stringify(data)]
        );

        res.status(201).json({ success: true, Supplier_ID: data.Supplier_ID });
    } catch (err) {
        console.error('POST error:', err);
        res.status(500).json({ error: err.message, detail: err.detail || '', code: err.code || '' });
    }
});

// PUT update supplier
app.put('/api/suppliers/:id', async function (req, res) {
    try {
        var result = await pool.query('SELECT data FROM arkon_suppliers WHERE supplier_id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'المورد غير موجود' });
        }

        var supplier = result.rows[0].data;
        var updates = req.body;
        Object.keys(updates).forEach(function (key) {
            supplier[key] = updates[key];
        });

        await pool.query(
            'UPDATE arkon_suppliers SET data = $1 WHERE supplier_id = $2',
            [JSON.stringify(supplier), req.params.id]
        );

        res.json({ success: true, supplier: supplier });
    } catch (err) {
        console.error('PUT error:', err.message);
        res.status(500).json({ error: 'خطأ في تحديث البيانات' });
    }
});

// DELETE supplier
app.delete('/api/suppliers/:id', async function (req, res) {
    try {
        var result = await pool.query('DELETE FROM arkon_suppliers WHERE supplier_id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'المورد غير موجود' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'خطأ في حذف البيانات' });
    }
});

// POST bulk (demo data)
app.post('/api/suppliers/bulk', async function (req, res) {
    try {
        var newItems = req.body;
        if (!Array.isArray(newItems)) {
            return res.status(400).json({ error: 'البيانات يجب أن تكون مصفوفة' });
        }

        var added = 0;
        for (var i = 0; i < newItems.length; i++) {
            var item = newItems[i];
            try {
                await pool.query(
                    'INSERT INTO arkon_suppliers (supplier_id, data) VALUES ($1, $2) ON CONFLICT (supplier_id) DO NOTHING',
                    [item.Supplier_ID, JSON.stringify(item)]
                );
                added++;
            } catch (e) {
                // Skip duplicates
            }
        }

        res.json({ success: true, added: added });
    } catch (err) {
        console.error('BULK error:', err.message);
        res.status(500).json({ error: 'خطأ في حفظ البيانات' });
    }
});

// GET stats
app.get('/api/stats', async function (req, res) {
    try {
        var result = await pool.query('SELECT data FROM arkon_suppliers');
        var suppliers = result.rows.map(function (r) { return r.data; });
        res.json({
            total: suppliers.length,
            pending: suppliers.filter(function (s) { return s.Approval_Status === 'تحت المراجعة'; }).length,
            approved: suppliers.filter(function (s) { return s.Approval_Status === 'معتمد'; }).length,
            rejected: suppliers.filter(function (s) { return s.Approval_Status === 'مرفوض'; }).length
        });
    } catch (err) {
        res.status(500).json({ error: 'خطأ' });
    }
});

// Debug DB connection
app.get('/api/debug', async function (req, res) {
    try {
        var r = await pool.query('SELECT NOW() as time');
        var tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        res.json({
            connected: true,
            time: r.rows[0].time,
            tables: tables.rows.map(function (t) { return t.tablename; }),
            dbUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET'
        });
    } catch (err) {
        res.json({ connected: false, error: err.message, dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET' });
    }
});

// Serve main page
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
initDB().then(function () {
    app.listen(PORT, function () {
        console.log('Arkon Suppliers Server running on port ' + PORT);
    });
});
