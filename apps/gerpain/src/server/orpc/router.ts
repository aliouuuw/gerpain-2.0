import * as bakeries from './bakeries'
import * as categories from './categories'
import * as collections from './collections'
import * as deliveries from './deliveries'
import * as employees from './employees'
import * as health from './health'
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
  },
  categories: {
    list: categories.list,
    get: categories.get,
    create: categories.create,
    update: categories.update,
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
    deactivate: products.deactivate,
  },
  collections: {
    list: collections.list,
    get: collections.get,
    update: collections.update,
    submit: collections.submit,
    validate: collections.validate,
    reject: collections.reject,
    settle: collections.settle,
  },
  deliveries: {
    listRuns: deliveries.listRuns,
    getRun: deliveries.getRun,
    updateItem: deliveries.updateItem,
    validateRun: deliveries.validateRun,
  },
  employees: {
    list: employees.list,
    get: employees.get,
    create: employees.create,
    update: employees.update,
    listProducts: employees.listProducts,
    setProducts: employees.setProducts,
  },
}
