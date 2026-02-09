# Migration Plan

This document outlines the comprehensive migration strategy for transitioning from the current Gerpain bakery system to the new Hono-based ERP system. The plan ensures minimal disruption to operations while maximizing data integrity and system performance.

## 🎯 Migration Goals

### Primary Objectives
- **Zero Data Loss**: Complete data preservation during migration
- **Minimal Downtime**: Target maximum 4 hours of system downtime
- **Business Continuity**: Ensure operations continue during transition
- **Data Integrity**: Maintain data accuracy and consistency
- **Performance Improvement**: Achieve better system performance

### Success Metrics
- 100% data accuracy verification
- < 4 hours total system downtime
- 0% data loss
- 95% user satisfaction with new system
- 20% improvement in system performance

## 📋 Migration Phases

### Phase 1: Preparation (2-3 weeks)
- [ ] **Environment Setup**
  - Deploy new system infrastructure
  - Configure development, staging, and production environments
  - Set up monitoring and logging systems

- [ ] **Data Analysis**
  - Analyze current data structure and relationships
  - Identify data quality issues and inconsistencies
  - Map current schema to new schema

- [ ] **Migration Scripts Development**
  - Create data transformation scripts
  - Develop data validation tools
  - Build rollback mechanisms

- [ ] **Testing Environment Preparation**
  - Clone production data to test environment
  - Validate migration scripts in test environment
  - Performance testing with production-like data volumes

### Phase 2: Pilot Migration (1 week)
- [ ] **Select Pilot Location**
  - Choose one location with moderate complexity
  - Coordinate with location management
  - Schedule pilot migration during low-traffic period

- [ ] **Execute Pilot Migration**
  - Run migration scripts for pilot location
  - Validate data integrity and business logic
  - Collect feedback from pilot users

- [ ] **Refine Migration Process**
  - Address issues discovered during pilot
  - Optimize migration scripts
  - Update documentation and procedures

### Phase 3: Full Migration (2-3 weeks)
- [ ] **Schedule Migrations by Location**
  - Create detailed migration schedule
  - Coordinate with all location managers
  - Prepare communication plan

- [ ] **Execute Location Migrations**
  - Migrate locations one by one
  - Validate each migration before proceeding
  - Provide support during transition

- [ ] **Post-Migration Validation**
  - Verify data integrity across all locations
  - Test business workflows
  - Validate reporting and analytics

### Phase 4: Go-Live and Optimization (Ongoing)
- [ ] **System Go-Live**
  - Switch all users to new system
  - Monitor system performance
  - Provide immediate support

- [ ] **Performance Optimization**
  - Fine-tune system performance
  - Optimize database queries
  - Implement caching strategies

- [ ] **Continuous Improvement**
  - Collect user feedback
  - Implement improvements
  - Plan future enhancements

## 🔄 Data Migration Strategy

### Current Schema Analysis

#### Key Entities to Migrate
1. **Admins** → **Bakery Chains**
2. **Stores** → **Locations**
3. **Shops** → **Retail Locations**
4. **Employees** → **Employees** (with new structure)
5. **BreadTypes** → **Products**
6. **StockItems** → **Inventory Items**
7. **StockMovements** → **Inventory Transactions**
8. **Deliveries** → **Delivery Transactions**
9. **CashCollections** → **Cash Collections**
10. **PaySlips** → **Payroll Items**

### Data Transformation Rules

#### Admin → Bakery Chain Mapping
```sql
-- Migration script for bakery chains
INSERT INTO bakery_chains (
    name, 
    description, 
    contact_email, 
    contact_phone,
    created_at, 
    updated_at
)
SELECT 
    bakeryChain, 
    NULL, 
    NULL, 
    NULL,
    created_at, 
    updated_at
FROM old_admin_table
WHERE bakeryChain IS NOT NULL
ON CONFLICT (name) DO NOTHING;
```

