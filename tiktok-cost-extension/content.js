// content.js for TikTok Ads Cost Multiplier
// Handles format: "1,398.13 USD"

(function() {
    'use strict';
    
    // Visible test banner
    const testDiv = document.createElement('div');
    testDiv.id = 'tiktok-cost-test';
    testDiv.textContent = '🎯 Extension Loading...';
    testDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #00f2ea, #ff0050);
        color: white;
        padding: 15px 30px;
        border-radius: 0 0 15px 15px;
        font-weight: bold;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(testDiv);
    
    console.log('🎯 TikTok Cost Multiplier: Starting...');
    
    let multiplier = 1;
    let isActive = false;
    const originalValues = new Map();
    const processedNodes = new Set();
    
    // Match patterns like "1,398.13 USD" or "USD 1,398.13" or "$1,398.13"
    const CURRENCY_REGEX = /([\d,]+\.?\d*)\s*(USD|EUR|GBP|€|£|\$)?/g;
    
    // Parse currency value
    function parseCurrency(text) {
        if (!text) return null;
        // Match: 1,398.13 or 1,398.13 USD
        const match = text.match(/^([\d,]+\.?\d*)/);
        if (!match) return null;
        const value = parseFloat(match[1].replace(/,/g, ''));
        return isNaN(value) ? null : value;
    }
    
    // Format currency - try to preserve original format
    function formatCurrency(value, original) {
        // Detect if original had currency after (like "1,398.13 USD")
        const hasCurrencyAfter = /(USD|EUR|GBP)$/.test(original.trim());
        
        if (hasCurrencyAfter) {
            return value.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            }) + ' USD';
        }
        
        // Otherwise use $ prefix
        return '$' + value.toLocaleString('en-US', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
        });
    }
    
    // Walk all text nodes
    function findCurrencyNodes(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (!node.textContent.trim() || node.textContent.length < 3) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Match "1,398.13" or "1,398.13 USD" or "$1,398"
                    if (/[\d,]+\.?\d*/.test(node.textContent)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (processedNodes.has(node)) continue;
            const parent = node.parentElement;
            if (!parent) continue;
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) continue;
            nodes.push(node);
        }
        return nodes;
    }
    
    // Apply multiplier
    function scanAndApply() {
        console.log(`🎯 Applying multiplier: ×${multiplier}`);
        testDiv.textContent = `🎯 Scanning... ×${multiplier}`;
        
        const nodes = findCurrencyNodes(document.body);
        console.log(`📊 Found ${nodes.length} potential text nodes`);
        
        let processed = 0;
        
        nodes.forEach(node => {
            const originalText = node.textContent;
            
            if (originalValues.has(node)) {
                processed++;
                return;
            }
            
            // Try to find a number in the text
            const match = originalText.match(/([\d,]+\.?\d*)/);
            if (!match) return;
            
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (isNaN(value) || value <= 0) return;
            
            // Only process if it looks like a cost (has USD, $, or is a reasonable number)
            const isLikelyCost = (
                originalText.includes('USD') ||
                originalText.includes('$') ||
                originalText.includes('€') ||
                originalText.includes('£') ||
                (value > 0.01 && value < 1000000) // Reasonable cost range
            );
            
            if (!isLikelyCost) return;
            
            // Apply multiplier
            const newValue = value * multiplier;
            const newText = originalText.replace(match[1], newValue.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            }));
            
            // Store and apply
            originalValues.set(node, originalText);
            processedNodes.add(node);
            node.textContent = newText;
            processed++;
            
            console.log(`  ✅ "${originalText}" → "${newText}"`);
        });
        
        console.log(`✅ Processed: ${processed} values`);
        
        if (processed > 0) {
            testDiv.textContent = `🎯 ×${multiplier} Done! (${processed} values)`;
            testDiv.style.background = '#00c853';
            setTimeout(() => testDiv.style.display = 'none', 3000);
            showIndicator();
        } else {
            testDiv.textContent = '⚠️ No cost values found';
            testDiv.style.background = '#ff6f00';
        }
    }
    
    // Restore originals
    function restoreOriginals() {
        originalValues.forEach((originalText, node) => {
            node.textContent = originalText;
            processedNodes.delete(node);
        });
        originalValues.clear();
        hideIndicator();
    }
    
    // Show indicator
    function showIndicator() {
        if (document.getElementById('tiktok-cost-indicator')) return;
        const indicator = document.createElement('div');
        indicator.id = 'tiktok-cost-indicator';
        indicator.innerHTML = `🎯 ×${multiplier}`;
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00f2ea, #ff0050);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 16px;
            z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            cursor: pointer;
        `;
        indicator.onclick = () => chrome.runtime.sendMessage({ action: 'remove' });
        document.body.appendChild(indicator);
    }
    
    function hideIndicator() {
        const ind = document.getElementById('tiktok-cost-indicator');
        if (ind) ind.remove();
    }
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📩 Message:', request);
        if (request.action === 'apply') {
            multiplier = parseFloat(request.multiplier) || 1;
            isActive = true;
            scanAndApply();
        } else if (request.action === 'remove') {
            multiplier = 1;
            isActive = false;
            restoreOriginals();
        }
        return true;
    });
    
    // Storage changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.multiplier) {
            multiplier = changes.multiplier.newValue || 1;
            if (isActive) scanAndApply();
        }
    });
    
    // Initial check
    setTimeout(() => {
        chrome.storage.local.get(['enabled', 'multiplier'], (result) => {
            if (result.enabled && result.multiplier) {
                multiplier = parseFloat(result.multiplier);
                isActive = true;
                setTimeout(scanAndApply, 1000);
            } else {
                testDiv.textContent = '✅ Ready - Enter multiplier & Apply';
                testDiv.style.background = '#00c853';
                setTimeout(() => testDiv.style.display = 'none', 3000);
            }
        });
    }, 3000);
    
    console.log('✅ Extension loaded');
})();
