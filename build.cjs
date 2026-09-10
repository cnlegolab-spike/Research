const fs=require('node:fs'),path=require('node:path');
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','app.js','curriculum.js','styles.css','daily.css','jpeg.js','voice.js'])fs.copyFileSync(name,path.join('dist',name));
fs.cpSync('assets','dist/assets',{recursive:true});
console.log('Static build ready: dist/index.html');
