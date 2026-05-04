/**
 * Jest Global Setup — runs once before all test suites
 * Suppresses the AggregateError that Prisma emits when the connection pool
 * is torn down by Jest's --forceExit before all async operations settle.
 */

// Swallow unhandled AggregateErrors from Prisma connection pool teardown
process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason instanceof Error &&
    (reason.constructor.name === "AggregateError" || reason.name === "AggregateError")
  ) {
    return;
  }
  throw reason;
});
