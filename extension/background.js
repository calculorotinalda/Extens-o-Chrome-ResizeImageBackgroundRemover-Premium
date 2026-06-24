// Chrome Extension Service Worker

// 1. On Installation, launch the Premium Onboarding Page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('extension/onboarding.html')
    });
  }
});

// 2. Messaging Gateway
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'verifyLicenseOffline') {
    chrome.storage.local.get(['licenseKey', 'licenseData'], (result) => {
      if (result.licenseKey && result.licenseData) {
        sendResponse({ success: true, licenseKey: result.licenseKey, data: result.licenseData });
      } else {
        sendResponse({ success: false, error: 'No license key configured' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'saveLicenseKey') {
    chrome.storage.local.set({ 
      licenseKey: request.key, 
      licenseData: request.data 
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
