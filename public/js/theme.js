(function () {
  const theme = localStorage.getItem('theme') || 'dark';
  if (theme === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
  
  document.addEventListener('DOMContentLoaded', updateIcons);
})();

function updateIcons() {
  const isLight = document.documentElement.classList.contains('light');
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(icon => {
    icon.textContent = isLight ? 'dark_mode' : 'light_mode';
  });
}

window.toggleTheme = function () {
  const isLight = document.documentElement.classList.contains('light');
  const newTheme = isLight ? 'dark' : 'light';
  
  if (newTheme === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
  
  localStorage.setItem('theme', newTheme);
  updateIcons();
  window.dispatchEvent(new Event('themechange'));
};
