# GERKINK — Provocative Luxury Streetwear E-Commerce

> A Next.js e-commerce platform that roasts visitors into buying. Mist blue & coral pink. Anonymous owners. Two brutal shop tiers. Real integrations only.

---

## User Review Required

> [!IMPORTANT]
> **API Keys Needed Before Development Begins**
> You must provide (or create accounts for) the following before we can wire up real integrations:
> 1. **Firebase** — Project ID, Web API Key, Service Account JSON
> 2. **Printify** — Personal Access Token from [printify.com/app/account/api](https://printify.com/app/account/api)
> 3. **Razorpay** — Key ID + Key Secret from [dashboard.razorpay.com](https://dashboard.razorpay.com)
>
> Without these, the app will build and run but API calls will fail.

> [!WARNING]
> **Brand Voice — Explicit Content**
> The site's personality uses aggressive, profanity-laced "friend roasting friend" copy. All abusive copy is banter-style humor aimed at ego, not hate speech. Section names include censored profanity ("Society Fu\*kers", "Valueless Bi\*ches"). Confirm you're comfortable with this being baked into every UI component.

> [!CAUTION]
> **Pricing Tiers**
> Section 1 ("Society Fu\*kers") lists t-shirts at $1,000 / $10,000 / $100,000 / $1,000,000 / $10,000,000. These are real prices sent to Razorpay. Confirm these are intentional and not placeholders.

---

## Open Questions

1. **Currency** — Should prices be in USD ($) or INR (₹)? Razorpay supports both, but Printify base costs are in USD. Recommendation: USD globally.
2. **Printify Shop** — Do you already have products created in your Printify dashboard, or should the admin panel let owners create/upload products directly via the Printify API?
3. **Admin count** — How many admin/owner accounts? Should there be a super-admin who can add other admins?
4. **Referral payouts** — How will the $50 / $100,000 affiliate rewards be disbursed? Manual bank transfer? Razorpay Payouts API? Store credit?
5. **Domain** — Do you have a domain name ready (e.g., `gerkink.com`)? Needed for Firebase Auth redirect URLs and Razorpay webhook config.
6. **Shipping** — Printify handles fulfillment/shipping. Should the site show shipping costs at checkout, or is it "free shipping" bundled into product price?

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Pages/    │  │ Server   │  │  API Routes      │  │
│  │  Layouts   │  │ Actions  │  │  /api/...        │  │
│  └───────────┘  └──────────┘  └──────────────────┘  │
│         │              │               │             │
│    ┌────┴──────────────┴───────────────┴──────┐      │
│    │           MIDDLEWARE (Auth Guard)         │      │
│    └──────────────────────────────────────────┘      │
└──────────────┬──────────────┬──────────────┬─────────┘
               │              │              │
        ┌──────┴──────┐ ┌────┴────┐  ┌──────┴──────┐
        │  FIREBASE   │ │PRINTIFY │  │  RAZORPAY   │
        │ Auth + DB   │ │  API    │  │  Payments   │
        │ + Storage   │ │         │  │  + Webhooks │
        └─────────────┘ └─────────┘  └─────────────┘
```

---

## Proposed Changes

### Phase 1: Project Scaffold & Design System

#### [NEW] Project Initialization
- Initialize Next.js 14+ with App Router, TypeScript, ESLint
- Install dependencies: `firebase`, `firebase-admin`, `razorpay`, `next`, `react`
- Configure `tsconfig.json` path aliases (`@/components`, `@/lib`, `@/app`)

#### [NEW] `src/app/globals.css` — Design System
Complete CSS design system with:
- **Color tokens**: Mist Blue (`#B4C7D9`, `#8FA8C2`, `#6B8AAB`), Coral Pink (`#FF6B6B`, `#FF8E8E`, `#E85555`)
- **Dark mode**: CSS custom properties that flip on `[data-theme="dark"]`
- Dark mode default: Deep charcoal (`#0D0D0D`) backgrounds, muted blues, glowing coral accents
- Light mode: Crisp whites with mist blue tints and coral highlights
- **Typography**: Google Fonts — `Space Grotesk` (headings), `Inter` (body), `JetBrains Mono` (prices/code)
- **Animations**: Keyframes for entrance, hover-glow, shake (for ego-roast moments), pulse, float
- **Glassmorphism**: Reusable blur/transparency classes for cards and modals
- **Grid system**: CSS Grid + Flexbox utilities

#### [NEW] `src/app/layout.tsx` — Root Layout
- HTML `<head>` with SEO meta tags, OG image, favicon
- Google Fonts preload
- Theme provider (dark/light toggle persisted to localStorage)
- Navigation bar component
- Footer component
- Toast/notification system for roast messages

---

### Phase 2: Firebase Integration

#### [NEW] `src/lib/firebase/config.ts` — Client SDK
- Initialize Firebase app with environment variables
- Export `auth`, `db` (Firestore), `storage` instances
- **No secrets exposed** — only `NEXT_PUBLIC_*` vars

#### [NEW] `src/lib/firebase/admin.ts` — Admin SDK (Server Only)
- Initialize with service account JSON from env
- Export `adminAuth`, `adminDb` for server-side operations
- Used for: custom claims, token verification, Firestore admin writes

#### [NEW] `src/lib/firebase/auth.ts` — Auth Helpers
- `signUpWithEmail(email, password)` → creates user + Firestore profile doc
- `signInWithEmail(email, password)` → returns session
- `signOut()` → clears session cookie
- `signInWithGoogle()` → Google OAuth popup
- Session cookie management (HTTP-only, secure, SameSite=Strict)

#### [NEW] `src/middleware.ts` — Route Protection
```
Public routes:     /  /shop  /manifesto  /contact  /owners
Auth required:     /cart  /checkout  /account  /referral
Admin only:        /admin/*
```
- Verifies Firebase ID token from session cookie
- Checks custom claims for `admin: true` on `/admin/*` routes
- Redirects unauthorized users with a roast message

#### [NEW] Firestore Schema

**Collections:**

| Collection | Document Fields | Purpose |
|---|---|---|
| `users` | `uid`, `email`, `displayName`, `role`, `referralCode`, `referredBy`, `referralCount`, `totalEarnings`, `createdAt` | User profiles + referral data |
| `products` | `printifyId`, `title`, `description`, `section` (society_fuckers \| valueless_bitches), `price`, `tier`, `images[]`, `variants[]`, `isPublished`, `createdAt` | Product catalog synced from Printify |
| `orders` | `userId`, `items[]`, `total`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `referralCode`, `shippingAddress`, `createdAt` | Order tracking |
| `referrals` | `affiliateUid`, `referredUid`, `orderId`, `orderValue`, `commission`, `status`, `createdAt` | Referral event log |
| `settings` | `globalReferralCount`, `totalCustomers`, `roastMessages[]` | Global app config |

#### [NEW] `firestore.rules` — Security Rules
- Users can only read/write their own profile
- Products are publicly readable, admin-only writable
- Orders readable by owner + admin, writable via server only
- Referrals readable by affiliate + admin
- Settings readable by all, writable by admin only

---

### Phase 3: Printify Integration

#### [NEW] `src/lib/printify/client.ts` — Printify API Client
- Base URL: `https://api.printify.com/v1/`
- Auth: Bearer token from `PRINTIFY_ACCESS_TOKEN` env var
- Methods:
  - `getShops()` — list connected shops
  - `getProducts(shopId)` — fetch all products
  - `getProduct(shopId, productId)` — single product with variants
  - `createOrder(shopId, orderData)` — submit order for fulfillment
  - `getBlueprints()` — catalog of available product types
  - `uploadImage(base64)` — upload design artwork

#### [NEW] `src/lib/printify/sync.ts` — Product Sync Service
- Server action that pulls products from Printify → writes to Firestore
- Maps Printify variants (sizes, colors) to our product schema
- Triggered manually from admin panel or via cron

#### [NEW] `src/app/api/printify/webhook/route.ts` — Webhook Handler
- Receives order status updates from Printify
- Updates order status in Firestore
- Sends notification to customer

---

### Phase 4: Razorpay Integration

#### [NEW] `src/lib/razorpay/client.ts` — Server-side Razorpay Instance
```typescript
import Razorpay from 'razorpay';
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
```

#### [NEW] `src/app/api/payment/create-order/route.ts`
- Receives cart total from client
- Validates cart items against Firestore prices (prevents tampering)
- Creates Razorpay order
- Returns `orderId` to client

#### [NEW] `src/app/api/payment/verify/route.ts`
- Receives `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
- Validates signature using HMAC SHA256
- On success: creates order in Firestore, triggers Printify order, processes referral
- On failure: returns error with roast message

#### [NEW] `src/app/api/payment/webhook/route.ts`
- Razorpay webhook for `payment.captured`, `payment.failed`
- Backup verification in case client-side handler fails
- Validates webhook signature

#### [NEW] `src/components/checkout/RazorpayButton.tsx`
- Client component that loads Razorpay checkout script
- Opens payment modal with brand theming (mist blue + coral pink)
- Handles success/failure callbacks

---

### Phase 5: Pages & UI Components

#### [NEW] `src/app/page.tsx` — Home Page
**Hero Section:**
- Full-screen animated gradient (mist blue → coral pink → dark)
- Giant provocative headline with typewriter effect: *"You dress like your personality — boring as f\*ck."*
- Subtext: *"Fix it. Or don't. We don't care. But you should."*
- CTA button with shake animation: "PROVE ME WRONG →"
- Floating clothing silhouettes with parallax

**Ego-Roast Ticker:**
- Horizontal scrolling marquee with rotating insults
- Updates dynamically (pulled from Firestore `settings.roastMessages`)

**Section Previews:**
- Split-screen: Left = "Society Fu\*kers" (luxury, dark, gold accents), Right = "Valueless Bi\*ches" (street, neon coral)
- Hover reveals product teasers with price tags that "slap" onto screen

**Social Proof Bar:**
- Counter: "X people got roasted into buying today"
- No fake numbers — real-time from Firestore order count

---

#### [NEW] `src/app/shop/page.tsx` — Shop Landing
- Two massive section cards with hover animations
- Section 1 card: Dark, intimidating, price tags floating
- Section 2 card: Vibrant, chaotic, coral energy

#### [NEW] `src/app/shop/society-fuckers/page.tsx` — Section 1
- **Tier-based layout** (5 tiers displayed as a pyramid/hierarchy):
  - Tier 1: $10,000,000 — "GOD TIER" — single product, full-page showcase
  - Tier 2: $1,000,000 — "OBSCENE" — 1-2 products
  - Tier 3: $100,000 — "DELUSIONAL" — 3-5 products
  - Tier 4: $10,000 — "WANNABE" — 5-10 products
  - Tier 5: $1,000 — "PEASANT PREMIUM" — 10+ products
- Each tier has unique visual treatment (more expensive = more dramatic)
- Products fetched from Firestore where `section = 'society_fuckers'`
- Ego-roast popup when hovering on expensive items: *"You can't afford this. Close the tab."*

#### [NEW] `src/app/shop/valueless-bitches/page.tsx` — Section 2
- Grid/masonry layout with categories (T-shirts, Hoodies, Accessories, etc.)
- Prices set by owners via admin panel
- Product cards with glassmorphism, coral pink accents
- Filter/sort by category, price, newest
- Products fetched from Firestore where `section = 'valueless_bitches'`

#### [NEW] `src/app/shop/[productId]/page.tsx` — Product Detail
- Full product page with image gallery (from Printify)
- Size/variant selector
- "Add to Cart" with roast confirmation: *"Finally making a good decision for once."*
- Related products carousel
- Customization options (if Printify personalization enabled)

---

#### [NEW] `src/app/cart/page.tsx` — Cart (Auth Required)
- Cart items with quantity controls
- Running total with tax estimation
- Referral code input field
- Roast-style empty cart: *"Empty cart. Empty life. Checks out."*
- Checkout button → Razorpay payment flow
- Order minimum validation ($100 for referral eligibility)

#### [NEW] `src/app/manifesto/page.tsx` — Manifesto
- Full-page editorial layout with dramatic typography
- Brand philosophy: why Gerkink exists, the anti-fashion stance
- Scroll-triggered text animations (words fade/slide in)
- Dark, moody aesthetic with mist blue typography on near-black

#### [NEW] `src/app/contact/page.tsx` — Contact
- Minimal contact form (name, email, message)
- Writes to Firestore `contacts` collection
- Roast-style placeholder text in inputs
- Social media links (Instagram, Twitter/X, TikTok)
- No phone number (anonymous owners)

#### [NEW] `src/app/owners/page.tsx` — Owners
- **Mysterious, anonymous presentation**
- Silhouette avatars with glitch effects
- Pseudonyms only (no real names)
- Cryptic bio text, deliberately vague
- "We are nobody. Our clothes speak louder."
- Parallax dark imagery, fog/smoke overlay effects

---

#### [NEW] `src/app/auth/login/page.tsx` — Login
- Email/password + Google sign-in
- Roast-style welcome: *"Back again? Your wardrobe still needs help."*
- Redirect to previous page after login

#### [NEW] `src/app/auth/signup/page.tsx` — Signup
- Email/password + Google
- Auto-generates referral code on account creation
- Captures `ref` query param from URL if present
- Roast onboarding: *"Creating an account won't fix your style, but it's a start."*

#### [NEW] `src/app/account/page.tsx` — Account Dashboard
- Profile info, order history, referral dashboard
- Referral link with copy button
- Referral stats: total referred, total earned, progress to milestones

---

### Phase 6: Admin Panel

#### [NEW] `src/app/admin/layout.tsx` — Admin Layout
- Protected by middleware (requires `admin: true` custom claim)
- Sidebar navigation: Dashboard, Products, Orders, Users, Referrals, Settings, Roast Messages

#### [NEW] `src/app/admin/page.tsx` — Admin Dashboard
- Key metrics: total orders, revenue, active users, referral stats
- Recent orders table
- Real-time updates via Firestore `onSnapshot`

#### [NEW] `src/app/admin/products/page.tsx` — Product Management
- List all products from Firestore
- Create new product (select Printify blueprint, upload design, set price, assign section/tier)
- Edit product (price, description, section assignment)
- Sync button to pull latest from Printify
- Publish/unpublish toggle

#### [NEW] `src/app/admin/orders/page.tsx` — Order Management
- All orders with status filters
- Order detail view with Printify fulfillment status
- Manual order status updates

#### [NEW] `src/app/admin/users/page.tsx` — User Management
- User list with search
- Grant/revoke admin role (sets Firebase custom claims)
- View user's referral stats

#### [NEW] `src/app/admin/referrals/page.tsx` — Referral Management
- Global referral counter (towards 10,000th milestone)
- Affiliate leaderboard
- Commission payout tracking
- Milestone achievement log

#### [NEW] `src/app/admin/settings/page.tsx` — Site Settings
- Edit roast messages (the rotating insults)
- Toggle site-wide settings
- Manage Section 2 pricing

---

### Phase 7: Referral / Affiliate System

#### [NEW] `src/lib/referral/engine.ts` — Referral Logic

**Flow:**
```
1. User signs up → generates unique referral code (e.g., "GERK-X7K9M2")
2. User shares link: gerkink.com/?ref=GERK-X7K9M2
3. New visitor clicks link → ref code stored in cookie (30-day expiry)
4. New visitor signs up → ref code saved to their user doc as `referredBy`
5. New user places order (>$100) → referral event created in Firestore
6. System checks affiliate's referral count:
   - Every 10th successful referral → $50 commission credited
   - 10,000th global customer → $100,000 + t-shirt + certificate
```

**Rules (enforced server-side):**
- Each order must be ≥ $100 to count as a valid referral
- Self-referral blocked (referrer UID ≠ customer UID)
- One referral code per customer (first-touch attribution)
- Commissions tracked in `referrals` collection
- Global counter tracked in `settings.globalReferralCount`

**Milestone Check (Server Action):**
```typescript
async function processReferral(order) {
  // 1. Validate order value >= $100
  // 2. Find affiliate by referral code
  // 3. Increment affiliate's referralCount
  // 4. If referralCount % 10 === 0 → credit $50
  // 5. Increment global counter
  // 6. If globalCounter === 10000 → trigger mega reward
  // 7. Write referral event to Firestore
}
```

---

### Phase 8: Security Hardening

| Layer | Implementation |
|---|---|
| **Auth** | Firebase Auth with session cookies (HTTP-only, Secure, SameSite=Strict) |
| **Route Protection** | Next.js Middleware verifies token on every protected request |
| **Admin** | Firebase Custom Claims (`admin: true`), verified server-side |
| **API Security** | All API routes validate auth token before processing |
| **Payment** | Razorpay signature verification (HMAC SHA256) on every payment |
| **Price Tampering** | Server re-validates cart prices against Firestore before creating Razorpay order |
| **CSRF** | Next.js built-in CSRF protection via Server Actions |
| **XSS** | React's built-in escaping + Content Security Policy headers |
| **Rate Limiting** | API route rate limiting via in-memory store (upgrade to Redis for prod) |
| **Env Secrets** | All secrets in `.env.local`, never in client bundles |
| **Firestore Rules** | Strict read/write rules per collection (see Phase 2) |
| **Input Validation** | Zod schemas for all form inputs and API payloads |
| **Headers** | `next.config.js` security headers (HSTS, X-Frame-Options, etc.) |

---

### Phase 9: Components Library

#### Shared Components
| Component | Description |
|---|---|
| `Navbar` | Sticky nav with logo, links, cart count badge, dark mode toggle, auth state |
| `Footer` | Links, social media, newsletter signup, copyright, brand tagline |
| `ThemeToggle` | Dark/light mode switch with smooth transition |
| `ProductCard` | Glassmorphic card with image, title, price, hover roast |
| `RoastToast` | Toast notification system for ego-bruising messages |
| `EgoTicker` | Scrolling marquee of rotating insults |
| `PriceTag` | Animated price display with tier-specific styling |
| `LoadingScreen` | Branded loading animation with roast text |
| `Modal` | Reusable modal with blur backdrop |
| `Button` | Primary/secondary/danger variants with hover animations |

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page
│   ├── globals.css                   # Design system
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── shop/
│   │   ├── page.tsx                  # Shop landing
│   │   ├── society-fuckers/page.tsx  # Section 1
│   │   ├── valueless-bitches/page.tsx # Section 2
│   │   └── [productId]/page.tsx      # Product detail
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── manifesto/page.tsx
│   ├── contact/page.tsx
│   ├── owners/page.tsx
│   ├── account/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard
│   │   ├── products/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── users/page.tsx
│   │   ├── referrals/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── payment/
│       │   ├── create-order/route.ts
│       │   ├── verify/route.ts
│       │   └── webhook/route.ts
│       └── printify/
│           └── webhook/route.ts
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ThemeToggle.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── ProductCard.tsx
│   │   ├── PriceTag.tsx
│   │   ├── RoastToast.tsx
│   │   ├── EgoTicker.tsx
│   │   └── LoadingScreen.tsx
│   ├── shop/
│   │   ├── TierPyramid.tsx
│   │   ├── ProductGrid.tsx
│   │   └── ProductFilters.tsx
│   ├── checkout/
│   │   └── RazorpayButton.tsx
│   └── admin/
│       ├── AdminSidebar.tsx
│       ├── MetricsCards.tsx
│       └── DataTable.tsx
├── lib/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── admin.ts
│   │   └── auth.ts
│   ├── printify/
│   │   ├── client.ts
│   │   └── sync.ts
│   ├── razorpay/
│   │   └── client.ts
│   ├── referral/
│   │   └── engine.ts
│   └── utils/
│       ├── roasts.ts              # Roast message engine
│       └── validation.ts          # Zod schemas
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useTheme.ts
│   └── useRoast.ts
├── context/
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   └── ThemeContext.tsx
├── types/
│   └── index.ts                   # TypeScript interfaces
└── middleware.ts
```

---

## Execution Order

| Phase | What | Est. Files |
|---|---|---|
| **1** | Next.js scaffold + design system + layout + navbar + footer | ~8 |
| **2** | Firebase config + auth flows + middleware + Firestore schema | ~7 |
| **3** | Printify client + product sync | ~3 |
| **4** | Razorpay payment flow + verification | ~5 |
| **5** | All pages (Home, Shop, Cart, Manifesto, Contact, Owners, Auth, Account) | ~14 |
| **6** | Admin panel (all 6 sub-pages) | ~8 |
| **7** | Referral engine + affiliate dashboard | ~3 |
| **8** | Security hardening + Firestore rules + headers | ~3 |
| **9** | Polish — animations, roast system, dark mode refinement, testing | ~5 |

**Total: ~56 files, estimated 8,000-12,000 lines of code**

---

## Social Media Virality — Master Prompt

> [!NOTE]
> This is the social media / marketing strategy prompt you asked for — designed to generate maximum attention and force people to visit and buy.

### The Master Prompt (for content creation / social media AI tools):

---

**GERKINK — Social Media Domination Prompt**

> You are the social media strategist for **GERKINK**, a luxury streetwear brand that insults its customers into buying. The brand voice is: **your most brutal best friend who roasts your entire existence but secretly wants you to glow up**. Every piece of content must:
>
> 1. **OPEN WITH AN EGO ATTACK** — Hit the viewer's insecurity about their style, status, or self-image within the first 1.5 seconds. Examples:
>    - "Your outfit screams 'I gave up in 2019'"
>    - "You're wearing THAT and still wonder why they left you on read?"
>    - "POV: You think you have style but your closet looks like a goodwill reject pile"
>
> 2. **ESCALATE WITH SHOCK VALUE** — Mention the absurd pricing as a flex:
>    - "Our cheapest shirt costs more than your car payment"
>    - "We sell a $10 MILLION t-shirt. And no, you can't afford it."
>    - "Society Fu\*kers collection starts at $1,000. Consider it a personality upgrade fee."
>
> 3. **PIVOT TO ASPIRATION** — Make them WANT to be part of the brand:
>    - "But the real ones? They wear GERKINK. They don't explain themselves."
>    - "Valueless Bi\*ches collection — for people who know their worth (even when the price tag doesn't)"
>    - "Our owners are anonymous. Our wearers are unforgettable."
>
> 4. **CTA THAT CHALLENGES** — Never beg. Dare them:
>    - "Link in bio. If you've got the guts."
>    - "Visit gerkink.com. We'll roast you there too."
>    - "Buy something or stay basic. Your call."
>
> **Platform-specific formats:**
> - **Instagram Reels/TikTok**: POV-style roasts, "rate my outfit" reactions with brutal honesty, price reveal shock content, mysterious owner lore
> - **Twitter/X**: One-liner roasts, controversial hot takes about fashion, quote-tweet roasting followers who engage
> - **YouTube Shorts**: Behind-the-brand mystery content, "why our shirt costs $1M" explainers, customer reaction videos
>
> **Hashtag Strategy**: #GERKINK #SocietyFuckers #ValuelessBitches #LuxuryRoast #AnonymousFashion #EgoCheck #WearYourWorth
>
> **Content Calendar Cadence**: 3 reels/day, 5 tweets/day, 1 YouTube Short/week. Every piece must be screenshot-worthy and debate-inducing. The goal is NOT likes — it's **CONTROVERSY → CURIOSITY → CLICKS → CONVERSIONS**.

---

## Verification Plan

### Automated Tests
```bash
# Type checking
npx tsc --noEmit

# Linting
npx next lint

# Build verification
npm run build
```

### Manual Verification
1. **Auth flow**: Sign up → Login → Logout → Google Sign-in → Admin access
2. **Shop**: Both sections render products from Firestore (once API keys connected)
3. **Cart + Checkout**: Add items → Apply referral → Pay via Razorpay test mode
4. **Referral**: Share link → New user signs up → Places order → Commission tracked
5. **Admin**: Login as admin → CRUD products → View orders → Manage users
6. **Dark mode**: Toggle works on all pages, persists across refreshes
7. **Responsiveness**: Test on mobile, tablet, desktop breakpoints
8. **Security**: Try accessing `/admin` without admin role → should redirect
9. **Roast system**: Ego-bruising messages appear on interactions throughout the site
