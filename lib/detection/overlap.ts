import type { OverlapGroup } from '@/lib/catalog/merchants'

export interface OverlapSet<T> {
  group: OverlapGroup
  /** Every member, most expensive first (ties keep input order). */
  members: T[]
  /** The one we assume you keep: the most expensive. */
  kept: T
  /** Everything else in the group — what rotating would save. */
  redundant: T[]
}

/**
 * The overlap rule, in one place: within each overlap group that has two or
 * more services, keep the most expensive and treat the rest as redundant.
 * Used by the detection engine and by the landing-page overlap check.
 */
export function findOverlaps<T>(items: T[], overlapOf: (item: T) => OverlapGroup | null | undefined, yearlyCostOf: (item: T) => number): OverlapSet<T>[] {
  const groups = new Map<OverlapGroup, T[]>()
  for (const item of items) {
    const group = overlapOf(item)
    if (!group) continue
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  const sets: OverlapSet<T>[] = []
  for (const [group, list] of groups) {
    if (list.length < 2) continue
    const members = [...list].sort((a, b) => yearlyCostOf(b) - yearlyCostOf(a))
    sets.push({ group, members, kept: members[0], redundant: members.slice(1) })
  }
  return sets
}
