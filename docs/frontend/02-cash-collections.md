# Cash Collections Page Specification

## Overview

The Cash Collections page is a critical component of Gerpain MVP, enabling delivery personnel to record their cash collections and managers to validate them. This page handles the entire cash collection workflow from expected amount calculation to final validation.

---

## Business Requirements

### Core Functionality
1. **Expected Amount Calculation**: Automatically calculate expected cash based on delivery runs
2. **Collection Recording**: Allow employees to record actual collected amounts
3. **Variance Tracking**: Highlight discrepancies between expected and actual amounts
4. **Validation Workflow**: Manager approval process for collections
5. **Reporting**: Generate collection reports and receipts

### User Roles
- **Delivery Personnel**: Record collections for their assigned runs
- **Managers**: Review and validate collections, handle discrepancies
- **Accountants**: Generate reports and handle reconciliations

### Business Rules
- Collections must be recorded daily for each delivery run
- Variance tolerance: ±2% requires no explanation
- Variance 2-10% requires notes
- Variance >10% requires manager approval
- Collections cannot be modified after validation

---

## Page Structure

### Layout Overview
```
┌─────────────────────────────────────────────────────────┐
│ Header: Date Selector + Status Summary                    │
├─────────────────────────────────────────────────────────┤
│ Summary Cards: Expected, Collected, Variance             │
├─────────────────────────────────────────────────────────┤
│ Collections Table                                        │
│ ┌─────────┬──────────┬──────────┬─────────┬──────────┐ │
│ │ Employee│ Expected │ Actual   │ Variance│ Status   │ │
│ └─────────┴──────────┴──────────┴─────────┴──────────┘ │
├─────────────────────────────────────────────────────────┤
│ Bulk Actions Bar                                         │
└─────────────────────────────────────────────────────────┘
```

### Responsive Behavior
- **Desktop**: Full table with all columns visible
- **Tablet**: Horizontal scroll for table, stacked summary cards
- **Mobile**: Card-based layout for collections, collapsible details

---

## Header Section

### Date Selector
**Component**: DatePicker component
- Default: Today's date
- Range: Single day selection
- Navigation: Previous/Next day buttons
- Quick actions: Today, Yesterday, This Week

### Status Summary
**Metrics Display**:
- Total Expected Amount
- Total Collected Amount
- Total Variance (absolute and percentage)
- Collections Status Breakdown
  - Pending collections count
  - Submitted collections count
  - Validated collections count

**Visual Indicators**:
- Color-coded variance (green/yellow/red)
- Progress bars for completion status
- Trend arrows vs previous day

---

## Summary Cards

### Card Components
1. **Expected Amount Card**
   - Total expected from all delivery runs
   - Breakdown by employee
   - Calculation method tooltip

2. **Collected Amount Card**
   - Total actually collected
   - Payment method breakdown
   - Collection completion percentage

3. **Variance Card**
   - Total variance amount
   - Variance percentage
   - Color-coded status
   - Trend indicator

4. **Status Card**
   - Collections by status
   - Validation queue size
   - Overdue collections alert

### Card Interactions
- Click to view detailed breakdown
- Export to CSV functionality
- Print summary option
- Drill-down to individual collections

---

## Collections Table

### Table Structure
**Columns**:
1. **Employee Information**
   - Employee name (linked to profile)
   - Route/Location assignment
   - Employee photo (optional)

2. **Expected Amount**
   - Calculated from delivery runs
   - Breakdown tooltip (products × quantities)
   - Last updated timestamp

3. **Actual Amount**
   - Input field for unrecorded collections
   - Display for recorded collections
   - Payment method breakdown

4. **Variance**
   - Calculated difference
   - Percentage variance
   - Color-coded background
   - Status icon

5. **Status Badge**
   - Pending (gray)
   - Submitted (blue)
   - Validated (green)
   - Rejected (red)

6. **Actions**
   - Collect button (for pending)
   - Edit button (for submitted)
   - View details (all)
   - Validate button (managers only)

