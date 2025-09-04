// Richard Fitness - Modern JavaScript with Theme Switching

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initializeTheme();
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navRight = document.querySelector('.nav-right');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navRight.contains(e.target) && navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Enhanced header effects on scroll
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove scrolled class
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Hide/show header on scroll
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });

    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            // Basic validation
            if (!data.name || !data.email || !data.message || !data.interest) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }

            if (!isValidEmail(data.email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }

            // Simulate form submission
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;

            // Simulate API call
            setTimeout(() => {
                showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
                contactForm.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 2000);
        });
    }

    // Membership Plan Selection
    document.querySelectorAll('.plan button').forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.closest('.plan');
            const planName = plan.querySelector('h3').textContent;
            const planPrice = plan.querySelector('.amount').textContent;
            
            showMembershipModal(planName, planPrice);
        });
    });

    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
            }
        });
    }, observerOptions);

    // Add loading class to elements and observe them
    document.querySelectorAll('.service-card, .trainer-card, .feature, .plan, .contact-item').forEach(el => {
        el.classList.add('loading');
        observer.observe(el);
    });

    // Counter animation for stats
    animateCounters();
});

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 350px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Membership modal
function showMembershipModal(planName, planPrice) {
    // Remove existing modal
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Join ${planName} Plan</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>You've selected the <strong>${planName}</strong> plan for <strong>$${planPrice}/month</strong>.</p>
                <form class="membership-form">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" placeholder="First Name" required>
                        </div>
                        <div class="form-group">
                            <input type="text" placeholder="Last Name" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="email" placeholder="Email Address" required>
                    </div>
                    <div class="form-group">
                        <input type="tel" placeholder="Phone Number" required>
                    </div>
                    <div class="form-group">
                        <select required>
                            <option value="">Preferred Contact Method</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="text">Text Message</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <textarea placeholder="Any questions or special requests?" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Get Started</button>
                </form>
            </div>
        </div>
        <div class="modal-backdrop"></div>
    `;

    // Add styles
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        z-index: 2;
        animation: modalSlideIn 0.3s ease;
    `;

    const modalBackdrop = modal.querySelector('.modal-backdrop');
    modalBackdrop.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
    `;

    // Add animation keyframes
    if (!document.querySelector('#modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
            @keyframes modalSlideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .modal-header {
                padding: 2rem 2rem 1rem;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 2rem;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .modal-body {
                padding: 1rem 2rem 2rem;
            }
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            @media (max-width: 480px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Close modal functionality
    const closeModal = () => {
        modal.style.opacity = '0';
        modalContent.style.transform = 'translateY(-50px)';
        setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    // Form submission
    const form = modal.querySelector('.membership-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        closeModal();
        showNotification('Thank you! We\'ll contact you soon to complete your membership.', 'success');
    });

    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Counter animation for hero stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat h3');
    const speed = 200; // The lower the slower

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const targetNumber = parseInt(target.textContent.replace(/\D/g, ''));
                const increment = targetNumber / speed;
                const suffix = target.textContent.replace(/[0-9]/g, '');
                
                let current = 0;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= targetNumber) {
                        target.textContent = targetNumber + suffix;
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(current) + suffix;
                    }
                }, 1);
                
                observer.unobserve(target);
            }
        });
    });

    counters.forEach(counter => observer.observe(counter));
}

// Add CSS for mobile hamburger animation
const hamburgerStyles = `
.hamburger.active .bar:nth-child(2) {
    opacity: 0;
}
.hamburger.active .bar:nth-child(1) {
    transform: translateY(8px) rotate(45deg);
}
.hamburger.active .bar:nth-child(3) {
    transform: translateY(-8px) rotate(-45deg);
}
`;

// Create and append style element
const style = document.createElement('style');
style.textContent = hamburgerStyles;
document.head.appendChild(style);

// Theme Management Functions
function initializeTheme() {
    // Check for saved theme in localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Set theme on document element
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update theme toggle button
    updateThemeToggle(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Update theme
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Update toggle button
    updateThemeToggle(newTheme);
    
    // Add transition class for smooth theme change
    document.documentElement.classList.add('theme-transition');
    setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
    }, 300);
}

function updateThemeToggle(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        themeToggle.setAttribute('aria-label', 
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
}

// Enhanced scroll effects
function initializeScrollEffects() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentSection = entry.target.getAttribute('id');
                
                // Update active navigation link
                navLinks.forEach(link => {
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

// Initialize scroll effects after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollEffects();
});

// Parallax effect for hero section (optional)
function initializeParallax() {
    const hero = document.querySelector('.hero');
    
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            if (scrolled < window.innerHeight) {
                hero.style.transform = `translateY(${rate}px)`;
            }
        }, { passive: true });
    }
}

// Add smooth theme transition styles
const themeTransitionStyles = `
.theme-transition,
.theme-transition *,
.theme-transition *:before,
.theme-transition *:after {
    transition: all 300ms !important;
    transition-delay: 0 !important;
}

.nav-link.active {
    color: var(--accent-primary) !important;
}

.nav-link.active::after {
    width: 100% !important;
}

.header.scrolled {
    background: var(--bg-primary) !important;
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
}

body.menu-open {
    overflow: hidden;
}

@media (max-width: 768px) {
    .nav-menu {
        background: var(--bg-primary) !important;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        margin: var(--space-sm);
        width: calc(100% - var(--space-lg));
        box-shadow: var(--shadow-xl);
    }
    
    .nav-menu.active {
        left: 0;
    }
}
`;

// Add the theme transition styles
const themeStyle = document.createElement('style');
themeStyle.textContent = themeTransitionStyles;
document.head.appendChild(themeStyle);
