(function() {
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function() { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var linksGroup = document.getElementById("linksGroup");
  var linksBtn = document.getElementById("linksBtn");
  if (!linksGroup || !linksBtn) return;
  var closeTimer = null;
  function setLinksOpen(open) {
    clearTimeout(closeTimer);
    linksGroup.classList.toggle("open", open);
    linksBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  linksBtn.addEventListener("click", function() {
    setLinksOpen(canHover ? true : !linksGroup.classList.contains("open"));
  });
  if (canHover) {
    linksGroup.addEventListener("mouseenter", function() { setLinksOpen(true); });
    linksGroup.addEventListener("mouseleave", function() {
      closeTimer = setTimeout(function() { setLinksOpen(false); }, 180);
    });
  }
  document.addEventListener("click", function(e) {
    if (!linksGroup.contains(e.target)) setLinksOpen(false);
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && linksGroup.classList.contains("open")) {
      setLinksOpen(false);
      linksBtn.focus();
    }
  });
  linksGroup.addEventListener("focusout", function(e) {
    if (!linksGroup.contains(e.relatedTarget)) setLinksOpen(false);
  });
})();
