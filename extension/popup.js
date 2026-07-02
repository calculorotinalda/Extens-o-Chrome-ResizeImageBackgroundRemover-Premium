// popup.js - Premium Image Editor Core Logic

// 1. STATE & SYSTEM CONFIG
let currentPlan = 'Free';
let activeLicense = null;
let apiHost = 'https://resizeimagebackgroundremover.alwaysdata.net';
let recentEdits = [];
let geminiApiKey = '';

// Image Files Cache
let resizeFile = null;
let convertFile = null;
let convertedDataUrl = null;
let removeBgFile = null;
let changeBgSubject = null;
let changeBgTemplate = null;
let changeBgCustomTemplateImage = null; // Custom uploaded background image
let aiGeneratedBg = null;
let batchFiles = [];
let batchProcessedZipData = null;

// Preset Background Templates (Curated Royalty-Free Premium Unsplash Images)
const bgTemplates = [
  { id: 'marble', name: 'Luxury Marble', imgUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&auto=format&fit=crop', gStart: '#f3f4f6', gEnd: '#d1d5db', type: 'pattern' },
  { id: 'dark-studio', name: 'Dark Studio', imgUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop', gStart: '#1e293b', gEnd: '#0f172a', type: 'gradient' },
  { id: 'cozy-wood', name: 'Rustic Store', imgUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&auto=format&fit=crop', gStart: '#78350f', gEnd: '#451a03', type: 'gradient' },
  { id: 'neon-tech', name: 'Tech Neon', imgUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop', gStart: '#0c0a09', gEnd: '#1e1b4b', type: 'pattern' },
  { id: 'gold-lux', name: 'Luxury Gold', imgUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop', gStart: '#fef08a', gEnd: '#ca8a04', type: 'gradient' },
  { id: 'nature-leaf', name: 'Sunlit Forest', imgUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop', gStart: '#ecfdf5', gEnd: '#a7f3d0', type: 'gradient' },
  { id: 'minimal-white', name: 'Clean White', imgUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop', gStart: '#ffffff', gEnd: '#e2e8f0', type: 'gradient' },
  { id: 'soft-pink', name: 'Cosmetic Pink', imgUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop', gStart: '#fdf2f8', gEnd: '#fbcfe8', type: 'gradient' }
];

// Initialize Extension Popup
document.addEventListener('DOMContentLoaded', () => {
  initLanguageSystem();
  initNavigation();
  initSettingsPanel();
  initResizePanel();
  initConvertPanel();
  initRemoveBgPanel();
  initReplaceBgPanel();
  initAIStudioPanel();
  initBatchPanel();
  loadRecentEdits();
  initFullscreenMode();
});

// 1.5. LANGUAGE & TRANSLATION SYSTEM
let currentLanguage = 'pt'; // default fallback

function getTranslation(lang, key) {
  if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
    return TRANSLATIONS[lang][key];
  }
  if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
    return TRANSLATIONS['en'][key];
  }
  return key;
}

function updateNavigationTitles() {
  const activeNavItem = document.querySelector('.nav-item.active');
  if (activeNavItem) {
    const targetPanel = activeNavItem.getAttribute('data-target');
    const screenTitle = document.getElementById('current-screen-title');
    const screenSubtitle = document.getElementById('current-screen-subtitle');
    
    const titleKey = `header_${targetPanel.replace('panel-', '').replace('-', '_')}_title`;
    const subKey = `header_${targetPanel.replace('panel-', '').replace('-', '_')}_sub`;
    
    if (screenTitle) screenTitle.textContent = getTranslation(currentLanguage, titleKey);
    if (screenSubtitle) screenSubtitle.textContent = getTranslation(currentLanguage, subKey);
  }
}

function setLanguage(lang) {
  currentLanguage = lang;
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ language: lang });
  } else {
    localStorage.setItem('language', lang);
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getTranslation(lang, key);
    if (translation) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = getTranslation(lang, key);
    if (translation) {
      el.placeholder = translation;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translation = getTranslation(lang, key);
    if (translation) {
      el.title = translation;
    }
  });

  updateUIForPlan();
  updateNavigationTitles();
  loadRecentEdits();
}

function initLanguageSystem() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      setLanguage(selectedLang);
    });
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['language'], (result) => {
      if (result.language) {
        setLanguage(result.language);
      } else {
        const browserLang = navigator.language.slice(0, 2).toLowerCase();
        const supported = ['pt', 'en', 'fr', 'de', 'es'];
        const defaultLang = supported.includes(browserLang) ? browserLang : 'pt';
        setLanguage(defaultLang);
      }
    });
  } else {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language.slice(0, 2).toLowerCase();
      const supported = ['pt', 'en', 'fr', 'de', 'es'];
      const defaultLang = supported.includes(browserLang) ? browserLang : 'pt';
      setLanguage(defaultLang);
    }
  }
}

// 2. NAVIGATION SYSTEM
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.content-panel');

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
      updateNavigationTitles();
    });
  });

  // Upgrade button on dashboard redirects to external pricing website
  const dashUpgradeBtn = document.getElementById('dash-upgrade-btn');
  if (dashUpgradeBtn) {
    dashUpgradeBtn.addEventListener('click', () => {
      window.open('https://resizeimagebackgroundremover.alwaysdata.net/#pricing', '_blank');
    });
  }

  // Locked overlay buttons (removing inline onclick handlers due to Chrome Extension CSP)
  const btnUnlockRemoveBg = document.getElementById('btn-unlock-remove-bg');
  if (btnUnlockRemoveBg) {
    btnUnlockRemoveBg.addEventListener('click', () => {
      const navSettings = document.getElementById('nav-settings');
      if (navSettings) navSettings.click();
    });
  }

  const btnUnlockChangeBg = document.getElementById('btn-unlock-change-bg');
  if (btnUnlockChangeBg) {
    btnUnlockChangeBg.addEventListener('click', () => {
      window.open('https://resizeimagebackgroundremover.alwaysdata.net/#pricing', '_blank');
    });
  }

  const btnUnlockAiStudio = document.getElementById('btn-unlock-ai-studio');
  if (btnUnlockAiStudio) {
    btnUnlockAiStudio.addEventListener('click', () => {
      window.open('https://resizeimagebackgroundremover.alwaysdata.net/#pricing', '_blank');
    });
  }

  const btnUnlockBatch = document.getElementById('btn-unlock-batch');
  if (btnUnlockBatch) {
    btnUnlockBatch.addEventListener('click', () => {
      window.open('https://resizeimagebackgroundremover.alwaysdata.net/#pricing', '_blank');
    });
  }
}

