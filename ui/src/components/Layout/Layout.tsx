type LayoutType = {
  action?: JSX.Element;
  type?: "center" | "deadCenter" | "lr"
  children: JSX.Element;
}

const deadCenterStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "auto",
  minHeight: "60vh"
};

const Layout = ({ action, children, type = "center" }: LayoutType) => {
  switch(type) {
    case "deadCenter": 
      return (
        <div style={deadCenterStyle}>
          {children}
        </div>
      );
      case "lr": 
        return (
          <div style={{ display: "flex", flexDirection: "row" }} >
            <div style={{  display: "flex", alignSelf: "start" }}>
              {children}
            </div>
            <div style={{ marginLeft: "auto" }}>
              {action}
            </div>
          </div>
        );
    default:
      return (
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
          {children}
        </div>
      );
  }
};

export default Layout;