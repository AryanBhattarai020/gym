// Richard Fitness - Modern JavaScript with API Integration

// Configuration
const API_BASE_URL = window.location.origin + '/api';

// State management
const state = {
    user: null,
    theme: localStorage.getItem('theme') || 'light',
    isLoading: false
};

// DOM elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    hamburger: document.querySelector('.hamburger'),
    navMenu: document.querySelector('.nav-menu'),
    contactForm: document.getElementById('contactForm'),
    membershipButtons: document.querySelectorAll('.plan button'),
    navLinks: document.querySelectorAll('.nav-link')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeNavigation();
    initializeScrollEffects();
    initializeAnimations();
    initializeForms();
    initializeMembershipButtons();
    checkAuthStatus();
});

// Theme Management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeToggle();
    
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeToggle();
    
    // Add smooth transition
    document.documentElement.classList.add('theme-transition');
    setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
    }, 300);
}

function updateThemeToggle() {
    if (elements.themeToggle) {
        const icon = elements.themeToggle.querySelector('i');
        if (icon) {
            icon.className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        elements.themeToggle.setAttribute('aria-label', 
            state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
}

// Navigation
function initializeNavigation() {
    // Mobile menu toggle
    if (elements.hamburger && elements.navMenu) {
        elements.hamburger.addEventListener('click', toggleMobileMenu);
        
        // Close mobile menu when clicking on links
        elements.navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.hamburger.contains(e.target) && 
                !elements.navMenu.contains(e.target) && 
                elements.navMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    }
    
    // Smooth scrolling for anchor links
    elements.navLinks.forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', handleSmoothScroll);
        }
    });
    
    // Header scroll effects
    initializeHeaderEffects();
}

function toggleMobileMenu() {
    elements.hamburger.classList.toggle('active');
    elements.navMenu.classList.toggle('active');
    document.body.classList.toggle('menu-open');
}

function closeMobileMenu() {
    elements.hamburger.classList.remove('active');
    elements.navMenu.classList.remove('active');
    document.body.classList.remove('menu-open');
}

function handleSmoothScroll(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

function initializeHeaderEffects() {
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    let ticking = false;
    
    function updateHeader() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove scrolled class
        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Hide/show header on scroll (optional)
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
}

// Scroll Effects & Animations
function initializeScrollEffects() {
    // Active section highlighting
    const sections = document.querySelectorAll('section[id]');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentSection = entry.target.getAttribute('id');
                
                // Update active navigation link
                elements.navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${currentSection}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px'
    });
    
    sections.forEach(section => {
        sectionObserver.observe(section);
    });
}

function initializeAnimations() {
    // Intersection Observer for scroll animations
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
                animationObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Add loading class and observe elements
    const animatedElements = document.querySelectorAll(
        '.service-card, .trainer-card, .feature, .plan, .contact-item'
    );
    
    animatedElements.forEach(el => {
        el.classList.add('loading');
        animationObserver.observe(el);
    });
}

// Forms
function initializeForms() {
    if (elements.contactForm) {
        elements.contactForm.addEventListener('submit', handleContactForm);
    }
}

