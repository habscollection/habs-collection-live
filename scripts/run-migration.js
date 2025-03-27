const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting product migration to MongoDB...');

// Run the migration script directly using spawn instead of exec
// This avoids issues with spaces in paths
const migrationProcess = spawn('node', [path.join(__dirname, 'migrate-products.js')], {
    stdio: 'inherit' // This will directly show output in the console
});

migrationProcess.on('close', (code) => {
    if (code === 0) {
        console.log('✨ MongoDB product migration completed successfully!');
    } else {
        console.error(`❌ Migration process exited with code ${code}`);
        process.exit(1);
    }
}); 