### Table Features
- **Sorting**: By all columns
- **Filtering**: By status, variance range, employee
- **Search**: Employee name, route
- **Pagination**: 25 items per page
- **Bulk Selection**: Checkbox for bulk operations

### Row States
- **Normal**: Standard display
- **Editing**: Inline edit mode for amounts
- **Loading**: Saving state with spinner
- **Error**: Validation error display
- **Selected**: Checkbox checked state

---

## Collection Form Dialog

### Trigger Conditions
- Click "Collect" button for pending collection
- Click "Edit" button for submitted collection
- Bulk collection action

### Form Structure
```
┌─────────────────────────────────────────┐
│ Header: Employee Name + Date            │
├─────────────────────────────────────────┤
│ Expected Amount Display                 │
├─────────────────────────────────────────┤
│ Actual Amount Input                     │
├─────────────────────────────────────────┤
│ Payment Method Breakdown                │
│ ☐ Cash: _______                         │
│ ☐ Card: _______                         │
│ ☐ Mobile Money: _______                 │
├─────────────────────────────────────────┤
│ Variance Display + Notes Field          │
├─────────────────────────────────────────┤
│ Action Buttons: Cancel / Submit         │
└─────────────────────────────────────────┘
```

### Form Fields

#### Expected Amount
- **Display**: Read-only, calculated value
- **Tooltip**: Breakdown of calculation
- **Info Icon**: Shows delivery run details

#### Actual Amount
- **Input**: Numeric input with currency formatting
- **Validation**: Cannot be negative
- **Auto-calculation**: Sum of payment methods
- **Real-time variance**: Updates as user types

#### Payment Methods
- **Cash**: Primary collection method
- **Card**: Credit/debit card collections
- **Mobile Money**: Mobile payment platforms
- **Other**: Custom payment types

#### Notes Section
- **Conditional**: Required for variance > 2%
- **Character Limit**: 500 characters
- **Placeholder**: Explain discrepancy reason
- **Template**: Common reasons dropdown

### Form Validation
- **Real-time**: Validate as user types
- **On Submit**: Comprehensive validation
- **Error Display**: Field-level error messages
- **Success Feedback**: Toast notification

---

## Status Management

### Status Flow
```
Pending → Submitted → Validated
    ↓         ↓         ↑
 Rejected ←─────────────┘
```

### Status Definitions

#### Pending
- **Description**: Collection not yet recorded
- **Actions**: Record collection
- **Permissions**: Employee can collect
- **Color**: Gray

#### Submitted
- **Description**: Collection recorded, awaiting validation
- **Actions**: Edit collection, Validate (manager)
- **Permissions**: Employee can edit, Manager can validate
- **Color**: Blue

#### Validated
- **Description**: Collection approved and finalized
- **Actions**: View details only
- **Permissions**: Read-only for all
- **Color**: Green

#### Rejected
- **Description**: Collection rejected, requires resubmission
- **Actions**: Edit and resubmit
- **Permissions**: Employee can edit
- **Color**: Red

### Status Transitions
- **Pending → Submitted**: Employee records collection
- **Submitted → Validated**: Manager approves
- **Submitted → Rejected**: Manager rejects with reason
- **Rejected → Submitted**: Employee resubmits corrected data

---

## Bulk Operations

### Bulk Selection
- **Selection Method**: Checkbox in table header
- **Visual Feedback**: Row highlighting
- **Selection Info**: "X items selected" display
- **Clear Selection**: Deselect all button

### Bulk Actions
1. **Bulk Submit**
   - Submit multiple pending collections
   - Confirmation dialog with summary
   - Progress indicator for batch operation

2. **Bulk Validate**
   - Validate multiple submitted collections
   - Manager-only permission
   - Variance warnings for high discrepancies

3. **Bulk Export**
   - Export selected collections to CSV
   - Include all collection details
   - Download with timestamp

4. **Bulk Print**
   - Generate printable receipts
   - Format for mobile printing
   - Include signatures lines

