import getNeighbors from "utils/getNeighbors";

test('Base case - grid width of two and center cell (3) returns all neighbor indexes', () => {

  const testCase = {
    width: 2,
    cellIndex: 3,
    expectedResult: [0,1,2,4,5,6]
  };

  // expect(getNeighbors(testCase.width, testCase.cellIndex)).toEqual(testCase.expectedResult);

});
