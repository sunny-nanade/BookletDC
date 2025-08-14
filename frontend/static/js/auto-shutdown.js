/**
 * Auto-Shutdown Module
 * Automatically shuts down the server when the browser tab/window is closed
 */

class AutoShutdown {
    constructor() {
        this.shutdownSent = false;
        this.isRefreshing = false;
        this.isNavigating = false;
        this.setupEventListeners();
        console.log('🔄 Auto-shutdown system initialized - server will stop when browser closes');
        console.log('🔄 Will NOT shutdown on refresh or navigation - only on actual browser close');
    }

    setupEventListeners() {
        // Detect refresh/navigation attempts
        window.addEventListener('beforeunload', (e) => {
            console.log('🔄 beforeunload event triggered');
            
            // Check if this is a refresh (F5, Ctrl+R, or navigation)
            if (performance.navigation.type === 1) {
                console.log('🔄 Page refresh detected - NOT sending shutdown signal');
                this.isRefreshing = true;
                return;
            }
            
            // Check if this is navigation to another page
            if (e.returnValue !== undefined || e.defaultPrevented) {
                console.log('🔄 Navigation detected - NOT sending shutdown signal');
                this.isNavigating = true;
                return;
            }
            
            // Only send shutdown if this appears to be a real window close
            console.log('🔄 Window close detected - sending shutdown signal');
            this.sendShutdownSignal();
        });

        // Handle actual page unload - but only if not refreshing
        window.addEventListener('unload', () => {
            if (this.isRefreshing || this.isNavigating) {
                console.log('🔄 unload triggered but refresh/navigation detected - NOT shutting down');
                return;
            }
            console.log('🔄 unload event triggered - window being closed');
            this.sendShutdownSignal();
        });

        // Handle visibility change with longer delay to avoid false positives
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log('🔄 Page became hidden - waiting 10 seconds before checking');
                // Wait longer to see if user is just switching tabs or apps
                setTimeout(() => {
                    if (document.visibilityState === 'hidden' && !this.isRefreshing && !this.isNavigating) {
                        console.log('🔄 Page still hidden after 10 seconds - sending shutdown signal');
                        this.sendShutdownSignal();
                    }
                }, 10000); // Wait 10 seconds
            } else {
                console.log('🔄 Page became visible again');
                this.isRefreshing = false;
                this.isNavigating = false;
            }
        });
        
        // Alternative approach: Use pagehide event which is more reliable
        window.addEventListener('pagehide', (e) => {
            // persisted = true means the page is being cached (like back/forward navigation)
            // persisted = false usually means page is being unloaded completely
            if (!e.persisted && !this.isRefreshing && !this.isNavigating) {
                console.log('🔄 pagehide with no cache - window likely being closed');
                this.sendShutdownSignal();
            } else if (e.persisted) {
                console.log('🔄 pagehide with cache - navigation detected, NOT shutting down');
            }
        });

        // Detect keyboard shortcuts that indicate refresh
        document.addEventListener('keydown', (e) => {
            // F5 or Ctrl+R or Cmd+R
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
                console.log('🔄 Refresh keyboard shortcut detected');
                this.isRefreshing = true;
            }
        });
        
        console.log('✅ Auto-shutdown event listeners registered (intelligent mode)');
    }

    async sendShutdownSignal() {
        if (this.shutdownSent) return; // Prevent multiple shutdown calls
        
        this.shutdownSent = true;
        console.log('🛑 Attempting to send shutdown signal...');
        
        try {
            // Use sendBeacon for reliable delivery during page unload
            if (navigator.sendBeacon) {
                const success = navigator.sendBeacon('/api/shutdown', JSON.stringify({}));
                console.log('🛑 Server shutdown signal sent via beacon, success:', success);
            } else {
                // Fallback to fetch with keepalive
                const response = await fetch('/api/shutdown', {
                    method: 'POST',
                    keepalive: true,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                console.log('🛑 Server shutdown signal sent via fetch, status:', response.status);
            }
        } catch (error) {
            console.error('❌ Could not send shutdown signal:', error);
        }
    }

    // Manual shutdown method
    manualShutdown() {
        console.log('🛑 Manual shutdown requested - bypassing refresh detection');
        this.shutdownSent = false; // Reset flag to allow manual shutdown
        this.sendShutdownSignal();
    }
}

// Initialize auto-shutdown when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autoShutdown = new AutoShutdown();
    
    // Add manual shutdown button listener
    const shutdownButton = document.getElementById('shutdown-button');
    if (shutdownButton) {
        shutdownButton.addEventListener('click', () => {
            console.log('🛑 Manual shutdown button clicked');
            window.autoShutdown.manualShutdown();
        });
        console.log('🔄 Manual shutdown button listener added');
    }
});

// Make it globally accessible
window.AutoShutdown = AutoShutdown;