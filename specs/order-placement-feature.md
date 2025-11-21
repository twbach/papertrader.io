# Order Placement Feature Requirements

## Overview

Implement a professional order placement system for the paper trading platform that allows users to review, confirm, and place multi-leg options orders.

## Current State

- **Option Chain View**: Displays calls/puts with ability to select options
- **Legs Management**: Users can add/remove legs to build multi-leg strategies
- **LegsPanel Component**: Shows legs with basic info and total net debit/credit
- **Data**: Using mock data from ThetaData API (includes Greeks: delta, gamma, theta, vega)
- **Database Schema**: Order, Position, and Portfolio models already defined

## Feature Requirements

### 1. Enhanced Order Review Panel

#### 1.1 Order Summary Display

Transform the current LegsPanel into a comprehensive order review interface that displays:

**Individual Legs**

- Current display (maintain): Action (BUY/SELL), Type (CALL/PUT), Quantity, Strike, Price, Expiration
- Add: Individual Greeks per leg (delta, theta)
- Visual hierarchy to distinguish between buy/sell legs

**Aggregated Metrics (Critical Values)**

- **Portfolio Greeks**
  - Overall Delta: Sum of (leg.delta × leg.quantity × ±1 for buy/sell × 100)
  - Overall Theta: Sum of (leg.theta × leg.quantity × ±1 for buy/sell × 100)
  - Display format: Delta with color coding (positive = green, negative = red)
  - Theta always displayed as daily decay

- **Risk Metrics**
  - Max Loss: Calculate based on strategy type
    - For debit spreads: Net debit paid
    - For credit spreads: (Spread width - Net credit) × 100 × quantity
    - For iron condors: Max of (call spread max loss, put spread max loss)
    - For undefined risk (naked options): Display "Unlimited" or calculated max based on position size
  - Max Profit: Calculate based on strategy type
    - For debit spreads: (Spread width - Net debit) × 100 × quantity
    - For credit spreads: Net credit received
    - Display "Unlimited" for strategies with unlimited profit potential

- **Cost Analysis**
  - Net Debit/Credit: Current calculation (sum of leg.price × quantity × 100 × ±1)
  - Required Buying Power:
    - For cash-secured strategies: Full collateral amount
    - For spreads: Max loss amount
    - For margin: Broker-style calculation (can use simplified model for v1)
  - Display format: Large, prominent number with clear labeling

#### 1.2 Order Action Button

- Replace collapse/expand controls with prominent "Place Order" or "Send" button
- Button should be:
  - Large and visually distinct
  - Enabled only when legs.length > 0
  - Disabled state should be clear with tooltip explaining why
  - Show loading state during order submission

### 2. Order Placement Flow

#### 2.1 Pre-submission Validation

Before allowing order submission, validate:

- At least one leg exists
- All legs have valid prices (> 0)
- User has sufficient buying power (check portfolio.cashBalance)
- Options are not expired

#### 2.2 Order Submission Process

