document.documentElement.classList.add('js');
document.body.classList.add('js');

/* Header solid-on-scroll */
var header = document.querySelector('.site-header');
function onScroll(){
  if (window.scrollY > 40) header.classList.add('is-solid');
  else header.classList.remove('is-solid');
}
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

/* Mobile off-canvas nav */
var toggle = document.querySelector('.nav-toggle');
var mnav = document.querySelector('.mnav');
var mnavClose = document.querySelector('.mnav-close');
function openNav(){ mnav.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeNav(){ mnav.classList.remove('open'); document.body.style.overflow = ''; }
if (toggle) toggle.addEventListener('click', openNav);
if (mnavClose) mnavClose.addEventListener('click', closeNav);
document.querySelectorAll('.mnav-list > li > a').forEach(function(a){ a.addEventListener('click', closeNav); });
document.querySelectorAll('.mnav-sub-toggle').forEach(function(btn){
  btn.addEventListener('click', function(){
    btn.nextElementSibling.classList.toggle('open');
    btn.classList.toggle('open');
  });
});

/* Hero slider */
(function(){
  var slides = document.querySelectorAll('.hero-slide');
  var dots = document.querySelectorAll('.hero-dots button');
  if (!slides.length) return;
  var i = 0, timer;
  function show(n){
    slides[i].classList.remove('is-active');
    if (dots[i]) dots[i].classList.remove('active');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-active');
    if (dots[i]) dots[i].classList.add('active');
  }
  function next(){ show(i + 1); }
  function start(){ timer = setInterval(next, 5500); }
  function stop(){ clearInterval(timer); }
  dots.forEach(function(dot, idx){
    dot.addEventListener('click', function(){ stop(); show(idx); start(); });
  });
  start();
})();

/* Services switcher */
(function(){
  var rows = document.querySelectorAll('.svc-row');
  var frames = document.querySelectorAll('.svc-frame-img');
  var link = document.querySelector('.svc-frame-link');
  if (!rows.length) return;
  function activate(row){
    rows.forEach(function(r){ r.classList.remove('is-active'); });
    frames.forEach(function(f){ f.classList.remove('is-active'); });
    row.classList.add('is-active');
    var idx = row.getAttribute('data-index');
    var target = document.querySelector('.svc-frame-img[data-index="' + idx + '"]');
    if (target) target.classList.add('is-active');
    if (link){
      link.setAttribute('href', row.getAttribute('data-href'));
      link.innerHTML = 'Explore ' + row.querySelector('.svc-row-title').textContent + ' <span class="arrow">&rarr;</span>';
    }
  }
  rows.forEach(function(row){
    row.addEventListener('click', function(e){
      e.preventDefault();
      activate(row);
    });
    row.addEventListener('mouseenter', function(){
      if (window.matchMedia('(hover: hover)').matches) activate(row);
    });
  });
})();

/* Stagger index for grouped reveals */
document.querySelectorAll('[data-stagger]').forEach(function(group){
  Array.from(group.children).forEach(function(child, i){ child.style.setProperty('--i', i); });
});

/* Reveal on scroll — IntersectionObserver + scroll-sweep fallback */
var reveals = document.querySelectorAll('.reveal, .reveal-scale, .reveal-line, .process-rail, .footer-word');
function sweep(){
  var vh = window.innerHeight;
  reveals.forEach(function(el){
    var r = el.getBoundingClientRect();
    if (r.top < vh * 0.9 && r.bottom > 0) el.classList.add('is-in');
  });
}
if ('IntersectionObserver' in window){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting) e.target.classList.add('is-in'); });
  }, { threshold:0.12 });
  reveals.forEach(function(el){ io.observe(el); });
}
window.addEventListener('scroll', sweep, { passive:true });
window.addEventListener('load', sweep);
sweep();

/* Count-up numbers */
var counters = document.querySelectorAll('[data-count]');
function animateCount(el){
  var target = el.getAttribute('data-count');
  var suffix = el.getAttribute('data-suffix') || '';
  var num = parseFloat(target);
  var isDecimal = target.indexOf('.') > -1;
  var dur = 1400, start = null;
  function step(ts){
    if (!start) start = ts;
    var p = Math.min((ts - start) / dur, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    var val = num * eased;
    el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val)) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(step);
}
if ('IntersectionObserver' in window && counters.length){
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting && !e.target.dataset.done){
        e.target.dataset.done = '1';
        animateCount(e.target);
      }
    });
  }, { threshold:0.4 });
  counters.forEach(function(el){ cio.observe(el); });
}

/* FAQ accordion */
document.querySelectorAll('.faq-q').forEach(function(btn){
  btn.addEventListener('click', function(){
    var item = btn.closest('.faq-item');
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(i){ i.classList.remove('open'); });
    if (!wasOpen) item.classList.add('open');
  });
});

