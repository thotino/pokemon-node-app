# Architecture Decision Records

Journal des décisions d'architecture de `pokemon-node-app`. Chaque décision est numérotée, datée et ne se modifie pas une fois acceptée : pour revenir dessus, on ajoute une nouvelle ADR qui la remplace (statut `Remplacée par ADR-XXX`).

| # | Titre | Module | Statut | Date |
|---|---|---|---|---|
| [001](#adr-001--architecture-en-couches-connectors--repositories--services) | Architecture en couches connectors / repositories / services | web-app | Acceptée | 2026-11-18 |
| [002](#adr-002--classes-exportées-et-méthodes-statiques) | Classes exportées et méthodes statiques | web-app | Acceptée | 2026-11-18 |
| [003](#adr-003--pagination-côté-serveur-et-état-de-page-dans-lurl) | Pagination côté serveur et état de page dans l'URL | web-app | Acceptée | 2026-11-18 |
| [004](#adr-004--tanstack-query-et-ky-pour-les-données-distantes) | TanStack Query et ky pour les données distantes | web-app | Acceptée | 2026-11-18 |
| [005](#adr-005--séparation-conteneur--composants-de-rendu) | Séparation conteneur / composants de rendu | web-app | Acceptée | 2026-11-18 |
| [006](#adr-006--url-de-lapi-relative-sans-fichier-env) | URL de l'API relative, sans fichier `.env` | web-app | Acceptée | 2026-11-18 |
| [007](#adr-007--image-docker-multi-stage-servie-par-nginx) | Image Docker multi-stage servie par nginx | web-app | Acceptée | 2026-11-18 |
| [008](#adr-008--conventions-de-tests-et-doutillage) | Conventions de tests et d'outillage | web-app | Acceptée | 2026-11-18 |
| [009](#adr-009--recherche-et-filtre-par-type) | Recherche et filtre par type | web-app | Partiellement remplacée par ADR-010 | 2026-11-18 |
| [010](#adr-010--facettes-construites-par-lapi) | Facettes construites par l'API | backend + web-app | Acceptée | 2026-11-18 |
| [011](#adr-011--indexer-en-commonjs-et-image-docker-multi-stage) | Indexer en CommonJS et image Docker multi-stage | indexer + backend | Acceptée | 2026-11-18 |
| [012](#adr-012--rotation-des-alias-latest_pokenode--previous_pokenode) | Rotation des alias `latest_pokenode` / `previous_pokenode` | indexer | Acceptée | 2026-11-19 |
| [013](#adr-013--client-http-unique-ky-via-le-connecteur-pokeapi) | Client HTTP unique : ky via le connecteur PokeAPI | indexer | Acceptée | 2026-11-19 |
| [014](#adr-014--route-post-battles--proxy-brut-du-stream-du-chatbot) | Route `POST /battles` : proxy brut du stream du chatbot | backend | Partiellement remplacée par ADR-015, ADR-017, ADR-018 et ADR-019 | 2026-11-19 |
| [015](#adr-015--le-chatbotid-est-fourni-par-léchange-de-la-clé-dapi) | Le `chatbotId` est fourni par l'échange de la clé d'API | backend | Partiellement remplacée par ADR-019 | 2026-11-19 |
| [016](#adr-016--arène-de-combat--lecture-du-stream-hors-tanstack-query) | Arène de combat : lecture du stream hors TanStack Query | web-app | Acceptée | 2026-11-19 |
| [017](#adr-017--validation-des-requêtes-avec-ajv) | Validation des requêtes avec ajv | backend | Acceptée | 2026-11-20 |
| [018](#adr-018--erreurs-métier-converties-en-erreurs-http-par-handleerror) | Erreurs métier converties en erreurs HTTP par `handleError` | backend | Acceptée | 2026-11-20 |
| [019](#adr-019--authentification-du-chatbot-isolée-dans-chatbotauthrepository) | Authentification du chatbot isolée dans `ChatbotAuthRepository` | backend | Acceptée | 2026-11-22 |
| [020](#adr-020--coalescence-des-requêtes-pokeapi-dans-pokeresourcerepository) | Coalescence des requêtes PokeAPI dans `PokeResourceRepository` | indexer | Acceptée | 2026-11-23 |
| [021](#adr-021--connexion-des-connecteurs-au-démarrage-et-arrêt-propre-du-backend) | Connexion des connecteurs au démarrage et arrêt propre du backend | backend | Acceptée | 2026-11-24 |

---

## ADR-001 : Architecture en couches connectors / repositories / services

**Statut** : Acceptée, 2026-11-18

**Contexte**
Le backend et l'indexer sont organisés en `connectors` / `repositories` / `services`. Le web-app n'avait pas de structure : les appels HTTP étaient faits directement dans les composants, avec une URL codée en dur.

**Décision**
Le web-app suit le même modèle que les autres modules. Les dépendances vont dans un seul sens :

```
components → hooks → services → repositories → connectors
                         ↘   entities   ↙
                          types/*.d.ts
```

| Couche | Responsabilité | Exemples |
|---|---|---|
| `connectors/` | Transport. Seule couche qui touche une API externe (HTTP, navigateur). Implémente `BaseConnectorInterface` (`connect` / `close`). | `PokeBackendConnector` (ky → backend), `BrowserHistoryConnector` (History API) |
| `repositories/` | Accès aux données : construction des requêtes, validation des paramètres, transformation des réponses en entités. | `PokemonApiRepository` |
| `services/` | Orchestration et logique applicative. | `PokemonQueries`, `PaginationService`, `PageParamService` |
| `entities/` | Modèles métier ; implémentent les interfaces de `types/`. | `Pokemon`, `PokemonPage`, `PokemonStat` |
| `types/*.d.ts` | Contrats partagés. Préfixe `I` pour les interfaces d'entités, suffixe `Interface` pour les contrats techniques. | `IPokemon`, `IPokemonPage`, `BaseConnectorInterface` |
| `hooks/` | Liaison React ↔ services, aussi minces que possible. | `usePokemons`, `usePageParam`, `useTilt` |
| `components/` | Rendu. | `PokemonGrid`, `PokemonCardList`, `Pagination` |
| `lib/` | Configuration transverse uniquement. | `queryClient` |

**Conséquences**
- Le même vocabulaire et la même navigation dans les trois modules.
- Changer de client HTTP ou de source de données ne touche que `connectors/` ou `repositories/`.
- Le synchroniseur d'URL (`PageParamStore`) a été scindé : un connecteur pour la partie technique, un service pour la logique de pagination.

---

## ADR-002 : Classes exportées et méthodes statiques

**Statut** : Acceptée, 2026-11-18

**Contexte**
Une première version utilisait des classes instanciées avec injection par constructeur (`new PokemonApi(apiClient)`). Le reste du projet privilégie des classes à méthodes statiques et des imports directs.

**Décision**
- Toute la logique hors React est écrite dans des **classes exportées**, une par fichier, et le fichier porte le nom de la classe.
- Les **méthodes statiques** sont la règle pour les repositories et les services.
- Seuls les objets **qui gardent un état** sont instanciés, sous forme de **singleton exporté** : les connecteurs (client ky, abonnés à l'historique du navigateur).
- Les dépendances se résolvent par **import direct**, sans injection.
- Pas de commentaires dans le code.

**Conséquences**
- Les appels sont simples et lisibles (`PokemonApiRepository.getPage(...)`), et il n'y a pas de câblage d'instances.
- On ne peut pas remplacer une dépendance par un faux objet dans les tests : on teste en simulant le réseau avec MSW, ou en manipulant directement l'URL ou le DOM avec jsdom (voir ADR-008).

---

## ADR-003 : Pagination côté serveur et état de page dans l'URL

**Statut** : Acceptée, 2026-11-18

**Contexte**
La grille doit être paginée, et la pagination doit être gérée par l'API. Le backend expose déjà `GET /pokemons?from=&size=`, qui renvoie `{ pokemons: { from, size, total, items } }`. Le backend ne devait pas être modifié.

**Décision**
- On utilise le contrat existant, avec des **offsets** : le front convertit le numéro de page (à partir de 1) avec `from = (page - 1) × size`. Taille de page : **20** (`PokemonApiRepository.DEFAULT_PAGE_SIZE`).
- Le backend ne validant pas `from` / `size`, **le repository nettoie les paramètres** avant chaque appel.
- **La page courante vit dans l'URL** (`?page=N`, absent pour la page 1), via `BrowserHistoryConnector` et `PageParamService`, lus avec `useSyncExternalStore`. Il n'y a pas de react-router.
- Pagination **numérotée** (`1 … 4 5 6 … 66`), avec toujours 7 éléments pour que la barre ne change pas de largeur (`PaginationService`). Sur mobile, un affichage compact « Page X / N ».
- Une page hors limites redirige vers la dernière page valide, en remplaçant l'URL (pas de nouvelle entrée dans l'historique).

**Conséquences**
- Liens partageables, et boutons précédent/suivant du navigateur fonctionnels.
- Les autres paramètres d'URL sont préservés, ce qui prépare l'arrivée de filtres (`?q=`, `?types=`).
- Avec la pagination par offset, si l'index change entre deux pages, un Pokémon peut être sauté ou apparaître deux fois. C'est acceptable pour un catalogue quasi statique.

---

## ADR-004 : TanStack Query et ky pour les données distantes

**Statut** : Acceptée, 2026-11-18

**Contexte**
Le chargement manuel (`useEffect` + `useState` + axios) n'offrait ni cache, ni annulation des requêtes, ni gestion des états de chargement et d'erreur.

**Décision**
- **TanStack Query v5** pour les requêtes. Les options de requête sont centralisées dans `services/PokemonQueries` (clés de cache et fonctions de chargement).
  - L'ancienne page reste affichée pendant le chargement de la suivante (`placeholderData: keepPreviousData`).
  - La page suivante est **préchargée** dès que la page courante est affichée.
  - `staleTime` de 5 min, pas de rechargement au retour sur l'onglet, `retry: 1`.
- **ky** remplace axios comme client HTTP, uniquement dans `PokeBackendConnector`.
  - `retry: 0` côté ky : les relances sont gérées par TanStack Query seul, pour éviter les doubles relances.
  - Le `signal` d'annulation de TanStack Query est transmis jusqu'à ky.

**Conséquences**
- Navigation entre pages sans clignotement, et retour instantané sur une page déjà vue.
- Les entités sont des instances de classes : le partage structurel de TanStack Query ne s'applique pas à elles (sans impact à ce volume).

---

## ADR-005 : Séparation conteneur / composants de rendu

**Statut** : Acceptée, 2026-11-18

**Contexte**
Le composant de liste mélangeait récupération des données, thème et rendu, avec une grille fixe à 4 colonnes.

**Décision**
- `PokemonGrid` est le **conteneur** : page lue dans l'URL, requête, états (chargement, erreur, vide), pagination, retour en haut et focus au changement de page.
- Les composants de **rendu** n'ont ni hook de données ni appel réseau : `PokemonCardList` (ancien `PokemonList`, renommé), `PokemonCard`, `StatBar`, `CardSkeleton`, `Pagination`.
- **Grille responsive** sans breakpoints : `grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]`. Les classes partagées sont dans `CardStyles`, pour que les squelettes aient exactement la même taille que les cartes.
- Les stats affichées sont pilotées par `Pokemon.MAIN_STATS` : 4 aujourd'hui (HP, Attack, Defense, Speed).
- Le thème passe par les classes Tailwind `dark:` (`darkMode: 'class'`, classe posée sur `<html>` par `ThemeContext`).
- Accessibilité :
  - sémantique `article`, `dl`, `nav`, `aria-current` ;
  - `aria-busy` pendant le chargement ;
  - focus déplacé sur la grille au changement de page ;
  - animations coupées si l'utilisateur demande à réduire les animations (`prefers-reduced-motion`).

**Conséquences**
- Les composants de rendu se testent sans réseau et sont réutilisables, par exemple pour des résultats de recherche ou une équipe de combat.
- `Header`, `ThemeSwitcher` et `ThemeContext` utilisent encore des ternaires sur le thème : migration vers `dark:` à faire.

---

## ADR-006 : URL de l'API relative, sans fichier `.env`

**Statut** : Acceptée, 2026-11-18

**Contexte**
L'URL du backend était codée en dur (`http://localhost:3001`). Le projet n'utilise pas de fichiers `.env`, et le front est déployé via docker compose.

**Décision**
- Le front appelle toujours **`/api/...`**, une URL relative à son propre domaine.
- Le serveur qui sert le front relaie `/api` vers le backend en retirant le préfixe :
  - **en dev** : proxy Vite (`vite.config.ts`), avec une cible modifiable par la variable shell `API_PROXY_TARGET` (`http://localhost:3001` par défaut) ;
  - **en conteneur** : nginx relaie `/api/` vers `http://api:3001/`.

**Conséquences**
- Aucune URL de backend dans le bundle : la même image fonctionne dans tous les environnements.
- Même origine pour le navigateur et l'API, donc pas de CORS.
- Toute nouvelle route du backend est accessible sous `/api` sans configuration supplémentaire.

---

## ADR-007 : Image Docker multi-stage servie par nginx

**Statut** : Acceptée, 2026-11-18

**Contexte**
Le front doit être ajouté au `docker-compose.yml`. Une fois compilé, il n'est plus qu'un ensemble de fichiers statiques.

**Décision**
- `web-app/Dockerfile` en **deux étapes**, sur le modèle du backend :
  - **builder** : `node:26`, `USER node`, `npm ci`, `npm run build` ;
  - **runtime** : `nginxinc/nginx-unprivileged:stable-alpine` (sans root, port 8080), qui ne contient que `dist/` et la config nginx.
- `web-app/nginx/default.conf` :
  - relais de `/api/` vers le backend ;
  - retour à `index.html` pour toute URL qui n'est pas un fichier ;
  - cache d'un an pour `/assets/` (noms de fichiers avec empreinte), `no-cache` pour `index.html` ;
  - compression gzip.
- En-têtes de sécurité dans `nginx/security-headers.conf`, inclus dans chaque `location`, parce que nginx n'hérite pas des `add_header` du niveau serveur.
- Service compose `web` : port **5173** sur l'hôte, vers 8080 dans le conteneur, avec `depends_on: api`.
- **On ne reconstruit et ne redémarre que le service `web`** (`docker compose build web`, `docker compose up -d --no-deps web`), pour ne pas risquer de perdre les données du cluster Elasticsearch.

**Conséquences**
- Image d'environ 60 Mo, sans Node ni `node_modules`.
- Le port 5173 de l'hôte est aussi celui de `npm run dev` : il faut arrêter le serveur de dev avant de démarrer le conteneur.

---

## ADR-008 : Conventions de tests et d'outillage

**Statut** : Acceptée, 2026-11-18

**Contexte**
Le web-app n'avait ni tests ni formatage automatique, et l'environnement Node n'était pas fixé.

**Décision**
- **Node 26** (`web-app/.nvmrc`), dépendances alignées sur cette version (`@types/node` 26, jsdom 31).
- **Vitest + Testing Library + MSW** en environnement jsdom.
- Tests dans des dossiers **`__tests__/`** au plus près du module testé. L'outillage partagé (fixtures, setup) est dans `src/test/`.
- Les appels HTTP sont testés de bout en bout, à travers le vrai connecteur, avec une API simulée par **MSW**.
- **Prettier**, avec la même configuration que le backend (`tabWidth: 4`, `arrowParens: "avoid"`), sur `{,src/**/}*.{ts,tsx}`.
- Après chaque modification : `npm run test`, `npm run lint`, `npm run build`, `npm run prettier`.

**Conséquences**
- Les tests couvrent les vrais chemins (connecteur, repository, service, hook, composant), sans faux objets injectés.
- jsdom n'implémente pas `window.scrollTo` : il est remplacé par un faux dans `src/test/setup.ts`.

---

## ADR-009 : Recherche et filtre par type

**Statut** : Partiellement remplacée par ADR-010 (construction des facettes), 2026-11-18

**Contexte**
La grille paginée ne permet pas de chercher un Pokémon. Le backend accepte déjà `GET /pokemons?q=&types=&types=&from=&size=` : `q` fait une recherche floue et par préfixe sur `name`, `types` est appliqué en `post_filter` (`terms`, donc en **OU**), et la réponse contient `aggregations`, les types et leurs effectifs calculés sur `q` avant le filtre. La contrainte : ne dégrader ni le temps de réponse ni le temps de chargement.

**Décision**
- **Les critères vivent dans l'URL**, à côté de la page : `?q=pika&types=Feu&types=Vol`. Ils sont lus avec `useSyncExternalStore` à partir de la chaîne `location.search`, puis convertis par `useMemo` (un tableau neuf à chaque lecture provoquerait une boucle de rendu).
- `BrowserHistoryConnector.setSearchParams` écrit plusieurs paramètres **en une seule entrée d'historique et une seule notification**. Changer de critère supprime `page` dans la même écriture : retour en page 1 sans requête parasite.
- `SearchParamService` **normalise** les critères (`q` sans espaces autour, types dédoublonnés et triés). La clé TanStack Query `["pokemons", "page", { page, size, q, types }]` est donc la même quel que soit l'ordre des types.
- **Recherche à la soumission** (Entrée ou bouton), pas pendant la frappe. Le texte saisi reste dans l'état local de `SearchBar` : taper ne re-rend pas la grille et n'envoie aucune requête.
- **Filtre par type en multi-sélection OU**, avec des puces `aria-pressed`. Les puces viennent des `aggregations` de la réponse de la page : **aucune requête supplémentaire**. Grâce au `post_filter`, la liste reste stable quand on coche un type. Un type sélectionné absent des résultats reste affiché avec un compteur à 0.
- La barre d'outils (`PokemonToolbar`) reste montée dans tous les états (chargement, erreur, vide), et les puces ont un squelette au premier chargement : pas de décalage de mise en page.
- Le préchargement de la page suivante et `keepPreviousData` s'appliquent avec les critères courants.

**Conséquences**
- Recherches partageables par lien, et boutons précédent/suivant du navigateur fonctionnels (le champ de saisie se resynchronise).
- Une requête par action de l'utilisateur, et une combinaison déjà vue est servie depuis le cache.
- Aucune nouvelle dépendance.
- Un filtre en **ET** (par exemple « Feu et Vol ») nécessiterait de modifier la requête Elasticsearch du backend.

---

## ADR-010 : Facettes construites par l'API

**Statut** : Acceptée, 2026-11-18

**Contexte**
Dans l'ADR-009, le backend renvoyait tels quels les buckets d'Elasticsearch (`aggregations: [{ key, doc_count }]`). Le front les convertissait en facettes, et complétait lui-même la liste avec les types cochés absents des résultats (`withSelected`). Le front dépendait donc du format interne d'Elasticsearch, et chaque client de l'API aurait dû refaire ce travail. L'ADR-003 interdisait de modifier le backend ; cette décision revient sur ce point pour la recherche.

**Décision**
- **Le backend construit les facettes.** `GET /pokemons` renvoie `{ pokemons: { from, size, total, items, filters } }`, avec `filters: [{ name, count }]` (entité `PokemonTypeFacet` côté backend).
- `PokeRepository.#parseFilters` convertit les buckets, puis ajoute avec un compteur à 0 chaque type demandé qui n'apparaît pas dans les buckets (sans doublon). Un type inconnu demandé est donc renvoyé avec un compteur à 0.
- Sans `aggregations` dans la réponse d'Elasticsearch, `filters` vaut `[]` (complété par les types demandés) au lieu de provoquer une erreur 500.
- **Le front ne fait que lire.** `IPokemonPage.filters: IPokemonTypeFacet[]` ; `PokemonPage.filters` contient des `PokemonTypeFacet`, et tolère l'absence du champ (`?? []`). `TypeFilter` affiche les facettes reçues sans les modifier ; `aria-pressed` dépend toujours des critères de l'URL.

**Conséquences**
- Le front ne connaît plus le format d'Elasticsearch (`ITypeBucket`, `fromBucket` et `withSelected` supprimés).
- Tout client de l'API reçoit des facettes complètes, y compris l'agent IA de combat.
- Changement de contrat : `aggregations` est remplacé par `filters`. Le front et le backend doivent être déployés ensemble (reconstruire les services `api` et `web`).

---

## ADR-011 : Indexer en CommonJS et image Docker multi-stage

**Statut** : Acceptée, 2026-11-18

**Contexte**
L'image de l'indexer était construite en une seule étape (`node:26`) : elle embarquait toutes les devDependencies et lançait `npm run dev` (TypeScript exécuté par tsx). Le backend et le web-app utilisent déjà un build multi-stage. L'indexer était en ESM (`"type": "module"`) avec des imports relatifs sans extension : la sortie de `tsc` ne pouvait pas être lancée avec `node dist/main.js`. Ajouter les extensions `.js` aux imports ou passer en `nodenext` a été écarté.

**Décision**
- **L'indexer passe en CommonJS**, comme le backend :
  - `package.json` : `"type": "commonjs"`, script `start` (`node dist/main.js`) ;
  - `tsconfig.json` : `"module": "commonjs"`, `"moduleResolution": "Node"`, `"ignoreDeprecations": "6.0"` (exigé par TypeScript 6) ;
  - `main.ts` détecte l'exécution directe avec `require.main === module` au lieu de `import.meta.filename` ;
  - `vitest.config.ts` devient `vitest.config.mts`, pour que vitest charge toujours sa configuration en ESM.
- `config` passe des devDependencies aux dependencies : `src/config.ts` l'utilise à l'exécution.
- `indexer/Dockerfile` en **deux étapes**, sur le modèle du backend :
  - **builder** : `node:26`, `USER node`, `npm ci`, `npm run build`, puis `npm prune --omit=dev` ;
  - **runtime** : `node:26-slim`, `USER node`, `NODE_ENV=production`, `NODE_CONFIG_DIR=/app/config`, un `production.json` vide, et `ENTRYPOINT ["node", "dist/main.js"]`.
- `indexer/.dockerignore` en **liste blanche**, comme celui du backend : seuls `package*.json`, `config/default.json`, `config/custom-environment-variables.json`, `src` (sans `__tests__`) et `tsconfig.json` sont envoyés au build.
- Dans les Dockerfiles de l'indexer **et du backend**, le builder supprime `src` et les fichiers `tsconfig*.json` après la compilation : l'image finale ne contient que `config/`, `dist/`, `node_modules/` et `package*.json`.

**Conséquences**
- Image de l'indexer d'environ 280 Mo, sans devDependencies ni sources TypeScript, exécutée sans root.
- Les trois modules suivent le même modèle de build Docker.
- Charger depuis du CommonJS des paquets uniquement ESM (`config` 5, `ky` 2) nécessite `require()` d'un module ESM, actif par défaut à partir de Node 22.12. Hors conteneur, `node dist/main.js` exige donc Node ≥ 22.12 (le projet vise Node 26).
- `npm run dev` (tsx) reste disponible pour le développement local.

---

## ADR-012 : Rotation des alias `latest_pokenode` / `previous_pokenode`

**Statut** : Acceptée, 2026-11-19

**Contexte**
Chaque exécution de l'indexer crée un index `pokenode_<timestamp>` et lui ajoutait l'alias `latest_pokenode` sans le retirer des index précédents. Après plusieurs exécutions, l'alias pointait sur plusieurs index : le backend, qui lit `latest_pokenode`, renvoyait des doublons. Les index s'accumulaient aussi sans limite dans le cluster. Un run en échec laissait de plus un index partiellement rempli.

**Décision**
- **Au plus deux index** `pokenode_*` dans le cluster :
  - le **latest**, seul porteur de `latest_pokenode`, lu par le backend ;
  - le **previous**, porteur de `previous_pokenode`, gardé pour un retour arrière.
- **Bascule atomique** : un seul appel `indices.updateAliases` retire `latest_pokenode` et `previous_pokenode` de leurs porteurs actuels, pose `latest_pokenode` sur le nouvel index et `previous_pokenode` sur l'ancien latest. À aucun moment l'alias ne pointe sur zéro ou plusieurs index.
- **Le previous est choisi d'après les alias**, pas d'après l'ordre des timestamps : c'est le plus récent des index qui portaient `latest_pokenode`. Un index orphelin plus récent (run raté) n'est donc jamais promu.
- **Nettoyage après la bascule** : tous les `pokenode_*` autres que le latest et le previous sont supprimés. Un échec de suppression est logué en `warn` sans faire échouer le run ; le run suivant fera le ménage.
- **Run en échec** : si la création, le remplissage ou le flush échoue, le nouvel index est supprimé, l'erreur d'origine est relancée et les alias ne bougent pas. Un échec de cette suppression est logué en `warn` sans masquer l'erreur d'origine.
- **Documents refusés par Elasticsearch** : `PokeIndexRepository.bulkIndex` lève une `AggregateError` quand la réponse du bulk contient `errors: true`, ce qui déclenche le cas « run en échec ». Un index incomplet ne peut donc pas devenir latest.
- **Répartition dans les couches** :
  - `PokeIndexRepository` : `getIndicesWithAliases` (`indices.resolveIndex`), `swapAliases` (`indices.updateAliases`), `deleteIndices` (`indices.delete`). `setAlias` est supprimé.
  - `AliasRotationService` : décide qui devient latest / previous et quoi supprimer, sans accès direct au client Elasticsearch. Seule `rotate(newIndex)` est publique.
  - `PokeIndexationService` : remplit le nouvel index, le supprime en cas d'échec, puis appelle `AliasRotationService.rotate`.
- `INDEX_PREFIX`, `LATEST_ALIAS` et `PREVIOUS_ALIAS` sont dans `indexer/src/constants.ts`, les types (`IndexWithAliases`, `AliasAction`, `RotationPlan`) dans `indexer/src/types/alias.d.ts`.

**Conséquences**
- Le backend lit toujours un seul index via `latest_pokenode`, sans modification de son côté.
- Retour arrière manuel possible : basculer `latest_pokenode` sur l'index qui porte `previous_pokenode`.
- Le premier run après déploiement corrige l'état existant : `latest_pokenode` est retiré de tous ses anciens porteurs, le plus récent devient previous et les autres sont supprimés.
- Pendant un run, le cluster contient temporairement trois index (latest, previous et l'index en cours de remplissage).
- Le préfixe `pokenode_` est réservé à l'indexer : tout index qui le porte sans être latest ou previous est supprimé à la rotation suivante.

---

## ADR-013 : Client HTTP unique : ky via le connecteur PokeAPI

**Statut** : Acceptée, 2026-11-19

**Contexte**
`PokeRepository` utilisait deux clients HTTP. La liste paginée passait par `pokeApiConnector.client` (ky), mais `fetchPokemon` appelait `axios` directement. Ces appels utilisent les URLs absolues renvoyées par PokeAPI (types, species, evolution chain). Or le connecteur créait ky avec l'option `prefix`, qui colle sa valeur devant l'entrée : une URL absolue devenait `https://pokeapi.co/api/v2/https://pokeapi.co/...`. axios contournait donc le connecteur.

**Décision**
- `PokeAPIConnector` crée ky avec `baseUrl` au lieu de `prefix`. ky résout alors l'entrée selon le standard `URL` : un chemin relatif (`pokemon?offset=…`) est résolu contre la base, une URL absolue est utilisée telle quelle.
- Le connecteur ajoute un slash final à l'URL configurée si elle n'en a pas (`static #withTrailingSlash`). Sans lui, `https://pokeapi.co/api/v2` + `pokemon` serait résolu en `/api/pokemon`.
- `PokeRepository` appelle `pokeApiConnector.client` directement pour tous ses appels (`client.get<T>(url).json()`), sans helper intermédiaire.
- `axios` est retiré des dépendances de l'indexer.

**Conséquences**
- Un seul client HTTP dans l'indexer : tous les appels à PokeAPI passent par le connecteur et partagent sa configuration (hooks, retry, timeout).
- Les erreurs HTTP sont des `HTTPError` de ky, plus des `AxiosError`.
- `POKE_API_URL` peut être fourni avec ou sans slash final.
- Le backend garde sa propre dépendance `axios`, hors du périmètre de cette décision.

---

## ADR-014 : Route `POST /battles` : proxy brut du stream du chatbot

**Statut** : Acceptée, 2026-11-19

**Contexte**
Le web-app doit envoyer deux Pokémon (ou plus) dans une arène et afficher le combat raconté par un LLM. Le LLM est un chatbot VirtualBrain dont le *brain* a été alimenté par l'export Markdown de `/contents/all`. Son API exige d'échanger une clé d'API contre des tokens d'une heure, limite le débit des appels et renvoie la réponse en stream. La clé ne doit jamais quitter le backend.

**Décision**
- **Route** : `POST /battles` avec le corps JSON `{ "pokemonIds": ["25", "6"] }`. POST plutôt que GET, parce que la requête crée une bataille et que le corps s'étend sans casser l'URL (plus de combattants, options). Le front lit le stream avec `fetch` et un `ReadableStream`, sans `EventSource`.
- **Validation dans le contrôleur** : de `MIN_FIGHTERS` (2) à `MAX_FIGHTERS` (6) identifiants distincts et non vides, en texte ou en entier. Sinon `400 ERR_INVALID_BATTLE_REQUEST`.
- **Vérification métier dans `BattleService`** : chaque Pokémon est chargé avec `PokeService.getById`, sans nouvelle méthode de repository. Tous les identifiants introuvables sont réunis dans une `PokemonNotFoundError` (404). Une autre erreur d'Elasticsearch est relancée telle quelle.
- **Prompt minimal** : il ne contient que les identifiants et une consigne de déroulé. Le *brain* dispose déjà des fiches des Pokémon : renvoyer les stats dans le prompt serait redondant.
- **Proxy brut** : la réponse du chatbot est transmise telle quelle en `text/plain; charset=utf-8`, avec `pipeline(stream, res)`. Pas de réencodage en SSE. Les en-têtes sont envoyés tout de suite (`res.flushHeaders()`) pour que le client reçoive le 200 avant le premier morceau.
- **Contrat VirtualBrain isolé** dans `ChatbotConnector` et `BattleRepository` :
  - `POST v1/auth/api-key/token` `{ apiKey }` renvoie `{ accessToken, refreshToken, expiresIn, chatbotId }`, avec `expiresIn` en secondes ;
  - `POST v1/auth/api-key/refresh` `{ refreshToken, chatbotId }` fait tourner les tokens ;
  - `POST v1/open-completion/{chatbotId}/query` `{ query }`, avec `Authorization: Bearer <accessToken>`, renvoie le stream.
- **Tokens gérés par `BattleRepository`** :
  - cache en mémoire, renouvelé 30 s avant l'expiration ;
  - renouvellement par `/refresh` avec le dernier refresh token reçu, et retour à l'échange de la clé si le refresh échoue ;
  - une seule authentification en cours à la fois, partagée par les requêtes simultanées ;
  - sur un 401 de `/query`, le cache est vidé et la requête rejouée une seule fois.
- **Session `x-session-id` générée par le chatbot** : la première question part sans l'en-tête, l'id est lu dans la réponse et relayé au client dans `X-Session-Id`. `ChatbotConnector.withSession(sessionId?)` renvoie un client ky qui ajoute l'en-tête pour les questions de suivi. L'id n'est jamais stocké dans le connecteur, partagé par toutes les requêtes.
- **Rate limiting en deux temps** :
  - `ChatbotConnector` configure le réessai de ky sur les POST en 429 et 503, en respectant `Retry-After`, avec un backoff borné. Si `Retry-After` dépasse `maxRetryAfterMs`, il abandonne tout de suite (`shouldRetry`), parce que l'option `maxRetryAfter` de ky 2 plafonne l'attente au lieu d'abandonner ;
  - si la limite persiste, `BattleRepository` lève une `ChatbotRateLimitError` et la route répond `429 ERR_CHATBOT_RATE_LIMITED` en relayant `Retry-After`.
  - Les réglages sont dans `settings.chatbotRetry` de la config, pas dans `connectors`.
- **Erreurs au format `ServiceErrorInterface`** (`{ code, message, value }`) : 400, 404, 429, `502 ERR_CHATBOT_UNAVAILABLE` (échec ou délai du chatbot), `500 ERR_INTERNAL` pour le reste. Le 500 est explicite pour qu'Express ne reprenne pas le `statusCode` d'une erreur Elasticsearch, ce qui renvoyait un 400 trompeur.
- **Annulation** : un `AbortController` est lié à l'événement `close` de la réponse. Si le client se déconnecte, la requête au chatbot est annulée.
- **Client HTTP** : `ky` remplace `axios` dans le backend, comme dans l'indexer (ADR-013). Il est chargé depuis le CommonJS par `require()` d'un module ESM (ADR-011).
- **Tests** : `fetch` simulé pour le connecteur et le repository, qui passent par le vrai `ChatbotConnector`. `supertest` pour le contrôleur, sans gérer de serveur à la main.

**Conséquences**
- La clé d'API reste côté backend. Le front ne voit que le texte du combat et l'id de session.
- Changer de fournisseur LLM ne touche que `ChatbotConnector`, `BattleRepository` et `types/chatbot.d.ts`.
- Une fois les en-têtes envoyés, une erreur du chatbot ne peut plus changer le statut : la connexion est coupée et le client voit un texte tronqué.
- Les tokens sont en mémoire : chaque instance du backend fait son propre échange à la première bataille, et un redémarrage vide le cache.
- Le format exact du stream (texte brut ou SSE) n'est pas encore confirmé. S'il s'agit de SSE, le décodage ira dans `BattleRepository`, sans toucher au contrôleur.
- `X-Session-Id` prépare le bonus tour par tour : `BattleRepository.query` accepte déjà un `sessionId` pour les questions de suivi.

---

## ADR-015 : Le `chatbotId` est fourni par l'échange de la clé d'API

**Statut** : Acceptée, 2026-11-19. Remplace en partie l'ADR-014.

**Contexte**
L'ADR-014 lisait le `chatbotId` dans la config (`CHATBOT_ID`) pour le corps de `/refresh` et le chemin de `/query`. Or `POST v1/auth/api-key/token` renvoie déjà ce `chatbotId` avec les tokens : la clé d'API suffit à identifier le chatbot. Garder les deux sources ajoutait un réglage à maintenir et un risque d'incohérence entre la clé et l'id configuré.

**Décision**
- `CHATBOT_ID` et `connectors.chatbot.chatbotId` sont supprimés de la config, de `docker-compose.yml` et de `ChatbotConnectorParams`. `ChatbotConnector` n'expose plus que `apiKey`.
- Le `chatbotId` est stocké avec les tokens dans `IChatbotTokens`, comme les autres valeurs renvoyées par `/token` et `/refresh`.
- `BattleRepository.refreshTokens(current: IChatbotTokens)` envoie `{ refreshToken, chatbotId }` tirés des tokens courants.
- `BattleRepository.#getTokens()` renvoie l'objet de tokens entier. `#sendQuery` en tire l'`accessToken` et le `chatbotId` pour `v1/open-completion/{chatbotId}/query`.

**Conséquences**
- Seule la clé d'API (`CHATBOT_API_KEY`) est à configurer pour le chatbot.
- Si une rotation renvoie un autre `chatbotId`, les requêtes suivantes l'utilisent.
- Le `chatbotId` n'est connu qu'après la première authentification, ce qui ne change rien au déroulé : chaque requête au chatbot commence par obtenir des tokens valides.

---

## ADR-016 : Arène de combat : lecture du stream hors TanStack Query

**Statut** : Acceptée, 2026-11-19

**Contexte**
Le web-app doit permettre de choisir deux Pokémon et raconter le combat renvoyé par `POST /battles` (ADR-014). La réponse est un texte brut en stream, sans structure : rien n'indique le vainqueur. Une bataille n'est pas idempotente et coûte un appel au chatbot, dont le débit est limité.

**Décision**
- **Duel uniquement** : `BATTLE_SIZE = 2` dans `src/constants.ts`, même si le backend accepte jusqu'à 6 combattants.
- **Sélection depuis la grille** : bouton « Add to battle » sur `PokemonCard` (désactivé quand l'équipe est pleine), barre fixe `BattleBar`, puis vue Arène.
- **Sélection en mémoire** : `BattleSelectionProvider` (contexte React) garde les entités `Pokemon` choisies, et la logique pure est dans `BattleSelectionService`. Elle n'est pas dans l'URL, pour éviter de recharger chaque Pokémon par id.
- **Vue dans l'URL** : `?view=battle` via `ViewParamService` et `browserHistoryConnector`, sur le modèle de `PageParamService`. Les autres paramètres (`page`, `q`, `types`) sont conservés au retour.
- **Lecture du stream** :
  - `PokeBackendConnector.postStream` renvoie la `Response` ky brute (`Accept: text/plain`, `retry: 0`). Le `timeout` de ky (`BATTLE_TIMEOUT_MS`) ne court que jusqu'aux en-têtes, que le backend envoie tout de suite ;
  - `BattleApiRepository` décode le corps avec `getReader()` et `TextDecoder` en mode `stream`, pour ne pas couper un caractère UTF-8 entre deux morceaux ;
  - `BattleService.run` est un générateur asynchrone qui produit une `BattleNarration` cumulée à chaque morceau ;
  - `useBattle` (machine d'états `idle → connecting → streaming → done | error`, `useReducer`) consomme ce générateur.
  - **Pas de TanStack Query** : un résultat progressif et non rejouable ne correspond ni à une query (cache, relances) ni à une mutation (résultat unique).
- **Annulation** : un `AbortController` par combat, annulé par « Cancel », par un nouveau lancement ou au démontage (retour à la grille). Le backend annule alors la requête au chatbot.
- **Vainqueur par marqueur** : le prompt du backend doit finir par la ligne `VAINQUEUR: <nom>` (`WINNER_MARKER`). `BattleNarration` retire cette ligne du récit (tolère casse, Markdown et espace avant `:`) et masque un marqueur partiel pendant le stream. `BattleService.findWinner` le rapproche d'un des deux combattants (sans casse ni accents). Sans marqueur : « No winner was announced ».
- **Erreurs** : `BattleError` implémente `ServiceErrorInterface` (même contrat que le backend). Le repository lit le corps JSON (`HTTPError.data`) et `Retry-After` ; un 429 bloque « Retry » pendant le délai. Un stream coupé donne `ERR_STREAM_INTERRUPTED` et garde le récit partiel.
- **Accessibilité** : le récit est une région `aria-busy` sans `aria-live` (pas de lecture morceau par morceau), le vainqueur est annoncé par une région `role="status"`, et le curseur clignotant est coupé avec `prefers-reduced-motion`.
- **nginx** : `proxy_buffering off` et `proxy_read_timeout 120s` sur `/api/`, en plus de `X-Accel-Buffering: no` envoyé par le backend.

**Conséquences**
- Le format du marqueur est un contrat entre le prompt du backend et le front : le changer d'un côté impose de changer `WINNER_MARKER` de l'autre.
- Le LLM peut ignorer la consigne : le front affiche alors le récit sans vainqueur, sans erreur.
- Le récit est affiché en texte brut (`whitespace-pre-wrap`) : un éventuel Markdown du chatbot n'est pas mis en forme.
- Après un rechargement sur `?view=battle`, la sélection est perdue et l'arène demande de choisir 2 Pokémon.
- `X-Session-Id` est lu par le repository mais pas encore utilisé : il servira pour un combat tour par tour.

---

## ADR-017 : Validation des requêtes avec ajv

**Statut** : Acceptée, 2026-11-20. Remplace en partie l'ADR-014 (validation de `POST /battles`).

**Contexte**
Chaque contrôleur validait ses entrées à la main, de façon inégale. `POST /battles` avait sa fonction `parsePokemonIds`. `GET /pokemons` passait `from` et `size` à `parseInt` sans contrôle : `size=abc` envoyait `NaN` à Elasticsearch, `size=10abc` devenait `10`, et aucune borne ne limitait la taille de page. Les routes `/:id` testaient `typeof id === "string"`, ce qui est toujours vrai pour un paramètre de route, et répondaient `400` sans corps.

**Décision**
- **ajv 8 et JSON Schema typés** : un schéma `JSONSchemaType<T>` par entrée, dans `src/controllers/schemas/` (`PokemonSchemas`, `ContentSchemas`, `BattleSchemas`, classes à champs `static readonly`). Les types d'entrée sont dans `src/types/` (`PokemonSearchQuery`, `PokemonIdParams`, `ContentParams`, `BattleRequest`), et les types de la validation dans `types/validation.d.ts` (`RequestSchemas`, `ValidationIssue`, `ValidatedLocals`).
- **Middleware `validateRequest(schemas)`** dans `src/controllers/middlewares/`. C'est une fonction exportée, pas une classe à méthodes statiques : un middleware Express n'a pas d'état à porter.
  - Une seule instance Ajv : `allErrors` (toutes les erreurs d'un coup), `coerceTypes: "array"` (texte de la query vers entier, valeur seule vers tableau), `useDefaults`.
  - Les schémas sont compilés une fois, à la déclaration de la route.
  - `params`, `query` et `body` sont validés chacun sur une copie (`structuredClone`).
- **Résultat dans `res.locals.validated`** : `{ params, query, body }` convertis et complétés par les valeurs par défaut. Le contrôleur le lit avec un `Response<unknown, ValidatedLocals<P, Q, B>>` typé, sans conversion forcée. On ne réécrit pas `req` : en Express 5, `req.query` est un getter recalculé à chaque lecture et ne peut pas être réassigné, et la requête brute reste disponible.
- **Échec** : toutes les erreurs des trois parties sont réunies en `ValidationIssue` (`{ location, path, keyword, message }`). `path` est un JSON Pointer, qui pointe aussi la propriété manquante (`required`) ou en trop (`additionalProperties`), alors qu'ajv laisse ce chemin vide. Le middleware appelle `next(new InvalidRequestError(issues))` (voir ADR-018).
- **Un seul code `ERR_INVALID_REQUEST` pour toutes les routes**. `ERR_INVALID_BATTLE_REQUEST` est supprimé : le front ne s'en servait pas, et `validationErrors` dit précisément ce qui est invalide.
- **Règles** :
  - identifiant de Pokémon (`/pokemons/:id`, `/contents/:pokemonId`, `pokemonIds`) : `POKEMON_ID_PATTERN = ^[1-9]\d*$`. Un entier est converti en texte (`6` devient `"6"`), mais `6.5`, `true`, `0`, `"025"` et `"pikachu"` sont refusés ;
  - `POST /battles` : de `MIN_FIGHTERS` à `MAX_FIGHTERS` identifiants uniques, sans autre clé dans le corps ;
  - `GET /pokemons` : `q` d'au plus `MAX_KEYWORDS_LENGTH` (100) caractères, `types` de 1 à `MAX_POKEMON_TYPES` (18) valeurs non vides et uniques, `from` ≥ 0 (défaut `DEFAULT_OFFSET`), `size` de 1 à `MAX_PAGE_SIZE` (100, défaut `DEFAULT_SIZE`), aucune autre clé.
- **Tests** : `validateRequest` sur une petite app Express avec `supertest`, puis chaque contrôleur avec le service simulé.

**Conséquences**
- Des requêtes tolérées jusqu'ici reçoivent un `400` : `size=10abc`, `size=1.5`, `size=0`, un identifiant non numérique ou entouré d'espaces, des `types` vides ou en double, `q` répété, une clé inconnue. Le front n'en envoie aucune.
- Les valeurs ne sont plus nettoyées des espaces : `" 25 "` est refusé au lieu d'être accepté.
- `JSONSchemaType` vérifie le type et le caractère `nullable` de chaque propriété, mais pas qu'une propriété obligatoire figure bien dans `required` : les tests couvrent ce cas.
- Valider une nouvelle route demande un schéma et un `validateRequest` dans sa déclaration.

---

## ADR-018 : Erreurs métier converties en erreurs HTTP par `handleError`

**Statut** : Acceptée, 2026-11-20. Remplace en partie l'ADR-014 (gestion des erreurs de `POST /battles`).

**Contexte**
`BattleController` associait lui-même chaque erreur à un statut, avec `sendError` et un `try/catch`. Les autres contrôleurs n'avaient aucune gestion d'erreur : `PokeService.getById` levait `Error("ERR_POKEMON_NOT_FOUND")`, et le 404 d'Elasticsearch remontait jusqu'au gestionnaire par défaut d'Express, qui répondait une 500 en HTML. Chaque nouvelle route aurait dû refaire ce travail.

**Décision**
- **Erreurs métier** dans `src/errors/` : `PokemonNotFoundError`, `ChatbotRateLimitError`, `ChatbotUnavailableError`. Elles implémentent `ServiceErrorInterface`, portent leur propre code (`readonly code = "ERR_..."`, jamais dans `constants.ts`) et ignorent tout de HTTP. Elles sont levées par les services, ou par les repositories quand ils traduisent une erreur de transport.
- **Erreurs propres à HTTP** dans `src/errors/http/` : `InvalidRequestError` (validation, voir ADR-017) et `InternalServerError` (toute erreur inattendue, gardée dans `cause`).
- **Traduction au plus près de la source** :
  - `BattleRepository.#mapError` : un `429` du chatbot devient `ChatbotRateLimitError`, toute autre `HTTPError` ou un `TimeoutError` de ky devient `ChatbotUnavailableError`, avec l'erreur ky dans `cause` ;
  - `PokeRepository.getById` renvoie `null` quand le Pokémon n'existe pas (`ignore: [404]` du client Elasticsearch), et `PokeService.getById` lève alors `PokemonNotFoundError([id])`. `BattleService` reconnaît cette erreur pour réunir tous les identifiants introuvables.
- **`WebserverErrorInterface` étend `ServiceErrorInterface` et `HttpError`** (de `http-errors`, la bibliothèque qu'Express utilise déjà) : `status` et `statusCode`, `expose` (vrai pour les 4xx), `headers`, plus `cause` (l'erreur métier) et `validationErrors`. Nos erreurs et celles d'Express ont ainsi la même forme.
- **Middleware `handleError`** (fonction exportée dans `src/controllers/middlewares/`), enregistré en dernier dans `app.ts` :
  - `toWebserverError` crée l'erreur avec `createError(statusCode, message)` puis ajoute `code`, `value` et `cause`. Une suite de `if (error instanceof …)` donne : `InvalidRequestError` → 400 avec `validationErrors`, `PokemonNotFoundError` → 404, `ChatbotRateLimitError` → 429 avec `Retry-After` dans `headers`, `ChatbotUnavailableError` → 502 ;
  - une erreur `http-errors` en 4xx levée par Express (JSON mal formé, corps trop gros, encodage non supporté) devient une `InvalidRequestError` qui garde son statut. L'issue est `{ location: "body", path: "", keyword: <type d'erreur>, message }` ;
  - tout le reste devient une `InternalServerError` (500), loggée avec `console.error` ;
  - la réponse est `{ code, message, value, validationErrors? }`, avec les `headers` de l'erreur ;
  - si la réponse a déjà commencé (stream de bataille), `handleError` passe la main à Express avec `next(error)`.
- **Contrôleurs sans `try/catch`** : Express 5 transmet à `handleError` les rejets des handlers async.
- **Dépendances** : `http-errors` devient une dépendance directe du backend (`@types/http-errors` en dev). `ts-pattern` est retiré du backend : de simples `if` suffisent.

**Conséquences**
- Une nouvelle erreur demande une classe et une branche dans `toWebserverError`. Aucun contrôleur ne connaît les codes de statut.
- `GET /pokemons/:id` et `GET /contents/:pokemonId` répondent un `404 ERR_POKEMON_NOT_FOUND` en JSON au lieu d'une 500 HTML.
- Toutes les erreurs ont le même format JSON, y compris un corps illisible, qui répond `400` au lieu de la page HTML d'Express.
- La signature d'index `[key: string]: any` de `HttpError` affaiblit le typage de `WebserverErrorInterface` : une propriété mal nommée compile sans erreur.
- Une route inconnue ne passe pas par `handleError` : Express répond toujours son 404 HTML par défaut.

---

## ADR-019 : Authentification du chatbot isolée dans `ChatbotAuthRepository`

**Statut** : Acceptée, 2026-11-22. Remplace en partie l'ADR-014 (tokens gérés par `BattleRepository`, tests par `fetch` simulé) et l'ADR-015 (méthodes de tokens de `BattleRepository`).

**Contexte**
`BattleRepository` mêlait deux responsabilités : interroger le chatbot (prompt, stream, session, conversion des erreurs) et gérer les tokens VirtualBrain (échange de la clé, refresh, cache, authentification unique partagée). L'état des tokens, statique et privé, n'était jamais remis à zéro entre les tests : plusieurs tests échouaient selon leur ordre d'exécution. Un cache de tokens partagé entre les instances du backend est envisagé, et il faut pouvoir le brancher sans toucher à la logique de bataille. Enfin, sur des 401 simultanés, une requête en retard pouvait vider le cache après qu'une autre avait déjà obtenu des tokens neufs, ce qui provoquait un échange de clé inutile.

**Décision**
- **Nouveau `ChatbotAuthRepository`** dans `src/repositories/`, classe statique comme les autres repositories :
  - `getTokens()` renvoie des tokens valides : cache en mémoire, échange de la clé au premier appel, refresh à l'expiration avec retour à l'échange si le refresh échoue, une seule authentification en cours à la fois (`#pendingAuth`) ;
  - `invalidate(rejected)` vide le cache **seulement si** `rejected.accessToken` est encore celui en cache. Des tokens déjà remplacés ne sont pas effacés ;
  - tout le reste est privé (`#authenticate`, `#exchangeApiKey`, `#refreshTokens`, `#isValid`, `#toTokens`). Les erreurs ky remontent telles quelles, sans conversion.
- **`BattleRepository` ne gère plus les tokens** : `#sendQuery` demande ses tokens à `ChatbotAuthRepository.getTokens()`. Sur un 401, il appelle `invalidate(tokens)` avec les tokens refusés et rejoue la requête une seule fois. Il garde la conversion des erreurs (`#mapError`), y compris pour un échec d'authentification : celui-ci devient une `ChatbotUnavailableError` ou une `ChatbotRateLimitError`, comme avant.
- **Constante** : la marge de 30 s avant expiration devient `CHATBOT_TOKEN_EXPIRY_MARGIN_MS` dans `src/constants.ts`.
- **Tests sans `fetch` simulé** : `../../connectors` est simulé par un objet qui n'expose que ce que le repository utilise (`client.post`, plus `apiKey` ou `withSession`). Les tests programment et vérifient `chatbotConnector.client.post`, nommé explicitement, sans alias. Le transport ky reste testé dans `ChatbotConnector.test.ts`.
  - **Assertions directes sur le mock, sans fonction qui relit ou filtre ses appels** :
    - un appel attendu : `toHaveBeenCalledExactlyOnceWith(path, options)` ;
    - plusieurs appels : `toHaveBeenNthCalledWith(n, path, expect.objectContaining(...))` pour une partie des options, ou `toEqual` sur `vi.mocked(chatbotConnector.client.post).mock.calls` pour la suite complète des appels, dans l'ordre, avec leurs chemins et leurs corps ;
    - aucun appel attendu : `not.toHaveBeenCalled()` ;
    - les appels attendus peuvent être décrits par des valeurs (`EXCHANGE_CALL`, `refreshCall(refreshToken, chatbotId?)`), qui ne lisent pas le mock.
  - `BattleRepository.test.ts` simule aussi `ChatbotAuthRepository` (`getTokens`, `invalidate`).
  - `ChatbotAuthRepository.test.ts` appelle `vi.resetModules()` puis réimporte le repository dans chaque `beforeEach`. L'état statique repart ainsi de zéro sans méthode publique réservée aux tests. Le mock du connecteur n'est pas réévalué par `resetModules` : l'import statique du test et le repository rechargé partagent le même `client.post`.

**Conséquences**
- Le cache partagé entre instances se branchera dans `ChatbotAuthRepository` seulement. `BattleRepository` et `BattleService` ne changeront pas.
- Les tokens restent en mémoire, par instance du backend, comme dans l'ADR-014.
- Le refresh repasse à l'échange de clé quelle que soit l'erreur (réseau, 5xx, 401), sans la journaliser.
- `BattleRepository` connaît encore les tokens : il pose le header `Authorization`, construit le chemin avec le `chatbotId` et gère le rejeu sur 401.
- Un nouveau test de `ChatbotAuthRepository` doit importer la classe dans le `beforeEach` (type importé avec `import type`), et non par un import statique.

---

## ADR-020 : Coalescence des requêtes PokeAPI dans `PokeResourceRepository`

**Statut** : Acceptée, 2026-11-23.

**Contexte**
L'indexer faisait 6 176 appels à PokeAPI par exécution. `PokeRepository.fetchPokemon` demandait les types, l'espèce et la chaîne d'évolution de chaque Pokémon, alors que PokeAPI n'a que 18 types portés, 1 025 espèces et 540 chaînes d'évolution pour 1 351 Pokémon. Les 200 Pokémon d'une page sont récupérés en parallèle (`Promise.all`). Ils demandent donc les mêmes types au même moment, avant la première réponse : un cache de résultats ne servirait à rien à l'intérieur d'une page. PokeAPI demande à ses clients de mettre ses réponses en cache.

**Décision**
- **Nouveau `PokeResourceRepository`** dans `src/repositories/`, classe statique comme les autres repositories :
  - `get<T>(url)` garde **la promesse** de chaque URL dans une `Map` privée (`#requests`). Les appels simultanés sur une même URL partagent une seule requête (coalescence), et les appels suivants reçoivent la réponse déjà obtenue (mémoïsation) ;
  - en cas d'échec, l'URL est retirée de la `Map` avant que l'erreur soit relancée. Une erreur passagère ne reste pas en mémoire, et l'appel suivant retente la requête ;
  - `clear()` vide la `Map`.
- **`PokeRepository.fetchPokemon`** demande `type`, `pokemon-species` et `evolution-chain` à `PokeResourceRepository.get`. `pokemon/{id}` et la liste paginée restent des appels directs au connecteur : chaque URL n'est demandée qu'une fois par exécution.
- **Un cache par exécution** : `PokeRepository.getPokemons` appelle `PokeResourceRepository.clear()` dans un `finally`. Le cache est donc vidé à la fin normale, sur une erreur, et quand le consommateur sort de la boucle `for await`. `PokemonIndexationService`, `main.ts` et les connecteurs ne changent pas.
- **Les espèces restent dans le cache**, au vu de deux exécutions mesurées le 2026-11-23 sur les 1 351 Pokémon, sans écriture dans Elasticsearch :

  | | Sans cache | Espèces en cache (retenu) | Espèces en appel direct |
  |---|---|---|---|
  | Appels à PokeAPI | 6 176 | 2 941 (-52,4 %) | 3 267 (-47,1 %) |
  | Heap max (après GC) | | 61 Mo | 25 Mo |
  | Heap après `clear()` | | 22 Mo | 22 Mo |

- **Tests** :
  - `PokeResourceRepository.test.ts` simule `../../connectors`. `client.get` renvoie un objet dont `json` est le mock `pokeApiResponseJson`, configuré par `mockResolvedValueOnce` ou `mockRejectedValueOnce`. Le test appelle `vi.resetModules()` et réimporte le repository dans chaque `beforeEach`, comme `ChatbotAuthRepository.test.ts` (ADR-019) ;
  - `PokeRepository.test.ts` simule `../PokeResourceRepository` en plus du connecteur, et vérifie que `clear` est appelé à la fin de la liste comme en cas d'échec.

**Conséquences**
- L'indexer fait environ deux fois moins d'appels à PokeAPI, pour les mêmes documents : 1 351 Pokémon indexés.
- Le cache occupe environ 40 Mo de heap pendant une exécution, dont environ 36 Mo pour les espèces, qui n'évitent que 326 appels. Si la mémoire devient un problème, on pourra retirer les espèces du cache.
- Les pics de requêtes simultanées baissent peu : une page lance toujours environ 200 appels `pokemon` et 200 appels `pokemon-species` en même temps. Limiter la concurrence fera l'objet d'une décision séparée.
- Rien n'est gardé entre deux exécutions : chaque exécution relit PokeAPI en entier.
- Un même `ApiType` ou `ApiEvolutionChain` sert à construire plusieurs Pokémon. Ces objets ne doivent jamais être modifiés.
- Une erreur sur une ressource partagée fait échouer tous les Pokémon qui l'attendent. Une seule erreur suffit déjà à faire échouer l'exécution, comme avant.
- L'état est statique et commun au processus : l'indexer ne doit lancer qu'une exécution à la fois.

---

## ADR-021 : Connexion des connecteurs au démarrage et arrêt propre du backend

**Statut** : Acceptée, 2026-11-24.

**Contexte**
`app.ts` appelait `httpServer.listen()` sans connecter les connecteurs : `PokeStoreConnector.connect()` (ping d'Elasticsearch) n'était jamais appelé. Si Elasticsearch était injoignable, l'API démarrait quand même et chaque requête échouait en 500. Aucun signal n'était intercepté : sur un `SIGTERM` (`docker compose stop`, redéploiement, redémarrage de nodemon), le process s'arrêtait aussitôt, coupait les requêtes en cours, y compris les streams de `POST /battles`, et ne fermait pas le client Elasticsearch. La clé `service.gracefulShutdownDelayInSeconds` était typée dans `config.ts` mais absente des fichiers de config.

**Décision**
- **Nouveau module `src/manager.ts`**, sous forme de fonctions et non de classe, comme les middlewares :
  - `start(server, port)` connecte tous les connecteurs, puis ouvre le port. Aucune requête n'est acceptée tant qu'Elasticsearch n'a pas répondu au ping ;
  - `shutdown(server, delayMs)` appelle `server.close()`, qui refuse les nouvelles connexions et attend la fin des requêtes en cours. Au-delà de `delayMs`, `server.closeAllConnections()` coupe les connexions restantes. Les connecteurs ne sont fermés qu'ensuite ;
  - les fonctions internes (`startConnectors`, `stopConnectors`, `startServer`, `stopServer`) ne sont pas exportées. Les connecteurs sont parcourus avec `Object.values(connectors)`, comme dans `indexer/src/main.ts` ;
  - le module n'appelle ni `process.exit` ni `process.on`.
- **`app.ts`** suit le modèle de l'indexer : une fonction `main()` et un bloc `if (require.main === module)`.
  - **Démarrage** : si un connecteur ne se connecte pas, l'erreur est loguée et le process sort en code 1 sans ouvrir le port. Il n'y a pas de nouvelle tentative : c'est à l'orchestrateur de relancer le conteneur.
  - **Arrêt** : `SIGTERM` et `SIGINT` déclenchent `onTermination`, qui appelle `shutdown()` puis sort en code 0, ou 1 si l'arrêt échoue. Les handlers sont posés avec `process.once` : un second Ctrl+C reprend le comportement par défaut de Node et tue le process.
- **Délai d'arrêt** : `service.gracefulShutdownDelayInSeconds` vaut 10 dans `config/default.json`. La variable d'environnement `GRACEFUL_SHUTDOWN_DELAY_IN_SECONDS` le surcharge.
- **nodemon** : `"signal": "SIGTERM"` dans `nodemon.json`. Par défaut, nodemon envoie `SIGUSR2`, et ses redémarrages ne passaient donc pas par l'arrêt propre.
- **Pas de tests pour `manager.ts`** : le comportement a été vérifié sous Node 26, avec un faux Elasticsearch, sur `dist/app.js` et sous nodemon :

  | Scénario | Résultat |
  |---|---|
  | Elasticsearch injoignable au démarrage | `Server failed to start`, code 1, port jamais ouvert |
  | `SIGTERM` pendant une recherche de 2 s, délai de 10 s | la requête reçoit son 200, `Server stopped`, code 0 après 2,2 s |
  | `SIGTERM` pendant une recherche de 5 s, délai de 1 s | connexion client coupée à 1 s, mais sortie en code 0 après 5,3 s seulement |
  | `rs` dans nodemon | `SIGTERM` reçu, `Server stopped`, puis redémarrage |

**Conséquences**
- Un Elasticsearch absent se voit dès le démarrage, et non plus à la première requête.
- Un combat en cours a jusqu'à 10 s pour se terminer. Au-delà, la coupure de la connexion déclenche le `AbortController` de `BattleController`, qui annule l'appel au chatbot.
- **Le délai ne borne pas la durée totale de l'arrêt.** Couper la connexion HTTP n'annule pas une recherche Elasticsearch déjà partie, et `pokeStoreConnector.close()` attend la fin de cette recherche. Le client Elasticsearch n'a pas de `requestTimeout` : un Elasticsearch bloqué peut retarder l'arrêt sans limite. Ajouter ce timeout fera l'objet d'une décision séparée.
- Docker envoie `SIGKILL` 10 s après `SIGTERM` par défaut, soit autant que le délai applicatif. Il faudra un `stop_grace_period` supérieur au délai pour le service `api` dans `docker-compose.yml`, et un `restart: on-failure` pour relancer l'API quand le démarrage échoue. Ni l'un ni l'autre n'est en place.
