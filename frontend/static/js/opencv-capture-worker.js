// opencv-capture-worker.js
// Web Worker for capture processing using OpenCV.js
// Loads OpenCV.js from CDN if not present locally

const OPENCV_CDN = 'https://docs.opencv.org/4.x/opencv.js';
let cvReady = false;
let cvLoadError = null;
let cvLoadPromise = null;

function loadOpenCV() {
    if (cvLoadPromise) return cvLoadPromise;
    cvLoadPromise = new Promise((resolve, reject) => {
        if (typeof cv !== 'undefined' && cv.Mat) {
            cvReady = true;
            resolve();
            return;
        }
        try {
            importScripts('static/js/opencv.js');
        } catch (e) {
            // If local import fails, fallback to CDN
            importScripts(OPENCV_CDN);
        }
        // Wait for cv['onRuntimeInitialized']
        if (typeof cv !== 'undefined' && cv['onRuntimeInitialized']) {
            cv['onRuntimeInitialized'] = () => {
                cvReady = true;
                resolve();
            };
        } else {
            // Fallback: poll for cv.Mat
            let tries = 0;
            const check = () => {
                if (typeof cv !== 'undefined' && cv.Mat) {
                    cvReady = true;
                    resolve();
                } else if (++tries < 100) {
                    setTimeout(check, 50);
                } else {
                    cvLoadError = 'OpenCV.js failed to load in worker.';
                    reject(cvLoadError);
                }
            };
            check();
        }
    });
    return cvLoadPromise;
}

async function processFrameWithOpenCV(imageData, options) {
    const t0 = performance.now();
    
    // 🔍 DEBUG: Log worker processing
    console.log(`🔧 [Worker] Processing frame:`, {
        imageSize: `${imageData.width}x${imageData.height}`,
        trimTop: options.trimTop || 0,
        trimBottom: options.trimBottom || 0,
        trimLeft: options.trimLeft || 0,
        trimRight: options.trimRight || 0,
        rotation: options.rotation || 0
    });
    
    // Convert ImageData to cv.Mat
    const src = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC4);
    src.data.set(imageData.data);
    let processedMat = src;
    let trimmedMat = src;
    try {
        // --- TRIM ---
        const trimTop = options.trimTop || 0;
        const trimBottom = options.trimBottom || 0;
        const trimLeft = options.trimLeft || 0;
        const trimRight = options.trimRight || 0;
        const rotation = parseInt(options.rotation, 10) || 0;
        const trimmedWidth = src.cols - trimLeft - trimRight;
        const trimmedHeight = src.rows - trimTop - trimBottom;
        
        console.log(`🔧 [Worker] Trim calculation:`, {
            original: `${src.cols}x${src.rows}`,
            trimmed: `${trimmedWidth}x${trimmedHeight}`,
            trim: { top: trimTop, bottom: trimBottom, left: trimLeft, right: trimRight }
        });
        
        if (trimmedWidth > 0 && trimmedHeight > 0) {
            trimmedMat = src.roi(new cv.Rect(trimLeft, trimTop, trimmedWidth, trimmedHeight));
        } else {
            trimmedMat = src;
        }
        processedMat = trimmedMat;
        
        // --- ROTATION RESTORED TO CAPTURE ---
        // Apply rotation to match what user sees in preview
        if (rotation !== 0) {
            console.log(`🔧 [Worker] Applying rotation ${rotation}° to capture to match preview`);
            
            let rotatedMat = new cv.Mat();
            const center = { x: trimmedMat.cols / 2, y: trimmedMat.rows / 2 };
            
            // Use same rotation direction as preview (negative for clockwise)
            const rotationMatrix = cv.getRotationMatrix2D(center, -rotation, 1.0);
            
            // Calculate new dimensions after rotation
            const radians = (rotation * Math.PI) / 180;
            const cos = Math.abs(Math.cos(radians));
            const sin = Math.abs(Math.sin(radians));
            let newWidth, newHeight;
            
            if (rotation === 90 || rotation === 270) {
                // For 90° and 270°, dimensions swap exactly
                newWidth = trimmedMat.rows;
                newHeight = trimmedMat.cols;
            } else if (rotation === 180) {
                // For 180°, dimensions stay the same
                newWidth = trimmedMat.cols;
                newHeight = trimmedMat.rows;
            } else {
                // For other angles, calculate new dimensions
                newWidth = Math.ceil(trimmedMat.rows * sin + trimmedMat.cols * cos);
                newHeight = Math.ceil(trimmedMat.rows * cos + trimmedMat.cols * sin);
            }
            
            // Apply rotation
            cv.warpAffine(trimmedMat, rotatedMat, rotationMatrix, new cv.Size(newWidth, newHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
            
            // Clean up
            rotationMatrix.delete();
            processedMat = rotatedMat;
        }
        
        console.log(`🔧 [Worker] Final output size: ${processedMat.cols}x${processedMat.rows} (rotation=${rotation}° applied)`);
        
        // --- ENCODE TO JPEG ---
        // Convert to ImageData
        const outCanvas = new OffscreenCanvas(processedMat.cols, processedMat.rows);
        const outCtx = outCanvas.getContext('2d');
        // RGBA
        const outImageData = new ImageData(new Uint8ClampedArray(processedMat.data), processedMat.cols, processedMat.rows);
        outCtx.putImageData(outImageData, 0, 0);
        // Convert to JPEG data URL
        const blob = await outCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
        const reader = new FileReader();
        const resultPromise = new Promise((resolve) => {
            reader.onload = () => {
                resolve({
                    dataUrl: reader.result,
                    timing: { t0, t1: performance.now(), t2: performance.now() }
                });
            };
        });
        reader.readAsDataURL(blob);
        // Cleanup
        src.delete();
        if (trimmedMat !== src) trimmedMat.delete();
        if (processedMat !== trimmedMat) processedMat.delete();
        return await resultPromise;
    } catch (err) {
        src.delete();
        if (trimmedMat !== src) trimmedMat.delete();
        if (processedMat !== trimmedMat) processedMat.delete();
        throw err;
    }
}

self.onmessage = function(e) {
    const { type, imageData, options, requestId } = e.data;
    if (type === 'PROCESS_FRAME') {
        loadOpenCV().then(() => {
            return processFrameWithOpenCV(imageData, options);
        }).then(result => {
            self.postMessage({
                type: 'FRAME_PROCESSED',
                requestId,
                dataUrl: result.dataUrl,
                timing: result.timing
            });
        }).catch(error => {
            self.postMessage({
                type: 'FRAME_ERROR',
                requestId,
                error: error && error.message ? error.message : String(error)
            });
        });
    }
};
