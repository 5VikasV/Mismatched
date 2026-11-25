// Real authentication is future work.
// This is a demo sign-in flow: it validates fields client-side, keeps a local list of created
// accounts on this device (name and email only), and stores the active session (name and email only)
// in localStorage. Passwords are never stored.

const SESSION_KEY = 'scraploop_demo_session';
const ACCOUNTS_KEY = 'scraploop_demo_accounts';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeUser(value) {
  if (!value || typeof value !== 'object') return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const email = normalizeEmail(value.email);
  if (!name || !email) return null;
  return { name, email };
}

function readAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeUser).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAccount(user) {
  const clean = sanitizeUser(user);
  if (!clean) return;
  try {
    const accounts = readAccounts().filter(item => item.email !== clean.email);
    accounts.push(clean);
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota / privacy mode errors in demo preview.
  }
}

function findAccountByEmail(email) {
  const target = normalizeEmail(email);
  if (!target) return null;
  return readAccounts().find(item => item.email === target) || null;
}

function saveSession(user) {
  const clean = sanitizeUser(user);
  if (!clean) return;
  try {
    // Only name and email are ever stored; never store passwords.
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ name: clean.name, email: clean.email }));
  } catch {
    // Ignore storage quota / privacy mode errors in demo preview.
  }
}

function prefersReducedMotion() {
  try {
    return Boolean(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

function submitDelayMs() {
  return prefersReducedMotion() ? 0 : 180;
}

function navigate(url) {
  if (typeof window.__navigate === 'function') {
    window.__navigate(url);
    return;
  }
  window.location.assign(url);
}

function setFieldError(field, message) {
  if (!field.input || !field.error) return;
  if (message) {
    field.error.textContent = message;
    field.error.hidden = false;
    field.input.setAttribute('aria-invalid', 'true');
  } else {
    field.error.textContent = '';
    field.error.hidden = true;
    field.input.removeAttribute('aria-invalid');
  }
}

function setFormError(element, message) {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.hidden = false;
  } else {
    element.textContent = '';
    element.hidden = true;
  }
}

function setButtonLoading(button, loading) {
  if (!button) return;
  const labelEl = button.querySelector('.auth-submit-label') || button;
  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = labelEl.textContent.trim();
  }
  if (loading) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-loading');
    labelEl.textContent = button.dataset.loadingLabel || 'Please wait…';
  } else {
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    button.classList.remove('is-loading');
    labelEl.textContent = button.dataset.idleLabel;
  }
}

function setupPasswordToggles() {
  const buttons = document.querySelectorAll('[data-password-toggle]');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.passwordToggle;
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.textContent = show ? 'Hide' : 'Show';
      const showLabel = button.dataset.showLabel || 'Show password';
      const hideLabel = button.dataset.hideLabel || 'Hide password';
      button.setAttribute('aria-label', show ? hideLabel : showLabel);
    });
  });
}

function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address (for example, name@company.in).';
  return '';
}

function initSignupForm() {
  const form = document.querySelector('#signup-form');
  if (!form) return;

  const nameInput = document.querySelector('#signup-name');
  const emailInput = document.querySelector('#signup-email');
  const passwordInput = document.querySelector('#signup-password');
  const confirmInput = document.querySelector('#signup-confirm');
  const submitButton = document.querySelector('#signup-submit');

  const fields = [
    {
      input: nameInput,
      error: document.querySelector('#signup-name-error'),
      validate(value) {
        const trimmed = value.trim();
        if (!trimmed) return 'Enter your full name.';
        if (trimmed.length < 2) return 'Name must be at least 2 characters.';
        return '';
      },
    },
    {
      input: emailInput,
      error: document.querySelector('#signup-email-error'),
      validate: validateEmail,
    },
    {
      input: passwordInput,
      error: document.querySelector('#signup-password-error'),
      validate(value) {
        if (!value) return 'Create a password.';
        if (value.length < 8) return 'Password must be at least 8 characters.';
        return '';
      },
    },
    {
      input: confirmInput,
      error: document.querySelector('#signup-confirm-error'),
      validate(value) {
        if (!value) return 'Confirm your password.';
        if (value !== (passwordInput ? passwordInput.value : '')) return 'Passwords do not match.';
        return '';
      },
    },
  ];

  fields.forEach(field => {
    if (!field.input) return;
    field.input.addEventListener('input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true') {
        setFieldError(field, field.validate(field.input.value));
      }
      if (field.input === passwordInput && confirmInput && confirmInput.getAttribute('aria-invalid') === 'true') {
        const confirmField = fields[3];
        setFieldError(confirmField, confirmField.validate(confirmInput.value));
      }
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (submitButton && submitButton.disabled) return;

    let firstInvalid = null;
    fields.forEach(field => {
      const message = field.validate(field.input ? field.input.value : '');
      setFieldError(field, message);
      if (message && !firstInvalid) firstInvalid = field.input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const user = {
      name: nameInput.value.trim(),
      email: normalizeEmail(emailInput.value),
    };

    setButtonLoading(submitButton, true);
    writeAccount(user);
    saveSession(user);

    // Real authentication is future work; demo registration navigates to /.
    window.setTimeout(() => {
      navigate('/');
    }, submitDelayMs());
  });
}

function initSigninForm() {
  const form = document.querySelector('#signin-form');
  if (!form) return;

  const emailInput = document.querySelector('#signin-email');
  const passwordInput = document.querySelector('#signin-password');
  const formError = document.querySelector('#signin-form-error');
  const submitButton = document.querySelector('#signin-submit');

  const fields = [
    {
      input: emailInput,
      error: document.querySelector('#signin-email-error'),
      validate: validateEmail,
    },
    {
      input: passwordInput,
      error: document.querySelector('#signin-password-error'),
      validate(value) {
        if (!value) return 'Enter your password.';
        if (value.length < 8) return 'Password must be at least 8 characters.';
        return '';
      },
    },
  ];

  fields.forEach(field => {
    if (!field.input) return;
    field.input.addEventListener('input', () => {
      setFormError(formError, '');
      if (field.input.getAttribute('aria-invalid') === 'true') {
        setFieldError(field, field.validate(field.input.value));
      }
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (submitButton && submitButton.disabled) return;

    setFormError(formError, '');
    let firstInvalid = null;

    fields.forEach(field => {
      const message = field.validate(field.input ? field.input.value : '');
      setFieldError(field, message);
      if (message && !firstInvalid) firstInvalid = field.input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    setButtonLoading(submitButton, true);

    const account = findAccountByEmail(emailInput.value);
    window.setTimeout(() => {
      if (!account) {
        setButtonLoading(submitButton, false);
        setFormError(formError, 'No account found on this device. Create one first.');
        if (emailInput) {
          emailInput.setAttribute('aria-invalid', 'true');
          emailInput.focus();
        }
        return;
      }

      saveSession(account);
      // Real authentication is future work; demo sign-in navigates to /.
      navigate('/');
    }, submitDelayMs());
  });
}

setupPasswordToggles();
initSignupForm();
initSigninForm();
