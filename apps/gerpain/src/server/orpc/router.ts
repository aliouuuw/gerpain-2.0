import * as health from './health'
import * as me from './me'

export default {
  health: {
    ping: health.health,
  },
  me: {
    session: me.sessionInfo,
  },
}
