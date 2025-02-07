document.addEventListener('DOMContentLoaded', async function () {
    await loadFormFields(); // Load form fields dynamically when page loads
});

async function loadFormFields() {
    try {
        const response = await fetch('http://127.0.0.1:5000/get_form_fields'); // Fetch form fields from backend
        const fields = await response.json();

        const form = document.getElementById('dynamicForm');
        form.innerHTML = ''; // Clear previous fields

        fields.forEach(field => {
            const div = document.createElement('div');
            div.classList.add('inputbox');

            let input;
            if (field.type === 'file') {
                input = document.createElement('input');
                input.type = 'file';
                input.id = field.name;
                input.accept = 'image/*';
                input.addEventListener('change', previewImage);
            } else {
                input = document.createElement('input');
                input.type = field.type;
                input.id = field.name;
                input.required = field.required;
            }

            const label = document.createElement('span');
            label.textContent = field.name.charAt(0).toUpperCase() + field.name.slice(1);

            div.appendChild(input);
            div.appendChild(label);
            form.appendChild(div);
        });

        // Image preview container
        const previewDiv = document.createElement('div');
        previewDiv.classList.add('image-preview');
        const img = document.createElement('img');
        img.id = 'imagePreview';
        img.style.display = 'none';
        previewDiv.appendChild(img);
        form.appendChild(previewDiv);

        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('progress-container');
        progressContainer.id = 'progressContainer';
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.id = 'progressBar';
        progressContainer.appendChild(progressBar);
        form.appendChild(progressContainer);

        // Append submit button
        const submitBtn = document.createElement('input');
        submitBtn.type = 'submit';
        submitBtn.value = 'Submit';
        submitBtn.classList.add('sub');
        submitBtn.id = 'submit';
        submitBtn.addEventListener('click', submitForm);

        form.appendChild(submitBtn);
    } catch (error) {
        console.error('Error loading form fields:', error);
    }
}

// Image preview before upload
function previewImage(event) {
    const file = event.target.files[0];

    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB size limit
            alert("File is too large! Maximum size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgPreview = document.getElementById('imagePreview');
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Form submission
async function submitForm(e) {
    e.preventDefault();

    const formData = new FormData();
    const inputs = document.querySelectorAll('#dynamicForm input');

    let hasEmptyField = false;
    inputs.forEach(input => {
        if (input.required && !input.value) {
            hasEmptyField = true;
        }
        if (input.type === 'file' && input.files.length > 0) {
            if (input.files[0].size > 5 * 1024 * 1024) {
                alert("File is too large! Maximum size is 5MB.");
                return;
            }
            formData.append(input.id, input.files[0]);
        } else {
            formData.append(input.id, input.value);
        }
    });

    if (hasEmptyField) {
        alert("Please fill in all required fields.");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/submit_form', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            alert("Data stored successfully in Firestore and Google Sheets!");

            // Reset form
            document.getElementById("dynamicForm").reset();
            document.getElementById("imagePreview").src = "";
            document.getElementById("imagePreview").style.display = "none";
        } else {
            console.error("Error submitting data:", result.message);
            alert("An error occurred: " + result.message);
        }

    } catch (error) {
        console.error("Error submitting data:", error);
        alert("A network error occurred. Please try again later.");
    }
}
