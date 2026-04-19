document.addEventListener('DOMContentLoaded', function() {
    const multiplierInput = document.getElementById('multiplier');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');

    // Load saved values
    chrome.storage.local.get(['multiplier', 'enabled'], function(result) {
        if (result.multiplier) {
            multiplierInput.value = result.multiplier;
        }
        updateStatus(result.enabled ? 'active' : 'inactive', result.multiplier || 1);
    });

    // Apply button
    applyBtn.addEventListener('click', function() {
        const mult = parseFloat(multiplierInput.value);
        
        if (isNaN(mult) || mult <= 0) {
            status.textContent = 'Enter a valid number > 0';
            status.className = 'status error';
            return;
        }

        // Save to storage
        chrome.storage.local.set({ 
            multiplier: mult,
            enabled: true
        });

        // Send to content script - handle response properly
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'apply',
                    multiplier: mult
                }, function(response) {
                    // Response received - popup can close now
                });
            }
        });

        updateStatus('active', mult);
        
        // Close popup after short delay
        setTimeout(() => window.close(), 300);
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        chrome.storage.local.set({ enabled: false });

        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'remove'
                }, function(response) {
                    // Response received
                });
            }
        });

        updateStatus('inactive', 1);
        
        // Close popup after short delay
        setTimeout(() => window.close(), 300);
    });

    // Enter key on input
    multiplierInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyBtn.click();
        }
    });

    function updateStatus(state, multiplier) {
        if (state === 'active') {
            status.textContent = '🎯 Active: ×' + multiplier;
            status.className = 'status active';
            applyBtn.textContent = 'Update';
        } else {
            status.textContent = 'Inactive';
            status.className = 'status inactive';
            applyBtn.textContent = 'Apply';
        }
    }
});