/* Horizontal project gallery arrows */
var gallery = document.querySelector('.gallery');
var prevBtn = document.querySelector('.gallery-nav .prev');
var nextBtn = document.querySelector('.gallery-nav .next');
function galleryStep(dir){
  if (!gallery) return;
  var card = gallery.querySelector('.gallery-card');
  var step = card ? card.getBoundingClientRect().width + 20 : 400;
  gallery.scrollBy({ left: dir * step, behavior: 'smooth' });
}
if (prevBtn) prevBtn.addEventListener('click', function(){ galleryStep(-1); });
if (nextBtn) nextBtn.addEventListener('click', function(){ galleryStep(1); });
function updateGalleryNav(){
  if (!gallery || !prevBtn || !nextBtn) return;
  prevBtn.disabled = gallery.scrollLeft < 8;
  nextBtn.disabled = gallery.scrollLeft > gallery.scrollWidth - gallery.clientWidth - 8;
}
if (gallery){ gallery.addEventListener('scroll', updateGalleryNav, { passive:true }); updateGalleryNav(); }

/* Subtle parallax on the full-bleed statement image */
var statementImg = document.querySelector('.statement-media img');
function parallax(){
  if (!statementImg) return;
  var section = statementImg.closest('.statement');
  var r = section.getBoundingClientRect();
  var vh = window.innerHeight;
  if (r.bottom > 0 && r.top < vh){
    var progress = (vh - r.top) / (vh + r.height);
    var shift = (progress - 0.5) * 60;
    statementImg.style.transform = 'translateY(' + shift.toFixed(1) + 'px) scale(1.12)';
  }
}
window.addEventListener('scroll', parallax, { passive:true });
window.addEventListener('load', parallax);
parallax();

/* Quote form — front-end only mock submit */
var quoteForm = document.getElementById('quote-form');
if (quoteForm){
  quoteForm.addEventListener('submit', function(e){
    e.preventDefault();
    var required = quoteForm.querySelectorAll('[required]');
    var firstInvalid = null;
    required.forEach(function(f){
      if (!f.value.trim()){ f.style.borderColor = '#b23b3b'; if(!firstInvalid) firstInvalid = f; }
      else { f.style.borderColor = ''; }
    });
    if (firstInvalid){ firstInvalid.focus(); return; }
    quoteForm.classList.add('hide');
    document.getElementById('quote-success').classList.add('show');
  });
}

/* Hero form — front-end only mock submit (mirrors quote form) */
var heroForm = document.getElementById('hero-form');
if (heroForm){
  heroForm.addEventListener('submit', function(e){
    e.preventDefault();
    var required = heroForm.querySelectorAll('[required]');
    var firstInvalid = null;
    required.forEach(function(f){
      if (!f.value.trim()){ f.style.borderColor = '#b23b3b'; if(!firstInvalid) firstInvalid = f; }
      else { f.style.borderColor = ''; }
    });
    if (firstInvalid){ firstInvalid.focus(); return; }
    heroForm.classList.add('hide');
    document.getElementById('hero-form-success').classList.add('show');
  });
}

/* Footer year */
var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Active nav link for the current page */
(function(){
  var file = location.pathname.split('/').pop() || 'index-v2.html';
  document.querySelectorAll('.main-nav > ul > li > a, .mnav-list > li > a').forEach(function(a){
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (href.split('#')[0] === file) a.classList.add('is-active');
  });
  var groups = {
    'home-renovations': ['full-home-renovations.html', 'laundry-renovations.html', 'home-extensions.html', 'decks-and-pergolas.html', 'balcony-renovations.html', 'new-home-builds.html'],
    'service-areas': ['service-areas.html']
  };
  document.querySelectorAll('[data-nav-group]').forEach(function(el){
    var files = groups[el.getAttribute('data-nav-group')] || [];
    if (files.indexOf(file) !== -1) el.classList.add('is-active');
  });
})();

/* Active nav link for the section currently in view */
(function(){
  var links = document.querySelectorAll('.main-nav a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  var map = {};
  links.forEach(function(a){
    var id = a.getAttribute('href');
    if (id.length > 1 && document.querySelector(id)) map[id] = a;
  });
  var ids = Object.keys(map);
  if (!ids.length) return;
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){
        links.forEach(function(a){ a.classList.remove('is-active'); });
        var a = map['#' + e.target.id];
        if (a) a.classList.add('is-active');
      }
    });
  }, { rootMargin:'-40% 0px -55% 0px', threshold:0 });
  ids.forEach(function(id){ obs.observe(document.querySelector(id)); });
})();

/* Drag-to-scroll for the project gallery (arrow buttons keep working) */
(function(){
  var g = document.querySelector('.gallery');
  if (!g) return;
  var down = false, startX = 0, startScroll = 0;
  g.addEventListener('pointerdown', function(e){
    down = true; startX = e.clientX; startScroll = g.scrollLeft;
    g.classList.add('is-dragging');
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
  });
  g.addEventListener('pointermove', function(e){
    if (!down) return;
    g.scrollLeft = startScroll - (e.clientX - startX);
  });
  function end(){ down = false; g.classList.remove('is-dragging'); }
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  g.addEventListener('dragstart', function(e){ e.preventDefault(); });
})();
