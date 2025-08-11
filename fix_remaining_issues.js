// Quick fixes for remaining issues
// Run this in browser console to apply fixes

// 1. Reduce console logging
const originalLog = console.log;
console.log = function(...args) {
    // Filter out verbose object logging
    if (args.length === 2 && typeof args[1] === 'object' && 
        (args[0].includes('Settings restored') || args[0].includes('Local settings loaded'))) {
        originalLog(args[0]); // Log message without object
    } else {
        originalLog(...args); // Log everything else normally
    }
};

// 2. Reduce settings sync frequency
if (window.bookletScannerApp && window.bookletScannerApp.settingsManager) {
    window.bookletScannerApp.settingsManager.syncDebounceTime = 3000; // 3 seconds
    console.log('✅ Settings sync frequency reduced to 3 seconds');
}

console.log('✅ Quick fixes applied - reduced logging and sync frequency');