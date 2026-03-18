const units: Record<UnitTypes, { symbol: string, income?: number, defense?: number }> = {

  // Animals AnimalType

  ["dragon"]: {
    symbol: `🐉`,
  },
  ["lion"]: {
    symbol: `🐅`,
  },

  // Buildings BuildingType

  ["airport"]: {
    symbol: `🏗️`,
  },
  ["bank"]: {
    symbol: `🏦`,
  },
  ["capital"]: {
    symbol: "🏰",
    income: 200,
    defense: 50,
  },
  ["church"]: {
    symbol: `⛪`,
    income: 25,
    defense: 5,
  },
  ["college"]: {
    symbol: `🏫`,
    income: -75,
    defense: 10,
  },
  ["factory"]: {
    symbol: `🏭`,
    income: 50,
    defense: 25,
  },
  ["house"]: {
    symbol: "🏠",
    income: 100,
    defense: 10,
  },
  ["lab"]: {
    symbol: `⚛️`,
  },
  ["office"]: {
    symbol: `🏢`,
  },
  ["port"]: {
    symbol: `🌉`,
  },
  ["zoo"]: {
    symbol: `🥅`,
  },

  // Objects ObjectType

  ["missile"]: {
    symbol: `🚀`,
  },
  ["money"]: {
    symbol: "💰",
    income: 250,
  },
  ["none"]: {
    symbol: ``
  },
  ["nuke"]: {
    symbol: `💣`,
  },

  // People PersonType

  ["bluesMusician"]: {
    symbol: `👨🏿‍🎤`,
  },
  ["constructionWorker"]: {
    symbol: `👷‍♀️`,
  },
  ["doctor"]: {
    symbol: `👩🏽‍⚕️`,
  },
  ["engineer"]: {
    symbol: `👨‍💼`,
  },
  ["michaelJackson"]: {
    symbol: `🕴️`,
  },
  ["leader"]: {
    symbol: `🤴`,
  },
  ["pilot"]: {
    symbol: `👩🏾‍✈️`,
  },
  ["priest"]: {
    symbol: `🧙`,
  },
  ["scientist"]: {
    symbol: `👨🏻‍🔬`,
  },
  ["soldier"]: {
    symbol: `💂`, 
  },
  ["studentAthlete"]: {
    symbol: `👩‍🎓`,
  },
  ["worker"]: {
    symbol: `👨‍🏭`,
  },
  ["zookeeper"]: {
    symbol: `👩🏽‍🌾`
  },
  ["zuckerbird"]: {
    symbol: `👩🏼‍💻`
  },

  // Vehicles VehicleType

  ["airplane"]: {
    symbol: `🛫`,
  },
  ["ambulance"]: {
    symbol: `🚑`,
  },
  ["bigTruck"]: {
    symbol: `🚛`,
  },
  ["helicopter"]: {
    symbol: `🚁`,
  },
  ["truck"]: {
    symbol: `🚙`,
  },
  ["sub"]: {
    symbol: `⛴`,
  },
};

export default units;
