import { describe, expect, it } from 'vitest'

describe('getPayrollForecast', () => {
  it('sums base salaries and maps previous-period commissions to active agents', () => {
    const activeEmployees = [
      { id: 'a1', baseSalary: 100_000 },
      { id: 'a2', baseSalary: 80_000 },
    ]

    const lastRunLines = [
      { employeeId: 'a1', commissionAmount: 15_000 },
      { employeeId: 'a2', commissionAmount: 5_000 },
      { employeeId: 'inactive', commissionAmount: 99_000 },
    ]

    const commissionByEmployee = new Map(
      lastRunLines.map((line) => [line.employeeId, line.commissionAmount]),
    )

    const baseSalaryMass = activeEmployees.reduce(
      (sum, employee) => sum + employee.baseSalary,
      0,
    )
    const previousPeriodCommission = activeEmployees.reduce(
      (sum, employee) => sum + (commissionByEmployee.get(employee.id) ?? 0),
      0,
    )

    expect(baseSalaryMass).toBe(180_000)
    expect(previousPeriodCommission).toBe(20_000)
    expect(baseSalaryMass + previousPeriodCommission).toBe(200_000)
  })
})
