import { attackableOptions } from "../types";

const canBeAttacked = (unit: string) => attackableOptions.indexOf(unit) > -1;

export default canBeAttacked;
