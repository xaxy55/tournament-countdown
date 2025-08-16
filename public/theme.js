(function(){
  function applyTheme(theme){
    const doc = document.documentElement;
    const body = document.body;
    if (!theme || !theme.enabled) {
      body.classList.remove('theme-custom');
      return;
    }
    const c = theme.colors || {};
    const set = (k,v)=>{ if (typeof v === 'string' && v) doc.style.setProperty(`--${k}`, v); };
    set('bg', c.bg);
    set('text', c.text);
    set('heading', c.heading);
    set('surface', c.surface);
    set('border', c.border);
    set('border-strong', c.borderStrong);
    set('input-bg', c.inputBg);
    set('input-text', c.inputText);
    set('primary-start', c.primaryStart);
    set('primary-end', c.primaryEnd);
    set('secondary-start', c.secondaryStart);
    set('secondary-end', c.secondaryEnd);
    set('tertiary-start', c.tertiaryStart);
    set('tertiary-end', c.tertiaryEnd);
    set('status-idle', c.statusIdle);
    set('status-running', c.statusRunning);
    set('status-done', c.statusDone);
    set('status-warning', c.statusWarning);
    set('flash-red', c.flashRed);
    set('remaining-warning', c.remainingWarning);
    body.classList.add('theme-custom');
  }

  async function loadTheme(){
    try{
      const res = await fetch('/api/settings');
      const data = await res.json();
      applyTheme(data.settings?.theme);
    }catch(e){ /* ignore */ }
  }

  // expose for settings page to call after save
  window.__applyTheme = applyTheme;
  window.__loadTheme = loadTheme;

  // auto run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
  } else {
    loadTheme();
  }
})();
