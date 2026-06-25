import * as bakeries from './bakeries'
import * as collections from './collections'
import * as deliveries from './deliveries'
import * as health from './health'
import * as me from './me'

export default {
  health: {
    ping: health.health,
  },
  me: {
    session: me.sessionInfo,
  },
  bakeries: {
    list: bakeries.list,
  },
  collections: {
    list: collections.list,
    get: collections.get,
    update: collections.update,
    submit: collections.submit,
    validate: collections.validate,
    reject: collections.reject,
  },
  deliveries: {
    listRuns: deliveries.listRuns,
    getRun: deliveries.getRun,
    updateItem: deliveries.updateItem,
    validateRun: deliveries.validateRun,
  },
}
