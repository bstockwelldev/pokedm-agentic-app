import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPokemonMedia, parsePokemonRef } from './pokemonMedia';

const mockApiResponse = {
  id: 4,
  name: 'charmander',
  sprites: {
    front_default: 'front.png',
    other: {
      'official-artwork': {
        front_default: 'official.png',
      },
      showdown: {
        front_default: 'battle.png',
      },
    },
    versions: {
      'generation-viii': {
        icons: {
          front_default: 'overworld.png',
        },
      },
    },
  },
};

describe('pokemonMedia', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('parses canon refs', () => {
    expect(parsePokemonRef('canon:pikachu')).toBe('pikachu');
    expect(parsePokemonRef('25')).toBe('25');
  });

  it('returns null for custom refs', () => {
    expect(parsePokemonRef('custom:cstm_embermole')).toBe(null);
  });

  it('fetches and maps sprite URLs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const data = await fetchPokemonMedia('charmander', 'session-1');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/charmander');
    expect(data).toMatchObject({
      id: 4,
      name: 'charmander',
      officialArt: 'official.png',
      battleSprite: 'battle.png',
      overworldSprite: 'overworld.png',
    });
  });

  it('caches results per session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
    globalThis.fetch = fetchMock;

    await fetchPokemonMedia('charmander', 'session-cache');
    await fetchPokemonMedia('charmander', 'session-cache');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
