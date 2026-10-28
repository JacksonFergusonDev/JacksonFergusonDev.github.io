/** Interpret the two badge states published by Protostar's rollback report.
 * @param {string} message
 */
export function rollbackMetric(message) {
  const failing = message.endsWith(' failing');
  return {
    label: failing ? 'Rollback faults failing' : 'Rollback faults restored',
    value: failing ? message.slice(0, -' failing'.length) : message,
  };
}
