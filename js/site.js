/*
 OSCILLOSAURUS — mobile navigation
*/
document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector(".menu-button");
  const menu = document.querySelector(".mobile-menu");
  if (!button || !menu) return;

  menu.id = "mobile-menu";
  button.setAttribute("aria-controls", "mobile-menu");
  button.setAttribute("aria-expanded", "false");

  const setOpen = (open) => {
    menu.classList.toggle("open", open);
    button.textContent = open ? "CLOSE" : "MENU";
    button.setAttribute("aria-expanded", String(open));
  };

  button.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) setOpen(false);
  });
});


/* 4.29 dynamic footer seed */
(() => {
  const seedNode = document.querySelector('[data-footer-seed]');
  if (!seedNode) return;

  const compactSeed = value => {
    const raw = String(value ?? '').trim();
    if (!raw) return '—';
    const numericTail = raw.match(/(\d+)\s*$/);
    return numericTail ? numericTail[1] : raw;
  };

  const currentSeed = () => {
    const liveSeed = document.querySelector('#seed');
    if (liveSeed) return liveSeed.value;

    const background = document.querySelector('.gen-field[data-osc-seed]');
    if (background) return background.dataset.oscSeed;

    const seeded = document.querySelector('svg[data-osc-seed]');
    return seeded ? seeded.dataset.oscSeed : '';
  };

  const updateFooterSeed = () => {
    seedNode.textContent = `S.${compactSeed(currentSeed())}`;
  };

  updateFooterSeed();

  document.addEventListener('input', event => {
    if (event.target?.matches?.('#seed')) updateFooterSeed();
  });

  document.addEventListener('change', event => {
    if (event.target?.matches?.('#seed')) updateFooterSeed();
  });
})();
