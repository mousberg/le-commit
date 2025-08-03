# 🔐 Authentication Approach Documentation

**Unmask Platform Authentication Architecture & Best Practices**

---

## 📋 **Overview**

This document outlines the comprehensive authentication approach for the Unmask platform, covering API route protection, middleware patterns, and security best practices. Our architecture prioritizes **centralized auth logic**, **rate limiting**, and **consistent error handling** across all endpoints.

---

## 🏗️ **Authentication Architecture**

### **Core Principles**
1. **Centralized Auth Logic** - All authentication handled by middleware
2. **Zero Duplication** - No manual auth code in route handlers
3. **Layered Security** - Authentication + rate limiting + CORS
4. **Role-Based Access** - ATS vs regular user permissions
5. **Consistent Responses** - Standardized error formatting

### **Technology Stack**
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row-Level Security (RLS) + custom middleware
- **Rate Limiting**: In-memory store (production: Redis recommended)
- **Session Management**: Server-side Supabase client
- **Security**: CORS, input validation, sanitization

---

## 🛡️ **Middleware Patterns**

### **1. Standard API Routes** - `withApiMiddleware()`

```typescript
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';

async function handleRequest(context: ApiHandlerContext) {
  const { user, request } = context; // Authentication already validated!
  
  // Pure business logic only
  const data = await request.json();
  // ... process request
  
  return NextResponse.json({ success: true, data });
}

export const POST = withApiMiddleware(handleRequest, {
  requireAuth: true,              // Requires valid user session
  enableCors: true,              // Enable CORS headers
  enableLogging: true,           // Request/response logging
  rateLimit: { 
    maxRequests: 10,             // 10 requests per window
    windowMs: 60000              // 1-minute window
  }
});
```

**Features Provided:**
- ✅ **Authentication validation**
- ✅ **Request body parsing** (JSON/FormData)
- ✅ **Rate limiting** with configurable windows
- ✅ **CORS handling** including preflight
- ✅ **Error handling** with consistent responses
- ✅ **Input validation** and sanitization
- ✅ **Security headers** and logging

### **2. ATS-Restricted Routes** - `withATSAuth()`

```typescript
import { withATSAuth } from '@/lib/auth/api-middleware';

export async function GET() {
  // Check ATS authorization (email domain-based)
  const authResult = await withATSAuth();
  if (authResult instanceof NextResponse) {
    return authResult; // Return auth error
  }
  
  const { user } = authResult; // ATS-authorized user
  // ... ATS-specific logic
}
```

**Use Cases:**
- Ashby integration management
- Candidate data syncing
- ATS configuration endpoints

---

## 🗺️ **Route Protection Matrix**

| Route Pattern | Auth Type | Rate Limit | Purpose |
|---------------|-----------|------------|---------|
| `/api/applicants` | Standard | 10/min | Applicant CRUD operations |
| `/api/ashby/test` | ATS | 20/min | Development testing |
| `/api/ashby/pull` | ATS | 10/min | Candidate synchronization |
| `/api/ashby/sync` | Standard | 5/min, 2/min | Result sync (single/batch) |
| `/api/ashby/resume` | Standard | 20/min | Resume downloads |
| `/api/ashby/store-cv` | Standard | 15/min | CV storage operations |
| `/api/ashby/webhook` | Signature | None | Webhook validation |
| `/api/reference-call` | None | None | Public ElevenLabs integration |
| `/api/get-transcript` | None | None | Public transcript retrieval |
| `/api/summarize-transcript` | None | None | Public AI summarization |
| `/api/waitlist` | None | None | Public waitlist signup |

### **Protection Levels Explained**

#### **🔒 Standard Auth** - Regular authenticated users
- Validates JWT token via Supabase
- Checks user session validity  
- Provides user context to handlers
- Enforces Row-Level Security (RLS)

#### **🏢 ATS Auth** - Authorized email domains only
- All standard auth features PLUS
- Domain-based access control
- Restricted to configured email domains
- Used for sensitive ATS operations

