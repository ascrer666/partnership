let csrfTokenValue = '';
async function getCsrfToken(force = false) {
    if (!force && csrfTokenValue) {
        return csrfTokenValue;
    }

    try {
        const response = await fetch('csrf.php', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to obtain CSRF token');
        }

        const data = await response.json();

        if (data && data.token) {
            csrfTokenValue = data.token;
            const form = document.getElementById('contactForm');
            if (form) {
                let hidden = form.querySelector('input[name="csrf_token"]');
                if (!hidden) {
                    hidden = document.createElement('input');
                    hidden.type = 'hidden';
                    hidden.name = 'csrf_token';
                    form.appendChild(hidden);
                }
                hidden.value = csrfTokenValue;
            }
        }
    } catch (error) {
        console.warn('CSRF token fetch failed:', error);
        csrfTokenValue = '';
    }

    return csrfTokenValue;
}

document.addEventListener('DOMContentLoaded', () => {
    getCsrfToken();
});

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            // Animate hamburger
            hamburger.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        });
    }
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.classList.contains('virtual-tour-btn')) {
            return;
        }

        const selector = this.getAttribute('href');
        const trimmed = selector ? selector.trim() : '';

        if (!trimmed || trimmed === '#' || trimmed.length <= 1) {
            e.preventDefault();
            return;
        }

        let target = null;
        try {
            target = document.querySelector(trimmed);
        } catch (error) {
            console.warn('Smooth scroll: invalid selector', trimmed, error);
            e.preventDefault();
            return;
        }

        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

document.querySelectorAll('.virtual-tour-btn').forEach(btn => {
    btn.addEventListener('click', function (event) {
        event.preventDefault();
        if (typeof openVirtualTour === 'function') {
            openVirtualTour();
        }
    });
});

// Header Background on Scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (!header) return;
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});

// Partnership Form Handler
const contactFormEl = document.getElementById('contactForm');
if (contactFormEl) {
    contactFormEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const btnText   = submitBtn ? submitBtn.querySelector('.btn-text') : null;
        const spinner   = submitBtn ? submitBtn.querySelector('.loading-spinner') : null;

        // Show loading state
        if (btnText)  btnText.style.display = 'none';
        if (spinner)  spinner.style.display = 'block';
        if (submitBtn) submitBtn.disabled = true;
        
        try {
            // Validate on client
            if (!validateForm()) {
                showMessage('Please fill in all required fields.', 'error');
                return;
            }

            // Create FormData for partnership application
            const formData = new FormData(this);
            const csrfToken = await getCsrfToken();
            if (!csrfToken) {
                throw new Error('Missing CSRF token');
            }
            formData.set('csrf_token', csrfToken);
            const response = await fetch('contact.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-Token': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Parse response
            const raw = await response.json();
            const success = typeof raw.ok !== 'undefined' ? !!raw.ok : !!raw.success;
            const message = raw.msg || raw.message || (success ? 
                'Partnership application submitted successfully! We will contact you within 24-48 hours.' : 
                'There was an error submitting your application.');

            if (success) {
                showMessage(message, 'success');
                this.reset();
            } else {
                showMessage(message, 'error');
            }

        } catch (error) {
            console.error('Partnership form submission error:', error);
            showMessage('There was an error submitting your application. Please try again later or contact us directly via WhatsApp.', 'error');
        } finally {
            await getCsrfToken(true);
            // Reset button state
            if (btnText)  btnText.style.display = 'block';
            if (spinner)  spinner.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('form-message');
    if (!messageDiv) {
        alert(message); // yedek davranÄ±ÅŸ
        return;
    }
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animateElements = document.querySelectorAll('.service-card, .benefit, .feature, .gallery-item');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Form validation
function validateForm() {
    const form = document.getElementById('contactForm');
    if (!form) return true;

    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            input.style.borderColor = '#e9ecef';
        }
    });
    
    // Email validation
    const email = form.querySelector('input[type="email"]');
    if (email && email.value && !isValidEmail(email.value)) {
        email.style.borderColor = '#dc3545';
        isValid = false;
    }
    
    // Phone validation
    const phone = form.querySelector('input[type="tel"]');
    if (phone && phone.value && !isValidPhone(phone.value)) {
        phone.style.borderColor = '#dc3545';
        isValid = false;
    }
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

// Real-time form validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = '#dc3545';
            } else if (this.type === 'email' && this.value && !isValidEmail(this.value)) {
                this.style.borderColor = '#dc3545';
            } else if (this.type === 'tel' && this.value && !isValidPhone(this.value)) {
                this.style.borderColor = '#dc3545';
            } else {
                this.style.borderColor = '#e9ecef';
            }
        });
        
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(220, 53, 69)') {
                this.style.borderColor = '#e9ecef';
            }
        });
    });
});

// Performance optimization - Lazy loading for images
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        if (img.dataset && img.dataset.src) {
            img.src = img.dataset.src;
        }
    });
} else {
    // Fallback for browsers that don't support lazy loading
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver';
    document.head.appendChild(script);
}

