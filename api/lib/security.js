/**
 * Security Utilities for AutoBrief API
 * Implements: Rate Limiting, Input Validation, Security Headers
 * Following OWASP Best Practices
 */

// ============================================================================
// 1. IN-MEMORY RATE LIMITER (IP-Based)
// ============================================================================
// Note: For production at scale, use Redis or a distributed store.
// This in-memory solution works for Vercel serverless with caveats.

const rateLimitStore = new Map();

/**
 * Simple rate limiter configuration
 */
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000,      // 1 minute window
    maxRequests: 20,          // Max 20 requests per minute per IP
    cleanupIntervalMs: 60000  // Cleanup old entries every minute
};

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > RATE_LIMIT_CONFIG.windowMs * 2) {
            rateLimitStore.delete(key);
        }
    }
}, RATE_LIMIT_CONFIG.cleanupIntervalMs);

/**
 * Get client IP address from request
 * @param {Object} request - HTTP request object
 * @returns {string} Client IP address
 */
export function getClientIP(request) {
    // Vercel/Cloudflare headers take priority
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return request.headers['x-real-ip'] ||
        request.connection?.remoteAddress ||
        request.socket?.remoteAddress ||
        'unknown';
}

/**
 * Check if request should be rate limited
 * @param {Object} request - HTTP request object
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(request) {
    const ip = getClientIP(request);
    const now = Date.now();

    let record = rateLimitStore.get(ip);

    // New visitor or window expired
    if (!record || now - record.windowStart > RATE_LIMIT_CONFIG.windowMs) {
        record = { windowStart: now, count: 0 };
    }

    record.count++;
    rateLimitStore.set(ip, record);

    const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - record.count);
    const resetTime = record.windowStart + RATE_LIMIT_CONFIG.windowMs;

    return {
        allowed: record.count <= RATE_LIMIT_CONFIG.maxRequests,
        remaining,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
    };
}

/**
 * Apply rate limit headers and return 429 if exceeded
 * @param {Object} request - HTTP request
 * @param {Object} response - HTTP response  
 * @returns {boolean} true if request should proceed, false if rate limited
 */
export function applyRateLimit(request, response) {
    const { allowed, remaining, resetTime, retryAfter } = checkRateLimit(request);

    // Always set rate limit headers (OWASP recommendation)
    response.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxRequests);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (!allowed) {
        response.setHeader('Retry-After', retryAfter);
        response.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down.',
            retryAfter: retryAfter
        });
        return false;
    }

    return true;
}


// ============================================================================
// 2. INPUT VALIDATION & SANITIZATION
// ============================================================================

/**
 * Validation schemas for different input types
 */
const VALIDATION_SCHEMAS = {
    bookTitle: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        pattern: /^[\w\s\-'":,.!?()&]+$/i, // Alphanumeric + common punctuation
        required: true
    },
    slug: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-z0-9\-_]+$/, // Lowercase alphanumeric + hyphens/underscores
        required: true
    },
    artifactType: {
        type: 'string',
        enum: ['slides', 'flashcards'], // Whitelist of allowed values
        required: true
    }
};

/**
 * Sanitize string input - remove dangerous characters
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/[<>]/g, '')           // Remove HTML brackets (XSS prevention)
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, 500);              // Hard limit on length
}

/**
 * Validate a single field against its schema
 * @param {*} value - Value to validate
 * @param {Object} schema - Validation schema
 * @param {string} fieldName - Name of field (for error messages)
 * @returns {Object} { valid: boolean, error?: string, sanitized?: any }
 */
