import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PokemonMedia from './PokemonMedia';

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

describe('PokemonMedia', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
  });

  it('renders official art and sprites', async () => {
    render(
      <PokemonMedia
        idOrName="charmander"
        sessionId="session-1"
        showOfficial
        showSprites
      />
    );

    expect(await screen.findByAltText('Official art of charmander')).toBeInTheDocument();
    expect(await screen.findByAltText('Battle sprite')).toBeInTheDocument();
    expect(await screen.findByAltText('Overworld sprite')).toBeInTheDocument();
  });
});
