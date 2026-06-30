import * as bakeries from './bakeries'
import * as categories from './categories'
import * as collections from './collections'
import * as dashboard from './dashboard'
import * as deliveries from './deliveries'
import * as employees from './employees'
import * as health from './health'
import * as leaveRequests from './leave-requests'
import * as locations from './locations'
import * as me from './me'
import * as products from './products'

export default {
  health: {
    ping: health.health,
  },
  me: {
    session: me.sessionInfo,
    access: me.access,
  },
  bakeries: {
    list: bakeries.list,
    get: bakeries.get,
    update: bakeries.update,
  },
  categories: {
    list: categories.list,
    get: categories.get,
    create: categories.create,
    update: categories.update,
    reorder: categories.reorder,
    deactivate: categories.deactivate,
  },
  locations: {
    list: locations.list,
    get: locations.get,
    create: locations.create,
    update: locations.update,
    deactivate: locations.deactivate,
  },
  products: {
    list: products.list,
    get: products.get,
    create: products.create,
    update: products.update,
    reorder: products.reorder,
    deactivate: products.deactivate,
  },
  collections: {
    list: collections.list,
    get: collections.get,
    overview: collections.overview,
    getLedgerMovement: collections.getLedgerMovement,
    update: collections.update,
    submit: collections.submit,
    validate: collections.validate,
    reject: collections.reject,
    settle: collections.settle,
    archive: collections.archive,
    unarchive: collections.unarchive,
  },
  dashboard: {
    summary: dashboard.summary,
    dayActivity: dashboard.dayActivity,
  },
  deliveries: {
    listRuns: deliveries.listRuns,
    prepareDay: deliveries.prepareDay,
    getRun: deliveries.getRun,
    updateItem: deliveries.updateItem,
    validateRun: deliveries.validateRun,
  },
  employees: {
    list: employees.list,
    get: employees.get,
    create: employees.create,
    update: employees.update,
    reorder: employees.reorder,
    listProducts: employees.listProducts,
    setProducts: employees.setProducts,
  },
  leaveRequests: {
    list: leaveRequests.list,
    create: leaveRequests.create,
    approve: leaveRequests.approve,
    reject: leaveRequests.reject,
    cancel: leaveRequests.cancel,
  },
}
