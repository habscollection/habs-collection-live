require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting product update process...');

// Function to run a script and return a promise
function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        console.log(`\n📂 Running ${path.basename(scriptPath)}...`);
        
        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error executing ${path.basename(scriptPath)}:`, error);
                reject(error);
                return;
            }
            
            if (stderr) {
                console.error(`⚠️ ${path.basename(scriptPath)} stderr:`, stderr);
            }
            
            console.log(`✅ ${path.basename(scriptPath)} output:`, stdout);
            resolve();
        });
    });
}

async function updateAllProducts() {
    try {
        // Step 1: Run migrate-products.js to update MongoDB
        console.log('\n📦 Step 1: Updating product data in MongoDB...');
        await runScript(path.join(__dirname, 'migrate-products.js'));

        // Step 2: Run generate-product-pages.js to update all HTML pages
        console.log('\n🔄 Step 2: Generating product pages...');
        const generatePagesPath = path.join(__dirname, 'generate-product-pages.js');
        if (!fs.existsSync(generatePagesPath)) {
            throw new Error(`Could not find generate-product-pages.js at: ${generatePagesPath}`);
        }
        await runScript(generatePagesPath);

        console.log('\n✨ All product updates completed successfully!');
        console.log('✨ MongoDB data updated');
        console.log('✨ Individual product pages generated');
        console.log('✨ Main products page updated');

    } catch (error) {
        console.error('\n❌ Error during product update process:', error);
        process.exit(1);
    }
}

// Run the update process
updateAllProducts(); 