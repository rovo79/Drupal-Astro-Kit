const fs = require('fs');
const path = require('path');

const recipeContent = fs.readFileSync(path.join(__dirname, 'recipe.yml'), 'utf8');
const blocks = recipeContent.split('# ============================================================');

let rootRecipe = "";

for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;
    
    if (block.startsWith('FILE:')) {
        const lines = block.split('\n');
        const fileMarker = lines[0]; // e.g. FILE: recipes/.../config/node/node.type.product.yml
        const relPathStr = fileMarker.replace('FILE: recipes/dak_discovery_catalog/', '').trim();
        
        if (relPathStr === 'recipe.yml') {
             // We drop the remaining index lines and just take the YAML
             const yamlContentIndex = blocks[i+1];
             rootRecipe = yamlContentIndex.trim();
             i++; // skip next block since we consumed it
        } else if (relPathStr.startsWith('config/')) {
             const filename = path.basename(relPathStr);
             const dirname = path.dirname(relPathStr);
             const targetDir = path.join(__dirname, dirname);
             
             if (!fs.existsSync(targetDir)) {
                 fs.mkdirSync(targetDir, {recursive: true});
             }
             
             // The yaml follows in the next block
             if(i + 1 < blocks.length) {
                 const yamlContent = blocks[i+1].trim();
                 fs.writeFileSync(path.join(targetDir, filename), yamlContent);
             }
             i++; // consume next block
        }
    } else if (i === 1 && !block.startsWith('FILE:')) {
         // handle the edge case where the very first text after block 1 is the recipe.yml body
         rootRecipe = block;
    }
}

// Write the stripped down recipe.yml
console.log("Writing clean recipe.yml");
fs.writeFileSync(path.join(__dirname, 'recipe.yml'), rootRecipe);
