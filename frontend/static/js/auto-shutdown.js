/**
 * Auto-Shutdown Module
 * Automatically shuts down the server when the browser tab/window is closed
 */

class AutoShutdown {
    constructor() {
        this.shutdownSent = false;
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        this.setupEventListeners();
        this.startHeartbeat();
        console.log('🔄 Auto-shutdown system initialized - server will stop when browser closes');
        console.log('🔄 Using heartbeat mechanism + immediate shutdown detection');
    }

    setupEventListeners() {
        // Immediate shutdown on page unload - simplified approach
        window.addEventListener('beforeunload', (e) => {
            console.log('🔄 beforeunload event - attempting immediate shutdown');
            this.sendShutdownSignal();
        });

        window.addEventListener('unload', () => {
            console.log('🔄 unload event - attempting immediate shutdown');
            this.sendShutdownSignal();
        });

        // More reliable: pagehide event
        window.addEventListener('pagehide', (e) => {
            console.log('🔄 pagehide event - attempting immediate shutdown');
            this.sendShutdownSignal();
        });

        // Handle visibility change with shorter delay
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log('🔄 Page became hidden - stopping heartbeat, server will auto-shutdown in ~5 seconds');
                this.stopHeartbeat();
            } else {
                console.log('🔄 Page became visible again - resuming heartbeat');
                this.startHeartbeat();
            }
        });

        // Handle focus loss
        window.addEventListener('blur', () => {
            console.log('🔄 Window lost focus - stopping heartbeat');
            this.stopHeartbeat();
        });

        window.addEventListener('focus', () => {
            console.log('🔄 Window gained focus - resuming heartbeat');
            this.startHeartbeat();
        });
        
        console.log('✅ Auto-shutdown event listeners registered (heartbeat + immediate mode)');
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 2000); // Send heartbeat every 2 seconds
        
        console.log('� Heartbeat started - server will know browser is alive');
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('� Heartbeat stopped - server will auto-shutdown if no heartbeat for 5 seconds');
        }
    }

    async sendHeartbeat() {
        try {
            await fetch('/api/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp: Date.now() })
            });
            this.lastHeartbeat = Date.now();
        } catch (error) {
            console.error('💔 Heartbeat failed:', error);
        }
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
        console.log('🛑 Manual shutdown requested - stopping heartbeat and shutting down immediately');
        this.stopHeartbeat();
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