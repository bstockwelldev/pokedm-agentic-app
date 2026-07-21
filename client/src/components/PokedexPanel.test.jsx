import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PokedexPanel from './PokedexPanel';
import celestideFamilySession from '../__fixtures__/celestide-isles-family-session.json';

describe('PokedexPanel', () => {
  it('renders discovered Pokémon from celestide-isles-family-session continuity data', () => {
    render(<PokedexPanel session={celestideFamilySession} />);

    expect(screen.getByRole('heading', { name: 'Pokédex' })).toBeInTheDocument();
    expect(screen.getByText('Celestide Mareep')).toBeInTheDocument();
    expect(screen.getByText('Celestide Dreepy')).toBeInTheDocument();
    expect(screen.getByText('Pikachu Alolan')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'Species',
      'Form',
      'Location',
      'Notes',
    ]);

    expect(
      screen.getByText('Sighting on Breeze Path — Mareep fled before capture')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Starter received from Professor Liora')
    ).toBeInTheDocument();

    expect(screen.getAllByLabelText('Discovery status: Seen')).toHaveLength(1);
    expect(screen.getAllByLabelText('Discovery status: Caught')).toHaveLength(2);
    expect(screen.getAllByLabelText('Regional variant')).toHaveLength(3);
  });

  it('shows an empty-state message when no discoveries exist', () => {
    const emptySession = {
      ...celestideFamilySession,
      continuity: {
        ...celestideFamilySession.continuity,
        discovered_pokemon: [],
      },
    };

    render(<PokedexPanel session={emptySession} />);

    expect(screen.getByText('No Pokédex entries yet')).toBeInTheDocument();
    expect(
      screen.getByText(/new discoveries appear here automatically after each turn/i)
    ).toBeInTheDocument();
  });

  it('renders nothing useful when session is null', () => {
    render(<PokedexPanel session={null} />);

    expect(
      screen.getByText('Pokédex entries appear once your session is active.')
    ).toBeInTheDocument();
  });
});
