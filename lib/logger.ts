export function log (channel: string, msg: string): void {
  console.log(`[${(new Date()).toISOString()}]`, channel + ':', msg)
}

export function error (msg: string): void {
  console.error(`[${(new Date()).toISOString()}]`, 'ERROR:', msg)
}
