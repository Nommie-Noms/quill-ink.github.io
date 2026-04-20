function copyNumber(number) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(number)
      .then(() => showToast("Copied: " + number))
      .catch(() => fallbackCopy(number));
  } else {
    fallbackCopy(number);
  }
}

function fallbackCopy(number) {
  const textarea = document.createElement("textarea");
  textarea.value = number;
  textarea.style.position = "fixed"; // prevent scrolling
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    showToast("Copied: " + number);
  } catch {
    showToast("Copy failed");
  }

  document.body.removeChild(textarea);
}

function showToast(message) {
  alert(message);
}