// Gallery Lightbox
let galleryLightboxModal = null;
let galleryLightboxImage = null;
let galleryLightboxTitle = null;
let galleryLightboxClose = null;
document.addEventListener('DOMContentLoaded', () => {
    galleryLightboxModal = document.getElementById('galleryLightbox');
    galleryLightboxImage = document.getElementById('galleryLightboxImage');
    galleryLightboxTitle = document.getElementById('galleryLightboxTitle');
    galleryLightboxClose = document.getElementById('galleryLightboxClose');

    if (galleryLightboxClose) {
        galleryLightboxClose.addEventListener('click', closeGalleryLightbox);
    }

    if (galleryLightboxModal) {
        galleryLightboxModal.addEventListener('click', (event) => {
            if (event.target === galleryLightboxModal) {
                closeGalleryLightbox();
            }
        });
    }
});

const isVirtualTourVisible = () => {
    const modal = document.getElementById('virtualTourModal');
    return modal && modal.style.display === 'block';
};

const isGalleryLightboxVisible = () => {
    const modal = galleryLightboxModal || document.getElementById('galleryLightbox');
    if (!modal) {
        return false;
    }
    return modal.classList.contains('is-open') || modal.style.display === 'flex';
};

const restoreBodyScroll = () => {
    if (!isVirtualTourVisible() && !isGalleryLightboxVisible()) {
        document.body.style.overflow = '';
    }
};

function openLightbox(imageSrc, title) {
    try {
        galleryLightboxModal = galleryLightboxModal || document.getElementById('galleryLightbox');
        galleryLightboxImage = galleryLightboxImage || document.getElementById('galleryLightboxImage');
        galleryLightboxTitle = galleryLightboxTitle || document.getElementById('galleryLightboxTitle');
        galleryLightboxClose = galleryLightboxClose || document.getElementById('galleryLightboxClose');

        if (!galleryLightboxModal || !galleryLightboxImage || !galleryLightboxTitle) {
            return;
        }

        galleryLightboxImage.src = imageSrc || '';
        galleryLightboxImage.alt = title || 'Gallery image';
        galleryLightboxTitle.textContent = title || '';

        galleryLightboxModal.style.display = 'flex';
        galleryLightboxModal.classList.add('is-open');
        galleryLightboxModal.setAttribute('aria-hidden', 'false');

        document.body.style.overflow = 'hidden';

        if (galleryLightboxClose) {
            try { galleryLightboxClose.focus(); } catch (e) { /* ignore focus errors */ }
        }
    } catch (e) { console && console.warn && console.warn('openLightbox error', e); }
}
window.openLightbox = openLightbox;

function closeGalleryLightbox() {
    try {
        galleryLightboxModal = galleryLightboxModal || document.getElementById('galleryLightbox');
        galleryLightboxImage = galleryLightboxImage || document.getElementById('galleryLightboxImage');
        galleryLightboxTitle = galleryLightboxTitle || document.getElementById('galleryLightboxTitle');

        if (!galleryLightboxModal || !galleryLightboxImage || !galleryLightboxTitle) {
            return;
        }

        galleryLightboxModal.classList.remove('is-open');
        galleryLightboxModal.setAttribute('aria-hidden', 'true');
        galleryLightboxModal.style.display = 'none';

        galleryLightboxImage.src = '';
        galleryLightboxTitle.textContent = '';

        restoreBodyScroll();
    } catch (e) { console && console.warn && console.warn('closeGalleryLightbox error', e); }
}

document.addEventListener('DOMContentLoaded', function() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (!galleryItems.length) return;

    const openGalleryItem = (item) => {
        const img = item.querySelector('img');
        if (!img) return;

        const overlay = item.querySelector('.gallery-overlay h3');
        const fullSrc = img.getAttribute('data-full') || item.getAttribute('data-full');
        const src = fullSrc || img.getAttribute('src') || img.currentSrc || img.src;
        const title = overlay ? overlay.textContent.trim() : '';

        if (src) {
            openLightbox(src, title);
        }
    };

    galleryItems.forEach(item => {
        if (!item.hasAttribute('tabindex')) {
            item.setAttribute('tabindex', '0');
        }

        if (!item.hasAttribute('role')) {
            item.setAttribute('role', 'button');
        }

        item.addEventListener('click', function(event) {
            event.preventDefault();
            openGalleryItem(item);
        });

        item.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar') {
                event.preventDefault();
                openGalleryItem(item);
            }
        });
    });
});

