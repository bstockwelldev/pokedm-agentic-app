import { describe, expect, it } from 'vitest';
import celestideFamilySession from '../__fixtures__/celestide-isles-family-session.json';
import {
  buildPokedexRows,
  getDiscoveryStatus,
  isRegionalVariant,
} from './pokedexTracking';

describe('pokedexTracking', () => {
  it('builds rows with Expansion §10 columns from fixture continuity', () => {
    const rows = buildPokedexRows(celestideFamilySession);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      species: 'Celestide Mareep',
      form: 'Celestide Isles',
      location: 'Route 2 - Southern Approach',
      status: 'seen',
      isRegionalVariant: true,
    });
    expect(rows[2]).toMatchObject({
      species: 'Celestide Dreepy',
      status: 'caught',
      isRegionalVariant: true,
    });
  });

  it('flags regional variants including cstm_celestide_mareep refs', () => {
    const entry = celestideFamilySession.continuity.discovered_pokemon[0];
    expect(isRegionalVariant(entry)).toBe(true);
    expect(getDiscoveryStatus(entry)).toBe('seen');
  });
});
