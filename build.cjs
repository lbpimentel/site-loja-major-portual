const fs = require('fs');

// Read templates
let indexHtml = fs.readFileSync('index.html', 'utf8');
let timbreHtml = fs.readFileSync('timbre.html', 'utf8');

// Extract sections from index.html
const patronoMatch = indexHtml.match(/<!-- Seção: Patrono -->([\s\S]*?)<!-- Seção: História -->/);
const historiaMatch = indexHtml.match(/<!-- Seção: História -->([\s\S]*?)<!-- Veneráveis Mestres Section -->/);

let patronoSection = patronoMatch ? patronoMatch[1].trim() : '';
let historiaSection = historiaMatch ? historiaMatch[1].trim() : '';

// Fix the image cut off in historia section (adjust padding and object-contain)
historiaSection = historiaSection.replace(
    /class="w-full max-w-\[300px\] h-auto drop-shadow-2xl opacity-90 transition-transform duration-700 group-hover:scale-105"/g,
    'class="w-full max-w-[250px] object-contain drop-shadow-2xl opacity-90 transition-transform duration-700 group-hover:scale-105"'
).replace(/p-12 flex justify-center items-center/g, 'p-6 flex justify-center items-center');

// Create Historia.html
let historiaHtml = timbreHtml.replace(/<title>.*?<\/title>/, '<title>História - A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424</title>');
historiaHtml = historiaHtml.replace(/<main[\s\S]*?<\/main>/, '<main class="pt-24 min-h-screen flex flex-col">\n' + historiaSection + '\n</main>');
fs.writeFileSync('historia.html', historiaHtml, 'utf8');

// Create Patrono.html
let patronoHtml = timbreHtml.replace(/<title>.*?<\/title>/, '<title>Patrono - A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424</title>');
patronoHtml = patronoHtml.replace(/<main[\s\S]*?<\/main>/, '<main class="pt-24 min-h-screen flex flex-col">\n' + patronoSection + '\n</main>');
fs.writeFileSync('patrono.html', patronoHtml, 'utf8');

// Remove sections from index.html
indexHtml = indexHtml.replace(/<!-- Seção: Patrono -->[\s\S]*?<!-- Veneráveis Mestres Section -->/, '<!-- Veneráveis Mestres Section -->');

// Remove the button 'Conheça nossa História' from index.html
indexHtml = indexHtml.replace(/<a href="#historia"[^>]*>[\s\S]*?Conheça nossa História[\s\S]*?<\/a>/, '');

fs.writeFileSync('index.html', indexHtml, 'utf8');

console.log('Pages created and index.html updated.');
