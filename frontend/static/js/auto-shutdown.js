/**
 * Auto-Shutdown Module
 * Automatically shuts down the server when the browser tab/window is closed
 */

class AutoShutdown {
    constructor() {
        this.shutdownSent = false;
        this.setupEventListeners();
        console.log('🔄 Auto-shutdown system initialized - will shutdown on browser close');
    }

    setupEventListeners() {
        // Handle page unload events
        window.addEventListener('beforeunload', (e) => {
            console.log('🔄 beforeunload event - sending shutdown signal');
            this.sendShutdownSignal();
        });

        window.addEventListener('unload', () => {
            console.log('🔄 unload event - sending shutdown signal');
            this.sendShutdownSignal();
        });

        // Handle pagehide event (more reliable for mobile)
        window.addEventListener('pagehide', (e) => {
            console.log('🔄 pagehide event - sending shutdown signal');
            this.sendShutdownSignal();
        });
        
        console.log('✅ Auto-shutdown event listeners registered (simple mode)');
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
}

// Initialize auto-shutdown when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autoShutdown = new AutoShutdown();
    console.log('🔄 Auto-shutdown system initialized - simple event-based monitoring');
});

// Make it globally accessible
window.AutoShutdown = AutoShutdown;
