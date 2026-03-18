import { useState, useEffect } from "react";
import useLocalStorage from "use-local-storage";
import useFetch from "react-fetch-hook";
import { useParams } from "react-router-dom";

const useGame = () => {
  const { id } = useParams();
  const [cache, setCache] = useLocalStorage<any | false>(id || "invalid", false);
  const [trigger, setTrigger] = useState<number>(0);
  const trig = () => setTrigger(trigger + 1);

  const { isLoading, error, data } = useFetch(`http://localhost:8420/game/${id}`, {
    depends: [trigger]
  });
  
  useEffect(() => { 
    if (!id) return;

    if (!cache && !isLoading) {
      setTrigger(1);
    }

  }, [id]);  

  useEffect(() => {
    if (id && !isLoading && !cache && data) {
      setCache(data);
      setTrigger(0);
    }
  }, [data]);

  const clearData = () => setCache(false);

  useEffect(() => {
    window.addEventListener("beforeunload", clearData);
    return () => {
      window.removeEventListener("beforeunload", clearData);
    };
  }, []);

  const loading = isLoading || !id || !cache;

  return { isLoading: loading, error, data: cache ? cache : {}, refresh: trig };

};

export default useGame;
