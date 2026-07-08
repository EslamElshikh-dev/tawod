/* Shared inner pages interactions for Tawod */
(function(){
  'use strict';
  function ready(cb){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',cb):cb();}
  ready(function(){
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