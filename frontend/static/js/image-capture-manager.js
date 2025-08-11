/**
 * Image Capture Manager
 * Handles real image capture from camera streams with threading support
 */

class ImageCaptureManager {
    constructor() {
        this.captureWorker = null;
        this.isCapturing = false;
        this.captureQueue = [];
        this.capturedImages = new Map(); // spreadIndex -> {left, right, metadata}
        this.tempImageCounter = 0;
        this.qrDetector = null;
        this.sessionId = this.generateSessionId();
        this.pdfName = null;
        this.scanStartTime = null; // Track when scanning started (QR detected)
        this.initialQRCode = null; // Store the initial QR code for monitoring
        this.qrMonitoringEnabled = true; // Enable QR monitoring by default
        this.fastPreviewMode = true; // Enable fast preview mode for immediate feedback
        this.scannerGunQR = null; // Store QR from scanner gun (highest priority)
        this.initializeWorker();
        console.log('🔍 QR Monitoring: Initialized and ready for silent QR code monitoring in top-right corner');
        console.log('🔍 QR Monitoring: Will detect initial QR during scanning if none detected beforehand');
        console.log(`⚡ Fast Preview Mode: ${this.fastPreviewMode ? 'ENABLED' : 'DISABLED'} - ${this.fastPreviewMode ? 'Images shown immediately, enhanced in background' : 'Images enhanced before display'}`);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async initializeWorker() {
        try {
            // Create Web Worker for image processing
            const workerCode = `
                self.onmessage = function(e) {
                    const { type, data } = e.data;
                    
                    switch(type) {
                        case 'PROCESS_IMAGE':
                            processImage(data);
                            break;
                        case 'APPLY_TRIM':
                            applyTrim(data);
                            break;
                        case 'GENERATE_THUMBNAIL':
                            generateThumbnail(data);
                            break;
                    }
                };

                function processImage(data) {
                    // Image processing logic here
                    self.postMessage({
                        type: 'IMAGE_PROCESSED',
                        data: { ...data, processed: true }
                    });
                }

                function applyTrim(data) {
                    // --- Trim logic moved to main thread ---
                    // Web workers don't have access to Image constructor
                    // We'll handle trimming on the main thread for now
                    self.postMessage({
                        type: 'TRIM_APPLIED',
                        data: {
                            ...data.capture,
                            trimmed: false,
                            needsMainThreadTrim: true,
                            trimSettings: data.trimSettings
                        }
                    });
                }

                function generateThumbnail(data) {
                    // Thumbnail generation logic
                    self.postMessage({
                        type: 'THUMBNAIL_GENERATED',
                        data: { ...data, thumbnail: true }
                    });
                }
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.captureWorker = new Worker(URL.createObjectURL(blob));
            
            this.captureWorker.onmessage = (e) => {
                this.handleWorkerMessage(e.data);
            };

            console.log('✅ Image capture worker initialized');
        } catch (error) {
            console.error('Failed to initialize capture worker:', error);
        }
    }

    handleWorkerMessage(message) {
        const { type, data } = message;
        
        switch(type) {
            case 'IMAGE_PROCESSED':
                this.onImageProcessed(data);
                break;
            case 'TRIM_APPLIED':
                this.onTrimApplied(data);
                break;
            case 'THUMBNAIL_GENERATED':
                this.onThumbnailGenerated(data);
                break;
        }
    }

    async captureFromCameras(spreadIndex) {
        if (this.isCapturing) {
            console.warn('Capture already in progress');
            return null;
        }

        this.isCapturing = true;
        const captureStartTime = performance.now(); // Start timing
        
        try {
            // Get camera manager instance
            const cameraManager = window.cameraManager;
            if (!cameraManager) {
                throw new Error('Camera manager not available');
            }

            let hdldCaptures;
            
            if (this.fastPreviewMode) {
                // FAST MODE: Capture without enhancement for immediate preview
                console.log(`⚡ Fast capture mode: Skipping enhancement for immediate preview`);
                hdldCaptures = await cameraManager.captureBothCamerasHDLD({ 
                    skipEnhancement: true 
                });
            } else {
                // NORMAL MODE: Full capture with enhancement
                hdldCaptures = await cameraManager.captureBothCamerasHDLD();
            }
            
            if (!hdldCaptures) {
                throw new Error('Failed to capture from cameras');
            }

            // For compatibility, use HD for PDF, LD for preview/thumbnail
            const processedCaptures = {
                spreadIndex: spreadIndex,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                left: null,
                right: null
            };
            for (const side of ['left', 'right']) {
                if (hdldCaptures[side]) {
                    const hd = hdldCaptures[side].hd;
                    const ld = hdldCaptures[side].ld;
                    processedCaptures[side] = {
                        id: `${this.sessionId}_${spreadIndex}_${side}_${++this.tempImageCounter}`,
                        side,
                        spreadIndex,
                        originalBlob: hd.blob,
                        dataUrl: hd.dataUrl,
                        width: hd.width,
                        height: hd.height,
                        resolution: 'HD',
                        timestamp: new Date().toISOString(),
                        processed: true,
                        trimmed: false,
                        thumbnail: ld.dataUrl,
                        thumbnailBlob: ld.blob,
                        thumbnailWidth: ld.width,
                        thumbnailHeight: ld.height,
                        fullResolutionBlob: hd.blob,
                        fullResolutionDataUrl: hd.dataUrl,
                        fullResolutionWidth: hd.width,
                        fullResolutionHeight: hd.height
                    };
                }
            }

            this.capturedImages.set(spreadIndex, processedCaptures);

            // Update preview UI IMMEDIATELY with LD thumbnails (fastest feedback)
            this.updatePreviewDisplay(processedCaptures, spreadIndex);
            
            const previewTime = performance.now() - captureStartTime;
            console.log(`📸 Preview displayed in ${previewTime.toFixed(1)}ms ${this.fastPreviewMode ? '(Fast Mode - No Enhancement)' : '(With Enhancement)'}`);

            // Run ALL background tasks in parallel (non-blocking)
            Promise.allSettled([
                // QR detection on first spread only (background)
                spreadIndex === 0 && !this.pdfName ? 
                    this.detectQRCode(processedCaptures).catch(error => {
                        console.warn('Background QR detection failed:', error);
                    }) : Promise.resolve(),
                
                // QR monitoring for all spreads (background)
                this.qrMonitoringEnabled && processedCaptures.right ? 
                    this.monitorQRCodeInBackground(processedCaptures.right, spreadIndex).catch(error => {
                        console.debug('QR monitoring error (silent):', error);
                    }) : Promise.resolve(),
                
                // Enhanced image processing (background) - only if fast mode was used
                this.fastPreviewMode ? 
                    this.enhanceImagesInBackground(processedCaptures, spreadIndex).catch(error => {
                        console.debug('Background enhancement error:', error);
                    }) : Promise.resolve()
            ]).catch(error => {
                console.debug('Background processing error:', error);
            });

            const totalTime = performance.now() - captureStartTime;
            console.log(`✅ Spread ${spreadIndex + 1} captured successfully - Total time: ${totalTime.toFixed(1)}ms ${this.fastPreviewMode ? '(Fast Mode)' : '(Normal Mode)'}`);
            return processedCaptures;
        } catch (error) {
            console.error('Capture failed:', error);
            throw error;
        } finally {
            this.isCapturing = false;
        }
    }

    /**
     * Check if a dataUrl image is black or empty (all pixels are black or transparent)
     */
    isBlackOrEmptyImage(dataUrl) {
        try {
            const img = document.createElement('img');
            img.src = dataUrl;
            // Synchronous check (only for small images like thumbnails)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            return new Promise((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
                    let allBlack = true;
                    for (let i = 0; i < imageData.length; i += 4) {
                        if (imageData[i] !== 0 || imageData[i + 1] !== 0 || imageData[i + 2] !== 0 || imageData[i + 3] !== 255) {
                            allBlack = false;
                            break;
                        }
                    }
                    resolve(allBlack);
                };
                img.onerror = () => resolve(true);
            });
        } catch (e) {
            return true;
        }
    }
    /**
     * Monitor QR codes in captured images (silent background process)
     * Checks the top-right corner for QR codes and compares with initial QR
     * OPTIMIZED: Non-blocking, runs asynchronously
     */
    async monitorQRCodeInBackground(captureData, spreadIndex) {
        // Use setTimeout to ensure this runs after capture completion
        setTimeout(async () => {
            try {
                if (!this.qrDetector) {
                    this.qrDetector = new QRDetector();
                }

                // Define top-right corner region (top-right quarter of the image)
                const topRightRegion = {
                    x: 0.5,    // Start from 50% of width (right half)
                    y: 0,      // Start from top
                    width: 0.5, // Cover right 50% of width
                    height: 0.5 // Cover top 50% of height
                };

                // Detect QR from the top-right corner region
                const qrResult = await this.qrDetector.detectQRFromBlobRegion(
                    captureData.originalBlob, 
                    topRightRegion
                );

                if (qrResult) {
                    this.handleQRMonitoringResult(qrResult.data, spreadIndex);
                } else {
                    // Only log if we have an initial QR and don't detect one
                    if (this.initialQRCode && spreadIndex > 0) {
                        console.log(`🔍 QR Monitor (Spread ${spreadIndex + 1}): No QR detected in top-right corner`);
                    }
                }

            } catch (error) {
                // Silent monitoring - don't show errors to user
                console.debug('QR monitoring error (silent):', error);
            }
        }, 0); // Run on next tick to avoid blocking capture
    }

    /**
     * Enhance images in background after preview is shown
     * This improves PDF quality without blocking the preview
     */
    async enhanceImagesInBackground(processedCaptures, spreadIndex) {
        setTimeout(async () => {
            try {
                console.log(`🎨 Background enhancement started for spread ${spreadIndex + 1}`);
                
                // Enhance both sides if available
                for (const side of ['left', 'right']) {
                    if (processedCaptures[side] && processedCaptures[side].originalBlob) {
                        try {
                            // Convert blob to dataURL for enhancement
                            const dataUrl = await this.blobToDataUrl(processedCaptures[side].originalBlob);
                            
                            // Apply enhancement if available
                            let enhancedDataUrl = dataUrl;
                            if (window.pdfGenerator && window.pdfGenerator.enhanceDocumentImageAdvanced) {
                                enhancedDataUrl = await window.pdfGenerator.enhanceDocumentImageAdvanced(dataUrl, { 
                                    adaptiveMode: true,
                                    autoExposureCorrection: true,
                                    localContrastEnhancement: false,
                                    documentOptimization: true,
                                    preserveDetails: false
                                });
                            }
                            
                            // Convert enhanced dataURL back to blob
                            const enhancedBlob = await this.dataUrlToBlob(enhancedDataUrl);
                            
                            // Update the processed capture with enhanced version
                            processedCaptures[side].originalBlob = enhancedBlob;
                            processedCaptures[side].dataUrl = enhancedDataUrl;
                            processedCaptures[side].fullResolutionBlob = enhancedBlob;
                            processedCaptures[side].fullResolutionDataUrl = enhancedDataUrl;
                            processedCaptures[side].enhanced = true;
                            
                            console.log(`✅ Background enhancement completed for ${side} (spread ${spreadIndex + 1})`);
                        } catch (error) {
                            console.warn(`❌ Background enhancement failed for ${side}:`, error);
                        }
                    }
                }
                
                // Update the stored capture data
                this.capturedImages.set(spreadIndex, processedCaptures);
                
            } catch (error) {
                console.debug('Background enhancement error:', error);
            }
        }, 100); // Small delay to ensure preview is shown first
    }

    /**
     * Convert blob to data URL
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Convert data URL to blob
     */
    async dataUrlToBlob(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    /**
     * Handle QR monitoring results and log appropriate messages
     */
    handleQRMonitoringResult(detectedQR, spreadIndex) {
        if (!this.initialQRCode && detectedQR) {
            // First QR detection during monitoring - store as initial
            this.initialQRCode = detectedQR;
            console.log(`🔍 QR Monitor (Spread ${spreadIndex + 1}): Initial QR detected and stored: ${detectedQR}`);
            return;
        }

        if (this.initialQRCode) {
            // We have an initial QR to compare against
            if (detectedQR === this.initialQRCode) {
                console.log(`🔍 QR Monitor (Spread ${spreadIndex + 1}): Same QR detected`);
            } else if (detectedQR) {
                console.warn(`🚨 QR Monitor (Spread ${spreadIndex + 1}): ALERT - Different QR detected!`);
                console.warn(`    Initial QR: ${this.initialQRCode}`);
                console.warn(`    Detected QR: ${detectedQR}`);
            } else {
                // No QR detected but we have an initial QR stored
                console.log(`🔍 QR Monitor (Spread ${spreadIndex + 1}): No QR detected in top-right corner`);
            }
        } else if (detectedQR) {
            // No initial QR stored, but QR detected now - store it as initial
            this.initialQRCode = detectedQR;
            console.log(`🔍 QR Monitor (Spread ${spreadIndex + 1}): First QR detected during monitoring: ${detectedQR}`);
        } else {
            // No initial QR and no QR detected - silent (this is normal for spreads without QR)
            console.debug(`🔍 QR Monitor (Spread ${spreadIndex + 1}): No QR detected (silent monitoring)`);
        }
    }

    async detectQRCode(captures) {
        // Use setTimeout to ensure this runs after capture completion and doesn't block preview
        setTimeout(async () => {
            try {
                if (!this.qrDetector) {
                    this.qrDetector = new QRDetector();
                }

                console.log('🔍 Starting QR detection process...');
                console.log('🔍 Available captures:', Object.keys(captures));

                // Try to detect QR from right camera first (usually front page)
                let qrResult = null;
                let detectedSide = null;
                
                if (captures.right && captures.right.originalBlob) {
                    console.log('🔍 Checking right camera for QR code...');
                    console.log('🔍 Right camera blob size:', captures.right.originalBlob.size);
                    qrResult = await this.qrDetector.detectQRFromBlob(captures.right.originalBlob);
                    if (qrResult) {
                        detectedSide = 'right';
                        console.log('✅ QR code found on right camera:', qrResult.data);
                    }
                }
                
                // If not found, try left camera
                if (!qrResult && captures.left && captures.left.originalBlob) {
                    console.log('🔍 Checking left camera for QR code...');
                    console.log('🔍 Left camera blob size:', captures.left.originalBlob.size);
                    qrResult = await this.qrDetector.detectQRFromBlob(captures.left.originalBlob);
                    if (qrResult) {
                        detectedSide = 'left';
                        console.log('✅ QR code found on left camera:', qrResult.data);
                    }
                }

                // Process QR result
                if (qrResult && this.qrDetector.validateQRData(qrResult.data)) {
                    if (!this.pdfName) {
                        this.pdfName = this.qrDetector.cleanQRDataForFilename(qrResult.data);
                        console.log('🔍 QR Code detected, PDF name set to:', this.pdfName);
                        
                        // Store initial QR code for monitoring
                        if (!this.initialQRCode) {
                            this.initialQRCode = qrResult.data;
                            console.log('🔍 QR Monitor: Initial QR stored from first detection:', this.initialQRCode);
                        }
                        
                        // Note: Scan timing now starts from first spacebar press, not QR detection
                        
                        // Update the header QR display
                        this.updateHeaderQRDisplay(detectedSide, qrResult.data);
                        
                        // Notify UI about QR detection
                        this.notifyQRDetected(qrResult);
                    } else {
                        console.log('⚠️ QR code found but PDF name already set to:', this.pdfName);
                    }
                } else if (qrResult && !this.qrDetector.validateQRData(qrResult.data)) {
                    console.log('⚠️ QR code found but invalid data:', qrResult.data);
                    console.log('⚠️ Validation failed - length:', qrResult.data.length, 'contains invalid chars:', /[<>:"/\\|?*]/g.test(qrResult.data));
                    // Clear display for invalid QR
                    this.clearQRDisplay();
                } else if (!qrResult) {
                    console.log('⚠️ No QR code found on either camera');
                    // Clear any existing QR display since no QR was found
                    this.clearQRDisplay();
                }
            } catch (error) {
                console.error('QR detection failed:', error);
                // Clear display on error
                this.clearQRDisplay();
            }
        }, 0); // Run on next tick to avoid blocking capture
    }

    clearQRDisplay() {
        // Clear both left and right QR displays
        const leftQRElement = document.getElementById('left-qr-value');
        const rightQRElement = document.getElementById('right-qr-value');
        
        if (leftQRElement) {
            leftQRElement.textContent = 'Not detected';
            leftQRElement.classList.remove('detected');
        }
        
        if (rightQRElement) {
            rightQRElement.textContent = 'Not detected';  
            rightQRElement.classList.remove('detected');
        }
        
        console.log('🔍 QR display cleared (no valid QR code found)');
    }

    // Scanner Gun Integration Methods
    setScannerGunQR(qrData) {
        this.scannerGunQR = qrData;
        console.log('🔫 Scanner gun QR stored:', qrData);
        
        // Update PDF name with highest priority (scanner gun overrides camera QR)
        this.pdfName = this.cleanQRDataForFilename(qrData);
        
        // Update header display to show scanner gun QR
        this.updateScannerGunDisplay(qrData);
        
        // Store as initial QR for monitoring if not set
        if (!this.initialQRCode) {
            this.initialQRCode = qrData;
        }
        
        console.log('📄 PDF name set from scanner gun:', this.pdfName);
    }

    updateScannerGunDisplay(qrData) {
        // Update scanner gun status in header
        const statusElement = document.getElementById('scanner-gun-status');
        const valueElement = document.getElementById('scanner-gun-value');
        
        if (statusElement) {
            statusElement.textContent = 'Active';
            statusElement.className = 'scanner-gun-status detected';
        }
        
        if (valueElement) {
            const displayText = qrData.length > 12 ? qrData.substring(0, 12) + '...' : qrData;
            valueElement.textContent = displayText;
        }
        
        console.log('🔫 Scanner gun display updated:', qrData);
    }

    getPDFName() {
        // Priority: Scanner Gun > Camera QR > DateTime fallback
        if (this.scannerGunQR) {
            return this.cleanQRDataForFilename(this.scannerGunQR);
        } else if (this.pdfName) {
            return this.pdfName;
        } else {
            // Fallback to datetime
            const now = new Date();
            const timestamp = now.toISOString()
                .replace(/T/, '_')
                .replace(/:/g, '-')
                .split('.')[0];
            return `booklet_scan_${timestamp}`;
        }
    }

    cleanQRDataForFilename(qrData) {
        // Clean QR data to be a valid filename
        return qrData
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50) // Limit length
            .replace(/_+$/, ''); // Remove trailing underscores
    }

    resetQRDetection() {
        this.pdfName = null;
        this.scannerGunQR = null;
        this.initialQRCode = null;
        this.clearQRDisplay();
        
        // Reset scanner gun display
        const statusElement = document.getElementById('scanner-gun-status');
        
        if (statusElement) {
            statusElement.textContent = 'Ready';
            statusElement.className = 'scanner-status standby';
        }
        
        console.log('🔄 QR detection state reset');
    }

    updateHeaderQRDisplay(side, qrData) {
        // Update the header QR display placeholders
        const leftQRElement = document.getElementById('left-qr-value');
        const rightQRElement = document.getElementById('right-qr-value');
        
        if (side === 'left' && leftQRElement) {
            leftQRElement.textContent = qrData;
            leftQRElement.classList.add('detected');
            leftQRElement.setAttribute('data-source', 'camera');
            console.log('📱 Updated left QR display:', qrData);
        } else if (side === 'right' && rightQRElement) {
            // Only update if no scanner gun QR is already displayed
            const currentSource = rightQRElement.getAttribute('data-source');
            if (currentSource !== 'scanner-gun') {
                rightQRElement.textContent = qrData;
                rightQRElement.classList.add('detected');
                rightQRElement.setAttribute('data-source', 'camera');
                console.log('📱 Updated right QR display:', qrData);
            } else {
                console.log('📱 Right QR display already shows scanner gun data, camera QR not displayed');
            }
        }
        
        // Also update the main app's QR display if available
        if (window.bookletScannerApp && window.bookletScannerApp.updateQRDisplay) {
            window.bookletScannerApp.updateQRDisplay(side, qrData);
        }
    }

    // Scanner Gun Integration Methods
    setScannerGunQR(qrData) {
        this.scannerGunQR = qrData;
        console.log('🔫 Scanner gun QR stored:', qrData);
        
        // Update PDF name with highest priority (scanner gun overrides camera QR)
        this.pdfName = this.cleanQRDataForFilename(qrData);
        
        // Store as initial QR for monitoring if not set
        if (!this.initialQRCode) {
            this.initialQRCode = qrData;
        }
        
        console.log('📄 PDF name set from scanner gun:', this.pdfName);
    }

    updateScannerGunDisplay(qrData) {
        // This method is now handled in QR detector, keeping for compatibility
        console.log('🔫 Scanner gun display updated (handled by QR detector):', qrData);
    }

    async storeTemporaryImage(capture) {
        // Skip server-side storage for now - not critical for PDF generation
        // The client has all the image data needed for PDF creation
        console.log(`⏭️ Skipping server storage for ${capture.id} (client-side data available)`);
        return;
        
        // Original code disabled until server-side issue is resolved:
        try {
            const formData = new FormData();
            formData.append('image', capture.originalBlob, `${capture.id}.jpg`);
            formData.append('metadata', JSON.stringify({
                id: capture.id,
                side: capture.side,
                spreadIndex: capture.spreadIndex,
                sessionId: capture.sessionId,
                timestamp: capture.timestamp
            }));

            const response = await fetch('/api/images/store-temp', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to store image: ${response.status}`);
            }

            const result = await response.json();
            capture.serverPath = result.path;
            console.log(`💾 Image stored: ${capture.id}`);

        } catch (error) {
            console.warn('Failed to store temporary image:', error);
            // Don't throw error - this is not critical for PDF generation
            // The image data is still available in memory for PDF creation
        }
    }

    async generatePreviewThumbnails(captures, spreadIndex) {
        try {
            // Generate thumbnails for preview display
            if (captures.left) {
                captures.left.thumbnail = await this.createThumbnail(captures.left.dataUrl);
            }
            
            if (captures.right) {
                captures.right.thumbnail = await this.createThumbnail(captures.right.dataUrl);
            }

            // Update preview UI
            this.updatePreviewDisplay(captures, spreadIndex);

        } catch (error) {
            console.error('Failed to generate thumbnails:', error);
        }
    }

    async createThumbnail(dataUrl, maxWidth = 150, maxHeight = 190) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate thumbnail dimensions
                const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                // Draw thumbnail
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = dataUrl;
        });
    }

    updatePreviewDisplay(captures, spreadIndex) {
        // Get total spreads to determine spread type
        const totalSpreads = window.bookletScannerApp?.spreadManager?.totalSpreads || 0;
        
        // Update the preview section with captured images respecting spread logic
        requestAnimationFrame(() => {
            const currentLeftPage = document.getElementById('current-left-page');
            const currentRightPage = document.getElementById('current-right-page');
            
            // First spread: right page only (book closed)
            if (spreadIndex === 0) {
                if (currentLeftPage) {
                    currentLeftPage.innerHTML = '<span>No Image</span>';
                    currentLeftPage.className = 'page-thumbnail';
                }
                if (currentRightPage && captures.right) {
                    currentRightPage.innerHTML = `
                        <img src="${captures.right.thumbnail}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">
                        <div class="page-number">${this.getPageNumber(spreadIndex, 'right')}</div>
                    `;
                    currentRightPage.className = 'page-thumbnail captured';
                }
            }
            // Last spread: left page only (book closed)
            else if (spreadIndex === totalSpreads - 1) {
                if (currentLeftPage && captures.left) {
                    currentLeftPage.innerHTML = `
                        <img src="${captures.left.thumbnail}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">
                        <div class="page-number">${this.getPageNumber(spreadIndex, 'left')}</div>
                    `;
                    currentLeftPage.className = 'page-thumbnail captured';
                }
                if (currentRightPage) {
                    currentRightPage.innerHTML = '<span>No Image</span>';
                    currentRightPage.className = 'page-thumbnail';
                }
            }
            // Middle spreads: both pages (book open)
            else {
                if (currentLeftPage && captures.left) {
                    currentLeftPage.innerHTML = `
                        <img src="${captures.left.thumbnail}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">
                        <div class="page-number">${this.getPageNumber(spreadIndex, 'left')}</div>
                    `;
                    currentLeftPage.className = 'page-thumbnail captured';
                }
                
                if (currentRightPage && captures.right) {
                    currentRightPage.innerHTML = `
                        <img src="${captures.right.thumbnail}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">
                        <div class="page-number">${this.getPageNumber(spreadIndex, 'right')}</div>
                    `;
                    currentRightPage.className = 'page-thumbnail captured';
                }
            }
        });
    }

    getPageNumber(spreadIndex, side) {
        // Calculate page number based on spread index and side
        if (spreadIndex === 0) {
            return side === 'right' ? 1 : '';
        }
        
        const leftPageNum = (spreadIndex - 1) * 2 + 2;
        return side === 'left' ? leftPageNum : leftPageNum + 1;
    }

    notifyQRDetected(qrResult) {
        // Create visual notification for QR detection (non-blocking)
        requestAnimationFrame(() => {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background: #4CAF50; color: white; padding: 10px 20px;
                border-radius: 5px; z-index: 1000; font-weight: bold;
            `;
            notification.textContent = `📄 PDF Name: ${this.pdfName}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 3000);
        });
    }

    handleEscapeKey() {
        // Handle ESC key for fallback naming
        if (!this.pdfName) {
            this.pdfName = this.qrDetector ? 
                this.qrDetector.generateFallbackFilename() : 
                this.generateShortTimestamp();
            
            console.log('⌨️ ESC pressed, using fallback PDF name:', this.pdfName);
            this.notifyFallbackNaming();
        }
    }

    generateShortTimestamp() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${day}${month}-${hours}${minutes}${seconds}`;
    }

    notifyFallbackNaming() {
        // Create notification asynchronously to avoid blocking
        requestAnimationFrame(() => {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background: #ff9800; color: white; padding: 10px 20px;
                border-radius: 5px; z-index: 1000; font-weight: bold;
            `;
            notification.textContent = `📅 Using date/time name: ${this.pdfName}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 3000);
        });
    }

    // Event handlers for worker responses
    onImageProcessed(data) {
        console.log('Image processed:', data);
    }

    async onTrimApplied(data) {
        console.log('Trim applied:', data);
        
        // If worker indicated main thread processing is needed, do it here
        if (data.needsMainThreadTrim && data.trimSettings) {
            try {
                const trimmedResult = await this.applyTrimMainThread(data, data.trimSettings);
                // Update the capture data with trimmed result
                Object.assign(data, trimmedResult);
                console.log('✅ Main thread trim completed:', data);
            } catch (error) {
                console.error('Main thread trim failed:', error);
                // Fallback to using original image without trimming
                data.trimmed = false;
            }
        }
    }

    async applyTrimMainThread(capture, trimSettings) {
        return new Promise((resolve, reject) => {
            if (!capture || !capture.dataUrl) {
                reject(new Error('No image data'));
                return;
            }

            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate crop rectangle
                    const cropX = trimSettings.left || 0;
                    const cropY = trimSettings.top || 0;
                    const cropW = img.width - (trimSettings.left || 0) - (trimSettings.right || 0);
                    const cropH = img.height - (trimSettings.top || 0) - (trimSettings.bottom || 0);
                    
                    // Set canvas size to cropped dimensions
                    canvas.width = cropW;
                    canvas.height = cropH;
                    
                    // Draw cropped image
                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                    
                    // Convert to blob and dataURL
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onload = function() {
                            resolve({
                                trimmed: true,
                                trimmedBlob: blob,
                                trimmedDataUrl: reader.result,
                                trimSettings
                            });
                        };
                        reader.readAsDataURL(blob);
                    }, 'image/jpeg', 0.95);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = function() {
                reject(new Error('Image load failed'));
            };
            img.src = capture.dataUrl;
        });
    }

    onThumbnailGenerated(data) {
        console.log('Thumbnail generated:', data);
    }

    // Public API methods
    getCapturedImages() {
        return this.capturedImages;
    }

    getPDFName() {
        return this.pdfName || this.qrDetector?.generateFallbackFilename() || 'booklet_scan';
    }

    getScanDuration() {
        if (!this.scanStartTime) return null;
        const duration = new Date() - this.scanStartTime;
        return duration / 1000; // Return duration in seconds as a number
    }

    getSessionId() {
        return this.sessionId;
    }

    // Cleanup
    cleanup() {
        if (this.captureWorker) {
            this.captureWorker.terminate();
        }
        
        if (this.qrDetector) {
            this.qrDetector.destroy();
        }
        
        this.capturedImages.clear();
    }

    // Reset QR detection state (useful for testing or retakes)
    resetQRDetection() {
        this.pdfName = null;
        this.scanStartTime = null; // Reset scan timing
        this.initialQRCode = null; // Reset QR monitoring
        this.clearQRDisplay();
        
        // Reset QR detector cache
        if (this.qrDetector && this.qrDetector.lastDetectedQR) {
            this.qrDetector.lastDetectedQR.clear();
        }
        
        console.log('🔄 QR detection state reset (including QR monitoring)');
    }

    // Toggle fast preview mode for performance testing
    toggleFastPreviewMode() {
        this.fastPreviewMode = !this.fastPreviewMode;
        console.log(`⚡ Fast Preview Mode: ${this.fastPreviewMode ? 'ENABLED' : 'DISABLED'} - ${this.fastPreviewMode ? 'Images shown immediately, enhanced in background' : 'Images enhanced before display'}`);
        return this.fastPreviewMode;
    }

    // Clear captured images for a specific spread (for retakes)
    clearSpreadImages(spreadIndex) {
        try {
            console.log(`🔄 Clearing images for spread ${spreadIndex + 1}`);
            
            // Clear captured images for this spread from the captured images map
            const keysToDelete = [];
            for (let [key, value] of this.capturedImages.entries()) {
                // Convert key to string if it's not already
                const keyStr = String(key);
                if (keyStr.startsWith(`spread_${spreadIndex}_`)) {
                    keysToDelete.push(key);
                }
            }
            
            // Delete the identified keys
            for (let key of keysToDelete) {
                this.capturedImages.delete(key);
                console.log(`🗑️ Cleared image: ${key}`);
            }
            
            console.log(`✅ Cleared ${keysToDelete.length} images for spread ${spreadIndex + 1}`);
        } catch (error) {
            console.error(`❌ Error clearing spread ${spreadIndex + 1} images:`, error);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageCaptureManager;
}