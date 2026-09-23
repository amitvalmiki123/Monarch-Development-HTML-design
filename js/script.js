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
document.querySelectorAll('.mnav-list > li > a').forEach(function(a){
  a.addEventListener('click', closeNav);
});

/* Mobile nav accordion for Service Areas */
document.querySelectorAll('.mnav-sub-toggle').forEach(function(btn){
  btn.addEventListener('click', function(){
    var sub = btn.nextElementSibling;
    sub.classList.toggle('open');
    btn.classList.toggle('open');
  });
});

/* Reveal on scroll (with no-JS / no-observer fallback via scroll sweep) */
var reveals = document.querySelectorAll('.reveal');
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

/* Footer year */
var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
