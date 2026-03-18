import { Oval } from "react-loader-spinner";
import Layout from "../Layout";

type SpinnerProps = {
  type?: "center" | "deadCenter"
}

const Spinner = ({ type = "center" }: SpinnerProps) => (
  <Layout type={type}>
    <Oval />
  </Layout>
);

export default Spinner;