export function validateField(value, schema, fieldName) {
    // Check required
    if (schema.required && (value === undefined || value === null || value === '')) {
        return { valid: false, error: `${fieldName} is required` };
    }

    // Skip validation if not required and empty
    if (!schema.required && !value) {
        return { valid: true, sanitized: value };
    }

    // Type check
    if (schema.type && typeof value !== schema.type) {
        return { valid: false, error: `${fieldName} must be a ${schema.type}` };
    }

    // String-specific validations
    if (schema.type === 'string' && typeof value === 'string') {
        const sanitized = sanitizeString(value);

        // Length checks
        if (schema.minLength && sanitized.length < schema.minLength) {
            return { valid: false, error: `${fieldName} is too short (min ${schema.minLength} chars)` };
        }
        if (schema.maxLength && sanitized.length > schema.maxLength) {
            return { valid: false, error: `${fieldName} is too long (max ${schema.maxLength} chars)` };
        }

        // Pattern check
        if (schema.pattern && !schema.pattern.test(sanitized)) {
            return { valid: false, error: `${fieldName} contains invalid characters` };
        }

        // Enum check (whitelist)
        if (schema.enum && !schema.enum.includes(sanitized)) {
            return { valid: false, error: `${fieldName} must be one of: ${schema.enum.join(', ')}` };
        }

        return { valid: true, sanitized };
    }

    return { valid: true, sanitized: value };
}

/**
 * Validate request body against expected fields
 * Rejects unexpected fields (prevents mass assignment)
 * @param {Object} body - Request body
 * @param {string[]} allowedFields - List of allowed field names
 * @returns {Object} { valid: boolean, errors: string[], sanitizedBody: Object }
 */
export function validateRequestBody(body, allowedFields) {
    const errors = [];
    const sanitizedBody = {};

    // Check for unexpected fields (mass assignment prevention)
    const receivedFields = Object.keys(body || {});
    const unexpectedFields = receivedFields.filter(f => !allowedFields.includes(f));

    if (unexpectedFields.length > 0) {
        errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
    }

    // Validate each allowed field
    for (const fieldName of allowedFields) {
        const schema = VALIDATION_SCHEMAS[fieldName];
        if (!schema) continue; // Skip fields without schema

        const result = validateField(body?.[fieldName], schema, fieldName);

        if (!result.valid) {
            errors.push(result.error);
        } else {
            sanitizedBody[fieldName] = result.sanitized;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitizedBody
    };
}


// ============================================================================
// 3. SECURITY HEADERS
// ============================================================================

/**
 * Apply security headers to response (OWASP recommendations)
 * @param {Object} response - HTTP response object
 */
export function applySecurityHeaders(response) {
    // Prevent MIME type sniffing
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    response.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection (legacy browsers)
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy for API responses
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

/**
 * Apply CORS headers with stricter defaults
 * @param {Object} request - HTTP request
 * @param {Object} response - HTTP response
 * @param {string[]} allowedOrigins - List of allowed origins (optional)
 */
export function applyCorsHeaders(request, response, allowedOrigins = null) {
    const origin = request.headers.origin;

    if (allowedOrigins && allowedOrigins.length > 0) {
        // Strict mode: only allow specified origins
        if (allowedOrigins.includes(origin)) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Vary', 'Origin');
        }
    } else {
        // Permissive mode (for development or public APIs)
        // Still safer than '*' as it reflects the actual origin
        response.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24h
}


// ============================================================================
// 4. COMBINED MIDDLEWARE HELPER
// ============================================================================

/**
 * Apply all security measures and validate input
 * @param {Object} request - HTTP request
 * @param {Object} response - HTTP response
 * @param {string[]} allowedFields - Fields to validate in body
 * @returns {Object|null} Sanitized body if valid, null if request was rejected
 */
export async function secureEndpoint(request, response, allowedFields) {
    // 1. Apply security headers
    applySecurityHeaders(response);
    applyCorsHeaders(request, response);

    // 2. Handle CORS preflight
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return null;
    }

    // 3. Method check
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed' });
        return null;
    }

    // 4. Rate limiting
    if (!applyRateLimit(request, response)) {
        return null; // Response already sent (429)
    }

    // 5. Input validation
    const validation = validateRequestBody(request.body, allowedFields);
    if (!validation.valid) {
        response.status(400).json({
            error: 'Validation Error',
            details: validation.errors
        });
        return null;
    }

    return validation.sanitizedBody;
}
