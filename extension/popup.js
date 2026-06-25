// popup.js - Premium Image Editor Core Logic

// 1. STATE & SYSTEM CONFIG
let currentPlan = 'Free';
let activeLicense = null;
let apiHost = 'https://resizeimagebackgroundremover.alwaysdata.net';
let recentEdits = [];

// Image Files Cache
let resizeFile = null;
let removeBgFile = null;
let changeBgSubject = null;
let changeBgTemplate = null;
let aiGeneratedBg = null;
let batchFiles = [];
let batchProcessedZipData = null;

// Preset Background Templates (Color Gradients / Designs)
const bgTemplates = [
  { id: 'marble', name: 'Luxury Marble', gStart: '#f3f4f6', gEnd: '#d1d5db', type: 'pattern' },
  { id: 'dark-studio', name: 'Dark Studio', gStart: '#1e293b', gEnd: '#0f172a', type: 'gradient' },
  { id: 'cozy-wood', name: 'Rustic Store', gStart: '#78350f', gEnd: '#451a03', type: 'gradient' },
  { id: 'neon-tech', name: 'Tech Neon', gStart: '#0c0a09', gEnd: '#1e1b4b', type: 'pattern' },
  { id: 'gold-lux', name: 'Luxury Gold', gStart: '#fef08a', gEnd: '#ca8a04', type: 'gradient' },
  { id: 'nature-leaf', name: 'Sunlit Forest', gStart: '#ecfdf5', gEnd: '#a7f3d0', type: 'gradient' },
  { id: 'minimal-white', name: 'Clean White', gStart: '#ffffff', gEnd: '#e2e8f0', type: 'gradient' },
  { id: 'soft-pink', name: 'Cosmetic Pink', gStart: '#fdf2f8', gEnd: '#fbcfe8', type: 'gradient' }
];

// Initialize Extension Popup
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initLicenseSystem();
  initResizePanel();
  initRemoveBgPanel();
  initReplaceBgPanel();
  initAIStudioPanel();
  initBatchPanel();
  loadRecentEdits();
  initFullscreenMode();
});

// 2. NAVIGATION SYSTEM
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.content-panel');
  const screenTitle = document.getElementById('current-screen-title');
  const screenSubtitle = document.getElementById('current-screen-subtitle');

  const headers = {
    'panel-dashboard': { title: 'Dashboard Overview', sub: 'Your subscription status and local activity stats' },
    'panel-resize': { title: 'Image Resizer', sub: 'Drag and drop to resize and convert dimensions' },
    'panel-remove-bg': { title: 'Smart Background Remover', sub: 'Isolate subject layers with AI segmentation' },
    'panel-change-bg': { title: 'Background Replacer', sub: 'Place isolated subjects in studio templates' },
    'panel-ai-studio': { title: 'AI Background Studio', sub: 'Describe and generate personalized backdrops' },
    'panel-batch': { title: 'Batch Queue Processor', sub: 'Upload up to 100 images for automated processing' },
    'panel-account': { title: 'Licensing & Activation', sub: 'Connect keys to unlock premium SaaS features' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-target');
      
      // Update sidebar active state
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update panel visibility
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(targetPanel).classList.add('active');

      // Update header titles
      const meta = headers[targetPanel];
      if (meta) {
        screenTitle.textContent = meta.title;
        screenSubtitle.textContent = meta.sub;
      }
    });
  });

  // Upgrade button on dashboard redirects to external pricing website
  document.getElementById('dash-upgrade-btn').addEventListener('click', () => {
    window.open('http://resizeimagebackgroundremover.local/#pricing', '_blank');
  });
}

