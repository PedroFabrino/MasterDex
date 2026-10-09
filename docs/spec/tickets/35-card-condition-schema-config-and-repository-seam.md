## Parent
#46

## What to build
Establish the foundational data model, domain configuration, and database repository seams for card condition tracking across MasterDex. Add `card_condition` to `user_pokemon` (defaulting to `'NM'`) and `condition` to `card_prices` with composite indexing. Provide a centralized, easily tunable configuration module `shared/conditionConfig.ts` with standard condition types (`NM`, `LP`, `MP`, `HP`, `DMG`), LigaPokémon `qualid` mapping, baseline valuation multipliers, and nearest-condition scaling ratios.

## Acceptance criteria
- [ ] `shared/conditionConfig.ts` defines `CardCondition` (`'NM' | 'LP' | 'MP' | 'HP' | 'DMG'`), display metadata, baseline discount multipliers, and tunable nearest-condition fallback ratios.
- [ ] Database schema in `server/db/schema.ts` adds `card_condition text not null default 'NM'` to `user_pokemon` and `condition text not null default 'NM'` to `card_prices` with primary key `${cardId}:${provider}:${condition}`.
- [ ] `CollectorRepository` methods (`setUserPokemon`, `getUserCollection`, `getAssignedCollectedCards`, `batchSyncUserCollection`) accept, persist, and return `cardCondition` while preserving backward compatibility for existing records (defaulting null to `'NM'`).
- [ ] `PricingRepository` supports condition-aware price retrieval and upserts (`upsertConditionPrice` / `getPricesByCardIdAndCondition`).
- [ ] Unit tests pass verifying schema defaults, repository CRUD operations with condition, and backward compatibility for existing data.

## Blocked by
- None — can start immediately
