(function() {
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function() { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var tabStrip = document.querySelector(".site-header .nav-links");
  var tabLinks = tabStrip ? [].slice.call(tabStrip.querySelectorAll('a[href^="#"]')) : [];
  var tabTargets = tabLinks.map(function(a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  if (tabLinks.length && tabTargets.every(Boolean)) {
    var currentTab = -1;
    var markTab = function() {
      var line = (header ? header.offsetHeight : 70) + window.innerHeight * 0.25;
      var idx = -1;
      tabTargets.forEach(function(t, i) { if (t.getBoundingClientRect().top <= line) idx = i; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = tabTargets.length - 1;
      if (idx === currentTab) return;
      currentTab = idx;
      tabLinks.forEach(function(a, i) {
        if (i === idx) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      if (idx >= 0 && tabStrip.scrollWidth > tabStrip.clientWidth) {
        var a = tabLinks[idx];
        var inStrip = a.getBoundingClientRect().left - tabStrip.getBoundingClientRect().left + tabStrip.scrollLeft;
        tabStrip.scrollTo({ left: inStrip - (tabStrip.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
      }
    };
    var tabTicking = false;
    window.addEventListener("scroll", function() {
      if (!tabTicking) { tabTicking = true; requestAnimationFrame(function() { tabTicking = false; markTab(); }); }
    }, { passive: true });
    markTab();
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
