/**
 * PDFGenerator - Handles PDF creation from scanned images
 * Supports both client-side (jsPDF) and server-side PDF generation
 */
class PDFGenerator {
    constructor() {
        this.isGenerating = false;
        this.spreadManager = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Create PDF download button (will be added to UI)
        this.downloadButton = null;
        this.progressIndicator = null;
    }

    setupEventListeners() {
        // PDF generation shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP' && e.ctrlKey) {
                e.preventDefault();
                this.generatePDF();
            }
        });
    }

    setSpreadManager(spreadManager) {
        this.spreadManager = spreadManager;
    }

    setImageCaptureManager(imageCaptureManager) {
        this.imageCaptureManager = imageCaptureManager;
    }

    async generatePDF(options = {}) {
        console.log('[LOG] PDF generation requested. Options:', options);
        if (this.isGenerating) {
            console.log('PDF generation already in progress');
            return;
        }

        if (!this.spreadManager) {
            console.error('SpreadManager not set');
            return;
        }

        const spreads = this.spreadManager.getSpreads();
        if (spreads.length === 0) {
            alert('No spreads captured. Please scan some pages first.');
            return;
        }

        this.isGenerating = true;
        this.showProgress('Generating PDF...');
        console.log('[LOG] PDF generation started.');

        // Get scan duration BEFORE any potential session reset
        const scanDuration = this.imageCaptureManager?.getScanDuration?.() || null;
        console.log('🔍 Debug: Captured scan duration at PDF generation start:', scanDuration);

        try {
            // Default options
            const pdfOptions = {
                format: options.format || 'A4',
                orientation: options.orientation || 'portrait',
                quality: options.quality || 'high', // 'high', 'medium', 'preview'
                imageQuality: options.imageQuality || 'high', // Controls which image version to use
                includeMetadata: options.includeMetadata !== false,
                filename: options.filename || this.generateFilename(),
                optimizeDimensions: options.optimizeDimensions !== false, // Auto-calculate image dimensions
                ...options
            };

            console.log('[LOG] PDF generation options:', pdfOptions);
            console.log('[LOG] Number of spreads to process:', spreads.length);

            let pdfBlob;

            // Choose generation method
            if (options.serverSide || pdfOptions.quality === 'high') {
                try {
                    console.log('[LOG] Attempting server-side PDF generation...');
                    pdfBlob = await this.generateServerSidePDF(spreads, pdfOptions);
                    console.log('[LOG] Server-side PDF generation successful');
                } catch (error) {
                    console.warn('Server-side PDF generation failed, falling back to client-side:', error);
                    // Fall back to client-side generation
                    console.log('[LOG] Attempting client-side PDF generation...');
                    pdfBlob = await this.generateClientSidePDF(spreads, pdfOptions);
                    console.log('[LOG] Client-side PDF generation successful');
                }
            } else {
                console.log('[LOG] Using client-side PDF generation...');
                pdfBlob = await this.generateClientSidePDF(spreads, pdfOptions);
                console.log('[LOG] Client-side PDF generation successful');
            }

            // Download the PDF
            this.downloadPDF(pdfBlob, pdfOptions.filename, scanDuration);
            console.log('[LOG] PDF generated and download triggered. Filename:', pdfOptions.filename);
            
            // Refresh recent PDFs list after successful generation
            setTimeout(() => {
                if (window.bookletScannerApp && window.bookletScannerApp.loadRecentPDFs) {
                    window.bookletScannerApp.loadRecentPDFs();
                }
            }, 100);
            
            // Auto-reset session after successful PDF generation by triggering ESC functionality
            setTimeout(() => {
                if (window.bookletScannerApp && window.bookletScannerApp.handleEscapeKey) {
                    console.log('🔄 Auto-triggering ESC functionality after PDF generation...');
                    window.bookletScannerApp.handleEscapeKey();
                }
            }, 300); // Quick delay to allow download to start
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            this.isGenerating = false;
            this.hideProgress();
        }
    }

    async generateClientSidePDF(spreads, options) {
        // Check for jsPDF library (newer versions use window.jspdf.jsPDF)
        const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
        if (!jsPDFConstructor) {
            throw new Error('jsPDF library not loaded');
        }

        // Smart DPI calculation for optimal A4 coverage
        let dpi = options.dpi || 400; // Increased from 300 to 400 for better quality
        
        if (options.dpi === 'auto-optimize' && options.targetA4Coverage) {
            // Calculate optimal DPI based on actual image resolution
            const spreads = this.spreadManager.getSpreads();
            if (spreads.length > 0) {
                const sampleImage = spreads[0].leftPage?.imageData || spreads[0].rightPage?.imageData;
                if (sampleImage && (sampleImage.fullResolutionWidth || sampleImage.width)) {
                    const imageWidth = sampleImage.fullResolutionWidth || sampleImage.width;
                    const targetA4WidthMM = 210 * options.targetA4Coverage; // 98% of 210mm = 205.8mm
                    const targetA4WidthInches = targetA4WidthMM / 25.4;
                    dpi = Math.round(imageWidth / targetA4WidthInches);
                    console.log(`[DPI] Auto-optimized DPI: ${dpi} (${imageWidth}px → ${targetA4WidthMM.toFixed(1)}mm = ${(options.targetA4Coverage * 100)}% A4 width)`);
                }
            }
        }
        
        console.log(`[DPI] Using DPI for PDF images: ${dpi}`);
        
        const pdf = new jsPDFConstructor({
            orientation: options.orientation,
            unit: 'mm',
            format: options.format
        });

        // Add metadata
        if (options.includeMetadata) {
            pdf.setProperties({
                title: 'Scanned Booklet',
                subject: 'Booklet scanning result',
                author: 'Booklet Scanner',
                creator: 'Booklet Scanner App',
                creationDate: new Date()
            });
        }

        let isFirstPage = true;

        console.log('[DEBUG] Processing spreads for PDF:', spreads.length, 'spreads');
        console.log('[DEBUG] PDF quality mode:', options.quality);

        for (let i = 0; i < spreads.length; i++) {
            const spread = spreads[i];
            console.log(`[DEBUG] Processing spread ${i + 1}/${spreads.length}`);
            
            // Update progress for better UX
            this.showProgress(`Processing page ${i + 1} of ${spreads.length}...`);
            
            if (!isFirstPage) {
                pdf.addPage();
            }

            // Add spread images to PDF using high-resolution images
            if (spread.leftPage && spread.leftPage.imageData) {
                console.log(`[DEBUG] Adding left page for spread ${i + 1}`);
                
                // Get the best quality image data based on options
                const imageStart = performance.now();
                const leftImageData = await this.getBestImageData(spread.leftPage.imageData, options.imageQuality);
                const imageTime = performance.now() - imageStart;
                console.log(`[DEBUG] Left page processed in ${imageTime.toFixed(1)}ms`);
                
                if (leftImageData) {
                    try {
                        // Calculate optimal dimensions for the image with DPI and A4 coverage
                        const dimensions = await this.calculatePDFImageDimensions(leftImageData, options.format, dpi, options.targetA4Coverage || 1.0, options.stretchToFill || false);
                        pdf.addImage(
                            leftImageData,
                            'JPEG',
                            dimensions.x, dimensions.y,
                            dimensions.width, dimensions.height
                        );
                        console.log(`[DPI] Left page: image px: ${dimensions.imgWidth}x${dimensions.imgHeight}, PDF mm: ${dimensions.width}x${dimensions.height}, DPI: ${dpi}`);
                    } catch (error) {
                        // Fallback to fixed dimensions if calculation fails
                        console.warn('[DEBUG] Using fallback dimensions for left page:', error);
                        // Use full page dimensions as fallback
                        const fallbackWidth = 210;   // A4 width = 210mm
                        const fallbackHeight = 297;  // A4 height = 297mm
                        const x = 0;
                        const y = 0;
                        
                        pdf.addImage(
                            leftImageData,
                            'JPEG',
                            x, y,
                            fallbackWidth, fallbackHeight
                        );
                    }
                } else {
                    console.warn('[DEBUG] Left page image data invalid or not found');
                }
            }

            if (spread.rightPage && spread.rightPage.imageData) {
                console.log(`[DEBUG] Adding right page for spread ${i + 1}`);
                
                // Add new page for right page if left page exists
                if (spread.leftPage) {
                    pdf.addPage();
                }
                
                // Get the best quality image data
                const imageStart = performance.now();
                const rightImageData = await this.getBestImageData(spread.rightPage.imageData, options.imageQuality);
                const imageTime = performance.now() - imageStart;
                console.log(`[DEBUG] Right page processed in ${imageTime.toFixed(1)}ms`);
                
                if (rightImageData) {
                    try {
                        const dimensions = await this.calculatePDFImageDimensions(rightImageData, options.format, dpi, options.targetA4Coverage || 1.0, options.stretchToFill || false);
                        pdf.addImage(
                            rightImageData,
                            'JPEG',
                            dimensions.x, dimensions.y,
                            dimensions.width, dimensions.height
                        );
                        console.log(`[DPI] Right page: image px: ${dimensions.imgWidth}x${dimensions.imgHeight}, PDF mm: ${dimensions.width}x${dimensions.height}, DPI: ${dpi}`);
                    } catch (error) {
                        // Fallback to fixed dimensions if calculation fails
                        console.warn('[DEBUG] Using fallback dimensions for right page:', error);
                        // Use full page dimensions as fallback
                        const fallbackWidth = 210;   // A4 width = 210mm
                        const fallbackHeight = 297;  // A4 height = 297mm
                        const x = 0;
                        const y = 0;
                        
                        pdf.addImage(
                            rightImageData,
                            'JPEG',
                            x, y,
                            fallbackWidth, fallbackHeight
                        );
                    }
                } else {
                    console.warn('[DEBUG] Right page image data invalid or not found');
                }
            }

            isFirstPage = false;
        }

        return pdf.output('blob');
    }

    async generateServerSidePDF(spreads, options) {
        // Send request to backend for high-quality PDF generation
        const response = await fetch('/api/pdf/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                spreads: spreads,
                options: options
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Check if response is JSON (placeholder) or actual PDF
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Server returned JSON metadata instead of PDF - fall back to client-side
            console.warn('Server returned JSON metadata instead of PDF, falling back to client-side generation');
            throw new Error('Server-side PDF generation not fully implemented');
        }

        return await response.blob();
    }

    generateFilename() {
        // Try to get QR-based filename from ImageCaptureManager
        if (window.imageCaptureManager && window.imageCaptureManager.getPDFName) {
            const qrBasedName = window.imageCaptureManager.getPDFName();
            if (qrBasedName && qrBasedName !== 'booklet_scan') {
                // Add .pdf extension if not present
                return qrBasedName.endsWith('.pdf') ? qrBasedName : `${qrBasedName}.pdf`;
            }
        }
        
        // Fallback to timestamp-based filename
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${day}${month}-${hours}${minutes}${seconds}.pdf`;
    }

    downloadPDF(blob, filename, scanDuration = null) {
        // First, try to save to server storage
        this.savePDFToStorage(blob, filename, scanDuration).catch(error => {
            console.warn('Failed to save PDF to server storage:', error);
        });
        
        // Then download to user's device
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async savePDFToStorage(blob, filename, scanDuration = null) {
        try {
            const formData = new FormData();
            formData.append('pdf', blob, filename);
            
            // Add scan duration if available
            console.log('🔍 Debug: Using passed scan duration for PDF storage:', scanDuration);
            
            if (scanDuration !== null) {
                formData.append('scan_duration', scanDuration.toString());
                console.log('📊 Adding scan duration to PDF:', Math.round(scanDuration) + 's');
            } else {
                console.log('⚠️ No scan duration available - scanDuration is null');
            }
            
            const response = await fetch('/api/pdf/save-generated', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                console.log('✅ PDF saved to server storage:', filename);
            } else {
                console.warn('⚠️ Failed to save PDF to server storage:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Error saving PDF to server storage:', error);
        }
    }

    showProgress(message) {
        // Create or update progress indicator
        if (!this.progressIndicator) {
            this.progressIndicator = document.createElement('div');
            this.progressIndicator.className = 'pdf-progress-overlay';
            this.progressIndicator.innerHTML = `
                <div class="pdf-progress-content">
                    <div class="pdf-progress-spinner"></div>
                    <div class="pdf-progress-message">${message}</div>
                </div>
            `;
            document.body.appendChild(this.progressIndicator);
        } else {
            this.progressIndicator.querySelector('.pdf-progress-message').textContent = message;
            this.progressIndicator.style.display = 'flex';
        }
    }

    hideProgress() {
        if (this.progressIndicator) {
            this.progressIndicator.style.display = 'none';
        }
    }

    // Export options
    async exportImages(format = 'zip') {
        if (!this.spreadManager) {
            console.error('SpreadManager not set');
            return;
        }

        const spreads = this.spreadManager.getSpreads();
        if (spreads.length === 0) {
            alert('No spreads captured. Please scan some pages first.');
            return;
        }

        this.showProgress('Preparing image export...');

        try {
            if (format === 'zip') {
                await this.exportAsZip(spreads);
            } else {
                // Export individual images
                this.exportIndividualImages(spreads);
            }
        } catch (error) {
            console.error('Error exporting images:', error);
            alert('Failed to export images. Please try again.');
        } finally {
            this.hideProgress();
        }
    }

    async exportAsZip(spreads) {
        // This would use JSZip library when available
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded');
        }

        const zip = new JSZip();
        const imageFolder = zip.folder('scanned-pages');

        spreads.forEach((spread, spreadIndex) => {
            if (spread.leftPage && spread.leftPage.imageData) {
                const filename = `page-${spread.leftPage.pageNumber.toString().padStart(3, '0')}.jpg`;
                imageFolder.file(filename, spread.leftPage.imageData.split(',')[1], {base64: true});
            }
            
            if (spread.rightPage && spread.rightPage.imageData) {
                const filename = `page-${spread.rightPage.pageNumber.toString().padStart(3, '0')}.jpg`;
                imageFolder.file(filename, spread.rightPage.imageData.split(',')[1], {base64: true});
            }
        });

        const content = await zip.generateAsync({type: 'blob'});
        const filename = this.generateFilename().replace('.pdf', '.zip');
        this.downloadPDF(content, filename);
    }

    exportIndividualImages(spreads) {
        spreads.forEach(spread => {
            if (spread.leftPage && spread.leftPage.imageData) {
                const filename = `page-${spread.leftPage.pageNumber.toString().padStart(3, '0')}.jpg`;
                this.downloadImage(spread.leftPage.imageData, filename);
            }
            
            if (spread.rightPage && spread.rightPage.imageData) {
                const filename = `page-${spread.rightPage.pageNumber.toString().padStart(3, '0')}.jpg`;
                this.downloadImage(spread.rightPage.imageData, filename);
            }
        });
    }

    downloadImage(dataUrl, filename) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Get the highest quality image data available for PDF generation
     * Priority order: fullResolutionDataUrl > originalDataUrl > dataUrl > trimmedDataUrl > imageData
     * Optimized to avoid blob-to-dataURL conversion during PDF generation
     */
    async getBestImageData(pageImageData, qualityMode = 'high') {
        if (!pageImageData) return null;

        const startTime = performance.now();
        // Log available image formats for debug
        const formats = [];
        if (pageImageData.fullResolutionDataUrl) formats.push('fullRes');
        if (pageImageData.originalDataUrl) formats.push('original');
        if (pageImageData.dataUrl) formats.push('standard');
        if (pageImageData.trimmedDataUrl) formats.push('trimmed');
        console.log(`[DEBUG] Available formats: [${formats.join(', ')}]`);

        // For high quality PDF generation, prioritize pre-converted dataURL versions
        if (qualityMode === 'high') {
            // Try full resolution data URL first (highest quality, pre-converted)
            if (pageImageData.fullResolutionDataUrl && typeof pageImageData.fullResolutionDataUrl === 'string') {
                console.log(`[DEBUG] Using fullResolutionDataUrl (${(performance.now() - startTime).toFixed(1)}ms)`);
                return pageImageData.fullResolutionDataUrl;
            }

            // Only fall back to blob conversion if no dataURL is available
            if (pageImageData.fullResolutionBlob && pageImageData.fullResolutionBlob instanceof Blob) {
                console.log('[DEBUG] Converting fullResolutionBlob to data URL (performance impact expected)');
                try {
                    const conversionStart = performance.now();
                    const dataUrl = await this.blobToDataUrl(pageImageData.fullResolutionBlob);
                    const conversionTime = performance.now() - conversionStart;
                    const totalTime = performance.now() - startTime;
                    console.log(`[DEBUG] Blob conversion completed in ${conversionTime.toFixed(1)}ms, total: ${totalTime.toFixed(1)}ms`);
                    return dataUrl;
                } catch (error) {
                    console.warn('[DEBUG] Failed to convert fullResolutionBlob to data URL:', error);
                }
            }

            // Try original data URL (second highest quality)
            if (pageImageData.originalDataUrl && typeof pageImageData.originalDataUrl === 'string') {
                const elapsed = performance.now() - startTime;
                console.log(`[DEBUG] Using originalDataUrl (high quality, ${elapsed.toFixed(1)}ms)`);
                return pageImageData.originalDataUrl;
            }

            // Try original blob (highest quality, raw camera data but may be trimmed)
            if (pageImageData.originalBlob && pageImageData.originalBlob instanceof Blob) {
                console.log('[DEBUG] Converting originalBlob to data URL (performance impact expected)');
                try {
                    const conversionStart = performance.now();
                    const dataUrl = await this.blobToDataUrl(pageImageData.originalBlob);
                    const conversionTime = performance.now() - conversionStart;
                    const totalTime = performance.now() - startTime;
                    console.log(`[DEBUG] Original blob conversion completed in ${conversionTime.toFixed(1)}ms, total: ${totalTime.toFixed(1)}ms`);
                    return dataUrl;
                } catch (error) {
                    console.warn('[DEBUG] Failed to convert originalBlob to data URL:', error);
                }
            }
            
            // Try high quality processed image
            if (pageImageData.highQualityDataUrl && typeof pageImageData.highQualityDataUrl === 'string') {
                const elapsed = performance.now() - startTime;
                console.log(`[DEBUG] Using high quality processed image (${elapsed.toFixed(1)}ms)`);
                return pageImageData.highQualityDataUrl;
            }

            // Try unprocessed/raw data if available
            if (pageImageData.rawDataUrl && typeof pageImageData.rawDataUrl === 'string') {
                const elapsed = performance.now() - startTime;
                console.log(`[DEBUG] Using raw image data (${elapsed.toFixed(1)}ms)`);
                return pageImageData.rawDataUrl;
            }

            // Try uncompressed version
            if (pageImageData.uncompressedDataUrl && typeof pageImageData.uncompressedDataUrl === 'string') {
                console.log('[DEBUG] Using uncompressed image data');
                return pageImageData.uncompressedDataUrl;
            }
        }
        
        // Standard quality fallback chain - but prioritize dataUrl over trimmedDataUrl for better quality
        const candidates = [
            pageImageData.dataUrl,        // Usually higher quality
            pageImageData.trimmedDataUrl, // Usually smaller/compressed
            pageImageData                 // Direct data (last resort)
        ];
        
        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string') {
                console.log('[DEBUG] Using fallback image data type:', candidates.indexOf(candidate) === 0 ? 'dataUrl' : candidates.indexOf(candidate) === 1 ? 'trimmedDataUrl' : 'direct');
                return candidate;
            }
        }
        
        console.warn('[DEBUG] No valid image data found');
        return null;
    }

    /**
     * Convert a Blob to a data URL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Calculate optimal image dimensions for PDF based on image resolution and DPI
     */
    calculatePDFImageDimensions(imageDataUrl, pdfFormat = 'A4', dpi = 300, targetA4Coverage = 1.0, stretchToFill = false) {
        // A4 dimensions in mm
        const a4Width = 210;
        const a4Height = 297;
        const margin = 0; // No margin - use full page

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const imgWidth = this.width;
                const imgHeight = this.height;
                
                if (stretchToFill) {
                    // Stretch to fill entire A4 page without maintaining aspect ratio
                    const width = a4Width * targetA4Coverage;
                    const height = a4Height * targetA4Coverage;
                    const x = (a4Width - width) / 2;
                    const y = (a4Height - height) / 2;
                    console.log(`[DPI] STRETCH MODE: Image px: ${imgWidth}x${imgHeight}, PDF mm: ${width}x${height}, DPI: ${dpi}, A4 coverage: ${(targetA4Coverage * 100).toFixed(1)}%, STRETCHED TO FILL`);
                    resolve({ width, height, x, y, imgWidth, imgHeight });
                    return;
                }
                
                // Original aspect-ratio preserving logic
                const maxWidth = (a4Width - (2 * margin)) * targetA4Coverage;
                const maxHeight = (a4Height - (2 * margin)) * targetA4Coverage;
                
                // Calculate size in mm for the given DPI
                const pxToMm = (px) => px * 25.4 / dpi;
                let width = pxToMm(imgWidth);
                let height = pxToMm(imgHeight);
                // Scale to achieve target A4 coverage
                let scale = Math.min(maxWidth / width, maxHeight / height);
                width *= scale;
                height *= scale;
                // Center on page
                const x = (a4Width - width) / 2;
                const y = (a4Height - height) / 2;
                console.log(`[DPI] Image px: ${imgWidth}x${imgHeight}, PDF mm: ${width}x${height}, scale: ${scale}, DPI: ${dpi}, A4 coverage: ${(targetA4Coverage * 100).toFixed(1)}%`);
                resolve({ width, height, x, y, imgWidth, imgHeight });
            };
            img.onerror = function() {
                // Fallback to target coverage dimensions if image load fails
                const width = stretchToFill ? a4Width * targetA4Coverage : (a4Width - (2 * margin)) * targetA4Coverage;
                const height = stretchToFill ? a4Height * targetA4Coverage : (a4Height - (2 * margin)) * targetA4Coverage;
                resolve({ width, height, x: 0, y: 0, imgWidth: 0, imgHeight: 0 });
            };
            img.src = imageDataUrl;
        });
    }

    /**
     * Advanced document image enhancement using OpenCV.js
     * Handles burnt pixels, uneven lighting, and document-specific processing
     */
    async enhanceDocumentImageAdvanced(imageDataUrl, options = {}) {
        if (!imageDataUrl) return imageDataUrl;

        // Check if OpenCV is available
        if (typeof cv === 'undefined') {
            console.warn('[ENHANCE] OpenCV.js not available, falling back to basic enhancement');
            return this.enhanceDocumentImage(imageDataUrl, options);
        }

        const enhanceStart = performance.now();
        console.log('[ENHANCE] 🚀 Starting advanced OpenCV document enhancement...');
        
        const settings = {
            autoBalance: options.autoBalance !== false,     // Automatic white balance
            adaptiveThreshold: options.adaptiveThreshold !== false, // Adaptive thresholding
            denoising: options.denoising !== false,        // Noise reduction
            morphology: options.morphology !== false,      // Morphological operations
            gammaCorrection: options.gammaCorrection !== false, // Gamma correction for burnt pixels
            clahe: options.clahe !== false,                // Contrast Limited Adaptive Histogram Equalization
            ...options
        };

        console.log('[ENHANCE] ⚙️ Advanced enhancement settings:', settings);

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    if (!img.width || !img.height) {
                        console.warn('[ENHANCE] ❌ Image has invalid dimensions:', img.width, 'x', img.height);
                        resolve(imageDataUrl);
                        return;
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    console.log(`[ENHANCE] 📐 Processing image: ${img.width}x${img.height}px with OpenCV`);
                    
                    // Convert to OpenCV Mat
                    const src = cv.imread(canvas);
                    let processed = new cv.Mat();
                    src.copyTo(processed);
                    
                    // 1. Gamma correction for burnt pixels
                    if (settings.gammaCorrection) {
                        console.log('[ENHANCE] 🔥 Applying gamma correction for burnt pixels...');
                        this.applyGammaCorrection(processed, 0.8); // Reduce gamma to recover burnt areas
                    }
                    
                    // 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
                    if (settings.clahe) {
                        console.log('[ENHANCE] 📊 Applying CLAHE for adaptive contrast...');
                        this.applyCLAHE(processed);
                    }
                    
                    // 3. Automatic white balance
                    if (settings.autoBalance) {
                        console.log('[ENHANCE] ⚖️ Applying automatic white balance...');
                        this.applyAutoWhiteBalance(processed);
                    }
                    
                    // 4. Document-specific adaptive thresholding
                    if (settings.adaptiveThreshold) {
                        console.log('[ENHANCE] 🎯 Applying adaptive document enhancement...');
                        this.applyDocumentAdaptiveProcessing(processed);
                    }
                    
                    // 5. Denoising
                    if (settings.denoising) {
                        console.log('[ENHANCE] 🧹 Applying noise reduction...');
                        this.applyAdvancedDenoising(processed);
                    }
                    
                    // 6. Morphological operations for text clarity
                    if (settings.morphology) {
                        console.log('[ENHANCE] 📝 Applying morphological text enhancement...');
                        this.applyTextMorphology(processed);
                    }
                    
                    // Convert back to canvas
                    cv.imshow(canvas, processed);
                    
                    // Cleanup OpenCV matrices
                    src.delete();
                    processed.delete();
                    
                    const processTime = performance.now() - enhanceStart;
                    console.log(`[ENHANCE] ✅ Advanced enhancement completed in ${processTime.toFixed(1)}ms`);
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                    
                } catch (error) {
                    console.error('[ENHANCE] ❌ OpenCV enhancement failed:', error);
                    console.log('[ENHANCE] 🔄 Falling back to basic enhancement...');
                    resolve(this.enhanceDocumentImage(imageDataUrl, options));
                }
            };

            img.onerror = () => {
                console.warn('[ENHANCE] ❌ Failed to load image, falling back to basic enhancement');
                resolve(this.enhanceDocumentImage(imageDataUrl, options));
            };

            img.src = imageDataUrl;
        });
    }

    // Advanced document enhancement with better algorithms
    async enhanceDocumentImageAdvanced(imageDataUrl, options = {}) {
        if (!imageDataUrl) return imageDataUrl;

        console.log('[ENHANCE ADVANCED] 🚀 Starting gentle document enhancement...');
        
        try {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    // Apply very gentle document-specific enhancements
                    this.applyGentleDocumentEnhancement(imageData, options);
                    
                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                
                img.src = imageDataUrl;
            });
        } catch (error) {
            console.warn('[ENHANCE ADVANCED] ⚠️ Advanced enhancement failed, using basic:', error);
            return this.enhanceDocumentImage(imageDataUrl, options);
        }
    }

    // Gentle enhancement specifically for document scanning
    applyGentleDocumentEnhancement(imageData, options = {}) {
        const data = imageData.data;
        
        console.log('[ENHANCE ADVANCED] 📝 Applying gentle document processing...');
        
        // Step 1: Very gentle brightness normalization (only if really needed)
        if (options.autoExposureCorrection !== false) {
            this.gentleBrightnessCorrection(data);
        }
        
        // Step 2: Minimal white balance for paper (very conservative)
        if (options.documentOptimization !== false) {
            this.gentleWhiteBalance(data);
        }
        
        console.log('[ENHANCE ADVANCED] ✅ Gentle document enhancement completed');
    }

    // Very gentle brightness correction for documents
    gentleBrightnessCorrection(data) {
        // Find average brightness
        let totalBrightness = 0;
        let sampleCount = 0;
        
        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            sampleCount++;
        }
        
        const avgBrightness = totalBrightness / sampleCount;
        
        // Only apply correction if image is significantly dark or bright
        let adjustment = 1.0;
        if (avgBrightness < 100) {
            // Very dark - gentle brightening
            adjustment = 1.1;
        } else if (avgBrightness > 200) {
            // Very bright - gentle darkening
            adjustment = 0.95;
        }
        
        // Apply very conservative adjustment
        if (adjustment !== 1.0) {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] * adjustment));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * adjustment));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * adjustment));
            }
            console.log(`[ENHANCE ADVANCED] 📊 Applied gentle brightness adjustment: ${adjustment.toFixed(2)}x`);
        }
    }

    // Very gentle white balance for document paper
    gentleWhiteBalance(data) {
        // Find the brightest pixels (likely paper)
        let brightPixels = [];
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            // Only consider very bright pixels as potential paper
            if (brightness > 180) {
                brightPixels.push({r, g, b});
            }
        }
        
        if (brightPixels.length < 100) return; // Not enough bright pixels to work with
        
        // Calculate average of bright pixels
        let avgR = 0, avgG = 0, avgB = 0;
        for (const pixel of brightPixels) {
            avgR += pixel.r;
            avgG += pixel.g;
            avgB += pixel.b;
        }
        avgR /= brightPixels.length;
        avgG /= brightPixels.length;
        avgB /= brightPixels.length;
        
        // Calculate very gentle white balance factors
        const targetGray = Math.max(avgR, avgG, avgB); // Use the brightest channel as target
        const balanceR = avgR > 0 ? Math.min(1.05, targetGray / avgR) : 1.0;
        const balanceG = avgG > 0 ? Math.min(1.05, targetGray / avgG) : 1.0;
        const balanceB = avgB > 0 ? Math.min(1.05, targetGray / avgB) : 1.0;
        
        // Only apply if adjustment is minimal
        if (Math.abs(balanceR - 1.0) < 0.05 && Math.abs(balanceG - 1.0) < 0.05 && Math.abs(balanceB - 1.0) < 0.05) {
            for (let i = 0; i < data.length; i += 4) {
                // Only adjust bright pixels (likely paper)
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness > 150) {
                    data[i] = Math.min(255, data[i] * balanceR);
                    data[i + 1] = Math.min(255, data[i + 1] * balanceG);
                    data[i + 2] = Math.min(255, data[i + 2] * balanceB);
                }
            }
            console.log(`[ENHANCE ADVANCED] ⚖️ Applied gentle white balance: R${balanceR.toFixed(2)}, G${balanceG.toFixed(2)}, B${balanceB.toFixed(2)}`);
        }
    }

    // Removed aggressive enhancement methods that were causing blackening
    // Now using gentle document-specific enhancement only

    async enhanceDocumentImage(imageDataUrl, options = {}) {
        if (!imageDataUrl) return imageDataUrl;

        const enhanceStart = performance.now();
        console.log('[ENHANCE] 🎨 Starting document enhancement...');
        
        // Adaptive enhancement settings based on image analysis
        const settings = {
            brightness: options.brightness || 'auto',     // Auto-detect or manual adjustment
            contrast: options.contrast || 'auto',        // Auto-detect optimal contrast
            sharpness: options.sharpness || 'auto',      // Adaptive sharpening based on content
            whiteBalance: options.whiteBalance !== false, // Normalize white paper
            adaptiveMode: options.adaptiveMode !== false, // Enable adaptive processing
            ...options
        };

        console.log('[ENHANCE] ⚙️ Enhancement settings:', settings);

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Ensure image has valid dimensions
                if (!img.width || !img.height) {
                    console.warn('[ENHANCE] ❌ Image has invalid dimensions:', img.width, 'x', img.height);
                    resolve(imageDataUrl);
                    return;
                }
                
                canvas.width = img.width;
                canvas.height = img.height;
                console.log(`[ENHANCE] 📐 Processing image: ${img.width}x${img.height}px`);
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Get image data for processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Analyze image characteristics for adaptive processing
                const analysis = this.analyzeImageCharacteristics(data);
                console.log('[ENHANCE] 🔍 Image analysis results:', analysis);
                
                // Apply adaptive enhancements based on analysis
                let brightness = settings.brightness;
                let contrast = settings.contrast;
                let sharpness = settings.sharpness;
                
                if (settings.adaptiveMode) {
                    // Auto-detect optimal brightness
                    if (brightness === 'auto') {
                        brightness = this.calculateAdaptiveBrightness(analysis);
                        console.log(`[ENHANCE] 💡 Auto-detected brightness: ${brightness.toFixed(3)} (${this.getBrightnessDescription(brightness)})`);
                    }
                    
                    // Auto-detect optimal contrast
                    if (contrast === 'auto') {
                        contrast = this.calculateAdaptiveContrast(analysis);
                        console.log(`[ENHANCE] 🎛️ Auto-detected contrast: ${contrast.toFixed(3)} (${this.getContrastDescription(contrast)})`);
                    }
                    
                    // Auto-detect optimal sharpening
                    if (sharpness === 'auto') {
                        sharpness = this.calculateAdaptiveSharpness(analysis);
                        console.log(`[ENHANCE] ⚡ Auto-detected sharpness: ${sharpness.toFixed(3)} (${this.getSharpnessDescription(sharpness)})`);
                    }
                } else {
                    // Use fixed values for non-adaptive mode
                    brightness = typeof brightness === 'number' ? brightness : 1.1;
                    contrast = typeof contrast === 'number' ? contrast : 1.3;
                    sharpness = typeof sharpness === 'number' ? sharpness : 1.2;
                    console.log(`[ENHANCE] 🔧 Using fixed enhancement values: brightness=${brightness}, contrast=${contrast}, sharpness=${sharpness}`);
                }
                
                // Apply enhancements with detailed logging
                console.log('[ENHANCE] 🔄 Applying brightness and contrast adjustments...');
                this.applyBrightnessContrast(data, brightness, contrast);
                
                if (settings.whiteBalance) {
                    console.log('[ENHANCE] ⚪ Applying white balance normalization...');
                    this.normalizeWhiteBackground(data);
                }
                
                if (sharpness > 1.0) {
                    console.log('[ENHANCE] 🔪 Applying sharpening filter...');
                    this.applySharpeningFilter(imageData, sharpness);
                }
                
                // Put processed data back
                ctx.putImageData(imageData, 0, 0);
                
                const processTime = performance.now() - enhanceStart;
                console.log(`[ENHANCE] ✅ Enhancement completed in ${processTime.toFixed(1)}ms`);
                console.log(`[ENHANCE] 📊 Final adjustments applied: brightness=${brightness.toFixed(3)}, contrast=${contrast.toFixed(3)}, sharpness=${sharpness.toFixed(3)}`);
                
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            img.onerror = () => {
                console.warn('[ENHANCE] ❌ Failed to load image for enhancement. Image source may be invalid.');
                console.warn('[ENHANCE] 🔍 Image source type:', typeof imageDataUrl);
                console.warn('[ENHANCE] 🔍 Image source length:', imageDataUrl?.length || 'N/A');
                console.warn('[ENHANCE] 🔍 Image source preview:', imageDataUrl?.substring(0, 100) || 'N/A');
                resolve(imageDataUrl);
            };

            // Add validation for image source
            if (!imageDataUrl || typeof imageDataUrl !== 'string') {
                console.warn('[ENHANCE] ❌ Invalid image data URL provided:', typeof imageDataUrl);
                resolve(imageDataUrl);
                return;
            }

            if (!imageDataUrl.startsWith('data:image/')) {
                console.warn('[ENHANCE] ❌ Image data URL does not start with data:image/');
                console.warn('[ENHANCE] 🔍 Actual start:', imageDataUrl.substring(0, 50));
                resolve(imageDataUrl);
                return;
            }

            console.log('[ENHANCE] 🔍 Setting image src, length:', imageDataUrl.length);
            img.src = imageDataUrl;
        });
    }

    async enhanceDocumentImage(imageDataUrl, options = {}) {
        if (!imageDataUrl) return imageDataUrl;

        const enhanceStart = performance.now();
        console.log('[ENHANCE] 🎨 Starting document enhancement...');
        
        // Adaptive enhancement settings based on image analysis
        const settings = {
            brightness: options.brightness || 'auto',     // Auto-detect or manual adjustment
            contrast: options.contrast || 'auto',        // Auto-detect optimal contrast
            sharpness: options.sharpness || 'auto',      // Adaptive sharpening based on content
            whiteBalance: options.whiteBalance !== false, // Normalize white paper
            adaptiveMode: options.adaptiveMode !== false, // Enable adaptive processing
            ...options
        };

        console.log('[ENHANCE] ⚙️ Enhancement settings:', settings);

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    if (settings.adaptiveMode) {
                        // Analyze image characteristics for optimal enhancement
                        const analysis = this.analyzeImageCharacteristics(data);
                        
                        // Calculate adaptive adjustments
                        const brightnessAdjust = settings.brightness === 'auto' ? 
                            this.calculateAdaptiveBrightness(analysis) : settings.brightness;
                        const contrastAdjust = settings.contrast === 'auto' ? 
                            this.calculateAdaptiveContrast(analysis) : settings.contrast;
                        const sharpnessAdjust = settings.sharpness === 'auto' ? 
                            this.calculateAdaptiveSharpness(analysis) : settings.sharpness;

                        console.log('[ENHANCE] 🔧 Adaptive adjustments:', {
                            brightness: `${brightnessAdjust.toFixed(2)} (${this.getBrightnessDescription(brightnessAdjust)})`,
                            contrast: `${contrastAdjust.toFixed(2)} (${this.getContrastDescription(contrastAdjust)})`,
                            sharpness: `${sharpnessAdjust.toFixed(2)} (${this.getSharpnessDescription(sharpnessAdjust)})`
                        });

                        // Apply adaptive enhancements
                        this.applyBrightnessContrast(data, brightnessAdjust, contrastAdjust);
                        
                        if (settings.whiteBalance) {
                            this.normalizeWhiteBackground(data);
                        }
                        
                        if (sharpnessAdjust > 1.0) {
                            this.applySharpeningFilter(imageData, sharpnessAdjust);
                        }
                    } else {
                        // Apply fixed enhancement values
                        console.log('[ENHANCE] 🔧 Fixed adjustments:', settings);
                        
                        this.applyBrightnessContrast(data, settings.brightness, settings.contrast);
                        
                        if (settings.whiteBalance) {
                            this.normalizeWhiteBackground(data);
                        }
                        
                        if (settings.sharpness > 1.0) {
                            this.applySharpeningFilter(imageData, settings.sharpness);
                        }
                    }

                    // Apply processed image data back to canvas
                    ctx.putImageData(imageData, 0, 0);

                    const enhanceEnd = performance.now();
                    const processingTime = enhanceEnd - enhanceStart;
                    
                    console.log(`[ENHANCE] ✅ Enhancement completed in ${processingTime.toFixed(2)}ms`);
                    
                    // Return enhanced image as data URL
                resolve(canvas.toDataURL('image/jpeg', 0.8));

                } catch (error) {
                    console.error('[ENHANCE] ❌ Enhancement failed:', error);
                    resolve(imageDataUrl); // Return original on error
                }
            };

            img.onerror = () => {
                console.error('[ENHANCE] ❌ Failed to load image for enhancement');
                resolve(imageDataUrl); // Return original on error
            };

            img.src = imageDataUrl;
        });
    }
    analyzeImageCharacteristics(data) {
        let totalBrightness = 0;
        let whitePixels = 0;
        let darkPixels = 0;
        let mediumPixels = 0;
        let totalPixels = data.length / 4;
        
        let minBrightness = 255;
        let maxBrightness = 0;
        let contrastSum = 0;
        
        // Analyze brightness distribution and contrast
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            totalBrightness += brightness;
            minBrightness = Math.min(minBrightness, brightness);
            maxBrightness = Math.max(maxBrightness, brightness);
            
            // Categorize pixels
            if (brightness > 200) whitePixels++;
            else if (brightness < 80) darkPixels++;
            else mediumPixels++;
        }
        
        const avgBrightness = totalBrightness / totalPixels;
        const contrast = maxBrightness - minBrightness;
        const whiteRatio = whitePixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;
        const mediumRatio = mediumPixels / totalPixels;
        
        // Detect image characteristics
        const isWellLit = avgBrightness > 140;
        const isPoorContrast = contrast < 100;
        const hasWhitePaper = whiteRatio > 0.4;
        const hasHandwriting = darkRatio > 0.05;
        
        return {
            avgBrightness,
            minBrightness,
            maxBrightness,
            contrast,
            whiteRatio,
            darkRatio,
            mediumRatio,
            isWellLit,
            isPoorContrast,
            hasWhitePaper,
            hasHandwriting,
            totalPixels
        };
    }

    /**
     * Calculate adaptive brightness adjustment - VERY CONSERVATIVE for documents
     */
    calculateAdaptiveBrightness(analysis) {
        const { avgBrightness, isWellLit, hasWhitePaper } = analysis;
        
        // Much more conservative adjustments
        if (avgBrightness < 80) {
            // Very dark image - gentle brightening
            return 1.1;
        } else if (avgBrightness > 220) {
            // Very bright image - gentle darkening  
            return 0.95;
        } else {
            // Good brightness - minimal or no adjustment
            return 1.0;
        }
    }

    /**
     * Calculate adaptive contrast adjustment - VERY CONSERVATIVE for documents
     */
    calculateAdaptiveContrast(analysis) {
        const { contrast, isPoorContrast, hasHandwriting, darkRatio } = analysis;
        
        // Much more conservative contrast adjustments
        if (isPoorContrast && hasHandwriting && contrast < 50) {
            // Only boost contrast if extremely low contrast with handwriting
            return 1.2;
        } else if (contrast < 80) {
            // Mild boost for low contrast
            return 1.1;
        } else {
            // Good contrast - no adjustment
            return 1.0;
        }
    }

    /**
     * Calculate adaptive sharpening intensity - VERY CONSERVATIVE for documents
     */
    calculateAdaptiveSharpness(analysis) {
        const { hasHandwriting, darkRatio, contrast } = analysis;
        
        // Disable sharpening entirely to prevent artifacts
        return 1.0;
    }

    /**
     * Get human-readable descriptions for adjustments
     */
    getBrightnessDescription(value) {
        if (value < 0.8) return 'Strong darkening';
        if (value < 0.9) return 'Moderate darkening';
        if (value < 1.0) return 'Slight darkening';
        if (value < 1.1) return 'Minimal brightening';
        if (value < 1.3) return 'Moderate brightening';
        if (value < 1.5) return 'Strong brightening';
        return 'Very strong brightening';
    }

    getContrastDescription(value) {
        if (value < 1.0) return 'Reduced contrast';
        if (value < 1.2) return 'Minimal boost';
        if (value < 1.4) return 'Moderate boost';
        if (value < 1.6) return 'Strong boost';
        return 'Very strong boost';
    }

    getSharpnessDescription(value) {
        if (value < 1.1) return 'Minimal sharpening';
        if (value < 1.3) return 'Moderate sharpening';
        if (value < 1.5) return 'Strong sharpening';
        return 'Very strong sharpening';
    }

    /**
     * Detect optimal brightness based on white paper detection (legacy method)
     */
    detectOptimalBrightness(data) {
        let totalBrightness = 0;
        let whitePixels = 0;
        const threshold = 200; // Threshold for detecting white/light areas
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness > threshold) {
                totalBrightness += brightness;
                whitePixels++;
            }
        }
        
        if (whitePixels === 0) return 1.0; // No adjustment needed
        
        const avgWhiteBrightness = totalBrightness / whitePixels;
        const targetWhiteBrightness = 245; // Target for white paper
        
        return Math.min(Math.max(targetWhiteBrightness / avgWhiteBrightness, 0.7), 1.5);
    }

    /**
     * Apply brightness and contrast adjustments
     */
    applyBrightnessContrast(data, brightness, contrast) {
        const brightnessFactor = brightness;
        const contrastFactor = contrast;
        const contrastOffset = 128 * (1 - contrastFactor);
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] = Math.min(255, data[i] * brightnessFactor);     // Red
            data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // Green
            data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // Blue
            
            // Apply contrast
            data[i] = Math.min(255, Math.max(0, data[i] * contrastFactor + contrastOffset));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrastFactor + contrastOffset));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrastFactor + contrastOffset));
        }
    }

    /**
     * Normalize white background while preserving handwriting colors
     */
    normalizeWhiteBackground(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check if pixel is likely white paper (high brightness, low color saturation)
            const brightness = (r + g + b) / 3;
            const maxChannel = Math.max(r, g, b);
            const minChannel = Math.min(r, g, b);
            const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
            
            // If it's likely white paper background
            if (brightness > 180 && saturation < 0.1) {
                // Push towards pure white
                const whitenFactor = 0.3;
                data[i] = Math.min(255, r + (255 - r) * whitenFactor);     // Red
                data[i + 1] = Math.min(255, g + (255 - g) * whitenFactor); // Green
                data[i + 2] = Math.min(255, b + (255 - b) * whitenFactor); // Blue
            }
            // If it's likely blue/black pen (preserve colors)
            else if (brightness < 120 || (b > r && b > g)) {
                // Slightly darken text for better contrast
                const darkenFactor = 0.95;
                data[i] = Math.max(0, r * darkenFactor);
                data[i + 1] = Math.max(0, g * darkenFactor);
                data[i + 2] = Math.max(0, b * darkenFactor);
            }
        }
    }

    /**
     * Apply subtle sharpening filter for text clarity
     */
    applySharpeningFilter(imageData, intensity) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Simple unsharp mask kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        const factor = intensity - 1.0; // How much sharpening to apply
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    
                    const originalIdx = (y * width + x) * 4 + c;
                    const original = data[originalIdx];
                    const sharpened = original + (sum - original) * factor;
                    output[originalIdx] = Math.min(255, Math.max(0, sharpened));
                }
            }
        }
        
        // Copy sharpened data back
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    // Public API methods
    isReady() {
        const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
        return !!jsPDFConstructor || this.hasServerSupport();
    }

    hasServerSupport() {
        // Check if server-side PDF generation is available
        return true; // Will be determined by backend availability
    }

    getSupportedFormats() {
        return ['A4', 'Letter', 'Legal', 'A3'];
    }

    getSupportedOrientations() {
        return ['portrait', 'landscape'];
    }

    getSupportedImageQualities() {
        return [
            { value: 'high', label: 'High Quality (Original Resolution)', description: 'Uses full camera resolution for best quality' },
            { value: 'medium', label: 'Medium Quality', description: 'Balanced quality and file size' },
            { value: 'preview', label: 'Preview Quality', description: 'Smaller file size, suitable for quick previews' }
        ];
    }

    /**
     * Test enhancement on a sample image (for debugging)
     * Call this from console: window.pdfGenerator.testEnhancement()
     */
    async testEnhancement(imageDataUrl = null) {
        console.log('[ENHANCE] 🧪 Starting enhancement test...');
        
        if (!imageDataUrl) {
            // Try to get a sample image from current spreads
            const spreads = this.spreadManager?.getSpreads();
            if (spreads && spreads.length > 0) {
                const samplePage = spreads[0].leftPage || spreads[0].rightPage;
                if (samplePage && samplePage.imageData) {
                    imageDataUrl = await this.getBestImageData(samplePage.imageData, 'high');
                    console.log('[ENHANCE] 📷 Using sample image from current spreads');
                } else {
                    console.warn('[ENHANCE] ❌ No image data available in spreads');
                    return;
                }
            } else {
                console.warn('[ENHANCE] ❌ No spreads available for testing');
                return;
            }
        }
        
        // Test different enhancement modes
        const testModes = [
            { name: 'Adaptive Mode', options: { adaptiveMode: true } },
            { name: 'Fixed Mode', options: { adaptiveMode: false, brightness: 1.2, contrast: 1.3, sharpness: 1.2 } },
            { name: 'Conservative Mode', options: { brightness: 1.1, contrast: 1.2, sharpness: 1.1 } },
            { name: 'Aggressive Mode', options: { brightness: 1.4, contrast: 1.6, sharpness: 1.4 } }
        ];
        
        console.log('[ENHANCE] 🎯 Testing enhancement modes:');
        for (const mode of testModes) {
            console.log(`[ENHANCE] 🔄 Testing ${mode.name}...`);
            const enhanced = await this.enhanceDocumentImage(imageDataUrl, mode.options);
            console.log(`[ENHANCE] ✅ ${mode.name} completed`);
        }
        
        console.log('[ENHANCE] 🏁 Enhancement testing completed');
    }

    /**
     * Quick enhancement test - call from console: window.pdfGenerator.quickTest()
     */
    async quickTest() {
        console.log('[ENHANCE] 🧪 Quick enhancement test starting...');
        
        const spreads = this.spreadManager?.getSpreads();
        if (!spreads || spreads.length === 0) {
            console.log('[ENHANCE] ❌ No spreads captured yet. Capture some pages first.');
            return;
        }
        
        const samplePage = spreads[0].leftPage || spreads[0].rightPage;
        if (!samplePage || !samplePage.imageData) {
            console.log('[ENHANCE] ❌ No image data found in spreads');
            return;
        }
        
        const imageDataUrl = await this.getBestImageData(samplePage.imageData, 'high');
        console.log('[ENHANCE] 📷 Sample image obtained, testing enhancement...');
        console.log('[ENHANCE] 🔍 Image data URL type:', typeof imageDataUrl);
        console.log('[ENHANCE] 🔍 Image data URL length:', imageDataUrl?.length || 'N/A');
        console.log('[ENHANCE] 🔍 Image data URL starts with:', imageDataUrl?.substring(0, 50) || 'N/A');
        
        // Test adaptive enhancement
        const enhanced = await this.enhanceDocumentImage(imageDataUrl, { adaptiveMode: true });
        console.log('[ENHANCE] ✅ Enhancement test completed successfully!');
        console.log('[ENHANCE] 💡 The enhancement system is working and ready for integration');
        
        return enhanced;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
