import {
  Button,
  Container,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";
import type { FormEvent} from "react";
import { useState } from "react";
import { mapTerrainOptions, MIN_MAP_SIDE } from "@TBS/game-setup";
import type { MapEditorFormProps, TerrainType } from "../../types";

type TerrainSelectOption = Readonly<{ label: string; value: TerrainType }>;

export const CLIENT_MAX_MAP_SIDE = 10;

const terrainSelectOptions: readonly TerrainSelectOption[] = mapTerrainOptions.map((terrain) => ({
  label: terrain[0].toUpperCase() + terrain.slice(1),
  value: terrain,
}));

const MapEditorForm = ({ submit }: MapEditorFormProps) => {
  const [name, setName] = useState("");
  const [dimension, setDimension] = useState("10");
  const [terrain, setTerrain] = useState<TerrainSelectOption>(terrainSelectOptions[1]);
  const [submitted, setSubmitted] = useState(false);

  const parsedDimension = Number(dimension);
  const nameError = submitted && !name.trim() ? "Enter a name for the map." : undefined;
  const dimensionError = submitted && (
    !Number.isInteger(parsedDimension)
    || parsedDimension < MIN_MAP_SIDE
    || parsedDimension > CLIENT_MAX_MAP_SIDE
  )
    ? `Enter a whole number between ${MIN_MAP_SIDE} and ${CLIENT_MAX_MAP_SIDE}.`
    : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (
      !name.trim()
      || !Number.isInteger(parsedDimension)
      || parsedDimension < MIN_MAP_SIDE
      || parsedDimension > CLIENT_MAX_MAP_SIDE
    ) return;
    submit({
      submitted: true,
      name: name.trim(),
      dimension: parsedDimension,
      defaultTerrain: terrain.value,
    });
  };

  return (
    <main className="cloudscape-form-page" style={{ marginTop: "1em" }}>
      <ContentLayout
        header={(
          <Header
            variant="h1"
            description="Choose the starting size and terrain for your battlefield. You can customize individual hexes in the editor."
          >
            New Map Configuration
          </Header>
        )}
      >
        <form onSubmit={onSubmit}>
          <Form
            actions={<Button variant="primary" formAction="submit">Go to map editor</Button>}
          >
            <Container header={<Header variant="h2">Map details</Header>}>
              <SpaceBetween direction="vertical" size="l">
                <FormField
                  label="Map name"
                  description="Use a recognizable name so this map is easy to find when starting a game."
                  errorText={nameError}
                >
                  <Input
                    value={name}
                    onChange={({ detail }) => setName(detail.value)}
                    placeholder="For example, Forest crossing"
                    autoFocus
                    invalid={Boolean(nameError)}
                  />
                </FormField>
                <FormField
                  label="Hexagon side width"
                  description="The map will use this many hexes along each side. Larger maps take longer to play."
                  constraintText={`Use a whole number from ${MIN_MAP_SIDE} to ${CLIENT_MAX_MAP_SIDE}.`}
                  errorText={dimensionError}
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={dimension}
                    onChange={({ detail }) => setDimension(detail.value)}
                    invalid={Boolean(dimensionError)}
                  />
                </FormField>
                <FormField
                  label="Default terrain"
                  description="Every hex starts with this terrain; you can change individual hexes in the editor."
                >
                  <Select
                    selectedOption={terrain}
                    onChange={({ detail }) => {
                      const selectedTerrain = terrainSelectOptions.find(
                        (option) => option.value === detail.selectedOption.value
                      );
                      if (selectedTerrain) setTerrain(selectedTerrain);
                    }}
                    options={terrainSelectOptions}
                  />
                </FormField>
              </SpaceBetween>
            </Container>
          </Form>
        </form>
      </ContentLayout>
    </main>
  );
};

export default MapEditorForm;
