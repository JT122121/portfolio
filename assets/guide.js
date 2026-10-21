(function() {
  document.querySelectorAll(".code").forEach(function(block) {
    var btn = block.querySelector(".copy");
    var pre = block.querySelector("pre");
    if (!btn || !pre) return;
    btn.addEventListener("click", function() {
      var done = function() {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function() { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1500);
      };
      var fallback = function() {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.textContent = "Press Ctrl+C";
        setTimeout(function() { btn.textContent = "Copy"; }, 2500);
      };
      try { navigator.clipboard.writeText(pre.textContent).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  document.querySelectorAll(".video-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var id = btn.getAttribute("data-video");
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return;
      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      frame.title = btn.getAttribute("aria-label") || "YouTube video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    });
  });
})();
