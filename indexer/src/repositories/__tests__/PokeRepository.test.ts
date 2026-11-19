import { describe, expect, it, vi } from "vitest";
import PokeRepository from "../PokeRepository";
import { pokeApiConnector } from "../../connectors";
import { Pokemon } from "../../types/pokemon";
import {
    ApiEvolutionChain,
    ApiPokemon,
    ApiSpecies,
    ApiType,
} from "../../types/raw-pokemon";

vi.mock("../../connectors", () => ({
    pokeApiConnector: { client: { get: vi.fn() } },
}));

const API = "https://pokeapi.co/api/v2";
const POKEMON_URL = `${API}/pokemon/2/`;
const GRASS_URL = `${API}/type/12/`;
const POISON_URL = `${API}/type/4/`;
const SPECIES_URL = `${API}/pokemon-species/2/`;
const CHAIN_URL = `${API}/evolution-chain/1/`;

const named = (name: string, url = `${API}/${name}/`) => ({ name, url });

function buildPokemon(overrides: Partial<ApiPokemon> = {}): ApiPokemon {
    return {
        id: 2,
        name: "ivysaur",
        sprites: {
            front_default: "sprite.png",
            other: { "official-artwork": { front_default: "artwork.png" } },
        },
        stats: [
            { base_stat: 60, stat: named("hp") },
            { base_stat: 62, stat: named("attack") },
            { base_stat: 63, stat: named("defense") },
            { base_stat: 80, stat: named("special-attack") },
            { base_stat: 81, stat: named("special-defense") },
            { base_stat: 61, stat: named("speed") },
        ],
        types: [
            { slot: 2, type: named("poison", POISON_URL) },
            { slot: 1, type: named("grass", GRASS_URL) },
        ],
        abilities: [
            { ability: named("overgrow") },
            { ability: named("chlorophyll") },
        ],
        species: named("ivysaur", SPECIES_URL),
        ...overrides,
    };
}

function buildType(
    name: string,
    relations: Partial<ApiType["damage_relations"]>,
    icon: string | null = `${name}.png`,
): ApiType {
    return {
        name,
        damage_relations: {
            double_damage_from: [],
            half_damage_from: [],
            no_damage_from: [],
            ...relations,
        },
        sprites: {
            "generation-viii": { "sword-shield": { name_icon: icon } },
        },
    };
}

function buildSpecies(overrides: Partial<ApiSpecies> = {}): ApiSpecies {
    return {
        name: "ivysaur",
        generation: named("generation-i", `${API}/generation/1/`),
        evolves_from_species: named("bulbasaur", `${API}/pokemon-species/1/`),
        evolution_chain: { url: CHAIN_URL },
        ...overrides,
    };
}

const EVOLUTION_CHAIN: ApiEvolutionChain = {
    chain: {
        species: named("bulbasaur", `${API}/pokemon-species/1/`),
        evolves_to: [
            {
                species: named("ivysaur", `${API}/pokemon-species/2/`),
                evolves_to: [
                    {
                        species: named("venusaur", `${API}/pokemon-species/3/`),
                        evolves_to: [],
                    },
                ],
            },
        ],
    },
};

const GRASS = buildType("grass", {
    double_damage_from: [named("fire"), named("flying")],
    half_damage_from: [named("water"), named("grass")],
});

const POISON = buildType("poison", {
    double_damage_from: [named("psychic"), named("flying")],
    half_damage_from: [named("grass"), named("fighting")],
    no_damage_from: [named("ghost")],
});

function givenApi(routes: Record<string, unknown>) {
    vi.mocked(pokeApiConnector.client.get).mockImplementation(((
        url: string,
    ) => ({
        json: async () => {
            if (!(url in routes)) {
                throw new Error(`Unexpected url ${url}`);
            }
            return routes[url];
        },
    })) as never);
}

