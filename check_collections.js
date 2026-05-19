
import fs from 'fs';
import path from 'path';

const categories = [
  'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 
  'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
  'lazer', 'localizacoes'
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    categories.forEach(cat => {
      // Look for collection(db, 'cat') or collection(db, "cat")
      const regex = new RegExp(`collection\\(db,\\s*['"]${cat}['"]\\)`, 'g');
      if (regex.test(content)) {
        console.log(`Found collection access to ${cat} in ${filePath}`);
      }
      
      // Look for subcollections: collection(db, 'something', 'cat', 'items')
       const subRegex = new RegExp(`collection\\(db,\\s*['"].+?['"],\\s*['"]${cat}['"]`, 'g');
       if (subRegex.test(content)) {
         console.log(`Found potential subcollection access to ${cat} in ${filePath}`);
       }
    });
  }
});
