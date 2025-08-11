/**
 * Auto-Shutdown Module
 * Automatically shuts down the server when the browser tab/window is closed
 */

class AutoShutdown {
    constructor() {
        this.shutdownSent = false;
        this.setupEventListeners();
        console.log('🔄 Auto-shutdown enabled - server will stop when browser closes');
    }

    setupEventListeners() {
        // Handle page unload (when tab/window is closed)
        window.addEventListener('beforeunload', (e) => {
            this.sendShutdownSignal();
        });

        window.addEventListener('unload', () => {
            this.sendShutdownSignal();
        });

        // Handle visibility change (when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Wait a bit to see if user is just switching tabs
                setTimeout(() => {
                    if (document.visibilityState === 'hidden') {
                        this.sendShutdownSignal();
                    }
                }, 3000); // Wait 3 seconds
            }
        });

        // Handle page focus loss
        window.addEventListener('blur', () => {
            setTimeout(() => {
                if (!document.hasFocus()) {
                    this.sendShutdownSignal();
                }
            }, 5000); // Wait 5 seconds
        });
    }

    async sendShutdownSignal() {
        if (this.shutdownSent) return; // Prevent multiple shutdown calls
        
        this.shutdownSent = true;
        
        try {
            // Use sendBeacon for reliable delivery during page unload
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/shutdown', JSON.stringify({}));
                console.log('🛑 Server shutdown signal sent via beacon');
            } else {
                // Fallback to fetch with keepalive
                await fetch('/api/shutdown', {
                    method: 'POST',
                    keepalive: true,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                console.log('🛑 Server shutdown signal sent via fetch');
            }
        } catch (error) {
            console.log('Could not send shutdown signal:', error);
        }
    }

    // Manual shutdown method
    manualShutdown() {
        console.log('🛑 Manual shutdown requested');
        this.sendShutdownSignal();
    }
}

// Initialize auto-shutdown when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autoShutdown = new AutoShutdown();
});

// Make it globally accessible
window.AutoShutdown = AutoShutdown;