function givenDefaultApi(
    overrides: {
        pokemon?: ApiPokemon;
        species?: ApiSpecies;
        grass?: ApiType;
    } = {},
) {
    givenApi({
        [POKEMON_URL]: overrides.pokemon ?? buildPokemon(),
        [GRASS_URL]: overrides.grass ?? GRASS,
        [POISON_URL]: POISON,
        [SPECIES_URL]: overrides.species ?? buildSpecies(),
        [CHAIN_URL]: EVOLUTION_CHAIN,
    });
}

describe("PokeRepository.fetchPokemon", () => {
    it("maps the PokeAPI resources into a pokemon", async () => {
        givenDefaultApi();

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon).toMatchObject({
            id: 2,
            pokedexId: 2,
            name: "ivysaur",
            slug: "ivysaur",
            image: "artwork.png",
            sprite: "sprite.png",
            stats: {
                HP: 60,
                attack: 62,
                defense: 63,
                special_attack: 80,
                special_defense: 81,
                speed: 61,
            },
            apiGeneration: 1,
            resistanceModifyingAbilitiesForApi: {
                name: "overgrow",
                slug: "overgrow",
            },
            apiPreEvolution: "bulbasaur",
        });
    });

    it("orders the types by slot", async () => {
        givenDefaultApi();

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon.apiTypes).toEqual([
            { name: "grass", image: "grass.png" },
            { name: "poison", image: "poison.png" },
        ]);
    });

    it("computes the resistances against every attacking type", async () => {
        givenDefaultApi();

        const { apiResistances } =
            await PokeRepository.fetchPokemon(POKEMON_URL);
        const resistanceOf = (name: string) =>
            apiResistances.find(resistance => resistance.name === name);

        expect(apiResistances).toHaveLength(18);
        expect(resistanceOf("normal")).toEqual({
            name: "normal",
            damage_multiplier: 1,
            damage_relation: "neutral",
        });
        expect(resistanceOf("fire")).toEqual({
            name: "fire",
            damage_multiplier: 2,
            damage_relation: "vulnerable",
        });
        expect(resistanceOf("flying")).toEqual({
            name: "flying",
            damage_multiplier: 4,
            damage_relation: "twice_vulnerable",
        });
        expect(resistanceOf("water")).toEqual({
            name: "water",
            damage_multiplier: 0.5,
            damage_relation: "resistant",
        });
        expect(resistanceOf("grass")).toEqual({
            name: "grass",
            damage_multiplier: 0.25,
            damage_relation: "twice_resistant",
        });
        expect(resistanceOf("ghost")).toEqual({
            name: "ghost",
            damage_multiplier: 0,
            damage_relation: "immune",
        });
    });

    it("reuses the resistances as resistances with abilities", async () => {
        givenDefaultApi();

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon.apiResistancesWithAbilities).toEqual(
            pokemon.apiResistances,
        );
    });

    it("lists the next evolutions from the species position in the chain", async () => {
        givenDefaultApi();

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon.apiEvolutions).toEqual([
            { name: "venusaur", pokedexId: 3 },
        ]);
    });

    it("has no evolution at the last stage of the chain", async () => {
        givenDefaultApi({
            species: buildSpecies({
                name: "venusaur",
                evolves_from_species: named("ivysaur"),
            }),
        });

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon.apiEvolutions).toEqual([]);
        expect(pokemon.apiPreEvolution).toBe("ivysaur");
    });

    it("has no evolution when the species is missing from the chain", async () => {
        givenDefaultApi({ species: buildSpecies({ name: "missingno" }) });

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon.apiEvolutions).toEqual([]);
    });

    it("falls back to default values when data is missing", async () => {
        givenDefaultApi({
            pokemon: buildPokemon({
                sprites: {
                    front_default: null,
                    other: { "official-artwork": { front_default: null } },
                },
                stats: [],
                abilities: [],
            }),
            species: buildSpecies({ evolves_from_species: null }),
            grass: buildType("grass", {}, null),
        });

        const pokemon = await PokeRepository.fetchPokemon(POKEMON_URL);

        expect(pokemon).toMatchObject({
            image: "",
            sprite: "",
            stats: {
                HP: 0,
                attack: 0,
                defense: 0,
                special_attack: 0,
                special_defense: 0,
                speed: 0,
            },
            resistanceModifyingAbilitiesForApi: { name: "", slug: "" },
            apiPreEvolution: "none",
        });
        expect(pokemon.apiTypes[0]).toEqual({ name: "grass", image: "" });
    });

    it("propagates PokeAPI errors", async () => {
        givenApi({});

        await expect(PokeRepository.fetchPokemon(POKEMON_URL)).rejects.toThrow(
            `Unexpected url ${POKEMON_URL}`,
        );
    });
});

