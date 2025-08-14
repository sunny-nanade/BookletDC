/**
 * Advanced QR Code Detection Module - Enhanced with competitor's techniques
 * Uses multiple QR libraries and advanced image processing for better detection
 */

class QRDetector {
    constructor() {
        this.isDetecting = false;
        this.detectionCanvas = null;
        this.detectionContext = null;
        this.jsQRLoaded = false;
        this.lastDetectedQR = new Map(); // Cache for each camera
        this.detectionFrameId = new Map(); // Animation frame IDs
        this.scannerGunEnabled = false;
        this.roiMode = true; // Enable ROI-based detection by default
        
        // Physical setup constants for 1440p resolution
        this.setupConstants = {
            cameraHeight: 375, // mm
            bookletWidth: 204, // mm  
            bookletHeight: 328, // mm
            qrSize: 10, // mm
            resolution: '1440p', // 2560×1440
            rotation: 90, // degrees
            // QR placement zone (mm from booklet edges)
            qrZone: {
                top: 40,
                left: 90, 
                right: 10,
                bottom: 250
            }
        };
        
        this.initializeCanvas();
        this.loadQRLibraries();
        this.setupScannerGunListener();
    }

    async loadQRLibraries() {
        try {
            // Load jsQR library
            if (typeof jsQR === 'undefined') {
                console.log('⏳ Loading jsQR library...');
                await this.waitForGlobal('jsQR');
            }
            this.jsQRLoaded = true;
            console.log('✅ jsQR library loaded and ready');

        } catch (error) {
            console.error('❌ Error loading QR libraries:', error);
        }
    }

