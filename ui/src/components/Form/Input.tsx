import { getEmojiForUnit } from "@TBS/renderer-2d";
import prettyPrint from "../../utils/prettyPrint";
import type { InputProps, Option } from "../../types";

const checkStyle = {
  marginLeft: "10px",
  marginTop: "12px"
};

const Input = ({ initial, name, options, type }: InputProps) => {
  const initialValue = typeof initial === "boolean" ? undefined : initial;

  const optionGroups: string[] = [];
  options?.forEach((option) => {
    if (!option.group || optionGroups.includes(option.group)) return;
    optionGroups.push(option.group);
  });

  const optionElements = (candidates: readonly Option[] | undefined) => candidates?.map(({ label, value }) => (
    <option key={label} className={String(value)} value={String(value)}>
      {`${prettyPrint(label)} ${name === "unit" ? getEmojiForUnit(label) : ''}`}
    </option>
  ));

  switch (type) {
    case "check":
      return <input style={checkStyle} key={name} type="checkbox" defaultChecked={Boolean(initial)} name={name} />;
    case "number":
      return <input key={name} defaultValue={initialValue} type="number" name={name} max={32} />;
    case "select":
      return (
        <select key={name} name={name} defaultValue={initialValue}>
          {optionGroups.length === 0 ? optionElements(options) : optionGroups.map((group) => {
            const optionsForGroup = options?.filter((option) => option.group === group);
            return (
              <optgroup key={group} label={group} >
                {optionElements(optionsForGroup)}
              </optgroup>
            );
          })}
        </select>
      );
    default: // text
      return <input key={name} type="text" name={name} defaultValue={initialValue} />;
  }
}

export default Input;
