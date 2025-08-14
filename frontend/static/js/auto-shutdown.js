/**
 * Auto-Shutdown Module
 * Automatically shuts down the server when the browser tab/window is closed
 */

class AutoShutdown {
    constructor() {
        this.shutdownSent = false;
        this.setupEventListeners();
        console.log('🔄 Auto-shutdown system initialized - server will stop when browser closes');
        console.log('🔄 Available shutdown triggers: beforeunload, unload, visibilitychange, blur');
    }

    setupEventListeners() {
        // Handle page unload (when tab/window is closed)
        window.addEventListener('beforeunload', (e) => {
            console.log('🔄 beforeunload event triggered - sending shutdown signal');
            this.sendShutdownSignal();
        });

        window.addEventListener('unload', () => {
            console.log('🔄 unload event triggered - sending shutdown signal');
            this.sendShutdownSignal();
        });

        // Handle visibility change (when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log('🔄 Page became hidden - waiting 3 seconds before shutdown');
                // Wait a bit to see if user is just switching tabs
                setTimeout(() => {
                    if (document.visibilityState === 'hidden') {
                        console.log('🔄 Page still hidden after 3 seconds - sending shutdown signal');
                        this.sendShutdownSignal();
                    }
                }, 3000); // Wait 3 seconds
            }
        });

        // Handle page focus loss
        window.addEventListener('blur', () => {
            console.log('🔄 Window lost focus - waiting 5 seconds before shutdown');
            setTimeout(() => {
                if (!document.hasFocus()) {
                    console.log('🔄 Window still without focus after 5 seconds - sending shutdown signal');
                    this.sendShutdownSignal();
                }
            }, 5000); // Wait 5 seconds
        });
        
        console.log('✅ Auto-shutdown event listeners registered');
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
        console.log('🛑 Manual shutdown requested');
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