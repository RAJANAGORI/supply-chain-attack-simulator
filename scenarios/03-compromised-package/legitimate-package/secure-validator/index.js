/**
 * LEGITIMATE PACKAGE: secure-validator v2.5.3
 * Comprehensive input validation and sanitization
 */

class SecureValidator {
  /**
   * Validate email address
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHtml(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize user input
   */
  static validateInput(input, type = 'string') {
    if (!input) return { valid: false, error: 'Input is required' };

    switch (type) {
      case 'email':
        return {
          valid: this.validateEmail(input),
          sanitized: input.trim().toLowerCase()
        };
      
      case 'url':
        return {
          valid: this.validateUrl(input),
          sanitized: input.trim()
        };
      
      case 'html':
        return {
          valid: true,
          sanitized: this.sanitizeHtml(input)
        };
      
      default:
        return {
          valid: typeof input === 'string',
          sanitized: input.trim()
        };
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    return {
      valid: score >= 3,
      score: score,
      strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
      feedback: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }
}

module.exports = SecureValidator;

