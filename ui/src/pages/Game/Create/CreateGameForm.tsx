import { useState } from "react";
import { Navigate } from "react-router-dom";
import useLocalStorage from "use-local-storage";
import Form from "../../../components/Form/Form";
import ReadOnlyMap from "../../../components/Map/ReadOnlyMap";

const GAME_NAME = "Game name";

const CreateGameForm = () => {

  const [navigate, setNavigate] = useState({ cancel: false, success: false });

  // TODO: make it a hook?
  const [user] = useLocalStorage("user", { user: "", pin: "" });
  const [mapData, setMapData] = useState<MapItem[][]>();

  const change = (x: any) => {
    setMapData(x.mapData);
  };
  
  const inputs = [
    { type: "text" as InputType.text, name: GAME_NAME, initial: "Hello World" },
    { type: "asyncSelect" as InputType.asyncSelect, change, name: "Map", url: "/listMaps" },
  ];

  const save = (target: any) => {
    fetch("http://localhost:8420/createGame", {
      method: "post",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.user,
        map: target.Map.value,
        mapData: mapData,
        name: target[GAME_NAME].value,
        pin: user.pin,
      })
    }).then((response) => { 
      if (response.ok) {
        return response.json();
      }
      throw new Error("it worked. wow does react suck");
    })
    .then((data) => {
      console.log("data: ", data);
      setNavigate({
        ...navigate,
        success: true
      });
    }).catch((error) => {
      console.log(error);
    });
  };

  const cancel = () => {
    setNavigate({
      ...navigate,
      cancel: true
    });
  }; 

  if (navigate.success || navigate.cancel) {
    return <Navigate to="/lobby" />;
  }

  return (
    <>
      <Form inputs={inputs} name="Create Game" save={save} cancel={cancel} />
      { !!mapData && <ReadOnlyMap mapData={mapData} /> }
    </>
  );
};

export default CreateGameForm;
