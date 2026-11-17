import {
  Ability,
  Evolution,
  IPokemon,
  PokemonType,
  Resistance,
  StatBlock,
} from "../types/pokemon";

export default class Pokemon implements IPokemon {
  readonly apiEvolutions: Evolution[];
  readonly apiGeneration: number;
  readonly apiPreEvolution: string;
  readonly apiResistances: Resistance[];
  readonly apiResistancesWithAbilities: Resistance[];
  readonly apiTypes: PokemonType[];
  readonly id: number;
  readonly image: string;
  readonly name: string;
  readonly pokedexId: number;
  readonly resistanceModifyingAbilitiesForApi: Ability;
  readonly slug: string;
  readonly sprite: string;
  readonly stats: StatBlock;
  constructor(options: IPokemon) {
    this.id = options.id;
    this.name = options.name;
    this.image = options.image;
    this.pokedexId = options.pokedexId;
    this.slug = options.slug;
    this.sprite = options.sprite;
    this.stats = options.stats;
    this.apiTypes = options.apiTypes;
    this.apiEvolutions = options.apiEvolutions;
    this.apiGeneration = options.apiGeneration;
    this.apiPreEvolution = options.apiPreEvolution;
    this.apiResistances = options.apiResistances;
    this.apiResistancesWithAbilities = options.apiResistancesWithAbilities;
    this.resistanceModifyingAbilitiesForApi =
      options.resistanceModifyingAbilitiesForApi;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      image: this.image,
      pokedexId: this.pokedexId,
      slug: this.slug,
      sprite: this.sprite,
      stats: this.stats,
      apiTypes: this.apiTypes,
      apiEvolutions: this.apiEvolutions,
      apiGeneration: this.apiGeneration,
      apiPreEvolution: this.apiPreEvolution,
      apiResistances: this.apiResistances,
      apiResistancesWithAbilities: this.apiResistancesWithAbilities,
      resistanceModifyingAbilitiesForApi:
        this.resistanceModifyingAbilitiesForApi,
    };
  }
}
