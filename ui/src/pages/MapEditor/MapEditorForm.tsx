import FieldMapper from "../../components/Form/FieldMapper";
import Layout from "../../components/Layout";

// TODO: you should be getting this from "common"
const terrainOptions = [
  "beach", // brown
  "forest", // green
  "mountain", // black
  "road", // gray
  "plains", // white
  "desert", // yellow
  "water", // blue
]

const createEditorFields = [
  { type: "text" as InputType.text, name: "map name" },
  { type: "number" as InputType.number, name: "hexagon side width", initial: 10 },
  { type: "select" as InputType.select, name: "terrain", initial: "forest", options: terrainOptions }
];

const buildSubmitter = (setValues: any) => (e: any) => {
  e.preventDefault(); // html form is stupid
  setValues({
    submitted: true,
    name: e.target["map name"].value,
    dimension: e.target["hexagon side width"].value,
    defaultTerrain: e.target.terrain.value
  });
};

const MapEditorForm = ({ submit }: MapEditorFormProps) => (
  <Layout>
    <form onSubmit={buildSubmitter(submit)}>
      <fieldset>
        <legend>
          <b> New Map Configuration </b> 
        </legend>
        {createEditorFields.map(FieldMapper)}
        <div className="form-row" style={{ display: "flex" }}>
          <input style={{ width: "103%", marginLeft: "3%" }}type="submit" value="Go to map editor" />
        </div>
      </fieldset>
    </form>
  </Layout>
);

export default MapEditorForm;