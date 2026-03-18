type HealthProps = {
  color: "orange" | "purple",
  amount: number
}

const HealthDemo = ({ color, amount = 100 }: HealthProps) => (
  <div style={{
    marginTop: "14px",
    border: "1px solid black",
    height: "4px"
  }}>
    <div style={{
      height: "4px",
      backgroundColor: color,
      width: `${amount}%`
    }} />
  </div>
);

export default HealthDemo;