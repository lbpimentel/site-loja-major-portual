const fs = require('fs');
const files = [
    'index.html',
    'login.html',
    'dashboard.html',
    'tesouraria.html',
    'biblioteca.html',
    'cadastro.html',
    'calendario.html',
    'fraternidade.html'
];

files.forEach(f => {
    if(!fs.existsSync(f)) return;
    let content = fs.readFileSync(f, 'utf8');
    
    // Replace raw occurrences
    content = content.replace(/ARLS Major Manoel dos Santos Portugal, Nº 4424/g, 'A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424');
    
    // Replace the specific logo container in non-index pages if they have the same format
    // This regex looks for the img and the div containing the text
    content = content.replace(
        /<div class="font-newsreader text-lg md:text-2xl font-semibold tracking-tight text-amber-500 truncate max-w-\[200px\] md:max-w-none">/g,
        `<div class="font-newsreader text-base md:text-xl font-medium tracking-wide text-amber-500 truncate max-w-[200px] md:max-w-none">`
    );

    // Some pages might use ARLS inside the regex before the first replace above, but we already replaced it to A∴R∴L∴S∴.
    fs.writeFileSync(f, content, 'utf8');
});
