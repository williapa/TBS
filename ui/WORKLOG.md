# Medal Versus - Worklog

> Historical record: this 2023 worklog describes retired client/server implementation work. It is preserved for project history and is not a source of current architecture or operating instructions. See `../docs/architecture.md` and `../docs/testing.md` for the supported system.

---
## Friday, March 3, 2023
---
- [ ] add income (triggered on turn change)
  

---
## Thursday, March 2, 2023
---
- [ ] add unit creation 


---
## Wednesday, March 1, 2023
---
- [ ] add player money, configurable from the start


---
## Tuesday, February 28th, 2023
---
- [ ] server: update move validation to allow full range
- [ ] commons: add attackable cell movement hilighting
- [ ] front end: add attack option to action form 
- [ ] front end: add basic details for attack esstimate 
- [ ] front end: validation for attack option
- [ ] back end: action "attack" + damage calculation
- [ ] back end: should return damage calculation result
- [ ] front end: while waiting for a response, do a a modal
- [ ] front end: animation. add a modal while waiting. display health/health of attack and defense unit on each side behind the terrain with their health bars below
- [ ] front end: add animation to the tiny units so they shoot at each other. or throw swords. or something.               


---
## Monday, February 27th, 2023
---
- [x] back end - make every event store active team of person performing move (need for front end)
- [x] front end - add player, unit to event
- [x] front end - add end turn event message
- [x] front end, auto-check for no more moves left and alert end turn (refactor to common)
- [ ] front end: add attack option to action form 
- [ ] front end: validation for attack option
- [ ] back end: damage calculation 


---
## Friday, February 24th, 2023 - Sunday, February 26th, 2023
---
- [x] implement server game action to validate move & save game state in dynamodb.
- [x] return 400 if invalid
- [x] game should wait for response before proceeding and display error if there is one (4 or 5xx)
- [x] back end - add events API that returns latest events
- [x] front end - display events (basic) in the UI
- [x] front end - add display CSS for events + scrolling
- [x] front end - add relative time stamp for events (seconds ago, etc)
- [ ] back end - make every event store active team of person performing move (need for front end)
- [ ] front end, auto-check for no more moves left and alert end turn 
- [ ] front end: add attack option to action form 
- [ ] front end: validation for attack option
- [ ] back end: damage calculation 
- [ ] front end: while waiting for a response, do an animation. add a modal while waiting
- [ ] in the modal, display health/health of attack and defense unit on each side behind the terrain with their health bars below
- [ ] add animation to the tiny units so they shoot at each other. or throw swords.
- [ ] add player money, configurable from the start
- [ ] add unit creation 
- [ ] add income (triggered on turn change)


---
## Thursday, February 23rd, 2023
---
### TODO:
- [x] add moved text on moved chars
- [x] should only let logged in user move on their turn 
- [x] create server endpoint for gameAction 
- [ ] implement server game action to validate move & save game state in dynamodb. return 400 if invalid
---
- [ ] game should wait for response before proceeding and display error if there is one (4 or 5xx)
- [ ] front end, check for no more moves left and alert end turn 
---
- [ ] front end: add attack option to action form 
- [ ] front end: validation for attack option
- [ ] back end: damage calculation 
- [ ] front end: while waiting for a response, do an animation. add a modal while waiting
- [ ] in the modal, display health/health of attack and defense unit on each side behind the terrain with their health bars below
- [ ] add animation to the tiny units so they shoot at each other. or throw swords.


---
## Wednesday, February 22nd, 2023
---
### TODO:
- [X] for movables, if no actions other than move & attack, reorder form & targetCells
- [X] when showing target Cells, clicking initial cell cancels move.
- [X] on targetCell click, dispatch move & save board
- [ ] create server endpoint for gameAction 
- [ ] implement server game action to validate move & save game state in dynamodb. return 400 if invalid
- [ ] game should wait for response before proceeding and display error if there is one (4 or 5xx)

---
## Tuesday, February 21st, 2023
---

