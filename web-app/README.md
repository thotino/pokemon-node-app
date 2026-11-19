To install and launch: 

npm install 
npm run dev


## Battles

Pick 2 Pokémon in the grid with **Add to battle**, then click **Go to the arena** in the bar at the bottom of the page. The arena (`?view=battle`) sends `POST /api/battles` and tells the battle as the backend streams it.

The backend prompt must end the narration with a line `VAINQUEUR: <name>` (marker in `src/constants.ts`, the space before `:` is tolerated). The front removes this line from the text and shows the winner in a banner. Without it, the arena shows "No winner was announced."

The selection is kept in memory only: after a reload, the arena asks to pick 2 Pokémon again.
