require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 1000 * 60 * 60 * 24
    }
}));

function requireDoctorAuth(req, res, next) {
    if (req.session && req.session.doctorId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized access.' });
}

/* ================= AUTHENTICATION ROUTES ================= */

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !doctor) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isBcryptMatch = await bcrypt.compare(password, doctor.password_hash).catch(() => false);
        const isPlainTextMatch = (password === doctor.password_hash);

        if (!isBcryptMatch && !isPlainTextMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        req.session.doctorId = doctor.id;
        req.session.username = doctor.username;
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Authentication processing fault.' });
    }
});

app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.doctorId) {
        return res.json({ isAuthenticated: true, username: req.session.username });
    }
    return res.json({ isAuthenticated: false });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout fault.' });
        res.clearCookie('connect.sid');
        return res.json({ success: true });
    });
});

/* ================= DOCTOR DASHBOARD PATIENT MANAGEMENT ================= */

app.get('/api/patients', requireDoctorAuth, async (req, res) => {
    try {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('*')
            .order('id', { ascending: false });
        if (error) throw error;
        return res.json(patients);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve records.' });
    }
});

app.post('/api/patients', requireDoctorAuth, async (req, res) => {
    const { name, age, details } = req.body;
    if (!name || !age) {
        return res.status(400).json({ error: 'Name and age fields are required.' });
    }
    const uniqueToken = crypto.randomBytes(16).toString('hex');
    try {
        const { data: newPatient, error } = await supabase
            .from('patients')
            .insert([{ name, age: parseInt(age), details: details || [], unique_token: uniqueToken, form_ha21: [], form_ha20: [] }])
            .select().single();
        if (error) throw error;
        return res.json({ success: true, patient: newPatient });
    } catch (err) {
        return res.status(500).json({ error: 'Profile generation fault.' });
    }
});

// NEW endpoint: Update/Edit Patient Details
app.put('/api/patients/:id', requireDoctorAuth, async (req, res) => {
    const { id } = req.params;
    const { name, age, details } = req.body;
    try {
        const { error } = await supabase
            .from('patients')
            .update({ name, age: parseInt(age), details: details || [] })
            .eq('id', id);
        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Profile modification fault.' });
    }
});

// NEW endpoint: Delete Patient Record completely
app.delete('/api/patients/:id', requireDoctorAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Record extraction removal fault.' });
    }
});

/* ================= SECURE PATIENT SHARED LINKS & FORM DATA ================= */

app.get('/api/shared/form/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const { data: patient, error } = await supabase
            .from('patients')
            .select('id, name, age, details, unique_token, form_ha21, form_ha20')
            .eq('unique_token', token)
            .single();
        if (error || !patient) return res.status(404).json({ error: 'Invalid token link.' });
        return res.json(patient);
    } catch (err) {
        return res.status(500).json({ error: 'Link trace resolution issue.' });
    }
});

app.post('/api/shared/form/:token', async (req, res) => {
    const { token } = req.params;
    const { form_ha21, form_ha20 } = req.body;
    try {
        const { data: updatedPatient, error } = await supabase
            .from('patients')
            .update({ form_ha21: form_ha21 || [], form_ha20: form_ha20 || [] })
            .eq('unique_token', token)
            .select().single();
        if (error || !updatedPatient) return res.status(404).json({ error: 'Synchronization failure.' });
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Form data submittal exception.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server executing cleanly on port ${PORT}`); });

module.exports = app;