async function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Validate form
    if (!validateContactForm(data)) {
        return;
    }
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: data.name,
                email: data.email,
                phone: data.phone,
                subject: data.interest,
                message: data.message
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
            e.target.reset();
        } else {
            throw new Error(result.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

function validateContactForm(data) {
    const errors = [];
    
    if (!data.name?.trim()) errors.push('Name is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!isValidEmail(data.email)) errors.push('Please enter a valid email');
    if (!data.interest) errors.push('Please select your interest');
    if (!data.message?.trim()) errors.push('Message is required');
    
    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Membership
function initializeMembershipButtons() {
    elements.membershipButtons.forEach(button => {
        button.addEventListener('click', handleMembershipSelection);
    });
}

function handleMembershipSelection(e) {
    const plan = e.target.closest('.plan');
    const planName = plan.querySelector('h3').textContent;
    const planPrice = plan.querySelector('.amount').textContent;
    
    showMembershipModal(planName, planPrice);
}

function showMembershipModal(planName, planPrice) {
    const modal = createModal({
        title: `Join ${planName} Plan`,
        content: `
            <div class="membership-modal-content">
                <p>You've selected the <strong>${planName}</strong> plan for <strong>$${planPrice}/month</strong>.</p>
                <form class="membership-form">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" name="firstName" placeholder="First Name" required>
                        </div>
                        <div class="form-group">
                            <input type="text" name="lastName" placeholder="Last Name" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="email" name="email" placeholder="Email Address" required>
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" placeholder="Phone Number" required>
                    </div>
                    <div class="form-group">
                        <select name="contactMethod" required>
                            <option value="">Preferred Contact Method</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="text">Text Message</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <textarea name="notes" placeholder="Any questions or special requests?" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Get Started</button>
                </form>
            </div>
        `,
        onSubmit: handleMembershipFormSubmit
    });
}

async function handleMembershipFormSubmit(formData, modal) {
    try {
        // In a real app, this would create a membership inquiry
        const response = await fetch(`${API_BASE_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                phone: formData.phone,
                subject: 'membership',
                message: `Interested in membership. Contact method: ${formData.contactMethod}. Notes: ${formData.notes || 'None'}`
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal(modal);
            showNotification('Thank you! We\'ll contact you soon to complete your membership.', 'success');
        } else {
            throw new Error(result.message || 'Failed to submit membership request');
        }
    } catch (error) {
        console.error('Membership form error:', error);
        showNotification('Sorry, there was an error. Please try again.', 'error');
    }
}

// Modal System
function createModal({ title, content, onSubmit }) {
    // Remove existing modal
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" type="button">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.querySelector('#modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-4);
            }
            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }
            .modal-content {
                background: white;
                border-radius: var(--radius-2xl);
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                z-index: 2;
                animation: modalSlideIn 0.3s ease;
                box-shadow: var(--shadow-2xl);
            }
            [data-theme="dark"] .modal-content {
                background: var(--gray-100);
            }
            @keyframes modalSlideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .modal-header {
                padding: var(--space-6) var(--space-6) var(--space-4);
                border-bottom: 1px solid var(--gray-200);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: var(--gray-900);
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--gray-500);
                cursor: pointer;
                padding: var(--space-1);
                border-radius: var(--radius);
                transition: all var(--transition);
            }
            .modal-close:hover {
                background: var(--gray-100);
                color: var(--gray-700);
            }
            .modal-body {
                padding: var(--space-4) var(--space-6) var(--space-6);
            }
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-4);
            }
            @media (max-width: 480px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');
    const form = modal.querySelector('form');
    
    const closeModal = () => {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translateY(-50px)';
        setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    if (form && onSubmit) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(form));
            await onSubmit(formData, modal);
        });
    }
    
    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    return modal;
}

function closeModal(modal) {
    if (modal && modal.parentNode) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translateY(-50px)';
        setTimeout(() => modal.remove(), 300);
    }
}

// Notifications
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--primary-600)'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: var(--space-20);
        right: var(--space-4);
        background: ${colors[type]};
        color: white;
        padding: var(--space-4) var(--space-6);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform var(--transition);
        max-width: 400px;
        font-weight: var(--font-weight-medium);
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close functionality
    const closeBtn = notification.querySelector('.notification-close');
    const closeNotification = () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    };
    
    closeBtn.addEventListener('click', closeNotification);
    
    // Auto remove after 5 seconds
    setTimeout(closeNotification, 5000);
}

// Authentication (placeholder for future implementation)
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                state.user = result.data.user;
                updateUIForAuthenticatedUser();
            } else {
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
        }
    }
}

function updateUIForAuthenticatedUser() {
    // Update UI elements for authenticated user
    // This would be implemented based on your specific needs
    console.log('User authenticated:', state.user);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        showNotification,
        createModal,
        closeModal
    };
}