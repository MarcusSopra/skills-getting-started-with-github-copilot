document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: simple HTML escape to avoid injection in inserted HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper: get initials from a name or email
  function getInitials(nameOrEmail) {
    if (!nameOrEmail) return "";
    // Use name parts, fallback to email prefix
    const parts = nameOrEmail.trim().split(/\s+/);
    if (parts.length === 1) {
      const local = parts[0].split("@")[0];
      return (local[0] || "").toUpperCase();
    }
    return ((parts[0][0] || "") + (parts[parts.length - 1][0] || "")).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so options don't duplicate on repeated fetches
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML
        const participantsHtml = (details.participants && details.participants.length > 0)
          ? details.participants.map((p) => {
              const initials = escapeHtml(getInitials(p));
              const label = escapeHtml(p);
              // Add a small remove button next to each participant. The data attributes will be used
              // by the delegated event handler to perform the unregister action.
              return `<li data-email="${label}" data-activity="${escapeHtml(name)}">
                        <span class="participant-badge">${initials}</span>
                        <span class="participant-name">${label}</span>
                        <button class="remove-participant" title="Remove participant" aria-label="Remove ${label}">×</button>
                      </li>`;
            }).join("")
          : `<li class="no-participants">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p class="description">${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <h5>Participants</h5>
            <ul class="participants-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to immediately show the newly-registered participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Attach delegated click handler for remove buttons (one handler for the container)
  activitiesList.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.remove-participant');
    if (!btn) return;

    const li = btn.closest('li');
    if (!li) return;

    const email = li.getAttribute('data-email');
    const activity = li.getAttribute('data-activity');

    if (!email || !activity) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await resp.json();
      if (resp.ok) {
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        // Show error message briefly
        messageDiv.textContent = result.detail || result.message || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 5000);
      }
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    }
  });

  // Initialize app
  fetchActivities();
});
