import "./Field.css";
import Input from "./Input";

const enumToStrings = (e: any) => {
  const stringArray = [];
  for (const enumMember in e) {
    const isValueProperty = Number(enumMember) >= 0
    if (isValueProperty) {
      stringArray.push(e[enumMember]);
    } else {
      stringArray.push(enumMember);
    }
  } 
  return stringArray;
}

const buildOptionMapper = (group: string ) => {
  return (item: string) => ({ group, label: (item === "gray"? "neutral" : item), value: item });
};

const buildOptions = (options: SelectTypes | OptionGroups) => {
  if (Array.isArray(options) && Array.isArray(options[0])) {
    const x = (options as OptionGroups).map(([label, groupOptions]: OptionGroup) => {
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