// 3. LICENSING & SUBSCRIPTION SYSTEM
function initLicenseSystem() {
  const licenseKeyInput = document.getElementById('license-key-input');
  const licenseHostInput = document.getElementById('license-host-input');
  const btnActivate = document.getElementById('btn-license-activate');
  const infoCard = document.getElementById('license-info-card');
  const ownerEl = document.getElementById('lic-owner');
  const emailEl = document.getElementById('lic-email');
  const planEl = document.getElementById('lic-plan');
  const expiresEl = document.getElementById('lic-expires');

  // Check stored license key on load
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['licenseKey', 'licenseHost'], (result) => {
      if (result.licenseKey) {
        licenseKeyInput.value = result.licenseKey;
        if (result.licenseHost) {
          apiHost = result.licenseHost;
          licenseHostInput.value = result.licenseHost;
        }
        verifyKeyOnline(result.licenseKey);
      }
    });
  }

  btnActivate.addEventListener('click', () => {
    const key = licenseKeyInput.value.trim();
    const host = licenseHostInput.value.trim();
    if (!key) {
      alert('Please enter a license key');
      return;
    }
    if (host) {
      apiHost = host;
    }
    verifyKeyOnline(key);
  });

  async function verifyKeyOnline(key) {
    btnActivate.disabled = true;
    btnActivate.textContent = 'Verifying license online...';
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

      // Success
      currentPlan = data.plan;
      activeLicense = data;
      
      // Save locally
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ licenseKey: key, licenseData: data, licenseHost: apiHost });
      }

      updateUIForPlan();
      
      // Update Account Card info
      ownerEl.textContent = data.name;
      emailEl.textContent = data.email;
      planEl.textContent = data.plan;
      expiresEl.textContent = data.expiresAt ? data.expiresAt : 'Never (Lifetime)';
      infoCard.style.display = 'block';

      alert(`Success! ${data.plan} license key activated.`);
    } catch (err) {
      console.error(err);
      alert(`Licensing Error: ${err.message}. Defaulting to Free plan.`);
      currentPlan = 'Free';
      activeLicense = null;
      updateUIForPlan();
      infoCard.style.display = 'none';
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = 'Verify and Activate Key';
    }
  }
}

function updateUIForPlan() {
  const badge = document.getElementById('status-plan-badge');
  const dashPlanName = document.getElementById('dash-plan-name');
  const dashUpgradeBtn = document.getElementById('dash-upgrade-btn');
  const dashExpiry = document.getElementById('dash-plan-expiry');

  badge.className = 'badge-plan ' + currentPlan.toLowerCase();
  badge.textContent = `${currentPlan} Plan`;
  dashPlanName.textContent = currentPlan;

  // Manage locks overlays
  const lockRm = document.getElementById('lock-remove-bg');
  const lockChange = document.getElementById('lock-change-bg');
  const lockAI = document.getElementById('lock-ai-studio');
  const lockBatch = document.getElementById('lock-batch');

  if (currentPlan === 'Free') {
    lockRm.style.display = 'flex';
    lockChange.style.display = 'flex';
    lockAI.style.display = 'flex';
    lockBatch.style.display = 'flex';
    dashUpgradeBtn.style.display = 'block';
    dashExpiry.textContent = 'Unlimited resize access. Upgrade to unlock background remover.';
  } else if (currentPlan === 'Premium') {
    lockRm.style.display = 'none';
    lockChange.style.display = 'none';
    lockAI.style.display = 'flex';
    lockBatch.style.display = 'flex';
    dashUpgradeBtn.style.display = 'block';
    dashExpiry.textContent = 'Premium active: unlimited background removal and templates.';
  } else if (currentPlan === 'Ultimate') {
    lockRm.style.display = 'none';
    lockChange.style.display = 'none';
    lockAI.style.display = 'none';
    lockBatch.style.display = 'none';
    dashUpgradeBtn.style.display = 'none';
    dashExpiry.textContent = 'Ultimate plan active: all AI studio & batch functions unlocked.';
  }
}

