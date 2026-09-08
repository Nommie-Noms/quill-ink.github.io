const siteAlerts = [
  {
    title: "Applications Open",
    message: "Applications are currently being accepted.",
    link: "contact-us.html",
    linkText: "Click here to apply"
  },
  {
    title: "Welcome",
    message: "Welcome to Quill & Ink Services."
  }
];

function loadAlerts() {
  const alertList = document.getElementById("alertList");
  const alertBadge = document.getElementById("alertBadge");

  console.log("Loading alerts...");
  console.log("alertList:", alertList);
  console.log("Alerts:", siteAlerts);

  if (!alertList) {
    console.error("Could not find #alertList");
    return;
  }

  alertList.innerHTML = "";

  siteAlerts.forEach(function(alert) {
    const item = document.createElement("div");

    item.className = "alert-message";

    item.innerHTML = `
  <strong>${alert.title}</strong>
  <p>${alert.message}</p>

  ${alert.link ? `
    <a href="${alert.link}" class="alert-link">
      ${alert.linkText || "Click here"}
    </a>
  ` : ""}
`;

    alertList.appendChild(item);
  });

  if (alertBadge) {
    if (siteAlerts.length > 0) {
      alertBadge.textContent = siteAlerts.length;
      alertBadge.style.display = "flex";
    } else {
      alertBadge.style.display = "none";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadAlerts);
