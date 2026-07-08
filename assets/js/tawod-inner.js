/* Shared inner pages interactions for Tawod */
(function(){
  'use strict';
  function ready(cb){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',cb):cb();}
  function abs(path){return path.charAt(0)==='/'?path:'/'+path;}
  var articleImages={
    'best-contracting-company-riyadh':'/images/blog/best-contracting-company-riyadh.webp',
    'construction-building-riyadh':'/images/blog/construction-building-riyadh.webp',
    'bone-construction-riyadh-guide':'/images/blog/bone-construction-riyadh-guide.webp',
    'bone-contractor-turnkey-riyadh':'/images/landing/bone-contractor-riyadh.webp',
    'contracting-riyadh-project-guide':'/images/blog/bone-construction-riyadh-guide.webp',
    'finishing-interior-design-riyadh':'/images/blog/finishing-interior-design-riyadh.webp',
    'mechanical-mep-works-riyadh':'/images/blog/mechanical-mep-works-riyadh.webp',
    'electrical-installation-maintenance-riyadh':'/images/blog/electrical-installation-maintenance-riyadh.webp',
    'plumbing-installation-riyadh':'/images/blog/plumbing-installation-riyadh.webp',
    'finishing-facades-restoration-riyadh':'/images/projects/villa-finishing-01.webp',
    'facades-interior-decor-insulation-riyadh':'/images/projects/interior-01.webp'
  };
  function currentArticleSlug(){var parts=window.location.pathname.split('/').filter(Boolean);var idx=parts.indexOf('blog');return idx>-1&&parts[idx+1]?parts[idx+1]:'';}
  function restoreBlogImages(){
    var slug=currentArticleSlug();
    if(slug&&articleImages[slug]){
      document.querySelectorAll('.article-content img').forEach(function(img){img.src=articleImages[slug];img.setAttribute('loading','lazy')});
      document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(function(meta){meta.setAttribute('content',window.location.origin+articleImages[slug])});
    }
    if(window.location.pathname.replace(/\/+$/,'').endsWith('/blog')){
      document.querySelectorAll('.article-card').forEach(function(card){var link=card.querySelector('.article-link[href]');var img=card.querySelector('.article-thumb img');if(!link||!img)return;var key=link.getAttribute('href').replace(/^\.\//,'').replace(/^\//,'').split('/').filter(Boolean)[0];if(articleImages[key]){img.src=articleImages[key];img.setAttribute('loading','lazy')}});
    }
  }
  function unifiedFooter(){
    var footer=document.querySelector('footer.footer');
    if(!footer)return;
    footer.outerHTML="<footer class='footer'><div class='container'><div class='footer-grid'><div class='footer-about'><img class='logo-img' src='/images/logo/tawod-logo.png' width='917' height='408' loading='lazy' alt='شركة تعاود'><p>شركة تعاود للمقاولات العامة بالرياض متخصصة في البناء والإنشاءات والترميم والتشطيب وتقديم حلول هندسية متكاملة بأعلى معايير الجودة.</p><div class='footer-socials'><a aria-label='Instagram' href='https://instagram.com/tawodco' target='_blank' rel='noopener'><i class='fa-brands fa-instagram'></i></a><a aria-label='TikTok' href='https://tiktok.com/@tawodco' target='_blank' rel='noopener'><i class='fa-brands fa-tiktok'></i></a><a aria-label='Snapchat' href='https://snapchat.com/add/tawodco' target='_blank' rel='noopener'><i class='fa-brands fa-snapchat'></i></a><a aria-label='X Twitter' href='https://twitter.com/tawodco' target='_blank' rel='noopener'><i class='fa-brands fa-x-twitter'></i></a><a aria-label='LinkedIn' href='https://linkedin.com/company/tawodco' target='_blank' rel='noopener'><i class='fa-brands fa-linkedin-in'></i></a></div></div><div><h4 class='footer-title'>روابط سريعة</h4><ul class='footer-links'><li><a href='/'><i class='fa-solid fa-angle-left'></i> الرئيسية</a></li><li><a href='/about.html'><i class='fa-solid fa-angle-left'></i> من نحن</a></li><li><a href='/#services'><i class='fa-solid fa-angle-left'></i> خدماتنا</a></li><li><a href='/projects.html'><i class='fa-solid fa-angle-left'></i> مشاريعنا</a></li><li><a href='/blog/'><i class='fa-solid fa-angle-left'></i> المدونة</a></li><li><a href='/contact.html'><i class='fa-solid fa-angle-left'></i> تواصل معنا</a></li></ul></div><div><h4 class='footer-title'>خدماتنا</h4><ul class='footer-links'><li><a href='/service-construction.html'><i class='fa-solid fa-angle-left'></i> البناء والإنشاءات</a></li><li><a href='/service-turnkey.html'><i class='fa-solid fa-angle-left'></i> تسليم مفتاح</a></li><li><a href='/service-restoration.html'><i class='fa-solid fa-angle-left'></i> ترميم مباني</a></li><li><a href='/service-finishing.html'><i class='fa-solid fa-angle-left'></i> تشطيبات عامة</a></li><li><a href='/service-decor.html'><i class='fa-solid fa-angle-left'></i> ديكورات</a></li><li><a href='/service-mep.html'><i class='fa-solid fa-angle-left'></i> أعمال الكهرباء والسباكة</a></li></ul></div><div><h4 class='footer-title'>تواصل معنا</h4><ul class='footer-contact'><li><div class='info-only'><i class='fa-solid fa-location-dot'></i><span>الرياض، المملكة العربية السعودية</span></div></li><li><a href='tel:0551128884'><i class='fa-solid fa-phone'></i><span>0551128884</span></a></li><li><a href='mailto:info@tawodco.com'><i class='fa-solid fa-envelope'></i><span>info@tawodco.com</span></a></li><li><div class='info-only'><i class='fa-regular fa-clock'></i><span>متاحون للرد على استفساراتكم ومناقشة المشاريع</span></div></li></ul></div></div><div class='footer-bottom'><p>جميع الحقوق محفوظة &copy; 2026 شركة تعاود للمقاولات العامة</p></div></div></footer>";
  }
  ready(function(){
    unifiedFooter();
    restoreBlogImages();
    var header=document.getElementById('header');
    var menuBtn=document.getElementById('menuBtn');
    var sidebar=document.getElementById('mobileSidebar');
    var closeBtn=document.getElementById('closeSidebar');
    var overlay=document.getElementById('sidebarOverlay');
    function setHeader(){if(header)header.classList.toggle('scrolled',window.scrollY>20)}
    function openMenu(){if(!sidebar||!overlay)return;sidebar.classList.add('active');overlay.classList.add('active');document.body.style.overflow='hidden';if(menuBtn)menuBtn.setAttribute('aria-expanded','true')}
    function closeMenu(){if(!sidebar||!overlay)return;sidebar.classList.remove('active');overlay.classList.remove('active');document.body.style.overflow='';if(menuBtn)menuBtn.setAttribute('aria-expanded','false')}
    setHeader();window.addEventListener('scroll',setHeader,{passive:true});
    if(menuBtn){menuBtn.setAttribute('aria-expanded','false');menuBtn.addEventListener('click',openMenu)}
    if(closeBtn)closeBtn.addEventListener('click',closeMenu);
    if(overlay)overlay.addEventListener('click',closeMenu);
    document.querySelectorAll('.sidebar-nav a').forEach(function(a){a.addEventListener('click',closeMenu)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
    var reveal=document.querySelectorAll('.reveal-up');
    if('IntersectionObserver' in window){var obs=new IntersectionObserver(function(entries,o){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('active');o.unobserve(entry.target)}})},{threshold:.14,rootMargin:'0px 0px -40px 0px'});reveal.forEach(function(el){obs.observe(el)})}else{reveal.forEach(function(el){el.classList.add('active')})}
    document.addEventListener('click',function(e){var link=e.target.closest('a[href]');if(!link||typeof window.gtag!=='function')return;var href=link.getAttribute('href')||'';if(href.indexOf('tel:')===0){window.gtag('event','tawod_call_click',{event_category:'qualified_lead',event_label:document.title,page_path:window.location.pathname,transport_type:'beacon'})}if(href.indexOf('wa.me/')!==-1){window.gtag('event','tawod_whatsapp_click',{event_category:'qualified_lead',event_label:document.title,page_path:window.location.pathname,transport_type:'beacon'})}});
  });
})();
