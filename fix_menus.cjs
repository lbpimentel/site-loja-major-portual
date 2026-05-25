const fs = require('fs');

const filesToFix = ['biblioteca.html', 'fraternidade.html', 'calendario.html', 'tesouraria.html', 'dashboard.html'];

const buildMobileMenu = (activePage) => {
    return `<!-- MOBILE TOP BAR -->
    <nav class="lg:hidden fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/10">
        <div class="flex items-center gap-3">
            <img src="logo.png" alt="Logo" class="h-8 w-auto">
            <span class="font-newsreader text-amber-500 font-bold">Major Manoel</span>
        </div>
        <button onclick="toggleMobileMenu()" class="text-amber-500">
            <span class="material-symbols-outlined text-3xl">menu</span>
        </button>
    </nav>

    <!-- MOBILE MENU OVERLAY -->
    <div id="mobileMenu" class="fixed inset-0 z-[60] hidden flex flex-col bg-slate-950/98 backdrop-blur-2xl p-8 transform transition-transform duration-500 translate-x-full">
        <div class="flex justify-between items-center mb-12">
            <div class="flex items-center gap-3">
                <img src="logo.png" alt="Logo" class="h-8">
                <span class="font-newsreader text-amber-500 font-bold text-lg">Menu Principal</span>
            </div>
            <button onclick="toggleMobileMenu()" class="text-amber-500 w-12 h-12 flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl">close</span>
            </button>
        </div>
        <div class="flex flex-col gap-4">
            <a id="dashboardMenuLinkMobile" class="flex items-center gap-6 p-5 ${activePage === 'dashboard' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' : 'bg-white/5 text-slate-200 border-white/5'} rounded-2xl active:scale-95 transition-all border" href="dashboard.html">
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
            <a id="adminMenuLinkMobile" href="${activePage === 'dashboard' ? '#' : 'dashboard.html?section=admin'}" class="hidden items-center gap-6 p-5 bg-white/5 rounded-2xl text-slate-200 border border-white/5 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-amber-500">admin_panel_settings</span>
                <span class="text-lg font-medium tracking-wide">Administração</span>
            </a>
            <button onclick="logout()" class="flex items-center gap-6 p-5 bg-red-500/10 rounded-2xl text-red-400 border border-red-500/10 active:scale-95 transition-all mt-8">
                <span class="material-symbols-outlined">logout</span>
                <span class="text-lg font-medium tracking-wide uppercase">Sair do Portal</span>
            </button>
        </div>
        <div class="mt-auto text-center pb-8 px-6">
            <p class="text-slate-600 text-[10px] uppercase tracking-widest mb-4">A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424</p>
            
            <!-- Institutional Affiliation (Mobile) -->
            <div class="pt-6 border-t border-white/5 flex flex-col items-center">
                <div class="flex items-center gap-6 mb-3">
                    <a href="https://gob-rj.org.br/home" target="_blank" rel="noopener noreferrer" class="transition-transform hover:scale-105">
                        <img src="logo_gob_rj-2.png" alt="GOB-RJ" class="h-10 w-auto opacity-30">
                    </a>
                    <a href="https://www.gob.org.br/" target="_blank" rel="noopener noreferrer" class="transition-transform hover:scale-105">
                        <img src="logo-gob-brasilia-df-selo.png" alt="GOB" class="h-10 w-auto opacity-30">
                    </a>
                </div>
                <div class="space-y-0.5">
                    <p class="font-newsreader text-[10px] text-slate-400">Grande Oriente do Brasil no Rio de Janeiro</p>
                    <p class="text-[7px] text-amber-500/30 uppercase tracking-widest font-bold">Federado ao Grande Oriente do Brasil</p>
                </div>
            </div>
        </div>
    </div>\n`;
};

