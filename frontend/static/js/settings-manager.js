/**
 * HybridSettingsManager - Handles persistent storage with local cache + server sync
 * - Local cache for instant loading and offline capability
 * - Server sync for global persistence across browsers/sessions
 * - Debounced sync to minimize server requests
 * - Conflict resolution with timestamp-based updates
 */
class HybridSettingsManager {
    constructor() {
        this.localStorageKey = 'bookletScannerSettings';
        this.serverEndpoint = '/api/settings/';
        this.syncDebounceTime = 1000; // 1 second
        this.maxRetries = 3;
        
        this.defaultSettings = {
            // Booklet settings
            mainPages: 32,
            supplementCount: 0,
            
            // Camera settings
            leftCameraDevice: '',
            leftCameraResolution: '720p',
            leftCameraRotate: '0',
            rightCameraDevice: '',
            rightCameraResolution: '720p',
            rightCameraRotate: '0',
            
            // Trim settings
            leftTrimTop: 0,
            leftTrimBottom: 0,
            leftTrimLeft: 0,
            leftTrimRight: 0,
            rightTrimTop: 0,
            rightTrimBottom: 0,
            rightTrimLeft: 0,
            rightTrimRight: 0,
            
            // Metadata
            lastModified: new Date().toISOString(),
            version: '1.0.0'
        };
        
        this.settings = { ...this.defaultSettings };
        this.syncTimeout = null;
        this.isOnline = navigator.onLine;
        this.initializationPromise = null;
        
        // Status management
        this.statusIndicator = null;
        this.statusText = null;
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus('syncing', 'Syncing...');
            this.syncToServer();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus('offline', 'Offline');
        });
        
        this.initialize();
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    async _performInitialization() {
        try {
            // 1. Load local settings first (instant)
            const localSettings = this.loadFromLocal();
            this.settings = localSettings;
            this.setupEventListeners();
            this.restoreSettings();
            console.log('⚡ Local settings loaded instantly:', localSettings);
            
            // 2. Try to sync with server (background)
            if (this.isOnline) {
                try {
                    const serverSettings = await this.loadFromServer();
                    if (serverSettings && this.isServerNewer(serverSettings, localSettings)) {
                        console.log('🔄 Server settings are newer, updating local cache');
                        this.settings = serverSettings;
                        this.saveToLocal(serverSettings);
                        this.restoreSettings();
                        this.updateStatus('synced', 'Server');
                    } else if (this.isLocalNewer(localSettings, serverSettings)) {
                        console.log('📤 Local settings are newer, syncing to server');
                        this.updateStatus('syncing', 'Syncing...');
                        await this.syncToServer();
                    } else {
                        this.updateStatus('synced', 'Synced');
                    }
                } catch (error) {
                    console.warn('⚠️ Server sync failed, using local settings:', error);
                    this.updateStatus('error', 'Sync Failed');
                }
            } else {
                console.log('📴 Offline mode: using local settings only');
                this.updateStatus('offline', 'Offline');
            }
        } catch (error) {
            console.error('❌ Settings initialization failed:', error);
            this.settings = { ...this.defaultSettings };
            this.restoreSettings();
        }
    }

    loadFromLocal() {
        try {
            const saved = localStorage.getItem(this.localStorageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load local settings:', error);
        }
        return { ...this.defaultSettings };
    }

    saveToLocal(settings) {
        try {
            settings.lastModified = new Date().toISOString();
            localStorage.setItem(this.localStorageKey, JSON.stringify(settings));
            console.log('💾 Settings saved to local cache');
        } catch (error) {
            console.error('Failed to save local settings:', error);
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch(this.serverEndpoint);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const data = await response.json();
            return data.settings;
        } catch (error) {
            console.warn('Failed to load server settings:', error);
            return null;
        }
    }

    async syncToServer(retryCount = 0) {
        if (!this.isOnline) {
            console.log('📴 Offline: skipping server sync');
            this.updateStatus('offline', 'Offline');
            return false;
        }

        if (retryCount === 0) {
            this.updateStatus('syncing', 'Syncing...');
        }

        try {
            const response = await fetch(this.serverEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings: this.settings })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            console.log('☁️ Settings synced to server successfully');
            this.updateStatus('synced', 'Synced');
            return true;
        } catch (error) {
            console.warn(`Server sync failed (attempt ${retryCount + 1}/${this.maxRetries}):`, error);
            
            if (retryCount < this.maxRetries - 1) {
                // Exponential backoff: 2s, 4s, 8s
                const delay = Math.pow(2, retryCount + 1) * 1000;
                setTimeout(() => this.syncToServer(retryCount + 1), delay);
            } else {
                this.updateStatus('error', 'Sync Failed');
            }
            return false;
        }
    }

    isServerNewer(serverSettings, localSettings) {
        if (!serverSettings || !serverSettings.lastModified) return false;
        if (!localSettings || !localSettings.lastModified) return true;
        
        const serverTime = new Date(serverSettings.lastModified).getTime();
        const localTime = new Date(localSettings.lastModified).getTime();
        
        return serverTime > localTime;
    }

    isLocalNewer(localSettings, serverSettings) {
        if (!localSettings || !localSettings.lastModified) return false;
        if (!serverSettings || !serverSettings.lastModified) return true;
        
        const localTime = new Date(localSettings.lastModified).getTime();
        const serverTime = new Date(serverSettings.lastModified).getTime();
        
        return localTime > serverTime;
    }

    debouncedSyncToServer() {
        // Clear existing timeout
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        
        // Set new timeout
        this.syncTimeout = setTimeout(() => {
            this.syncToServer();
        }, this.syncDebounceTime);
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.settings.lastModified = new Date().toISOString();
        
        // Instant local save
        this.saveToLocal(this.settings);
        
        // Debounced server sync
        this.debouncedSyncToServer();
    }

    async resetSettings() {
        try {
            this.settings = { ...this.defaultSettings };
            this.settings.lastModified = new Date().toISOString();
            
            // Save locally
            this.saveToLocal(this.settings);
            
            // Try to reset on server too
            if (this.isOnline) {
                try {
                    const response = await fetch(`${this.serverEndpoint}reset`, {
                        method: 'POST'
                    });
                    if (response.ok) {
                        console.log('✅ Settings reset on server');
                    }
                } catch (error) {
                    console.warn('Failed to reset server settings:', error);
                }
            }
            
            this.restoreSettings();
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    }

    exportSettings() {
        const exportData = {
            ...this.settings,
            exportedAt: new Date().toISOString(),
            version: this.settings.version
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'booklet-scanner-settings.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachEventListeners());
        } else {
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        // Initialize status elements
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.updateStatus('local', 'Loaded');
        
        // Main pages dropdown
        const mainPagesDropdown = document.getElementById('main-pages-select');
        if (mainPagesDropdown) {
            mainPagesDropdown.addEventListener('change', (e) => {
                this.updateSetting('mainPages', parseInt(e.target.value));
            });
        }

        // Supplement count radio buttons
        document.querySelectorAll('input[name="supplement-count"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateSetting('supplementCount', parseInt(e.target.value));
            });
        });

        // Camera settings
        const selectors = [
            { id: 'left-camera-device', key: 'leftCameraDevice' },
            { id: 'right-camera-device', key: 'rightCameraDevice' },
            { id: 'left-camera-resolution', key: 'leftCameraResolution' },
            { id: 'right-camera-resolution', key: 'rightCameraResolution' },
            { id: 'left-camera-rotate', key: 'leftCameraRotate' },
            { id: 'right-camera-rotate', key: 'rightCameraRotate' }
        ];

        selectors.forEach(({ id, key }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    // Parse rotation values as integers
                    const value = key.includes('Rotate') ? parseInt(e.target.value) : e.target.value;
                    this.updateSetting(key, value);
                    
                    // Trigger preview update for rotation changes
                    if (key.includes('Rotate')) {
                        this.triggerPreviewUpdate(id.includes('left') ? 'left' : 'right');
                    }
                });
            }
        });

        // Trim inputs
        const trimInputs = [
            { id: 'left-top', key: 'leftTrimTop' },
            { id: 'left-bottom', key: 'leftTrimBottom' },
            { id: 'left-left', key: 'leftTrimLeft' },
            { id: 'left-right', key: 'leftTrimRight' },
            { id: 'right-top', key: 'rightTrimTop' },
            { id: 'right-bottom', key: 'rightTrimBottom' },
            { id: 'right-left', key: 'rightTrimLeft' },
            { id: 'right-right', key: 'rightTrimRight' }
        ];

        trimInputs.forEach(({ id, key }) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', (e) => {
                    this.updateSetting(key, parseInt(e.target.value) || 0);
                    this.updatePreviewForTrimChange(id, key);
                });
                
                input.addEventListener('blur', (e) => {
                    this.updateSetting(key, parseInt(e.target.value) || 0);
                    this.updatePreviewForTrimChange(id, key);
                });
            }
        });
    }

    restoreSettings() {
        // Restore main pages
        const mainPagesDropdown = document.getElementById('main-pages-select');
        if (mainPagesDropdown) {
            mainPagesDropdown.value = this.settings.mainPages.toString();
            console.log(`🔄 Restored main-pages-select to value: ${this.settings.mainPages}`);
        }

        // Restore supplement count
        const supplementRadio = document.querySelector(`input[name="supplement-count"][value="${this.settings.supplementCount}"]`);
        if (supplementRadio) {
            supplementRadio.checked = true;
        }

        // Restore camera settings via camera manager (if initialized)
        if (window.cameraManager && window.cameraManager.isInitialized) {
            const cameraSettings = {
                leftCamera: {
                    deviceId: this.settings.leftCameraDevice,
                    resolution: this.settings.leftCameraResolution,
                    rotation: this.settings.leftCameraRotate
                },
                rightCamera: {
                    deviceId: this.settings.rightCameraDevice,
                    resolution: this.settings.rightCameraResolution,
                    rotation: this.settings.rightCameraRotate
                }
            };
            window.cameraManager.applySettings(cameraSettings);
        } else {
            // Fallback: restore dropdowns manually (camera manager will handle when ready)
            const settingsMap = [
                // Skip camera devices - they will be restored by camera manager after dropdowns are populated
                // { id: 'left-camera-device', value: this.settings.leftCameraDevice },
                // { id: 'right-camera-device', value: this.settings.rightCameraDevice },
                { id: 'left-camera-resolution', value: this.settings.leftCameraResolution },
                { id: 'right-camera-resolution', value: this.settings.rightCameraResolution },
                { id: 'left-camera-rotate', value: this.settings.leftCameraRotate },
                { id: 'right-camera-rotate', value: this.settings.rightCameraRotate }
            ];

            settingsMap.forEach(({ id, value }) => {
                const element = document.getElementById(id);
                if (element && value) {
                    element.value = value;
                    console.log(`🔄 Restored ${id} to value: ${value}`);
                }
            });
        }

        // Restore trim settings
        const trimMappings = [
            { id: 'left-top', key: 'leftTrimTop' },
            { id: 'left-bottom', key: 'leftTrimBottom' },
            { id: 'left-left', key: 'leftTrimLeft' },
            { id: 'left-right', key: 'leftTrimRight' },
            { id: 'right-top', key: 'rightTrimTop' },
            { id: 'right-bottom', key: 'rightTrimBottom' },
            { id: 'right-left', key: 'rightTrimLeft' },
            { id: 'right-right', key: 'rightTrimRight' }
        ];

        trimMappings.forEach(({ id, key }) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = this.settings[key];
            }
        });

        console.log('🎛️ Settings restored to UI:', this.settings);
        
        // Add a delayed restoration to ensure rotation values stick
        setTimeout(() => {
            this.ensureRotationValues();
        }, 500);
    }

    /**
     * Ensure rotation values are properly set (fix for timing issues)
     */
    ensureRotationValues() {
        const rotationElements = [
            { id: 'left-camera-rotate', value: this.settings.leftCameraRotate },
            { id: 'right-camera-rotate', value: this.settings.rightCameraRotate }
        ];
        
        rotationElements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element && value && element.value !== value) {
                console.log(`🔧 Correcting ${id} from ${element.value} to ${value}`);
                element.value = value;
                
                // Trigger change event to notify other systems
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Also ensure camera manager has restored device selections
        if (window.cameraManager && window.cameraManager.isInitialized) {
            console.log('🔄 Triggering camera manager device restoration');
            window.cameraManager.restoreDeviceSelections();
        }
    }

    updateStatus(type, message) {
        if (!this.statusIndicator || !this.statusText) return;
        
        // Remove all status classes
        this.statusIndicator.className = 'status-indicator';
        
        // Add the appropriate class
        this.statusIndicator.classList.add(type);
        this.statusText.textContent = message;
        
        // Update tooltip
        const statusContainer = document.getElementById('settings-status');
        if (statusContainer) {
            const tooltips = {
                local: 'Settings saved locally',
                synced: 'Settings synced with server',
                syncing: 'Syncing settings to server...',
                error: 'Failed to sync with server',
                offline: 'Offline - using local settings'
            };
            statusContainer.title = tooltips[type] || message;
        }
    }

    /**
     * Update preview when trim values change
     */
    updatePreviewForTrimChange(inputId, settingKey) {
        // Determine which side this trim setting belongs to
        const side = inputId.startsWith('left-') ? 'left' : 'right';

        // Get the input elements for all trim values and rotation for this side
        const prefix = side === 'left' ? 'left' : 'right';
        const trimTopInput = document.getElementById(`${prefix}-top`);
        const trimBottomInput = document.getElementById(`${prefix}-bottom`);
        const trimLeftInput = document.getElementById(`${prefix}-left`);
        const trimRightInput = document.getElementById(`${prefix}-right`);
        const rotationInput = document.getElementById(`${prefix}-camera-rotate`);

        // Ensure all input values are up to date with settings (robustness)
        if (trimTopInput) trimTopInput.value = this.settings[`${prefix}TrimTop`] || 0;
        if (trimBottomInput) trimBottomInput.value = this.settings[`${prefix}TrimBottom`] || 0;
        if (trimLeftInput) trimLeftInput.value = this.settings[`${prefix}TrimLeft`] || 0;
        if (trimRightInput) trimRightInput.value = this.settings[`${prefix}TrimRight`] || 0;
        if (rotationInput) rotationInput.value = this.settings[`${prefix}CameraRotate`] || 0;

        // The OpenCV preview manager reads directly from the DOM inputs on every frame,
        // so updating the input values ensures the preview is always correct and instant.
        // No need to pass trim/rotation to updatePreviewSettings, just trigger a frame.
        if (window.openCVPreviewManager) {
            // Optionally, you could add a forceRedraw method for instant feedback, but the animation loop is fast.
            window.openCVPreviewManager.updatePreviewSettings(side, {});
        }

        console.log(`🔄 Updated ${side} camera preview with trim values (robust):`, {
            trimTop: trimTopInput ? trimTopInput.value : undefined,
            trimBottom: trimBottomInput ? trimBottomInput.value : undefined,
            trimLeft: trimLeftInput ? trimLeftInput.value : undefined,
            trimRight: trimRightInput ? trimRightInput.value : undefined,
            rotation: rotationInput ? rotationInput.value : undefined
        });
    }

    /**
     * Get current trim options for a side
     */
    getCurrentTrimOptions(side) {
        const prefix = side === 'left' ? 'left' : 'right';
        return {
            trimTop: this.settings[`${prefix}TrimTop`] || 0,
            trimBottom: this.settings[`${prefix}TrimBottom`] || 0,
            trimLeft: this.settings[`${prefix}TrimLeft`] || 0,
            trimRight: this.settings[`${prefix}TrimRight`] || 0,
            rotation: parseInt(this.settings[`${prefix}CameraRotate`]) || 0,
            fillMode: 'crop'
        };
    }

    /**
     * Trigger preview update for a specific camera side
     */
    triggerPreviewUpdate(side) {
        // Notify OpenCV preview manager if available
        if (window.openCVPreviewManager) {
            window.openCVPreviewManager.updatePreviewSettings(side, {});
        }
        
        // Also trigger custom event for other listeners
        document.dispatchEvent(new CustomEvent('cameraSettingsChanged', {
            detail: { side, setting: 'rotation' }
        }));
    }

    /**
     * Centralized method to update rotation and trim settings
     */
    updateSettings(side, settings) {
        const prefix = side === 'left' ? 'left' : 'right';

        // Update rotation
        const rotationElement = document.getElementById(`${prefix}-camera-rotate`);
        if (rotationElement) {
            rotationElement.value = settings.rotation;
            rotationElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Update trim settings
        ['top', 'bottom', 'left', 'right'].forEach((direction) => {
            const trimElement = document.getElementById(`${prefix}-${direction}`);
            if (trimElement) {
                trimElement.value = settings[`trim${direction.charAt(0).toUpperCase() + direction.slice(1)}`];
                trimElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        console.log(`🔄 Updated ${side} settings:`, settings);
    }

    // Legacy compatibility methods
    getSetting(key) {
        return this.settings[key];
    }

    getAllSettings() {
        return { ...this.settings };
    }
}

// Alias for backward compatibility
const SettingsManager = HybridSettingsManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridSettingsManager;
}