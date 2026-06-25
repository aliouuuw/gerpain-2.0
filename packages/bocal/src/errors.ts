export class BocalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BocalError'
  }
}

export class UnbalancedPostingError extends BocalError {
  constructor(debitTotal: number, creditTotal: number) {
    super(
      `Posting is unbalanced: debits=${debitTotal}, credits=${creditTotal}`,
    )
    this.name = 'UnbalancedPostingError'
  }
}

export class MovementNotFoundError extends BocalError {
  constructor(movementId: string) {
    super(`Movement not found: ${movementId}`)
    this.name = 'MovementNotFoundError'
  }
}

export class AccountNotFoundError extends BocalError {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`)
    this.name = 'AccountNotFoundError'
  }
}

export class AccountOrganizationMismatchError extends BocalError {
  constructor(accountId: string, organizationId: string) {
    super(
      `Account ${accountId} does not belong to organization ${organizationId}`,
    )
    this.name = 'AccountOrganizationMismatchError'
  }
}

export class BocalValidationError extends BocalError {
  constructor(message: string) {
    super(message)
    this.name = 'BocalValidationError'
  }
}
