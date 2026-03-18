const switchTeams = (mapItem: MapItem) => {
  if (mapItem.team === TeamType.orange) {
    return { ...mapItem, team: TeamType.purple };
  }
  if (mapItem.team === TeamType.purple) {
    return { ...mapItem, team: TeamType.orange };
  }
  return mapItem;
};

const mirrorMap = (map: HexMap, mirror: MirrorType) => {
  const bottomHalf = [...map];
  bottomHalf.reverse();

  switch(mirror) {
    case MirrorType.mirrorX:
      return map.concat(
        bottomHalf.map((row: MapItem[]) => row.map(switchTeams))
      );
    case MirrorType.mirrorXFlipY:
      return map.concat(
        bottomHalf.map((row: MapItem[]) => row.map(switchTeams).reverse())
      );
    default: 
      return map;
  }

};

export default mirrorMap;