#### Store → Location Mapping
```sql
-- Migration script for locations
INSERT INTO locations (
    bakery_chain_id,
    location_type_id,
    name,
    code,
    address,
    city,
    region,
    postal_code,
    country,
    phone,
    email,
    is_active,
    created_at,
    updated_at
)
SELECT 
    bc.id,
    1, -- Default to retail type
    os.name,
    'LOC-' || os.id, -- Generate location code
    COALESCE(os.address, 'Address not provided'),
    NULL,
    NULL,
    NULL,
    'Senegal',
    NULL,
    NULL,
    true,
    os.created_at,
    os.updated_at
FROM old_store_table os
JOIN bakery_chains bc ON bc.name = os.admin_bakery_chain
WHERE os.name IS NOT NULL
ON CONFLICT (bakery_chain_id, name) DO NOTHING;
```

#### Employee Transformation
```sql
-- Migration script for employees
INSERT INTO employees (
    employee_code,
    bakery_chain_id,
    location_id,
    department_id,
    role_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    date_of_birth,
    hire_date,
    is_active,
    created_at,
    updated_at
)
SELECT 
    'EMP-' || oe.id,
    bc.id,
    l.id,
    NULL, -- Will be mapped later
    er.id, -- Will be mapped based on role
    oe.name,
    NULL, -- Split name if needed
    oe.email,
    oe.phoneNumber,
    oe.address,
    NULL, -- Date of birth not in old system
    oe.createdAt,
    oe.isActive,
    oe.createdAt,
    oe.updatedAt
FROM old_employee_table oe
JOIN bakery_chains bc ON bc.name = oe.admin_bakery_chain
JOIN locations l ON l.name = oe.store_name
JOIN employee_roles er ON er.name = oe.role
WHERE oe.name IS NOT NULL
ON CONFLICT (employee_code) DO NOTHING;
```

#### Product Transformation
```sql
-- Migration script for products
INSERT INTO products (
    name,
    sku,
    description,
    unit_of_measure,
    category,
    is_active,
    created_at,
    updated_at
)
SELECT 
    bt.type,
    'BT-' || bt.id,
    NULL,
    'unit',
    'bread',
    true,
    bt.createdAt,
    bt.updatedAt
FROM old_bread_type_table bt
WHERE bt.type IS NOT NULL
ON CONFLICT (sku) DO NOTHING;
```

#### Inventory Transformation
```sql
-- Migration script for inventory items
INSERT INTO inventory_items (
    location_id,
    item_type,
    item_id,
    current_quantity,
    reserved_quantity,
    available_quantity,
    reorder_point,
    max_stock_level,
    unit_of_measure,
    last_counted_at,
    created_at,
    updated_at
)
SELECT 
    l.id,
    'product',
    p.id,
    COALESCE(si.quantity, 0),
    0,
    COALESCE(si.quantity, 0),
    10, -- Default reorder point
    100, -- Default max stock
    'unit',
    NULL,
    si.createdAt,
    si.updatedAt
FROM old_stock_item_table si
JOIN locations l ON l.name = si.store_name
JOIN products p ON p.name = si.bread_type
WHERE si.bread_type IS NOT NULL
ON CONFLICT (location_id, item_type, item_id) DO UPDATE
SET 
    current_quantity = EXCLUDED.current_quantity,
    available_quantity = EXCLUDED.available_quantity,
    updated_at = NOW();
```

