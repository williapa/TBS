import { getNeighbors } from "./getNeighbors";
import buildHexagon from "./buildHexagon";

test('Base case - grid width of two and center cell (3) returns all neighbor indexes', () => {

  const testCases = [{
    grid: buildHexagon(1),
    cellIndex: 0,
    expectedResult: []
  }, {
    grid: buildHexagon(2),
    cellIndex: 3,
    expectedResult: [0,1,2,4,5,6]
  }, {
    grid: buildHexagon(2),
    cellIndex: 0,
    expectedResult: [1, 2, 3]
  },
  {
    grid: buildHexagon(3),
    cellIndex: 5,
    expectedResult: [1,2,4,6,9,10],
  },
  {
    grid: buildHexagon(12),
    cellIndex: 30,
    expectedResult: [16, 17, 29, 31, 44, 45],
  }
];

  for (const testCase of testCases) {
    expect(getNeighbors(testCase.grid, testCase.cellIndex).sort((a,b) => a - b)).toEqual(testCase.expectedResult);
  }

});
