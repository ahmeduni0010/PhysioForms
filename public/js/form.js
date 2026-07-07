document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const role = urlParams.get('role');

    const patientMetaDisplay = document.getElementById('patient-meta-display');
    const backToDashBtn = document.getElementById('back-to-dash-btn');
    const saveFormsBtn = document.getElementById('save-forms-btn');
    const statusNotification = document.getElementById('status-notification');
    const errorNotification = document.getElementById('error-notification');

    const tbodyHA21 = document.getElementById('tbody-ha21');
    const tbodyHA20 = document.getElementById('tbody-ha20');
    const addRowHA21Btn = document.getElementById('add-row-ha21');
    const addRowHA20Btn = document.getElementById('add-row-ha20');

    let currentPatientData = null;

    if (!token) {
        document.body.innerHTML = '<div style="text-align:center; margin-top:100px;"><h2>Error 400: Connection key missing.</h2></div>';
        return;
    }

    if (role === 'doctor') {
        backToDashBtn.classList.remove('hidden');
        backToDashBtn.addEventListener('click', () => { window.location.href = '/dashboard.html'; });
    }

    async function initFormView() {
        try {
            const res = await fetch(`/api/shared/form/${token}`);
            if (!res.ok) throw new Error('Form validation link expired.');
            currentPatientData = await res.json();
            
            patientMetaDisplay.textContent = `Patient: ${currentPatientData.name} (Age: ${currentPatientData.age})`;
            
            renderFormHA21(currentPatientData.form_ha21);
            renderFormHA20(currentPatientData.form_ha20);
        } catch (err) {
            errorNotification.textContent = err.message || 'Error syncing configuration logs.';
            errorNotification.classList.remove('hidden');
            saveFormsBtn.disabled = true;
        }
    }

    function renderFormHA21(dataArray) {
        tbodyHA21.innerHTML = '';
        if (!dataArray || dataArray.length === 0) {
            for (let i = 1; i <= 3; i++) appendNewRowHA21(i, '', '');
        } else {
            dataArray.forEach((row, index) => { appendNewRowHA21(index + 1, row.avoidance, row.dial); });
        }
    }

    function appendNewRowHA21(indexNumber, textVal = '', dialVal = '') {
        const tr = document.createElement('tr');
        tr.className = 'row-ha21-item';
        tr.innerHTML = `
            <td class="row-index" data-label="Row Number" style="text-align:center; font-weight:600;">${indexNumber}</td>
            <td data-label="Avoidance Situation / Object"><input type="text" class="input-ha21-text" value="${escapeHTML(textVal)}" placeholder="Describe object or scenario context..." required></td>
            <td data-label="Dial Intensity (1-10)"><input type="number" class="input-ha21-dial" value="${dialVal}" min="1" max="10" placeholder="1-10" required></td>
            <td data-label="Control" style="text-align:center;" class="action-column"><button type="button" class="btn-delete-row">Remove</button></td>
        `;
        
        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            reindexRowsHA21();
        });
        tbodyHA21.appendChild(tr);
    }

    function reindexRowsHA21() {
        document.querySelectorAll('.row-ha21-item').forEach((row, idx) => {
            row.querySelector('.row-index').textContent = idx + 1;
        });
    }

    addRowHA21Btn.addEventListener('click', () => {
        const nextIndex = document.querySelectorAll('.row-ha21-item').length + 1;
        appendNewRowHA21(nextIndex, '', '');
    });

    function renderFormFormRows(typeString, textString, dialString) {
        const tr = document.createElement('tr');
        tr.className = 'row-ha20-item';
        const isCue = typeString === 'Cue or trigger';
        
        tr.innerHTML = `
            <td data-label="Component Type">
                <select class="select-component-type">
                    <option value="Cue or trigger" ${isCue ? 'selected' : ''}>Cue or trigger</option>
                    <option value="Ritual" ${!isCue ? 'selected' : ''}>Ritual</option>
                </select>
            </td>
            <td data-label="Description of Difficulty Details"><input type="text" class="input-ha20-text" value="${escapeHTML(textString)}" placeholder="Detail behavioral cycle observation points..." required></td>
            <td data-label="Dial Intensity (1-10)"><input type="number" class="input-ha20-dial" value="${dialString}" min="1" max="10" placeholder="1-10" required></td>
            <td data-label="Control" style="text-align:center;" class="action-column"><button type="button" class="btn-delete-row">Remove</button></td>
        `;

        tr.querySelector('.btn-delete-row').addEventListener('click', () => { tr.remove(); });
        tbodyHA20.appendChild(tr);
    }

    function renderFormHA20(dataArray) {
        tbodyHA20.innerHTML = '';
        if (!dataArray || dataArray.length === 0) {
            renderFormFormRows('Cue or trigger', '', '');
            renderFormFormRows('Ritual', '', '');
        } else {
            dataArray.forEach(row => { renderFormFormRows(row.type, row.text, row.dial); });
        }
    }

    addRowHA20Btn.addEventListener('click', () => {
        renderFormFormRows('Cue or trigger', '', '');
        renderFormFormRows('Ritual', '', '');
    });

    saveFormsBtn.addEventListener('click', async () => {
        statusNotification.classList.add('hidden');
        errorNotification.classList.add('hidden');

        const form_ha21 = [];
        document.querySelectorAll('.row-ha21-item').forEach((row, i) => {
            const avoidance = row.querySelector('.input-ha21-text').value.trim();
            const dial = parseInt(row.querySelector('.input-ha21-dial').value);
            if (avoidance) form_ha21.push({ id: i + 1, avoidance, dial });
        });

        const form_ha20 = [];
        document.querySelectorAll('.row-ha20-item').forEach(row => {
            const type = row.querySelector('.select-component-type').value;
            const text = row.querySelector('.input-ha20-text').value.trim();
            const dial = parseInt(row.querySelector('.input-ha20-dial').value);
            if (text) form_ha20.push({ type, text, dial });
        });

        try {
            const res = await fetch(`/api/shared/form/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ form_ha21, form_ha20 })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                statusNotification.textContent = 'Form data submitted and synchronized successfully.';
                statusNotification.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(data.error || 'Failed to submit forms.');
            }
        } catch (err) {
            errorNotification.textContent = err.message;
            errorNotification.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    initFormView();
});