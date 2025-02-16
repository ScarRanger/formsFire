document.addEventListener("DOMContentLoaded", async () => {
    console.log("⏳ Checking user session...");

    try {
        const response = await fetch(`/dashboard?nocache=${Date.now()}`, { credentials: "include" });
        console.log("🔍 Response Status:", response.status);

        if (!response.ok) {
            console.warn("❌ Session missing. Redirecting to login.");
            return window.location.href = "/"; // Redirect if session is missing
        }

        const user = await response.json();
        console.log("✅ User session loaded:", user);

        if (!user || !user.email) {
            console.warn("❌ Invalid session data. Redirecting to login.");
            return window.location.href = "/";
        }

        document.getElementById("user-name").textContent = user.name;
        document.getElementById("user-email").textContent = user.email;
        document.getElementById("user-role").textContent = user.role;

        document.getElementById("user-info").classList.remove("hidden");

        document.querySelectorAll(".role-section").forEach(section => section.classList.add("hidden"));
        document.getElementById(`${user.role}-section`)?.classList.remove("hidden");

    } catch (error) {
        console.error("❌ Error loading dashboard:", error);
        window.location.href = "/";
    }
});
