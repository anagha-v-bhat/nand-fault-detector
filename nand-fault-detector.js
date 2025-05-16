/**
 * NAND Gate Fault Detector with Pin Identifications
 * Custom DSP block for Edge Impulse
 */
module.exports = function(data, params) {
    return new Promise(function(resolve, reject) {
        try {
            // Parse input data into numerical array format
            let rows = [];
            if (typeof data === 'string') {
                rows = data.trim().split('\n').map(line =>
                    line.split(/[,\s]+/).map(val => isNaN(parseFloat(val)) ? val : parseFloat(val))
                );
            } else if (Array.isArray(data)) {
                rows = data;
            }
            
            // Process each IC test
            const features = rows.map(row => {
                // Separate numeric values from label
                const label = row.find(val => typeof val === 'string');
                const numericValues = row.filter(val => typeof val === 'number');
                
                const featureVector = [];
                const faultyPins = [];
                
                // Process each gate
                for (let i = 0; i < 4; i++) {
                    const offset = i * 3;
                    const A = numericValues[offset];
                    const B = numericValues[offset + 1];
                    const Y = numericValues[offset + 2];
                    
                    // Calculate expected output for NAND
                    const expectedY = (A === 1 && B === 1) ? 0 : 1;
                    const isCorrect = Y === expectedY ? 1 : 0;
                    
                    // Add basic features
                    featureVector.push(A, B, Y, isCorrect);
                    
                    // Identify faulty pin
                    if (!isCorrect) {
                        // Determine which pin is likely faulty
                        if ((A === 0 && B === 0 && Y === 0) || (A === 0 && B === 1 && Y === 0) || (A === 1 && B === 0 && Y === 0)) {
                            // Y pin is stuck at 0
                            faultyPins.push(`Y${i+1}_stuck_at_0`);
                        } else if ((A === 1 && B === 1 && Y === 1)) {
                            // Y pin is stuck at 1
                            faultyPins.push(`Y${i+1}_stuck_at_1`);
                        } else if ((A === 0 && Y === 0) && (B === 0 || B === 1)) {
                            // A pin is likely stuck at 1
                            faultyPins.push(`A${i+1}_stuck_at_1`);
                        } else if ((B === 0 && Y === 0) && (A === 0 || A === 1)) {
                            // B pin is likely stuck at 1
                            faultyPins.push(`B${i+1}_stuck_at_1`);
                        } else {
                            // General fault
                            faultyPins.push(`Gate${i+1}_fault`);
                        }
                    }
                }
                
                // Add summary features
                const errorCount = featureVector.filter((val, idx) => idx % 4 === 3 && val === 0).length;
                featureVector.push(errorCount);
                
                // Add binary flags for each potential pin fault (creates a more machine-learning friendly feature)
                for (let i = 0; i < 4; i++) {
                    featureVector.push(faultyPins.includes(`A${i+1}_stuck_at_1`) ? 1 : 0);
                    featureVector.push(faultyPins.includes(`B${i+1}_stuck_at_1`) ? 1 : 0);
                    featureVector.push(faultyPins.includes(`Y${i+1}_stuck_at_0`) ? 1 : 0);
                    featureVector.push(faultyPins.includes(`Y${i+1}_stuck_at_1`) ? 1 : 0);
                    featureVector.push(faultyPins.includes(`Gate${i+1}_fault`) ? 1 : 0);
                }
                
                return {
                    features: featureVector,
                    faultyPins: faultyPins.length > 0 ? faultyPins : ['none'],
                    label: label || (errorCount > 0 ? 'nand_faulty' : 'nand_working')
                };
            });
            
            // Extract just the feature vectors for Edge Impulse
            const featureVectors = features.map(f => f.features);
            
            resolve({
                features: featureVectors,
                // Additional data that can be used in your project
                faultDiagnostics: features.map(f => ({ 
                    faultyPins: f.faultyPins,
                    label: f.label
                }))
            });
        } catch (ex) {
            reject('Error processing data: ' + ex);
        }
    });
};
