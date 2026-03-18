import { useEffect, useState } from "react";
// import useFetch from "react-fetch-hook";

const cache: any = {};

const useOptionCache = (url: string) => {

  const [status, setStatus] = useState('idle');
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!url) return;

    const fetchData = async () => {
      setStatus("fetching");
      if (cache[url]) {
        const data = cache[url];
        setData(data);
        setStatus("fetched");
      } else {
        const response = await fetch(`http://localhost:8420${url}`);
        const data = await response.json();
        cache[url] = data;
        setData(data);
        setStatus('fetched');
      }
    };
    fetchData();
  }, [url]);

  return { status, data };

};

export default useOptionCache;