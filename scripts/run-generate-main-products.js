const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting main products page generation...');

// Run the generate script directly using spawn
const generateProcess = spawn('node', [path.join(__dirname, 'generate-main-products.js')], {
    stdio: 'inherit' // This will directly show output in the console
});

generateProcess.on('close', (code) => {
    if (code === 0) {
        console.log('✨ Main products page generated successfully!');
    } else {
        console.error(`❌ Generation process exited with code ${code}`);
        process.exit(1);
    }
}); 