const buildDesktopMenu = (activePage) => {
    return `<!-- SIDE NAVBAR (Desktop) -->
    <nav class="hidden lg:flex fixed left-0 top-0 h-screen flex-col bg-slate-950/95 backdrop-blur-xl w-72 border-r border-white/10 shadow-2xl z-50">
        <div class="p-8 flex flex-col items-center text-center">
            <h1 class="text-amber-500 font-bold font-newsreader text-lg leading-tight tracking-tight">A∴R∴L∴S∴ Major Manoel dos Santos Portugal Nº 4424</h1>
            <p class="text-slate-500 text-[10px] uppercase tracking-[0.2em] mt-2">GOB - Rito Moderno</p>
        </div>

        <div class="flex-1 px-4 py-6 space-y-2">
            <a id="dashboardMenuLink" href="dashboard.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'dashboard' ? 'bg-amber-500/10 text-amber-500 rounded-xl' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl'} transition-all group">
                <span class="material-symbols-outlined">dashboard</span>
                <span class="font-medium">Painel Principal</span>
            </a>
            <a href="biblioteca.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'biblioteca' ? 'bg-amber-500/10 text-amber-500 rounded-xl' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl'} transition-all group">
                <span class="material-symbols-outlined">auto_stories</span>
                <span class="font-medium">Biblioteca Digital</span>
            </a>
            <a href="fraternidade.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'fraternidade' ? 'bg-amber-500/10 text-amber-500 rounded-xl' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl'} transition-all group">
                <span class="material-symbols-outlined">local_library</span>
                <span class="font-medium">Galeria de Fotos</span>
            </a>
            <a href="calendario.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'calendario' ? 'bg-amber-500/10 text-amber-500 rounded-xl' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl'} transition-all group">
                <span class="material-symbols-outlined">calendar_month</span>
                <span class="font-medium">Calendário de Sessões</span>
            </a>
            <a href="tesouraria.html" class="flex items-center gap-4 px-6 py-4 ${activePage === 'tesouraria' ? 'bg-amber-500/10 text-amber-500 rounded-xl' : 'text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl'} transition-all group">
                <span class="material-symbols-outlined">account_balance_wallet</span>
                <span class="font-medium">Tesouraria</span>
            </a>
            <!-- Admin Link (Hidden by default) -->
            <a id="adminMenuLink" href="${activePage === 'dashboard' ? '#' : 'dashboard.html?section=admin'}" class="hidden items-center gap-4 px-6 py-4 text-slate-400 hover:text-amber-500 hover:bg-white/5 rounded-xl transition-all group">
                <span class="material-symbols-outlined">admin_panel_settings</span>
                <span class="font-medium">Administração</span>
            </a>
        </div>

        <div class="p-6 border-t border-white/5">
            <div class="flex items-center gap-4 p-4 bg-white/5 rounded-2xl mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold" id="navInitial">M</div>
                <div class="flex-1">
                    <p class="text-sm font-bold text-slate-200" id="navName">Membro</p>
                    <p class="text-[10px] text-slate-500 uppercase tracking-widest" id="navPosition">Portal Ativo</p>
                </div>
            </div>
            <button onclick="logout()" class="w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-red-400 transition-colors text-sm font-bold uppercase tracking-widest group">
                <span class="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">logout</span>
                Sair do Portal
            </button>
            
            <!-- Institutional Affiliation (Desktop) -->
            <div class="mt-6 pt-6 border-t border-white/5 flex flex-col items-center">
                <div class="flex items-center gap-6 mb-3">
                    <a href="https://gob-rj.org.br/home" target="_blank" rel="noopener noreferrer" class="transition-transform hover:scale-105">
                        <img src="logo_gob_rj-2.png" alt="GOB-RJ" class="h-10 w-auto opacity-20 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-500">
                    </a>
                    <a href="https://www.gob.org.br/" target="_blank" rel="noopener noreferrer" class="transition-transform hover:scale-105">
                        <img src="logo-gob-brasilia-df-selo.png" alt="GOB" class="h-10 w-auto opacity-20 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-500">
                    </a>
                </div>
                <div class="space-y-0.5">
                    <p class="font-newsreader text-[10px] text-slate-400">Grande Oriente do Brasil no Rio de Janeiro</p>
                    <p class="text-[7px] text-amber-500/30 uppercase tracking-widest font-bold">Federado ao Grande Oriente do Brasil</p>
                </div>
            </div>
        </div>
    </nav>`;
};

for (const file of filesToFix) {
    if (!fs.existsSync(file)) continue;
    
    let activePage = file.replace('.html', '');
    let content = fs.readFileSync(file, 'utf8');

    // Replace the complete Mobile navigation section
    const mobileRegex = /<!-- MOBILE TOP BAR -->[\s\S]*?(?=<!-- SIDE NAVBAR)/;
    if (mobileRegex.test(content)) {
        content = content.replace(mobileRegex, buildMobileMenu(activePage));
    }

    // Replace the complete Desktop navigation section
    const desktopRegex = /<!-- SIDE NAVBAR(?:\s*\(Desktop\))?\s*-->[\s\S]*?<\/nav>/;
    if (desktopRegex.test(content)) {
        content = content.replace(desktopRegex, buildDesktopMenu(activePage));
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Successfully standardized menu & sidebar in ${file}`);
}