// 3. SETTINGS & ACCOUNT SYSTEM
function initSettingsPanel() {
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
  } else {
    const savedKey = localStorage.getItem('licenseKey');
    if (savedKey) {
      licenseKeyInput.value = savedKey;
      verifyKeyOnline(savedKey);
    }
  }

  btnActivate.addEventListener('click', () => {
    const key = licenseKeyInput.value.trim();
    const host = licenseHostInput.value.trim();
    if (!key) {
      alert(getTranslation(currentLanguage, 'alert_enter_license'));
      return;
    }
    if (host) {
      apiHost = host;
    }
    verifyKeyOnline(key);
  });

  async function verifyKeyOnline(key) {
    btnActivate.disabled = true;
    btnActivate.textContent = getTranslation(currentLanguage, 'status_verifying_license');
    try {
      const response = await fetch(`${apiHost}/api/license/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verificação falhou');
      }

      // Success
      currentPlan = data.plan;
      activeLicense = data;
      
      // Save locally
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ licenseKey: key, licenseData: data, licenseHost: apiHost });
      } else {
        localStorage.setItem('licenseKey', key);
        localStorage.setItem('licenseData', JSON.stringify(data));
      }

      updateUIForPlan();
      
      // Update Account Card info
      ownerEl.textContent = data.name;
      emailEl.textContent = data.email;
      planEl.textContent = getTranslation(currentLanguage, `plan_${data.plan.toLowerCase()}`);
      expiresEl.textContent = data.expiresAt ? data.expiresAt : getTranslation(currentLanguage, 'settings_lic_lifetime');
      infoCard.style.display = 'block';

      alert(getTranslation(currentLanguage, 'alert_license_success').replace('{plan}', getTranslation(currentLanguage, `plan_${data.plan.toLowerCase()}`)));
    } catch (err) {
      console.error(err);
      alert(getTranslation(currentLanguage, 'alert_license_error').replace('{error}', err.message));
      currentPlan = 'Free';
      activeLicense = null;
      updateUIForPlan();
      infoCard.style.display = 'none';
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = getTranslation(currentLanguage, 'btn_lic_activate');
    }
  }

  // --- THEME SWITCHER LOGIC ---
  const btnThemeDark = document.getElementById('btn-theme-dark');
  const btnThemeLight = document.getElementById('btn-theme-light');

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      btnThemeLight.classList.add('btn-primary');
      btnThemeLight.classList.remove('btn-secondary');
      btnThemeDark.classList.add('btn-secondary');
      btnThemeDark.classList.remove('btn-primary');
    } else {
      document.body.classList.remove('theme-light');
      btnThemeDark.classList.add('btn-primary');
      btnThemeDark.classList.remove('btn-secondary');
      btnThemeLight.classList.add('btn-secondary');
      btnThemeLight.classList.remove('btn-primary');
    }
  }

  // Load saved theme
  let savedTheme = 'dark';
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        savedTheme = result.theme;
        applyTheme(savedTheme);
      }
    });
  } else {
    savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
  }

  btnThemeDark.addEventListener('click', () => {
    applyTheme('dark');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: 'dark' });
    } else {
      localStorage.setItem('theme', 'dark');
    }
  });

  btnThemeLight.addEventListener('click', () => {
    applyTheme('light');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: 'light' });
    } else {
      localStorage.setItem('theme', 'light');
    }
  });

  // --- GEMINI API KEY LOGIC ---
  const geminiInput = document.getElementById('gemini-api-key-input');
  const btnToggleGemini = document.getElementById('btn-toggle-gemini-key');
  const btnSaveGemini = document.getElementById('btn-save-gemini-key');

  // Load saved Gemini key
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        geminiApiKey = result.geminiApiKey;
        geminiInput.value = geminiApiKey;
      }
    });
  } else {
    geminiApiKey = localStorage.getItem('geminiApiKey') || '';
    geminiInput.value = geminiApiKey;
  }

  // Toggle show/hide
  btnToggleGemini.addEventListener('click', () => {
    if (geminiInput.type === 'password') {
      geminiInput.type = 'text';
      btnToggleGemini.textContent = '🔒';
    } else {
      geminiInput.type = 'password';
      btnToggleGemini.textContent = '👁️';
    }
  });

  // Save key
  btnSaveGemini.addEventListener('click', () => {
    const key = geminiInput.value.trim();
    geminiApiKey = key;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ geminiApiKey: key }, () => {
        alert(getTranslation(currentLanguage, 'alert_gemini_saved'));
      });
    } else {
      localStorage.setItem('geminiApiKey', key);
      alert(getTranslation(currentLanguage, 'alert_gemini_saved'));
    }
  });
}


function updateUIForPlan() {
  const badge = document.getElementById('status-plan-badge');
  const dashPlanName = document.getElementById('dash-plan-name');
  const dashUpgradeBtn = document.getElementById('dash-upgrade-btn');
  const dashExpiry = document.getElementById('dash-plan-expiry');

  if (!badge) return; // Guard in case DOM not loaded yet

  badge.className = 'badge-plan ' + currentPlan.toLowerCase();
  
  const planTranslation = getTranslation(currentLanguage, `plan_${currentPlan.toLowerCase()}`);
  badge.textContent = getTranslation(currentLanguage, 'plan_badge_format').replace('{plan}', planTranslation);
  dashPlanName.textContent = planTranslation;

  // Manage locks overlays
  const lockRm = document.getElementById('lock-remove-bg');
  const lockChange = document.getElementById('lock-change-bg');
  const lockAI = document.getElementById('lock-ai-studio');
  const lockBatch = document.getElementById('lock-batch');

  if (currentPlan === 'Free') {
    if (lockRm) lockRm.style.display = 'flex';
    if (lockChange) lockChange.style.display = 'flex';
    if (lockAI) lockAI.style.display = 'flex';
    if (lockBatch) lockBatch.style.display = 'flex';
    if (dashUpgradeBtn) {
      dashUpgradeBtn.style.display = 'block';
      dashUpgradeBtn.textContent = getTranslation(currentLanguage, 'dash_upgrade_btn_premium');
    }
    if (dashExpiry) dashExpiry.textContent = getTranslation(currentLanguage, 'dash_expiry_free');
  } else if (currentPlan === 'Premium') {
    if (lockRm) lockRm.style.display = 'none';
    if (lockChange) lockChange.style.display = 'none';
    if (lockAI) lockAI.style.display = 'flex';
    if (lockBatch) lockBatch.style.display = 'flex';
    if (dashUpgradeBtn) {
      dashUpgradeBtn.style.display = 'block';
      dashUpgradeBtn.textContent = getTranslation(currentLanguage, 'dash_upgrade_btn_ultimate');
    }
    if (dashExpiry) dashExpiry.textContent = getTranslation(currentLanguage, 'dash_expiry_premium');
  } else if (currentPlan === 'Ultimate') {
    if (lockRm) lockRm.style.display = 'none';
    if (lockChange) lockChange.style.display = 'none';
    if (lockAI) lockAI.style.display = 'none';
    if (lockBatch) lockBatch.style.display = 'none';
    if (dashUpgradeBtn) dashUpgradeBtn.style.display = 'none';
    if (dashExpiry) dashExpiry.textContent = getTranslation(currentLanguage, 'dash_expiry_ultimate');
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
  const btnResizeNow = document.getElementById('btn-resize-now');
  const btnProcess = document.getElementById('btn-resize-process');
  const previewBox = document.getElementById('resize-preview-box');
  const previewImg = document.getElementById('resize-preview-img');
  const emptyPreview = document.getElementById('resize-empty-preview');

  let resizeOriginalSrc = null;
  let resizedDataUrl = null;

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
    // Hide download button when parameters change, forcing re-resize
    btnProcess.style.display = 'none';
  });

  widthInput.addEventListener('input', () => btnProcess.style.display = 'none');
  heightInput.addEventListener('input', () => btnProcess.style.display = 'none');
  formatSelect.addEventListener('change', () => btnProcess.style.display = 'none');
  qualityInput.addEventListener('input', () => {
    qualityVal.textContent = `${qualityInput.value}%`;
    btnProcess.style.display = 'none';
  });

  function loadResizeImage(file) {
    resizeFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      resizeOriginalSrc = e.target.result;
      previewImg.src = e.target.result;
      previewBox.style.display = 'block';
      emptyPreview.style.display = 'none';
      btnProcess.style.display = 'none';
      
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

  btnResizeNow.addEventListener('click', () => {
    if (!resizeFile || !resizeOriginalSrc) {
      alert(getTranslation(currentLanguage, 'alert_upload_first'));
      return;
    }

    const w = parseInt(widthInput.value) || 800;
    const h = parseInt(heightInput.value) || 800;
    const format = formatSelect.value;
    const q = parseFloat(qualityInput.value) / 100;

    btnResizeNow.disabled = true;
    btnResizeNow.textContent = getTranslation(currentLanguage, 'status_resizing');

    // Perform live resize draw on canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      
      const mime = format;
      const extension = format.split('/')[1] || 'png';
      resizedDataUrl = canvas.toDataURL(mime, q);

      // Update Live Preview
      previewImg.src = resizedDataUrl;
      btnProcess.style.display = 'block';
      btnResizeNow.disabled = false;
      btnResizeNow.textContent = getTranslation(currentLanguage, 'btn_resize_now');
    };
    img.src = resizeOriginalSrc;
  });

  btnProcess.addEventListener('click', () => {
    if (!resizedDataUrl) {
      alert(getTranslation(currentLanguage, 'alert_resize_first'));
      return;
    }
    const w = parseInt(widthInput.value) || 800;
    const h = parseInt(heightInput.value) || 800;
    const format = formatSelect.value;
    const extension = format.split('/')[1] || 'png';

    triggerDownload(resizedDataUrl, `resized-${w}x${h}.${extension}`);
    saveEditsHistory('Resize', `Resized to ${w}x${h}`, resizedDataUrl);
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

// 4.5. FILE CONVERSION FEATURE (Free)
function initConvertPanel() {
  const dropzone = document.getElementById('convert-dropzone');
  const fileInput = document.getElementById('convert-file-input');
  const typeSelect = document.getElementById('convert-type-select');
  const btnConvertNow = document.getElementById('btn-convert-now');
  const btnDownload = document.getElementById('btn-convert-download');
  const previewBox = document.getElementById('convert-preview-box');
  const previewImg = document.getElementById('convert-preview-img');
  const previewDoc = document.getElementById('convert-preview-doc');
  const docIcon = document.getElementById('convert-doc-icon');
  const docName = document.getElementById('convert-doc-name');
  const docInfo = document.getElementById('convert-doc-info');
  const emptyPreview = document.getElementById('convert-empty-preview');

  let originalSrc = null;

  function cleanupConvertedUrl() {
    if (convertedDataUrl && convertedDataUrl.startsWith('blob:')) {
      URL.revokeObjectURL(convertedDataUrl);
      convertedDataUrl = null;
    }
  }

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
      loadConvertImage(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      loadConvertImage(e.target.files[0]);
    }
  });

  typeSelect.addEventListener('change', () => {
    btnDownload.style.display = 'none';
  });

  function loadConvertImage(file) {
    cleanupConvertedUrl();
    convertFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      originalSrc = e.target.result;
      
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.png')) {
        if (!typeSelect.value.startsWith('png-to-')) {
          typeSelect.value = 'png-to-jpg';
        }
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        if (!typeSelect.value.startsWith('jpg-to-')) {
          typeSelect.value = 'jpg-to-png';
        }
      }

      previewBox.style.display = 'none';
      previewImg.style.display = 'none';
      previewDoc.style.display = 'none';
      emptyPreview.style.display = 'block';
      btnDownload.style.display = 'none';
      btnConvertNow.disabled = false;
      btnConvertNow.textContent = getTranslation(currentLanguage, 'btn_convert_now');
      
      previewImg.src = originalSrc;
      previewImg.style.display = 'block';
      previewBox.style.display = 'flex';
      emptyPreview.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  btnConvertNow.addEventListener('click', () => {
    if (!convertFile || !originalSrc) {
      alert(getTranslation(currentLanguage, 'alert_upload_first'));
      return;
    }

    const conversionType = typeSelect.value;
    const isPng = convertFile.name.toLowerCase().endsWith('.png');
    const isJpg = convertFile.name.toLowerCase().endsWith('.jpg') || convertFile.name.toLowerCase().endsWith('.jpeg');
    
    if (conversionType.startsWith('png-to-') && !isPng) {
      alert(currentLanguage === 'pt' ? 'Por favor, selecione um arquivo PNG para este tipo de conversão.' : 'Please select a PNG file for this conversion type.');
      return;
    }
    if (conversionType.startsWith('jpg-to-') && !isJpg) {
      alert(currentLanguage === 'pt' ? 'Por favor, selecione um arquivo JPG/JPEG para este tipo de conversão.' : 'Please select a JPG/JPEG file for this conversion type.');
      return;
    }

    btnConvertNow.disabled = true;
    btnConvertNow.textContent = getTranslation(currentLanguage, 'alert_converting');

    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;

      cleanupConvertedUrl();

      if (conversionType.endsWith('-to-jpg') || conversionType.endsWith('-to-png') || conversionType.endsWith('-to-webp')) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (conversionType.endsWith('-to-jpg')) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/png';
        let extension = 'png';
        if (conversionType.endsWith('-to-jpg')) {
          mimeType = 'image/jpeg';
          extension = 'jpg';
        } else if (conversionType.endsWith('-to-webp')) {
          mimeType = 'image/webp';
          extension = 'webp';
        }

        convertedDataUrl = canvas.toDataURL(mimeType, 0.95);

        previewImg.src = convertedDataUrl;
        previewImg.style.display = 'block';
        previewDoc.style.display = 'none';
        previewBox.style.display = 'flex';
        emptyPreview.style.display = 'none';

        btnConvertNow.disabled = false;
        btnConvertNow.textContent = getTranslation(currentLanguage, 'btn_convert_now');
        btnDownload.style.display = 'block';
      } 
      else if (conversionType.endsWith('-to-html')) {
        const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Smart Image Editor - Converted Image</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      color: #fff;
    }
    .container {
      background: rgba(30, 41, 59, 0.7);
      padding: 32px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 90vw;
      backdrop-filter: blur(12px);
    }
    img {
      max-width: 100%;
      max-height: 65vh;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      background-image: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%);
      background-position: 0 0, 10px 10px;
      background-size: 20px 20px;
    }
    h1 {
      font-size: 1.5rem;
      margin-top: 20px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .meta {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${originalSrc}" alt="Converted Image">
    <h1>Converted Image</h1>
    <div class="meta">${width} x ${height} px | ${convertFile.type}</div>
    <a href="${originalSrc}" download="image.${isPng ? 'png' : 'jpg'}" class="btn">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
      Download Image
    </a>
  </div>
</body>
</html>`;

        const htmlBlob = new Blob([htmlTemplate], { type: 'text/html' });
        convertedDataUrl = URL.createObjectURL(htmlBlob);

        previewImg.style.display = 'none';
        previewDoc.style.display = 'block';
        previewBox.style.display = 'flex';
        emptyPreview.style.display = 'none';

        docIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>';
        docName.textContent = convertFile.name.substring(0, convertFile.name.lastIndexOf('.')) + '.html';
        docInfo.textContent = `${(htmlBlob.size / 1024).toFixed(1)} KB | HTML Webpage`;

        btnConvertNow.disabled = false;
        btnConvertNow.textContent = getTranslation(currentLanguage, 'btn_convert_now');
        btnDownload.style.display = 'block';
      }
      else if (conversionType.endsWith('-to-pdf')) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = jpegDataUrl.split(',')[1];
        
        try {
          const pdfBlob = generatePDFFromJPEG(base64Data, width, height);
          convertedDataUrl = URL.createObjectURL(pdfBlob);

          previewImg.style.display = 'none';
          previewDoc.style.display = 'block';
          previewBox.style.display = 'flex';
          emptyPreview.style.display = 'none';

          docIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM9 9h1.5m1 0H13m-3.5 4h3m-3 4h3.5"></path>';
          docName.textContent = convertFile.name.substring(0, convertFile.name.lastIndexOf('.')) + '.pdf';
          docInfo.textContent = `${(pdfBlob.size / 1024).toFixed(1)} KB | PDF Document`;

          btnConvertNow.disabled = false;
          btnConvertNow.textContent = getTranslation(currentLanguage, 'btn_convert_now');
          btnDownload.style.display = 'block';
        } catch (err) {
          console.error(err);
          alert(getTranslation(currentLanguage, 'alert_convert_error'));
          btnConvertNow.disabled = false;
          btnConvertNow.textContent = getTranslation(currentLanguage, 'btn_convert_now');
        }
      }
    };
    img.src = originalSrc;
  });

  btnDownload.addEventListener('click', () => {
    if (!convertedDataUrl) return;

    const conversionType = typeSelect.value;
    const baseName = convertFile.name.substring(0, convertFile.name.lastIndexOf('.'));
    let outName = `${baseName}.png`;
    
    if (conversionType.endsWith('-to-jpg')) {
      outName = `${baseName}.jpg`;
    } else if (conversionType.endsWith('-to-webp')) {
      outName = `${baseName}.webp`;
    } else if (conversionType.endsWith('-to-html')) {
      outName = `${baseName}.html`;
    } else if (conversionType.endsWith('-to-pdf')) {
      outName = `${baseName}.pdf`;
    }

    triggerDownload(convertedDataUrl, outName);
    saveEditsHistory('Convert', `${conversionType.toUpperCase().replace('-', ' ')}`, (conversionType.endsWith('-to-html') || conversionType.endsWith('-to-pdf')) ? null : convertedDataUrl);
  });
}

