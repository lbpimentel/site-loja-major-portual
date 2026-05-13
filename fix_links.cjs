const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Replace index.html#historia with historia.html
    content = content.replace(/href="[^"]*#historia"/g, 'href="historia.html"');
    
    // Replace index.html#patrono with patrono.html
    content = content.replace(/href="[^"]*#patrono"/g, 'href="patrono.html"');
    
    fs.writeFileSync(f, content, 'utf8');
});

console.log('Links updated in all HTML files.');
