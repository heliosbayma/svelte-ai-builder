(function () {
	try {
		var saved = localStorage.getItem('theme');
		var prefersDark =
			window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		var theme = saved || (prefersDark ? 'dark' : 'dark');
		document.documentElement.classList.toggle('dark', theme === 'dark');
	} catch {}
})();
