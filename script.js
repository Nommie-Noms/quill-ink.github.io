// Your Google Apps Script Web App URL
const TRACKING_URL = "https://script.google.com/macros/s/AKfycbxisHRFB_sYblcc9t7_tkY_OPsGt8ddlrOcSqIbhsiuBDYaMhjb_MYdR8Ca_UWc1YSf3Q/exec";

/**
 * Fetch a single order by number
 */
async function fetchOrder(orderNum) {
  const res = await fetch(`${TRACKING_URL}?order=${encodeURIComponent(orderNum)}`);
  if (!res.ok) throw new Error("Failed to fetch order data");
  return await res.json();
}

/**
 * Handle form submission
 */
async function checkOrder(event) {
  event.preventDefault();

  const input = document.getElementById("order").value.trim();
  const statusBox = document.getElementById("order-status");
  const resultContainer = document.getElementById("order-result");

  statusBox.innerText = "Checking...";
  resultContainer.classList.remove("hidden");

  try {
    const order = await fetchOrder(input);

    if (order.error) {
      statusBox.innerText = "❌ " + order.error;

      // Hide progress bar if error
      console.log("Progress elements found:", progressContainer, progressBar);
      const progressContainer = document.getElementById("order-progress");
      if (progressContainer) progressContainer.classList.add("hidden");

    } else {
      statusBox.innerHTML = `
        <strong>${order.order}</strong><br>
        ${order.status}
      `;

      // ✅ Progress bar logic
      const progressContainer = document.getElementById("order-progress");
      const progressBar = progressContainer ? progressContainer.querySelector(".progress-bar") : null;

      if (progressContainer && progressBar) {
        progressContainer.classList.remove("hidden");

        // Default progress
        let progress = 0;
        const statusText = order.status.toLowerCase();

        console.log("Order status text:", order.status);
// Normalize status text for easier matching

if (statusText.includes("processing")) progress = 0;
else if (statusText.includes("sourcing your order")) progress = 25;
else if (statusText.includes("collecting your order")) progress = 50;
else if (statusText.includes("enroute to the delivery location") || statusText.includes("out for delivery")) progress = 75;
else if (statusText.includes("order completed") || 
         statusText.includes("delivered to your home") || 
         statusText.includes("ready for collection")) progress = 100;


        progressBar.style.width = progress + "%";
      }
    }
  } catch (err) {
    console.error("Error fetching order:", err);
    statusBox.innerText = "Unable to check status. Please try again later.";

    // Hide progress bar if error
    const progressContainer = document.getElementById("order-progress");
    if (progressContainer) progressContainer.classList.add("hidden");
  }
}


/**
 * Attach event listener
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tracking-form");
  if (form) {
    form.addEventListener("submit", checkOrder);
    console.log("Tracking form ready ✅");
  } else {
    console.error("Tracking form not found ❌");
  }

  // Adjust service banner position
  const navbar = document.querySelector(".navbar");
  const banner = document.querySelector(".service-status-banner");
  if (navbar && banner) {
    const navHeight = navbar.offsetHeight;
    banner.style.top = navHeight + "px";
  }

  // Expandable image logic
  const expandBtn = document.getElementById("expand-btn");
  const expandImg = document.getElementById("expand-img");
  if (expandBtn && expandImg) {
    expandBtn.addEventListener("click", () => {
      const isVisible = expandImg.classList.toggle("visible");
      expandBtn.textContent = isVisible ? "Hide Image" : "View Image";
    });
  } else {
    console.error("Expand elements not found in DOM");
  }
});

/**
 * Toast + Copy Functions
 */
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 2500);
}

function copyNumber(number) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(number).then(() => {
      showToast("Copied: " + number);
    }).catch(() => {
      fallbackCopy(number);
    });
  } else {
    fallbackCopy(number);
  }
}

function fallbackCopy(number) {
  const input = document.createElement("input");
  input.value = number;
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, 99999); // for mobile devices
  try {
    document.execCommand("copy");
    showToast("Copied: " + number);
  } catch (err) {
    showToast("Failed to copy. Please copy manually.");
  }
  document.body.removeChild(input);
}

function toggleMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) {
    nav.classList.toggle("active");
  }
}

















