// Executable contract reference; native implementations enforce the same checks.
export function acceptMessage(pin, origin, main, message) {
  try {
    const url = new URL(pin);
    return url.protocol === 'https:' && url.origin === pin && origin === pin && main === true &&
      ['bind','invalidate','connect','sync','disconnect'].includes(message.command) &&
      typeof message.requestId === 'string' && message.requestId.length > 0 && message.requestId.length <= 128 &&
      typeof message.accountScope === 'string' && message.accountScope.length > 0 && message.accountScope.length <= 128;
  } catch { return false; }
}
export class Binding {
  #scope = null; #epoch = 0;
  bind(scope) { this.#scope = scope; this.#epoch++; }
  invalidate() { this.#scope = null; this.#epoch++; }
  ticket() { return {scope:this.#scope, epoch:this.#epoch}; }
  current(ticket) { return this.#scope !== null && ticket.scope === this.#scope && ticket.epoch === this.#epoch; }
}
