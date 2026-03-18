import useLocalStorage from "use-local-storage";

const useUser = () => {
  
  const [user] = useLocalStorage("user", { user: "", pin: "" });

  return user;

};

export default useUser;