#### **📝 Signature Auth** - Webhook verification
- Validates request signatures
- No user session required
- Used for external service callbacks

#### **🌐 Public** - No authentication required
- Open endpoints for specific use cases
- May have other validation (API keys, etc.)
- Careful consideration of exposure

---

## 🚀 **Implementation Examples**

### **Applicant Management Route**

```typescript
// ✅ CORRECT - Using middleware
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';

async function createApplicant(context: ApiHandlerContext) {
  const { user, request } = context;
  const formData = await request.formData();
  
  // Business logic only - auth handled by middleware
  const applicant = await createApplicantRecord(user.id, formData);
  return NextResponse.json({ applicant, success: true });
}

export const POST = withApiMiddleware(createApplicant, {
  requireAuth: true,
  enableCors: true,
  rateLimit: { maxRequests: 10, windowMs: 60000 }
});
```

### **ATS Management Route**

```typescript
// ✅ CORRECT - ATS-specific auth
import { withATSAuth } from '@/lib/auth/api-middleware';

export async function GET(request: NextRequest) {
  const authResult = await withATSAuth();
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  // ATS-specific operations only accessible to authorized domains
  return NextResponse.json({ data: await getATSData(user.id) });
}
```

### **Public Webhook Route**

```typescript
// ✅ CORRECT - Signature validation
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-webhook-signature');
  const payload = await request.text();
  
  if (!verifySignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process webhook data
  await processWebhookEvent(JSON.parse(payload));
  return NextResponse.json({ success: true });
}
```

---

## ❌ **Anti-Patterns (DO NOT USE)**

### **❌ Manual Authentication**

```typescript
// ❌ NEVER DO THIS - Manual auth duplication
export async function POST(request: NextRequest) {
  // ❌ This pattern is FORBIDDEN
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required', success: false },
      { status: 401 }
    );
  }
  
  // ❌ This creates duplication and maintenance burden
}
```

**Why This Is Wrong:**
- 🚫 **Code duplication** across multiple routes
- 🚫 **Inconsistent error handling**
- 🚫 **No rate limiting** or security features
- 🚫 **Maintenance nightmare** - changes needed in N places
- 🚫 **Security gaps** - easy to miss updates

### **❌ Inconsistent Error Responses**

```typescript
// ❌ Don't create custom error formats
return NextResponse.json({ msg: 'Not authorized' }, { status: 403 });

// ✅ Use consistent format (handled by middleware)
// { error: 'Authentication required', success: false }
```

---

## 🔧 **Configuration Guide**

### **Rate Limiting Guidelines**

| Route Type | Suggested Limits | Reasoning |
|------------|------------------|-----------|
| **CRUD Operations** | 10-20/min | Normal user interactions |
| **File Operations** | 5-15/min | Resource-intensive processing |
| **Sync Operations** | 2-5/min | Heavy database operations |
| **Test Endpoints** | 20-50/min | Development needs |
| **Public APIs** | 100+/min | External integrations |

### **Authentication Options**

```typescript
interface ApiHandlerOptions {
  requireAuth?: boolean;              // Default: true
  requireWorkspaceAccess?: {          // Workspace-level permissions
    workspaceIdParam?: string;
    requiredRole?: 'admin' | 'owner';
  };
  requireApplicantAccess?: {          // Applicant-level permissions
    applicantIdParam?: string;
    requiredRole?: 'admin' | 'owner';
  };
  rateLimit?: {                       // Rate limiting config
    windowMs: number;
    maxRequests: number;
  };
  enableCors?: boolean;               // CORS headers
  enableLogging?: boolean;            // Request logging
  enableSecurityHeaders?: boolean;    // Security headers
}
```

---

## 🏛️ **Database Security (RLS)**

### **Row-Level Security Policies**

```sql
-- Example: Applicants table policy
create policy "Users can manage own applicants" on public.applicants
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Example: Files table policy  
create policy "Users can access own files" on public.files
  for all using (
    exists (
      select 1 from public.applicants 
      where applicants.id = files.applicant_id 
      and applicants.user_id = auth.uid()
    )
  );
```

