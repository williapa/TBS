import { useState } from "react";
import MapEditorForm from "./MapEditorForm";
import MapEditor from "./MapEditor";

const defaultFormValues = {
  submitted: false,
};

const MapEditorPage = () => {
  const [formValues, setFormValues] = useState(defaultFormValues);

  switch(formValues.submitted) {
    case false:
      return <MapEditorForm submit={setFormValues} />;
    default:
      return <MapEditor config={formValues} />
  }
}

export default MapEditorPage;