describe("PokeRepository.getPokemons", () => {
    const BATCH_SIZE = 200;

    const results = (count: number, start = 0) =>
        Array.from({ length: count }, (_, i) => ({
            name: `pokemon-${start + i}`,
            url: `${API}/pokemon/${start + i}/`,
        }));

    function givenPages(...pages: { name: string; url: string }[][]) {
        let call = 0;
        vi.mocked(pokeApiConnector.client.get).mockImplementation((() => ({
            json: async () => ({
                count: 0,
                next: "",
                previous: null,
                results: pages[call++] ?? [],
            }),
        })) as never);
    }

    function givenFetchedPokemons() {
        return vi
            .spyOn(PokeRepository, "fetchPokemon")
            .mockImplementation(
                async url => ({ slug: url }) as unknown as Pokemon,
            );
    }

    async function collect(generator: AsyncGenerator<Pokemon[]>) {
        const batches: Pokemon[][] = [];
        for await (const batch of generator) {
            batches.push(batch);
        }
        return batches;
    }

    it("pages through the list until a page is incomplete", async () => {
        givenPages(results(BATCH_SIZE), results(3, BATCH_SIZE));
        givenFetchedPokemons();

        const batches = await collect(PokeRepository.getPokemons());

        expect(batches.map(batch => batch.length)).toEqual([BATCH_SIZE, 3]);
        expect(pokeApiConnector.client.get).toHaveBeenNthCalledWith(
            1,
            `pokemon?offset=0&limit=${BATCH_SIZE}`,
        );
        expect(pokeApiConnector.client.get).toHaveBeenNthCalledWith(
            2,
            `pokemon?offset=${BATCH_SIZE}&limit=${BATCH_SIZE}`,
        );
        expect(pokeApiConnector.client.get).toHaveBeenCalledTimes(2);
    });

    it("stops on an empty page", async () => {
        givenPages(results(BATCH_SIZE), []);
        givenFetchedPokemons();

        const batches = await collect(PokeRepository.getPokemons());

        expect(batches).toHaveLength(1);
        expect(pokeApiConnector.client.get).toHaveBeenCalledTimes(2);
    });

    it("yields nothing when the list is empty", async () => {
        givenPages([]);
        const fetchPokemon = givenFetchedPokemons();

        const batches = await collect(PokeRepository.getPokemons());

        expect(batches).toEqual([]);
        expect(fetchPokemon).not.toHaveBeenCalled();
    });

    it("fetches the details of every listed pokemon in order", async () => {
        const page = results(2);
        givenPages(page);
        const fetchPokemon = givenFetchedPokemons();

        const [batch] = await collect(PokeRepository.getPokemons());

        expect(fetchPokemon.mock.calls.map(([url]) => url)).toEqual(
            page.map(({ url }) => url),
        );
        expect(batch).toEqual(page.map(({ url }) => ({ slug: url })));
    });

    it("propagates detail fetching errors", async () => {
        givenPages(results(2));
        vi.spyOn(PokeRepository, "fetchPokemon").mockRejectedValue(
            new Error("detail failed"),
        );

        await expect(collect(PokeRepository.getPokemons())).rejects.toThrow(
            "detail failed",
        );
    });
});
