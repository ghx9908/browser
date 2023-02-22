const EventEmitter = require("events")
class GPU extends EventEmitter {}
const gpu = new GPU()
module.exports = gpu