    waitForGlobal(globalName) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkGlobal = () => {
                attempts++;
                if (window[globalName]) {
                    resolve(window[globalName]);
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`${globalName} failed to load`));
                } else {
                    setTimeout(checkGlobal, 100);
                }
            };
            
            checkGlobal();
        });
    }

    initializeCanvas() {
        // Create hidden canvas for QR detection
        this.detectionCanvas = document.createElement('canvas');
        this.detectionContext = this.detectionCanvas.getContext('2d', { willReadFrequently: true });
        this.detectionCanvas.style.display = 'none';
        document.body.appendChild(this.detectionCanvas);
    }

    // Advanced real-time QR detection using requestAnimationFrame (like competitor)
    startAdvancedDetection(videoElement, side, callback) {
        if (!this.isReady()) {
            console.warn('QR libraries not ready for advanced detection');
            return null;
        }

        // Stop any existing detection for this side
        this.stopAdvancedDetection(side);

        const detectFrame = async () => {
            try {
                // Method 1: Try jsQR with enhanced processing
                let qrResult = await this.detectWithEnhancedJsQR(videoElement);

                // Method 2: Try with different image filters
                if (!qrResult) {
                    qrResult = await this.detectWithFilters(videoElement);
                }

                if (qrResult) {
                    // Avoid duplicate detections
                    const lastQR = this.lastDetectedQR.get(side);
                    if (!lastQR || lastQR !== qrResult.data || Date.now() - lastQR.timestamp > 2000) {
                        this.lastDetectedQR.set(side, { data: qrResult.data, timestamp: Date.now() });
                        console.log(`🎯 Advanced QR detected on ${side}:`, qrResult.data);
                        if (callback) callback(qrResult);
                    }
                }

                // Continue detection loop
                this.detectionFrameId.set(side, requestAnimationFrame(detectFrame));
            } catch (error) {
                console.error(`Advanced QR detection error for ${side}:`, error);
                // Continue despite errors
                this.detectionFrameId.set(side, requestAnimationFrame(detectFrame));
            }
        };

        // Start the detection loop
        this.detectionFrameId.set(side, requestAnimationFrame(detectFrame));
        return this.detectionFrameId.get(side);
    }

    stopAdvancedDetection(side) {
        const frameId = this.detectionFrameId.get(side);
        if (frameId) {
            cancelAnimationFrame(frameId);
            this.detectionFrameId.delete(side);
            this.lastDetectedQR.delete(side);
        }
    }

    setupScannerGunListener() {
        // Buffer for scanner gun input
        this.scannerBuffer = '';
        this.scannerTimeout = null;
        this.scannerGunEnabled = true; // Auto-enable scanner gun
        this.lastKeyTime = 0;
        this.lastScanTime = 0;
        
        // Update UI to show scanner gun listener is active (not device status)
        this.updateScannerGunUI('Listening', 'standby');
        
        // Enhanced event listener with multiple capture methods
        // NOTE: Using capture phase to detect scanner gun input BEFORE form elements process it
        // BUT we filter out form elements to prevent interference with trim settings
        document.addEventListener('keydown', (event) => {
            this.handleScannerInput(event);
        }, true); // Use capture phase
        
        // Also listen for keypress as fallback
        document.addEventListener('keypress', (event) => {
            this.handleScannerInput(event);
        }, true);
        
        console.log('🔫 Scanner gun listener active - waiting for fast keyboard input');
        console.log('🛡️ Form elements (trim inputs) are protected from scanner gun interference');
        console.log('� Note: Browser cannot detect if physical scanner is connected');
    }

    handleScannerInput(event) {
        if (!this.scannerGunEnabled) return;
        
        // CRITICAL FIX: Ignore inputs from form elements to prevent interference with trim settings
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            // Allow normal form input behavior - don't intercept
            return;
        }
        
        // Detect fast typing characteristic of scanner guns
        const now = Date.now();
        const timeBetweenKeys = now - this.lastKeyTime;
        this.lastKeyTime = now;
        
        // Log all keystrokes for debugging (only non-form elements)
        if (event.key && event.key.length === 1) {
            console.log('🔫 Key detected:', event.key, 'Time since last:', timeBetweenKeys + 'ms', 'Buffer:', this.scannerBuffer);
        }
        
        // Scanner guns typically send data fast and end with Enter
        if (event.key === 'Enter' || event.keyCode === 13) {
            // SAFETY CHECK: Don't interfere with form submissions
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                console.log('🔫 Enter key in form element - allowing normal behavior');
                return;
            }
            
            if (this.scannerBuffer.length > 3) { // Minimum QR length
                console.log('🔫 Scanner gun QR COMPLETE (Enter):', this.scannerBuffer);
                this.handleScannerGunQR(this.scannerBuffer.trim());
                this.scannerBuffer = '';
            } else if (this.scannerBuffer.length > 0) {
                console.log('🔫 Enter detected but buffer too short:', this.scannerBuffer);
                this.scannerBuffer = '';
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        // Accumulate characters (ignore special keys)
        if (event.key && event.key.length === 1) {
            // SAFETY CHECK: Don't accumulate characters from form elements
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                console.log('🔫 Character input in form element - ignoring for scanner gun');
                return;
            }
            
            // If typing is very fast (< 50ms), likely scanner gun
            if (timeBetweenKeys < 50 && this.scannerBuffer.length === 0) {
                this.updateScannerGunUI('Scanning...', 'active');
                console.log('🔫 Fast typing detected - scanner gun mode activated');
            }
            
            this.scannerBuffer += event.key;
            console.log('🔫 Buffer updated:', this.scannerBuffer);
            
            // Reset buffer after timeout (in case of manual typing)
            clearTimeout(this.scannerTimeout);
            this.scannerTimeout = setTimeout(() => {
                if (this.scannerBuffer.length > 10) { // Likely complete QR code
                    console.log('🔫 Scanner gun QR COMPLETE (Timeout):', this.scannerBuffer);
                    console.log('🔫 About to call handleScannerGunQR with:', this.scannerBuffer.trim());
                    try {
                        this.handleScannerGunQR(this.scannerBuffer.trim());
                        console.log('🔫 handleScannerGunQR completed successfully');
                    } catch (error) {
                        console.error('🔫 Error in handleScannerGunQR:', error);
                    }
                    this.updateScannerGunUI('Scanned!', 'detected');
                } else if (this.scannerBuffer.length > 0) {
                    console.log('⌨️ Manual typing timeout - clearing buffer:', this.scannerBuffer);
                    this.updateScannerGunUI('Ready', 'standby');
                }
                this.scannerBuffer = '';
            }, 500); // Shorter timeout for faster detection
            
            // Prevent default for scanner gun input (fast typing)
            if (timeBetweenKeys < 50 || this.scannerBuffer.length > 5) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    updateScannerGunUI(status, state, value = null) {
        const statusElement = document.getElementById('scanner-gun-status');
        
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `scanner-status ${state}`;
        }
    }

    handleScannerGunQR(qrData) {
        console.log('🎯 Processing scanner gun QR:', qrData);
        console.log('🔫 DEBUG: handleScannerGunQR called with:', qrData);
        
        // Update last scan time
        this.lastScanTime = Date.now();
        
        // Update UI to show detection
        this.updateScannerGunUI('Scanned!', 'detected');
        console.log('🔫 DEBUG: Updated scanner gun UI to Scanned!');
        
        // Call the main updateQRDisplay function to trigger flicker and stop detection
        console.log('🔫 DEBUG: Calling main updateQRDisplay for right side');
        if (window.bookletScannerApp && window.bookletScannerApp.updateQRDisplay) {
            // This will trigger the flicker, set PDF name, and stop QR detection
            window.bookletScannerApp.updateQRDisplay('right', qrData);
            console.log('🔫 SUCCESS: Called main updateQRDisplay with right side');
        } else {
            console.error('🔫 ERROR: bookletScannerApp.updateQRDisplay not found!');
            
            // Fallback: Direct DOM update without integration
            const rightQRElement = document.getElementById('right-qr-value');
            console.log('🔫 DEBUG: Found right QR element:', rightQRElement);
            if (rightQRElement) {
                rightQRElement.textContent = qrData;
                rightQRElement.classList.add('detected');
                rightQRElement.setAttribute('data-source', 'scanner-gun');
                console.log('🔫 FALLBACK: Updated Right QR display with scanner gun data:', qrData);
            }
        }
        
        // Integrate with existing QR system (backup integration)
        console.log('🔫 DEBUG: Checking for imageCaptureManager:', window.imageCaptureManager);
        if (window.imageCaptureManager) {
            // Set this as the PDF name with highest priority
            window.imageCaptureManager.setScannerGunQR(qrData);
            console.log('📄 Scanner gun QR set as PDF name:', qrData);
        } else {
            console.error('🔫 ERROR: imageCaptureManager not found!');
        }
        
        // Reset scanner status after 3 seconds, but keep QR value
        setTimeout(() => {
            this.updateScannerGunUI('Active', 'active');
        }, 3000);
        
        return {
            data: qrData,
            method: 'Scanner Gun',
            timestamp: new Date().toISOString(),
            priority: 'highest'
        };
    }

    getScannerGunStatus() {
        const timeSinceLastScan = Date.now() - this.lastScanTime;
        const isRecentlyUsed = timeSinceLastScan < 60000; // 1 minute
        
        return {
            enabled: this.scannerGunEnabled,
            listening: true,
            lastScanTime: this.lastScanTime,
            timeSinceLastScan: timeSinceLastScan,
            recentlyUsed: isRecentlyUsed,
            status: isRecentlyUsed ? 'Recently used' : 'Listening',
            note: 'Browser cannot detect physical device connection'
        };
    }

    enableScannerGunFallback() {
        this.scannerGunEnabled = true;
        this.updateScannerGunUI('Active', 'active');
        console.log('🔫 Scanner gun enabled - scan QR code');
    }

    disableScannerGunFallback() {
        this.scannerGunEnabled = false;
        this.scannerBuffer = '';
        this.updateScannerGunUI('Disabled', 'standby');
        console.log('🔫 Scanner gun disabled');
    }

    // Manual trigger for testing
    simulateScannerGun(testData) {
        console.log('🧪 Simulating scanner gun input:', testData);
        this.scannerBuffer = testData;
        this.handleScannerGunQR(testData);
    }

    // Toggle between ROI and full-frame detection
    toggleROIMode() {
        this.roiMode = !this.roiMode;
        console.log(`🎯 QR ROI mode: ${this.roiMode ? 'ON (faster, focused)' : 'OFF (full frame)'}`);
        return this.roiMode;
    }

    // Get detection statistics
    getDetectionStats() {
        return {
            roiMode: this.roiMode,
            scannerGunEnabled: this.scannerGunEnabled,
            activeDetections: this.detectionFrameId.size,
            setupConstants: this.setupConstants,
            lastDetected: Array.from(this.lastDetectedQR.entries())
        };
    }

    async detectWithEnhancedJsQR(videoElement) {
        if (!this.jsQRLoaded || !jsQR) return null;

        try {
            // Use ROI-based detection for better performance and accuracy
            if (this.roiMode) {
                return await this.detectWithROI(videoElement);
            }
            
            // Fallback to full-frame detection
            return await this.detectFullFrame(videoElement);
        } catch (error) {
            console.error('Enhanced jsQR detection error:', error);
            return null;
        }
    }

    async detectWithROI(videoElement) {
        // Calculate QR region of interest based on physical setup
        const roi = this.calculateQRROI(videoElement.videoWidth, videoElement.videoHeight);
        
        // Adjust scaling factor based on input dimensions
        const isCanvasElement = videoElement.videoWidth <= 400;
        const scaleFactor = isCanvasElement ? 4 : 8; // Lower scaling for canvas, higher for video
        
        this.detectionCanvas.width = roi.width * scaleFactor;
        this.detectionCanvas.height = roi.height * scaleFactor;

        // Disable smoothing for crisp QR code edges
        this.detectionContext.imageSmoothingEnabled = false;
        
        // Extract and scale only the QR region
        this.detectionContext.drawImage(
            videoElement,
            roi.x, roi.y, roi.width, roi.height,  // Source: QR region only
            0, 0, this.detectionCanvas.width, this.detectionCanvas.height  // Destination: scaled up
        );

        // Apply QR-specific enhancement
        this.applyQRSpecificEnhancement();

        const imageData = this.detectionContext.getImageData(
            0, 0, 
            this.detectionCanvas.width, 
            this.detectionCanvas.height
        );

        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (qrCode) {
            const detectionMethod = isCanvasElement ? 'ROI Canvas Enhanced' : 'ROI Video Enhanced';
            return {
                data: qrCode.data,
                location: qrCode.location,
                timestamp: new Date().toISOString(),
                method: detectionMethod,
                roi: roi,
                scaleFactor: scaleFactor,
                sourceSize: `${videoElement.videoWidth}×${videoElement.videoHeight}`
            };
        }

        return null;
    }

    async detectFullFrame(videoElement) {
        // Original full-frame detection as fallback
        const scaleFactor = 2;
        this.detectionCanvas.width = videoElement.videoWidth * scaleFactor;
        this.detectionCanvas.height = videoElement.videoHeight * scaleFactor;

        this.detectionContext.imageSmoothingEnabled = false;
        this.detectionContext.drawImage(
            videoElement, 
            0, 0, 
            videoElement.videoWidth,
            videoElement.videoHeight,
            0, 0,
            this.detectionCanvas.width, 
            this.detectionCanvas.height
        );

        this.applyAdvancedEnhancement();

        const imageData = this.detectionContext.getImageData(
            0, 0, 
            this.detectionCanvas.width, 
            this.detectionCanvas.height
        );

        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (qrCode) {
            return {
                data: qrCode.data,
                location: qrCode.location,
                timestamp: new Date().toISOString(),
                method: 'Full Frame jsQR'
            };
        }

        return null;
    }

    calculateQRROI(videoWidth, videoHeight) {
        // Handle both original video dimensions and scaled canvas dimensions
        const isCanvasElement = videoWidth <= 400; // Canvas elements are typically ~329x585
        
        if (isCanvasElement) {
            // For canvas elements (329×585), calculate ROI based on scaled dimensions
            console.log(`🎯 Calculating ROI for canvas element: ${videoWidth}×${videoHeight}`);
            
            // Canvas ROI calculation (simplified for rotated and scaled view)
            const roi = {
                x: Math.floor(videoWidth * 0.12),  // ~40px from left (was top before rotation)
                y: Math.floor(videoHeight * 0.45), // ~260px from top (was left before rotation)
                width: Math.floor(videoWidth * 0.64), // ~210px width (was height before rotation)
                height: Math.floor(videoHeight * 0.30) // ~175px height (was width before rotation)
            };
            
            console.log(`🎯 Canvas ROI: ${roi.x},${roi.y} ${roi.width}×${roi.height} (${((roi.width * roi.height) / (videoWidth * videoHeight) * 100).toFixed(1)}% of canvas)`);
            return roi;
        } else {
            // For original video dimensions (2560×1440), use precise physical calculations
            console.log(`🎯 Calculating ROI for video element: ${videoWidth}×${videoHeight}`);
            
            const { qrZone, bookletWidth, bookletHeight } = this.setupConstants;
            
            // After 90° rotation, coordinates transform:
            const roiPercentages = {
                left: qrZone.top / bookletHeight,    // 40mm / 328mm = ~0.122
                top: qrZone.left / bookletWidth,     // 90mm / 204mm = ~0.441
                width: (qrZone.bottom - qrZone.top) / bookletHeight,  // 210mm / 328mm = ~0.640
                height: (bookletWidth - qrZone.left - qrZone.right) / bookletWidth // 104mm / 204mm = ~0.510
            };
            
            const roi = {
                x: Math.floor(videoWidth * roiPercentages.left),
                y: Math.floor(videoHeight * roiPercentages.top),
                width: Math.floor(videoWidth * roiPercentages.width),
                height: Math.floor(videoHeight * roiPercentages.height)
            };
            
            // Ensure ROI is within video bounds
            roi.x = Math.max(0, roi.x);
            roi.y = Math.max(0, roi.y);
            roi.width = Math.min(roi.width, videoWidth - roi.x);
            roi.height = Math.min(roi.height, videoHeight - roi.y);
            
            console.log(`🎯 Video ROI: ${roi.x},${roi.y} ${roi.width}×${roi.height} (${((roi.width * roi.height) / (videoWidth * videoHeight) * 100).toFixed(1)}% of frame)`);
            return roi;
        }
    }

    applyQRSpecificEnhancement() {
        const imageData = this.detectionContext.getImageData(0, 0, this.detectionCanvas.width, this.detectionCanvas.height);
        const data = imageData.data;

        // Multi-pass enhancement optimized for 10mm QR codes
        
        // Pass 1: Noise reduction with light gaussian blur
        this.applyLightBlur(data, this.detectionCanvas.width, this.detectionCanvas.height);
        
        // Pass 2: Adaptive contrast enhancement for QR codes
        for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale with standard weights
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            // Adaptive threshold optimized for QR code contrast
            // Higher threshold for small QR codes to ensure clean edges
            const threshold = 135; // Optimized for 10mm QR at 375mm distance
            const enhanced = gray > threshold ? 255 : 0;
            
            data[i] = enhanced;     // Red
            data[i + 1] = enhanced; // Green  
            data[i + 2] = enhanced; // Blue
            // Alpha channel stays the same
        }

        this.detectionContext.putImageData(imageData, 0, 0);
    }

    applyLightBlur(data, width, height) {
        // Light 3x3 gaussian blur to reduce noise before thresholding
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kernelSum = 16;
        
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let channel = 0; channel < 3; channel++) { // RGB only
                    let sum = 0;
                    let kernelIndex = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
                            sum += tempData[pixelIndex] * kernel[kernelIndex];
                            kernelIndex++;
                        }
                    }
                    
                    const currentIndex = (y * width + x) * 4 + channel;
                    data[currentIndex] = Math.round(sum / kernelSum);
                }
            }
        }
    }

    async detectWithFilters(videoElement) {
        if (!this.jsQRLoaded || !jsQR) return null;

        try {
            // Try with different image filters
            const filters = [
                { contrast: 2.0, brightness: 0 },
                { contrast: 1.5, brightness: 30 },
                { contrast: 2.5, brightness: -20 },
            ];

            for (const filter of filters) {
                this.detectionCanvas.width = videoElement.videoWidth;
                this.detectionCanvas.height = videoElement.videoHeight;
                
                this.detectionContext.drawImage(videoElement, 0, 0);
                this.applyFilter(filter.contrast, filter.brightness);
                
                const imageData = this.detectionContext.getImageData(
                    0, 0, 
                    this.detectionCanvas.width, 
                    this.detectionCanvas.height
                );

                const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (qrCode) {
                    return {
                        data: qrCode.data,
                        location: qrCode.location,
                        timestamp: new Date().toISOString(),
                        method: `Filtered jsQR (${filter.contrast}x, ${filter.brightness})`
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Filtered detection error:', error);
            return null;
        }
    }

    applyAdvancedEnhancement() {
        const imageData = this.detectionContext.getImageData(0, 0, this.detectionCanvas.width, this.detectionCanvas.height);
        const data = imageData.data;

        // Advanced enhancement based on competitor's approach
        for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale with weighted values
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            // Apply aggressive contrast enhancement for QR codes
            const enhanced = gray > 128 ? 255 : 0;
            
            data[i] = enhanced;     // Red
            data[i + 1] = enhanced; // Green
            data[i + 2] = enhanced; // Blue
        }

        this.detectionContext.putImageData(imageData, 0, 0);
    }

    applyFilter(contrast, brightness) {
        const imageData = this.detectionContext.getImageData(0, 0, this.detectionCanvas.width, this.detectionCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness));
        }

        this.detectionContext.putImageData(imageData, 0, 0);
    }

    async detectQRFromImageData(imageData) {
        if (!this.jsQRLoaded) {
            console.warn('jsQR not loaded yet');
            return null;
        }

        try {
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (qrCode) {
                console.log('🔍 QR Code detected from image:', qrCode.data);
                return {
                    data: qrCode.data,
                    location: qrCode.location,
                    timestamp: new Date().toISOString()
                };
            }

            return null;
        } catch (error) {
            console.error('Error detecting QR from image data:', error);
            return null;
        }
    }

    async detectQRFromBlob(imageBlob) {
        if (!this.jsQRLoaded) {
            console.warn('jsQR not loaded yet');
            return null;
        }

        try {
            console.log('🔍 Starting QR detection from blob, size:', imageBlob.size);
            
            // Create image from blob
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            return new Promise((resolve) => {
                img.onload = () => {
                    console.log('🔍 Image loaded for QR detection:', img.width, 'x', img.height);
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('🔍 Image data extracted for QR detection:', imageData.width, 'x', imageData.height);
                    
                    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (qrCode) {
                        console.log('✅ QR code detected from blob:', qrCode.data);
                        resolve({
                            data: qrCode.data,
                            location: qrCode.location,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        console.log('❌ No QR code found in blob');
                        resolve(null);
                    }
                };
                
                img.onerror = () => {
                    console.error('❌ Failed to load image for QR detection');
                    resolve(null);
                };
                img.src = URL.createObjectURL(imageBlob);
            });

        } catch (error) {
            console.error('Error detecting QR from blob:', error);
            return null;
        }
    }

    // Continuous QR detection from video stream
    startContinuousDetection(videoElement, callback, interval = 500) {
        if (!this.jsQRLoaded) {
            console.warn('jsQR not loaded, cannot start continuous detection');
            return null;
        }

        const detectInterval = setInterval(async () => {
            const qrResult = await this.detectQRFromVideo(videoElement);
            if (qrResult && callback) {
                callback(qrResult);
                // Stop continuous detection after first successful detection
                clearInterval(detectInterval);
            }
        }, interval);

        return detectInterval;
    }

    // Validate QR code data
    validateQRData(qrData) {
        if (!qrData || typeof qrData !== 'string') {
            return false;
        }

        // Basic validation - can be enhanced based on requirements
        const trimmed = qrData.trim();
        
        // Check if it's not empty and has reasonable length
        if (trimmed.length === 0 || trimmed.length > 100) {
            return false;
        }

        // Check for invalid characters for filename
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(trimmed)) {
            return false;
        }

        return true;
    }

    // Generate fallback filename
    generateFallbackFilename() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${day}${month}-${hours}${minutes}${seconds}`;
    }

    // Clean QR data for use as filename
    cleanQRDataForFilename(qrData) {
        if (!this.validateQRData(qrData)) {
            return this.generateFallbackFilename();
        }

        return qrData
            .trim()
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 50); // Limit length
    }

    // Check if QR libraries are ready
    isReady() {
        return this.jsQRLoaded;
    }

    // Get status of QR libraries
    getStatus() {
        return {
            jsQR: this.jsQRLoaded,
            ready: this.isReady()
        };
    }

    // Enhance image for better QR detection
    enhanceImageForQR(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Increase contrast and brightness for better QR detection
        for (let i = 0; i < data.length; i += 4) {
            // Apply contrast enhancement
            const contrast = 1.5; // Increase contrast
            const brightness = 10; // Slight brightness increase

            data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));     // Red
            data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // Green
            data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // Blue
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Invert image colors for alternative QR detection
    invertImageData(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];       // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        }
    }

    /**
     * Detect QR code from a specific region of an image blob
     * @param {Blob} imageBlob - The image to analyze 
     * @param {Object} region - Region to scan {x, y, width, height} as percentages (0-1)
     * @returns {Promise<Object|null>} QR result or null
     */
    async detectQRFromBlobRegion(imageBlob, region = {x: 0.5, y: 0, width: 0.5, height: 0.5}) {
        if (!this.jsQRLoaded) {
            console.warn('jsQR not loaded yet');
            return null;
        }

        try {
            // Create image from blob
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            return new Promise((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Calculate region coordinates
                    const regionX = Math.floor(img.width * region.x);
                    const regionY = Math.floor(img.height * region.y);
                    const regionWidth = Math.floor(img.width * region.width);
                    const regionHeight = Math.floor(img.height * region.height);
                    
                    // Extract region image data
                    const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
                    
                    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (qrCode) {
                        resolve({
                            data: qrCode.data,
                            location: qrCode.location,
                            timestamp: new Date().toISOString(),
                            region: region
                        });
                    } else {
                        resolve(null);
                    }
                };
                
                img.onerror = () => {
                    resolve(null);
                };
                img.src = URL.createObjectURL(imageBlob);
            });

        } catch (error) {
            console.error('Error detecting QR from blob region:', error);
            return null;
        }
    }

    // Cleanup
    destroy() {
        if (this.detectionCanvas && this.detectionCanvas.parentNode) {
            this.detectionCanvas.parentNode.removeChild(this.detectionCanvas);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRDetector;
}