/**
 * SpreadManager - Manages spread navigation, capture, and display
 * Handles booklet scanning workflow and spread management
 */
class SpreadManager {
    constructor(settingsManager) {
        console.log('SpreadManager constructor starting...');
        this.spreads = [];
        this.currentSpreadIndex = -1;
        this.totalPages = 32; // Default, will be updated based on booklet settings
        this.supplementCount = 0; // Number of supplements
        this.totalSpreads = 0;
        this.isScanning = false;
        
        // Use passed settings manager reference
        this.settingsManager = settingsManager;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeFromForm(); // Initialize with current form values
        this.updateDisplay();
        console.log('SpreadManager constructor completed. Total spreads:', this.totalSpreads);
    }

    initializeElements() {
        this.currentLeftPage = document.getElementById('current-left-page');
        this.currentRightPage = document.getElementById('current-right-page');
        this.spreadSelector = document.getElementById('spread-selector');
        this.retakeButton = document.getElementById('retake-button');
        this.noSpreadsMessage = document.getElementById('no-spreads-message');
        this.noSpreadsText = document.getElementById('no-spreads-text');
        this.previewContent = document.getElementById('preview-content');
    }

    initializeFromForm() {
        // Get current form values
        const pagesDropdown = document.getElementById('main-pages-select');
        if (pagesDropdown) {
            this.totalPages = parseInt(pagesDropdown.value);
            console.log('Initialized main pages:', this.totalPages);
        }
        
        const selectedSupplements = document.querySelector('input[name="supplement-count"]:checked');
        if (selectedSupplements) {
            this.supplementCount = parseInt(selectedSupplements.value);
            console.log('Initialized supplement count:', this.supplementCount);
        }
        
        // Calculate total spreads after getting form values
        this.calculateTotalSpreads();
    }

