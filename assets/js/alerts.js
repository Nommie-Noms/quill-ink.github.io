const siteAlerts = [
  {
    title: "Applications Open",
    message: "Applications are open for \nAccountants and Advertisers",
    copyLink: "https://forms.gle/pDzFazoo2Xqp1jNM8",
    linkText: "Click here to apply"
  },
  {
  title: "DoCL Wear & Tear",
  message: "Time remaining:",
  countdown: "2026-09-13T23:59:00"
},
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

      if (alert.countdown) {

        const countdown = document.createElement("div");
        countdown.className = "alert-countdown";
        countdown.dataset.target = alert.countdown;

        countdown.innerHTML = `
          <span class="countdown-days">00d</span>
          <span class="countdown-hours">00h</span>
          <span class="countdown-minutes">00m</span>
          <span class="countdown-seconds">00s</span>
      `;

        item.appendChild(countdown);
      }

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

function updateAlertCountdowns() {

  const countdowns = document.querySelectorAll(".alert-countdown");

  countdowns.forEach(function(countdown) {

    const target = new Date(countdown.dataset.target).getTime();
    const now = Date.now();
    const distance = target - now;

    if (distance <= 0) {
      countdown.innerHTML = "<span>Event Started</span>";
      return;
    }

    const days = Math.floor(
      distance / (1000 * 60 * 60 * 24)
    );

    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
    );

    const minutes = Math.floor(
      (distance % (1000 * 60 * 60)) /
      (1000 * 60)
    );

    const seconds = Math.floor(
      (distance % (1000 * 60)) / 1000
    );

    countdown.querySelector(".countdown-days").textContent =
      `${days}d`;

    countdown.querySelector(".countdown-hours").textContent =
      `${String(hours).padStart(2, "0")}h`;

    countdown.querySelector(".countdown-minutes").textContent =
      `${String(minutes).padStart(2, "0")}m`;

    countdown.querySelector(".countdown-seconds").textContent =
      `${String(seconds).padStart(2, "0")}s`;
  });
}

document.addEventListener("DOMContentLoaded", function() {

  loadAlerts();

  updateAlertCountdowns();

  setInterval(updateAlertCountdowns, 1000);

});
