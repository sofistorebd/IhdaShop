export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBackupScheduler } = await import("./lib/backup-scheduler");
  startBackupScheduler();
  const { startPurchaseScheduler } = await import("./lib/purchase-outbox");
  startPurchaseScheduler();
}
