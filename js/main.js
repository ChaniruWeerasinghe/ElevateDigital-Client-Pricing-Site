/* ============================================
   BILLING STRUCTURE - MAIN SCRIPT
   Currency toggle, scroll animations, nav
   ============================================ */

(function () {
  'use strict';

  // ---------- DOM Elements ----------
  const nav = document.getElementById('main-nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const currencyToggle = document.getElementById('currency-toggle');
  const labelUsd = document.getElementById('label-usd');
  const labelLkr = document.getElementById('label-lkr');

  let isLkr = false;

  // ---------- Mobile Nav Toggle ----------
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });

    // Close mobile nav when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  // ---------- Nav scroll shadow ----------
  function handleNavScroll() {
    if (!nav) return;
    if (window.scrollY > 10) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleNavScroll);
  handleNavScroll();

  // ---------- Active Nav Link Highlighting ----------
  function updateActiveLink() {
    var sections = document.querySelectorAll('section[id]');
    var links = document.querySelectorAll('.nav-links a');
    var scrollPos = window.scrollY + 100;

    var currentSection = '';
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        currentSection = section.getAttribute('id');
      }
    });

    links.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentSection) {
        link.classList.add('active');
      }
    });
  }
  window.addEventListener('scroll', updateActiveLink);
  updateActiveLink();

  // ---------- Currency Toggle ----------
  if (currencyToggle) {
    currencyToggle.addEventListener('click', function () {
      isLkr = !isLkr;
      currencyToggle.classList.toggle('lkr', isLkr);

      if (labelUsd && labelLkr) {
        labelUsd.classList.toggle('active', !isLkr);
        labelLkr.classList.toggle('active', isLkr);
      }

      // Toggle USD/LKR price visibility in package cards
      document.querySelectorAll('.usd-price').forEach(function (el) {
        el.style.display = isLkr ? 'none' : '';
      });
      document.querySelectorAll('.lkr-price').forEach(function (el) {
        el.style.display = isLkr ? '' : 'none';
      });

      // Toggle table columns
      document.querySelectorAll('.usd-col').forEach(function (el) {
        el.style.display = isLkr ? 'none' : '';
      });
      document.querySelectorAll('.lkr-col').forEach(function (el) {
        el.style.display = isLkr ? '' : 'none';
      });
    });
  }

  // Initialize: show USD, hide LKR columns in add-on tables
  document.querySelectorAll('.lkr-col').forEach(function (el) {
    el.style.display = 'none';
  });

  // ---------- Scroll Fade-In Animations ----------
  function initScrollAnimations() {
    var fadeElements = document.querySelectorAll('.fade-in');

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      fadeElements.forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback: show everything
      fadeElements.forEach(function (el) {
        el.classList.add('visible');
      });
    }
  }
  initScrollAnimations();

})();
