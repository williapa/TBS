const capitalize = (word: string) => word.length? word[0].toUpperCase() + word.substring(1) : word;

const prettyPrint = (word: string) => {
  const words = word.split(/(?=[A-Z])/);
  words[0] = capitalize(words[0]);
  return words.join(" ");
}

export default prettyPrint;