// 4. IMAGE RESIZING FEATURE (Free)
function initResizePanel() {
  const dropzone = document.getElementById('resize-dropzone');
  const fileInput = document.getElementById('resize-file-input');
  const presetSelect = document.getElementById('resize-preset-select');
  const customDims = document.getElementById('resize-custom-dims');
  const widthInput = document.getElementById('resize-width');
  const heightInput = document.getElementById('resize-height');
  const formatSelect = document.getElementById('resize-format-select');
  const qualityInput = document.getElementById('resize-quality');
  const qualityVal = document.getElementById('resize-quality-val');
  const btnProcess = document.getElementById('btn-resize-process');
  const previewBox = document.getElementById('resize-preview-box');
  const previewImg = document.getElementById('resize-preview-img');
  const emptyPreview = document.getElementById('resize-empty-preview');

  // Trigger File Input Click
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag and Drop triggers
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      loadResizeImage(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadResizeImage(e.target.files[0]);
    }
  });

  // Preset size selectors
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (val === 'custom') {
      customDims.style.display = 'block';
    } else {
      customDims.style.display = 'none';
      const [w, h] = getPresetDimensions(val);
      widthInput.value = w;
      heightInput.value = h;
    }
  });

  qualityInput.addEventListener('input', () => {
    qualityVal.textContent = `${qualityInput.value}%`;
  });

  function loadResizeImage(file) {
    resizeFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewBox.style.display = 'block';
      emptyPreview.style.display = 'none';
      
      // Auto-populate dimensions from image
      const img = new Image();
      img.onload = () => {
        if (presetSelect.value === 'custom') {
          widthInput.value = img.width;
          heightInput.value = img.height;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  btnProcess.addEventListener('click', () => {
    if (!resizeFile) {
      alert('Please upload an image first');
      return;
    }

    const w = parseInt(widthInput.value) || 800;
    const h = parseInt(heightInput.value) || 800;
    const format = formatSelect.value;
    const q = parseFloat(qualityInput.value) / 100;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      
      const mime = format;
      const extension = format.split('/')[1] || 'png';
      const dataUrl = canvas.toDataURL(mime, q);

      triggerDownload(dataUrl, `resized-${w}x${h}.${extension}`);
      saveEditsHistory('Resize', `Resized to ${w}x${h}`, dataUrl);
    };
    img.src = previewImg.src;
  });
}

function getPresetDimensions(preset) {
  switch (preset) {
    case 'instagram-post': return [1080, 1080];
    case 'instagram-story': return [1080, 1920];
    case 'facebook-cover': return [851, 315];
    case 'linkedin-banner': return [1584, 396];
    case 'marketplace': return [800, 800];
    case 'website-banner': return [1920, 1080];
    default: return [800, 800];
  }
}

// 5. BACKGROUND REMOVAL FEATURE (Premium)
function initRemoveBgPanel() {
  const dropzone = document.getElementById('rm-dropzone');
  const fileInput = document.getElementById('rm-file-input');
  const btnProcess = document.getElementById('btn-rm-process');
  const btnDownload = document.getElementById('btn-rm-download');
  const previewBox = document.getElementById('rm-preview-box');
  const imgBefore = document.getElementById('rm-img-before');
  const imgAfter = document.getElementById('rm-img-after');
  const emptyPreview = document.getElementById('rm-empty-preview');
  const successBanner = document.getElementById('rm-success-banner');

  // Slider comparison interaction
  const sliderHandle = document.getElementById('rm-slider-handle');
  const sliderBefore = document.getElementById('rm-slider-before');
  let isDraggingSlider = false;

  sliderHandle.addEventListener('mousedown', () => isDraggingSlider = true);
  window.addEventListener('mouseup', () => isDraggingSlider = false);
  window.addEventListener('mousemove', (e) => {
    if (!isDraggingSlider) return;
    const rect = previewBox.getBoundingClientRect();
    let posX = e.clientX - rect.left;
    if (posX < 0) posX = 0;
    if (posX > rect.width) posX = rect.width;
    const percent = (posX / rect.width) * 100;
    sliderHandle.style.left = `${percent}%`;
    sliderBefore.style.width = `${percent}%`;
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      loadRemoveBgImage(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadRemoveBgImage(e.target.files[0]);
    }
  });

  function loadRemoveBgImage(file) {
    removeBgFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imgBefore.src = e.target.result;
      imgAfter.src = e.target.result;
      previewBox.style.display = 'block';
      emptyPreview.style.display = 'none';
      btnDownload.style.display = 'none';
      successBanner.style.display = 'none';
      btnProcess.style.display = 'block';
      
      // Reset slider to center
      sliderHandle.style.left = '50%';
      sliderBefore.style.width = '50%';
    };
    reader.readAsDataURL(file);
  }

  btnProcess.addEventListener('click', () => {
    if (!removeBgFile) {
      alert('Please upload an image first');
      return;
    }

    btnProcess.disabled = true;
    btnProcess.textContent = 'Removing background...';

    // Simulate smart AI object separation
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Client-side canvas segmenting simulation (extract foreground by analyzing pixels)
        // For visual demonstration, we draw a premium cutout. If background is solid/light, key it out.
        // We will perform a simple threshold filter or chroma-keying of background pixels.
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample corner pixel as the background color reference
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          // Compute color distance
          const distance = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );

          // If close to corner background pixel, make transparent
          if (distance < 120) {
            data[i+3] = 0; // Alpha
          }
        }
        ctx.putImageData(imgData, 0, 0);
        
        const outputDataUrl = canvas.toDataURL('image/png');
        imgAfter.src = outputDataUrl;

        btnProcess.style.display = 'none';
        btnDownload.style.display = 'block';
        successBanner.style.display = 'flex';
        
        // Push transparent cutout to Replace Background subject automatically
        changeBgSubject = outputDataUrl;

        saveEditsHistory('BG Remove', 'Isolated subject Layer', outputDataUrl);
      };
      img.src = imgBefore.src;

      btnProcess.disabled = false;
      btnProcess.textContent = 'Remove Background';
    }, 1800);
  });

  btnDownload.addEventListener('click', () => {
    triggerDownload(imgAfter.src, 'isolated-subject.png');
  });
}