### **Security Layers**

1. **JWT Validation** - Token authenticity and expiration
2. **Middleware Auth** - Application-level user validation
3. **RLS Policies** - Database-level row access control
4. **Business Logic** - Route-specific permission checks

---

## 🚨 **Security Best Practices**

### **Input Validation**

```typescript
// ✅ Input validation handled by middleware
const body = await request.json(); // Pre-validated and sanitized

// ❌ Never trust raw input
const rawBody = await request.text();
const data = JSON.parse(rawBody); // Potential security risk
```

### **Error Handling**

```typescript
// ✅ Consistent error responses
return NextResponse.json(
  { error: 'Resource not found', success: false },
  { status: 404 }
);

// ❌ Don't expose internal details
throw new Error('Database connection failed at server:5432');
```

### **Rate Limiting Strategy**

- **Conservative defaults** - Start strict, relax as needed
- **Different limits per route type** - Match usage patterns
- **Monitor and adjust** - Track actual usage patterns
- **Gradual escalation** - 429 → temporary blocking → account review

---

## 📊 **Monitoring & Analytics**

### **Authentication Metrics**

- **Authentication success/failure rates**
- **Rate limiting trigger frequency**
- **Route usage patterns**
- **User session durations**
- **ATS vs regular auth usage**

### **Security Events**

- **Failed authentication attempts**
- **Rate limit violations**
- **Invalid signature attempts**
- **Suspicious access patterns**

---

## 🔄 **Migration Guide**

### **From Manual Auth to Middleware**

1. **Identify route** with manual auth code
2. **Extract business logic** into separate function
3. **Remove manual auth code**
4. **Wrap with `withApiMiddleware()`**
5. **Configure appropriate options**
6. **Test thoroughly**

### **Example Migration**

```typescript
// BEFORE - Manual auth
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }
  // ... business logic
}

// AFTER - Middleware
async function handleRequest(context: ApiHandlerContext) {
  const { user } = context; // Auth already validated!
  // ... same business logic
}

export const POST = withApiMiddleware(handleRequest, {
  requireAuth: true,
  rateLimit: { maxRequests: 10, windowMs: 60000 }
});
```

---

## 🔮 **Future Considerations**

### **Scalability Improvements**

- **Redis-based rate limiting** for distributed systems
- **JWT refresh token rotation** for enhanced security  
- **Multi-factor authentication** for sensitive operations
- **OAuth provider integration** for enterprise SSO

### **Advanced Features**

- **Dynamic rate limiting** based on user tiers
- **Geographic restrictions** for compliance
- **Audit logging** for security compliance
- **Automated threat detection** and response

---

## 📝 **Enforcement**

### **Cursor IDE Rule**

```markdown
**NEVER manually implement authentication in API routes - always use withApiMiddleware() from '@/lib/middleware/apiWrapper' or withATSAuth() from '@/lib/auth/api-middleware' instead of createClient().auth.getUser().**
```

### **Code Review Checklist**

- [ ] ✅ No manual `createClient().auth.getUser()` calls
- [ ] ✅ Appropriate middleware used for route type
- [ ] ✅ Rate limiting configured appropriately  
- [ ] ✅ Error responses follow standard format
- [ ] ✅ Business logic separated from auth logic
- [ ] ✅ Tests include auth scenarios

---

## 🎯 **Summary**

The Unmask platform uses a **comprehensive, centralized authentication approach** that:

- **Eliminates code duplication** through middleware patterns
- **Provides layered security** with auth + rate limiting + validation
- **Ensures consistency** across all API endpoints
- **Scales efficiently** with configurable options
- **Maintains security** through established patterns

**Key Takeaway**: Always use the provided middleware patterns. Never implement manual authentication in route handlers. This approach ensures security, maintainability, and consistency across the entire platform.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintainer**: Development Team