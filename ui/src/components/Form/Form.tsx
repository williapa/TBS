import FieldMapper from "./FieldMapper";
import Layout from "../../components/Layout";

const Form = ({ cancel, className, initialValues, inputs, name, left, top, save }: FormProps) => {

  const submit = (e: any) => {
    e.preventDefault();
    save(e.target);
  };

  const onCancel = (e: any) => {
    e.preventDefault();
    cancel();
  };

  return (
    <Layout>
      <form className={className} style={{ top, left }} onSubmit={submit} >
        <fieldset>
          <legend>
            <b>{name}</b> 
          </legend>
          {inputs.map(FieldMapper)}
          <input style={{ minWidth: "50%", maxWidth: "50%" }} type="submit" />
          <button style={{ width: "50%" }} onClick={onCancel} > cancel </button>
        </fieldset>
      </form>
    </Layout>
  );
};

export default Form;