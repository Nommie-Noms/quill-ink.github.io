const siteAlerts = [
  {
    title: "Applications Open",
    message: "Applications are open for \naccountants and advertisers",
    copyLink: "https://forms.gle/pDzFazoo2Xqp1jNM8",
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

  if (!alertList) return;

  alertList.innerHTML = "";

  siteAlerts.forEach(function(alert) {
    const item = document.createElement("div");
    item.className = "alert-message";

    const title = document.createElement("strong");
    title.textContent = alert.title;

    const message = document.createElement("p");
    message.textContent = alert.message;

    item.appendChild(title);
    item.appendChild(message);

    if (alert.copyLink) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "alert-link";
      button.textContent = alert.linkText || "Copy Link";

      button.addEventListener("click", function() {
        copyNumber(alert.copyLink);
      });

      item.appendChild(button);
    }

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
