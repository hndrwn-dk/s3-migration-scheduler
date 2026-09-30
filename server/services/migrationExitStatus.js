const RESUMABLE_STATUSES = ['paused', 'failed', 'cancelled'];

function resolveProcessExitStatus(code, stopIntent) {
  if (stopIntent === 'pause') return 'paused';
  if (stopIntent === 'cancel') return 'cancelled';
  return code === 0 ? 'completed' : 'failed';
}

function canResumeMigration(status) {
  return RESUMABLE_STATUSES.includes(status);
}

module.exports = {
  RESUMABLE_STATUSES,
  resolveProcessExitStatus,
  canResumeMigration
};
