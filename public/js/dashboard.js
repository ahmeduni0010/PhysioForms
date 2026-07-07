document.addEventListener('DOMContentLoaded', () => {
    // 1. Instant Session Verification
    if (localStorage.getItem('physio_logged_in') !== 'true') {
        window.location.href = '/index.html';
        return;
    }

    // Setup UI Display Elements
    const welcomeUser = document.getElementById('welcome-user');
    if (welcomeUser) {
        const storedUser = localStorage.getItem('physio_username') || 'Doctor';
        welcomeUser.textContent = `Dr. ${storedUser}`;
    }

    const logoutBtn = document.getElementById('logout-btn');
    const addPatientForm = document.getElementById('add-patient-form');
    const addPointBtn = document.getElementById('add-point-btn');
    const detailsPointsContainer = document.getElementById('details-points-container');
    const patientsGrid = document.getElementById('patients-grid');
    const patientsLoading = document.getElementById('patients-loading');
    
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editPatientForm = document.getElementById('edit-patient-form');
    const editPointsContainer = document.getElementById('edit-points-container');
    const editAddPointBtn = document.getElementById('edit-add-point-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalError = document.getElementById('modal-error');

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) {
                // Fail silently and clear local session anyway
            }
            localStorage.removeItem('physio_logged_in');
            localStorage.removeItem('physio_username');
            window.location.href = '/index.html';
        });
    }

    // Add Detail Point inputs dynamically
    if (addPointBtn) {
        addPointBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'point-input-row';
            row.innerHTML = `
                <input type="text" class="patient-detail-point" placeholder="Enter clinical note point..." required>
                <button type="button" class="btn-danger-outline remove-point-btn" style="padding:4px 10px;">X</button>
            `;
            row.querySelector('.remove-point-btn').addEventListener('click', () => row.remove());
            detailsPointsContainer.appendChild(row);
        });
    }

    // Modal Dynamic points management
    if (editAddPointBtn) {
        editAddPointBtn.addEventListener('click', () => {
            appendModalPointInput('');
        });
    }

    function appendModalPointInput(valueText = '') {
        const row = document.createElement('div');
        row.className = 'point-input-row';
        row.innerHTML = `
            <input type="text" class="edit-detail-point" value="${escapeHTML(valueText)}" placeholder="Enter clinical note point..." required>
            <button type="button" class="btn-danger-outline remove-point-btn" style="padding:4px 10px;">X</button>
        `;
        row.querySelector('.remove-point-btn').addEventListener('click', () => row.remove());
        editPointsContainer.appendChild(row);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            editModal.classList.add('hidden');
        });
    }

    // Fetch and Load Patients Directory
    async function fetchPatients() {
        try {
            const res = await fetch('/api/patients');
            if (res.status === 401) {
                localStorage.removeItem('physio_logged_in');
                window.location.href = '/index.html';
                return;
            }
            const patients = await res.json();
            renderPatients(patients);
        } catch (err) {
            patientsLoading.textContent = 'Failed to load directory files from server.';
        }
    }

    function renderPatients(patients) {
        patientsGrid.innerHTML = '';
        if (patientsLoading) patientsLoading.classList.add('hidden');

        if (patients.length === 0) {
            patientsGrid.innerHTML = '<p class="loading-text">No active patient files created yet.</p>';
            return;
        }

        patients.forEach(p => {
            const card = document.createElement('div');
            card.className = 'patient-card';
            
            let detailsHTML = '';
            if (p.details && p.details.length > 0) {
                p.details.forEach(detail => {
                    detailsHTML += `<li>${escapeHTML(detail)}</li>`;
                });
            } else {
                detailsHTML = '<li>No operational evaluation notes added.</li>';
            }

            card.innerHTML = `
                <div class="patient-info">
                    <h4>${escapeHTML(p.name)}</h4>
                    <div class="patient-age">Age: ${p.age} &bull; ID: ${String(p.id).substring(0,8)}</div>
                    <ul class="patient-details-summary">
                        ${detailsHTML}
                    </ul>
                </div>
                <div class="card-actions">
                    <button class="btn-card-primary view-form-btn">Open Evaluation Sheet</button>
                    <div class="card-button-row">
                        <button class="btn-secondary edit-patient-btn">Edit Details</button>
                        <button class="btn-danger-outline delete-patient-btn">Delete</button>
                    </div>
                </div>
            `;

            // Card Event Bindings - Using unique_token to match Supabase schema
            card.querySelector('.view-form-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `/form.html?token=${p.unique_token}&role=doctor`;
            });

            card.querySelector('.edit-patient-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(p);
            });

            card.querySelector('.delete-patient-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to permanently delete profile record for ${p.name}?`)) {
                    try {
                        const res = await fetch(`/api/patients/${p.id}`, { method: 'DELETE' });
                        if (res.ok) fetchPatients();
                    } catch (err) {
                        alert('Could not delete target entry.');
                    }
                }
            });

            patientsGrid.appendChild(card);
        });
    }

    // Submit New Patient Entry Form
    if (addPatientForm) {
        addPatientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formError.classList.add('hidden');
            formSuccess.classList.add('hidden');

            const name = document.getElementById('patient-name').value.trim();
            const age = parseInt(document.getElementById('patient-age').value);
            
            const detailInputs = document.querySelectorAll('.patient-detail-point');
            const details = [];
            detailInputs.forEach(input => {
                if (input.value.trim()) details.push(input.value.trim());
            });

            try {
                const res = await fetch('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, age, details })
                });
                const data = await res.json();

                if (res.ok) {
                    formSuccess.textContent = 'Patient record logged successfully.';
                    formSuccess.classList.remove('hidden');
                    addPatientForm.reset();
                    detailsPointsContainer.innerHTML = `
                        <div class="point-input-row">
                            <input type="text" class="patient-detail-point" placeholder="Enter clinical note point..." required>
                        </div>
                    `;
                    fetchPatients();
                } else {
                    formError.textContent = data.error || 'Failed to initialize patient file.';
                    formError.classList.remove('hidden');
                }
            } catch (err) {
                formError.textContent = 'Network offline error.';
                formError.classList.remove('hidden');
            }
        });
    }

    function openEditModal(patient) {
        modalError.classList.add('hidden');
        document.getElementById('edit-patient-id').value = patient.id;
        document.getElementById('edit-name').value = patient.name;
        document.getElementById('edit-age').value = patient.age;
        
        editPointsContainer.innerHTML = '';
        if (patient.details && patient.details.length > 0) {
            patient.details.forEach(detail => appendModalPointInput(detail));
        } else {
            appendModalPointInput('');
        }
        
        editModal.classList.remove('hidden');
    }

    if (editPatientForm) {
        editPatientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            modalError.classList.add('hidden');

            const id = document.getElementById('edit-patient-id').value;
            const name = document.getElementById('edit-name').value.trim();
            const age = parseInt(document.getElementById('edit-age').value);
            
            const detailInputs = document.querySelectorAll('.edit-detail-point');
            const details = [];
            detailInputs.forEach(input => {
                if (input.value.trim()) details.push(input.value.trim());
            });

            try {
                const res = await fetch(`/api/patients/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, age, details })
                });

                if (res.ok) {
                    editModal.classList.add('hidden');
                    fetchPatients();
                } else {
                    const data = await res.json();
                    modalError.textContent = data.error || 'Failed updating fields.';
                    modalError.classList.remove('hidden');
                }
            } catch (err) {
                modalError.textContent = 'Connection timeout error.';
                modalError.classList.remove('hidden');
            }
        });
    }

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    fetchPatients();
});