// 6. REPLACE BACKGROUND FEATURE (Premium)
function initReplaceBgPanel() {
  const dropzone = document.getElementById('bg-dropzone');
  const fileInput = document.getElementById('bg-file-input');
  const presetGrid = document.getElementById('bg-preset-grid');
  const previewBox = document.getElementById('bg-preview-box');
  const emptyPreview = document.getElementById('bg-empty-preview');
  const btnDownload = document.getElementById('btn-bg-download');

  // Adjustments
  const brightRange = document.getElementById('bg-brightness');
  const brightVal = document.getElementById('bg-brightness-val');
  const contrastRange = document.getElementById('bg-contrast');
  const contrastVal = document.getElementById('bg-contrast-val');
  const blurRange = document.getElementById('bg-blur');
  const blurVal = document.getElementById('bg-blur-val');

  // Render backdrops library
  bgTemplates.forEach((tpl) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.setAttribute('data-id', tpl.id);
    
    // Create preview background using CSS gradients
    item.style.background = `linear-gradient(135deg, ${tpl.gStart}, ${tpl.gEnd})`;
    
    const label = document.createElement('div');
    label.className = 'preset-label';
    label.textContent = tpl.name;
    
    item.appendChild(label);
    presetGrid.appendChild(item);

    item.addEventListener('click', () => {
      document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      changeBgTemplate = tpl;
      renderComposite();
    });
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadSubjectImage(e.target.files[0]);
    }
  });

  function loadSubjectImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      changeBgSubject = e.target.result;
      previewBox.style.display = 'block';
      emptyPreview.style.display = 'none';
      renderComposite();
    };
    reader.readAsDataURL(file);
  }

  // Handle Adjustment Sliders
  brightRange.addEventListener('input', () => {
    brightVal.textContent = brightRange.value;
    renderComposite();
  });
  contrastRange.addEventListener('input', () => {
    contrastVal.textContent = contrastRange.value;
    renderComposite();
  });
  blurRange.addEventListener('input', () => {
    blurVal.textContent = `${blurRange.value}px`;
    renderComposite();
  });

  function renderComposite() {
    if (!changeBgSubject) return;

    previewBox.style.display = 'block';
    emptyPreview.style.display = 'none';

    const canvas = document.getElementById('bg-composite-canvas');
    const ctx = canvas.getContext('2d');
    
    const subImg = new Image();
    subImg.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background template
      ctx.save();
      if (blurRange.value > 0) {
        ctx.filter = `blur(${blurRange.value}px)`;
      }
      
      const tpl = changeBgTemplate || bgTemplates[0];
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, tpl.gStart);
      gradient.addColorStop(1, tpl.gEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw simulated marble texture details if marble selected
      if (tpl.id === 'marble') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 100);
        ctx.bezierCurveTo(200, 300, 400, 100, 600, 400);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(100, 0);
        ctx.bezierCurveTo(300, 400, 150, 500, 500, 600);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw Subject Image (applying Brightness and Contrast adjustments)
      ctx.save();
      ctx.filter = `brightness(${brightRange.value}%) contrast(${contrastRange.value}%)`;
      
      // Fit subject cleanly inside composite frame
      const maxDim = 400; // center focus
      let w = subImg.width;
      let h = subImg.height;
      
      if (w > h) {
        h = (maxDim / w) * h;
        w = maxDim;
      } else {
        w = (maxDim / h) * w;
        h = maxDim;
      }
      
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2 + 50; // shift down slightly
      
      // Draw subtle shadow behind the subject product
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      ctx.drawImage(subImg, x, y, w, h);
      ctx.restore();
    };
    subImg.src = changeBgSubject;
  }

  btnDownload.addEventListener('click', () => {
    const canvas = document.getElementById('bg-composite-canvas');
    if (!changeBgSubject) {
      alert('Please upload a transparent subject first');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    triggerDownload(dataUrl, 'studio-placement.png');
    saveEditsHistory('BG Replace', 'Created studio composite', dataUrl);
  });
}

