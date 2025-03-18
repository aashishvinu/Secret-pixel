// Initialize the tab system
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("defaultOpen").click();
});

// Tab switching functionality with animations
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

// Encode form submission with animation
document.getElementById("encodeForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitBtn = this.querySelector('button[type="submit"]');

  // Show loading state
  submitBtn.textContent = "Processing...";
  submitBtn.classList.add("processing");
  submitBtn.disabled = true;

  // Hide any previous result
  const resultDiv = document.getElementById("result");
  resultDiv.classList.remove("active");

  // Show loading spinner
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
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "encoded_image.png";
      document.body.appendChild(a);

      // Show success message
      resultDiv.textContent = "Image encoded successfully! Downloading...";
      resultDiv.classList.add("active", "success");

      // Trigger download
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
      // Reset button state
      submitBtn.textContent = "Hide";
      submitBtn.classList.remove("processing");
      submitBtn.disabled = false;
      loadingIndicator.style.display = "none";
    });
});

// Decode form submission with animation
document.getElementById("decodeForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitBtn = this.querySelector('button[type="submit"]');

  // Show loading state
  submitBtn.textContent = "Revealing...";
  submitBtn.classList.add("processing");
  submitBtn.disabled = true;

  // Hide any previous result
  const resultDiv = document.getElementById("result");
  resultDiv.classList.remove("active");

  // Show loading spinner
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
      // Display result with animation
      resultDiv.textContent = decodedMessage || "No hidden message found";
      resultDiv.classList.add("active", decodedMessage ? "success" : "notice");
    })
    .catch((error) => {
      console.error("Error:", error);
      resultDiv.textContent = "Error: " + error.message;
      resultDiv.classList.add("active", "error");
    })
    .finally(() => {
      // Reset button state
      submitBtn.textContent = "Reveal Text";
      submitBtn.classList.remove("processing");
      submitBtn.disabled = false;
      loadingIndicator.style.display = "none";
    });
});

// File input enhancement
document.querySelectorAll(".custom-file-input").forEach((input) => {
  input.addEventListener("change", function () {
    const fileName = this.files[0]?.name;
    const fileInfoSpan = this.nextElementSibling;

    if (fileName) {
      if (fileInfoSpan && fileInfoSpan.classList.contains("file-info")) {
        fileInfoSpan.textContent = fileName;
      } else {
        const span = document.createElement("span");
        span.classList.add("file-info");
        span.textContent = fileName;
        this.parentNode.insertBefore(span, this.nextSibling);
      }
    }
  });
});

// Add animated background particles
document.addEventListener("DOMContentLoaded", function () {
  createParticles();
});

function createParticles() {
  const particlesContainer = document.createElement("div");
  particlesContainer.className = "particles-container";
  particlesContainer.style.position = "fixed";
  particlesContainer.style.top = "0";
  particlesContainer.style.left = "0";
  particlesContainer.style.width = "100%";
  particlesContainer.style.height = "100%";
  particlesContainer.style.overflow = "hidden";
  particlesContainer.style.zIndex = "-1";
  document.body.prepend(particlesContainer);

  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.position = "absolute";
    particle.style.width = Math.random() * 3 + 1 + "px";
    particle.style.height = particle.style.width;
    particle.style.background = "rgba(255, 255, 255, 0.1)";
    particle.style.borderRadius = "50%";

    // Random position
    particle.style.top = Math.random() * 100 + "vh";
    particle.style.left = Math.random() * 100 + "vw";

    // Animation
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;

    particle.style.animation = `floatParticle ${duration}s linear ${delay}s infinite`;
    particlesContainer.appendChild(particle);
  }

  // Add keyframe animation to stylesheet
  const style = document.createElement("style");
  style.textContent = `
    @keyframes floatParticle {
      0% {
        transform: translateY(0) translateX(0);
        opacity: 0;
      }
      10% {
        opacity: 0.8;
      }
      90% {
        opacity: 0.8;
      }
      100% {
        transform: translateY(-100vh) translateX(${Math.random() * 50 - 25}px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
