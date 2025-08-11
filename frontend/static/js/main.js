/**
 * Main Application - Initializes and coordinates all managers
 * Entry point for the booklet scanner application
 */
class BookletScannerApp {
    constructor() {
        this.spreadManager = null;
        this.cameraManager = null;
        this.pdfGenerator = null;
        this.settingsManager = null;
        this.qrDetector = null;
        this.qrDetectionIntervals = {
            left: null,
            right: null
        };
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('App already initialized');
            return;
        }

        try {
            console.log('Initializing Booklet Scanner App...');

            // Initialize settings manager first
            this.settingsManager = new HybridSettingsManager();
            await this.settingsManager.initialize();
            
            // Make settings manager globally accessible
            window.settingsManager = this.settingsManager;

            // Initialize core managers
            this.spreadManager = new SpreadManager(this.settingsManager);
            this.cameraManager = new CameraManager();
            this.pdfGenerator = new PDFGenerator();
            this.qrDetector = new QRDetector();
            this.imageCaptureManager = new ImageCaptureManager();

            // Connect managers
            this.pdfGenerator.setSpreadManager(this.spreadManager);
            this.pdfGenerator.setImageCaptureManager(this.imageCaptureManager);

            // Initialize cameras
            await this.cameraManager.initializeCameras();

            // Make camera manager globally accessible
            window.cameraManager = this.cameraManager;
            
            // Make PDF generator globally accessible
            window.pdfGenerator = this.pdfGenerator;
            
            // Make image capture manager globally accessible
            window.imageCaptureManager = this.imageCaptureManager;

            // Add test functions for QR detection debugging
            window.testQRDetection = () => {
                console.log('🧪 QR Detection Test Functions:');
                console.log('- window.imageCaptureManager.resetQRDetection() - Reset QR detection state');
                console.log('- window.imageCaptureManager.getPDFName() - Get current PDF name');
                console.log('- window.imageCaptureManager.clearQRDisplay() - Clear QR display');
                console.log('- window.testQRMonitoring() - Test QR monitoring functionality');
                console.log('- window.toggleFastPreview() - Toggle fast preview mode for performance testing');
                console.log('- window.bookletScannerApp.qrDetector.toggleROIMode() - Toggle ROI-based QR detection');
                console.log('- window.bookletScannerApp.qrDetector.enableScannerGunFallback() - Enable scanner gun mode');
                console.log('- window.bookletScannerApp.qrDetector.getDetectionStats() - Get QR detection statistics');
                console.log('- window.showQRROI() - Visualize QR detection region');
                console.log('- window.restartQRDetection() - Manually restart QR detection');
                console.log('🔫 Scanner Gun Functions:');
                console.log('- window.testScannerGun() - Test scanner gun functionality');
                console.log('- window.imageCaptureManager.setScannerGunQR("TEST123") - Simulate scanner gun input');
                console.log('- Current PDF name: ' + (window.imageCaptureManager?.getPDFName() || 'booklet_scan'));
                console.log('- QR detector status:', window.imageCaptureManager.qrDetector?.getStatus());
                console.log('- Initial QR Code:', window.imageCaptureManager?.initialQRCode);
                console.log('- Scanner Gun QR:', window.imageCaptureManager?.scannerGunQR);
                console.log('- Fast Preview Mode:', window.imageCaptureManager?.fastPreviewMode);
                console.log('- QR ROI Mode:', window.bookletScannerApp?.qrDetector?.roiMode);
                console.log('- Scanner Gun Mode:', window.bookletScannerApp?.qrDetector?.scannerGunEnabled);
            };

            // Add ROI visualization function
            window.showQRROI = () => {
                console.log('🎯 Showing QR ROI visualization...');
                
                // Find video or canvas elements for both sides
                const sides = ['left', 'right'];
                let foundElements = 0;
                
                sides.forEach(side => {
                    // Try to find video element first
                    let videoElement = document.querySelector(`video[data-camera="${side}"]`);
                    if (!videoElement) {
                        const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
                        if (previewElement) {
                            videoElement = previewElement.querySelector('video');
                        }
                    }
                    
                    // If no video, use canvas element
                    let canvasElement = null;
                    if (!videoElement) {
                        canvasElement = document.querySelector(`.camera-preview.${side}-camera canvas`);
                    }
                    
                    const element = videoElement || canvasElement;
                    const elementType = videoElement ? 'video' : 'canvas';
                    
                    if (element && (element.videoWidth > 0 || element.width > 0)) {
                        foundElements++;
                        const width = element.videoWidth || element.width;
                        const height = element.videoHeight || element.height;
                        const roi = window.bookletScannerApp.qrDetector.calculateQRROI(width, height);
                        
                        console.log(`📐 ${side.toUpperCase()} Camera (${elementType}):`, {
                            elementSize: `${width}×${height}`,
                            roi: `${roi.x},${roi.y} ${roi.width}×${roi.height}`,
                            roiPercentage: `${((roi.width * roi.height) / (width * height) * 100).toFixed(1)}%`
                        });
                        
                        // Create overlay to show ROI
                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position: absolute;
                            border: 3px solid #00ff00;
                            background: rgba(0, 255, 0, 0.1);
                            z-index: 1000;
                            pointer-events: none;
                            box-sizing: border-box;
                        `;
                        
                        const preview = document.querySelector(`.camera-preview.${side}-camera`);
                        if (preview) {
                            const rect = preview.getBoundingClientRect();
                            
                            // For canvas elements, the ROI coordinates are already in display space
                            let scaleX, scaleY;
                            if (elementType === 'canvas') {
                                scaleX = 1; // Canvas coordinates match display coordinates
                                scaleY = 1;
                            } else {
                                scaleX = rect.width / width;
                                scaleY = rect.height / height;
                            }
                            
                            overlay.style.left = (roi.x * scaleX) + 'px';
                            overlay.style.top = (roi.y * scaleY) + 'px';
                            overlay.style.width = (roi.width * scaleX) + 'px';
                            overlay.style.height = (roi.height * scaleY) + 'px';
                            
                            preview.style.position = 'relative';
                            preview.appendChild(overlay);
                            
                            // Add label
                            const label = document.createElement('div');
                            label.style.cssText = `
                                position: absolute;
                                top: -25px;
                                left: 0;
                                background: #00ff00;
                                color: #000;
                                padding: 2px 8px;
                                font-size: 12px;
                                font-weight: bold;
                                border-radius: 3px;
                            `;
                            label.textContent = `QR Zone (${side.toUpperCase()}) - ${elementType}`;
                            overlay.appendChild(label);
                            
                            console.log(`✅ ROI overlay added to ${side} camera preview (${elementType})`);
                            
                            // Auto-remove after 15 seconds
                            setTimeout(() => {
                                if (overlay.parentNode) {
                                    overlay.parentNode.removeChild(overlay);
                                    console.log(`🗑️ ROI overlay removed from ${side} camera`);
                                }
                            }, 15000);
                        } else {
                            console.warn(`⚠️ Could not find preview element for ${side} camera`);
                        }
                    } else {
                        console.warn(`⚠️ Could not find active element for ${side} camera`);
                    }
                });
                
                if (foundElements === 0) {
                    console.error('❌ No camera elements found. Make sure cameras are started.');
                } else {
                    console.log(`✅ ROI visualization shown for ${foundElements} camera(s)`);
                }
            };

            // Add manual QR detection restart function
            window.restartQRDetection = () => {
                console.log('🔄 Manually restarting QR detection...');
                
                // Stop existing detection
                window.bookletScannerApp.stopQRDetection();
                
                // Wait a moment then restart
                setTimeout(() => {
                    window.bookletScannerApp.startQRDetection();
                    console.log('✅ QR detection restarted');
                }, 500);
            };

            // Add performance testing function
            window.toggleFastPreview = () => {
                const enabled = window.imageCaptureManager.toggleFastPreviewMode();
                console.log('⚡ Performance Test Mode:');
                console.log(`  Fast Preview: ${enabled ? 'ON' : 'OFF'}`);
                console.log(`  Effect: ${enabled ? 'Images show immediately, enhancement runs in background' : 'Images enhanced before showing (slower but higher quality)'}`);
                console.log('  📊 Test by pressing Space bar and measuring time to preview');
                return enabled;
            };

            // Add QR monitoring test function
            window.testQRMonitoring = () => {
                console.log('🔍 QR Monitoring Test:');
                console.log('- QR Monitoring Enabled:', window.imageCaptureManager.qrMonitoringEnabled);
                console.log('- Initial QR Code:', window.imageCaptureManager.initialQRCode);
                console.log('- Current PDF Name:', window.imageCaptureManager.pdfName);
                
                if (window.imageCaptureManager.initialQRCode) {
                    console.log('✅ QR monitoring is active and will compare future QR codes with:', window.imageCaptureManager.initialQRCode);
                } else {
                    console.log('⚠️ No initial QR code set yet. QR monitoring will detect and store the first QR found during scanning.');
                }
                
                console.log('📚 How QR monitoring works:');
                console.log('  1. Start scanning with Space bar (no QR required beforehand)');
                console.log('  2. Monitor will check top-right corner of each captured spread');
                console.log('  3. First QR found will be stored as "initial QR"');
                console.log('  4. Subsequent scans will compare against initial QR');
                console.log('  5. Console will log: "Same QR", "ALERT - Different QR", or "No QR detected"');
                console.log('  6. Press ESC to reset and start fresh');
            };

            // Add scanner gun test function
            window.testScannerGun = () => {
                console.log('🔫 Scanner Gun Test:');
                console.log('- Scanner Gun Enabled:', window.bookletScannerApp?.qrDetector?.scannerGunEnabled);
                console.log('- Scanner Gun QR:', window.imageCaptureManager?.scannerGunQR);
                console.log('- Current Buffer:', window.bookletScannerApp?.qrDetector?.scannerBuffer);
                
                const status = window.bookletScannerApp?.qrDetector?.getScannerGunStatus();
                if (status) {
                    console.log('- Scanner Status:', status);
                }
                
                console.log('📚 How scanner gun detection works:');
                console.log('  ⚠️ Browser CANNOT detect if USB scanner is physically connected');
                console.log('  ✅ Browser CAN detect fast keyboard input from scanner gun');
                console.log('  🔍 Status shows software readiness, not hardware connection');
                console.log('  📱 "Listening" = Ready to receive scanner gun input');
                console.log('  🎯 "Active" = Scanner gun recently used');
                console.log('');
                console.log('📋 To test:');
                console.log('  1. Connect scanner gun USB cable');
                console.log('  2. Scan a QR code (should type very fast)');
                console.log('  3. Watch console for "Fast typing detected"');
                console.log('  4. Or use: window.bookletScannerApp.qrDetector.simulateScannerGun("TEST123")');
                
                // Show current PDF name generation
                const pdfName = window.imageCaptureManager?.getPDFName();
                console.log('🎯 Current PDF name would be:', pdfName);
                
                // Add debug listener
                console.log('🔧 Adding debug keyboard listener...');
                let debugCount = 0;
                document.addEventListener('keydown', (e) => {
                    debugCount++;
                    console.log(`🔧 DEBUG ${debugCount} - Key:`, e.key, 'Code:', e.keyCode, 'Time:', Date.now());
                    if (debugCount >= 10) {
                        console.log('🔧 Debug listener reached 10 events - stopping to avoid spam');
                        return;
                    }
                }, true);
                
                console.log('✅ Debug listener added - next 10 keystrokes will be logged');
            };

            // Make test function globally accessible
            window.testQRDetection();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Add PDF download functionality to UI
            this.addPDFControls();

            // Start QR detection after cameras are initialized
            this.startQRDetection();

            this.isInitialized = true;
            console.log('Booklet Scanner App initialized successfully');

            // Welcome message removed for better scanning experience

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showErrorMessage('Failed to initialize the application. Please refresh and try again.');
        }
    }

    setupGlobalEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause camera streams when page is hidden
                console.log('Page hidden - pausing cameras');
            } else {
                // Resume camera streams when page is visible
                console.log('Page visible - resuming cameras');
            }
        });

        // Handle beforeunload to cleanup resources
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Global app shortcuts
            if (e.code === 'F1') {
                e.preventDefault();
                this.showHelp();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                this.handleEscapeKey();
            }
        });
    }

    addPDFControls() {
        // Add Export section to the control panel
        const controlPanelUpper = document.querySelector('.control-panel-upper');
        if (controlPanelUpper) {
            const pdfSection = document.createElement('div');
            pdfSection.className = 'control-section pdf-section';
            pdfSection.innerHTML = `
                <h4>Export</h4>
                <div class="pdf-controls">
                    <div class="recent-pdfs" id="recent-pdfs">
                        <div class="loading">Loading...</div>
                    </div>
                </div>
            `;
            
            controlPanelUpper.appendChild(pdfSection);

            // Initialize recent PDFs list
            this.loadRecentPDFs();
            
            // Auto-refresh every 30 seconds
            setInterval(() => this.loadRecentPDFs(), 30000);
        }
    }

    async downloadPDF() {
        if (!this.pdfGenerator) {
            this.showErrorMessage('PDF generator not available');
            return;
        }

        try {
            await this.pdfGenerator.generatePDF({
                quality: 'high',
                format: 'A4',
                orientation: 'portrait',
                dpi: 'auto-optimize', // Auto-calculate DPI for 98% A4 coverage
                targetA4Coverage: 0.98 // 98% of A4 width
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.showErrorMessage('Failed to generate PDF. Please try again.');
        }
    }

    async exportImages() {
        if (!this.pdfGenerator) {
            this.showErrorMessage('Image export not available');
            return;
        }

        try {
            await this.pdfGenerator.exportImages('zip');
        } catch (error) {
            console.error('Error exporting images:', error);
            this.showErrorMessage('Failed to export images. Please try again.');
        }
    }

    async loadRecentPDFs() {
        try {
            console.log('📄 Loading recent PDFs...');
            const response = await fetch('/api/pdf/recent?limit=5');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📄 API Response:', data);
            
            const container = document.getElementById('recent-pdfs');
            if (!container) {
                console.warn('📄 Container #recent-pdfs not found');
                return;
            }
            
            if (data.status === 'success' && data.pdfs && data.pdfs.length > 0) {
                container.innerHTML = data.pdfs.map(pdf => {
                    // Format scan time as mm:ss
                    let scanTime = 'N/A';
                    if (pdf.scan_duration) {
                        const totalSeconds = Math.round(pdf.scan_duration);
                        const minutes = Math.floor(totalSeconds / 60);
                        const seconds = totalSeconds % 60;
                        scanTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                    
                    return `
                        <div class="pdf-item" onclick="window.open('${pdf.download_url}', '_blank')" title="Click to download ${pdf.filename}">
                            <div class="pdf-name">${pdf.display_name}</div>
                            <div class="pdf-time">⏱️ ${scanTime}</div>
                        </div>
                    `;
                }).join('');
                console.log(`📄 Loaded ${data.pdfs.length} PDFs successfully`);
            } else {
                container.innerHTML = '<div class="no-pdfs">No PDFs yet</div>';
                console.log('📄 No PDFs found or invalid response');
                if (data.debug_info) {
                    console.log('📄 Debug info:', data.debug_info);
                }
            }
        } catch (error) {
            console.error('📄 Error loading recent PDFs:', error);
            const container = document.getElementById('recent-pdfs');
            if (container) {
                container.innerHTML = `<div class="error">Failed to load: ${error.message}</div>`;
            }
        }
    }

    truncateFilename(filename, maxLength) {
        if (filename.length <= maxLength) return filename;
        return filename.substring(0, maxLength - 3) + '...';
    }

    showWelcomeMessage() {
        // Show brief welcome message
        const message = document.createElement('div');
        message.className = 'welcome-message';
        message.innerHTML = `
            <div class="welcome-content">
                <h3>📚 Booklet Scanner Ready</h3>
                <p>Press <kbd>Space</kbd> to start scanning spreads</p>
                <p>Press <kbd>Ctrl+P</kbd> to generate PDF</p>
                <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(message);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 5000);
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    showHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'help-overlay';
        helpDiv.innerHTML = `
            <div class="help-content">
                <h3>📖 Keyboard Shortcuts</h3>
                <div class="help-shortcuts">
                    <div><kbd>Space</kbd> - Capture current spread</div>
                    <div><kbd>←</kbd> / <kbd>→</kbd> - Navigate spreads</div>
                    <div><kbd>Ctrl+R</kbd> - Retake current spread</div>
                    <div><kbd>Ctrl+P</kbd> - Generate PDF</div>
                    <div><kbd>F1</kbd> - Show this help</div>
                    <div><kbd>Esc</kbd> - Reset QR codes and scanned images</div>
                </div>
                <div class="help-note">
                    <strong>Auto-Reset:</strong> After PDF generation, the session automatically resets (same as pressing ESC).<br>
                    <strong>ESC Key:</strong> Manually resets the scanning session - clears all detected QR codes and removes all captured images.
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(helpDiv);
    }

    closeModals() {
        // Close any open modals or overlays
        document.querySelectorAll('.welcome-message, .error-message, .help-overlay').forEach(modal => {
            modal.remove();
        });
    }

    startQRDetection() {
        // Only start QR detection if we're on the first spread and don't already have a PDF name
        if (this.spreadManager && this.spreadManager.currentSpreadIndex > 0) {
            console.log('🔍 QR detection skipped - not on first spread');
            return;
        }
        
        if (this.imageCaptureManager && this.imageCaptureManager.pdfName) {
            console.log('🔍 QR detection skipped - PDF name already set to:', this.imageCaptureManager.pdfName);
            return;
        }

        // Wait for QR detector to be ready
        setTimeout(() => {
            if (!this.qrDetector.isReady()) {
                console.log('QR detector not ready, retrying...');
                this.startQRDetection();
                return;
            }

            // Start QR detection for both cameras (first spread only)
            this.startQRDetectionForCamera('left');
            this.startQRDetectionForCamera('right');
            console.log('🔍 QR detection started for both cameras (first spread only)');
            
            // Listen for camera changes to restart QR detection
            this.setupCameraChangeListeners();
        }, 1000);
    }

    setupCameraChangeListeners() {
        // Listen for camera device changes
        const leftDeviceSelect = document.getElementById('left-camera-device');
        const rightDeviceSelect = document.getElementById('right-camera-device');
        
        if (leftDeviceSelect) {
            leftDeviceSelect.addEventListener('change', () => {
                // Only restart QR detection if we're still on the first spread and don't have a PDF name
                if ((!this.spreadManager || this.spreadManager.currentSpreadIndex <= 0) && 
                    (!this.imageCaptureManager || !this.imageCaptureManager.pdfName)) {
                    setTimeout(() => this.startQRDetectionForCamera('left'), 500);
                }
            });
        }
        
        if (rightDeviceSelect) {
            rightDeviceSelect.addEventListener('change', () => {
                // Only restart QR detection if we're still on the first spread and don't have a PDF name
                if ((!this.spreadManager || this.spreadManager.currentSpreadIndex <= 0) && 
                    (!this.imageCaptureManager || !this.imageCaptureManager.pdfName)) {
                    setTimeout(() => this.startQRDetectionForCamera('right'), 500);
                }
            });
        }
    }

    startQRDetectionForCamera(side) {
        // Try multiple ways to find video element for QR detection
        let videoElement = document.querySelector(`video[data-camera="${side}"]`);
        
        // If not found, try to find video in the camera preview area
        if (!videoElement) {
            const previewElement = document.querySelector(`.camera-preview.${side}-camera`);
            if (previewElement) {
                videoElement = previewElement.querySelector('video');
            }
        }
        
        // Also try to find canvas element for fallback detection
        let canvasElement = document.querySelector(`.camera-preview.${side}-camera canvas`);
        
        if (!videoElement && !canvasElement) {
            console.log(`🔍 No video or canvas found for ${side} camera, retrying...`);
            setTimeout(() => this.startQRDetectionForCamera(side), 500);
            return;
        }

        // Clear existing detection
        if (this.qrDetectionIntervals[side]) {
            clearInterval(this.qrDetectionIntervals[side]);
        }

        console.log(`Starting advanced QR detection for ${side} camera`);

        // Use advanced real-time detection for video elements
        if (videoElement && videoElement.videoWidth > 0) {
            console.log(`🎯 Using video element for ${side} QR detection: ${videoElement.videoWidth}×${videoElement.videoHeight}`);
            this.qrDetector.startAdvancedDetection(videoElement, side, (qrResult) => {
                console.log(`🔍 QR detected on ${side}:`, qrResult.data, qrResult.method);
                this.updateQRDisplay(side, qrResult.data);
            });
        } else if (canvasElement && canvasElement.width > 0) {
            console.log(`🎯 Using canvas element for ${side} QR detection: ${canvasElement.width}×${canvasElement.height}`);
            this.qrDetectionIntervals[side] = setInterval(async () => {
                try {
                    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                        const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
                        const qrResult = await this.qrDetector.detectQRFromImageData(imageData);
                        if (qrResult) {
                            console.log(`🔍 QR detected on ${side} canvas:`, qrResult.data);
                            this.updateQRDisplay(side, qrResult.data);
                        }
                    }
                } catch (error) {
                    console.error(`Canvas QR detection error for ${side}:`, error);
                }
            }, 250);
        } else {
            console.warn(`⚠️ Could not start QR detection for ${side}: video=${!!videoElement} (${videoElement?.videoWidth}×${videoElement?.videoHeight}), canvas=${!!canvasElement} (${canvasElement?.width}×${canvasElement?.height})`);
        }
    }

    clearQRDisplayIfStale(side) {
        // This could be enhanced to clear QR display after a certain time
        // For now, we'll keep the last detected QR code
    }

    updateQRDisplay(side, qrData) {
        const qrValueElement = document.getElementById(`${side}-qr-value`);
        if (qrValueElement) {
            qrValueElement.textContent = qrData || 'Not detected';
            qrValueElement.classList.toggle('detected', !!qrData);
            
            // Add visual feedback for new QR detection
            if (qrData) {
                qrValueElement.style.animation = 'none';
                setTimeout(() => {
                    qrValueElement.style.animation = 'qr-detected 0.5s ease-out';
                }, 10);
                
                // Check if this QR code should be used for PDF naming
                if (this.imageCaptureManager && !this.imageCaptureManager.pdfName) {
                    // Only process if we don't already have a PDF name
                    if (this.qrDetector.validateQRData(qrData)) {
                        this.imageCaptureManager.pdfName = this.qrDetector.cleanQRDataForFilename(qrData);
                        console.log('🔍 QR Code detected from real-time detection, PDF name set to:', this.imageCaptureManager.pdfName);
                        
                        // Store initial QR code for monitoring
                        if (!this.imageCaptureManager.initialQRCode) {
                            this.imageCaptureManager.initialQRCode = qrData;
                            console.log('🔍 QR Monitor: Initial QR stored from real-time detection:', qrData);
                        }
                        
                        // Stop all QR detection since we have a valid QR code
                        this.stopQRDetection();
                        console.log('🛑 QR detection stopped - PDF name locked to:', this.imageCaptureManager.pdfName);
                    }
                }
            }
        }
    }

    stopQRDetection() {
        // Stop advanced detection for both sides
        if (this.qrDetector) {
            this.qrDetector.stopAdvancedDetection('left');
            this.qrDetector.stopAdvancedDetection('right');
        }

        // Stop interval-based detection as fallback
        Object.keys(this.qrDetectionIntervals).forEach(side => {
            if (this.qrDetectionIntervals[side]) {
                clearInterval(this.qrDetectionIntervals[side]);
                this.qrDetectionIntervals[side] = null;
            }
        });
    }

    cleanup() {
        // Clean up resources before page unload
        this.stopQRDetection();
        
        if (this.cameraManager) {
            this.cameraManager.stopAllCameras();
        }
        
        if (this.qrDetector) {
            this.qrDetector.destroy();
        }
        
        console.log('App cleanup completed');
    }

    handleEscapeKey() {
        console.log('⌨️ ESC pressed - Initiating session reset...');
        
        // Always perform the full session reset (original ESC behavior)
        this.resetScanningSession();
    }

    resetScanningSession() {
        console.log('🔄 Resetting scanning session...');
        
        // Reset QR code values
        this.resetQRValues();
        
        // Reset scanned images/spreads
        this.resetScannedImages();
        
        // Restart QR detection for fresh session
        setTimeout(() => {
            this.startQRDetection();
            console.log('🔍 QR detection restarted after session reset');
        }, 100);
        
        // Show confirmation message
        this.showResetConfirmation();
    }

    resetQRValues() {
        console.log('🔄 Resetting QR code values...');
        
        // Clear QR display values
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
        
        // Reset image capture manager QR detection state
        if (this.imageCaptureManager) {
            this.imageCaptureManager.resetQRDetection();
        }
        
        // Reset QR detector cache
        if (this.qrDetector && this.qrDetector.lastDetectedQR) {
            this.qrDetector.lastDetectedQR.clear();
        }
        
        // Stop any active QR detection
        this.stopQRDetection();
        
        console.log('✅ QR code values reset');
    }

    resetScannedImages() {
        console.log('🔄 Resetting scanned images...');
        
        // Reset spreads in spread manager
        if (this.spreadManager) {
            this.spreadManager.resetAllSpreads();
        }
        
        console.log('✅ Scanned images reset');
    }

    showResetConfirmation() {
        // Create and show a brief confirmation message
        const confirmation = document.createElement('div');
        confirmation.className = 'reset-confirmation';
        
        confirmation.innerHTML = `
            <div class="reset-message">
                <span class="reset-icon">🔄</span>
                <span class="reset-text">Session Reset</span>
                <div class="reset-details">QR codes and scanned images cleared</div>
            </div>
        `;
        
        // Add styles
        confirmation.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .reset-message {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
            }
            .reset-icon {
                font-size: 18px;
            }
            .reset-details {
                font-size: 12px;
                opacity: 0.9;
                margin-top: 4px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(confirmation);
        
        // Remove after 3 seconds
        setTimeout(() => {
            confirmation.remove();
            style.remove();
        }, 3000);
    }

    // Public API methods
    getSpreadManager() {
        return this.spreadManager;
    }

    getCameraManager() {
        return this.cameraManager;
    }

    getPDFGenerator() {
        return this.pdfGenerator;
    }

    getSettingsManager() {
        return this.settingsManager;
    }

    isReady() {
        return this.isInitialized;
    }
}

// Global app instance
let bookletScannerApp = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    bookletScannerApp = new BookletScannerApp();
    await bookletScannerApp.initialize();
    
    // Make app globally accessible for debugging
    window.bookletScannerApp = bookletScannerApp;
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookletScannerApp;
}
