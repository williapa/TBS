/**
 * Replace the opacity number in the rgba color string.
 * to be used in css background and borders alike.
 * because you can't set border opacity as its own property
 * (would be a cleaner approach, and is possible with background color)
 */
const replaceOpacity = (rgbaString: string) => rgbaString.replace("1.0", "0.42");

export default replaceOpacity;
