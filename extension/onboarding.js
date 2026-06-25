// onboarding.js - Onboarding Slideshow Controller

let currentSlide = 1;
const totalSlides = 4;
let apiHost = 'https://resizeimagebackgroundremover.alwaysdata.net';

document.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
  initOnboardingSlider();
  initLicensing();
});

function initSlideshow() {
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const btnFinish = document.getElementById('btn-finish');

  btnNext.addEventListener('click', () => {
    if (currentSlide < totalSlides) {
      changeSlide(currentSlide + 1);
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentSlide > 1) {
      changeSlide(currentSlide - 1);
    }
  });

  btnFinish.addEventListener('click', () => {
    // Redirect to popup.html so the user can test the popup immediately inside the browser
    window.location.href = 'popup.html';
  });
}

function changeSlide(nextSlide) {
  // Hide current slide
  document.getElementById(`slide-${currentSlide}`).classList.remove('active');
  document.getElementById(`vis-pane-${currentSlide}`).style.display = 'none';
  document.getElementById(`dot-${currentSlide}`).classList.remove('active');

  currentSlide = nextSlide;

  // Show new slide
  document.getElementById(`slide-${currentSlide}`).classList.add('active');
  document.getElementById(`vis-pane-${currentSlide}`).style.display = currentSlide === 3 ? 'grid' : 'flex';
  document.getElementById(`dot-${currentSlide}`).classList.add('active');

  // Manage Nav buttons
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const btnFinish = document.getElementById('btn-finish');

  btnPrev.style.display = currentSlide === 1 ? 'none' : 'inline-flex';
  
  if (currentSlide === totalSlides) {
    btnNext.style.display = 'none';
    btnFinish.style.display = 'inline-flex';
  } else {
    btnNext.style.display = 'inline-flex';
    btnFinish.style.display = 'none';
  }
}

// Interactive Before / After Slider on Step 2
function initOnboardingSlider() {
  const container = document.getElementById('vis-pane-2');
  const handle = document.getElementById('ob-slider-handle');
  const beforeOverlay = document.getElementById('ob-slider-before');
  let isDragging = false;

  handle.addEventListener('mousedown', () => isDragging = true);
  window.addEventListener('mouseup', () => isDragging = false);
  
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    let posX = e.clientX - rect.left;
    if (posX < 0) posX = 0;
    if (posX > rect.width) posX = rect.width;
    const percent = (posX / rect.width) * 100;
    handle.style.left = `${percent}%`;
    beforeOverlay.style.width = `${percent}%`;
  });
}

// Onboarding License Key Verification
function initLicensing() {
  const licenseInput = document.getElementById('ob-license-key');
  const btnActivate = document.getElementById('btn-ob-activate');

  btnActivate.addEventListener('click', async () => {
    const key = licenseInput.value.trim();
    if (!key) {
      alert('Please enter a license key');
      return;
    }

    btnActivate.disabled = true;
    btnActivate.textContent = 'Verifying key...';

    try {
      const response = await fetch(`${apiHost}/api/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Save locally
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ licenseKey: key, licenseData: data });
      } else {
        localStorage.setItem('licenseKey', key);
        localStorage.setItem('licenseData', JSON.stringify(data));
      }

      alert(`Congratulations! ${data.plan} plan activated.`);
      window.location.href = 'popup.html';
    } catch (err) {
      alert(`Licensing Error: ${err.message}`);
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = 'Validate Key';
    }
  });
}
