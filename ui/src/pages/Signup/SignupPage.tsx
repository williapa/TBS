import { useState } from "react";
import FieldMapper from "../../components/Form/FieldMapper";
import Layout from "../../components/Layout"
import Submit from "./Submit";

const NEW = "I'm new";

const fields = [
  { type: "text" as InputType.text, name: "email" },
  { type: "text" as InputType.text, name: "pin" },
];

const fields2 = [
  { type: "check" as InputType.check, name: NEW }
];

type SignupPageProps = {
  set: (x: string) => void;
}

const SignupPage = ({ set }: SignupPageProps) => {
  const [data, setData] = useState({ email: "", pin: "", newUser: false });
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  
  const submit = (e: any) => {
    e.preventDefault();
    setData({
      email: e.target.email.value,
      newUser: e.target[NEW].checked,
      pin: e.target.pin.value
    });
    setReady(true);
  };

  const callback = (error: string) => {
    console.log("error: ", error);
    setError(error);
    setReady(false);
  };


  return (
    <Layout>
      <form onSubmit={submit} style={{ fontSize: "153%" }}>
        <fieldset>
          <legend>
            <b>Login</b> 
          </legend>
          {fields.map(FieldMapper)}
          <div style={{ display: "flex" }}>
            <input type="submit" value="Submit" />
          </div>
          {fields2.map(FieldMapper)}
        </fieldset>
        { !!error.length && <p style={{ color: "red" }} >{error}</p> }
        { !!ready && <Submit setEmail={set} setResult={callback} formData={data} /> }
      </form>
    </Layout>
  );
};

export default SignupPage;