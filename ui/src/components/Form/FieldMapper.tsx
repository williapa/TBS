import Field from "./Field";
import type { FieldProps } from "../../types";

const FieldMapper = (props: FieldProps) => <Field key={props.name} {...props} />;

export default FieldMapper;
