/**
 * CameraManager - Advanced camera management with device detection and streaming
 * Handles camera access, configuration, streaming, and image capture
 */
class CameraManager {
    constructor() {
        this.availableCameras = [];
        this.activeCameras = new Map(); // deviceId -> { stream, video, side }
        this.supportedResolutions = new Map(); // deviceId -> resolutions array
        this.isInitialized = false;
        this.isConfigured = false; // Track if cameras have been configured
        this.cacheKey = 'bookletScannerCameraCache_v2'; // Updated cache key to invalidate old cache
        this.lastDeviceListHash = null;
        
        // Bind methods to ensure proper 'this' context in async calls
        this.updateCameraPreview = this.updateCameraPreview.bind(this);
        this.updateResolutionInfo = this.updateResolutionInfo.bind(this);
        this.startCamera = this.startCamera.bind(this);
        this.stopCamera = this.stopCamera.bind(this);
        this.autoStartCameras = this.autoStartCameras.bind(this);
        this.configureCameras = this.configureCameras.bind(this);
    }

    // Standard resolution presets with constraints
    getResolutionConstraints() {
        return {
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '1440p': { width: 2560, height: 1440 },
            '4K': { width: 3840, height: 2160 },
            'custom-high': { width: 1955, height: 1450 } // Competitor's QR-optimized resolution
        };
    }

    async initializeCameras() {
        console.log('⚡ Fast-loading camera system using cached data...');
        
        try {
            // Clean up old cache format
            this.cleanupOldCache();
            
            // Load cached camera data first
            const cacheLoaded = this.loadCachedCameraData();
            
            // Always show the configuration button for user convenience
            this.showConfigurationButton();
            
            if (cacheLoaded && this.availableCameras.length > 0) {
                console.log('📦 Using cached camera configuration');
                
                // Populate dropdowns from cache
                this.populateDropdownsFromCache();
                
                // Setup trim input validation
                this.setupTrimValidation();
                
                // Mark as initialized
                this.isInitialized = true;
                this.isConfigured = true;
                
                // Update configuration button to show it's already configured
                this.updateConfigurationButton(true);
                
                console.log('✅ Camera system initialized instantly from cache');
                
                // Auto-start cameras with cached settings
                setTimeout(() => {
                    this.autoStartCameras();
                }, 100); // Quick start since we have cached data
                
                // Hide loading overlay
                this.hideLoadingOverlay();
                
                return true;
            } else {
                console.log('⚠️ No valid cached camera data found - configuration required');
                
                // Setup basic UI
                this.setupBasicUI();
                this.setupTrimValidation();
                
                this.isInitialized = true;
                this.isConfigured = false;
                
                // Update configuration button to show configuration needed
                this.updateConfigurationButton(false);
                
                console.log('🔧 Camera system ready - configuration required');
                
                // Hide loading overlay
                this.hideLoadingOverlay();
                
                return true;
            }
        } catch (error) {
            console.error('❌ Camera initialization failed:', error);
            this.showCameraError('Failed to initialize cameras: ' + error.message);
            this.hideLoadingOverlay();
            return false;
        }
    }