    setupEventListeners() {
        // Navigation buttons removed (prev/next)
        
        // Retake button
        this.retakeButton.addEventListener('click', () => this.retakeCurrentSpread());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', async (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                await this.captureSpread();
            } else if (e.code === 'ArrowLeft') {
                this.navigateToSpread(this.currentSpreadIndex - 1);
            } else if (e.code === 'ArrowRight') {
                this.navigateToSpread(this.currentSpreadIndex + 1);
            } else if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                this.retakeCurrentSpread();
            }
        });

        // Listen to booklet configuration changes
        const pagesDropdown = document.getElementById('main-pages-select');
        if (pagesDropdown) {
            pagesDropdown.addEventListener('change', (e) => {
                this.totalPages = parseInt(e.target.value);
                console.log('Main pages changed to:', this.totalPages);
                this.calculateTotalSpreads();
                this.updateDisplay(); // Update full display, not just progress indicators
            });
        }

        // Listen to supplement count changes
        document.querySelectorAll('input[name="supplement-count"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                console.log('Supplement changed:', e.target.value);
                this.supplementCount = parseInt(e.target.value);
                console.log('New supplement count:', this.supplementCount);
                this.calculateTotalSpreads();
                console.log('New total spreads:', this.totalSpreads);
                this.updateDisplay(); // Update full display, not just progress indicators
            });
        });
        
        // Settings buttons
        const resetSettingsBtn = document.getElementById('reset-settings-btn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', async () => {
                if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                    await this.settingsManager.resetSettings();
                    // Trigger recalculation with new settings
                    this.initializeFromForm();
                    this.updateDisplay();
                }
            });
        }
        
        const exportSettingsBtn = document.getElementById('export-settings-btn');
        if (exportSettingsBtn) {
            exportSettingsBtn.addEventListener('click', () => {
                this.settingsManager.exportSettings();
            });
        }
    }

    calculateTotalSpreads() {
        // Calculate total pages including supplements (each supplement adds 4 pages)
        const totalPagesWithSupplements = this.totalPages + (this.supplementCount * 4);
        console.log('Total pages calculation:', this.totalPages, '+', this.supplementCount, '* 4 =', totalPagesWithSupplements);
        
        // Calculate spreads for the entire booklet (main + supplements as one continuous book)
        // Formula: (Total pages / 2) + 1
        // - First spread: 1 page (book closed, right page only)
        // - Middle spreads: 2 pages each for remaining pages
        // - Last spread: 1 page (book closed, left page only)
        this.totalSpreads = (totalPagesWithSupplements / 2) + 1;
        console.log('Final total spreads:', this.totalSpreads);
    }

    async captureSpread() {
        // Log space bar press
        console.log('[LOG] Space bar pressed. Attempting to capture spread. Current index:', this.currentSpreadIndex, 'Total spreads:', this.totalSpreads);
        if (this.currentSpreadIndex >= this.totalSpreads - 1) {
            // Removed: alert('All spreads have been captured!');
            console.log('[LOG] All spreads have already been captured. No further action.');
            return;
        }

        try {
            const spreadIndex = this.currentSpreadIndex + 1;
            // Show capturing status
            this.isScanning = true;
            
            // Capture from cameras using ImageCaptureManager
            let capturedImages = null;
            if (window.imageCaptureManager) {
                capturedImages = await window.imageCaptureManager.captureFromCameras(spreadIndex);
                console.log(`🔍 DEBUG: capturedImages from imageCaptureManager:`, capturedImages);
            } else if (window.cameraManager && window.cameraManager.isInitialized) {
                // Fallback to direct camera manager if image capture manager not available
                capturedImages = await window.cameraManager.captureBothCameras();
                console.log(`🔍 DEBUG: capturedImages from cameraManager:`, capturedImages);
            }

            // Create spread with captured images
            const spread = this.createSpread(spreadIndex, capturedImages);
            console.log(`🔍 DEBUG: Created spread:`, spread);
            console.log(`🔍 DEBUG: spread.leftPage?.imageData:`, spread?.leftPage?.imageData);
            console.log(`🔍 DEBUG: spread.rightPage?.imageData:`, spread?.rightPage?.imageData);

            if (spreadIndex < this.spreads.length) {
                this.spreads[spreadIndex] = spread;
            } else {
                this.spreads.push(spread);
            }

            this.currentSpreadIndex = spreadIndex;
            this.updateDisplay();

            // Stop QR detection after first spread is captured
            if (spreadIndex === 0 && window.bookletScannerApp) {
                console.log('🔍 First spread captured, stopping QR detection');
                window.bookletScannerApp.stopQRDetection();
                
                // Start timing from first spread capture (spacebar press)
                if (window.imageCaptureManager && !window.imageCaptureManager.scanStartTime) {
                    window.imageCaptureManager.scanStartTime = new Date();
                    console.log('⏱️ Scan timing started at first spread capture:', window.imageCaptureManager.scanStartTime.toISOString());
                }
            }

            this.isScanning = false;

            console.log(`✅ Spread ${spreadIndex + 1} captured successfully`);

            // --- Auto-generate PDF IMMEDIATELY if last spread just captured ---
            if (spreadIndex === this.totalSpreads - 1) {
                let pdfName = window.imageCaptureManager?.getPDFName?.();
                if (!pdfName || pdfName === 'booklet_scan') {
                    // Generate short timestamp-based fallback filename  
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
                    pdfName = `${day}${month}-${hours}${minutes}${seconds}.pdf`;
                } else {
                    // Ensure PDF extension
                    pdfName = pdfName.endsWith('.pdf') ? pdfName : `${pdfName}.pdf`;
                }
                
                console.log('[LOG] Last spread captured. Starting PDF generation. Filename:', pdfName);
                console.log('[LOG] QR-based name:', window.imageCaptureManager?.getPDFName?.());
                console.log('[LOG] Total spreads available for PDF:', this.spreads.length);
                console.log('[LOG] Spreads data:', this.spreads);
                
                if (window.pdfGenerator && window.pdfGenerator.generatePDF) {
                    // Use higher DPI (400) with 100% A4 coverage and stretch to fill
                    window.pdfGenerator.generatePDF({ 
                        filename: pdfName,
                        dpi: 400,
                        targetA4Coverage: 1.0,
                        stretchToFill: true
                    });
                } else {
                    console.error('[ERROR] PDF Generator not available!');
                }
            }
        } catch (error) {
            console.error('Failed to capture spread:', error);
            alert(`Failed to capture spread: ${error.message}`);
            this.isScanning = false;
        }
    }

    createSpread(index, capturedImages = null) {
        let leftPage = null;
        let rightPage = null;
        let pageNumbers = [];
        
        // Calculate total pages including supplements
        const totalPagesWithSupplements = this.totalPages + (this.supplementCount * 4);

        if (index === 0) {
            // First spread: Book closed, right page only (Page 1)
            rightPage = { 
                pageNumber: 1, 
                captured: true,
                imageData: capturedImages?.right || null,
                resolution: capturedImages?.right?.resolution || null
            };
            pageNumbers = [1];
        } else if (index === this.totalSpreads - 1) {
            // Last spread: Book closed, left page only (Last page of continuous booklet)
            leftPage = { 
                pageNumber: totalPagesWithSupplements, 
                captured: true,
                imageData: capturedImages?.left || null,
                resolution: capturedImages?.left?.resolution || null
            };
            pageNumbers = [totalPagesWithSupplements];
        } else {
            // Middle spreads: Book open, both pages (continuous page numbering)
            const leftPageNum = (index - 1) * 2 + 2;
            const rightPageNum = leftPageNum + 1;
            leftPage = { 
                pageNumber: leftPageNum, 
                captured: true,
                imageData: capturedImages?.left || null,
                resolution: capturedImages?.left?.resolution || null
            };
            rightPage = { 
                pageNumber: rightPageNum, 
                captured: true,
                imageData: capturedImages?.right || null,
                resolution: capturedImages?.right?.resolution || null
            };
            pageNumbers = [leftPageNum, rightPageNum];
        }

        return {
            index: index,
            leftPage: leftPage,
            rightPage: rightPage,
            pageNumbers: pageNumbers,
            timestamp: new Date(),
            status: 'captured',
            capturedImages: capturedImages
        };
    }

    navigateToSpread(index) {
        if (index < 0 || index >= this.spreads.length) return;
        this.currentSpreadIndex = index;
        this.updateDisplay();
    }

    retakeCurrentSpread() {
        if (this.currentSpreadIndex < 0 || this.currentSpreadIndex >= this.spreads.length) return;
        
        console.log(`🔄 Retaking spread ${this.currentSpreadIndex + 1}`);
        
        const retakeIndex = this.currentSpreadIndex;
        const spread = this.spreads[retakeIndex];
        
        // Clear the spread data completely
        spread.status = 'empty';
        spread.timestamp = null;
        spread.leftPage = null;
        spread.rightPage = null;
        
        // Clear captured images from image capture manager if available
        if (window.imageCaptureManager && window.imageCaptureManager.clearSpreadImages) {
            window.imageCaptureManager.clearSpreadImages(retakeIndex);
        }
        
        // Reset the current spread index to prepare for recapture
        // We need to step back one so that the next spacebar press captures this spread
        this.currentSpreadIndex = retakeIndex - 1;
        
        // Force immediate DOM update by calling updateDisplay
        this.updateDisplay();
        
        // Navigate back to show the cleared spread
        this.navigateToSpread(retakeIndex);
        
        // Force another display update to ensure changes are visible
        setTimeout(() => {
            this.updateDisplay();
        }, 50);
        
        console.log(`✅ Spread ${retakeIndex + 1} cleared for retake. Ready to recapture with spacebar.`);
    }

    clearSpreadThumbnails(spreadIndex) {
        // If this is the currently displayed spread, clear its thumbnails immediately
        if (spreadIndex === this.currentSpreadIndex) {
            this.currentLeftPage.innerHTML = '<span>No Image</span>';
            this.currentRightPage.innerHTML = '<span>No Image</span>';
            this.currentLeftPage.className = 'page-thumbnail';
            this.currentRightPage.className = 'page-thumbnail';
        }
    }

    updateDisplay() {
        this.updateCurrentSpreadDisplay();
        this.updateSpreadSelector();
        this.toggleNoSpreadsMessage();
    }

    updateCurrentSpreadDisplay() {
        // Check if DOM elements exist
        if (!this.currentLeftPage || !this.currentRightPage) {
            console.error('❌ DOM elements not found!', {
                currentLeftPage: !!this.currentLeftPage,
                currentRightPage: !!this.currentRightPage
            });
            return;
        }
        
        if (this.currentSpreadIndex < 0 || this.currentSpreadIndex >= this.spreads.length) {
            this.currentLeftPage.innerHTML = '<span>No Image</span>';
            this.currentRightPage.innerHTML = '<span>No Image</span>';
            this.currentLeftPage.className = 'page-thumbnail';
            this.currentRightPage.className = 'page-thumbnail';
            return;
        }

        const spread = this.spreads[this.currentSpreadIndex];
        
        // Update left page with forced refresh
        if (spread.leftPage && spread.leftPage.imageData && spread.leftPage.imageData.dataUrl) {
            this.currentLeftPage.innerHTML = `<img src="${spread.leftPage.imageData.dataUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">`;
            this.currentLeftPage.className = 'page-thumbnail captured';
        } else {
            this.currentLeftPage.innerHTML = '<span>No Image</span>';
            this.currentLeftPage.className = 'page-thumbnail';
        }

        // Update right page with forced refresh  
        if (spread.rightPage && spread.rightPage.imageData && spread.rightPage.imageData.dataUrl) {
            this.currentRightPage.innerHTML = `<img src="${spread.rightPage.imageData.dataUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 3px;">`;
            this.currentRightPage.className = 'page-thumbnail captured';
        } else {
            this.currentRightPage.innerHTML = '<span>No Image</span>';
            this.currentRightPage.className = 'page-thumbnail';
        }
        
        // Force DOM repaint
        this.currentLeftPage.offsetHeight;
        this.currentRightPage.offsetHeight;
    }

    // updateNavigationButtons and updateProgressIndicators removed

    updateSpreadSelector() {
        if (!this.spreadSelector) return;
        this.spreadSelector.innerHTML = '';
        for (let i = 0; i < this.totalSpreads; i++) {
            const isCaptured = i < this.spreads.length && this.spreads[i].status === 'captured';
            const isSelected = i === this.currentSpreadIndex;
            const hasBeenAttempted = i < this.spreads.length; // Spread exists even if retaken
            const spread = this.spreads[i];
            
            // Calculate page numbers for this spread
            let pageNumbers = [];
            const totalPagesWithSupplements = this.totalPages + (this.supplementCount * 4);
            if (i === 0) {
                pageNumbers = [1];
            } else if (i === this.totalSpreads - 1) {
                pageNumbers = [totalPagesWithSupplements];
            } else {
                const leftPageNum = (i - 1) * 2 + 2;
                const rightPageNum = leftPageNum + 1;
                pageNumbers = [leftPageNum, rightPageNum];
            }
            
            // Create button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'spread-radio-btn';
            
            // Add appropriate classes
            if (isCaptured) {
                btn.classList.add('captured');
            } else if (hasBeenAttempted) {
                btn.classList.add('retaken'); // New class for retaken spreads
            } else {
                btn.classList.add('inactive');
            }
            
            if (isSelected) btn.classList.add('selected');
            
            // Allow navigation to captured spreads OR retaken spreads (but not future spreads)
            btn.disabled = !hasBeenAttempted;
            
            btn.innerHTML = `<span>${i + 1}</span><span class="spread-page-label">${pageNumbers.join(' - ')}</span>`;
            btn.addEventListener('click', () => {
                if (hasBeenAttempted) {
                    this.navigateToSpread(i);
                }
            });
            this.spreadSelector.appendChild(btn);
        }
        // Retake button state
        if (this.retakeButton) {
            // Enable retake button for captured spreads or spreads that have been attempted (including retaken ones)
            const currentSpread = this.spreads[this.currentSpreadIndex];
            if (this.currentSpreadIndex >= 0 && this.currentSpreadIndex < this.spreads.length && 
                currentSpread && (currentSpread.status === 'captured' || currentSpread.status === 'empty')) {
                this.retakeButton.disabled = false;
            } else {
                this.retakeButton.disabled = true;
            }
        }
    }

    toggleNoSpreadsMessage() {
        if (this.spreads.length === 0) {
            this.noSpreadsMessage.style.display = 'flex';
        } else {
            this.noSpreadsMessage.style.display = 'none';
        }
    }

    // Public API methods for external access
    getSpreads() {
        return this.spreads;
    }

    getTotalSpreads() {
        return this.totalSpreads;
    }

    getCurrentSpreadIndex() {
        return this.currentSpreadIndex;
    }

    setTotalPages(pages) {
        this.totalPages = pages;
        this.calculateTotalSpreads();
        this.updateDisplay();
    }

    resetAllSpreads() {
        console.log('🔄 Resetting all spreads...');
        
        // Clear all spreads
        this.spreads = [];
        this.currentSpreadIndex = -1;
        this.isScanning = false;
        
        // Recalculate total spreads based on current settings
        this.calculateTotalSpreads();
        
        // Update display
        this.updateDisplay();
        
        console.log('✅ All spreads reset, total spreads:', this.totalSpreads);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpreadManager;
}