#### Sales Transaction Transformation
```sql
-- Migration script for sales transactions
INSERT INTO sales_transactions (
    transaction_number,
    location_id,
    employee_id,
    transaction_type,
    total_amount,
    payment_method,
    transaction_date,
    notes,
    created_at,
    updated_at
)
SELECT 
    'TXN-' || dt.id || '-' || dt.date,
    l.id,
    e.id,
    'direct_sale',
    dt.revenue,
    'cash',
    dt.date,
    dt.notes,
    dt.createdAt,
    dt.updatedAt
FROM old_delivery_table dt
JOIN locations l ON l.name = dt.store_name
JOIN employees e ON e.id = dt.employee_id
WHERE dt.revenue IS NOT NULL
ON CONFLICT (transaction_number) DO NOTHING;

-- Then migrate sales items
INSERT INTO sales_items (
    sales_transaction_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    created_at,
    updated_at
)
SELECT 
    st.id,
    p.id,
    JSON_EXTRACT(dt.outgoing_bread, '$.quantity'),
    JSON_EXTRACT(dt.outgoing_bread, '$.unit_price'),
    JSON_EXTRACT(dt.outgoing_bread, '$.total_price'),
    dt.createdAt,
    dt.updatedAt
FROM old_delivery_table dt
JOIN sales_transactions st ON st.transaction_number = 'TXN-' || dt.id || '-' || dt.date
JOIN products p ON p.name = JSON_EXTRACT(dt.outgoing_bread, '$.product_name')
WHERE dt.outgoing_bread IS NOT NULL;
```

#### Cash Collection Transformation
```sql
-- Migration script for cash collections
INSERT INTO cash_collections (
    location_id,
    employee_id,
    collection_period_start,
    collection_period_end,
    expected_amount,
    actual_amount,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    l.id,
    e.id,
    cc.month || '-01', -- Convert to first day of month
    cc.month || '-31', -- Convert to last day of month
    cc.revenue,
    cc.collectedCash,
    CASE 
        WHEN cc.isPaid THEN 'reconciled'
        WHEN cc.collectedCash IS NOT NULL THEN 'collected'
        ELSE 'pending'
    END,
    cc.notes,
    cc.createdAt,
    cc.updatedAt
FROM old_cash_collection_table cc
JOIN locations l ON l.name = cc.store_name
JOIN employees e ON e.id = cc.employee_id
WHERE cc.revenue IS NOT NULL
ON CONFLICT (location_id, employee_id, collection_period_start) DO NOTHING;
```

## 🧪 Migration Testing Strategy

### Test Environment Setup
```bash
# Create test database
createdb gerpain_erp_test

# Restore production backup to test database
pg_restore -d gerpain_erp_test /path/to/production-backup.dump

# Run migration scripts in test environment
bun run db:migrate
bun run db:seed

# Validate migration results
bun run migration:validate
```

