const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const progress = document.querySelector(".scroll-progress");
const revealItems = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll(".main-nav a");
const sections = [...document.querySelectorAll("main section[id]")];

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const updateProgress = () => {
  if (!progress) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progress.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
};

const updateActiveNav = () => {
  const current = sections
    .filter((section) => section.getBoundingClientRect().top <= 130)
    .at(-1);

  navLinks.forEach((link) => {
    const isActive = Boolean(current && link.getAttribute("href") === `#${current.id}`);
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0, rootMargin: "0px 0px -60px 0px" }
);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
revealItems.forEach((item, index) => {
  if (!prefersReduced) {
    const delay = Math.min(index * 70, 260);
    item.style.transitionDelay = `${delay}ms`;
  }
  observer.observe(item);
});

window.addEventListener("scroll", () => {
  updateProgress();
  updateActiveNav();
}, { passive: true });

updateProgress();
updateActiveNav();

// Orbital card tilt interaction (desktop only, respects reduced-motion)
const orbital = document.querySelector('.orbital-card.primary-profile');
if (orbital && !prefersReduced && !('ontouchstart' in window)) {
  orbital.addEventListener('mousemove', (e) => {
    const rect = orbital.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * 6; // rotateX small
    const ry = (x - 0.5) * -8; // rotateY small
    orbital.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  orbital.addEventListener('mouseleave', () => {
    orbital.style.transform = '';
  });
}

// Skill meter animation on scroll
const skillMeters = document.querySelectorAll('.skill-meter');
if (skillMeters.length && !prefersReduced) {
  const skillsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('meter-animate');
        skillsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  skillMeters.forEach((m) => skillsObserver.observe(m));
}

// Contact form: build mailto link and show toast
const contactForm = document.getElementById('contact-form');
const toast = document.getElementById('toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => (toast.hidden = true), 220);
  }, 3000);
}

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.elements.namedItem('name')?.value.trim() || '';
    const email = form.elements.namedItem('email')?.value.trim() || '';
    const message = form.elements.namedItem('message')?.value.trim() || '';

    if (!name || !email || !message) { showToast('Please complete the form'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email address'); return; }

    showToast('Sending your message…');

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Request failed');
      form.reset();
      showToast('Message sent successfully');
    } catch (error) {
      console.error('Contact form error:', error);
      showToast(error instanceof Error ? error.message : 'Unable to send message right now');
    }
  });

  const copyBtn = document.getElementById('copy-email');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText('skadakash@gmail.com').then(() => showToast('Email copied to clipboard'));
  });
}

// Publication expand/collapse
const pubToggles = document.querySelectorAll('.pub-toggle');
pubToggles.forEach((btn, idx) => {
  btn.addEventListener('click', (e) => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const targetId = btn.getAttribute('aria-controls');
    const target = document.getElementById(targetId);
    if (!target) return;
    if (expanded) {
      btn.setAttribute('aria-expanded', 'false');
      target.classList.remove('open');
      target.hidden = true;
      // allow transition to finish
      setTimeout(() => { target.style.maxHeight = null; }, 360);
      btn.textContent = 'Read abstract';
    } else {
      btn.setAttribute('aria-expanded', 'true');
      target.hidden = false;
      // measure height
      requestAnimationFrame(() => {
        const h = target.scrollHeight + 20;
        target.style.maxHeight = h + 'px';
        target.classList.add('open');
      });
      btn.textContent = 'Hide abstract';
    }
  });
});

// Collapse/expand experience timeline to reduce initial scroll
const expToggle = document.getElementById('toggle-experience');
const expTimeline = document.querySelector('.experience-timeline');
if (expToggle && expTimeline) {
  expToggle.addEventListener('click', () => {
    const expanded = expTimeline.classList.toggle('expanded');
    expToggle.setAttribute('aria-expanded', String(expanded));
    expToggle.textContent = expanded ? 'Show less' : 'Show more experience';
    // smooth scroll to keep context when collapsing
    if (!expanded) expTimeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

