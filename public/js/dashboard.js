document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeUser = document.getElementById('welcome-user');
    const addPatientForm = document.getElementById('add-patient-form');
    const addPointBtn = document.getElementById('add-point-btn');
    const detailsPointsContainer = document.getElementById('details-points-container');
    const patientsGrid = document.getElementById('patients-grid');
    const patientsLoading = document.getElementById('patients-loading');
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');

    // Modal UI Elements
    const editModal = document.getElementById('edit-modal');
    const editPatientForm = document.getElementById('edit-patient-form');
    const editPatientId = document.getElementById('edit-patient-id');
    const editName = document.getElementById('edit-name');
    const editAge = document.getElementById('edit-age');
    const editPointsContainer = document.getElementById('edit-points-container');
    const editAddPointBtn = document.getElementById('edit-add-point-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalError = document.getElementById('modal-error');

    let cachedPatients = [];

    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            if (!data.isAuthenticated) {
                window.location.href = '/index.html';
            } else {
                welcomeUser.textContent = `Dr. ${data.username}`;
                loadPatients();
            }
        } catch (err) {
            window.location.href = '/index.html';
        }
    }

    addPointBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'point-input-row';
        row.innerHTML = `<input type="text" class="patient-detail-point" placeholder="Enter clinical note point..." required style="width:100%; margin-top:4px;">`;
        detailsPointsContainer.appendChild(row);
    });

    editAddPointBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'point-input-row';
        row.innerHTML = `<input type="text" class="edit-detail-point" placeholder="Enter clinical note point..." required style="width:100%; margin-top:4px;">`;
        editPointsContainer.appendChild(row);
    });

    closeModalBtn.addEventListener('click', () => { editModal.classList.add('hidden'); });

    async function loadPatients() {
        try {
            const res = await fetch('/api/patients');
            if (!res.ok) throw new Error('Unauthorized');
            cachedPatients = await res.json();
            patientsLoading.classList.add('hidden');
            patientsGrid.innerHTML = '';

            if (cachedPatients.length === 0) {
                patientsGrid.innerHTML = '<p class="loading-text">No patients currently registered.</p>';
                return;
            }

            cachedPatients.forEach(patient => {
                const card = document.createElement('div');
                card.className = 'patient-card';
                
                card.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        window.location.href = `/form.html?token=${patient.unique_token}&role=doctor`;
                    }
                });

                const pointsHTML = patient.details.map(pt => `<li>${escapeHTML(pt)}</li>`).join('');

                card.innerHTML = `
                    <div class="patient-info">
                        <h4>${escapeHTML(patient.name)}</h4>
                        <div class="patient-age">Age: ${patient.age}</div>
                        <ul class="patient-details-summary">${pointsHTML || '<li>No specific notes.</li>'}</ul>
                    </div>
                    <div class="card-actions">
                        <button class="btn-card-primary btn-copy-link" data-token="${patient.unique_token}">Copy Form Link</button>
                        <div class="card-button-row">
                            <button class="btn-secondary btn-edit-patient" data-id="${patient.id}">Edit Details</button>
                            <button class="btn-danger-outline btn-delete-patient" data-id="${patient.id}">Delete Profile</button>
                        </div>
                    </div>
                `;
                patientsGrid.appendChild(card);
            });

            // Map Share Link Actions
            document.querySelectorAll('.btn-copy-link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const token = btn.getAttribute('data-token');
                    const link = `${window.location.origin}/form.html?token=${token}`;
                    navigator.clipboard.writeText(link).then(() => {
                        btn.textContent = 'Copied Link';
                        setTimeout(() => { btn.textContent = 'Copy Form Link'; }, 2000);
                    });
                });
            });

            // Map Edit UI Launch Actions
            document.querySelectorAll('.btn-edit-patient').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const target = cachedPatients.find(p => p.id == id);
                    if (target) launchEditModal(target);
                });
            });

            // Map Delete Actions
            document.querySelectorAll('.btn-delete-patient').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to permanently delete this patient record?')) {
                        try {
                            const delRes = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
                            if (delRes.ok) loadPatients();
                        } catch (err) {
                            alert('Failed to remove profile.');
                        }
                    }
                });
            });

        } catch (err) {
            patientsLoading.textContent = 'Failed to load records.';
        }
    }

    function launchEditModal(patient) {
        modalError.classList.add('hidden');
        editPatientId.value = patient.id;
        editName.value = patient.name;
        editAge.value = patient.age;
        editPointsContainer.innerHTML = '';
        
        if (patient.details.length === 0) {
            const row = document.createElement('div');
            row.className = 'point-input-row';
            row.innerHTML = `<input type="text" class="edit-detail-point" placeholder="Enter clinical note point..." required style="width:100%;">`;
            editPointsContainer.appendChild(row);
        } else {
            patient.details.forEach(pt => {
                const row = document.createElement('div');
                row.className = 'point-input-row';
                row.innerHTML = `<input type="text" class="edit-detail-point" value="${escapeHTML(pt)}" required style="width:100%;">`;
                editPointsContainer.appendChild(row);
            });
        }
        editModal.classList.remove('hidden');
    }

    editPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        modalError.classList.add('hidden');
        const id = editPatientId.value;
        const name = editName.value.trim();
        const age = editAge.value;
        const points = document.querySelectorAll('.edit-detail-point');
        const details = Array.from(points).map(el => el.value.trim()).filter(v => v !== '');

        try {
            const res = await fetch(`/api/patients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age, details })
            });
            if (res.ok) {
                editModal.classList.add('hidden');
                loadPatients();
            } else {
                const data = await res.json();
                modalError.textContent = data.error || 'Failed to update metrics.';
                modalError.classList.remove('hidden');
            }
        } catch (err) {
            modalError.textContent = 'Network communication failure.';
            modalError.classList.remove('hidden');
        }
    });

    addPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.classList.add('hidden');
        formSuccess.classList.add('hidden');

        const name = document.getElementById('patient-name').value.trim();
        const age = document.getElementById('patient-age').value;
        const pointElements = document.querySelectorAll('.patient-detail-point');
        const details = Array.from(pointElements).map(el => el.value.trim()).filter(v => v !== '');

        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age, details })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                formSuccess.textContent = 'Patient profile configured successfully.';
                formSuccess.classList.remove('hidden');
                addPatientForm.reset();
                detailsPointsContainer.innerHTML = `<div class="point-input-row"><input type="text" class="patient-detail-point" placeholder="Enter clinical note point..." required></div>`;
                loadPatients();
            } else {
                formError.textContent = data.error || 'Failed to submit registration.';
                formError.classList.remove('hidden');
            }
        } catch (err) {
            formError.textContent = 'Error syncing metrics with server.';
            formError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    });

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    checkAuth();
});