### Data Validation Scripts
```typescript
// src/tests/migration/validator.ts
export class MigrationValidator {
  async validateDataIntegrity() {
    // Check for orphaned records
    const orphanedRecords = await this.checkOrphanedRecords();
    if (orphanedRecords.length > 0) {
      throw new Error(`Found ${orphanedRecords.length} orphaned records`);
    }

    // Check data completeness
    const completeness = await this.checkDataCompleteness();
    if (completeness < 95) {
      throw new Error(`Data completeness is ${completeness}%, expected 95%`);
    }

    // Check business rules
    const businessRules = await this.validateBusinessRules();
    if (!businessRules.valid) {
      throw new Error(`Business rules validation failed: ${businessRules.errors.join(', ')}`);
    }

    return true;
  }

  private async checkOrphanedRecords() {
    // Check for records without proper relationships
    const results = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM sales_transactions st
      LEFT JOIN locations l ON st.location_id = l.id
      WHERE l.id IS NULL
    `);
    return results;
  }

  private async checkDataCompleteness() {
    // Calculate data completeness percentage
    const totalRecords = await db.execute(sql`
      SELECT COUNT(*) as count FROM old_table
    `);
    
    const migratedRecords = await db.execute(sql`
      SELECT COUNT(*) as count FROM new_table
    `);
    
    return (migratedRecords / totalRecords) * 100;
  }

  private async validateBusinessRules() {
    const errors = [];
    
    // Check inventory balances
    const inventoryErrors = await this.validateInventoryBalances();
    if (inventoryErrors.length > 0) {
      errors.push(...inventoryErrors);
    }
    
    // Check cash collection totals
    const cashErrors = await this.validateCashCollections();
    if (cashErrors.length > 0) {
      errors.push(...cashErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### Performance Testing
```typescript
// src/tests/migration/performance.ts
export class MigrationPerformanceTester {
  async testMigrationPerformance() {
    const testScenarios = [
      { name: 'Small Location', records: 1000 },
      { name: 'Medium Location', records: 10000 },
      { name: 'Large Location', records: 100000 },
    ];

    const results = [];

    for (const scenario of testScenarios) {
      const startTime = Date.now();
      
      // Run migration for scenario
      await this.runMigrationScenario(scenario.records);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        scenario: scenario.name,
        records: scenario.records,
        duration,
        recordsPerSecond: scenario.records / (duration / 1000)
      });
    }

    return results;
  }

  private async runMigrationScenario(recordCount: number) {
    // Simulate migration with test data
    await db.transaction(async (tx) => {
      for (let i = 0; i < recordCount; i++) {
        await tx.insert(salesTransactions).values({
          transactionNumber: `TEST-${i}`,
          locationId: 1,
          employeeId: 1,
          transactionType: 'direct_sale',
          totalAmount: '1000',
          paymentMethod: 'cash',
          transactionDate: new Date(),
        });
      }
    });
  }
}
```

## 🚨 Risk Management

### Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Data Loss | Low | High | Comprehensive backup and validation |
| System Downtime | Medium | High | Phased migration with rollback capability |
| Performance Issues | Medium | Medium | Performance testing and optimization |
| User Resistance | High | Medium | Training and communication plan |
| Data Corruption | Low | High | Validation scripts and rollback procedures |

### Mitigation Strategies

#### Data Loss Prevention
```bash
# Create comprehensive backup
pg_dump -Fc gerpain_production > backup-$(date +%Y%m%d).dump

# Verify backup integrity
pg_restore -l backup-$(date +%Y%m%d).dump > backup-list.txt
```

#### Rollback Procedures
```typescript
// src/migration/rollback.ts
export class MigrationRollback {
  async rollbackToVersion(version: string) {
    console.log(`Rolling back to version ${version}`);
    
    // Restore from backup
    await this.restoreFromBackup(version);
    
    // Recreate indexes and constraints
    await this.recreateSchema();
    
    // Verify rollback success
    await this.validateRollback();
    
    console.log('Rollback completed successfully');
  }

  private async restoreFromBackup(version: string) {
    // Execute restore from backup
    await exec(`pg_restore -d gerpain_production backup-${version}.dump`);
  }

  private async recreateSchema() {
    // Recreate indexes and constraints
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sales_transaction_date ON sales_transactions(transaction_date)`);
    // ... other indexes
  }

  private async validateRollback() {
    // Verify data integrity after rollback
    const validator = new MigrationValidator();
    await validator.validateDataIntegrity();
  }
}
```

## 📞 Communication Plan

### Stakeholder Communication

#### Executive Management
- **Frequency**: Weekly updates during migration
- **Content**: Progress reports, milestones, risks
- **Format**: Email and dashboard

#### Location Managers
- **Frequency**: Daily updates during their location migration
- **Content**: Schedule, preparation steps, support contacts
- **Format**: Email and phone calls

#### End Users
- **Frequency**: As needed
- **Content**: Training materials, FAQs, support contacts
- **Format**: Email, posters, and in-person sessions

### Communication Templates

#### Migration Announcement
```markdown
Subject: Important: System Migration Notice

Dear Team,

We are excited to announce that we will be migrating to our new bakery ERP system starting [Date]. This upgrade will provide significant improvements in:

- Performance and reliability
- User experience
- Reporting capabilities
- Mobile accessibility

**Migration Schedule:**
- [Location 1]: [Date] [Time]
- [Location 2]: [Date] [Time]
- [Location 3]: [Date] [Time]

**What to Expect:**
- Brief downtime during migration (max 4 hours)
- Training sessions will be provided
- Support team will be available during transition

**Preparation:**
- Ensure all data is backed up
- Complete any pending transactions
- Attend training sessions

