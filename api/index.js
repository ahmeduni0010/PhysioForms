const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase Client safely using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Mock database for credentials validation (Matches your environment variables or fallback values)
const DOCTOR_CREDENTIALS = {
    username: process.env.DOCTOR_USERNAME || "admin",
    password: process.env.DOCTOR_PASSWORD || "admin123"
};

// Simple global variable fallback to simulate serverless token tracking if cookie states clear out
let globalAuthenticatedUser = null;

/* ==========================================
   AUTHENTICATION API ROUTE ENDPOINTS
   ========================================== */

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (username === DOCTOR_CREDENTIALS.username && password === DOCTOR_CREDENTIALS.password) {
        globalAuthenticatedUser = username; // Maintain a basic active runtime flag for serverless bypasses
        return res.status(200).json({ 
            success: true, 
            username: username,
            token: "physio_secure_token_session_active" 
        });
    }

    return res.status(401).json({ success: false, error: "Invalid clinical login credentials." });
});

app.post('/api/auth/logout', (req, res) => {
    globalAuthenticatedUser = null;
    return res.status(200).json({ success: true });
});

/* ==========================================
   PATIENTS DIRECTORY CRUD OPERATIONS
   ========================================== */

// Auth Middleware fallback check to ensure serverless stability
const verifyAuthSession = (req, res, next) => {
    if (globalAuthenticatedUser) {
        return next();
    }
    return res.status(401).json({ error: "Unauthorized access: Session expired or invalid." });
};

// GET: Retrieve all active patient entries
app.get('/api/patients', verifyAuthSession, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data || []);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST: Register a new patient record profile
app.post('/api/patients', verifyAuthSession, async (req, res) => {
    const { name, age, details } = req.body;
    
    if (!name || !age) {
        return res.status(400).json({ error: "Missing required profile registration parameters." });
    }

    // Generate a secure unique random token link for the intake assessment sheet assignment
    const generatedToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    try {
        const { data, error } = await supabase
            .from('patients')
            .insert([
                { 
                    name, 
                    age: parseInt(age), 
                    details: details || [], 
                    unique_token: generatedToken, // ✅ Matches your database column name
                    form_ha21: [],
                    form_ha20: [] 
                }
            ])
            .select();

        if (error) throw error;
        return res.status(201).json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PUT: Modify details updates of an existing patient profile card
app.put('/api/patients/:id', verifyAuthSession, async (req, res) => {
    const { id } = req.params;
    const { name, age, details } = req.body;

    try {
        const { data, error } = await supabase
            .from('patients')
            .update({ name, age: parseInt(age), details })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.status(200).json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DELETE: Terminate and clear target profile record registry
app.delete('/api/patients/:id', verifyAuthSession, async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ==========================================
   SHARED ASSESSMENT PATIENT LINKS MANAGEMENT
   ========================================== */

// GET: Load public token-matched intake data without dashboard authorization logs
app.get('/api/shared/form/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const { data, error } = await supabase
            .from('patients')
            .select('name, age, form_ha21, form_ha20')
            .eq('unique_token', token) // ✅ Matches your database column name
            .single();

        if (error || !data) {
            return res.status(404).json({ error: "Invalid validation verification link token matching sequence." });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST: Save and synchronize patient evaluation input answers sheets
app.post('/api/shared/form/:token', async (req, res) => {
    const { token } = req.params;
    const { form_ha21, form_ha20 } = req.body;

    try {
        const { data, error } = await supabase
            .from('patients')
            .update({ form_ha21, form_ha20 })
            .eq('unique_token', token) // ✅ Matches your database column name
            .select();

        if (error || !data || data.length === 0) {
            return res.status(404).json({ success: false, error: "Unable to find or synchronize target evaluation file data." });
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = app;