1. User clicks "Send" button
2. Show loading state on button
3. Create order(s) in database:
   - For multi-leg orders: Create single order record or multiple linked orders
   - Populate Order table fields:
     - portfolioId (default or user's main portfolio)
     - userId (from auth session)
     - For each leg: symbol, optionType, strike, expiration, side, type, quantity, limitPrice
     - status: 'FILLED' (instant fill for paper trading)
     - filledQty: quantity
     - avgFillPrice: leg.price
     - placedAt: now()
     - filledAt: now()

4. Create Position records:
   - For each leg, create or update Position in portfolio
   - Set quantity (positive for long, negative for short)
   - Calculate and store entry values
   - Initialize Greeks from option data

5. Update Portfolio:
   - Deduct/credit cashBalance based on net debit/credit
   - Update equity calculation

6. On success: Redirect to /portfolio page
7. On error: Show error toast/message, keep user on page

#### 2.3 Order Types

For v1 (simplified paper trading):

- **Market Orders Only**: Orders fill immediately at current price
- No limit orders, stop orders, or advanced order types needed
- No partial fills (always fill completely)

### 3. UI/UX Requirements

#### 3.1 Layout

- **Fixed bottom panel** (current behavior - keep it)
- **Collapsible header** for leg details when scrolling (current behavior - keep it)
- **New section**: Order summary with metrics above the legs list
- **Prominent action button**: "Send Order" or "Place Trade" button

#### 3.2 Visual Design

- Professional appearance with clear hierarchy
- Use existing shadcn/ui components for consistency
- Color coding:
  - Green: Credits, positive delta, max profit
  - Red: Debits, negative delta, max loss, theta decay
  - Neutral: Buying power, general info
- Typography: Clear labels, values in bold
- Spacing: Adequate whitespace for readability

#### 3.3 Responsive Design

- Must work on desktop (primary focus)
- Mobile considerations (reference mobile-design.md if needed)

### 4. Data Requirements

#### 4.1 Greeks Calculation

- Source: OptionQuote interface already includes delta, gamma, theta, vega
- Aggregation logic:

  ```typescript
  // Per 1 contract = 100 shares
  const contractMultiplier = 100;

  // For each leg
  const legDelta =
    option.delta * leg.quantity * contractMultiplier * (leg.action === 'buy' ? 1 : -1);
  const legTheta =
    option.theta * leg.quantity * contractMultiplier * (leg.action === 'buy' ? 1 : -1);

  // Portfolio totals
  const totalDelta = legs.reduce((sum, leg) => sum + legDelta, 0);
  const totalTheta = legs.reduce((sum, leg) => sum + legTheta, 0);
  ```

#### 4.2 Max Profit/Loss Calculation

Create utility functions for common strategies:

- Single options (long/short call/put)
- Vertical spreads (call/put spreads)
- Iron condors / butterflies
- Straddles / strangles

For complex or custom strategies:

- Use profit/loss simulation at key price points
- Or display "Custom Strategy" with calculated values at specific prices

#### 4.3 Buying Power Calculation

Simplified model for paper trading:

- **Debit strategies**: Net debit amount
- **Credit strategies with defined risk**: Max loss amount (spread width - credit)
- **Naked short options**: Conservative estimate (e.g., 20% of underlying × quantity × 100)

### 5. Backend Requirements

#### 5.1 New tRPC Procedures

Create `ordersRouter` with:

- `placeOrder`: Mutation to create and fill order(s)
  - Input: Array of OptionLeg objects, portfolioId
  - Validation: Check buying power, valid prices
  - Transaction: Create Order(s), Position(s), update Portfolio atomically
  - Return: Order ID(s) and success status

- `getPortfolioPositions`: Query to fetch portfolio with positions (for portfolio page)
  - Input: portfolioId (optional, use default)
  - Return: Portfolio with positions, current P&L, Greeks

#### 5.2 Database Transactions

Use Prisma transactions to ensure atomicity:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Create order records
  // 2. Create/update positions
  // 3. Update portfolio balance
});
```

#### 5.3 Portfolio Management

- Each user gets default portfolio with $100,000 starting balance (already in schema)
- For MVP: Use user's first/only portfolio
- Future: Support multiple portfolios

### 6. Portfolio Page Requirements

#### 6.1 Basic Portfolio View

After order placement, user is redirected to `/portfolio` showing:

- Account balance
- Total equity (cash + position values)
- List of open positions with:
  - Strategy name/description
  - P&L (unrealized)
  - Current Greeks
  - Entry date
- Basic position management (view details, close position)

#### 6.2 Future Enhancements (Out of Scope for v1)

- Position P&L charts
- Greeks over time
- Trade history
- Performance analytics

### 7. Technical Implementation Steps

#### 7.1 Frontend Components

1. **Refactor LegsPanel** (`LegsPanel.tsx`)
   - Add OrderSummary section with metrics
   - Add Greeks calculation and display
   - Add max profit/loss calculations
   - Replace collapse button with "Send Order" button

2. **Create OrderMetrics component**
   - Display aggregated Greeks
   - Display risk metrics
   - Display buying power requirement
   - Reusable for future order review screens

3. **Create utility functions** (`lib/options-math.ts`)
   - `calculatePortfolioGreeks(legs: OptionLeg[])`
   - `calculateMaxProfit(legs: OptionLeg[])`
   - `calculateMaxLoss(legs: OptionLeg[])`
   - `calculateBuyingPower(legs: OptionLeg[])`
   - `identifyStrategy(legs: OptionLeg[])` (optional, for strategy naming)

4. **Portfolio page** (`app/portfolio/page.tsx`)
   - Create new page component
   - Display portfolio summary
   - List positions with key metrics
   - Basic position cards/table

#### 7.2 Backend Implementation

1. **Create orders router** (`server/routers/orders.ts`)
   - `placeOrder` mutation
   - Input validation with Zod
   - Order execution logic
   - Portfolio updates

2. **Create portfolio router** (`server/routers/portfolio.ts`)
   - `getPortfolio` query
   - `getPositions` query with P&L calculations
   - Greeks aggregation at portfolio level

3. **Add to main router** (`server/routers/_app.ts`)
   - Export ordersRouter
   - Export portfolioRouter

#### 7.3 Type Definitions

1. **Extend OptionLeg type** if needed for Greeks
   - Add Greeks fields if not already present
   - Ensure consistency with OptionQuote interface

2. **Create Portfolio types** (`types/portfolio.ts`)
   - PortfolioSummary
   - PositionWithMetrics
   - PortfolioGreeks

### 8. Testing Considerations

#### 8.1 Order Placement Testing

- Test with single leg orders
- Test with multi-leg spreads
- Test buying power validation
- Test with insufficient funds
- Test Greeks calculations
- Verify database transactions are atomic

#### 8.2 UI Testing

- Verify all metrics display correctly
- Test responsive layout
- Test button states (enabled/disabled/loading)
- Test error states and messages

### 9. Success Criteria

The feature is complete when:

1. ✅ User can review order with all critical metrics (Delta, Theta, Max Loss, Max Profit, Buying Power)
2. ✅ UI is professional and clear
3. ✅ User can click "Send" to place order
4. ✅ Order is saved to database with all relationships
5. ✅ Portfolio balance is updated correctly
6. ✅ User is redirected to portfolio page
7. ✅ Portfolio page shows the new position(s)
8. ✅ All calculations are accurate

### 10. Future Enhancements (Post-MVP)

- Order types: Limit orders, stop orders
- Order modifications before submission
- Multi-portfolio support
- Strategy templates and quick selection
- Real-time Greeks updates
- Advanced risk analytics
- Position rolling and adjustments
- P&L charts and visualizations
- Order history with filtering
- Export trade data

## Notes

- **Simplicity First**: This is paper trading, not production trading. Focus on clarity and education.
- **No Complex Order Routing**: Instant fills at current market price.
- **Greeks are Educational**: Display prominently to help users learn.
- **Professional != Complex**: Clean, clear, and functional is better than feature-bloated.