function generatePDFFromJPEG(jpegBase64, width, height) {
  const raw = window.atob(jpegBase64);
  const rawLength = raw.length;
  const imgArray = new Uint8Array(new ArrayBuffer(rawLength));
  for (let i = 0; i < rawLength; i++) {
    imgArray[i] = raw.charCodeAt(i);
  }

  const wPoints = width * 0.75;
  const hPoints = height * 0.75;

  const header = "%PDF-1.4\r\n";
  const obj1 = "1 0 obj\r\n<< /Type /Catalog /Pages 2 0 R >>\r\nendobj\r\n";
  const obj2 = "2 0 obj\r\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\r\nendobj\r\n";
  const obj3 = `3 0 obj\r\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPoints.toFixed(2)} ${hPoints.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> /ProcSet [ /PDF /ImageB /ImageC ] >> /Contents 5 0 R >>\r\nendobj\r\n`;
  const obj4Header = `4 0 obj\r\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgArray.length} >>\r\nstream\r\n`;
  const obj4Footer = "\r\nendstream\r\nendobj\r\n";
  const contentStream = `q\r\n${wPoints.toFixed(2)} 0 0 ${hPoints.toFixed(2)} 0 0 cm\r\n/Im1 Do\r\nQ\r\n`;
  const obj5 = `5 0 obj\r\n<< /Length ${contentStream.length} >>\r\nstream\r\n${contentStream}endstream\r\nendobj\r\n`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);
  const obj1Bytes = encoder.encode(obj1);
  const obj2Bytes = encoder.encode(obj2);
  const obj3Bytes = encoder.encode(obj3);
  const obj4HeaderBytes = encoder.encode(obj4Header);
  const obj4FooterBytes = encoder.encode(obj4Footer);
  const obj5Bytes = encoder.encode(obj5);

  const offsets = [];
  let currentOffset = headerBytes.length;

  offsets.push(currentOffset);
  currentOffset += obj1Bytes.length;

  offsets.push(currentOffset);
  currentOffset += obj2Bytes.length;

  offsets.push(currentOffset);
  currentOffset += obj3Bytes.length;

  offsets.push(currentOffset);
  currentOffset += obj4HeaderBytes.length + imgArray.length + obj4FooterBytes.length;

  offsets.push(currentOffset);
  currentOffset += obj5Bytes.length;

  let xref = `xref\r\n0 6\r\n0000000000 65535 f\r\n`;
  for (let i = 0; i < offsets.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n\r\n`;
  }
  
  const startXref = currentOffset;
  const trailer = `trailer\r\n<< /Size 6 /Root 1 0 R >>\r\nstartxref\r\n${startXref}\r\n%%EOF\r\n`;
  
  const xrefBytes = encoder.encode(xref);
  const trailerBytes = encoder.encode(trailer);

  const totalLength = currentOffset + xrefBytes.length + trailerBytes.length;
  const pdfBytes = new Uint8Array(totalLength);
  
  let ptr = 0;
  pdfBytes.set(headerBytes, ptr); ptr += headerBytes.length;
  pdfBytes.set(obj1Bytes, ptr); ptr += obj1Bytes.length;
  pdfBytes.set(obj2Bytes, ptr); ptr += obj2Bytes.length;
  pdfBytes.set(obj3Bytes, ptr); ptr += obj3Bytes.length;
  
  pdfBytes.set(obj4HeaderBytes, ptr); ptr += obj4HeaderBytes.length;
  pdfBytes.set(imgArray, ptr); ptr += imgArray.length;
  pdfBytes.set(obj4FooterBytes, ptr); ptr += obj4FooterBytes.length;
  
  pdfBytes.set(obj5Bytes, ptr); ptr += obj5Bytes.length;
  
  pdfBytes.set(xrefBytes, ptr); ptr += xrefBytes.length;
  pdfBytes.set(trailerBytes, ptr); ptr += trailerBytes.length;

  return new Blob([pdfBytes], { type: 'application/pdf' });
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
      alert(getTranslation(currentLanguage, 'alert_upload_first'));
      return;
    }

    btnProcess.disabled = true;
    btnProcess.textContent = getTranslation(currentLanguage, 'status_removing_bg');

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
      btnProcess.textContent = getTranslation(currentLanguage, 'btn_rm_now');
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

  const btnUploadCustomBg = document.getElementById('btn-upload-custom-bg');
  const customBgInput = document.getElementById('bg-custom-file-input');

  // Adjustments
  const brightRange = document.getElementById('bg-brightness');
  const brightVal = document.getElementById('bg-brightness-val');
  const contrastRange = document.getElementById('bg-contrast');
  const contrastVal = document.getElementById('bg-contrast-val');
  const blurRange = document.getElementById('bg-blur');
  const blurVal = document.getElementById('bg-blur-val');

  let cachedBgImage = null;
  let cachedBgImageUrl = null;

  // Load first template on startup as default
  changeBgTemplate = bgTemplates[0];
  loadBgTemplateImage(changeBgTemplate);

  // Render backdrops library
  bgTemplates.forEach((tpl) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.setAttribute('data-id', tpl.id);
    
    // Create preview background using Unsplash template images
    item.style.backgroundImage = `url(${tpl.imgUrl})`;
    item.style.backgroundSize = 'cover';
    item.style.backgroundPosition = 'center';
    
    const label = document.createElement('div');
    label.className = 'preset-label';
    label.textContent = tpl.name;
    
    item.appendChild(label);
    presetGrid.appendChild(item);

    item.addEventListener('click', () => {
      document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      changeBgTemplate = tpl;
      changeBgCustomTemplateImage = null; // Clear custom background
      loadBgTemplateImage(tpl);
    });
  });

  // Set the first template as active visually
  setTimeout(() => {
    const firstItem = presetGrid.querySelector('.preset-item');
    if (firstItem) firstItem.classList.add('active');
  }, 200);

  function loadBgTemplateImage(tpl) {
    if (tpl.imgUrl) {
      if (cachedBgImageUrl !== tpl.imgUrl) {
        cachedBgImageUrl = tpl.imgUrl;
        const img = new Image();
        img.crossOrigin = "anonymous"; // Essential to prevent tainted canvas SecurityError
        img.onload = () => {
          cachedBgImage = img;
          renderComposite();
        };
        img.src = tpl.imgUrl;
      } else {
        renderComposite();
      }
    }
  }

  btnUploadCustomBg.addEventListener('click', () => customBgInput.click());
  customBgInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        changeBgCustomTemplateImage = event.target.result;
        
        // Load custom background image
        const img = new Image();
        img.onload = () => {
          cachedBgImage = img;
          cachedBgImageUrl = null; // Clear URL cache
          // Deactivate selected templates visually
          document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
          renderComposite();
        };
        img.src = changeBgCustomTemplateImage;
      };
      reader.readAsDataURL(file);
    }
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
      
      if (cachedBgImage && cachedBgImage.complete) {
        // Draw image stretched to cover the canvas (cover effect)
        const scale = Math.max(canvas.width / cachedBgImage.width, canvas.height / cachedBgImage.height);
        const w = cachedBgImage.width * scale;
        const h = cachedBgImage.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(cachedBgImage, x, y, w, h);
      } else {
        const tpl = changeBgTemplate || bgTemplates[0];
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, tpl.gStart);
        gradient.addColorStop(1, tpl.gEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      alert(getTranslation(currentLanguage, 'alert_upload_subject_first'));
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      triggerDownload(dataUrl, 'studio-placement.png');
      saveEditsHistory('BG Replace', 'Created studio composite', dataUrl);
    } catch (err) {
      console.error(err);
      alert(getTranslation(currentLanguage, 'alert_zip_security_error'));
    }
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

  const btnOptimize = document.getElementById('btn-ai-optimize-prompt');

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

  // Optimize prompt with Gemini 1.5 Flash
  btnOptimize.addEventListener('click', async () => {
    const promptText = promptInput.value.trim();
    if (!promptText) {
      alert(getTranslation(currentLanguage, 'alert_prompt_first'));
      return;
    }

    if (!geminiApiKey) {
      alert(getTranslation(currentLanguage, 'alert_api_key_required'));
      return;
    }

    btnOptimize.disabled = true;
    btnOptimize.textContent = getTranslation(currentLanguage, 'status_optimizing_prompt');

    try {
      // 1. Fetch available models dynamically from the user's API Key
      let chosenModel = 'models/gemini-1.5-flash'; // Default fallback
      try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiApiKey}`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.models && listData.models.length > 0) {
            // Find all models that support content generation
            const candidateModels = listData.models.filter(m => 
              m.supportedGenerationMethods && 
              m.supportedGenerationMethods.includes('generateContent')
            );
            
            if (candidateModels.length > 0) {
              // Prefer list of standard/stable models
              const preferList = [
                'models/gemini-2.5-flash',
                'models/gemini-2.0-flash',
                'models/gemini-1.5-flash',
                'models/gemini-1.5-flash-latest',
                'models/gemini-pro'
              ];
              
              let found = null;
              for (const pref of preferList) {
                found = candidateModels.find(m => m.name === pref || m.name.endsWith(pref.replace('models/', '')));
                if (found) break;
              }
              
              if (found) {
                chosenModel = found.name;
              } else {
                // Fallback to first available gemini model
                const firstGemini = candidateModels.find(m => m.name.includes('gemini'));
                if (firstGemini) chosenModel = firstGemini.name;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Could not list models dynamically, using default:', e);
      }

      if (!chosenModel.startsWith('models/')) {
        chosenModel = 'models/' + chosenModel;
      }

      console.log('Using Gemini model:', chosenModel);

      // 2. Call generateContent with the chosen model
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/${chosenModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Enhance this product image background prompt to be highly detailed and professional for a text-to-image generator like Imagen: '${promptText}'. Return only the enhanced prompt text, without quotes, notes, or extra explanation.`
            }]
          }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API do Gemini');
      }

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const enhancedPrompt = data.candidates[0].content.parts[0].text.trim();
        promptInput.value = enhancedPrompt;
        alert(getTranslation(currentLanguage, 'status_optimizing_success'));
      } else {
        alert(getTranslation(currentLanguage, 'status_optimizing_fail'));
      }
    } catch (err) {
      console.error(err);
      alert(getTranslation(currentLanguage, 'alert_generation_error').replace('{error}', err.message));
    } finally {
      btnOptimize.disabled = false;
      btnOptimize.textContent = getTranslation(currentLanguage, 'btn_ai_optimize');
    }
  });

  btnGenerate.addEventListener('click', async () => {
    const promptText = promptInput.value.trim();
    if (!promptText) {
      alert(getTranslation(currentLanguage, 'alert_prompt_first'));
      return;
    }

    btnGenerate.disabled = true;
    spinner.style.display = 'inline-block';

    if (geminiApiKey) {
      // Robust Image Generation Flow supporting multiple strategies
      try {
        let imageBase64 = null;
        let methodUsed = '';

        // Strategy A: Try listing models and calling gemini-2.5-flash-image or similar
        try {
          const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
          if (listResponse.ok) {
            const listData = await listResponse.json();
            if (listData.models && listData.models.length > 0) {
              const imageModels = listData.models.filter(m => m.name.toLowerCase().includes('image') && m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
              if (imageModels.length > 0) {
                // Prefer gemini-3.1-flash-image or gemini-2.5-flash-image
                const chosenGenImageModel = imageModels.find(m => m.name.includes('gemini-2.5-flash-image') || m.name.includes('gemini-3.1-flash-image')) || imageModels[0];
                let modelPath = chosenGenImageModel.name;
                if (!modelPath.startsWith('models/')) {
                  modelPath = 'models/' + modelPath;
                }

                console.log('Strategy A: Attempting generateContent with', modelPath);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${geminiApiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [{
                        text: promptText
                      }]
                    }],
                    generationConfig: {
                      responseModalities: ["TEXT", "IMAGE"]
                    }
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  if (data.candidates && data.candidates[0]?.content?.parts) {
                    // Look for inlineData part with image mimeType
                    const imagePart = data.candidates[0].content.parts.find(p => p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'));
                    if (imagePart) {
                      imageBase64 = imagePart.inlineData.data;
                      methodUsed = 'Gemini Multimodal (' + modelPath + ')';
                    }
                  }
                }
              }
            }
          }
        } catch (errA) {
          console.warn('Strategy A failed:', errA);
        }

        // Strategy B: If Strategy A did not yield an image, try the legacy Imagen prediction path
        if (!imageBase64) {
          try {
            // Find active Imagen models
            let chosenModel = 'models/imagen-3.0-generate-002'; // default fallback
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
            if (listResponse.ok) {
              const listData = await listResponse.json();
              if (listData.models && listData.models.length > 0) {
                const imagenModels = listData.models.filter(m => m.name.toLowerCase().includes('imagen'));
                if (imagenModels.length > 0) {
                  const preferred = imagenModels.find(m => m.name.includes('imagen-3.0-generate') || m.name.includes('imagen-3.0-fast') || m.name.includes('imagen-3.0'));
                  chosenModel = preferred ? preferred.name : imagenModels[0].name;
                }
              }
            }

            if (!chosenModel.startsWith('models/')) {
              chosenModel = 'models/' + chosenModel;
            }
            console.log('Strategy B: Attempting Imagen predict with', chosenModel);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${chosenModel}:predict?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [{ prompt: promptText }],
                parameters: {
                  sampleCount: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '1:1'
                }
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.predictions && data.predictions.length > 0) {
                imageBase64 = data.predictions[0].bytesBase64Encoded;
                methodUsed = 'Imagen Predict (' + chosenModel + ')';
              }
            } else {
              const errData = await response.json();
              throw new Error(errData.error?.message || 'Predict failed');
            }
          } catch (errB) {
            console.warn('Strategy B failed:', errB);
            throw new Error(errB.message || 'Todas as estratégias da API do Gemini falharam');
          }
        }

        if (imageBase64) {
          const url = `data:image/jpeg;base64,${imageBase64}`;
          
          previewImg.src = url;
          previewBox.style.display = 'block';
          emptyPreview.style.display = 'none';

          saveEditsHistory('AI Gen', 'Gemini AI Backdrop (' + methodUsed + ')', url);
          triggerDownload(url, 'gemini-imagen-studio.jpg');
        } else {
          throw new Error('Nenhuma imagem retornada das APIs do Gemini');
        }
      } catch (err) {
        console.error(err);
        alert(getTranslation(currentLanguage, 'alert_generation_error').replace('{error}', err.message));
        generateDemoScene();
      } finally {
        btnGenerate.disabled = false;
        spinner.style.display = 'none';
      }
    } else {
      // Fallback demo generation
      alert(getTranslation(currentLanguage, 'alert_demo_mode'));
      setTimeout(() => {
        generateDemoScene();
        btnGenerate.disabled = false;
        spinner.style.display = 'none';
      }, 1500);
    }

    function generateDemoScene() {
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

      saveEditsHistory('AI Gen', 'AI Background Generation (Demo)', url);
      triggerDownload(url, 'ai-generated-studio.jpg');
    }
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

  // Premium settings elements
  const batchWidthInput = document.getElementById('batch-width');
  const batchHeightInput = document.getElementById('batch-height');
  const bgFillSelect = document.getElementById('batch-bg-fill-select');
  const bgFillCustomInput = document.getElementById('batch-bg-fill-custom');
  const batchFormatSelect = document.getElementById('batch-format-select');
  const batchQualityInput = document.getElementById('batch-quality');
  const batchQualityVal = document.getElementById('batch-quality-val');

  // Toggle custom color input visibility
  bgFillSelect.addEventListener('change', () => {
    if (bgFillSelect.value === 'custom') {
      bgFillCustomInput.style.display = 'block';
    } else {
      bgFillCustomInput.style.display = 'none';
    }
  });

  // Quality display value
  batchQualityInput.addEventListener('input', () => {
    batchQualityVal.textContent = `${batchQualityInput.value}%`;
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      batchFiles = Array.from(e.target.files);
      countLabel.textContent = getTranslation(currentLanguage, 'batch_progress_status_ready').replace('{total}', batchFiles.length);
      btnProcess.disabled = false;
      emptyPreview.style.display = 'none';
      progressBox.style.display = 'block';
      btnDownloadZip.style.display = 'none';
      
      // Populate Queue List with thumbnails and pending state
      resultList.innerHTML = '';
      batchFiles.forEach((file, idx) => {
        const row = document.createElement('div');
        row.className = 'batch-item-row';
        row.id = `batch-row-${idx}`;
        
        const thumb = document.createElement('img');
        thumb.className = 'batch-item-thumb';
        thumb.src = 'icons/icon48.png'; // temporary fallback
        
        const reader = new FileReader();
        reader.onload = (event) => {
          thumb.src = event.target.result;
        };
        reader.readAsDataURL(file);

        const info = document.createElement('div');
        info.className = 'batch-item-info';
        
        const name = document.createElement('div');
        name.className = 'batch-item-name';
        name.textContent = file.name;
        
        const size = document.createElement('div');
        size.className = 'batch-item-size';
        size.textContent = `${(file.size / 1024).toFixed(1)} KB`;

        info.appendChild(name);
        info.appendChild(size);

        const badge = document.createElement('span');
        badge.className = 'batch-item-status-badge pending';
        badge.id = `batch-badge-${idx}`;
        badge.textContent = getTranslation(currentLanguage, 'batch_status_pending');

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(badge);
        resultList.appendChild(row);
      });

      // Reset progress bar
      progressBar.style.width = '0%';
      progressStatus.textContent = getTranslation(currentLanguage, 'batch_progress_status_ready').replace('{total}', batchFiles.length);
    }
  });

  btnProcess.addEventListener('click', () => {
    if (batchFiles.length === 0) return;

    btnProcess.disabled = true;
    btnDownloadZip.style.display = 'none';

    progressBar.style.width = '0%';
    progressStatus.textContent = getTranslation(currentLanguage, 'batch_progress_status_active')
      .replace('{percent}', 0)
      .replace('{index}', 0)
      .replace('{total}', batchFiles.length);

    const zip = new MiniZip();
    let index = 0;

    // Read Premium parameters
    const targetW = parseInt(batchWidthInput.value) || 800;
    const targetH = parseInt(batchHeightInput.value) || 800;
    const bgFill = bgFillSelect.value;
    const customColor = bgFillCustomInput.value.trim() || '#FFFFFF';
    const format = batchFormatSelect.value;
    const q = parseFloat(batchQualityInput.value) / 100;
    const operation = operationSelect.value;

    function processNext() {
      if (index >= batchFiles.length) {
        // Complete! Create zip
        const zipBuffer = zip.generate();
        batchProcessedZipData = new Blob([zipBuffer], { type: 'application/zip' });
        btnDownloadZip.style.display = 'block';
        btnProcess.disabled = false;
        progressStatus.textContent = getTranslation(currentLanguage, 'batch_progress_status_complete').replace('{total}', batchFiles.length);
        return;
      }

      // Update badge status to processing
      const badge = document.getElementById(`batch-badge-${index}`);
      if (badge) {
        badge.className = 'batch-item-status-badge processing';
        badge.textContent = getTranslation(currentLanguage, 'batch_status_processing');
      }

      const file = batchFiles[index];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          // Action selection
          if (operation === 'resize') {
            ctx.drawImage(img, 0, 0, targetW, targetH);
          } else {
            // Remove bg simulation + Resize
            // 1. Draw solid background if configured
            if (bgFill === 'white') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, targetW, targetH);
            } else if (bgFill === 'black') {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, targetW, targetH);
            } else if (bgFill === 'custom') {
              ctx.fillStyle = customColor;
              ctx.fillRect(0, 0, targetW, targetH);
            }

            // 2. Perform bg removal segmentation on temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);

            const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;

            // Sample corner background color reference
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];

              // Color distance
              const distance = Math.sqrt(
                Math.pow(r - bgR, 2) +
                Math.pow(g - bgG, 2) +
                Math.pow(b - bgB, 2)
              );

              // Key out
              if (distance < 120) {
                data[i+3] = 0; // Alpha transparent
              }
            }
            tempCtx.putImageData(imgData, 0, 0);

            // 3. Draw segmented subject centered on main canvas
            const maxDim = Math.min(targetW, targetH) * 0.8;
            let w = img.width;
            let h = img.height;

            if (w > h) {
              h = (maxDim / w) * h;
              w = maxDim;
            } else {
              w = (maxDim / h) * w;
              h = maxDim;
            }

            const x = (targetW - w) / 2;
            const y = (targetH - h) / 2;

            ctx.drawImage(tempCanvas, x, y, w, h);
          }

          // Extract arrayBuffer from canvas base64 to build ZIP archive
          const mime = format;
          const extension = format.split('/')[1] || 'png';
          const base64 = canvas.toDataURL(mime, q).split(',')[1];
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }

          zip.addFile(`processed-${file.name.replace(/\.[^/.]+$/, "")}.${extension}`, array.buffer);

          // Update row badge status to completed
          if (badge) {
            badge.className = 'batch-item-status-badge completed';
            badge.textContent = getTranslation(currentLanguage, 'batch_status_completed');
          }

          // Update Progress
          index++;
          const percent = Math.round((index / batchFiles.length) * 100);
          progressBar.style.width = `${percent}%`;
          progressStatus.textContent = getTranslation(currentLanguage, 'batch_progress_status_active')
            .replace('{percent}', percent)
            .replace('{index}', index)
            .replace('{total}', batchFiles.length);

          setTimeout(processNext, 150); // Small interval for smooth processing feedback
        };
        img.onerror = () => {
          if (badge) {
            badge.className = 'batch-item-status-badge error';
            badge.textContent = getTranslation(currentLanguage, 'batch_status_error');
          }
          index++;
          processNext();
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
  if (!container) return;
  if (recentEdits.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="font-size: 11px; color: var(--color-text-secondary); margin: auto; padding: 20px;">
        ${getTranslation(currentLanguage, 'dash_recent_empty')}
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
