const handleAction = (row: number, column: number, mapItem: MapItem, gameAction?: gameActions) => {
  if (!gameAction) {
    console.error("at the moment there should be an action if this is being invoked");
    return null;
  }
  if (gameAction === "move") { 
    const neighborIndeces = mapItem.neighbors;
    
    // setActor(["move", neighborIndeces || []]);
  }
}

export default handleAction;
