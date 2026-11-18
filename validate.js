/**
 * HireFlow Form Validation Engine
 * Provides live, accessible validation with ARIA compliance
 */

export const rules = {
  required(val, message = 'This field is required') {
    if (val === null || val === undefined) return message;
    if (typeof val === 'string' && val.trim() === '') return message;
    if (Array.isArray(val) && val.length === 0) return message;
    if (typeof val === 'boolean' && !val) return message;
    return null;
  },

  email(val, message = 'Please enter a valid email address') {
    if (!val) return null; // let 'required' rule handle emptiness
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(String(val).trim()) ? null : message;
  },

  phone(val, message = 'Please enter a valid phone number (e.g. +1 555-0199)') {
    if (!val) return null;
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
    return phoneRegex.test(String(val).trim()) ? null : message;
  },

  url(val, message = 'Please enter a valid URL (http:// or https://)') {
    if (!val) return null;
    try {
      const parsed = new URL(val);
      return ['http:', 'https:'].includes(parsed.protocol) ? null : message;
    } catch {
      return message;
    }
  },

  minLength(length, message) {
    return (val) => {
      if (!val) return null;
      const str = String(val).trim();
      return str.length >= length ? null : (message || `Must be at least ${length} characters`);
    };
  },

  maxLength(length, message) {
    return (val) => {
      if (!val) return null;
      const str = String(val).trim();
      return str.length <= length ? null : (message || `Cannot exceed ${length} characters`);
    };
  },

  numericRange(min, max, message) {
    return (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      if (isNaN(num)) return 'Must be a valid number';
      if (min !== undefined && num < min) return message || `Must be at least ${min}`;
      if (max !== undefined && num > max) return message || `Cannot exceed ${max}`;
      return null;
    };
  },

  dateInFuture(message = 'Date must be in the future') {
    return (val) => {
      if (!val) return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.getTime() > Date.now() ? null : message;
    };
  },

  matches(otherValueGetter, fieldName = 'matching field') {
    return (val) => {
      const other = otherValueGetter();
      return val === other ? null : `Does not match ${fieldName}`;
    };
  },

  fileValidation(allowedTypes = ['application/pdf', '.pdf', '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], maxSizeBytes = 2097152) {
    return (file) => {
      if (!file) return null;
      
      // Size check
      if (file.size > maxSizeBytes) {
        const mb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
        return `File size cannot exceed ${mb} MB`;
      }

      // Extension / MIME check
      const fileName = file.name.toLowerCase();
      const hasValidExt = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
      const hasValidMime = file.type === 'application/pdf' || 
                           file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                           file.type === ''; // Some browsers return empty MIME for docx

      if (!hasValidExt && !hasValidMime) {
        return 'Only PDF and DOCX files are accepted';
      }

      return null;
    };
  }
};

/**
 * Validate a form data object against rule definitions
 * @param {Object} data 
 * @param {Object} schema 
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validate(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, fieldRules] of Object.entries(schema)) {
    const val = data[field];
    for (const rule of fieldRules) {
      const errorMsg = rule(val);
      if (errorMsg) {
        errors[field] = errorMsg;
        isValid = false;
        break; // stop on first error for this field
      }
    }
  }

  return { isValid, errors };
}

/**
 * Attach live accessibility validation to a form
 * @param {HTMLFormElement} form 
 * @param {Object} schema 
 * @param {Function} onSubmitSuccess 
 */
export function setupFormValidation(form, schema, onSubmitSuccess) {
  if (!form) return;

  function setFieldError(fieldInput, errorMsg) {
    const group = fieldInput.closest('.form-group') || fieldInput.parentElement;
    if (!group) return;

    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      errorEl.id = `${fieldInput.id || fieldInput.name}-error`;
      group.appendChild(errorEl);
    }

    if (errorMsg) {
      group.classList.add('has-error');
      errorEl.textContent = errorMsg;
      errorEl.setAttribute('role', 'alert');
      fieldInput.setAttribute('aria-invalid', 'true');
      fieldInput.setAttribute('aria-describedby', errorEl.id);
    } else {
      group.classList.remove('has-error');
      errorEl.textContent = '';
      fieldInput.removeAttribute('aria-invalid');
      fieldInput.removeAttribute('aria-describedby');
    }
  }

  // Validate on blur for fields in schema
  for (const fieldName of Object.keys(schema)) {
    const input = form.elements[fieldName];
    if (input) {
      input.addEventListener('blur', () => {
        const val = input.type === 'checkbox' ? input.checked : (input.type === 'file' ? input.files[0] : input.value);
        let errorMsg = null;
        for (const rule of schema[fieldName]) {
          errorMsg = rule(val);
          if (errorMsg) break;
        }
        setFieldError(input, errorMsg);
      });

      // Clear error on input
      input.addEventListener('input', () => {
        if (input.closest('.form-group')?.classList.contains('has-error')) {
          setFieldError(input, null);
        }
      });
    }
  }

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {};
    for (const [key] of Object.entries(schema)) {
      const el = form.elements[key];
      if (el) {
        if (el.type === 'checkbox') {
          data[key] = el.checked;
        } else if (el.type === 'file') {
          data[key] = el.files[0] || null;
        } else {
          data[key] = el.value;
        }
      }
    }

    const { isValid, errors } = validate(data, schema);

    // Apply errors or clear
    let firstInvalidInput = null;
    for (const fieldName of Object.keys(schema)) {
      const input = form.elements[fieldName];
      if (input) {
        const errorMsg = errors[fieldName] || null;
        setFieldError(input, errorMsg);
        if (errorMsg && !firstInvalidInput) {
          firstInvalidInput = input;
        }
      }
    }

    if (!isValid) {
      if (firstInvalidInput) {
        firstInvalidInput.focus();
      }
      return;
    }

    if (onSubmitSuccess) {
      onSubmitSuccess(data, form);
    }
  });
}
