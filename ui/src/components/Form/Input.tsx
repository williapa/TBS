import units from "../../components/Map/Unit/units";
import prettyPrint from "../../utils/prettyPrint";

const checkStyle = {
  marginLeft: "10px",
  marginTop: "12px"
};

const Input = ({ initial, name, options, type }: InputProps) => {

  let optionGroups: any[] = [];
  options?.forEach((option) => {
    if (!Object.hasOwn(option, "group")) return;
    optionGroups.indexOf(option.group) < 0 && optionGroups.push(option.group);
  });

  if (optionGroups.length < 1) optionGroups = [options];

  switch (type) {
    case "check":
      return <input style={checkStyle} key={name} type="checkbox" defaultValue={initial} name={name} />;
    case "number":
      return <input key={name} defaultValue={initial} type="number" name={name} max={32} />;
    case "select":
      return (
        <select key={name} name={name} defaultValue={initial}>
          {optionGroups.map((group) => {
            const optionsForGroup = options?.filter((option) => option.group === group);
            const opts = optionsForGroup?.map(({ label, value }: Option) => (
              <option key={label} className={value} value={value}>
                {`${prettyPrint(label)} ${name === "unit" ? units[label as UnitTypes].symbol : ''}`}
              </option>
            ));
            if (optionGroups.length < 2) return opts;
            return (
              <optgroup key={group} label={group} >
                {opts}
              </optgroup>
            );
          })}
        </select>
      );
    default: // text
      return <input key={name} type="text" name={name} defaultValue={initial} />;
  }
}

export default Input;
