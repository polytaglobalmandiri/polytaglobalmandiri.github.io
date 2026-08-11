(function () {
  'use strict';

  const LOCK_CLASS = 'spk-modal-scroll-lock';
  const body = document.body;
  const root = document.documentElement;

  if (!body || !root) return;

  let locked = false;
  let scheduled = false;
  let scrollX = 0;
  let scrollY = 0;
  let savedBodyStyles = null;
  let savedRootStyles = null;

  function hasOpenModal() {
    if (
      body.classList.contains('modal-open') ||
      body.classList.contains('eta-dialog-open') ||
      body.classList.contains('detail-dialog-open') ||
      body.classList.contains('swal2-shown')
    ) {
      return true;
    }

    return Boolean(
      document.querySelector(
        '.modal.show, .eta-modal:not([hidden]), .detail-modal:not([hidden]), ' +
        '.save-success-overlay:not([hidden]), ' +
        '.swal2-container:not(.swal2-toast-shown) .swal2-popup.swal2-show'
      )
    );
  }

  function lockPage() {
    if (locked) return;

    locked = true;
    scrollX = window.scrollX || window.pageXOffset || 0;
    scrollY = window.scrollY || window.pageYOffset || 0;
    savedBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width
    };
    savedRootStyles = {
      overflow: root.style.overflow,
      scrollBehavior: root.style.scrollBehavior
    };

    root.classList.add(LOCK_CLASS);
    body.classList.add(LOCK_CLASS);
    root.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.right = '0';
    body.style.width = '100%';
  }

  function unlockPage() {
    if (!locked) return;

    locked = false;
    root.classList.remove(LOCK_CLASS);
    body.classList.remove(LOCK_CLASS);

    body.style.position = savedBodyStyles.position;
    body.style.top = savedBodyStyles.top;
    body.style.left = savedBodyStyles.left;
    body.style.right = savedBodyStyles.right;
    body.style.width = savedBodyStyles.width;
    root.style.overflow = savedRootStyles.overflow;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(scrollX, scrollY);
    root.style.scrollBehavior = savedRootStyles.scrollBehavior;

    savedBodyStyles = null;
    savedRootStyles = null;
  }

  function reconcile() {
    scheduled = false;
    if (hasOpenModal()) {
      lockPage();
    } else {
      unlockPage();
    }
  }

  function scheduleReconcile() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(reconcile);
  }

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden']
  });

  document.addEventListener('show.bs.modal', scheduleReconcile);
  document.addEventListener('shown.bs.modal', scheduleReconcile);
  document.addEventListener('hide.bs.modal', scheduleReconcile);
  document.addEventListener('hidden.bs.modal', scheduleReconcile);
  scheduleReconcile();
})();
