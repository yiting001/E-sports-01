import { SERVER_MIGRATION_DEFINITIONS } from './migration-registry';

export interface MigrationHistoryRecord {
  name: string;
  timestamp: number;
}

export function assertTrustedMigrationHistory(history: readonly MigrationHistoryRecord[]): void {
  const validationError = getMigrationHistoryValidationError(history);
  if (validationError) {
    throw new Error(validationError);
  }
}

export function getMigrationHistoryValidationError(
  history: readonly MigrationHistoryRecord[],
): string | null {
  if (history.length === 0 && SERVER_MIGRATION_DEFINITIONS.length > 0) {
    return (
      'typeorm_migrations is empty; run migration:audit and complete the manual ' +
      'baseline review before show/run'
    );
  }

  const seenTimestamps = new Set<number>();
  const seenNames = new Set<string>();
  for (const record of history) {
    if (seenTimestamps.has(record.timestamp) || seenNames.has(record.name)) {
      return `Migration history contains a duplicate entry: ${record.timestamp} ${record.name}`;
    }
    seenTimestamps.add(record.timestamp);
    seenNames.add(record.name);
  }

  if (history.length > SERVER_MIGRATION_DEFINITIONS.length) {
    return 'Database migration history is newer than this server bundle';
  }
  for (const [index, record] of history.entries()) {
    const expected = SERVER_MIGRATION_DEFINITIONS[index];
    if (record.timestamp !== expected?.timestamp || record.name !== expected.name) {
      return (
        `Migration history is not a continuous trusted prefix at position ${index + 1}: ` +
        `received ${record.timestamp} ${record.name}`
      );
    }
  }
  return null;
}