    async requestCameraPermissions() {
        try {
            // Request basic camera access to get permissions
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            // Stop the stream immediately - we just needed permissions
            stream.getTracks().forEach(track => track.stop());
            console.log('📹 Camera permissions granted');
        } catch (error) {
            throw new Error('Camera permissions denied or not available');
        }
    }

    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => 
                device.kind === 'videoinput' && device.deviceId
            );
            
            console.log(`📷 Found ${this.availableCameras.length} camera(s):`, 
                this.availableCameras.map(cam => cam.label || 'Unknown Camera'));
            
            if (this.availableCameras.length === 0) {
                throw new Error('No cameras found');
            }
            
            // Create device list hash for cache invalidation
            this.lastDeviceListHash = this.createDeviceListHash();
            
        } catch (error) {
            throw new Error('Failed to enumerate camera devices: ' + error.message);
        }
    }

    createDeviceListHash() {
        const deviceString = this.availableCameras
            .map(cam => cam.deviceId + cam.label)
            .sort()
            .join('|');
        return btoa(deviceString).slice(0, 16);
    }

    updateResolutionInfo(side, resolution) {
        const infoElement = document.getElementById(`${side}-camera-info`);
        if (!infoElement) return;
        
        if (resolution) {
            infoElement.style.display = 'block';
            infoElement.querySelector('.resolution-info').textContent = resolution;
        } else {
            infoElement.style.display = 'none';
        }
    }

    async captureImage(side) {
        const cameraData = this.activeCameras.get(this.getCameraSettings(side).deviceId);
        if (!cameraData) {
            throw new Error(`No active camera for ${side} side`);
        }

        const { video } = cameraData;
        const cameraInfo = this.getCameraSettings(side);
        
        // Create a temporary canvas for capture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get current trim and rotation values as percentages for consistency
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        const userRotation = rotateSelect ? parseInt(rotateSelect.value, 10) : 0;
        
        // Fixed trim calculations to maintain aspect ratio
        const originalWidth = video.videoWidth;
        const originalHeight = video.videoHeight;
        
        // Convert percentage trim values to pixels
        const trimTop = Math.round(originalHeight * trimTopPercent / 100);
        const trimBottom = Math.round(originalHeight * trimBottomPercent / 100);
        const trimLeft = Math.round(originalWidth * trimLeftPercent / 100);
        const trimRight = Math.round(originalWidth * trimRightPercent / 100);
        
        // SIMPLIFIED APPROACH: Apply trim directly to the rotated preview
        // No coordinate transformation needed - user sees correct orientation
        
        // Try to get the preview canvas (already rotated and correctly oriented)
        const previewCanvas = window.openCVPreviewManager?.previewCanvases?.get(side);
        if (previewCanvas) {
            // Preview canvas is already rotated - apply trim directly to it
            const previewWidth = previewCanvas.width;
            const previewHeight = previewCanvas.height;
            
            // Convert percentage trim to pixels on the preview canvas
            const trimTopPx = Math.round(previewHeight * trimTopPercent / 100);
            const trimBottomPx = Math.round(previewHeight * trimBottomPercent / 100);
            const trimLeftPx = Math.round(previewWidth * trimLeftPercent / 100);
            const trimRightPx = Math.round(previewWidth * trimRightPercent / 100);
            
            // Calculate trimmed area directly from preview canvas
            const sx = trimLeftPx;
            const sy = trimTopPx;
            const sw = previewWidth - trimLeftPx - trimRightPx;
            const sh = previewHeight - trimTopPx - trimBottomPx;
            
            if (sw <= 0 || sh <= 0) {
                console.warn(`Invalid trim dimensions for ${side}: ${sw}x${sh}`);
                return null;
            }
            
            // Create output canvas with the correct final dimensions
            canvas.width = sw;
            canvas.height = sh;
            
            // Draw the trimmed area directly from the preview canvas
            ctx.drawImage(previewCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            
            console.log(`🎯 CaptureImage from preview canvas: ${canvas.width}×${canvas.height} (trim: T=${trimTopPercent}%, B=${trimBottomPercent}%, L=${trimLeftPercent}%, R=${trimRightPercent}%)`);
            
        } else {
            // Fallback: apply trim to raw video, then rotate the result
            // This is more complex but maintains the old behavior when preview canvas is not available
            
            // Transform trim values to match the original video coordinate system
            let actualTrimTop, actualTrimBottom, actualTrimLeft, actualTrimRight;
        
        switch (userRotation) {
            case 90:
                // 90° clockwise: top becomes left, right becomes top, bottom becomes right, left becomes bottom
                actualTrimTop = trimRight;
                actualTrimBottom = trimLeft;
                actualTrimLeft = trimTop;
                actualTrimRight = trimBottom;
                break;
            case 180:
                // 180°: top becomes bottom, bottom becomes top, left becomes right, right becomes left
                actualTrimTop = trimBottom;
                actualTrimBottom = trimTop;
                actualTrimLeft = trimRight;
                actualTrimRight = trimLeft;
                break;
            case 270:
                // 270° clockwise: top becomes right, right becomes bottom, bottom becomes left, left becomes top
                actualTrimTop = trimLeft;
                actualTrimBottom = trimRight;
                actualTrimLeft = trimBottom;
                actualTrimRight = trimTop;
                break;
            default: // 0°
                // No rotation, use trim values as-is
                actualTrimTop = trimTop;
                actualTrimBottom = trimBottom;
                actualTrimLeft = trimLeft;
                actualTrimRight = trimRight;
                break;
        }
        
        // Calculate trimmed dimensions (what we want to capture) using transformed coordinates
        const trimmedWidth = originalWidth - actualTrimLeft - actualTrimRight;
        const trimmedHeight = originalHeight - actualTrimTop - actualTrimBottom;
        
        // Validate trim values don't exceed video dimensions
        if (trimmedWidth <= 0 || trimmedHeight <= 0) {
            console.error('❌ Invalid trim values - trimmed dimensions would be zero or negative');
            return null;
        }
        
        // Set canvas size to match final output dimensions (after rotation)
        if (userRotation === 90 || userRotation === 270) {
            // For 90°/270° rotation, swap dimensions for final output
            canvas.width = trimmedHeight;
            canvas.height = trimmedWidth;
        } else {
            // For 0°/180° rotation, keep original trimmed dimensions
            canvas.width = trimmedWidth;
            canvas.height = trimmedHeight;
        }
        
        // Apply rotation transform if needed
        if (userRotation !== 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Canvas rotate() is counter-clockwise, but OpenCV and user expect clockwise
            // So we need to NEGATE the rotation to match OpenCV preview behavior
            ctx.rotate((-userRotation * Math.PI) / 180);
            
            // Adjust draw position based on rotation
            if (userRotation === 90 || userRotation === 270) {
                ctx.translate(-trimmedHeight / 2, -trimmedWidth / 2);
            } else {
                ctx.translate(-trimmedWidth / 2, -trimmedHeight / 2);
            }
        }
        
        // Draw the trimmed region using transformed coordinates
        ctx.drawImage(
            video,
            actualTrimLeft, actualTrimTop, trimmedWidth, trimmedHeight, // Source (trimmed region with transformed coordinates)
            0, 0, trimmedWidth, trimmedHeight // Destination (full canvas)
        );
        
        if (userRotation !== 0) {
            ctx.restore();
        }
        
        } // End of else block for fallback method

        // Convert to blob
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                resolve({
                    blob: blob,
                    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
                    width: canvas.width,
                    height: canvas.height,
                    resolution: cameraInfo.resolution,
                    timestamp: new Date().toISOString()
                });
            }, 'image/jpeg', 0.9);
        });
    }

    cacheSettings() {
        const settings = {
            leftCamera: this.getCameraSettings('left'),
            rightCamera: this.getCameraSettings('right'),
            deviceListHash: this.lastDeviceListHash,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(settings));
            console.log('📦 Camera settings cached');
        } catch (error) {
            console.warn('Failed to cache camera settings:', error);
        }
    }

    applyCachedSettings() {
        console.log('🔄 Camera manager: Skipping cached settings to avoid conflicts with settings manager');
        return; // Temporarily disable camera manager cache
        
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return;

            const settings = JSON.parse(cached);
            console.log('📦 Camera manager cached settings:', settings);
            
            // Check if device list has changed
            if (settings.deviceListHash !== this.lastDeviceListHash) {
                console.log('📋 Device list changed, ignoring cached settings');
                localStorage.removeItem(this.cacheKey);
                return;
            }

            // Check cache age (max 7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (Date.now() - settings.timestamp > maxAge) {
                console.log('⏰ Cached settings expired');
                localStorage.removeItem(this.cacheKey);
                return;
            }

            console.log('🔄 Applying cached camera settings');
            
            // Apply settings for both cameras
            ['left', 'right'].forEach(side => {
                const cameraSettings = settings[`${side}Camera`];
                if (cameraSettings) {
                    this.applyCameraSettings(side, cameraSettings);
                }
            });

        } catch (error) {
            console.warn('Failed to apply cached settings:', error);
            localStorage.removeItem(this.cacheKey);
        }
    }

    applyCameraSettings(side, settings) {
        // Apply device selection
        const deviceSelect = document.getElementById(`${side}-camera-device`);
        if (deviceSelect && settings.deviceId) {
            const option = Array.from(deviceSelect.options).find(opt => opt.value === settings.deviceId);
            if (option) {
                deviceSelect.value = settings.deviceId;
            }
        }

        // Apply resolution
        const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
        if (resolutionSelect && settings.resolution) {
            const option = Array.from(resolutionSelect.options).find(opt => opt.value === settings.resolution);
            if (option) {
                resolutionSelect.value = settings.resolution;
            }
        }

        // Apply rotation
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        if (rotateSelect && settings.rotation !== undefined) {
            rotateSelect.value = settings.rotation.toString();
            console.log(`🔄 Camera manager: Applied ${side} rotation: ${settings.rotation}`);
        }

        console.log(`⚙️ Applied cached settings for ${side} camera:`, settings);
    }

    getCameraSettings(side) {
        const deviceSelect = document.getElementById(`${side}-camera-device`);
        const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);

        const settings = {
            deviceId: deviceSelect?.value || '',
            resolution: resolutionSelect?.value || '720p',
            rotation: rotateSelect ? parseInt(rotateSelect.value, 10) : 0
        };
        
        return settings;
    }

    setupTrimValidation() {
        ['left', 'right'].forEach(side => {
            ['top', 'bottom', 'left', 'right'].forEach(direction => {
                const input = document.getElementById(`${side}-${direction}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        let value = parseInt(e.target.value, 10);
                        if (isNaN(value) || value < 0) {
                            value = 0;
                        }
                        if (value > 500) {
                            value = 500;
                        }
                        e.target.value = value;
                    });
                }
            });
        });
    }

    showCameraError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const textElement = document.getElementById('loading-text');
            if (textElement) {
                textElement.textContent = `❌ ${message}`;
                textElement.style.color = '#dc3545';
            }
        }
        console.error('Camera Error:', message);
    }

    showCameraWarning(message) {
        // Show warning in console
        console.warn('Camera Warning:', message);
        
        // Try to show warning in UI if possible
        const overlay = document.getElementById('loading-overlay');
        if (overlay && overlay.style.display !== 'none') {
            const textElement = document.getElementById('loading-text');
            if (textElement) {
                textElement.textContent = `⚠️ ${message}`;
                textElement.style.color = '#ffc107';
            }
        } else {
            // Show a temporary warning message
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ffc107;
                color: #000;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                max-width: 300px;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;
            warningDiv.textContent = message;
            document.body.appendChild(warningDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (warningDiv.parentNode) {
                    warningDiv.parentNode.removeChild(warningDiv);
                }
            }, 5000);
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async testResolutionSupport() {
        console.log('🔍 Testing resolution support for cameras...');
        
        for (const camera of this.availableCameras) {
            const resolutions = [];
            const constraints = this.getResolutionConstraints();
            
            for (const [name, constraint] of Object.entries(constraints)) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            deviceId: { exact: camera.deviceId },
                            ...constraint
                        }
                    });
                    
                    // Test if we actually got the requested resolution
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    await new Promise(resolve => {
                        video.addEventListener('loadedmetadata', resolve);
                        video.play();
                    });
                    
                    const actualWidth = video.videoWidth;
                    const actualHeight = video.videoHeight;
                    
                    resolutions.push({
                        name: name,
                        width: actualWidth,
                        height: actualHeight,
                        label: `${name} (${actualWidth}×${actualHeight})`
                    });
                    
                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                    
                } catch (error) {
                    console.log(`📹 ${camera.label}: ${name} not supported`);
                }
            }
            
            this.supportedResolutions.set(camera.deviceId, resolutions);
            console.log(`📹 ${camera.label}: Supported resolutions:`, resolutions.map(r => r.label));
        }
    }

    populateDeviceDropdowns() {
        ['left', 'right'].forEach(side => {
            const deviceSelect = document.getElementById(`${side}-camera-device`);
            const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
            
            if (deviceSelect) {
                deviceSelect.innerHTML = '<option value="">Select Camera</option>';
                this.availableCameras.forEach(camera => {
                    const option = document.createElement('option');
                    option.value = camera.deviceId;
                    option.textContent = camera.label || 'Unknown Camera';
                    deviceSelect.appendChild(option);
                });

                // Update resolution dropdown when device changes
                deviceSelect.addEventListener('change', () => {
                    this.updateResolutionDropdown(side);
                    
                    // Auto-start camera when device is selected
                    if (deviceSelect.value && this.isInitialized) {
                        setTimeout(() => this.startCamera(side), 100);
                    }
                });
            }

            if (resolutionSelect) {
                // Initialize resolution dropdown with all available resolutions
                this.initializeResolutionDropdown(side);
                
                // Auto-restart camera when resolution changes
                resolutionSelect.addEventListener('change', () => {
                    const deviceSelect = document.getElementById(`${side}-camera-device`);
                    if (deviceSelect?.value && this.isInitialized) {
                        console.log(`🔄 Resolution changed for ${side}, restarting camera...`);
                        setTimeout(() => this.startCamera(side), 500);
                    }
                });
            }
        });
        
        // After populating dropdowns, restore device selections from settings manager
        this.restoreDeviceSelections();
    }

    /**
     * Restore device selections from settings manager after dropdowns are populated
     */
    restoreDeviceSelections(retryCount = 0) {
        if (window.settingsManager && window.settingsManager.settings) {
            const settings = window.settingsManager.settings;
            
            // Restore left camera device
            const leftDeviceSelect = document.getElementById('left-camera-device');
            if (leftDeviceSelect && settings.leftCameraDevice) {
                const leftOption = Array.from(leftDeviceSelect.options).find(opt => opt.value === settings.leftCameraDevice);
                if (leftOption) {
                    leftDeviceSelect.value = settings.leftCameraDevice;
                    this.updateResolutionDropdown('left');
                    
                    // Restore resolution after dropdown is updated (with small delay)
                    setTimeout(() => {
                        if (settings.leftCameraResolution) {
                            const leftResolutionSelect = document.getElementById('left-camera-resolution');
                            if (leftResolutionSelect) {
                                const leftResOption = Array.from(leftResolutionSelect.options).find(opt => opt.value === settings.leftCameraResolution);
                                if (leftResOption) {
                                    leftResolutionSelect.value = settings.leftCameraResolution;
                                } else {
                                    console.warn(`⚠️ Left camera resolution not found: ${settings.leftCameraResolution}`);
                                }
                            }
                        }
                    }, 100); // Small delay to ensure dropdown is populated
                } else {
                    console.warn(`⚠️ Left camera device not found: ${settings.leftCameraDevice}`);
                }
            }
            
            // Restore right camera device
            const rightDeviceSelect = document.getElementById('right-camera-device');
            if (rightDeviceSelect && settings.rightCameraDevice) {
                const rightOption = Array.from(rightDeviceSelect.options).find(opt => opt.value === settings.rightCameraDevice);
                if (rightOption) {
                    rightDeviceSelect.value = settings.rightCameraDevice;
                    this.updateResolutionDropdown('right');
                    
                    // Restore resolution after dropdown is updated (with small delay)
                    setTimeout(() => {
                        if (settings.rightCameraResolution) {
                            const rightResolutionSelect = document.getElementById('right-camera-resolution');
                            if (rightResolutionSelect) {
                                const rightResOption = Array.from(rightResolutionSelect.options).find(opt => opt.value === settings.rightCameraResolution);
                                if (rightResOption) {
                                    rightResolutionSelect.value = settings.rightCameraResolution;
                                } else {
                                    console.warn(`⚠️ Right camera resolution not found: ${settings.rightCameraResolution}`);
                                }
                            }
                        }
                    }, 100); // Small delay to ensure dropdown is populated
                } else {
                    console.warn(`⚠️ Right camera device not found: ${settings.rightCameraDevice}`);
                }
            }
        } else if (retryCount < 5) {
            // Retry after a short delay to allow settings manager to initialize
            setTimeout(() => {
                this.restoreDeviceSelections(retryCount + 1);
            }, 500);
        } else {
            console.error('❌ Failed to restore device selections after 5 attempts');
        }
    }

    updateResolutionDropdown(side) {
        const deviceSelect = document.getElementById(`${side}-camera-device`);
        const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
        
        if (!deviceSelect || !resolutionSelect) return;
        
        const deviceId = deviceSelect.value;
        const supportedResolutions = this.supportedResolutions.get(deviceId) || [];
        
        // Remember current selection if any
        const currentSelection = resolutionSelect.value;
        
        resolutionSelect.innerHTML = '';
        
        // Always show all resolution options, regardless of camera support
        const allResolutions = this.getResolutionConstraints();
        const allResolutionKeys = Object.keys(allResolutions);
        
        allResolutionKeys.forEach(resolution => {
            const option = document.createElement('option');
            option.value = resolution;
            
            // Check if this resolution was tested and supported
            const supportedRes = supportedResolutions.find(res => res.name === resolution);
            if (supportedRes) {
                // Show actual resolution if tested
                option.textContent = supportedRes.label;
            } else {
                // Show expected resolution with indicator that it's untested
                const constraint = allResolutions[resolution];
                option.textContent = `${resolution} (${constraint.width}×${constraint.height})`;
            }
            
            resolutionSelect.appendChild(option);
        });
        
        // Try to restore previous selection, or use default
        if (currentSelection && allResolutionKeys.includes(currentSelection)) {
            resolutionSelect.value = currentSelection;
        } else {
            // Default to 720p for compatibility
            resolutionSelect.value = '720p';
        }
    }

    /**
     * Start camera stream for a specific side
     */
    async startCamera(side) {
        try {
            const settings = this.getCameraSettings(side);
            if (!settings.deviceId) {
                this.showCameraError(`No camera device selected for ${side} side. Please select a camera from the dropdown.`);
                return false;
            }

            // Check if the selected camera device is still available
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                const selectedDevice = videoDevices.find(device => device.deviceId === settings.deviceId);
                
                if (!selectedDevice) {
                    this.showCameraError(`Selected camera for ${side} side is no longer available. Please refresh the page and select a different camera.`);
                    return false;
                }
            } catch (enumError) {
                console.warn('Could not enumerate devices:', enumError);
                // Continue anyway, getUserMedia will handle the error
            }

            // Check if this camera is already in use by the other side
            const otherSide = side === 'left' ? 'right' : 'left';
            const otherSideSettings = this.getCameraSettings(otherSide);
            if (otherSideSettings.deviceId === settings.deviceId && this.activeCameras.has(settings.deviceId)) {
                console.warn(`⚠️ Camera ${settings.deviceId} is already in use by ${otherSide} side. Stopping other side first.`);
                await this.stopCamera(otherSide);
            }

            // Stop existing camera if running
            await this.stopCamera(side);

            console.log(`🎬 Starting ${side} camera: ${settings.deviceId}`);

            // Get resolution constraints with fallback
            const resolutionConstraints = this.getResolutionConstraints();
            let constraint = resolutionConstraints[settings.resolution] || resolutionConstraints['720p'];

            let stream;
            const fallbackResolutions = [
                { name: settings.resolution, constraint: constraint },
                { name: '720p', constraint: resolutionConstraints['720p'] },
                { name: 'VGA', constraint: { width: 640, height: 480 } },
                { name: 'QVGA', constraint: { width: 320, height: 240 } },
                { name: 'basic', constraint: { width: { min: 200 }, height: { min: 150 } } },
                { name: 'minimal', constraint: {} }, // Just deviceId, no size constraints
            ];

            let lastError = null;
            
            // First try with exact deviceId constraint
            for (let i = 0; i < fallbackResolutions.length; i++) {
                const fallback = fallbackResolutions[i];
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { ...fallback.constraint, deviceId: { exact: settings.deviceId } }
                    });
                    break;
                } catch (error) {
                    lastError = error;
                    console.warn(`Failed to start ${side} camera with exact deviceId and ${fallback.name} resolution:`, error);
                }
            }
            
            // If exact deviceId failed, try with non-exact deviceId as fallback
            if (!stream) {
                console.warn(`⚠️ Exact deviceId failed for ${side} camera, trying non-exact constraint as fallback`);
                for (let i = 0; i < fallbackResolutions.length; i++) {
                    const fallback = fallbackResolutions[i];
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { ...fallback.constraint, deviceId: settings.deviceId }
                        });
                        console.warn(`⚠️ ${side} camera started with non-exact deviceId constraint`);
                        break;
                    } catch (error) {
                        lastError = error;
                        console.warn(`Failed to start ${side} camera with non-exact deviceId and ${fallback.name} resolution:`, error);
                    }
                }
            }

            if (!stream) {
                throw lastError || new Error('Failed to start camera stream');
            }

            // Create video element
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.srcObject = stream;

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                video.addEventListener('loadedmetadata', resolve);
                video.addEventListener('error', reject);
                setTimeout(() => reject(new Error('Video load timeout')), 5000);
            });

            await video.play();

            // Store active camera data
            this.activeCameras.set(settings.deviceId, {
                stream: stream,
                video: video,
                side: side,
                settings: settings
            });

            // Update preview
            this.updateCameraPreview(side, video);
            
            // Update resolution info
            this.updateResolutionInfo(side, `${video.videoWidth}×${video.videoHeight}`);

            console.log(`✅ ${side} camera started successfully: ${video.videoWidth}×${video.videoHeight}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to start ${side} camera:`, error);

            let errorMessage = `Failed to start ${side} camera`;
            if (error.name === 'OverconstrainedError') {
                errorMessage += ': Camera does not support the requested resolution. Try a different resolution or camera.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += ': No camera devices found. Please connect a camera and refresh the page.';
            } else if (error.name === 'NotAllowedError') {
                errorMessage += ': Camera access denied. Please grant permission and refresh the page.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += ': Camera is already in use by another application. Please close other applications using the camera and try again.';
            } else if (error.message.includes('deviceId')) {
                errorMessage += ': Selected camera is not available. This may happen in Chrome when cameras are busy. Please try selecting a different camera or refresh the page.';
            }

            this.showCameraError(errorMessage);
            return false;
        }
    }

    /**
     * Stop camera stream for a specific side
     */
    async stopCamera(side) {
        try {
            const settings = this.getCameraSettings(side);
            const cameraData = this.activeCameras.get(settings.deviceId);
            
            if (cameraData && cameraData.side === side) {
                // Stop all tracks
                if (cameraData.stream) {
                    cameraData.stream.getTracks().forEach(track => track.stop());
                }
                
                // Remove video element
                if (cameraData.video) {
                    cameraData.video.srcObject = null;
                }
                
                // Remove from active cameras
                this.activeCameras.delete(settings.deviceId);
                
                console.log(`⏹️ Stopped ${side} camera`);
            }

            // Stop preview animation
            if (window.openCVPreviewManager) {
                window.openCVPreviewManager.stopPreview(side);
            }
            
            // Clean up direct video preview
            const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
            if (previewElement) {
                const previewVideo = previewElement.querySelector('video');
                if (previewVideo) {
                    previewVideo.srcObject = null;
                    previewVideo.remove();
                }
            }

            // Clear preview
            this.updateCameraPreview(side, null);
            this.updateResolutionInfo(side, null);

        } catch (error) {
            console.error(`Failed to stop ${side} camera:`, error);
        }
    }

    /**
     * Auto-start cameras if they have valid cached settings
     */
    async autoStartCameras() {
        if (!this.isInitialized) {
            console.warn('Camera system not initialized yet');
            return;
        }

        if (!this.isConfigured) {
            console.log('⏭️ Skipping auto-start - cameras not configured yet');
            return;
        }

        console.log('🚀 Auto-starting cameras with valid settings...');

        const sides = ['left', 'right'];
        for (const side of sides) {
            const settings = this.getCameraSettings(side);
            if (settings.deviceId) {
                await this.startCamera(side);
                
                // Small delay between camera starts to avoid resource conflicts
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * Capture from both active cameras
     */
    async captureBothCameras() {
        const captures = {};
        // Use preview canvas for capture instead of raw video
        if (window.openCVPreviewManager) {
            // Left camera
            const leftCanvas = window.openCVPreviewManager.previewCanvases.get('left');
            if (leftCanvas) {
                captures.left = {
                    blob: await new Promise(res => leftCanvas.toBlob(res, 'image/jpeg', 0.9)),
                    dataUrl: leftCanvas.toDataURL('image/jpeg', 0.9),
                    width: leftCanvas.width,
                    height: leftCanvas.height,
                    resolution: this.getCameraSettings('left').resolution,
                    timestamp: new Date().toISOString()
                };
            }
            // Right camera
            const rightCanvas = window.openCVPreviewManager.previewCanvases.get('right');
            if (rightCanvas) {
                captures.right = {
                    blob: await new Promise(res => rightCanvas.toBlob(res, 'image/jpeg', 0.9)),
                    dataUrl: rightCanvas.toDataURL('image/jpeg', 0.9),
                    width: rightCanvas.width,
                    height: rightCanvas.height,
                    resolution: this.getCameraSettings('right').resolution,
                    timestamp: new Date().toISOString()
                };
            }
        }
        return Object.keys(captures).length > 0 ? captures : null;
    }

    /**
     * Capture full resolution images directly from raw video with proper rotation
     * This ensures we get the highest quality while matching preview orientation
     */
    async captureFullResolutionImages() {
        const captures = {};
        
        // First try to capture from OpenCV preview canvases (which have correct rotation)
        if (window.openCVPreviewManager) {
            
            // Left camera
            const leftCanvas = window.openCVPreviewManager.previewCanvases.get('left');
            const leftVideo = this.getVideoElement('left');
            if (leftCanvas && leftVideo && leftVideo.videoWidth > 0) {
                const leftCapture = await this.captureFullResFromCorrectlyRotatedPreview(leftCanvas, leftVideo, 'left');
                if (leftCapture) {
                    captures.left = leftCapture;
                }
            }
            
            // Right camera
            const rightCanvas = window.openCVPreviewManager.previewCanvases.get('right');
            const rightVideo = this.getVideoElement('right');
            if (rightCanvas && rightVideo && rightVideo.videoWidth > 0) {
                const rightCapture = await this.captureFullResFromCorrectlyRotatedPreview(rightCanvas, rightVideo, 'right');
                if (rightCapture) {
                    captures.right = rightCapture;
                }
            }
        } else {
            
            // Fallback to raw video (without rotation to avoid double rotation)
            const leftVideo = this.getVideoElement('left');
            if (leftVideo && leftVideo.videoWidth > 0) {
                const leftCapture = await this.captureFullResolutionFromRawVideo(leftVideo, 'left');
                if (leftCapture) {
                    captures.left = leftCapture;
                }
            }
            
            const rightVideo = this.getVideoElement('right');
            if (rightVideo && rightVideo.videoWidth > 0) {
                const rightCapture = await this.captureFullResolutionFromRawVideo(rightVideo, 'right');
                if (rightCapture) {
                    captures.right = rightCapture;
                }
            }
        }
        
        return Object.keys(captures).length > 0 ? captures : null;
    }

    /**
     * Capture full resolution that matches exactly what the user sees in preview
     * This creates a high-quality capture with the same orientation as the preview
     */
    async captureFullResFromCorrectlyRotatedPreview(previewCanvas, video, side) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get the user's rotation setting and trim values
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        const rotation = rotateSelect ? parseInt(rotateSelect.value, 10) : 0;
        
        // Get current trim values as percentages (0-100) for resolution independence
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        
        // Get full video dimensions
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // HYBRID APPROACH: Use preview canvas orientation but capture from high-res video
        // This gives us both correct orientation AND full resolution
        
        // The preview canvas is already rotated correctly, so we use it as orientation reference
        // but we apply the trim to the full resolution video to maintain quality
        
        if (previewCanvas) {
            // Apply trim percentages directly to the full resolution video
            // Since user sees correct orientation, trim values should be applied directly
            const trimTopPx = Math.round(videoHeight * trimTopPercent / 100);
            const trimBottomPx = Math.round(videoHeight * trimBottomPercent / 100);
            const trimLeftPx = Math.round(videoWidth * trimLeftPercent / 100);
            const trimRightPx = Math.round(videoWidth * trimRightPercent / 100);
            
            // Calculate trimmed area from full resolution video
            const sx = trimLeftPx;
            const sy = trimTopPx;
            const sw = videoWidth - trimLeftPx - trimRightPx;
            const sh = videoHeight - trimTopPx - trimBottomPx;
            
            if (sw <= 0 || sh <= 0) {
                console.warn(`Invalid trim dimensions for ${side}: ${sw}x${sh}`);
                return null;
            }
            
            // Create output canvas with correct dimensions based on rotation
            if (rotation === 90 || rotation === 270) {
                canvas.width = sh;  // Height becomes width
                canvas.height = sw; // Width becomes height
            } else {
                canvas.width = sw;
                canvas.height = sh;
            }
            
            // Apply rotation and draw the trimmed video
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            // --- ROTATION DIRECTION FIXED ---
            // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(video, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
            ctx.restore();
            
            console.log(`🎯 Captured high-res from video: ${canvas.width}×${canvas.height} (trim: T=${trimTopPercent}%, B=${trimBottomPercent}%, L=${trimLeftPercent}%, R=${trimRightPercent}%)`);
            
        } else {
            // Fallback: apply trim to raw video, then rotate the result
            const trimTopPx = Math.round(videoHeight * trimTopPercent / 100);
            const trimBottomPx = Math.round(videoHeight * trimBottomPercent / 100);
            const trimLeftPx = Math.round(videoWidth * trimLeftPercent / 100);
            const trimRightPx = Math.round(videoWidth * trimRightPercent / 100);
            
            const sx = trimLeftPx;
            const sy = trimTopPx;
            const sw = videoWidth - trimLeftPx - trimRightPx;
            const sh = videoHeight - trimTopPx - trimBottomPx;
            
            if (sw <= 0 || sh <= 0) {
                console.warn(`Invalid trim dimensions for ${side}: ${sw}x${sh}`);
                return null;
            }
            
            // Set canvas size based on rotation
            if (rotation === 90 || rotation === 270) {
                canvas.width = sh;
                canvas.height = sw;
            } else {
                canvas.width = sw;
                canvas.height = sh;
            }
            
            // Apply rotation transformation
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            // --- ROTATION DIRECTION FIXED ---
            // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(video, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
            ctx.restore();
            
            console.log(`🎯 Captured from raw video with rotation: ${canvas.width}×${canvas.height} (${rotation}°)`);
        }
        
        // Convert to blob with high quality
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                resolve({
                    blob: blob,
                    dataUrl: dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    resolution: this.getCameraSettings(side).resolution,
                    timestamp: new Date().toISOString()
                });
            }, 'image/jpeg', 0.95);
        });
    }

    /**
     * Capture from raw video WITHOUT rotation (for fallback when OpenCV not available)
     */
    async captureFullResolutionFromRawVideo(video, side) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use raw video dimensions without any rotation
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw without any rotation
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Convert to blob with high quality
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                resolve({
                    blob: blob,
                    dataUrl: dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    resolution: this.getCameraSettings(side).resolution,
                    timestamp: new Date().toISOString(),
                });
            }, 'image/jpeg', 0.95);
        });
    }

    updateCameraPreview(side, video) {
        const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
        if (!previewElement) {
            return;
        }

        // Stop any existing preview
        if (window.openCVPreviewManager) {
            window.openCVPreviewManager.stopPreview(side);
        }

        // Clear existing content
        previewElement.innerHTML = '';

        if (video) {
            // Wait for video to be ready before starting preview
            const startPreview = () => {
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    setTimeout(startPreview, 50);
                    return;
                }

                if (window.openCVPreviewManager && window.openCVPreviewManager.isOpenCVReady) {
                    console.log(`🎬 Using OpenCV preview for ${side} camera`);
                    try {
                        const trimOptions = this.getCurrentTrimOptions(side);
                        window.openCVPreviewManager.startPreview(side, video, previewElement, {
                            ...trimOptions,
                            fillMode: 'crop',
                            showTrimPreview: false // Disable trim preview - show full image in preview
                        });

                        if (!window.openCVPreviewManager.isOpenCVReady) {
                            console.log(`⚠️ OpenCV became unavailable for ${side}, switching to hybrid preview`);
                            window.openCVPreviewManager.stopPreview(side);
                            this.createHybridPreview(side, video, previewElement);
                        }
                    } catch (error) {
                        console.error(`OpenCV preview failed for ${side}:`, error);
                        window.openCVPreviewManager.stopPreview(side);
                        this.createHybridPreview(side, video, previewElement);
                    }
                } else {
                    console.log(`🔄 OpenCV not ready for ${side}, using hybrid preview (isOpenCVReady: ${window.openCVPreviewManager?.isOpenCVReady})`);
                    
                    // Try to initialize OpenCV one more time
                    if (window.openCVPreviewManager && typeof window.forceOpenCVInit === 'function') {
                        setTimeout(() => {
                            console.log(`🔄 Retrying OpenCV initialization for ${side} camera...`);
                            window.forceOpenCVInit();
                        }, 500);
                    }
                    
                    this.createHybridPreview(side, video, previewElement);
                }
            };

            if (video.readyState >= 2 && !video.paused && !video.ended) {
                startPreview();
            } else {
                video.addEventListener('play', startPreview);
                video.addEventListener('canplay', startPreview);
                video.addEventListener('loadedmetadata', startPreview);
            }

            this.setupPreviewSettingsListeners(side);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'camera-placeholder';
            placeholder.textContent = `${side.charAt(0).toUpperCase() + side.slice(1)} Camera`;
            previewElement.appendChild(placeholder);
        }
    }

    /**
     * Create basic preview fallback when OpenCV is not available
     */
    createBasicPreview(side, video, previewElement) {
        
        // Create canvas for basic preview
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.borderRadius = '4px';
        canvas.style.transition = 'transform 0.2s';
        canvas.style.display = 'block';
        canvas.style.backgroundColor = '#000';
        
        previewElement.appendChild(canvas);

        // Basic animation loop
        let animationId = null;
        const animate = () => {
            this.drawBasicFrame(side, video, canvas);
            animationId = requestAnimationFrame(animate);
        };

        // Start animation
        animate();

        // Store animation ID for cleanup
        canvas.dataset.animationId = animationId;
    }

    /**
     * Draw basic frame without OpenCV
     */
    drawBasicFrame(side, video, canvas) {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return;
        }

        // Get container dimensions and update canvas
        const containerRect = canvas.parentElement.getBoundingClientRect();
        const containerWidth = Math.floor(containerRect.width);
        const containerHeight = Math.floor(containerRect.height);
        
        if (canvas.width !== containerWidth || canvas.height !== containerHeight) {
            canvas.width = containerWidth;
            canvas.height = containerHeight;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get current settings as percentages for consistency
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        const rotation = parseInt(document.getElementById(`${side}-camera-rotate`)?.value || 0, 10);

        // Convert percentage trim values to pixels
        const trimTop = Math.round(video.videoHeight * trimTopPercent / 100);
        const trimBottom = Math.round(video.videoHeight * trimBottomPercent / 100);
        const trimLeft = Math.round(video.videoWidth * trimLeftPercent / 100);
        const trimRight = Math.round(video.videoWidth * trimRightPercent / 100);

        // Calculate trimmed area (this is what we'll actually capture)
        const sx = trimLeft;
        const sy = trimTop;
        const sw = video.videoWidth - trimLeft - trimRight;
        const sh = video.videoHeight - trimTop - trimBottom;

        if (sw <= 0 || sh <= 0) {
            return;
        }

        // Apply rotation transformation
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // --- ROTATION DIRECTION FIXED ---
        // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
        if (rotation !== 0) {
            ctx.rotate((rotation * Math.PI) / 180);
        }

        // Calculate effective dimensions after rotation for proper scaling
        let effectiveWidth, effectiveHeight;
        if (rotation === 90 || rotation === 270) {
            // After 90°/270° rotation, width and height are swapped
            effectiveWidth = sh;
            effectiveHeight = sw;
        } else {
            // After 0°/180° rotation, dimensions stay the same
            effectiveWidth = sw;
            effectiveHeight = sh;
        }

        // Smart scaling: COVER mode to fill the frame (no black bars)
        // Scale to cover the entire canvas while maintaining aspect ratio
        const scaleX = canvas.width / effectiveWidth;
        const scaleY = canvas.height / effectiveHeight;
        const scale = Math.max(scaleX, scaleY);
        
        // Calculate draw dimensions based on original trimmed video dimensions
        const drawWidth = sw * scale;
        const drawHeight = sh * scale;

        // Center the video (some parts may be cropped due to COVER scaling)
        const drawX = -drawWidth / 2;
        const drawY = -drawHeight / 2;

        // Draw the trimmed video area
        ctx.drawImage(video, sx, sy, sw, sh, drawX, drawY, drawWidth, drawHeight);

        ctx.restore();
    }

    /**
     * Create direct video preview (similar to working example)
     * Uses CSS object-fit instead of canvas rendering
     */
    createDirectVideoPreview(side, video, previewElement) {
        
        // Clear existing content
        previewElement.innerHTML = '';
        
        // Clone the video element for preview
        const previewVideo = video.cloneNode(true);
        previewVideo.autoplay = true;
        previewVideo.playsInline = true;
        previewVideo.muted = true;
        previewVideo.srcObject = video.srcObject;
        previewVideo.setAttribute('data-camera', side); // Add data attribute for QR detection
        
        // Ensure the video fills the container
        previewVideo.style.position = 'absolute';
        previewVideo.style.top = '0';
        previewVideo.style.left = '0';
        previewVideo.style.width = '100%';
        previewVideo.style.height = '100%';
        previewVideo.style.objectFit = 'cover';
        previewVideo.style.borderRadius = '4px';
        
        // Apply rotation if needed (convert clockwise user setting to CSS transform)
        const rotation = parseInt(document.getElementById(`${side}-camera-rotate`)?.value || 0, 10);
        if (rotation !== 0) {
            // CSS transform rotate() uses positive values for clockwise rotation (same as user setting)
            // So we can use the rotation value directly
            previewVideo.style.transform = `rotate(${rotation}deg)`;
        }
        
        // Add to preview container
        previewElement.appendChild(previewVideo);
        
        // Listen for setting changes to update rotation
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        if (rotateSelect) {
            const updateRotation = () => {
                const newRotation = parseInt(rotateSelect.value, 10);
                // CSS transform rotate() uses positive values for clockwise (same as user setting)
                previewVideo.style.transform = newRotation !== 0 ? `rotate(${newRotation}deg)` : '';
            };
            
            rotateSelect.addEventListener('change', updateRotation);
            
            // Store the listener for cleanup
            previewVideo.dataset.rotationListener = 'attached';
        }
        
        // Store reference for cleanup
        video.dataset.previewVideo = 'attached';
        
        return previewVideo;
    }

    /**
     * Create hybrid preview that uses direct video when no trim is applied,
     * and falls back to canvas when trim values are present
     */
    createHybridPreview(side, video, previewElement) {
        
        // Clean up any existing preview first
        this.cleanupOldPreview(side, previewElement);
        
        // Get current trim values as percentages for consistency
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        
        const hasTrim = trimTopPercent > 0 || trimBottomPercent > 0 || trimLeftPercent > 0 || trimRightPercent > 0;
        
        if (!hasTrim) {
            // No trim values, use direct video approach (like working example)
            return this.createDirectVideoPreview(side, video, previewElement);
        } else {
            // Has trim values, use canvas approach
            return this.createBasicPreview(side, video, previewElement);
        }
    }

    /**
     * Setup listeners for preview settings changes
     */
    setupPreviewSettingsListeners(side) {
        // Listen for rotation changes
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        if (rotateSelect) {
            rotateSelect.onchange = () => {
                if (window.openCVPreviewManager) {
                    window.openCVPreviewManager.updatePreviewSettings(side, {
                        rotation: parseInt(rotateSelect.value, 10)
                    });
                } else {
                    // If using basic preview, refresh it to apply rotation
                    const video = this.getVideoElement(side);
                    if (video) {
                        const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
                        if (previewElement) {
                            this.createHybridPreview(side, video, previewElement);
                        }
                    }
                }
            };
        }

        // Listen for trim changes with debouncing
        let trimDebounceTimer = null;
        ['top', 'bottom', 'left', 'right'].forEach(dir => {
            const trimInput = document.getElementById(`${side}-${dir}`);
            if (trimInput) {
                trimInput.addEventListener('input', () => {
                    // Clear existing timer
                    if (trimDebounceTimer) {
                        clearTimeout(trimDebounceTimer);
                    }
                    
                    // Debounce trim updates
                    trimDebounceTimer = setTimeout(() => {
                        if (window.openCVPreviewManager) {
                            const trimOptions = this.getCurrentTrimOptions(side);
                            window.openCVPreviewManager.updatePreviewSettings(side, {
                                ...trimOptions,
                                fillMode: 'crop',
                                showTrimPreview: false // Disable trim preview - show full image in preview
                            });
                        } else {
                            // If using basic/hybrid preview, refresh it to apply trim changes
                            const video = this.getVideoElement(side);
                            if (video) {
                                const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
                                if (previewElement) {
                                    this.createHybridPreview(side, video, previewElement);
                                }
                            }
                        }
                    }, 20); // 20ms debounce
                });
            }
        });
    }

    /**
     * Load cached camera data for fast initialization
     */
    loadCachedCameraData() {
        try {
            // Check if we have cached camera data
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return false;

            const cacheData = JSON.parse(cached);
            console.log('📦 Found cached camera data:', cacheData);
            
            // Check if this is the new cache format (has cameras array and resolutions)
            if (!cacheData.cameras || !cacheData.resolutions) {
                console.log('📋 Old cache format detected, clearing cache');
                localStorage.removeItem(this.cacheKey);
                return false;
            }
            
            // Check cache age (max 7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (Date.now() - cacheData.timestamp > maxAge) {
                console.log('⏰ Cached camera data expired');
                localStorage.removeItem(this.cacheKey);
                return false;
            }

            // Load cached camera list and resolutions
            this.availableCameras = cacheData.cameras || [];
            this.supportedResolutions = new Map(cacheData.resolutions || []);
            this.lastDeviceListHash = cacheData.deviceListHash;
            
            // Validate that we actually have cameras
            if (this.availableCameras.length === 0) {
                console.log('📋 No cameras in cache, clearing cache');
                localStorage.removeItem(this.cacheKey);
                return false;
            }
            
            console.log(`📷 Loaded ${this.availableCameras.length} cameras from cache`);
            return true;
        } catch (error) {
            console.warn('Failed to load cached camera data:', error);
            localStorage.removeItem(this.cacheKey);
            return false;
        }
    }

    /**
     * Populate dropdowns from cached camera data
     */
    populateDropdownsFromCache() {
        console.log('📋 Populating dropdowns from cached data...');
        
        ['left', 'right'].forEach(side => {
            const deviceSelect = document.getElementById(`${side}-camera-device`);
            const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
            
            if (deviceSelect) {
                deviceSelect.innerHTML = '<option value="">Select Camera</option>';
                this.availableCameras.forEach(camera => {
                    const option = document.createElement('option');
                    option.value = camera.deviceId;
                    option.textContent = camera.label || 'Unknown Camera';
                    deviceSelect.appendChild(option);
                });

                // Update resolution dropdown when device changes
                deviceSelect.addEventListener('change', () => {
                    this.updateResolutionDropdown(side);
                    
                    // Check for duplicate camera selection
                    if (deviceSelect.value) {
                        const otherSide = side === 'left' ? 'right' : 'left';
                        const otherDeviceSelect = document.getElementById(`${otherSide}-camera-device`);
                        if (otherDeviceSelect && otherDeviceSelect.value === deviceSelect.value) {
                            console.warn(`⚠️ Warning: Same camera selected for both sides. This may cause issues in Chrome.`);
                            this.showCameraWarning(`Warning: You've selected the same camera for both ${side} and ${otherSide} sides. This may cause display issues in Chrome. Consider using different cameras for optimal performance.`);
                        }
                    }
                    
                    // Auto-start camera when device is selected
                    if (deviceSelect.value && this.isInitialized) {
                        setTimeout(() => this.startCamera(side), 100);
                    }
                });
            }

            if (resolutionSelect) {
                // Initialize resolution dropdown with all available resolutions
                this.initializeResolutionDropdown(side);
                
                // Auto-restart camera when resolution changes
                resolutionSelect.addEventListener('change', () => {
                    const deviceSelect = document.getElementById(`${side}-camera-device`);
                    if (deviceSelect?.value && this.isInitialized) {
                        console.log(`🔄 Resolution changed for ${side}, restarting camera...`);
                        setTimeout(() => this.startCamera(side), 500);
                    }
                });
            }
        });
        
        // After populating dropdowns, restore device selections from settings manager
        this.restoreDeviceSelections();
    }

    /**
     * Update camera configuration title color based on cache state
     * @param {boolean} isConfigured - Whether cameras are already configured
     */
    updateConfigurationButton(isConfigured) {
        const configTitle = document.getElementById('camera-config-title');
        if (!configTitle) return;
        
        if (isConfigured) {
            // Cache exists - show green (cameras configured)
            configTitle.style.color = '#28a745';
            configTitle.title = 'Cameras configured! Click to reconfigure';
            configTitle.innerHTML = 'Camera Configuration';
        } else {
            // No cache - show red (cameras need configuration)
            configTitle.style.color = '#dc3545';
            configTitle.title = 'Click to configure cameras';
            configTitle.innerHTML = 'Camera Configuration';
        }
    }

    /**
     * Setup clickable camera configuration title
     */
    showConfigurationButton() {
        console.log('🔧 Setting up clickable camera configuration title...');
        
        // Find the camera configuration title
        const configTitle = document.getElementById('camera-config-title');
        if (!configTitle) {
            console.error('❌ Camera configuration title not found in HTML');
            return;
        }

        // Add click event listener
        configTitle.addEventListener('click', () => {
            this.configureCameras();
        });

        // Add hover effects
        configTitle.addEventListener('mouseenter', () => {
            configTitle.style.opacity = '0.8';
        });
        
        configTitle.addEventListener('mouseleave', () => {
            configTitle.style.opacity = '1';
        });
        
        console.log('✅ Camera configuration title setup complete');
    }

    /**
     * Manual camera configuration (full detection and testing)
     */
    async configureCameras() {
        console.log('🎥 Starting camera configuration...');
        
        const configTitle = document.getElementById('camera-config-title');
        
        if (configTitle) {
            configTitle.innerHTML = 'Detecting Cameras...';
            configTitle.style.color = '#ffc107';
            configTitle.style.pointerEvents = 'none';
        }

        try {
            // Show loading message
            this.showLoadingMessage('🔍 Detecting cameras and testing resolutions...');
            
            // Request permissions first
            await this.requestCameraPermissions();
            configTitle && (configTitle.innerHTML = 'Testing Resolutions...');
            
            // Enumerate devices
            await this.enumerateDevices();
            
            // Test resolution support for each camera (this is the slow part)
            await this.testResolutionSupport();
            
            // Cache the detected camera data
            this.cacheCameraData();
            
            // Populate UI dropdowns
            this.populateDeviceDropdowns();
            
            // Mark as configured
            this.isConfigured = true;
            
            console.log('✅ Camera configuration completed successfully');
            
            // Update title to configured state
            this.updateConfigurationButton(true);
            
            if (configTitle) {
                configTitle.style.pointerEvents = 'auto';
            }

            // Enable dropdowns
            ['left', 'right'].forEach(side => {
                const deviceSelect = document.getElementById(`${side}-camera-device`);
                const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
                
                if (deviceSelect) deviceSelect.disabled = false;
                if (resolutionSelect) resolutionSelect.disabled = false;
            });
            
            // Auto-start cameras with valid settings
            setTimeout(() => {
                this.autoStartCameras();
            }, 200);
            
            // Hide loading message
            this.hideLoadingMessage();
            
            return true;
        } catch (error) {
            console.error('❌ Camera configuration failed:', error);
            this.showCameraError('Failed to configure cameras: ' + error.message);
            
            // Reset title to initial state
            this.updateConfigurationButton(false);
            
            if (configTitle) {
                configTitle.style.pointerEvents = 'auto';
            }
            
            this.hideLoadingMessage();
            return false;
        }
    }

    /**
     * Cache camera data for fast future loads
     */
    cacheCameraData() {
        const cacheData = {
            version: '1.0',
            timestamp: Date.now(),
            deviceListHash: this.lastDeviceListHash,
            cameras: this.availableCameras,
            resolutions: Array.from(this.supportedResolutions.entries())
        };

        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
            console.log('📦 Camera data cached successfully');
        } catch (error) {
            console.warn('Failed to cache camera data:', error);
        }
    }

    /**
     * Show loading message during configuration
     */
    showLoadingMessage(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const textElement = document.getElementById('loading-text');
            if (textElement) {
                textElement.textContent = message;
                textElement.style.color = '#007bff';
            }
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading message
     */
    hideLoadingMessage() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Clear old cache format to force reconfiguration
     */
    clearOldCache() {
        try {
            console.log('🧹 Clearing old cache format to force reconfiguration');
            localStorage.removeItem(this.cacheKey);
            return true;
        } catch (error) {
            console.warn('Failed to clear cache:', error);
            return false;
        }
    }

    /**
     * Cleanup old cache keys
     */
    cleanupOldCache() {
        try {
            localStorage.removeItem('bookletScannerCameraCache'); // Remove old cache key
            console.log('🧹 Cleaned up old cache format');
        } catch (error) {
            console.warn('Failed to cleanup old cache:', error);
        }
    }

    /**
     * Setup basic UI without camera detection
     */
    setupBasicUI() {
        console.log('🎨 Setting up basic UI...');
        
        ['left', 'right'].forEach(side => {
            const deviceSelect = document.getElementById(`${side}-camera-device`);
            const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
            
            if (deviceSelect) {
                deviceSelect.innerHTML = '<option value="">Configure cameras first</option>';
                deviceSelect.disabled = true;
            }

            if (resolutionSelect) {
                resolutionSelect.innerHTML = '<option value="">Configure cameras first</option>';
                resolutionSelect.disabled = true;
            }
        });
    }

    /**
     * Initialize resolution dropdown with all available resolutions
     */
    initializeResolutionDropdown(side) {
        const resolutionSelect = document.getElementById(`${side}-camera-resolution`);
        if (!resolutionSelect) return;
        
        resolutionSelect.innerHTML = '';
        
        // Always show all resolution options
        const allResolutions = this.getResolutionConstraints();
        const allResolutionKeys = Object.keys(allResolutions);
        
        allResolutionKeys.forEach(resolution => {
            const option = document.createElement('option');
            option.value = resolution;
            
            // Show expected resolution dimensions
            const constraint = allResolutions[resolution];
            option.textContent = `${resolution} (${constraint.width}×${constraint.height})`;
            
            resolutionSelect.appendChild(option);
        });
        
        // Default to 720p for compatibility
        resolutionSelect.value = '720p';
    }

    /**
     * Get current trim options for a camera side
     */
    getCurrentTrimOptions(side) {
        // Read as percentages for consistency with other methods
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        
        // Get video dimensions for conversion
        const video = this.getVideoElement(side);
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            // Convert percentages to pixels
            const trimTop = Math.round(video.videoHeight * trimTopPercent / 100);
            const trimBottom = Math.round(video.videoHeight * trimBottomPercent / 100);
            const trimLeft = Math.round(video.videoWidth * trimLeftPercent / 100);
            const trimRight = Math.round(video.videoWidth * trimRightPercent / 100);
            
            return {
                trimTop,
                trimBottom,
                trimLeft,
                trimRight,
                trimTopPercent,
                trimBottomPercent,
                trimLeftPercent,
                trimRightPercent
            };
        } else {
            // Fallback if video not available
            return {
                trimTop: 0,
                trimBottom: 0,
                trimLeft: 0,
                trimRight: 0,
                trimTopPercent,
                trimBottomPercent,
                trimLeftPercent,
                trimRightPercent
            };
        }
    }

    /**
     * Synchronize settings with preview updates
     */
    synchronizePreviewSettings(side) {
        const settingsManager = window.bookletScannerApp?.settingsManager;
        if (!settingsManager) return;

        const settings = settingsManager.getCurrentTrimOptions(side);
        if (window.openCVPreviewManager) {
            window.openCVPreviewManager.updatePreviewSettings(side, {
                ...settings,
                fillMode: 'crop'
            });
        }

        console.log(`🔄 Synchronized ${side} preview settings:`, settings);
    }

    /**
     * Capture image and update preview pages feed
     */
    async captureImageAndUpdateFeed(side) {
        const videoElement = document.getElementById(`${side}-camera-video`);
        if (!videoElement) {
            console.error(`❌ Video element for ${side} not found`);
            return;
        }

        const settingsManager = window.bookletScannerApp?.settingsManager;
        if (!settingsManager) {
            console.error('❌ SettingsManager not initialized');
            return;
        }

        const trimOptions = settingsManager.getCurrentTrimOptions(side);
        const capturedImage = await window.openCVPreviewManager.captureProcessedImage(side, videoElement, trimOptions);

        if (capturedImage) {
            const previewContainer = document.getElementById('preview-pages-feed');
            if (previewContainer) {
                const imgElement = document.createElement('img');
                imgElement.src = capturedImage.toDataURL();
                imgElement.alt = `${side} captured image`;
                imgElement.className = 'preview-image';
                previewContainer.appendChild(imgElement);
                console.log(`📸 Image captured and added to preview feed for ${side}`);
            } else {
                console.error('❌ Preview pages feed container not found');
            }
        } else {
            console.error(`❌ Failed to capture image for ${side}`);
        }
    }

    /**
     * Bind space bar to capture image without pop-up
     */
    bindSpaceBarCapture() {
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                const activeSide = this.getActiveSide(); // Assume a method to get active camera side
                if (activeSide) {
                    this.captureImageAndUpdateFeed(activeSide);
                }
            }
        });
    }

    /**
     * Get the video element for a specific camera side
     */
    getVideoElement(side) {
        const settings = this.getCameraSettings(side);
        const cameraData = this.activeCameras.get(settings.deviceId);
        return cameraData ? cameraData.video : null;
    }

    /**
     * Clean up old preview elements before creating new ones
     */
    cleanupOldPreview(side, previewElement) {
        // Stop any existing animation frames
        const existingCanvas = previewElement.querySelector('canvas');
        if (existingCanvas && existingCanvas.dataset.animationId) {
            cancelAnimationFrame(parseInt(existingCanvas.dataset.animationId));
        }
        
        // Remove all existing preview content
        previewElement.innerHTML = '';
    }

    /**
     * Capture both HD (full-res) and LD (thumbnail) images directly from the raw video element at full camera resolution
     * This does NOT affect preview or UI, and uses the same trim/rotation logic as the preview
     * @param {string} side - 'left' or 'right'
     * @param {Object} options - Capture options
     * @param {boolean} options.skipEnhancement - Skip image enhancement for faster capture
     * @returns {Promise<{hd: {blob, dataUrl, width, height}, ld: {blob, dataUrl, width, height}}|null>}
     */
    async captureFullResHDLDFromVideo(side, options = {}) {
        const { skipEnhancement = false } = options;
        const video = this.getVideoElement(side);
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

        // Get trim and rotation settings as percentages for consistency
        const trimTopPercent = Math.max(0, parseFloat(document.getElementById(`${side}-top`)?.value || 0));
        const trimBottomPercent = Math.max(0, parseFloat(document.getElementById(`${side}-bottom`)?.value || 0));
        const trimLeftPercent = Math.max(0, parseFloat(document.getElementById(`${side}-left`)?.value || 0));
        const trimRightPercent = Math.max(0, parseFloat(document.getElementById(`${side}-right`)?.value || 0));
        const rotateSelect = document.getElementById(`${side}-camera-rotate`);
        const rotation = rotateSelect ? parseInt(rotateSelect.value, 10) : 0;

        // Convert percentage trim values to pixels
        const trimTop = Math.round(video.videoHeight * trimTopPercent / 100);
        const trimBottom = Math.round(video.videoHeight * trimBottomPercent / 100);
        const trimLeft = Math.round(video.videoWidth * trimLeftPercent / 100);
        const trimRight = Math.round(video.videoWidth * trimRightPercent / 100);

        // HYBRID APPROACH: Use preview canvas orientation but capture from high-res video
        // This gives us both correct orientation AND full resolution
        
        // Get the preview canvas for orientation reference
        const previewCanvasRef = window.openCVPreviewManager?.previewCanvases?.get(side);
        if (previewCanvasRef) {
            // We have a preview canvas, so we know the correct orientation
            // But we'll apply the trim to the full resolution video instead
            
            // Apply trim percentages directly to the full resolution video
            // Since user sees correct orientation, trim values should be applied directly
            const trimTopPx = Math.round(video.videoHeight * trimTopPercent / 100);
            const trimBottomPx = Math.round(video.videoHeight * trimBottomPercent / 100);
            const trimLeftPx = Math.round(video.videoWidth * trimLeftPercent / 100);
            const trimRightPx = Math.round(video.videoWidth * trimRightPercent / 100);
            
            // Calculate trimmed area from full resolution video
            const sx = trimLeftPx;
            const sy = trimTopPx;
            const sw = video.videoWidth - trimLeftPx - trimRightPx;
            const sh = video.videoHeight - trimTopPx - trimBottomPx;
            
            if (sw <= 0 || sh <= 0) {
                console.warn(`Invalid trim dimensions for ${side}: ${sw}x${sh}`);
                return null;
            }
            
            // Create HD output canvas with correct dimensions based on rotation
            const hdCanvas = document.createElement('canvas');
            // --- ROTATION RESTORED TO CAPTURE ---
            // Canvas dimensions should match the rotated dimensions to match preview
            if (rotation === 90 || rotation === 270) {
                hdCanvas.width = sh;   // Height becomes width after rotation
                hdCanvas.height = sw;  // Width becomes height after rotation
            } else {
                hdCanvas.width = sw;   // Use source width for 0° and 180°
                hdCanvas.height = sh;  // Use source height for 0° and 180°
            }
            
            const hdCtx = hdCanvas.getContext('2d');
            
            // Apply rotation and draw the trimmed video
            hdCtx.save();
            hdCtx.translate(hdCanvas.width / 2, hdCanvas.height / 2);
            
            // 🔍 DEBUG: Log capture process
            console.log(`📸 [${side}] HD capture: rotation=${rotation}° WILL be applied to capture to match preview`);
            console.log(`📸 [${side}] Preview shows: rotated view (OpenCV: negative=${-rotation}°, Canvas: positive=${rotation}°)`);
            console.log(`📸 [${side}] Capture saves: rotated video ${hdCanvas.width}x${hdCanvas.height} (Canvas rotation: +${rotation}°)`);
            console.log(`📸 [${side}] Result: User sees rotated preview and captures matching rotated image`);
            
            // --- ROTATION DIRECTION FIXED ---
            // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
            // So we need to use positive rotation to match OpenCV's visual result
            hdCtx.rotate((rotation * Math.PI) / 180);
            
            hdCtx.drawImage(video, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
            hdCtx.restore();
            
            // Create LD output canvas (downscaled version)
            const ldCanvas = document.createElement('canvas');
            const ldScale = Math.min(320 / hdCanvas.width, 320 / hdCanvas.height);
            ldCanvas.width = Math.round(hdCanvas.width * ldScale);
            ldCanvas.height = Math.round(hdCanvas.height * ldScale);
            const ldCtx = ldCanvas.getContext('2d');
            ldCtx.drawImage(hdCanvas, 0, 0, ldCanvas.width, ldCanvas.height);
            
            console.log(`🎯 CaptureHDLD from high-res video: HD=${hdCanvas.width}×${hdCanvas.height}, LD=${ldCanvas.width}×${ldCanvas.height}, trim=${trimTopPercent}%,${trimBottomPercent}%,${trimLeftPercent}%,${trimRightPercent}% (${trimTopPx},${trimBottomPx},${trimLeftPx},${trimRightPx}px)`);
            
            // Convert to blobs and data URLs in parallel for better performance
            const hdBlobPromise = new Promise(async (resolve) => {
                // Apply enhancement to HD image before saving (unless skipped for fast mode)
                const hdDataUrl = hdCanvas.toDataURL('image/jpeg', 0.95); // Higher quality for enhancement
                
                // Apply document enhancement if PDF generator is available AND not skipped
                let enhancedDataUrl = hdDataUrl;
                if (!skipEnhancement && window.pdfGenerator && window.pdfGenerator.enhanceDocumentImageAdvanced) {
                    try {
                        console.log(`[ENHANCE] 🚀 Applying gentle enhancement to ${side} HD image...`);
                        const enhanceStart = performance.now();
                        enhancedDataUrl = await window.pdfGenerator.enhanceDocumentImageAdvanced(hdDataUrl, { 
                            adaptiveMode: true,
                            autoExposureCorrection: true,  // Very gentle brightness correction
                            localContrastEnhancement: false, // DISABLED - was causing blackening
                            documentOptimization: true,     // Gentle white balance only
                            preserveDetails: false           // DISABLED - was over-sharpening
                        });
                        const enhanceTime = performance.now() - enhanceStart;
                        console.log(`[ENHANCE] ✅ ${side} HD gentle enhancement completed in ${enhanceTime.toFixed(1)}ms`);
                    } catch (error) {
                        console.warn(`[ENHANCE] ❌ Gentle enhancement failed for ${side} HD, trying basic:`, error);
                        // Fallback to basic enhancement
                        try {
                            enhancedDataUrl = await window.pdfGenerator.enhanceDocumentImage(hdDataUrl, { 
                                adaptiveMode: false,  // Use fixed, conservative values
                                brightness: 1.05,     // Very slight brightening
                                contrast: 1.1,        // Very slight contrast boost
                                sharpness: 1.0,       // No sharpening
                                whiteBalance: false    // No white balance
                            });
                        } catch (basicError) {
                            console.warn(`[ENHANCE] ❌ Basic enhancement also failed for ${side} HD, using original:`, basicError);
                            enhancedDataUrl = hdDataUrl;
                        }
                    }
                } else if (!skipEnhancement) {
                    console.log(`[ENHANCE] ⚠️ Advanced enhancement not available, trying basic enhancement for ${side} HD`);
                    // Try basic enhancement as fallback (only if not skipped)
                    if (window.pdfGenerator && window.pdfGenerator.enhanceDocumentImage) {
                        try {
                            enhancedDataUrl = await window.pdfGenerator.enhanceDocumentImage(hdDataUrl, { 
                                adaptiveMode: true,
                                brightness: 'auto',
                                contrast: 'auto', 
                                sharpness: 'auto',
                                whiteBalance: true
                            });
                        } catch (error) {
                            console.warn(`[ENHANCE] ❌ Basic enhancement failed for ${side} HD:`, error);
                        }
                    }
                } else {
                    console.log(`[ENHANCE] ⚡ Skipping enhancement for ${side} HD (fast mode)`);
                }
                
                // Convert enhanced image back to blob
                const img = new Image();
                img.onload = () => {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    tempCtx.drawImage(img, 0, 0);
                    
                    tempCanvas.toBlob(blob => {
                        resolve({
                            blob: blob,
                            dataUrl: enhancedDataUrl,
                            width: tempCanvas.width,
                            height: tempCanvas.height
                        });
                    }, 'image/jpeg', 0.92);
                };
                img.src = enhancedDataUrl;
            });
            
            const ldBlobPromise = new Promise(resolve => {
                ldCanvas.toBlob(blob => {
                    const dataUrl = ldCanvas.toDataURL('image/jpeg', 0.80); // Lower quality for thumbnails
                    resolve({
                        blob: blob,
                        dataUrl: dataUrl,
                        width: ldCanvas.width,
                        height: ldCanvas.height
                    });
                }, 'image/jpeg', 0.80);
            });
            
            const [hd, ld] = await Promise.all([hdBlobPromise, ldBlobPromise]);
            return { hd, ld };
            
        } else {
            // Fallback: apply trim to raw video, then rotate the result
            // Use percentage-based trim values for consistency with hybrid method
            
            // Apply trim percentages directly to the full resolution video
            const trimTopPx = Math.round(video.videoHeight * trimTopPercent / 100);
            const trimBottomPx = Math.round(video.videoHeight * trimBottomPercent / 100);
            const trimLeftPx = Math.round(video.videoWidth * trimLeftPercent / 100);
            const trimRightPx = Math.round(video.videoWidth * trimRightPercent / 100);
            
            // --- ROTATION RESTORED TO CAPTURE ---
            // Since we're rotating the capture, we need to transform trim coordinates
            // to match the rotation that will be applied
            let actualTrimTop, actualTrimBottom, actualTrimLeft, actualTrimRight;
            
            switch (rotation) {
                case 90:
                    actualTrimTop = trimRightPx;
                    actualTrimBottom = trimLeftPx;
                    actualTrimLeft = trimTopPx;
                    actualTrimRight = trimBottomPx;
                    break;
                case 180:
                    actualTrimTop = trimBottomPx;
                    actualTrimBottom = trimTopPx;
                    actualTrimLeft = trimRightPx;
                    actualTrimRight = trimLeftPx;
                    break;
                case 270:
                    actualTrimTop = trimLeftPx;
                    actualTrimBottom = trimRightPx;
                    actualTrimLeft = trimBottomPx;
                    actualTrimRight = trimTopPx;
                    break;
                default: // 0°
                    actualTrimTop = trimTopPx;
                    actualTrimBottom = trimBottomPx;
                    actualTrimLeft = trimLeftPx;
                    actualTrimRight = trimRightPx;
                    break;
            }
            
            console.log(`📸 [${side}] Fallback trim: transformed coordinates for rotation=${rotation}°`);
            
            // Transform trim coordinates based on rotation

        // Calculate trimmed area using transformed coordinates
        const sx = actualTrimLeft;
        const sy = actualTrimTop;
        const sw = video.videoWidth - actualTrimLeft - actualTrimRight;
        const sh = video.videoHeight - actualTrimTop - actualTrimBottom;
        if (sw <= 0 || sh <= 0) return null;

        // Set canvas size based on rotation
        let canvasW, canvasH;
        // --- ROTATION RESTORED TO CAPTURE ---
        // Canvas dimensions should match the rotated dimensions to match preview
        if (rotation === 90 || rotation === 270) {
            canvasW = sh;  // Height becomes width after rotation
            canvasH = sw;  // Width becomes height after rotation
        } else {
            canvasW = sw;  // Use source width for 0° and 180°
            canvasH = sh;  // Use source height for 0° and 180°
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.translate(canvasW / 2, canvasH / 2);
        
        console.log(`📸 [${side}] Fallback capture: rotation=${rotation}° WILL be applied to capture to match preview`);
        console.log(`📸 [${side}] Preview shows: rotated view (OpenCV: negative=${-rotation}°, Canvas: positive=${rotation}°)`);
        console.log(`📸 [${side}] Capture saves: rotated video ${canvasW}x${canvasH} (Canvas rotation: +${rotation}°)`);
        console.log(`📸 [${side}] Result: User sees rotated preview and captures matching rotated image`);
        
        // --- ROTATION DIRECTION FIXED ---
        // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
        // So we need to use positive rotation to match OpenCV's visual result
        ctx.rotate((rotation * Math.PI) / 180);
        
        ctx.drawImage(video, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();
        // Debug log: preview, trim, and canvas info
        const previewCanvas = window.openCVPreviewManager?.previewCanvases?.get?.(side);
        if (previewCanvas) {
            console.log(`[DEBUG] Preview canvas for ${side}: ${previewCanvas.width}x${previewCanvas.height}`);
        } else {
            console.log(`[DEBUG] No preview canvas for ${side}`);
        }
        console.log(`[DEBUG] Video for ${side}: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`[DEBUG] Trim for ${side}: left=${trimLeftPx}, top=${trimTopPx}, right=${trimRightPx}, bottom=${trimBottomPx} (from ${trimLeftPercent}%,${trimTopPercent}%,${trimRightPercent}%,${trimBottomPercent}%)`);
        console.log(`[DEBUG] Transformed trim for ${side}: left=${actualTrimLeft}, top=${actualTrimTop}, right=${actualTrimRight}, bottom=${actualTrimBottom}`);
        console.log(`[DEBUG] Trimmed area for ${side}: ${sw}x${sh}`);
        console.log(`[DEBUG] Output canvas for ${side}: ${canvasW}x${canvasH} (rotation: ${rotation})`);

        // HD: Use the canvas as-is
        const hdPromise = new Promise(resolve => {
            canvas.toBlob(blob => {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                console.log(`[DEBUG] HD image for ${side}: ${canvas.width}x${canvas.height}`);
                resolve({
                    blob,
                    dataUrl,
                    width: canvas.width,
                    height: canvas.height
                });
            }, 'image/jpeg', 0.95);
        });

        // LD: Create a thumbnail (320px max dimension)
        const maxThumbDim = 320;
        let thumbW = canvas.width;
        let thumbH = canvas.height;
        if (thumbW > thumbH && thumbW > maxThumbDim) {
            thumbH = Math.round((thumbH / thumbW) * maxThumbDim);
            thumbW = maxThumbDim;
        } else if (thumbH > thumbW && thumbH > maxThumbDim) {
            thumbW = Math.round((thumbW / thumbH) * maxThumbDim);
            thumbH = maxThumbDim;
        } else if (thumbW > maxThumbDim) {
            thumbW = thumbH = maxThumbDim;
        }
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbW, thumbH);
        const ldPromise = new Promise(resolve => {
            thumbCanvas.toBlob(blob => {
                const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
                console.log(`[DEBUG] LD image for ${side}: ${thumbW}x${thumbH}`);
                resolve({
                    blob,
                    dataUrl,
                    width: thumbW,
                    height: thumbH
                });
            }, 'image/jpeg', 0.8);
        });

        const [hd, ld] = await Promise.all([hdPromise, ldPromise]);
        return { hd, ld };
        
        } // End of else block for fallback method
    }

    /**
     * Capture HD/LD images for both cameras from the raw video at full camera resolution
     * Returns { left: {hd, ld}, right: {hd, ld} }
     * @param {Object} options - Capture options
     * @param {boolean} options.skipEnhancement - Skip image enhancement for faster capture
     */
    async captureBothCamerasHDLD(options = {}) {
        const { skipEnhancement = false } = options;
        const result = {};
        
        if (skipEnhancement) {
            console.log('⚡ Fast capture mode: Skipping enhancement for immediate preview');
        }
        
        // Create parallel capture promises for both cameras
        const capturePromises = ['left', 'right'].map(async (side) => {
            try {
                const images = await this.captureFullResHDLDFromVideo(side, { skipEnhancement });
                if (images) {
                    // Log HD/LD image resolutions for debug
                    console.log(`[DEBUG] captureBothCamerasHDLD: ${side} HD: ${images.hd.width}x${images.hd.height}, LD: ${images.ld.width}x${images.ld.height}`);
                    return { side, images };
                }
            } catch (error) {
                console.error(`[ERROR] Failed to capture ${side} camera:`, error);
            }
            return null;
        });
        
        // Wait for both cameras to complete in parallel
        const results = await Promise.all(capturePromises);
        
        // Process results and build return object
        results.forEach(captureResult => {
            if (captureResult) {
                result[captureResult.side] = captureResult.images;
            }
        });
        
        return Object.keys(result).length > 0 ? result : null;
    }
}