### Todo:
- [ ] for movables, if no actions other than move & attack, reorder form & targetCells
- [ ] when showing target Cells, clicking initial cell cancels move.
- [ ] on targetCell click, dispatch move & save board
- [ ] create server endpoint for gameAction 
- [ ] implement server game action to validate move & save game state in dynamodb. return 400 if invalid
- [ ] game should wait for response before proceeding and display error if there is one (4 or 5xx)



---
## Saturday, February 18th, 2023 - Monday, February 20th, 2023
---
### Retrospective
- I have the foundation for move done
- I did not get very much done at all...
- I am a lazy son of a bitch
- I do get my work done though
- I just need to be more productive!

### Saturday Morning Notes 
- I ordered doordash ahead
- not a bad idea
- +1 for me to take garbage out
- I am having some trouble sleeping but I did okay last night
- I need to start cooking more
- I need to drink more tea + coffee, less soda
- Today is an opportunity to see the game to a playable state!!!
- You are buliding a prototype. Look at the golf + guy. He is more successful than you but attainably. Could you be in his position in 5 years? Maybe not. 
- Could you be in his position in 10 years? yes.
- Could you be past his position in 15 years? maybe.
- Where will you be tomorrow?
- "project milestone": a working local prototype by your birthday.

### What do I want to accomplish today?
- get actions form working
- get move working for applicable entries
- set up "action" API (add game event)
- make that API validate same stuff the client does (player turn, piece being moved, valid action, valid spot, etc
- add attack action
- attack action on server + response 


---
## Friday, February 17th, 2023
---

### Retrospective - Game Dev
- I did not take notes on february 17th day of
- I did get a couple things done in handling  mouseover, clicks, some code cleanup
- I added an active turn property
- I deleted the ActiveTurnMap
- But I was distracted
- I am feeling "without a podcast"
- Maybe I should start watching corrine fisher
- Maybe I should move to the east coast 
  
### Personal Retrospective
- This weekend will be important to recharge
- Also I got a text from my landlord who is doing a 'walk through' soon
- I need to fix the AC wall unit
- I need to clean the toilets and bathrooms
- I need to fix the light fixtures
- I need to clean the fridge
- I need to replace the air filter
- I need to sweep
- I need to burn candles, air freshener
- I need to take out all trash
- I need to make sure the garage is in better shape
- I should start getting the cars in order...

---
## Thursday, February 16th 2023
---

### Documentation - "The Simplest Possible Rules"
- make a markdown file at root of the project
- since it will affect common shit.
- remember those common types? yeaaaaaah.......
- oh well

### HexGrid - Editor improvements
- [x] Need to integrate terrain and team colors into hex grid editor
- [x] Update dimension on window resize event
- [x] Test create new maps
- [x] clean up old maps, game

### HexGrid - ReadOnly mode
- [x] Make hex grid work in read only mode where clicking doesn't do nothin

### HexGrid - Game Mode
- [x] health bar for units
- [ ] movement tracking - start simple

---
## Wednesday, February 15th 2023
---

### GetNeighbors (and getRowAndColumn) fixes
- [x] fixed getNeighbors to account for whether clicked row is above or below center
- [x] instead of using +1, -1 approach, adjust cellIndex by rowAbove or rowBelow length, and current row length
- [x] that gives you the two neighbor positions above or below 
- [x] then, check actual grid row (which contains the grid indeces, not the row indeces)  contains those values
  
- [x] also, fixed offByOne bug with getRowAndColumn, which messed up the neighbor function for the first item in 2nd row

- [x] added a couple unit tests (I should have been a good boy and added one for the getRowAndColumn case, but I didn't
- [x] I verified that manually using the /grid route, which should eventually get removed

### HexGrid improvements

- [x] I need to add cell Index as a data prop for the cells instead of displaying the cellIndex.
- [x] Integrate existing cell props with the new hex grid - display only (need to do terrain color)
- [x] Update dimension on window resize event


### Hex Grid - Editor Integration 

- [x] integrate the new hex grid with the map editor - interactive 





voldemort (u no who)
goku
spent 20K for that 328i all white bmw

yeah I'm williams i talk the #2
but u knuckle head if u think i wouldn't bounce back & kick u like a rubber boot
in my true religion suit




