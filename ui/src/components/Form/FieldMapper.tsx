import Field from "./Field";

const FieldMapper = (props: FieldProps) => <Field key={props.name} {...props} />;

export default FieldMapper;