// 7. AI STUDIO PANEL (Ultimate)
function initAIStudioPanel() {
  const categorySelect = document.getElementById('ai-category-select');
  const promptInput = document.getElementById('ai-prompt-input');
  const resSelect = document.getElementById('ai-res-select');
  const btnGenerate = document.getElementById('btn-ai-generate');
  const spinner = document.getElementById('ai-spinner');
  const previewBox = document.getElementById('ai-preview-box');
  const previewImg = document.getElementById('ai-preview-img');
  const emptyPreview = document.getElementById('ai-empty-preview');

  // Trigger prompt changes on style selects
  categorySelect.addEventListener('change', () => {
    const cat = categorySelect.value;
    let basePrompt = '';
    if (cat === 'minimalist') {
      basePrompt = 'A minimalist product podium on a soft pastel background, professional studio lighting, 3d render, award winning setup';
    } else if (cat === 'office') {
      basePrompt = 'A modern corporate office room desk with glass panels, warm volumetric sunlight pouring in, blurred background, high realism';
    } else if (cat === 'luxury') {
      basePrompt = 'An elegant black marble display stand with golden geometric structures, premium lux vibe, photo studio setup';
    } else if (cat === 'nature') {
      basePrompt = 'A wooden slice board resting on lush green moss, forest trees bokeh in background, morning mist, ray of golden light';
    } else if (cat === 'store') {
      basePrompt = 'A wooden rustic boutique store shelf, vintage boutique setting, warm spotlight accents';
    } else if (cat === 'technology') {
      basePrompt = 'A glowing cyberpunk holographic computer stand, neon laser lights, cyber tech grid, dark room';
    }
    promptInput.value = basePrompt;
  });
  categorySelect.dispatchEvent(new Event('change'));

  btnGenerate.addEventListener('click', () => {
    btnGenerate.disabled = true;
    spinner.style.display = 'inline-block';
    
    // Simulate Stable Diffusion HD generation time
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      const style = categorySelect.value;
      const grad = ctx.createRadialGradient(400, 400, 50, 400, 400, 600);
      
      // Draw a procedural AI-style generated backdrop
      if (style === 'minimalist') {
        grad.addColorStop(0, '#fef3c7'); // amber soft
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,800,800);
        // Draw podium shape
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(400, 550, 200, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'luxury') {
        grad.addColorStop(0, '#4b5563'); // marble dark
        grad.addColorStop(1, '#111827');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,800,800);
        // Draw gold stripes
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(100,100,600,600);
      } else if (style === 'technology') {
        grad.addColorStop(0, '#311042'); // neon purple
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,800,800);
        // Neon lines
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        for (let i = 0; i < 800; i += 40) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 800); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
        }
      } else {
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,800,800);
      }

      const url = canvas.toDataURL('image/jpeg');
      previewImg.src = url;
      previewBox.style.display = 'block';
      emptyPreview.style.display = 'none';

      btnGenerate.disabled = false;
      spinner.style.display = 'none';

      saveEditsHistory('AI Gen', 'AI Background Generation', url);
      triggerDownload(url, 'ai-generated-studio.jpg');
    }, 2500);
  });
}

