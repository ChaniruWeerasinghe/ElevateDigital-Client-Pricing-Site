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

  // ========== MODAL & FORM LOGIC ==========
  const modal = document.getElementById('plan-modal');
  const modalClose = document.getElementById('modal-close');
  const planButtons = document.querySelectorAll('.select-plan-btn');
  const selectedPlanText = document.getElementById('modal-selected-plan');
  const packageNameInput = document.getElementById('form-package-name');

  // Custom Select Elements handled generically below

  // Form Elements
  const planForm = document.getElementById('plan-form');
  const inputName = document.getElementById('form-name');
  const inputEmail = document.getElementById('form-email');
  const inputPhone = document.getElementById('form-phone');

  // Validation Messages
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const phoneError = document.getElementById('phone-error');

  // Coupon Elements
  const inputCoupon = document.getElementById('form-coupon');
  const btnApplyCoupon = document.getElementById('apply-coupon-btn');
  const couponMsg = document.getElementById('coupon-msg');
  const couponDiscountRow = document.getElementById('coupon-discount-row');
  const couponDiscountAmt = document.getElementById('coupon-discount-amt');
  const totalDiscountDisplay = document.getElementById('total-discount-display');

  let currentBillingDiscount = 10; // percentage
  let currentCouponDiscount = 0; // percentage

  const planTypeInput = document.getElementById('form-plan-type');
  const modalHeaderTitle = document.querySelector('.modal-header h2');
  const maintenanceTierGroup = document.getElementById('maintenance-tier-group');
  const couponGroup = document.getElementById('coupon-group');

  // --- Modal Open/Close ---
  if (modal) {
    planButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const planName = btn.getAttribute('data-plan');
        const planType = btn.getAttribute('data-type') || 'package';

        selectedPlanText.textContent = planName;
        packageNameInput.value = planName;
        if (planTypeInput) planTypeInput.value = planType;

        const submitBtn = document.getElementById('submit-plan-btn');
        const paypalContainer = document.getElementById('paypal-button-container');

        if (planType === 'maintenance') {
          modalHeaderTitle.textContent = "Request Maintenance";
          maintenanceTierGroup.style.display = 'none';
          if (submitBtn) submitBtn.style.display = 'none';
          if (paypalContainer) paypalContainer.style.display = 'block';
          if (couponGroup) couponGroup.style.display = 'none';

          // Clear any applied coupons if switching to maintenance
          currentCouponDiscount = 0;
          inputCoupon.value = '';
          couponDiscountRow.style.display = 'none';
          updateTotalDiscount();
        } else {
          modalHeaderTitle.textContent = "Complete Your Request";
          maintenanceTierGroup.style.display = 'block';
          if (submitBtn) submitBtn.style.display = 'block';
          if (paypalContainer) paypalContainer.style.display = 'none';
          if (couponGroup) couponGroup.style.display = 'block';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
      });
    });

    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close on clicking outside the modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // --- Custom Dropdown Logic ---
  const allSelectWrappers = document.querySelectorAll('.custom-select-wrapper');

  allSelectWrappers.forEach(wrapper => {
    const customSelect = wrapper.querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const options = wrapper.querySelectorAll('.custom-option');
    const hiddenInput = wrapper.nextElementSibling;

    trigger.addEventListener('click', function () {
      customSelect.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', function () {
        options.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');

        const value = this.getAttribute('data-value');
        trigger.textContent = this.textContent;
        if (hiddenInput && hiddenInput.tagName === 'INPUT') {
          hiddenInput.value = value;
        }

        if (hiddenInput && hiddenInput.id === 'form-billing-cycle') {
          if (value === 'monthly') currentBillingDiscount = 0;
          else if (value === 'semi-annual') currentBillingDiscount = 5;
          else if (value === 'annual') currentBillingDiscount = 10;
          updateTotalDiscount();
        }

        customSelect.classList.remove('open');
      });
    });

    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        customSelect.classList.remove('open');
      }
    });
  });

  // --- Real-time Validation ---

  // 1. Name Validation (No numbers allowed)
  inputName.addEventListener('input', function () {
    const value = this.value;
    const hasNumbers = /\d/.test(value);
    if (hasNumbers) {
      this.classList.add('error');
      this.classList.remove('success');
      nameError.textContent = "Names cannot contain numbers.";
      nameError.className = "validation-msg error";
    } else if (value.trim().length > 0) {
      this.classList.remove('error');
      this.classList.add('success');
      nameError.textContent = "";
    } else {
      this.classList.remove('error', 'success');
      nameError.textContent = "";
    }
  });

  // 2. Email Validation
  inputEmail.addEventListener('input', function () {
    const value = this.value;
    // Standard email regex
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (value.length > 0 && !isValidEmail) {
      this.classList.add('error');
      this.classList.remove('success');
      emailError.textContent = "Please enter a valid email address.";
      emailError.className = "validation-msg error";
    } else if (isValidEmail) {
      this.classList.remove('error');
      this.classList.add('success');
      emailError.textContent = "";
    } else {
      this.classList.remove('error', 'success');
      emailError.textContent = "";
    }
  });

  // 3. Phone Validation (Sri Lankan + Foreign)
  inputPhone.addEventListener('input', function () {
    const value = this.value.trim();
    // Match Sri Lankan: 0771234567, 771234567, +94771234567
    // Match Foreign: general international format (starts with + and 10-15 digits)
    const isLankan = /^(0\d{9}|\d{9}|\+94\d{9})$/.test(value);
    const isForeign = /^\+\d{10,15}$/.test(value);

    if (value.length > 0 && !isLankan && !isForeign) {
      this.classList.add('error');
      this.classList.remove('success');
      phoneError.textContent = "Invalid phone number format.";
      phoneError.className = "validation-msg error";
    } else if (isLankan || isForeign) {
      this.classList.remove('error');
      this.classList.add('success');
      phoneError.textContent = "";
    } else {
      this.classList.remove('error', 'success');
      phoneError.textContent = "";
    }
  });

  // --- Coupon Logic ---
  // Hardcoded frontend mock coupons (will be verified securely on backend)
  const MOCK_COUPONS = {
    'FAMILY20': 20,
    'ELEVATE10': 10,
    'START50': 50
  };

  btnApplyCoupon.addEventListener('click', () => {
    const code = inputCoupon.value.trim().toUpperCase();
    if (!code) return;

    if (MOCK_COUPONS[code]) {
      currentCouponDiscount = MOCK_COUPONS[code];
      inputCoupon.classList.add('success');
      inputCoupon.classList.remove('error');
      couponMsg.textContent = "Coupon applied successfully!";
      couponMsg.className = "validation-msg success";

      couponDiscountRow.style.display = 'flex';
      couponDiscountAmt.textContent = `-${currentCouponDiscount}%`;
    } else {
      currentCouponDiscount = 0;
      inputCoupon.classList.add('error');
      inputCoupon.classList.remove('success');
      couponMsg.textContent = "Invalid or expired coupon code.";
      couponMsg.className = "validation-msg error";

      couponDiscountRow.style.display = 'none';
    }
    updateTotalDiscount();
  });

  // Automatically reset coupon if input is cleared
  inputCoupon.addEventListener('input', function () {
    if (this.value.trim() === '') {
      currentCouponDiscount = 0;
      this.classList.remove('error', 'success');
      couponMsg.textContent = "";
      couponDiscountRow.style.display = 'none';
      updateTotalDiscount();
    }
  });

  function updateTotalDiscount() {
    const total = currentBillingDiscount + currentCouponDiscount;
    // Cap total discount at a reasonable amount (e.g. 100%)
    const finalTotal = Math.min(total, 100);
    totalDiscountDisplay.textContent = `${finalTotal}%`;

    if (finalTotal > 0) {
      totalDiscountDisplay.classList.add('cell-success');
    } else {
      totalDiscountDisplay.classList.remove('cell-success');
    }
  }

  // --- Form Submission ---
  if (planForm) {
    planForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Force check validations before submitting
      if (inputName.classList.contains('error') ||
        inputEmail.classList.contains('error') ||
        inputPhone.classList.contains('error')) {
        // Using a professional custom UI notification, NOT alert()
        showToast("Please fix the errors in the form before submitting.", "error");
        return;
      }

      const submitBtn = document.getElementById('submit-plan-btn');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';
      submitBtn.disabled = true;

      const formData = {
        name: inputName.value.trim(),
        email: inputEmail.value.trim(),
        phone: inputPhone.value.trim(),
        packageName: packageNameInput.value,
        planType: document.getElementById('form-plan-type').value,
        maintenanceTier: document.getElementById('form-maintenance-tier').value,
        billingCycle: hiddenBillingInput.value,
        couponCode: inputCoupon.value.trim().toUpperCase()
      };

      try {
        const response = await fetch('/api/submit-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
          showToast("Request submitted successfully! We'll be in touch soon.", "success");
          planForm.reset();
          modal.classList.remove('active');
          document.body.style.overflow = '';
        } else {
          showToast(data.message || "Something went wrong. Please try again.", "error");
        }
      } catch (error) {
        showToast("Network error. Could not connect to the server.", "error");
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- Custom Toast Notification ---
  function showToast(message, type = "success") {
    // Remove existing toast if any
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = '#fff';
    toast.style.padding = '1rem 2rem';
    toast.style.borderRadius = '50px';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.95rem';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    toast.innerHTML = `<i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'}"></i> ${message}`;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    // Animate out after 4 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // --- PayPal Integration ---
  if (window.paypal) {
    paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'blue',
        layout: 'vertical',
        label: 'subscribe'
      },
      onClick: function (data, actions) {
        // Validate form
        if (!inputName.value.trim() || !inputEmail.value.trim() || !inputPhone.value.trim()) {
          showToast("Please fill out your Name, Email, and Phone number before paying.", "error");
          return actions.reject();
        }
        if (inputName.classList.contains('error') || inputEmail.classList.contains('error') || inputPhone.classList.contains('error')) {
          showToast("Please fix the errors in the form before paying.", "error");
          return actions.reject();
        }
        return actions.resolve();
      },
      createSubscription: function (data, actions) {
        // Map our maintenance plans to PayPal Plan IDs (Mock for now)
        const PAYPAL_PLAN_IDS = {
          'Basic Maintenance': 'P-17L9664822907571WNIXE7ZY',   // Mapped to Sandbox Basic Plan (US)
          'Standard Maintenance': 'P-636242488V168893YNIXFABA', // Mapped to Sandbox Standard Plan (US)
          'Pro Maintenance': 'P-202571332F6194926NIXFAGY'        // Mapped to Sandbox Pro Plan (US)
        };
        const selectedPlan = packageNameInput.value;
        const planId = PAYPAL_PLAN_IDS[selectedPlan] || 'P-DEFAULT_MOCK_ID';
        console.log("DEBUG: selectedPlan =", selectedPlan);
        console.log("DEBUG: planId =", planId);

        return actions.subscription.create({
          'plan_id': planId
        });
      },
      onApprove: async function (data, actions) {
        const formData = {
          name: inputName.value.trim(),
          email: inputEmail.value.trim(),
          phone: inputPhone.value.trim(),
          packageName: packageNameInput.value,
          planType: 'maintenance',
          maintenanceTier: 'none',
          billingCycle: hiddenBillingInput.value,
          couponCode: inputCoupon.value.trim().toUpperCase(),
          paypalSubscriptionId: data.subscriptionID
        };

        try {
          const response = await fetch('/api/submit-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          const resData = await response.json();
          if (response.ok) {
            showToast("Payment Successful! Your maintenance plan is active.", "success");
            planForm.reset();
            modal.classList.remove('active');
            document.body.style.overflow = '';
          } else {
            showToast(resData.message || "Something went wrong.", "error");
          }
        } catch (error) {
          showToast("Network error.", "error");
        }
      }
    }).render('#paypal-button-container');
  }
})();
