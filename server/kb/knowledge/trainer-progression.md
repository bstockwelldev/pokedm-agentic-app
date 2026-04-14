# Trainer Progression
status: Mandatory

## Trainer Levels
Trainers do not have explicit levels in PokeDM.
Progression is measured through: type affinity rank, badges earned, campaign story milestones, and Pokémon team strength.

## Badges
Gym badges are awarded by campaign-defined gym leaders.
Each badge may grant passive benefits (campaign configurable).
Standard benefits: unlock HM field moves, allow higher-level Pokémon to obey, unlock new areas.

## Starter Pokémon
Each trainer selects a starter at campaign creation or session 1.
Starters may be drawn from: classic starter pools (Bulbasaur/Charmander/Squirtle, etc.), campaign-defined custom starters, or random encounters based on region.
Starter overrides per trainer are defined in the session brief.

## Party Management
Maximum party size: 6 Pokémon.
Pokémon not in the active party are stored in the PC Box (campaign storage).
Trainers may swap PC Box Pokémon at Pokémon Centers or designated campaign locations.

## Trainer Classes
Campaign hosts may assign trainer classes (e.g., Ace Trainer, Breeder, Ranger).
Classes are cosmetic by default; campaign JSON may attach mechanical bonuses.

## Multiplayer Turn Order
In multiplayer sessions, trainers take turns providing input.
Turn order is defined in session.multiplayer.turn_order.
The active trainer is tracked via session.multiplayer.active_trainer_id.
Non-active trainers may observe but cannot act until their turn.