### Bulk Operations UI
- **Action Bar**: Fixed position when items selected
- **Progress**: Real-time progress for operations
- **Error Handling**: Individual item error reporting
- **Rollback**: Undo capability for failed operations

---

## Permission System

### Role-Based Access
- **Delivery Personnel**:
  - View own collections only
  - Create/edit collections
  - Cannot validate others' collections

- **Location Manager**:
  - View all location collections
  - Validate collections
  - Edit any collection
  - Access to reports

- **Chain Administrator**:
  - View all chain collections
  - All permissions
  - System configuration
  - Audit trail access

### Permission Checks
- **UI Level**: Hide/disable actions based on permissions
- **API Level**: Enforce permissions on server
- **Error Handling**: Graceful permission denied messages

---

## Error Handling

### Validation Errors
- **Field Level**: Real-time validation feedback
- **Form Level**: Comprehensive error summary
- **API Level**: Server-side validation messages

### Network Errors
- **Offline Mode**: Queue operations for sync
- **Retry Logic**: Automatic retry with backoff
- **User Feedback**: Clear error messages
- **Recovery Options**: Manual retry, refresh page

### Data Conflicts
- **Concurrent Editing**: Optimistic locking
- **Conflict Resolution**: User choice dialog
- **Data Refresh**: Automatic reload on conflict
- **Loss Prevention**: Warning before navigation

---

## Performance Considerations

### Data Loading
- **Lazy Loading**: Load collections on demand
- **Pagination**: Limit to 25 items per page
- **Caching**: Cache collection data
- **Background Sync**: Update data periodically

### UI Performance
- **Virtual Scrolling**: For large tables
- **Debounced Input**: Delay search/filter operations
- **Memoization**: Cache expensive calculations
- **Optimistic Updates**: Immediate UI feedback

### Mobile Optimization
- **Touch Targets**: Minimum 44px touch areas
- **Simplified UI**: Card-based layout on mobile
- **Offline Support**: Basic functionality offline
- **Progressive Enhancement**: Core features first

---

## Accessibility Requirements

### Keyboard Navigation
- **Tab Order**: Logical navigation flow
- **Shortcuts**: Common action shortcuts
- **Focus Management**: Visible focus indicators
- **Skip Links**: Jump to main content

### Screen Reader Support
- **Labels**: Descriptive labels for all controls
- **Announcements**: Status changes announced
- **Structure**: Proper heading hierarchy
- **Tables**: Proper table headers

### Visual Accessibility
- **Color Contrast**: WCAG AA compliance
- **Text Size**: Resizable up to 200%
- **High Contrast**: System preference support
- **Reduced Motion**: Respect user preferences

---

## Testing Strategy

### Unit Tests
- Component rendering
- Form validation
- Status transitions
- Permission checks

### Integration Tests
- API integration
- User workflows
- Error scenarios
- Data persistence

### E2E Tests
- Complete collection workflow
- Bulk operations
- Permission boundaries
- Mobile responsiveness

### Performance Tests
- Large dataset handling
- Network conditions
- Memory usage
- Render performance

---

## Analytics and Tracking

### User Actions
- Collection creation/editing
- Validation actions
- Bulk operations
- Export/print actions

### Performance Metrics
- Page load time
- Form completion time
- Error rates
- Feature usage

### Business Metrics
- Collection completion rates
- Variance patterns
- Processing times
- User satisfaction

---

## Future Enhancements

### Advanced Features
- **Machine Learning**: Variance prediction
- **Mobile App**: Native collection app
- **Integration**: POS system integration
- **Automation**: Automatic bank reconciliation

### Reporting Enhancements
- **Custom Reports**: User-defined report builder
- **Scheduled Reports**: Automated report delivery
- **Data Visualization**: Interactive charts
- **Export Options**: Multiple format support

### Workflow Improvements
- **Approval Chains**: Multi-level validation
- **Notifications**: Real-time alerts
- **Comments**: Discussion threads
- **Audit Trail**: Complete change history
