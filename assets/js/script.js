'use strict';



/**
 * navbar toggle
 */

const navOpenBtn = document.querySelector("[data-nav-open-btn]");
const navbar = document.querySelector("[data-navbar]");
const navCloseBtn = document.querySelector("[data-nav-close-btn]");
const overlay = document.querySelector("[data-overlay]");

const elemArr = [navCloseBtn, overlay, navOpenBtn];

for (let i = 0; i < elemArr.length; i++) {
  elemArr[i].addEventListener("click", function () {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
  });
}

/**
 * toggle navbar & overlay when click any navbar-link
 */

const navbarLinks = document.querySelectorAll("[data-navbar-link]");

for (let i = 0; i < navbarLinks.length; i++) {
  navbarLinks[i].addEventListener("click", function () {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
  });
}

async function copyNumber(value, successMessage) {
  const text = String(value);
  const message = successMessage || (/^https?:\/\//i.test(text) ? "Link copied." : "Phone number copied.");

  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      throw new Error("Clipboard unavailable");
    }
    await navigator.clipboard.writeText(text);
    showToast(message);
    return true;
  } catch (error) {
    return fallbackCopy(text, message);
  }
}

function fallbackCopy(value, successMessage) {
  const previousFocus = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = String(value);
  textarea.readOnly = true;
  textarea.setAttribute("aria-label", "Text to copy");
  textarea.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch (error) {
    copied = false;
  } finally {
    textarea.remove();
    if (previousFocus && typeof previousFocus.focus === "function") {
      try { previousFocus.focus({ preventScroll: true }); }
      catch (error) { previousFocus.focus(); }
    }
  }

  showToast(copied ? (successMessage || "Copied.") : "Copy failed. Your browser blocked copying. Please copy manually.", !copied);
  return copied;
}

function toggleDuties(dutiesId, button) {
  const duties = document.getElementById(dutiesId);

  if (!duties) {
    console.error("Services section not found:", dutiesId);
    return;
  }

  if (duties.hidden) {
    duties.hidden = false;
    button.textContent = "Hide Services";
  } else {
    duties.hidden = true;
    button.textContent = "Services";
  }
}

function openMap() {
  const mapOverlay = document.getElementById("mapOverlay");

  if (!mapOverlay) return;

  mapOverlay.classList.add("active");

  document.body.style.overflow = "hidden";
}


function closeMap() {
  const mapOverlay = document.getElementById("mapOverlay");

  if (!mapOverlay) return;

  mapOverlay.classList.remove("active");

  document.body.style.overflow = "";
}

const mapOverlay = document.getElementById("mapOverlay");

if (mapOverlay) {
  mapOverlay.addEventListener("click", function(event) {

    if (event.target === mapOverlay) {
      closeMap();
    }

  });
}

let copyToastTimer;

function showToast(message, info = false) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  clearTimeout(copyToastTimer);
  toast.textContent = message;
  toast.className = "toast visible" + (info ? " info" : "");

  copyToastTimer = setTimeout(() => {
    toast.className = "toast";
    toast.textContent = "";
  }, info ? 6000 : 4000);
}

const alertBtn = document.getElementById("alertBtn");
const alertPopup = document.getElementById("alertPopup");
const alertClose = document.getElementById("alertClose");

if (alertBtn && alertPopup) {

  // Open / close when clicking the bell
  alertBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    alertPopup.classList.toggle("active");
  });

  // Prevent clicks inside the popup from closing it
  alertPopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Close when clicking anywhere outside
  document.addEventListener("click", () => {
    alertPopup.classList.remove("active");
  });

}

function forceReload() {
  const url = new URL(window.location.href);

  // Add a unique timestamp to bypass page cache
  url.searchParams.set("_refresh", Date.now());

  window.location.href = url.toString();
}

/**
 * header & go-top-btn active
 * when window scroll down to 400px
 */

const header = document.querySelector("[data-header]");
const goTopBtn = document.querySelector("[data-go-top]");

window.addEventListener("scroll", function () {
  if (window.scrollY >= 400) {
    header.classList.add("active");
    goTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    goTopBtn.classList.remove("active");
  }
});
