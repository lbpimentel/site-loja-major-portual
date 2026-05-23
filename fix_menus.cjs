const fs = require('fs');

const filesToFix = ['biblioteca.html', 'fraternidade.html', 'calendario.html', 'tesouraria.html'];

const buildMobileMenu = (activePage) => {
    return `        <div class="flex flex-col gap-4">
            <a class="flex items-center gap-6 p-5 ${activePage === 'dashboard' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="dashboard.html">
                <span class="material-symbols-outlined text-amber-500">dashboard</span>
                <span class="text-lg font-medium tracking-wide">Painel Principal</span>
            </a>
            <a class="flex items-center gap-6 p-5 ${activePage === 'biblioteca' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="biblioteca.html">
                <span class="material-symbols-outlined text-amber-500">auto_stories</span>
                <span class="text-lg font-medium tracking-wide">Biblioteca Digital</span>
            </a>
            <a class="flex items-center gap-6 p-5 ${activePage === 'fraternidade' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="fraternidade.html">
                <span class="material-symbols-outlined text-amber-500">local_library</span>
                <span class="text-lg font-medium tracking-wide">Galeria de Fotos</span>
            </a>
            <a class="flex items-center gap-6 p-5 ${activePage === 'calendario' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="calendario.html">
                <span class="material-symbols-outlined text-amber-500">calendar_month</span>
                <span class="text-lg font-medium tracking-wide">Calendário de Sessões</span>
            </a>
            <a class="flex items-center gap-6 p-5 ${activePage === 'tesouraria' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="tesouraria.html">
                <span class="material-symbols-outlined text-amber-500">account_balance_wallet</span>
                <span class="text-lg font-medium tracking-wide">Tesouraria</span>
            </a>
            <!-- Admin Link Mobile -->
            <a id="adminMenuLinkMobile" href="#" class="hidden items-center gap-6 p-5 bg-white/5 rounded-2xl text-slate-200 border border-white/5 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-amber-500">admin_panel_settings</span>
                <span class="text-lg font-medium tracking-wide">Administração</span>
            </a>
            <button onclick="logout()" class="flex items-center gap-6 p-5 bg-red-500/10 rounded-2xl text-red-400 border border-red-500/10 active:scale-95 transition-all mt-8">
                <span class="material-symbols-outlined">logout</span>
                <span class="text-lg font-medium tracking-wide uppercase">Sair do Portal</span>
            </button>
        </div>`;
};

const buildDesktopMenu = (activePage) => {
    return `        <div class="flex-1 px-4 py-6 space-y-2">
            <a href="dashboard.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'dashboard' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5'} rounded-xl transition-all group">
                <span class="material-symbols-outlined">dashboard</span>
                <span class="font-medium">Painel Principal</span>
            </a>
            <a href="biblioteca.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'biblioteca' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5'} rounded-xl transition-all group">
                <span class="material-symbols-outlined">auto_stories</span>
                <span class="font-medium">Biblioteca Digital</span>
            </a>
            <a href="fraternidade.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'fraternidade' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5'} rounded-xl transition-all group">
                <span class="material-symbols-outlined">local_library</span>
                <span class="font-medium">Galeria de Fotos</span>
            </a>
            <a href="calendario.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'calendario' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5'} rounded-xl transition-all group">
                <span class="material-symbols-outlined">calendar_month</span>
                <span class="font-medium">Calendário de Sessões</span>
            </a>
            <a href="tesouraria.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'tesouraria' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5'} rounded-xl transition-all group">
                <span class="material-symbols-outlined">account_balance_wallet</span>
                <span class="font-medium">Tesouraria</span>
            </a>
            <!-- Admin Link (Hidden by default) -->
            <a id="adminMenuLink" href="#" class="hidden items-center gap-4 px-6 py-4 text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl transition-all group">
                <span class="material-symbols-outlined">admin_panel_settings</span>
                <span class="font-medium">Administração</span>
            </a>
        </div>`;
};

// Also apply to dashboard.html
filesToFix.push('dashboard.html');

for (const file of filesToFix) {
    if (!fs.existsSync(file)) continue;
    
    let activePage = file.replace('.html', '');
    let content = fs.readFileSync(file, 'utf8');

    // Replace mobile menu: from <div class="flex flex-col gap-4"> until </div> next to <div class="mt-auto
    const mobileRegex = /<div class="flex flex-col gap-4">[\s\S]*?(?=<div class="mt-auto|<div class="p-6)/;
    if (mobileRegex.test(content)) {
        content = content.replace(mobileRegex, buildMobileMenu(activePage) + '\n');
    }

    // Replace desktop menu: from <div class="flex-1 px-4 py-6 space-y-2"> until </div>
    const desktopRegex = /<div class="flex-1 px-4 py-6 space-y-2">[\s\S]*?<\/div>/;
    if (desktopRegex.test(content)) {
        content = content.replace(desktopRegex, buildDesktopMenu(activePage));
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed menus in ${file}`);
}