For questions or concerns, please contact:
- IT Support: [Email/Phone]
- Migration Team: [Email/Phone]

Thank you for your cooperation during this important upgrade.

Best regards,
The Gerpain Team
```

## 📊 Monitoring and Support

### Post-Migration Monitoring
```typescript
// src/monitoring/migration.ts
export class MigrationMonitor {
  async monitorMigration() {
    const metrics = {
      dataIntegrity: await this.checkDataIntegrity(),
      systemPerformance: await this.checkSystemPerformance(),
      userAdoption: await this.checkUserAdoption(),
      errorRate: await this.checkErrorRate(),
    };

    // Alert on critical issues
    if (metrics.dataIntegrity < 95) {
      await this.alert('Data integrity below threshold', metrics);
    }

    if (metrics.errorRate > 5) {
      await this.alert('High error rate detected', metrics);
    }

    return metrics;
  }

  private async checkDataIntegrity() {
    // Calculate data integrity score
    const validator = new MigrationValidator();
    const results = await validator.validateDataIntegrity();
    return results.score;
  }

  private async checkSystemPerformance() {
    // Monitor system performance metrics
    const responseTime = await this.measureResponseTime();
    const throughput = await this.measureThroughput();
    
    return { responseTime, throughput };
  }
}
```

### Support Procedures
```typescript
// src/support/migration.ts
export class MigrationSupport {
  async handleSupportRequest(request: SupportRequest) {
    const { type, location, user, description } = request;

    switch (type) {
      case 'data_issue':
        return await this.handleDataIssue(location, user, description);
      case 'system_error':
        return await this.handleSystemError(location, user, description);
      case 'training_request':
        return await this.handleTrainingRequest(location, user, description);
      default:
        return await this.handleGenericRequest(request);
    }
  }

  private async handleDataIssue(location: string, user: string, description: string) {
    // Log issue and investigate
    await this.logDataIssue(location, user, description);
    
    // Check data integrity
    const integrity = await this.checkLocationDataIntegrity(location);
    
    if (integrity < 95) {
      // Escalate to migration team
      await this.escalateToMigrationTeam(location, 'Data integrity issue');
    } else {
      // Provide user guidance
      return this.provideDataGuidance(location, user);
    }
  }
}
```

## 📈 Success Criteria and Completion

### Migration Completion Checklist

#### Technical Criteria
- [ ] All data migrated successfully (100% completion)
- [ ] Data integrity verified (95%+ accuracy)
- [ ] System performance meets or exceeds targets
- [ ] All business workflows functional
- [ ] Backup and recovery procedures tested

#### Business Criteria
- [ ] All locations migrated
- [ ] User adoption rate > 80%
- [ ] Support ticket volume < 10% of normal
- [ ] Business continuity maintained
- [ ] Training completed for all users

#### Documentation Criteria
- [ ] Migration documentation complete
- [ ] User guides and manuals updated
- [ ] Technical documentation updated
- [ ] Training materials created
- [ ] Lessons learned documented

### Post-Migration Review
```typescript
// src/review/migration.ts
export class MigrationReview {
  async conductReview() {
    const review = {
      technical: await this.technicalReview(),
      business: await this.businessReview(),
      user: await this.userReview(),
      lessons: await this.captureLessons(),
    };

    // Generate report
    await this.generateReport(review);

    // Plan improvements
    await this.planImprovements(review);

    return review;
  }

  private async technicalReview() {
    return {
      performance: await this.analyzePerformance(),
      reliability: await this.analyzeReliability(),
      scalability: await this.analyzeScalability(),
    };
  }

  private async businessReview() {
    return {
      efficiency: await this.measureEfficiency(),
      accuracy: await this.measureAccuracy(),
      compliance: await this.checkCompliance(),
    };
  }
}
```

This comprehensive migration plan ensures a smooth transition to the new Gerpain bakery ERP system while maintaining business continuity and data integrity.
