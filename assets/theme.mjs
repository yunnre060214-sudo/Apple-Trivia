// Safari derives its under-page fill from html/body, outside the captured page.
// Keep that fill and the root color-scheme separate from the page's appearance.
export function setBrowserTheme(document, theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.browserTheme = value;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value === 'dark' ? '#101216' : '#f5f4f0';
}

// Reveal the new appearance over the old page from the theme button's center.
export function createThemeSwitcher({document, window, applyTheme, saveTheme, commitTheme = () => {}, reducedMotion = () => false}) {
  const root = document.documentElement;
  let revision = 0, activeTransition, requestedTheme;
  return async function switchTheme(button) {
    const token = ++revision;
    const theme = (requestedTheme || root.dataset.theme) === 'dark' ? 'light' : 'dark';
    requestedTheme = theme;
    // Every click counts, including clicks before the capture callback runs.
    // Superseded callbacks and finalizers may never overwrite the latest intent.
    activeTransition?.skipTransition();
    activeTransition = undefined;
    let applied = false, transition;
    const update = () => {
      if (applied || token !== revision) return;
      applied = true;
      applyTheme(theme);
      saveTheme(theme);
    };
    const properties = ['--theme-reveal-x', '--theme-reveal-y', '--theme-reveal-radius', '--theme-reveal-backdrop'];
    try {
      if (reducedMotion() || typeof document.startViewTransition !== 'function') {
        update();
        return true;
      }
      const bounds = button.getBoundingClientRect();
      const width = Math.max(window.innerWidth, root.clientWidth || 0);
      const height = Math.max(window.innerHeight, root.clientHeight || 0);
      const x = Math.max(0, Math.min(width, bounds.left + bounds.width / 2));
      const y = Math.max(0, Math.min(height, bounds.top + bounds.height / 2));
      const setRadius = (w, h) => {
        const radius = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y))) + 2;
        root.style.setProperty('--theme-reveal-radius', `${radius}px`);
      };
      root.style.setProperty('--theme-reveal-x', `${x}px`);
      root.style.setProperty('--theme-reveal-y', `${y}px`);
      setRadius(width, height);
      // Keep any uncovered canvas in the old color until the reveal reaches it.
      const backdrop = window.getComputedStyle(root).getPropertyValue('--bg').trim();
      root.style.setProperty('--theme-reveal-backdrop', backdrop);
      root.classList.add('theme-revealing');
      transition = activeTransition = document.startViewTransition(update);
      await transition.ready;
      if (token !== revision) return true;
      // Mobile snapshots can extend beneath retractable browser toolbars, beyond
      // innerHeight. Measure the actual snapshot before its first painted frame.
      try {
        const snapshot = window.getComputedStyle(root, '::view-transition-group(root)');
        const snapshotWidth = parseFloat(snapshot.width), snapshotHeight = parseFloat(snapshot.height);
        setRadius(Math.max(width, snapshotWidth || 0), Math.max(height, snapshotHeight || 0));
      } catch {}
      await transition.finished;
      return true;
    } catch {
      // Skipped or unsupported transitions still commit the requested appearance.
      transition?.skipTransition();
      update();
      return true;
    } finally {
      // A system/storage change during the capture may supersede this request.
      if (token === revision) {
        if (applied) commitTheme(root.dataset.theme);
        root.classList.remove('theme-revealing');
        properties.forEach(property => root.style.removeProperty(property));
        activeTransition = undefined;
        requestedTheme = undefined;
      }
    }
  };
}
