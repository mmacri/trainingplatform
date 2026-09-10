import type { ActivityVariantDefinition, AppData } from "../data/schema";

export class ActivityVariantService {
  static variantsForActivity(data: AppData, activityId: string): ActivityVariantDefinition[] {
    return data.activityVariants.filter((variant) => variant.activityId === activityId);
  }

  static selectVariant(data: AppData, userId: string, activityId: string, attemptNumber: number) {
    const variants = this.variantsForActivity(data, activityId);
    if (!variants.length) return undefined;
    const index = Math.abs(hashString(`${userId}:${activityId}:${attemptNumber}`)) % variants.length;
    return variants[index];
  }
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
