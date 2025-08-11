/**
 * OpenCV Preview Manager - Uses OpenCV.js for advanced camera preview handling
 * Provides optimal preview scaling, rotation, and trim handling without CSS object-fit dependency
 */
class OpenCVPreviewManager {
    constructor() {
        this.isOpenCVReady = false;
        this.previewCanvases = new Map();
        this.animationFrames = new Map();
        this.rotationLoggedFor = new Set();
        this.previewOptions = new Map(); // Store updated options for each side
        this.lastLogTime = new Map(); // For throttling debug logs per side
        // --- Worker for capture processing ---
        this.captureWorker = null;
        this.captureWorkerReady = false;
        this.captureWorkerCallbacks = new Map();
        this.initCaptureWorker();
    }

    initCaptureWorker() {
        try {
            const worker = new Worker('static/js/opencv-capture-worker.js');
            worker.onmessage = (e) => {
                const { type, requestId, dataUrl, timing, error } = e.data;
                if (type === 'FRAME_PROCESSED' && this.captureWorkerCallbacks.has(requestId)) {
                    this.captureWorkerCallbacks.get(requestId)({ dataUrl, timing });
                    this.captureWorkerCallbacks.delete(requestId);
                } else if (type === 'FRAME_ERROR' && this.captureWorkerCallbacks.has(requestId)) {
                    this.captureWorkerCallbacks.get(requestId)({ error });
                    this.captureWorkerCallbacks.delete(requestId);
                }
            };
            this.captureWorker = worker;
            this.captureWorkerReady = true;
        } catch (err) {
            this.captureWorker = null;
            this.captureWorkerReady = false;
        }
    }

    /**
     * Initialize OpenCV when ready
     */
    initializeOpenCV() {
        if (typeof cv !== 'undefined' && cv.Mat) {
            // Test basic OpenCV functionality
            try {
                // Test basic OpenCV operations
                const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
                const testPoint = new cv.Point(5, 5);
                const testSize = new cv.Size(10, 10);
                
                // Cleanup test objects
                testMat.delete();
                
                this.isOpenCVReady = true;
                console.log('✅ OpenCV.js initialized successfully');
                return true;
            } catch (error) {
                console.error('❌ OpenCV.js initialization test failed:', error);
                this.isOpenCVReady = false;
                return false;
            }
        }
        // Only warn if OpenCV is not ready
        return false;
    }

    /**
     * Force re-initialization of OpenCV (useful for debugging)
     */
    forceReinitialize() {
        console.log('🔄 Force re-initializing OpenCV...');
        return this.initializeOpenCV();
    }

    /**
     * Set up preview canvas with optimal sizing for the given container
     */
    setupPreviewCanvas(side, container) {
        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const containerWidth = Math.floor(containerRect.width);
        const containerHeight = Math.floor(containerRect.height);

        // Create or get existing canvas
        let canvas = this.previewCanvases.get(side);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.borderRadius = '4px';
            canvas.style.transition = 'transform 0.2s';
            canvas.style.display = 'block';
            canvas.style.backgroundColor = '#f0f0f0'; // Light gray background for letterboxing
            this.previewCanvases.set(side, canvas);
        }

        // Use container size for fast preview - captures will be high quality
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        console.log(`📺 [${side}] Fast preview: ${containerWidth}x${containerHeight} (captures will be high-res)`);
        
        // Remove any CSS object-fit to avoid double scaling
        canvas.style.objectFit = 'none';

        // Clear container and add canvas
        container.innerHTML = '';
        container.appendChild(canvas);

