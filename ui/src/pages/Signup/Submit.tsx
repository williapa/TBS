import { useState, useEffect } from "react";
import useLocalStorage from "use-local-storage";
import { Navigate } from "react-router-dom";
import Spinner from "../../components/Spinner"

type FormData = {
  email: string;
  pin: string;
  newUser: boolean;
}

type SignupRedirectProps = {
  formData: FormData;
  setResult: any;
  setEmail: any;
} 

const Submit = ({ formData, setEmail, setResult }: SignupRedirectProps) => {

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [, setUser] = useLocalStorage("user", { user: "", pin: "" });

  const createUser = async () => {
    fetch("http://localhost:8420/createUser", {
      method: "post",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then((response) => { 
      if (!response.ok) {
        return response.json();
      }
      throw new Error("it worked.");
    })
    .then((data) => {
      setLoading(false);
      setResult(data.error);
    }).catch(() => {
      setUser({ user: formData.email, pin: formData.pin });
      setEmail(formData.email);
      setSuccess(true);
    });
  }

  useEffect(() => {
    createUser();
  }, []);

  if (success) {
    return <Navigate to="/lobby" />;
  }

  return loading ? <Spinner type="deadCenter" />  : <></>
};

export default Submit;