// 8. BATCH PROCESSING PANEL (Ultimate)
function initBatchPanel() {
  const dropzone = document.getElementById('batch-dropzone');
  const fileInput = document.getElementById('batch-file-input');
  const countLabel = document.getElementById('batch-count-label');
  const operationSelect = document.getElementById('batch-operation-select');
  const btnProcess = document.getElementById('btn-batch-process');
  
  const emptyPreview = document.getElementById('batch-empty-preview');
  const progressBox = document.getElementById('batch-progress-box');
  const progressBar = document.getElementById('batch-progress-bar');
  const progressStatus = document.getElementById('batch-progress-status');
  const resultList = document.getElementById('batch-result-list');
  const btnDownloadZip = document.getElementById('btn-batch-download-zip');

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      batchFiles = Array.from(e.target.files);
      countLabel.textContent = `${batchFiles.length} files selected`;
      btnProcess.disabled = false;
      emptyPreview.style.display = 'block';
      progressBox.style.display = 'none';
      btnDownloadZip.style.display = 'none';
    }
  });

  btnProcess.addEventListener('click', () => {
    if (batchFiles.length === 0) return;

    btnProcess.disabled = true;
    emptyPreview.style.display = 'none';
    progressBox.style.display = 'block';
    resultList.innerHTML = '';
    btnDownloadZip.style.display = 'none';

    progressBar.style.width = '0%';
    progressStatus.textContent = `0% (0 of ${batchFiles.length} files)`;

    const zip = new MiniZip();
    let index = 0;

    function processNext() {
      if (index >= batchFiles.length) {
        // Complete! Create zip
        const zipBuffer = zip.generate();
        batchProcessedZipData = new Blob([zipBuffer], { type: 'application/zip' });
        btnDownloadZip.style.display = 'block';
        btnProcess.disabled = false;
        return;
      }

      const file = batchFiles[index];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 800;
          const ctx = canvas.getContext('2d');

          // Action selection
          if (operationSelect.value === 'resize') {
            ctx.drawImage(img, 0, 0, 800, 800);
          } else {
            // Remove bg simulation + resize
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0,0,800,800); // Draw white bg or transparent
            ctx.drawImage(img, 100, 100, 600, 600);
          }

          // Extract arrayBuffer from canvas base64 to build raw uncompressed zip archive
          const base64 = canvas.toDataURL('image/png').split(',')[1];
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }

          zip.addFile(`processed-${file.name.replace(/\.[^/.]+$/, "")}.png`, array.buffer);

          // Update Progress
          index++;
          const percent = Math.round((index / batchFiles.length) * 100);
          progressBar.style.width = `${percent}%`;
          progressStatus.textContent = `${percent}% (${index} of ${batchFiles.length} files)`;

          const statusItem = document.createElement('div');
          statusItem.style.fontSize = '10px';
          statusItem.style.color = '#a7f3d0';
          statusItem.style.padding = '4px 0';
          statusItem.textContent = `✓ Processed: ${file.name}`;
          resultList.appendChild(statusItem);

          setTimeout(processNext, 200); // Small interval for visual smooth loading
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    processNext();
  });

  btnDownloadZip.addEventListener('click', () => {
    if (!batchProcessedZipData) return;
    const url = URL.createObjectURL(batchProcessedZipData);
    triggerDownload(url, 'batch-processed-images.zip');
    saveEditsHistory('Batch ZIP', `Compiled ${batchFiles.length} images`, '');
  });
}

