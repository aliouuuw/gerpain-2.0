import * as bakeries from './bakeries'
import * as collections from './collections'
import * as deliveries from './deliveries'
import * as health from './health'
import * as locations from './locations'
import * as me from './me'

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
  locations: {
    list: locations.list,
    get: locations.get,
    create: locations.create,
    update: locations.update,
    deactivate: locations.deactivate,
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
}
