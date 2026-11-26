(() => {
  const button = document.getElementById('fullscreen-toggle');
  const status = document.getElementById('fullscreen-status');
  const label = button?.querySelector('[data-fullscreen-label]');
  if (!button || !status || !label) return;
  const active = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  function sync() {
    const expanded = active();
    button.setAttribute('aria-pressed', String(expanded));
    button.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = expanded ? 'Exit fullscreen (Esc)' : 'Enter fullscreen';
    label.textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
  }
  function notify(message = '') {
    status.textContent = message;
    status.hidden = !message;
  }
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    notify();
    const element = document.documentElement;
    const enter = element.requestFullscreen || element.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((!active() && !enter) || (active() && !exit)) {
      notify('Page fullscreen is not supported in this browser. Use your browser’s fullscreen control instead.');
      return;
    }
    button.disabled = true;
    try {
      if (active()) await exit.call(document);
      else if (element.requestFullscreen) await element.requestFullscreen({ navigationUI: 'hide' });
      else await enter.call(element);
    } catch {
      notify('Your browser could not change fullscreen mode. Try again, or use your browser’s fullscreen control.');
    } finally {
      button.disabled = false;
      sync();
    }
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  let navigating = false;
  async function openWorkspace(url) {
    const addedStyles = [];
    const controls = button.closest('.fullscreen-controls');
    try {
      const response = await fetch('/workspace');
      if (!response.ok) throw new Error('Workspace unavailable');
      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!parsed.querySelector('#app')) throw new Error('Invalid workspace page');
      const styles = [...parsed.querySelectorAll('link[rel="stylesheet"]')].filter(sheet => new URL(sheet.getAttribute('href'), location.href).origin === location.origin);
      await Promise.all(styles.map(source => new Promise((resolve, reject) => {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = source.getAttribute('href');
        stylesheet.media = 'not all';
        stylesheet.onload = resolve;
        stylesheet.onerror = reject;
        addedStyles.push(stylesheet);
        document.head.append(stylesheet);
      })));
      // Keep documentElement (the fullscreen element) alive during the transition.
      window.dispatchEvent(new Event('scraploop:leave-landing'));
      document.querySelectorAll('link[rel="stylesheet"][href^="/landing/"]').forEach(sheet => {
        if (!sheet.getAttribute('href').endsWith('/fullscreen.css')) sheet.media = 'not all';
      });
      addedStyles.forEach(sheet => sheet.media = 'all');
      document.body.className = '';
      document.documentElement.classList.remove('motion-reduced');
      document.body.replaceChildren(...[...parsed.body.childNodes].map(node => document.importNode(node, true)));
      history.pushState({fullscreenWorkspace: true}, '', url);
      document.title = parsed.title;
      window.scrollTo(0, 0);
      await import('/app.js');
      document.querySelector('.masthead-actions').prepend(controls);
      sync();
      window.addEventListener('popstate', () => {
        if (location.pathname !== '/workspace' && location.pathname !== '/workspace/') location.reload();
      });
    } catch {
      if (document.querySelector('.landing-shell')) {
        addedStyles.forEach(sheet => sheet.remove());
        notify('The workspace could not be loaded. Check that npm run dev is running and try again. Fullscreen is still available.');
        navigating = false;
      } else {
        const recovery = document.createElement('div');
        recovery.className = 'panel panel-body';
        const message = document.createElement('p');
        message.setAttribute('role', 'alert');
        message.textContent = 'The workspace could not finish loading. Reload to retry.';
        const retry = document.createElement('button');
        retry.className = 'btn btn-primary';
        retry.textContent = 'Reload workspace';
        retry.onclick = () => location.reload();
        recovery.append(message, retry);
        document.getElementById('app').append(recovery, controls);
      }
    }
  }
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('.account-actions a[href^="/workspace"]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (anchor.target && anchor.target !== '_self') || !active()) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    notify();
    void openWorkspace(anchor.href);
  });
  sync();
})();