// WhatsApp integration for partnership
function openWhatsApp() {
    const phoneNumber = '+905424647433';
    const message = 'Hello, I would like to learn about the partnership program for international health tourism.';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Add WhatsApp button (optional)
document.addEventListener('DOMContentLoaded', function() {
    // You can uncomment this to add a floating WhatsApp button
    /*
    const whatsappBtn = document.createElement('div');
    whatsappBtn.innerHTML = 'ğŸ’¬';
    whatsappBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: #25D366;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 1000;
        transition: transform 0.3s ease;
    `;
    whatsappBtn.addEventListener('click', openWhatsApp);
    whatsappBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });
    whatsappBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
    document.body.appendChild(whatsappBtn);
    */
});

// Virtual Tour Modal Functions
function openVirtualTour() {
    const modal = document.getElementById('virtualTourModal');
    const iframe = document.getElementById('virtualTourFrame');

    if (!modal || !iframe) return;

    iframe.src = 'https://www.quartzclinique.com/sanaltur/';

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    document.body.style.overflow = 'hidden';
}

function closeVirtualTour() {
    const modal = document.getElementById('virtualTourModal');
    const iframe = document.getElementById('virtualTourFrame');

    if (!modal || !iframe) return;

    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    iframe.src = '';

    restoreBodyScroll();
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const virtualModal = document.getElementById('virtualTourModal');
    if (virtualModal && event.target === virtualModal) {
        closeVirtualTour();
    }

    const lightboxModal = galleryLightboxModal || document.getElementById('galleryLightbox');
    if (lightboxModal && event.target === lightboxModal) {
        closeGalleryLightbox();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') {
        return;
    }

    const lightboxModal = galleryLightboxModal || document.getElementById('galleryLightbox');
    if (lightboxModal && (lightboxModal.classList.contains('is-open') || lightboxModal.style.display === 'flex')) {
        closeGalleryLightbox();
        return;
    }

    const virtualModal = document.getElementById('virtualTourModal');
    if (virtualModal && virtualModal.style.display === 'block') {
        closeVirtualTour();
    }
});




















(function initGalleryNow(){
  try{
    var items = document.querySelectorAll('.gallery-item');
    if(!items || !items.length) return;
    items.forEach(function(item){
      if(!item.getAttribute('tabindex')) item.setAttribute('tabindex','0');
      if(!item.getAttribute('role')) item.setAttribute('role','button');
      var attach = function(ev){ if(ev){ ev.preventDefault(); }
        var img = item.querySelector('img');
        var full = item.getAttribute('data-full') || (img ? img.getAttribute('data-full') : null);
        var src = full || (img ? (img.getAttribute('src') || img.currentSrc || img.src) : null);
        var titleEl = item.querySelector('.gallery-overlay h3');
        var title = titleEl ? titleEl.textContent.trim() : '';
        if(src && typeof openLightbox === 'function'){ openLightbox(src, title); }
      };
      item.addEventListener('click', attach);
      item.addEventListener('keydown', function(e){ if(e.key==='Enter' || e.key===' ' || e.key==='Spacebar'){ attach(e); }});
    });
  }catch(e){ /* no-op */ }
})();
// Delegated gallery click handler to ensure Lightbox always opens
(function ensureGalleryDelegation(){
  try {
    document.addEventListener('click', function(ev){
      var item = ev.target && ev.target.closest ? ev.target.closest('.gallery-item') : null;
      if (!item) return;
      ev.preventDefault();
      var img = item.querySelector('img');
      var full = item.getAttribute('data-full') || (img ? img.getAttribute('data-full') : null);
      var src = full || (img ? (img.getAttribute('src') || img.currentSrc || img.src) : null);
      var titleEl = item.querySelector('.gallery-overlay h3');
      var title = titleEl ? titleEl.textContent.trim() : '';
      if (typeof openLightbox === 'function' && src) {
        openLightbox(src, title);
      }
    }, { capture: false });
  } catch (e) { /* no-op */ }
})();

// Patch 44: Hard-bind lightbox open/close to gallery items (fallback)
(function hardBindLightbox(){
  try {
    var items = document.querySelectorAll('.gallery-item');
    if (!items || !items.length) return;
    var modal = document.getElementById('galleryLightbox');
    var imgEl = document.getElementById('galleryLightboxImage');
    var titleEl = document.getElementById('galleryLightboxTitle');
    var closeEl = document.getElementById('galleryLightboxClose');
    var openFn = function(item, ev){
      if (ev) ev.preventDefault();
      var innerImg = item.querySelector('img');
      var src = item.getAttribute('data-full') || (innerImg ? (innerImg.getAttribute('data-full') || innerImg.getAttribute('src') || innerImg.currentSrc || innerImg.src) : null);
      var ov = item.querySelector('.gallery-overlay h3');
      var title = ov ? (ov.textContent||'').trim() : '';
      if (modal && imgEl && src) {
        imgEl.src = src;
        imgEl.alt = title || 'Gallery image';
        if (titleEl) titleEl.textContent = title || '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden','false');
        document.body.style.overflow = 'hidden';
      }
    };
    items.forEach(function(item){
      item.addEventListener('click', function(ev){ openFn(item, ev); });
      item.addEventListener('keydown', function(ev){ if(ev.key==='Enter' || ev.key===' ' || ev.key==='Spacebar'){ openFn(item, ev); }});
    });
    if (closeEl){ closeEl.addEventListener('click', function(){ if(modal){ modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } }); }
  } catch(e) { /* no-op */ }
})();






























