document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const adminSection = document.getElementById("admin-section");

  // Function to get URL parameters
  function getQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
          name: params.get("name"),
          email: params.get("email"),
          role: params.get("role"),
          token: params.get("token")
      };
  }

  // Handle login
  loginBtn.addEventListener("click", () => {
      window.location.href = "http://localhost:5001/auth/google"; // Redirect to backend login
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
      window.location.href = "index.html"; // Clears session by reloading
  });

  // Load user data from URL parameters
  const user = getQueryParams();
  if (user.name && user.email) {
      document.getElementById("user-name").textContent = user.name;
      document.getElementById("user-email").textContent = user.email;
      document.getElementById("user-role").textContent = user.role || "guest";
      
      userInfo.classList.remove("hidden"); // Show user info

      // Show admin panel only if user is an admin
      if (user.role === "admin") {
          adminSection.classList.remove("hidden");
      }
  }
});
