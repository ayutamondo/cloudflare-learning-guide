(function () {
  const STORAGE_KEY = 'cf-guide-progress';
  const STATUS = { READ: 'check_circle', UNREAD: 'circle' };

  function readProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeProgress(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // localStorage may be unavailable in some private browsing modes.
    }
  }

  function normalizePathname(pathname) {
    const clean = pathname || '/';
    const withoutHash = clean.split('#')[0];
    return withoutHash.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  }

  function getCurrentPageKey() {
    const current = normalizePathname(window.location.pathname);
    return current.startsWith('/') ? current : '/' + current;
  }

  function getPageEntry(pageKey) {
    const progress = readProgress();
    const entry = progress[pageKey];

    if (entry === 'read') {
      return { status: 'read', lastHeadingId: '', scrollY: 0 };
    }

    if (entry && typeof entry === 'object') {
      return {
        status: entry.status || 'read',
        lastHeadingId: entry.lastHeadingId || '',
        scrollY: Number(entry.scrollY) || 0
      };
    }

    return { status: 'unread', lastHeadingId: '', scrollY: 0 };
  }

  function setPageEntry(updates) {
    const progress = readProgress();
    const pageKey = getCurrentPageKey();
    const current = getPageEntry(pageKey);

    progress[pageKey] = {
      status: updates.status || current.status || 'read',
      lastHeadingId: updates.lastHeadingId !== undefined ? updates.lastHeadingId : current.lastHeadingId || '',
      scrollY: updates.scrollY !== undefined ? Number(updates.scrollY) : Number(current.scrollY) || 0
    };

    writeProgress(progress);
  }

  function clearCurrentPageEntry() {
    const progress = readProgress();
    const pageKey = getCurrentPageKey();
    delete progress[pageKey];
    writeProgress(progress);
    applyStatusToLinks();
    syncBookmarkState();
  }

  function syncBookmarkState() {
    const bookmarkLink = document.querySelector('.bookmark-link');
    if (!bookmarkLink) {
      return;
    }

    const pageKey = getCurrentPageKey();
    const progress = readProgress();
    const hasSavedPageState = Object.prototype.hasOwnProperty.call(progress, pageKey);
    const state = getPageEntry(pageKey);
    const hasSavedState = hasSavedPageState || !!state.lastHeadingId || Number(state.scrollY) > 0 || state.status === 'read';
    bookmarkLink.classList.toggle('is-active', hasSavedState);
    bookmarkLink.classList.toggle('is-inactive', !hasSavedState);
  }

  function getVisibleHeading() {
    const headings = Array.from(document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]'));
    if (!headings.length) {
      return '';
    }

    const referencePoint = window.innerHeight * 0.25;
    let active = headings[0];
    let smallestDistance = Number.POSITIVE_INFINITY;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      const distance = Math.abs(rect.top - referencePoint);

      if (rect.top <= referencePoint && rect.bottom > 0 && distance < smallestDistance) {
        active = heading;
        smallestDistance = distance;
      }
    });

    return active ? active.id : '';
  }

  function updateCurrentSectionProgress() {
    const headingId = getVisibleHeading();
    setPageEntry({
      status: 'read',
      lastHeadingId: headingId,
      scrollY: Math.max(window.scrollY, 0)
    });
    syncBookmarkState();
  }

  function applyStatusToLinks() {
    const links = document.querySelectorAll('.progress-link');
    const progress = readProgress();

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) {
        return;
      }

      const key = normalizePathname(new URL(href, window.location.href).pathname);
      const entry = progress[key];
      const isRead = entry === 'read' || (entry && typeof entry === 'object' && entry.status === 'read');

      link.classList.toggle('is-read', isRead);
      link.classList.toggle('is-unread', !isRead);

      const status = document.createElement('span');
      status.className = 'nav-status material-symbols-rounded';
      status.textContent = isRead ? STATUS.READ : STATUS.UNREAD;

      const existingStatus = link.querySelector('.nav-status');
      if (existingStatus) {
        existingStatus.remove();
      }

      link.appendChild(status);
    });
  }

  function jumpToSavedSection() {
    const state = getPageEntry(getCurrentPageKey());
    const targetId = state.lastHeadingId;

    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    const savedScrollY = Number(state.scrollY) || 0;
    if (savedScrollY > 0) {
      window.scrollTo({ top: savedScrollY, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindControls() {
    const bookmarkLink = document.querySelector('.bookmark-link');
    if (bookmarkLink) {
      bookmarkLink.addEventListener('click', function (event) {
        event.preventDefault();
        jumpToSavedSection();
      });
    }

    const resetButton = document.querySelector('.reset-link');
    if (resetButton) {
      resetButton.addEventListener('click', function () {
        clearCurrentPageEntry();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    syncBookmarkState();
  }

  function initProgressTracking() {
    setPageEntry({
      status: 'read',
      lastHeadingId: getVisibleHeading(),
      scrollY: Math.max(window.scrollY, 0)
    });
    applyStatusToLinks();
    syncBookmarkState();
    bindControls();

    let ticking = false;
    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        updateCurrentSectionProgress();
        applyStatusToLinks();
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', updateCurrentSectionProgress);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgressTracking);
  } else {
    initProgressTracking();
  }
})();