        return canvas;
    }

    /**
     * Process video frame with OpenCV and render optimally
     */
    processAndRenderFrame(side, video, canvas, options = {}) {
        if (!this.isOpenCVReady) {
            console.log(`⚠️ OpenCV not ready for ${side}, using fallback`);
            // Fallback to standard canvas rendering
            return this.fallbackRender(side, video, canvas, options);
        }

        try {
            const {
                trimTop = 0,
                trimBottom = 0,
                trimLeft = 0,
                trimRight = 0,
                rotation = 0,
                fillMode = 'crop', // 'contain', 'cover', 'maximize', 'crop'
                showTrimPreview = false // New option to show trim in preview
            } = options;

            // Ensure rotation is always an integer
            const rotationValue = parseInt(rotation, 10) || 0;

            // Check video readiness
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                return false;
            }

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create OpenCV matrices
            const src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
            const dst = new cv.Mat();

            // Capture video frame to OpenCV matrix
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(video, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
            src.data.set(imageData.data);

            // For preview, show full image with rotation, but no trimming
            // Apply rotation if needed
            let processedMat = src;
            let rotationMatrix = null;
            
            if (rotationValue !== 0) {
                // Only log on first rotation per side
                if (!this.rotationLoggedFor.has(side)) {
                    console.log(`✅ ${side} camera rotation active: ${rotationValue}°`);
                    this.rotationLoggedFor.add(side);
                }
                
                processedMat = new cv.Mat();
                
                // For exact 90° increments, use simple dimension swapping for accuracy
                if (rotationValue === 90 || rotationValue === 270) {
                    // For 90° and 270° rotations, dimensions swap exactly
                    const newWidth = video.videoHeight;
                    const newHeight = video.videoWidth;
                    
                    // Create center point as object with x, y properties
                    const center = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
                    
                    // OpenCV uses counter-clockwise rotation, but users expect clockwise
                    // So we need to negate the rotation value to match expected behavior
                    rotationMatrix = cv.getRotationMatrix2D(center, -rotationValue, 1.0);
                    
                    // For 90° increments, adjust translation to center in swapped dimensions
                    const tx = (newWidth / 2) - center.x;
                    const ty = (newHeight / 2) - center.y;
                    
                    // Modify the rotation matrix translation components
                    try {
                        if (rotationMatrix.data64F) {
                            rotationMatrix.data64F[2] += tx;  // Translation in X
                            rotationMatrix.data64F[5] += ty;  // Translation in Y
                        }
                    } catch (error) {
                        console.error(`Error modifying rotation matrix for ${side}:`, error);
                    }
                    
                    // Apply rotation with exact swapped dimensions
                    cv.warpAffine(src, processedMat, rotationMatrix, new cv.Size(newWidth, newHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
                    
                } else if (rotationValue === 180) {
                    // For 180° rotation, dimensions stay the same
                    const newWidth = video.videoWidth;
                    const newHeight = video.videoHeight;
                    
                    // Create center point as object with x, y properties
                    const center = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
                    
                    // OpenCV uses counter-clockwise rotation, but users expect clockwise
                    // So we need to negate the rotation value to match expected behavior
                    rotationMatrix = cv.getRotationMatrix2D(center, -rotationValue, 1.0);
                    
                    // Apply rotation with same dimensions
                    cv.warpAffine(src, processedMat, rotationMatrix, new cv.Size(newWidth, newHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
                    
                } else {
                    // For other angles, use the original trigonometric calculation
                    const center = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
                    
                    // OpenCV uses counter-clockwise rotation, but users expect clockwise
                    // So we need to negate the rotation value to match expected behavior
                    rotationMatrix = cv.getRotationMatrix2D(center, -rotationValue, 1.0);
                    
                    // Calculate new dimensions after rotation to prevent cropping
                    const radians = (rotationValue * Math.PI) / 180;
                    const cos = Math.abs(Math.cos(radians));
                    const sin = Math.abs(Math.sin(radians));
                    const newWidth = Math.ceil(video.videoHeight * sin + video.videoWidth * cos);
                    const newHeight = Math.ceil(video.videoHeight * cos + video.videoWidth * sin);
                    
                    // Adjust translation to keep image centered in new bounds
                    const tx = (newWidth / 2) - center.x;
                    const ty = (newHeight / 2) - center.y;
                    
                    // Modify the rotation matrix translation components
                    try {
                        if (rotationMatrix.data64F) {
                            rotationMatrix.data64F[2] += tx;  // Translation in X
                            rotationMatrix.data64F[5] += ty;  // Translation in Y
                        }
                    } catch (error) {
                        console.error(`Error modifying rotation matrix for ${side}:`, error);
                    }
                    
                    // Apply rotation with calculated dimensions
                    cv.warpAffine(src, processedMat, rotationMatrix, new cv.Size(newWidth, newHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
                }
                
                // Clean up rotation matrix
                if (rotationMatrix) {
                    rotationMatrix.delete();
                }
            }

            // --- APPLY TRIM TO THE FRAME BEFORE RESIZING (only if showTrimPreview is enabled) ---
            let trimmedMat = processedMat;
            if (showTrimPreview) {
                // Validate trim values and matrix size before cropping
                const maxTrimLeft = processedMat.cols - 1;
                const maxTrimRight = processedMat.cols - 1;
                const maxTrimTop = processedMat.rows - 1;
                const maxTrimBottom = processedMat.rows - 1;
                const safeTrimLeft = Math.max(0, Math.min(trimLeft, maxTrimLeft));
                const safeTrimRight = Math.max(0, Math.min(trimRight, maxTrimRight));
                const safeTrimTop = Math.max(0, Math.min(trimTop, maxTrimTop));
                const safeTrimBottom = Math.max(0, Math.min(trimBottom, maxTrimBottom));
                const trimWidth = processedMat.cols - safeTrimLeft - safeTrimRight;
                const trimHeight = processedMat.rows - safeTrimTop - safeTrimBottom;
                // Removed: console.log(`[OpenCV] Trim attempt: left=${safeTrimLeft}, right=${safeTrimRight}, top=${safeTrimTop}, bottom=${safeTrimBottom}, width=${trimWidth}, height=${trimHeight}, mat size=${processedMat.cols}x${processedMat.rows}`);
                // If trim is less than 2px on all sides, skip trim (avoids rounding/ROI issues)
                if ((safeTrimLeft >= 2 || safeTrimRight >= 2 || safeTrimTop >= 2 || safeTrimBottom >= 2) && trimWidth > 0 && trimHeight > 0) {
                    try {
                        trimmedMat = processedMat.roi(new cv.Rect(safeTrimLeft, safeTrimTop, trimWidth, trimHeight));
                    } catch (err) {
                        // Only warn on actual error
                        // console.warn(`[OpenCV] Invalid ROI for trim: left=${safeTrimLeft}, right=${safeTrimRight}, top=${safeTrimTop}, bottom=${safeTrimBottom}, width=${trimWidth}, height=${trimHeight}, mat size=${processedMat.cols}x${processedMat.rows}`);
                        trimmedMat = processedMat;
                    }
                } else if (trimWidth > 0 && trimHeight > 0) {
                    trimmedMat = processedMat;
                } else {
                    // Only warn on actual error
                    // console.warn(`[OpenCV] Invalid trim dimensions: trimWidth=${trimWidth}, trimHeight=${trimHeight}, mat size=${processedMat.cols}x${processedMat.rows}`);
                    trimmedMat = processedMat;
                }
            }
            // If showTrimPreview is false, trimmedMat remains as processedMat (no trim applied)

            // Calculate optimal scaling for the canvas
            const sourceWidth = trimmedMat.cols;
            const sourceHeight = trimmedMat.rows;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // TEMPORARY DEBUG: Only log rotation debug once per side per session
            if (rotationValue === 90 && (sourceWidth === 2560 || sourceWidth === 1440)) {
                const debugKey = `${side}-rotation-debug`;
                if (!this.loggedCanvasInfo) {
                    this.loggedCanvasInfo = new Set();
                }
                if (!this.loggedCanvasInfo.has(debugKey)) {
                    console.log(`🔧 [${side}] ROTATION DEBUG: rotationValue=${rotationValue}°, video=${video.videoWidth}x${video.videoHeight}, processedMat=${sourceWidth}x${sourceHeight}, canvas=${canvasWidth}x${canvasHeight}`);
                    this.loggedCanvasInfo.add(debugKey);
                }
            }

            // DEBUG: Only log canvas dimensions once on setup, not every frame
            if (sourceWidth === 1440 && sourceHeight === 2560) {
                const canvasKey = `${side}-canvas-${canvasWidth}x${canvasHeight}`;
                if (!this.loggedCanvasInfo) {
                    this.loggedCanvasInfo = new Set();
                }
                if (!this.loggedCanvasInfo.has(canvasKey)) {
                    console.log(`🔍 [${side}] Canvas dimensions: canvas=${canvasWidth}x${canvasHeight}, source=${sourceWidth}x${sourceHeight}`);
                    this.loggedCanvasInfo.add(canvasKey);
                }
            }

            // --- PREVIEW SCALING MODE: Match field of view across resolutions ---
            // For higher resolutions, crop the center to match 720p field of view
            // This prevents text from appearing too small on higher resolutions
            
            let finalSourceWidth = sourceWidth;
            let finalSourceHeight = sourceHeight;
            let cropX = 0;
            let cropY = 0;
            
            // Base resolution for field of view matching (720p rotated)
            const baseWidth = 720;   // 720p width becomes height after 90° rotation
            const baseHeight = 1280; // 720p height becomes width after 90° rotation
            
            // Calculate if we need to crop to match 720p field of view
            const widthRatio = sourceWidth / baseWidth;
            const heightRatio = sourceHeight / baseHeight;
            
            // 1440p resolution handling - debug logging removed for cleaner console output
            
            // Updated threshold for 1440p support: only crop for resolutions significantly higher than 1440p
            if (widthRatio > 2.5 || heightRatio > 2.5) {
                // For very high resolutions (above 1440p), crop to match reasonable field of view
                finalSourceWidth = Math.min(sourceWidth, baseWidth * 2.5);
                finalSourceHeight = Math.min(sourceHeight, baseHeight * 2.5);
                cropX = (sourceWidth - finalSourceWidth) / 2;
                cropY = (sourceHeight - finalSourceHeight) / 2;
                
                console.log(`🔍 Field of view matching for ${side}: original=${sourceWidth}x${sourceHeight}, cropped=${finalSourceWidth}x${finalSourceHeight}, crop offset=${cropX},${cropY}`);
            } else {
                // DEBUG: Throttled logging when we're NOT cropping
                if (sourceWidth === 1440 && sourceHeight === 2560) {
                    const now = Date.now();
                    const lastTime = this.lastLogTime.get(side) || 0;
                    if (now - lastTime > 2000) {
                        console.log(`🔍 [${side}] No field of view cropping applied: ${sourceWidth}x${sourceHeight} (ratios: ${widthRatio.toFixed(2)}, ${heightRatio.toFixed(2)})`);
                        this.lastLogTime.set(side, now);
                    }
                }
            }
            
            // For portrait orientation cameras (width < height), scale to fill the canvas exactly
            const widthScale = canvasWidth / finalSourceWidth;
            const heightScale = canvasHeight / finalSourceHeight;
            
            // TEMPORARY DEBUG: Only log once per side per session for 1440p
            if (sourceWidth === 1440 && sourceHeight === 2560) {
                const debugKey = `${side}-1440p-debug`;
                if (!this.loggedCanvasInfo) {
                    this.loggedCanvasInfo = new Set();
                }
                if (!this.loggedCanvasInfo.has(debugKey)) {
                    console.log(`🔧 [${side}] SCALING DEBUG: canvas=${canvasWidth}x${canvasHeight}, source=${finalSourceWidth}x${finalSourceHeight}, widthScale=${widthScale.toFixed(4)}, heightScale=${heightScale.toFixed(4)}`);
                    this.loggedCanvasInfo.add(debugKey);
                }
            }
            
            // For portrait cameras, use width scale to fill canvas width completely
            // This ensures no horizontal cropping and proper aspect ratio
            let scale = (finalSourceWidth < finalSourceHeight) ? widthScale : Math.min(widthScale, heightScale);
            
            // Calculate exact final dimensions - don't clamp if very close to canvas size
            const finalWidth = Math.round(finalSourceWidth * scale);
            const finalHeight = Math.round(finalSourceHeight * scale);
            
            // Only clamp if significantly oversized (more than 2 pixels difference)
            // This prevents aspect ratio distortion from 1-pixel clamping
            const clampedWidth = (finalWidth - canvasWidth > 2) ? canvasWidth : finalWidth;
            const clampedHeight = (finalHeight - canvasHeight > 2) ? canvasHeight : finalHeight;
            
            // TEMPORARY DEBUG: Only log once per side per session for 1440p
            if (sourceWidth === 1440 && sourceHeight === 2560) {
                const debugKey = `${side}-1440p-final`;
                if (!this.loggedCanvasInfo) {
                    this.loggedCanvasInfo = new Set();
                }
                if (!this.loggedCanvasInfo.has(debugKey)) {
                    console.log(`🔧 [${side}] FINAL DIMENSIONS: scale=${scale.toFixed(4)}, finalSize=${finalWidth}x${finalHeight}, clampedSize=${clampedWidth}x${clampedHeight}`);
                    this.loggedCanvasInfo.add(debugKey);
                }
            }
            
            const offsetX = (canvasWidth - clampedWidth) / 2;
            const offsetY = (canvasHeight - clampedHeight) / 2;

            // DEBUG: Throttled logging for scaling calculation
            if (sourceWidth === 1440 && sourceHeight === 2560) {
                const now = Date.now();
                const lastTime = this.lastLogTime.get(side) || 0;
                if (now - lastTime > 2000) {
                    console.log(`🔍 [${side}] Scaling calculation: widthScale=${widthScale.toFixed(3)}, heightScale=${heightScale.toFixed(3)}, chosen=${scale.toFixed(3)}, finalSize=${clampedWidth}x${clampedHeight}, offset=${Math.round(offsetX)},${Math.round(offsetY)}`);
                    this.lastLogTime.set(side, now);
                }
            }

            // Apply field of view crop if needed
            let finalMat = trimmedMat;
            if (cropX > 0 || cropY > 0) {
                try {
                    const cropRect = new cv.Rect(Math.floor(cropX), Math.floor(cropY), Math.floor(finalSourceWidth), Math.floor(finalSourceHeight));
                    finalMat = trimmedMat.roi(cropRect);
                } catch (cropError) {
                    console.warn(`Failed to apply field of view crop for ${side}:`, cropError);
                    finalMat = trimmedMat;
                }
            }
            
            // Resize the processed image to final display size
            let resized;
            try {
                resized = new cv.Mat();
                const dsize = new cv.Size(clampedWidth, clampedHeight);
                // Removed: console.log(`[OpenCV] Resize: dsize=${dsize.width}x${dsize.height}, source=${sourceWidth}x${sourceHeight}, scale=${scale}`);
                if (dsize.width > 0 && dsize.height > 0 && finalMat.cols > 0 && finalMat.rows > 0) {
                    cv.resize(finalMat, resized, dsize, 0, 0, cv.INTER_LINEAR);
                } else {
                    throw new Error(`[OpenCV] Invalid resize dimensions: dsize=${dsize.width}x${dsize.height}, source=${finalMat.cols}x${finalMat.rows}`);
                }
            } catch (resizeErr) {
                // Only log on error
                if (resized) resized.delete();
                if (finalMat !== trimmedMat) finalMat.delete();
                if (trimmedMat !== processedMat) trimmedMat.delete();
                if (processedMat !== src) processedMat.delete();
                if (dst && !dst.isDeleted()) dst.delete();
                src.delete();
                return false;
            }

            // Create final output matrix with canvas dimensions and light gray background
            const output = new cv.Mat(canvasHeight, canvasWidth, cv.CV_8UC4, new cv.Scalar(240, 240, 240, 255));
            
            // Calculate ROI for placing the resized image
            const x = Math.max(0, Math.floor(offsetX));
            const y = Math.max(0, Math.floor(offsetY));
            const w = Math.min(resized.cols, canvasWidth - x);
            const h = Math.min(resized.rows, canvasHeight - y);
            
            // DEBUG: Throttled logging for ROI calculation
            if (sourceWidth === 1440 && sourceHeight === 2560) {
                const now = Date.now();
                const lastTime = this.lastLogTime.get(side) || 0;
                if (now - lastTime > 2000) {
                    console.log(`🔍 [${side}] ROI calculation: x=${x}, y=${y}, w=${w}, h=${h}, resized=${resized.cols}x${resized.rows}`);
                    this.lastLogTime.set(side, now);
                }
            }
            
            if (w > 0 && h > 0) {
                try {
                    const roi = output.roi(new cv.Rect(x, y, w, h));
                    
                    // Calculate source ROI if image is larger than available canvas space
                    let sourceROI;
                    if (offsetX < 0 || offsetY < 0) {
                        const sourceX = Math.max(0, Math.floor(-offsetX));
                        const sourceY = Math.max(0, Math.floor(-offsetY));
                        const sourceW = Math.min(w, resized.cols - sourceX);
                        const sourceH = Math.min(h, resized.rows - sourceY);
                        
                        if (sourceW > 0 && sourceH > 0) {
                            sourceROI = resized.roi(new cv.Rect(sourceX, sourceY, sourceW, sourceH));
                        }
                    } else {
                        sourceROI = resized.roi(new cv.Rect(0, 0, w, h));
                    }
                    
                    if (sourceROI) {
                        sourceROI.copyTo(roi);
                        sourceROI.delete();
                    }
                    roi.delete();
                } catch (roiError) {
                    console.error(`ROI error for ${side}:`, roiError);
                }
            }

            // Convert back to ImageData and draw to canvas
            try {
                cv.imshow(canvas, output);
            } catch (imshowError) {
                console.error(`imshow error for ${side}:`, imshowError);
                // Fallback: clear canvas with gray background
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Cleanup OpenCV matrices
            src.delete();
            if (dst && !dst.isDeleted()) dst.delete();
            if (processedMat !== src) processedMat.delete();
            if (trimmedMat !== processedMat) trimmedMat.delete();
            if (finalMat !== trimmedMat) finalMat.delete();
            resized.delete();
            output.delete();

            return true;

        } catch (error) {
            console.error(`OpenCV processing error for ${side}:`, error);
            // Disable OpenCV on repeated errors
            this.isOpenCVReady = false;
            // Only warn on error
            // Fallback to standard rendering
            return this.fallbackRender(side, video, canvas, options);
        }
    }

    /**
     * Capture trimmed and rotated image from video for final output (worker-based)
     */
    captureProcessedImage(side, video, options = {}, onResult) {
        const t0 = performance.now();
        
        // 🔍 DEBUG: Log capture options
        console.log(`📸 [${side}] Capture options:`, {
            trimTop: options.trimTop,
            trimBottom: options.trimBottom,
            trimLeft: options.trimLeft,
            trimRight: options.trimRight,
            rotation: options.rotation,
            videoSize: video ? `${video.videoWidth}x${video.videoHeight}` : 'no video'
        });
        
        if (this.captureWorkerReady && video && video.videoWidth && video.videoHeight) {
            // --- Use worker for processing ---
            try {
                // Draw current frame to canvas and get ImageData
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = video.videoWidth;
                tempCanvas.height = video.videoHeight;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                tempCtx.drawImage(video, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
                
                console.log(`📸 [${side}] Sending to worker: ${video.videoWidth}x${video.videoHeight}, rotation=${options.rotation}`);
                
                // Send to worker
                const requestId = `${side}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const t1 = performance.now();
                this.captureWorkerCallbacks.set(requestId, (result) => {
                    const t2 = performance.now();
                    // --- Timing logs ---
                    console.log(`📸 [${side}] Worker result:`, {
                        success: !!result.dataUrl,
                        error: result.error,
                        workerTiming: result.timing
                    });
                    
                    if (result.dataUrl) {
                        const workerTiming = result.timing || {};
                        if (onResult) onResult({ dataUrl: result.dataUrl, timing: { t0, t1, t2, worker: workerTiming } });
                    } else if (result.error) {
                        console.error(`📸 [${side}] Worker error:`, result.error);
                        if (onResult) onResult({ error: result.error, timing: { t0, t1, t2 } });
                    }
                });
                this.captureWorker.postMessage({
                    type: 'PROCESS_FRAME',
                    imageData,
                    options,
                    requestId
                });
                return; // Async, result via callback
            } catch (err) {
                console.error(`📸 [${side}] Worker setup error:`, err);
                // Fallback to main-thread
            }
        }
        
        // --- Fallback: main-thread OpenCV ---
        console.log(`📸 [${side}] Using main-thread fallback (worker not ready or video issue)`);
        const t1 = performance.now();
        let outputCanvas = null;
        try {
            outputCanvas = this._captureProcessedImageMainThread(side, video, options);
            console.log(`📸 [${side}] Main-thread result:`, {
                success: !!outputCanvas,
                size: outputCanvas ? `${outputCanvas.width}x${outputCanvas.height}` : 'failed'
            });
        } catch (err) {
            console.error(`📸 [${side}] Main-thread error:`, err);
            if (onResult) onResult({ error: err.message, timing: { t0, t1, t2: performance.now() } });
            return;
        }
        const t2 = performance.now();
        if (outputCanvas) {
            outputCanvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onload = () => {
                    if (onResult) onResult({ dataUrl: reader.result, timing: { t0, t1, t2 } });
                };
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.95);
        } else {
            if (onResult) onResult({ error: 'OpenCV capture failed', timing: { t0, t1, t2 } });
        }
    }

    // Main-thread OpenCV fallback (original logic)
    _captureProcessedImageMainThread(side, video, options = {}) {
        const {
            trimTop = 0,
            trimBottom = 0,
            trimLeft = 0,
            trimRight = 0,
            rotation = 0
        } = options;
        
        console.log(`📸 [${side}] Main-thread capture:`, {
            trimTop, trimBottom, trimLeft, trimRight, rotation,
            videoSize: video ? `${video.videoWidth}x${video.videoHeight}` : 'no video'
        });
        
        if (!this.isOpenCVReady || !video || video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn(`📸 [${side}] Main-thread capture failed: OpenCV=${this.isOpenCVReady}, video=${!!video}, videoSize=${video?.videoWidth}x${video?.videoHeight}`);
            return null;
        }
        const trimmedWidth = video.videoWidth - trimLeft - trimRight;
        const trimmedHeight = video.videoHeight - trimTop - trimBottom;
        if (trimmedWidth <= 0 || trimmedHeight <= 0) {
            console.warn(`📸 [${side}] Invalid trim dimensions: ${trimmedWidth}x${trimmedHeight}`);
            return null;
        }
        
        console.log(`📸 [${side}] Processing: original=${video.videoWidth}x${video.videoHeight}, trimmed=${trimmedWidth}x${trimmedHeight}`);
        
        const src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(video, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
        src.data.set(imageData.data);
        const trimmedROI = new cv.Rect(trimLeft, trimTop, trimmedWidth, trimmedHeight);
        const trimmedMat = src.roi(trimmedROI);
        let processedMat = trimmedMat;
        
        // --- ROTATION RESTORED TO CAPTURE ---
        // Apply rotation to match what user sees in preview
        if (parseInt(rotation, 10) !== 0) {
            const rotationValue = parseInt(rotation, 10);
            console.log(`📸 [${side}] Main-thread applying rotation ${rotationValue}° to capture to match preview`);
            
            let rotatedMat = new cv.Mat();
            const center = { x: trimmedMat.cols / 2, y: trimmedMat.rows / 2 };
            
            // Use same rotation direction as preview (negative for clockwise)
            const rotationMatrix = cv.getRotationMatrix2D(center, -rotationValue, 1.0);
            
            // Calculate new dimensions after rotation
            let newWidth, newHeight;
            
            if (rotationValue === 90 || rotationValue === 270) {
                // For 90° and 270°, dimensions swap exactly
                newWidth = trimmedMat.rows;
                newHeight = trimmedMat.cols;
            } else if (rotationValue === 180) {
                // For 180°, dimensions stay the same
                newWidth = trimmedMat.cols;
                newHeight = trimmedMat.rows;
            } else {
                // For other angles, calculate new dimensions
                const radians = (rotationValue * Math.PI) / 180;
                const cos = Math.abs(Math.cos(radians));
                const sin = Math.abs(Math.sin(radians));
                newWidth = Math.ceil(trimmedMat.rows * sin + trimmedMat.cols * cos);
                newHeight = Math.ceil(trimmedMat.rows * cos + trimmedMat.cols * sin);
            }
            
            // Apply rotation
            cv.warpAffine(trimmedMat, rotatedMat, rotationMatrix, new cv.Size(newWidth, newHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
            
            // Clean up
            rotationMatrix.delete();
            processedMat = rotatedMat;
        }
        
        console.log(`📸 [${side}] Final output size: ${processedMat.cols}x${processedMat.rows} (rotation applied)`);
        
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = processedMat.cols;
        outputCanvas.height = processedMat.rows;
        cv.imshow(outputCanvas, processedMat);
        src.delete();
        trimmedMat.delete();
        if (processedMat !== trimmedMat) processedMat.delete();
        return outputCanvas;
    }

    /**
     * Draw trim indicators on the preview canvas
     */
    drawTrimIndicators(canvas, options) {
        // REMOVED: No overlays or indicators should be drawn in the preview
        // This function is now a no-op
    }

    /**
     * Fallback rendering when OpenCV is not available
     */
    fallbackRender(side, video, canvas, options = {}) {
        const {
            trimTop = 0,
            trimBottom = 0,
            trimLeft = 0,
            trimRight = 0,
            rotation = 0
        } = options;

        // Ensure rotation is always an integer
        const rotationValue = parseInt(rotation, 10) || 0;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return false;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Clear with light gray background for letterboxing
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate trimmed area
        const sx = trimLeft;
        const sy = trimTop;
        const sw = video.videoWidth - trimLeft - trimRight;
        const sh = video.videoHeight - trimTop - trimBottom;

        if (sw <= 0 || sh <= 0) {
            return false;
        }

        // --- PREVIEW SCALING: Match field of view across resolutions ---
        // Apply rotation to get post-rotation dimensions for scaling calculation
        let sourceWidth = sw;
        let sourceHeight = sh;
        if (rotationValue === 90 || rotationValue === 270) {
            sourceWidth = sh;  // Width becomes height
            sourceHeight = sw; // Height becomes width
        }
        
        // For higher resolutions, crop the center to match 720p field of view
        let finalSourceWidth = sourceWidth;
        let finalSourceHeight = sourceHeight;
        let cropX = 0;
        let cropY = 0;
        
        // Base resolution for field of view matching (720p rotated)
        const baseWidth = 720;   // 720p width becomes height after 90° rotation
        const baseHeight = 1280; // 720p height becomes width after 90° rotation
        
        // Calculate if we need to crop to match 720p field of view
        const widthRatio = sourceWidth / baseWidth;
        const heightRatio = sourceHeight / baseHeight;
        
        // DEBUG: Always log the ratios for 1440p debugging
        if (sourceWidth === 1440 && sourceHeight === 2560) {
            console.log(`🔍 [${side}] Fallback 1440p Debug: sourceWidth=${sourceWidth}, sourceHeight=${sourceHeight}, widthRatio=${widthRatio.toFixed(2)}, heightRatio=${heightRatio.toFixed(2)}`);
        }
        
        // Updated threshold for 1440p support: only crop for resolutions significantly higher than 1440p
        if (widthRatio > 2.5 || heightRatio > 2.5) {
            // For very high resolutions (above 1440p), crop to match reasonable field of view
            finalSourceWidth = Math.min(sourceWidth, baseWidth * 2.5);
            finalSourceHeight = Math.min(sourceHeight, baseHeight * 2.5);
            cropX = (sourceWidth - finalSourceWidth) / 2;
            cropY = (sourceHeight - finalSourceHeight) / 2;
            
            console.log(`🔍 [${side}] Fallback field of view matching: original=${sourceWidth}x${sourceHeight}, cropped=${finalSourceWidth}x${finalSourceHeight}, crop offset=${cropX},${cropY}`);
        } else {
            // DEBUG: Log when we're NOT cropping
            console.log(`🔍 [${side}] Fallback no field of view cropping applied: ${sourceWidth}x${sourceHeight} (ratios: ${widthRatio.toFixed(2)}, ${heightRatio.toFixed(2)})`);
        }
        
        // Use contain scaling to show the entire image without cropping
        const scale = Math.min(canvas.width / finalSourceWidth, canvas.height / finalSourceHeight);
        const drawWidth = finalSourceWidth * scale;
        const drawHeight = finalSourceHeight * scale;

        // Center the video in canvas
        const drawX = (canvas.width - drawWidth) / 2;
        const drawY = (canvas.height - drawHeight) / 2;

        // Apply rotation if needed
        if (rotationValue !== 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            // --- ROTATION DIRECTION FIXED ---
            // OpenCV uses negative rotation for clockwise, but Canvas uses positive for clockwise
            // So we need to use positive rotation to match OpenCV's visual result
            ctx.rotate((rotationValue * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Apply field of view crop by adjusting source coordinates
        const finalSx = sx + cropX;
        const finalSy = sy + cropY;
        const finalSw = finalSourceWidth;
        const finalSh = finalSourceHeight;

        // Draw the video with field of view crop
        ctx.drawImage(video, finalSx, finalSy, finalSw, finalSh, drawX, drawY, drawWidth, drawHeight);

        if (rotationValue !== 0) {
            ctx.restore();
        }

        // REMOVED: No overlays or indicators should be drawn in the preview
        // if (trimTop > 0 || trimBottom > 0 || trimLeft > 0 || trimRight > 0) {
        //     this.drawTrimIndicators(canvas, {
        //         trimTop,
        //         trimBottom,
        //         trimLeft,
        //         trimRight,
        //         sourceWidth: sw,
        //         sourceHeight: sh,
        //         finalWidth: drawWidth,
        //         finalHeight: drawHeight,
        //         offsetX: drawX,
        //         offsetY: drawY,
        //         rotationValue
        //     });
        // }

        return true;
    }

    /**
     * Start preview animation for a camera
     */
    startPreview(side, video, container, options = {}) {
        // Setup canvas
        const canvas = this.setupPreviewCanvas(side, container);
        
        // Stop any existing animation
        this.stopPreview(side);

        let frameCount = 0;
        const animate = () => {
            frameCount++;
            
            // Get current settings for trim and rotation
            const rotationElement = document.getElementById(`${side}-camera-rotate`);
            const rotationValue = rotationElement ? parseInt(rotationElement.value || 0, 10) : 0;

            // --- PERCENTAGE TRIM SUPPORT ---
            // Read trim as percent (0-100)
            const videoWidth = video.videoWidth || 1;
            const videoHeight = video.videoHeight || 1;
            const trimTopPercent = parseFloat(document.getElementById(`${side}-top`)?.value || 0) || 0;
            const trimBottomPercent = parseFloat(document.getElementById(`${side}-bottom`)?.value || 0) || 0;
            const trimLeftPercent = parseFloat(document.getElementById(`${side}-left`)?.value || 0) || 0;
            const trimRightPercent = parseFloat(document.getElementById(`${side}-right`)?.value || 0) || 0;
            // Convert percent to pixels
            const trimTop = Math.round(videoHeight * trimTopPercent / 100);
            const trimBottom = Math.round(videoHeight * trimBottomPercent / 100);
            const trimLeft = Math.round(videoWidth * trimLeftPercent / 100);
            const trimRight = Math.round(videoWidth * trimRightPercent / 100);

            // Get current options, merging with any updates from updatePreviewSettings
            const storedOptions = this.previewOptions?.get(side) || {};
            const currentOptions = {
                trimTop,
                trimBottom,
                trimLeft,
                trimRight,
                rotation: rotationValue,
                fillMode: options.fillMode || 'maximize',
                ...options,
                ...storedOptions // Apply any updated settings
            };
            // Debug logging for rotation (only log every 300 frames to reduce spam)
            // Removed: if (frameCount % 300 === 1 && rotationValue !== 0) { ... }

            // Process and render frame
            this.processAndRenderFrame(side, video, canvas, currentOptions);
            
            // Continue animation
            const animationId = requestAnimationFrame(animate);
            this.animationFrames.set(side, animationId);
        };

        // Start animation
        animate();
    }

    /**
     * Stop preview animation for a camera
     */
    stopPreview(side) {
        const animationId = this.animationFrames.get(side);
        if (animationId) {
            cancelAnimationFrame(animationId);
            this.animationFrames.delete(side);
            // Removed: console.log(`⏹️ Stopped preview for ${side} camera`);
        }
    }

    /**
     * Update preview settings (trim, rotation, etc.)
     */
    updatePreviewSettings(side, newOptions) {
        // Store the new options for the side
        if (!this.previewOptions) {
            this.previewOptions = new Map();
        }
        
        const currentOptions = this.previewOptions.get(side) || {};
        const updatedOptions = { ...currentOptions, ...newOptions };
        this.previewOptions.set(side, updatedOptions);
        
        // Log significant changes
        if (newOptions.rotation !== undefined || newOptions.showTrimPreview !== undefined) {
            console.log(`🔄 Updated ${side} preview settings:`, newOptions);
        }
        
        // The settings will be applied in the next animation frame
        // No need to restart the preview - the renderFrame method will pick up the new settings
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Stop all animations
        for (const side of this.animationFrames.keys()) {
            this.stopPreview(side);
        }
        
        // Clear canvases
        this.previewCanvases.clear();
    }
}

// Global instance
window.openCVPreviewManager = new OpenCVPreviewManager();

// Initialize when OpenCV is ready - improved detection
function initializeOpenCV() {
    if (typeof cv !== 'undefined' && cv.Mat) {
        setTimeout(() => {
            const success = window.openCVPreviewManager.initializeOpenCV();
            if (success) {
                console.log('🎯 OpenCV preview manager ready');
                // Notify other components that OpenCV is ready
                window.dispatchEvent(new CustomEvent('opencvReady'));
                // Force re-check of camera previews to switch from hybrid to OpenCV
                if (window.cameraManager && window.cameraManager.updateCameraPreview) {
                    setTimeout(() => {
                        window.cameraManager.updateCameraPreview('left');
                        window.cameraManager.updateCameraPreview('right');
                    }, 100);
                }
            }
        }, 50);
        return true;
    }
    return false;
}

// Check for OpenCV periodically
let checkCount = 0;
const checkForOpenCV = () => {
    if (initializeOpenCV()) {
        return; // Success, stop checking
    }
    
    checkCount++;
    if (checkCount < 200) { // Check for 10 seconds (200 * 50ms)
        setTimeout(checkForOpenCV, 50);
    } else {
        // Only warn if OpenCV fails to load
        console.warn('⚠️ OpenCV.js failed to load after 10 seconds, using fallback rendering');
        window.openCVPreviewManager.isOpenCVReady = false;
    }
};

// Start checking immediately
checkForOpenCV();

// Debug function to test rotation values
window.testRotationValues = function() {
    const leftRotation = document.getElementById('left-camera-rotate')?.value;
    const rightRotation = document.getElementById('right-camera-rotate')?.value;
    // Removed: console.log('🔍 Current rotation values:', ...);
    return { left: leftRotation, right: rightRotation };
};

// Debug function to force OpenCV re-initialization
window.forceOpenCVInit = function() {
    console.log('🔄 Manually forcing OpenCV initialization...');
    const success = window.openCVPreviewManager.forceReinitialize();
    if (success) {
        console.log('✅ OpenCV re-initialized successfully');
        // Update camera previews to use OpenCV
        if (window.cameraManager && window.cameraManager.updateCameraPreview) {
            setTimeout(() => {
                window.cameraManager.updateCameraPreview('left');
                window.cameraManager.updateCameraPreview('right');
            }, 100);
        }
    } else {
        console.error('❌ OpenCV re-initialization failed');
    }
    return success;
};
