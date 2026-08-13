import "./Field.css";
import Input from "./Input";
import type { FieldProps, OptionGroup, OptionGroups, SelectValues } from "../../types";

const enumToStrings = (value: SelectValues) =>
  Object.values(value).filter((member): member is string => typeof member === "string");

const buildOptionMapper = (group: string ) => {
  return (item: string) => ({ group, label: (item === "gray"? "neutral" : item), value: item });
};

const isOptionGroups = (options: SelectValues | OptionGroups): options is OptionGroups =>
  Array.isArray(options) && options.length > 0 && Array.isArray(options[0]);

const buildOptions = (options: SelectValues | OptionGroups) => {
  if (isOptionGroups(options)) {
    const x = options.map(([label, groupOptions]: OptionGroup) => {
      return enumToStrings(groupOptions).map(buildOptionMapper(label));
    });
    return x.reduce((prev, current) => (prev.concat(...current)), []);
  }
  if (options) return enumToStrings(options).map(buildOptionMapper("default"));
  return [];
};

const Field = ({ initial, name, options = [], type }: FieldProps) => (
  <div className="form-row">
    <label htmlFor={name}>
      {name}
    </label>
    <Input initial={initial} name={name} options={buildOptions(options)} type={type} />
  </div>
);

export default Field;
