document.getElementById("submit").addEventListener('click', async function (e) {
    e.preventDefault();

    const formData = new FormData(); // Use FormData to send files
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const age = document.getElementById("age").value;
    const parish = document.getElementById("parish").value;
    const imageFile = document.getElementById("imageInput").files[0]; // Get the image file

    if (!name || !email || !phone || !age || !parish) {
        alert("Please fill in all required fields.");
        return;
    }

    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("age", age);
    formData.append("parish", parish);

    if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
            alert("File is too large! Maximum size is 5MB.");
            return;
        }
        formData.append("image", imageFile);
    }

    try {
        const response = await fetch('http://localhost:5000/submit_form', { // Adjust URL if necessary
            method: 'POST',
            body: formData // Send formData including the image
        });

        const result = await response.json();

        if (result.success) {
            console.log("Data submitted successfully!");
            alert("Data stored successfully in Firestore!");

            // Reset form and image preview
            document.getElementById("myForm").reset();
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
});

// Image preview before upload
document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large! Maximum size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const imgPreview = document.getElementById('imagePreview');
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});
