document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("defaultOpen").click();
});

function openType(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove("active");
  }

  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove("active");
  }

  document.getElementById(tabName).classList.add("active");
  evt.currentTarget.classList.add("active");
}

document.getElementById("encodeForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitBtn = this.querySelector('button[type="submit"]');

  submitBtn.textContent = "Processing...";
  submitBtn.classList.add("processing");
  submitBtn.disabled = true;

  const resultDiv = document.getElementById("result");
  resultDiv.classList.remove("active");

  const loadingIndicator = document.getElementById("loadingIndicator");
  loadingIndicator.style.display = "block";

  fetch("/encode", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "encoded_file";

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return response.blob().then((blob) => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);

      resultDiv.textContent = `File encoded successfully! Downloading as ${filename}...`;
      resultDiv.classList.add("active", "success");

      setTimeout(() => {
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    })
    .catch((error) => {
      console.error("Error:", error);
      resultDiv.textContent = "Error: " + error.message;
      resultDiv.classList.add("active", "error");
    })
    .finally(() => {
      submitBtn.textContent = "Hide";
      submitBtn.classList.remove("processing");
      submitBtn.disabled = false;
      loadingIndicator.style.display = "none";
    });
});

document.getElementById("decodeForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitBtn = this.querySelector('button[type="submit"]');

  submitBtn.textContent = "Revealing...";
  submitBtn.classList.add("processing");
  submitBtn.disabled = true;

  const resultDiv = document.getElementById("result");
  resultDiv.classList.remove("active");

  const loadingIndicator = document.getElementById("loadingIndicator");
  loadingIndicator.style.display = "block";

  fetch("/decode", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Decoding failed");
      }
      return response.text();
    })
    .then((decodedMessage) => {
      resultDiv.textContent = decodedMessage || "No hidden message found";
      resultDiv.classList.add("active", decodedMessage ? "success" : "notice");
    })
    .catch((error) => {
      console.error("Error:", error);
      resultDiv.textContent = "Error: " + error.message;
      resultDiv.classList.add("active", "error");
    })
    .finally(() => {
      submitBtn.textContent = "Reveal Text";
      submitBtn.classList.remove("processing");
      submitBtn.disabled = false;
      loadingIndicator.style.display = "none";
    });
});

document.querySelectorAll(".custom-file-input").forEach((input) => {
  input.addEventListener("change", function () {
    const fileName = this.files[0]?.name || "No file selected";
    const fileInfoSpan = this.nextElementSibling;

    if (
      fileInfoSpan &&
      fileInfoSpan.classList.contains("file-type-indicator")
    ) {
      fileInfoSpan.innerHTML = `<span>${fileName}</span>`;
    } else {
      const span = document.createElement("div");
      span.classList.add("file-type-indicator");
      span.innerHTML = `<span>${fileName}</span>`;
      this.parentNode.insertBefore(span, this.nextSibling);
    }
  });
});

document.getElementById("textToHide").addEventListener("input", function () {
  const textCounter = document.getElementById("textCounter");
  textCounter.textContent = this.value.length;
});
