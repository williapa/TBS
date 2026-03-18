import { useEffect } from "react";
import Spinner from "../Spinner";
import optionCache from "../../hooks/useOptionCache"

type AsyncSelectProps = { 
  change: (x: any) => void; 
  name: string;
  url: string;
};

const AsyncSelect = ({ change, name, url }: AsyncSelectProps) => {

  const { status, data } = optionCache(url);

  useEffect(() => {
    const trapData = data as mapType[];
    if (trapData && trapData.length) {
      change(trapData[0]);
    }
  }, [data]);

  if (status === "fetching") return <Spinner />;

  const mapData: mapType[] = data as mapType[];

  const onChange = (e: any) => {
    const map = mapData.find(element => element.mapName === e.target.value);
    change(map);
  }
  
  const options = mapData.map(({ mapName }: mapType) => ({ label: mapName, value: mapName }));
  
  return (
    <select key={url} name={name} onChange={onChange} >
      {options.map(({ label, value }) => (
        <option key={label} className={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
};

export default AsyncSelect;