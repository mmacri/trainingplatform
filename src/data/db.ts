import Dexie, { type Table } from "dexie";
import type { AppData, TableName } from "./schema";
import { tableNames } from "./schema";
import { createSeedData } from "./seed";
import { addLearningIntelligenceSeed } from "./learningIntelligenceSeed";

export const schemaVersion = 4;

const dexieStores = Object.fromEntries(
  tableNames.map((table) => [
    table,
    table === "applicationSettings"
      ? "id, key, updatedAt"
      : "id, createdAt, updatedAt, userId, courseId, courseVersionId, organizationId, status"
  ])
);

export class GridGuardDB extends Dexie {
  [key: string]: Table<Record<string, unknown>, string> | unknown;

  constructor() {
    super("GridGuardDB");
    this.version(1).stores(dexieStores);
    this.version(2).stores(dexieStores).upgrade(async (transaction) => {
      await transaction.table("applicationSettings").put({ id: "setting_schema_version", key: "schemaVersion", value: 2, createdAt: now(), updatedAt: now() });
    });
    this.version(3).stores(dexieStores).upgrade(async (transaction) => {
      await transaction.table("applicationSettings").put({ id: "setting_schema_version", key: "schemaVersion", value: 3, createdAt: now(), updatedAt: now() });
    });
    this.version(4).stores(dexieStores).upgrade(async (transaction) => {
      await transaction.table("applicationSettings").put({ id: "setting_schema_version", key: "schemaVersion", value: 4, createdAt: now(), updatedAt: now() });
    });
  }
}

export const db = new GridGuardDB();

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now() {
  return new Date().toISOString();
}

export function stamp<T extends object>(record: T): T & { id: string; createdAt: string; updatedAt: string } {
  const timestamp = now();
  return { id: id("rec"), createdAt: timestamp, updatedAt: timestamp, ...record };
}

export async function isInitialized() {
  return (await db.table("applicationSettings").where("key").equals("initialized").count()) > 0;
}

export async function initializeDatabase() {
  await db.open();
  if (await isInitialized()) {
    const data = await getAllData();
    const version = data.applicationSettings.find((setting) => setting.key === "learningIntelligenceVersion")?.value;
    if (version !== 1) {
      await replaceAllData(addLearningIntelligenceSeed(data));
    }
    return;
  }
  const seed = createSeedData();
  await replaceAllData(seed);
}

export async function getAllData(): Promise<AppData> {
  const entries = await Promise.all(tableNames.map(async (table) => [table, await db.table(table).toArray()] as const));
  return Object.fromEntries(entries) as unknown as AppData;
}

export async function replaceAllData(data: AppData) {
  for (const table of tableNames) {
    const target = db.table(table);
    await target.clear();
    await target.bulkPut(((data[table as TableName] as unknown[]) ?? []) as Record<string, unknown>[]);
  }
}

export async function putRecord<T extends { id: string }>(table: TableName, record: T) {
  await db.table(table).put({ ...record, updatedAt: now() });
}

export async function deleteRecord(table: TableName, idValue: string) {
  await db.table(table).delete(idValue);
}

export async function exportBackup(): Promise<string> {
  const data = await getAllData();
  return JSON.stringify({ schemaVersion, exportedAt: now(), data }, null, 2);
}

export async function importBackup(json: string) {
  const parsed = JSON.parse(json) as { schemaVersion: number; data: AppData };
  if (!parsed.data || !parsed.schemaVersion) {
    throw new Error("This backup could not be read.");
  }
  await replaceAllData(parsed.data);
}
