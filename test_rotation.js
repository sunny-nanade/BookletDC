// Test rotation functionality
console.log('🔍 Starting rotation test...');

// Test 1: Check if rotation elements exist
const leftRotateElement = document.getElementById('left-camera-rotate');
const rightRotateElement = document.getElementById('right-camera-rotate');

if (leftRotateElement && rightRotateElement) {
    console.log('✅ Rotation elements found');
    console.log('Left rotation value:', leftRotateElement.value);
    console.log('Right rotation value:', rightRotateElement.value);
    
    // Test 2: Check if the values are parsed correctly
    const leftRotationParsed = parseInt(leftRotateElement.value || 0, 10);
    const rightRotationParsed = parseInt(rightRotateElement.value || 0, 10);
    
    console.log('Left rotation parsed:', leftRotationParsed);
    console.log('Right rotation parsed:', rightRotationParsed);
    
    // Test 3: Check if OpenCV is available
    if (typeof cv !== 'undefined') {
        console.log('✅ OpenCV is available');
        
        // Test 4: Check rotation matrix creation
        try {
            const center = { x: 100, y: 100 };
            const rotationMatrix = cv.getRotationMatrix2D(center, 90, 1.0);
            console.log('✅ Rotation matrix created successfully');
            
            // Test 5: Check data64F access
            if (rotationMatrix.data64F) {
                console.log('✅ data64F is accessible');
                console.log('Original matrix data:', rotationMatrix.data64F);
            } else {
                console.log('❌ data64F not accessible');
            }
            
            rotationMatrix.delete();
        } catch (error) {
            console.error('❌ Error creating rotation matrix:', error);
        }
    } else {
        console.log('❌ OpenCV not available');
    }
} else {
    console.log('❌ Rotation elements not found');
}

console.log('🔍 Rotation test complete');
