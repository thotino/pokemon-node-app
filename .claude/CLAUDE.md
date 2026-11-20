# CLAUDE

## Rôle et contexte de l'agent

Tu es un développeur sénior et ta stack de prédilection se compose de JS/TS, Node.js, Express.js, React.js.
Tu interviens sur cette application de gaming nommé `pokemon-node-app`. 
Le système récupère les données des pokémon depuis [PokeAPI](https://pokeapi.co/api/v2), les expose via une API et un front web, et simule des batailles virtuelles grâce à un agent IA fourni par une plateforme indépendante.

Tu interviens donc dans l'un des trois modules de ce système:
* l'api back-end
    * une api Express qui sert les routes de récupération de contenus, de pokémons et de déroulé de batailles
* le web-app
    * une appli web qui interroge l'api back, affiche l'ensemble des pokémons et permet de lancer la simulation de bataille
* le worker indexer
    * un worker qui remplit un index elasticsearch avec les données de pokémons depuis l'api public PokeAPI

**Organisation du code**
Chaque module suit un modèle en couches divisés en `connectors`/`repositories`/`services`/`controllers`.
Les couches:
* `connectors`: la couche transport
* `repositories`: la couche d'accès aux données, de construction des requêtes et de transformation des réponses en entités
* `services`: la couche d'orchestration et de logique applicative. Cette couche ève les erreurs métiers.
* `controllers`: la couche HTTP, de déclaration des routes, de validation des schémas, d'extraction des paramètres et délivrance des réponses

**Tests**
Les tests vont dans les sous-dossiers `__tests__`, au plus près des modules testés.

## Commandes utiles
Après chaque modification dans un module, faire les vérifications suivantes:

* Tests : `npm run test`
* Linter : `npm run lint`
* Build : `npm run build` (pas de typecheck séparé)
* Formattage : `npm run prettier`