// 9. RECENT ACTIVITY LISTENER
function loadRecentEdits() {
  const container = document.getElementById('dash-recent-list');
  if (recentEdits.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="font-size: 11px; color: var(--color-text-secondary); margin: auto; padding: 20px;">
        No images processed in this session yet.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  recentEdits.slice().reverse().forEach((item) => {
    const el = document.createElement('div');
    el.className = 'edit-item';
    
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';

    if (item.dataUrl) {
      const img = document.createElement('img');
      img.className = 'edit-thumb';
      img.src = item.dataUrl;
      left.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'edit-thumb';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.innerHTML = '📁';
      left.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="font-size:12px; font-weight:600;">${item.action}</div>
      <div style="font-size:10px; color:var(--color-text-secondary);">${item.desc}</div>
    `;
    left.appendChild(info);

    el.appendChild(left);
    container.appendChild(el);
  });
}

function saveEditsHistory(action, desc, dataUrl) {
  recentEdits.push({ action, desc, dataUrl });
  if (recentEdits.length > 5) recentEdits.shift();
  loadRecentEdits();
}

// Helper to trigger direct downloads
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 10. LIGHTWEIGHT ZERO-DEPENDENCY ZIP COMPILER (MINIZIP)
class MiniZip {
  constructor() {
    this.files = [];
  }

  addFile(filename, arrayBuffer) {
    this.files.push({
      name: filename,
      data: new Uint8Array(arrayBuffer)
    });
  }

  generate() {
    // Basic uncompressed zip construction (CRC32 and headers)
    let totalLength = 0;
    const filesMeta = this.files.map(file => {
      const nameBytes = new TextEncoder().encode(file.name);
      const fileLength = file.data.length;
      
      // Calculate CRC32 of file data
      const crc = this.calculateCRC32(file.data);

      return {
        name: file.name,
        nameBytes,
        data: file.data,
        length: fileLength,
        crc: crc
      };
    });

    // 1. Calculate central directory offsets
    let currentOffset = 0;
    const localHeaders = [];
    const centralDirectoryHeaders = [];

    filesMeta.forEach(meta => {
      // Create local file header
      const localHeader = this.createLocalHeader(meta);
      localHeaders.push(localHeader);
      localHeaders.push(meta.data);

      // Create central directory header
      const cdHeader = this.createCentralDirectoryHeader(meta, currentOffset);
      centralDirectoryHeaders.push(cdHeader);

      currentOffset += localHeader.length + meta.length;
    });

    const centralDirOffset = currentOffset;
    let centralDirLength = 0;
    centralDirectoryHeaders.forEach(h => centralDirLength += h.length);

    // End of central directory record
    const eocd = this.createEOCD(filesMeta.length, centralDirLength, centralDirOffset);

    // Assemble final buffer
    const finalBufferLength = centralDirOffset + centralDirLength + eocd.length;
    const output = new Uint8Array(finalBufferLength);

    let writePos = 0;
    localHeaders.forEach(chunk => {
      output.set(chunk, writePos);
      writePos += chunk.length;
    });

    centralDirectoryHeaders.forEach(chunk => {
      output.set(chunk, writePos);
      writePos += chunk.length;
    });

    output.set(eocd, writePos);

    return output.buffer;
  }

  createLocalHeader(meta) {
    const header = new Uint8Array(30 + meta.nameBytes.length);
    // Signature: 0x04034b50
    header.set([0x50, 0x4b, 0x03, 0x04], 0);
    // Version needed to extract: 10 (1.0)
    header.set([10, 0], 4);
    // General purpose bit flag: 0
    header.set([0, 0], 6);
    // Compression method: 0 (Uncompressed)
    header.set([0, 0], 8);
    // Last mod file time / date: 0
    header.set([0, 0, 0, 0], 10);
    // CRC-32
    this.writeUint32(header, 14, meta.crc);
    // Compressed size
    this.writeUint32(header, 18, meta.length);
    // Uncompressed size
    this.writeUint32(header, 22, meta.length);
    // File name length
    header[26] = meta.nameBytes.length & 0xff;
    header[27] = (meta.nameBytes.length >> 8) & 0xff;
    // Extra field length: 0
    header[28] = 0;
    header[29] = 0;
    // File name
    header.set(meta.nameBytes, 30);
    return header;
  }

  createCentralDirectoryHeader(meta, localHeaderOffset) {
    const header = new Uint8Array(46 + meta.nameBytes.length);
    // Signature: 0x02014b50
    header.set([0x50, 0x4b, 0x01, 0x02], 0);
    // Version made by: 10
    header.set([10, 0], 4);
    // Version needed: 10
    header.set([10, 0], 6);
    // General flag
    header.set([0, 0], 8);
    // Compression method: 0
    header.set([0, 0], 10);
    // Time/date
    header.set([0, 0, 0, 0], 12);
    // CRC-32
    this.writeUint32(header, 16, meta.crc);
    // Compressed size
    this.writeUint32(header, 20, meta.length);
    // Uncompressed size
    this.writeUint32(header, 24, meta.length);
    // File name length
    header[28] = meta.nameBytes.length & 0xff;
    header[29] = (meta.nameBytes.length >> 8) & 0xff;
    // Extra field / comment lengths: 0
    header.set([0, 0, 0, 0, 0, 0], 30);
    // Disk number start: 0
    header.set([0, 0], 34);
    // Internal file attributes: 0
    header.set([0, 0], 36);
    // External file attributes: 0
    header.set([0, 0, 0, 0], 38);
    // Local header offset
    this.writeUint32(header, 42, localHeaderOffset);
    // File name
    header.set(meta.nameBytes, 46);
    return header;
  }

  createEOCD(fileCount, centralDirectoryLength, centralDirectoryOffset) {
    const eocd = new Uint8Array(22);
    // Signature: 0x06054b50
    eocd.set([0x50, 0x4b, 0x05, 0x06], 0);
    // Number of this disk: 0
    eocd.set([0, 0], 4);
    // Disk where central directory starts: 0
    eocd.set([0, 0], 6);
    // Number of central directory records on this disk
    eocd[8] = fileCount & 0xff;
    eocd[9] = (fileCount >> 8) & 0xff;
    // Total number of central directory records
    eocd[10] = fileCount & 0xff;
    eocd[11] = (fileCount >> 8) & 0xff;
    // Size of central directory (bytes)
    this.writeUint32(eocd, 12, centralDirectoryLength);
    // Offset of start of central directory, relative to start of archive
    this.writeUint32(eocd, 16, centralDirectoryOffset);
    // Comment length: 0
    eocd[20] = 0;
    eocd[21] = 0;
    return eocd;
  }

  writeUint32(arr, offset, val) {
    arr[offset] = val & 0xff;
    arr[offset + 1] = (val >> 8) & 0xff;
    arr[offset + 2] = (val >> 16) & 0xff;
    arr[offset + 3] = (val >> 24) & 0xff;
  }

  calculateCRC32(data) {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    let crc = 0 ^ -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  }
}

// 11. FULLSCREEN / TAB MODE
function initFullscreenMode() {
  const btnMaximize = document.getElementById('btn-maximize');
  
  if (btnMaximize) {
    btnMaximize.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL('extension/popup.html?mode=tab') });
      } else {
        window.open('popup.html?mode=tab', '_blank');
      }
    });
  }

  // Parse location parameters to see if we are in tab mode
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'tab' || window.innerWidth > 800) {
    document.body.classList.add('mode-tab');
    if (btnMaximize) {
      btnMaximize.style.display = 'none';
    }
  }
}
