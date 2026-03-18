export type Game = {
  challenger?: string;
  creator: string;
  id: string;
  map: string;
  name: string;
  open_timestamp: string;
  started_timestamp: string;
};

export const GameColumns = [
  { header: "Name", cell: ({ id, name }: Game) => <a href={`/game/${id.split("#")[1]}`}>{name}</a> },
  { header: "Map", cell: ({ map }: Game) => map },
  { header: "Creator", cell: ({ creator }: Game) => creator },
  { header: "Created", cell: ({ open_timestamp }: Game) => open_timestamp ? new Date(parseInt(open_timestamp)).toUTCString(): "-" },
  { header: "Challenger", cell: ({ challenger }: Game) => challenger },
  { header: "Started", cell: ({ started_timestamp }: Game) => started_timestamp ? new Date(parseInt(started_timestamp)).toUTCString(): "-" } 
];
