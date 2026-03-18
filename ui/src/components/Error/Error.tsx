import Layout from "../Layout";
type ErrorProps = {
  error: string;
};
const Error = ({ error }: ErrorProps) => (
  <Layout>
    <span style={{ color: "red" }} >{error}</span>
  </Layout>
);

export default Error;